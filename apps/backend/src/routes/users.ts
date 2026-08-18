/**
 * Users Routes
 *
 * Endpoints for user-specific data retrieval (dashboard functionality).
 * Returns content that the authenticated user owns or can edit.
 *
 * Routes:
 *   GET   /api/users/public/:username - Public account info (no auth)
 *   PATCH /api/users/me/profile       - Update the caller's public profile
 *   GET   /api/users/search           - Username suggestions for editor pickers
 *   GET /api/users/me/posts         - List user's posts (owned or editor)
 *   GET /api/users/me/collections   - List user's collections (owned or editor)
 *   GET /api/users/me/profiles      - List user's profiles (owned or editor)
 */

import { Router, Request, Response } from 'express';
import { sql, type SerializableValue } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── GET /api/users/public/:username ─────────────────────────────────────────
// Public — no auth required. Returns safe public fields only.

const PublicAccountSchema = z.object({
  account_id: z.number(),
  username: z.string(),
  created_at: z.string(),
  bio: z.string().nullable(),
  banner_url: z.string().nullable(),
  banner_credit: z.string().nullable(),
});

const FeaturedCollectionSchema = z.object({
  collection_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  collection_type_id: z.number(),
  type_name: z.string(),
  post_count: z.number(),
});

/** Public profile fields live in accounts.details rather than their own columns —
 *  three optional presentation values don't justify a schema change. */
const MAX_BIO_LENGTH = 500;
const MAX_FEATURED_COLLECTIONS = 4;

router.get('/public/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const db = await getPool();

    const account = await db.maybeOne(
      sql.type(PublicAccountSchema)`
        SELECT
          account_id,
          username,
          created_at::text,
          details->>'bio'            AS bio,
          details->'banner'->>'url'     AS banner_url,
          details->'banner'->>'credit'  AS banner_credit
        FROM accounts
        WHERE username = ${username}
          AND is_banned = false
          AND deleted = false
      `,
    );

    if (!account) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Featured collections are stored as an ordered array of ids. Resolve them
    // here so a deleted or unpublished collection simply drops out of the list.
    const featuredIds = await db.maybeOne(
      sql.type(z.object({ ids: z.array(z.number()) }))`
        SELECT COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(details->'featuredCollections')::int),
          ARRAY[]::int[]
        ) AS ids
        FROM accounts
        WHERE account_id = ${account.account_id}
      `,
    );

    let featured_collections: readonly unknown[] = [];
    if (featuredIds && featuredIds.ids.length > 0) {
      const rows = await db.any(
        sql.type(FeaturedCollectionSchema)`
          SELECT
            c.collection_id,
            c.title,
            c.description,
            c.collection_type_id,
            ct.type_name,
            (
              SELECT COUNT(*)::int FROM collection_posts cp
              WHERE cp.collection_id = c.collection_id AND cp.deleted = false
            ) AS post_count
          FROM collections c
          JOIN collection_types ct ON ct.type_id = c.collection_type_id
          WHERE c.collection_id = ANY(${sql.array(featuredIds.ids, 'int4')})
            AND c.account_id = ${account.account_id}
            AND c.deleted = false
        `,
      );
      // Preserve the author's chosen order, which ANY() does not guarantee
      const byId = new Map(rows.map((r) => [r.collection_id, r]));
      featured_collections = featuredIds.ids.map((cid) => byId.get(cid)).filter(Boolean);
    }

    res.json({ ...account, featured_collections });
  } catch (err) {
    logger.error('Public user fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/search ───────────────────────────────────────────────────
// Username suggestions for the "add editor" pickers. Requires auth: this is a
// member-directory lookup, not public data. Returns usernames only — never
// emails or anything else that would turn it into a scraping surface.

router.get('/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  // Two characters keeps a stray keystroke from returning the whole membership
  if (raw.length < 2) {
    res.json({ users: [] });
    return;
  }

  try {
    const db = await getPool();
    const users = await db.any(
      sql.type(z.object({ username: z.string() }))`
        SELECT username FROM accounts
        WHERE f_unaccent(username) ILIKE f_unaccent(${'%' + raw + '%'})
          AND deleted = false
          AND is_banned = false
        ORDER BY
          -- Prefix matches first, then alphabetical, so typing "ro" surfaces
          -- "rowan" ahead of "brandyrose"
          CASE WHEN f_unaccent(username) ILIKE f_unaccent(${raw + '%'}) THEN 0 ELSE 1 END,
          username
        LIMIT 8
      `,
    );
    res.json({ users: users.map((u) => u.username) });
  } catch (err) {
    logger.error('Username search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/users/me/profile ─────────────────────────────────────────────
// Updates the caller's own public profile. Only the three presentation fields
// are writable; everything else in accounts.details is left untouched.

router.patch('/me/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const BodySchema = z.object({
    bio: z.string().max(MAX_BIO_LENGTH).nullable().optional(),
    banner: z
      .object({ url: z.string().max(2048), filename: z.string().max(255) })
      .nullable()
      .optional(),
    featuredCollections: z.array(z.number().int()).max(MAX_FEATURED_COLLECTIONS).optional(),
  });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid profile payload', details: parsed.error.flatten() });
    return;
  }

  const { bio, banner, featuredCollections } = parsed.data;

  try {
    const db = await getPool();

    // Only collections the caller actually owns may be featured
    let verifiedIds: number[] | undefined;
    if (featuredCollections) {
      const owned = await db.any(
        sql.type(z.object({ collection_id: z.number() }))`
          SELECT collection_id FROM collections
          WHERE account_id = ${userId}
            AND deleted = false
            AND collection_id = ANY(${sql.array(featuredCollections, 'int4')})
        `,
      );
      const ownedIds = new Set(owned.map((row) => row.collection_id));
      verifiedIds = featuredCollections.filter((cid) => ownedIds.has(cid));
    }

    const updates: Record<string, SerializableValue> = {};
    if (bio !== undefined) updates.bio = bio;
    if (banner !== undefined) updates.banner = banner;
    if (verifiedIds !== undefined) updates.featuredCollections = verifiedIds;

    await db.query(
      sql.type(z.object({}))`
        UPDATE accounts
        SET details = COALESCE(details, '{}'::jsonb) || ${sql.jsonb(updates)},
            updated_at = NOW()
        WHERE account_id = ${userId}
      `,
    );

    res.json({ message: 'Profile updated', featuredCollections: verifiedIds });
  } catch (err) {
    logger.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/posts - List user's posts with cursor pagination
router.get('/me/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const filter = (req.query.filter as string) || 'all'; // all | owned | editor
  const status = (req.query.status as string) || 'all'; // all | published | drafts

  try {
    const db = await getPool();

    // Build filter conditions
    let filterFragment;
    if (filter === 'owned') {
      filterFragment = sql.fragment`p.account_id = ${userId}`;
    } else if (filter === 'editor') {
      filterFragment = sql.fragment`
        p.account_id != ${userId}
        AND EXISTS (
          SELECT 1 FROM post_editors pe
          WHERE pe.post_id = p.post_id 
            AND pe.account_id = ${userId} 
            AND pe.deleted = false
        )
      `;
    } else {
      // 'all' - owned OR editor
      filterFragment = sql.fragment`
        (
          p.account_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM post_editors pe
            WHERE pe.post_id = p.post_id 
              AND pe.account_id = ${userId} 
              AND pe.deleted = false
          )
        )
      `;
    }

    // Status filter for published/drafts
    let statusFragment;
    if (status === 'published') {
      statusFragment = sql.fragment`AND p.is_published = true`;
    } else if (status === 'drafts') {
      statusFragment = sql.fragment`AND p.is_published = false`;
    } else {
      statusFragment = sql.fragment``;
    }

    // Cursor condition for pagination
    const cursorFragment = cursor ? sql.fragment`AND p.post_id < ${cursor}` : sql.fragment``;

    const posts = await db.any(
      sql.type(
        z.object({
          post_id: z.number(),
          post_type_id: z.number(),
          title: z.string(),
          is_published: z.boolean(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          is_owner: z.boolean(),
        }),
      )`
        SELECT 
          p.post_id,
          p.post_type_id,
          p.title,
          p.is_published,
          p.created_at::text,
          p.updated_at::text,
          pt.type_name,
          (p.account_id = ${userId}) as is_owner
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        WHERE p.deleted = false
          AND ${filterFragment}
          ${statusFragment}
          ${cursorFragment}
        ORDER BY p.post_id DESC
        LIMIT ${limit + 1}
      `,
    );

    // Check if there are more results
    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].post_id : null;

    res.json({
      posts: results,
      next_cursor: nextCursor,
    });
  } catch (err) {
    logger.error('User posts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/collections - List user's collections with cursor pagination
router.get('/me/collections', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const filter = (req.query.filter as string) || 'all'; // all | owned | editor

  try {
    const db = await getPool();

    // Build filter conditions
    let filterFragment;
    if (filter === 'owned') {
      filterFragment = sql.fragment`c.account_id = ${userId}`;
    } else if (filter === 'editor') {
      filterFragment = sql.fragment`
        c.account_id != ${userId}
        AND EXISTS (
          SELECT 1 FROM collection_editors ce
          WHERE ce.collection_id = c.collection_id 
            AND ce.account_id = ${userId} 
            AND ce.deleted = false
        )
      `;
    } else {
      // 'all' - owned OR editor
      filterFragment = sql.fragment`
        (
          c.account_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM collection_editors ce
            WHERE ce.collection_id = c.collection_id 
              AND ce.account_id = ${userId} 
              AND ce.deleted = false
          )
        )
      `;
    }

    // Cursor condition for pagination
    const cursorFragment = cursor ? sql.fragment`AND c.collection_id < ${cursor}` : sql.fragment``;

    const collections = await db.any(
      sql.type(
        z.object({
          collection_id: z.number(),
          collection_type_id: z.number(),
          title: z.string(),
          description: z.string().nullable(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          is_owner: z.boolean(),
          post_count: z.string(), // COUNT returns bigint as string
        }),
      )`
        SELECT 
          c.collection_id,
          c.collection_type_id,
          c.title,
          c.description,
          c.created_at::text,
          c.updated_at::text,
          ct.type_name,
          (c.account_id = ${userId}) as is_owner,
          (
            SELECT COUNT(*)::text 
            FROM collection_posts cp 
            WHERE cp.collection_id = c.collection_id AND cp.deleted = false
          ) as post_count
        FROM collections c
        JOIN collection_types ct ON c.collection_type_id = ct.type_id
        WHERE c.deleted = false
          AND ${filterFragment}
          ${cursorFragment}
        ORDER BY c.collection_id DESC
        LIMIT ${limit + 1}
      `,
    );

    // Check if there are more results
    const hasMore = collections.length > limit;
    const results = hasMore ? collections.slice(0, limit) : collections;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].collection_id : null;

    res.json({
      collections: results,
      next_cursor: nextCursor,
    });
  } catch (err) {
    logger.error('User collections fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/profiles - List user's profiles with cursor pagination
router.get('/me/profiles', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const filter = (req.query.filter as string) || 'all'; // all | owned | editor
  const status = (req.query.status as string) || 'all'; // all | published | drafts

  try {
    const db = await getPool();

    // Build filter conditions
    let filterFragment;
    if (filter === 'owned') {
      filterFragment = sql.fragment`pr.account_id = ${userId}`;
    } else if (filter === 'editor') {
      filterFragment = sql.fragment`
        pr.account_id != ${userId}
        AND EXISTS (
          SELECT 1 FROM profile_editors pe
          WHERE pe.profile_id = pr.profile_id 
            AND pe.account_id = ${userId} 
            AND pe.deleted = false
        )
      `;
    } else {
      // 'all' - owned OR editor
      filterFragment = sql.fragment`
        (
          pr.account_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM profile_editors pe
            WHERE pe.profile_id = pr.profile_id 
              AND pe.account_id = ${userId} 
              AND pe.deleted = false
          )
        )
      `;
    }

    // Status filter for published/drafts
    let statusFragment;
    if (status === 'published') {
      statusFragment = sql.fragment`AND pr.is_published = true`;
    } else if (status === 'drafts') {
      statusFragment = sql.fragment`AND pr.is_published = false`;
    } else {
      statusFragment = sql.fragment``;
    }

    // Cursor condition for pagination
    const cursorFragment = cursor ? sql.fragment`AND pr.profile_id < ${cursor}` : sql.fragment``;

    const profiles = await db.any(
      sql.type(
        z.object({
          profile_id: z.number(),
          profile_type_id: z.number(),
          name: z.string(),
          is_published: z.boolean(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          is_owner: z.boolean(),
          parent_profile_id: z.number().nullable(),
          parent_profile_name: z.string().nullable(),
          details: z.unknown().nullable(),
        }),
      )`
        SELECT 
          pr.profile_id,
          pr.profile_type_id,
          pr.name,
          pr.is_published,
          pr.created_at::text,
          pr.updated_at::text,
          pt.type_name,
          (pr.account_id = ${userId}) as is_owner,
          pr.parent_profile_id,
          parent.name as parent_profile_name,
          pr.details
        FROM profiles pr
        JOIN profile_types pt ON pr.profile_type_id = pt.type_id
        LEFT JOIN profiles parent ON pr.parent_profile_id = parent.profile_id
        WHERE pr.deleted = false
          AND ${filterFragment}
          ${statusFragment}
          ${cursorFragment}
        ORDER BY pr.profile_id DESC
        LIMIT ${limit + 1}
      `,
    );

    // Check if there are more results
    const hasMore = profiles.length > limit;
    const results = hasMore ? profiles.slice(0, limit) : profiles;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].profile_id : null;

    res.json({
      profiles: results,
      next_cursor: nextCursor,
    });
  } catch (err) {
    logger.error('User profiles fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
