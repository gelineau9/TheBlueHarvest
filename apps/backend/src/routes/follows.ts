/**
 * Follows Routes
 *
 * Account-to-account and account-to-profile following.
 *
 * Routes:
 *   POST   /api/follows/accounts/:id   - Follow an account
 *   DELETE /api/follows/accounts/:id   - Unfollow an account
 *   POST   /api/follows/profiles/:id   - Follow a profile
 *   DELETE /api/follows/profiles/:id   - Unfollow a profile
 *   GET    /api/follows/feed           - Personalised feed of followed content
 *   GET    /api/follows/check          - Bulk-check follow state for given IDs
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── POST /api/follows/accounts/:id ─────────────────────────────────────────

router.post('/accounts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const followedId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(followedId)) {
    res.status(400).json({ error: 'Invalid account ID' });
    return;
  }

  const userId = req.userId!;

  if (followedId === userId) {
    res.status(400).json({ error: 'Cannot follow yourself' });
    return;
  }

  try {
    const db = await getPool();
    await db.query(
      sql.type(z.object({}))`
        INSERT INTO account_follows (follower_id, followed_id)
        VALUES (${userId}, ${followedId})
        ON CONFLICT DO NOTHING
      `,
    );
    res.json({ following: true });
  } catch (err) {
    console.error('Follow account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/follows/accounts/:id ───────────────────────────────────────

router.delete('/accounts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const followedId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(followedId)) {
    res.status(400).json({ error: 'Invalid account ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();
    await db.query(
      sql.type(z.object({}))`
        DELETE FROM account_follows
        WHERE follower_id = ${userId} AND followed_id = ${followedId}
      `,
    );
    res.json({ following: false });
  } catch (err) {
    console.error('Unfollow account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/follows/profiles/:id ─────────────────────────────────────────

router.post('/profiles/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();

    const profile = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number() }))`
        SELECT profile_id FROM profiles WHERE profile_id = ${profileId} AND deleted = false
      `,
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    await db.query(
      sql.type(z.object({}))`
        INSERT INTO profile_follows (account_id, profile_id)
        VALUES (${userId}, ${profileId})
        ON CONFLICT DO NOTHING
      `,
    );
    res.json({ following: true });
  } catch (err) {
    console.error('Follow profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/follows/profiles/:id ───────────────────────────────────────

router.delete('/profiles/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();
    await db.query(
      sql.type(z.object({}))`
        DELETE FROM profile_follows
        WHERE account_id = ${userId} AND profile_id = ${profileId}
      `,
    );
    res.json({ following: false });
  } catch (err) {
    console.error('Unfollow profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/follows/feed ───────────────────────────────────────────────────

const FeedPostSchema = z.object({
  post_id: z.number(),
  post_type_id: z.number(),
  title: z.string(),
  content: z.any().nullable(),
  created_at: z.string(),
  type_name: z.string(),
  username: z.string(),
  primary_author_id: z.number().nullable(),
  primary_author_name: z.string().nullable(),
});

const FeedCountSchema = z.object({ total: z.string() });

router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response) => {
  const limitRaw = parseInt(String(req.query.limit ?? '6'));
  const offsetRaw = parseInt(String(req.query.offset ?? '0'));
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 6 : Math.min(limitRaw, 20);
  const offset = isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;

  const userId = req.userId!;

  try {
    const db = await getPool();

    const posts = await db.any(
      sql.type(FeedPostSchema)`
        SELECT
          p.post_id,
          p.post_type_id,
          p.title,
          p.content,
          p.created_at::text,
          pt.type_name,
          a.username,
          ap.profile_id   AS primary_author_id,
          ap.name         AS primary_author_name
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        JOIN accounts   a  ON p.account_id   = a.account_id
        LEFT JOIN authors auth ON p.post_id = auth.post_id
          AND auth.is_primary = true
          AND auth.deleted    = false
        LEFT JOIN profiles ap ON auth.profile_id = ap.profile_id
        WHERE p.deleted      = false
          AND p.is_published = true
          AND p.post_id IN (
            SELECT followed_id_posts FROM (
              SELECT p2.post_id AS followed_id_posts
              FROM posts p2
              WHERE p2.account_id IN (
                SELECT followed_id FROM account_follows WHERE follower_id = ${userId}
              )
              UNION
              SELECT a2.post_id AS followed_id_posts
              FROM authors a2
              WHERE a2.deleted = false
                AND a2.profile_id IN (
                  SELECT profile_id FROM profile_follows WHERE account_id = ${userId}
                )
              UNION
              SELECT fp.post_id AS followed_id_posts
              FROM featured_profiles fp
              WHERE fp.deleted = false
                AND fp.profile_id IN (
                  SELECT profile_id FROM profile_follows WHERE account_id = ${userId}
                )
            ) AS combined
          )
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    );

    const countResult = await db.one(
      sql.type(FeedCountSchema)`
        SELECT COUNT(*)::text AS total
        FROM posts p
        WHERE p.deleted      = false
          AND p.is_published = true
          AND p.post_id IN (
            SELECT followed_id_posts FROM (
              SELECT p2.post_id AS followed_id_posts
              FROM posts p2
              WHERE p2.account_id IN (
                SELECT followed_id FROM account_follows WHERE follower_id = ${userId}
              )
              UNION
              SELECT a2.post_id AS followed_id_posts
              FROM authors a2
              WHERE a2.deleted = false
                AND a2.profile_id IN (
                  SELECT profile_id FROM profile_follows WHERE account_id = ${userId}
                )
              UNION
              SELECT fp.post_id AS followed_id_posts
              FROM featured_profiles fp
              WHERE fp.deleted = false
                AND fp.profile_id IN (
                  SELECT profile_id FROM profile_follows WHERE account_id = ${userId}
                )
            ) AS combined
          )
      `,
    );

    const total = parseInt(countResult.total, 10);
    res.json({ posts, total, hasMore: offset + posts.length < total });
  } catch (err) {
    console.error('Feed fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/follows/check ──────────────────────────────────────────────────

const AccountFollowRowSchema = z.object({ followed_id: z.number() });
const ProfileFollowRowSchema = z.object({ profile_id: z.number() });

router.get('/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const parseIds = (raw: unknown): number[] => {
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
  };

  const accountIds = parseIds(req.query.accountIds);
  const profileIds = parseIds(req.query.profileIds);

  if (accountIds.length === 0 && profileIds.length === 0) {
    res.json({ accounts: {}, profiles: {} });
    return;
  }

  try {
    const db = await getPool();

    // Build default maps (all false)
    const accounts: Record<string, boolean> = {};
    for (const id of accountIds) accounts[String(id)] = false;

    const profiles: Record<string, boolean> = {};
    for (const id of profileIds) profiles[String(id)] = false;

    if (accountIds.length > 0) {
      const rows = await db.any(
        sql.type(AccountFollowRowSchema)`
          SELECT followed_id
          FROM account_follows
          WHERE follower_id = ${userId}
            AND followed_id IN (${sql.join(
              accountIds.map((id) => sql.fragment`${id}`),
              sql.fragment`, `,
            )})
        `,
      );
      for (const row of rows) {
        accounts[String(row.followed_id)] = true;
      }
    }

    if (profileIds.length > 0) {
      const rows = await db.any(
        sql.type(ProfileFollowRowSchema)`
          SELECT profile_id
          FROM profile_follows
          WHERE account_id = ${userId}
            AND profile_id IN (${sql.join(
              profileIds.map((id) => sql.fragment`${id}`),
              sql.fragment`, `,
            )})
        `,
      );
      for (const row of rows) {
        profiles[String(row.profile_id)] = true;
      }
    }

    res.json({ accounts, profiles });
  } catch (err) {
    console.error('Follow check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
