/**
 * Users Routes
 *
 * Endpoints for user-specific data retrieval (dashboard functionality).
 * Returns content that the authenticated user owns or can edit.
 *
 * Routes:
 *   GET /api/users/me/posts       - List user's posts (owned or editor)
 *   GET /api/users/me/collections - List user's collections (owned or editor)
 *   GET /api/users/me/profiles    - List user's profiles (owned or editor)
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/users/me/posts - List user's posts with cursor pagination
router.get('/me/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const filter = (req.query.filter as string) || 'all'; // all | owned | editor

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

    // Cursor condition for pagination
    const cursorFragment = cursor 
      ? sql.fragment`AND p.post_id < ${cursor}` 
      : sql.fragment``;

    const posts = await db.any(
      sql.type(
        z.object({
          post_id: z.number(),
          post_type_id: z.number(),
          title: z.string(),
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
          p.created_at::text,
          p.updated_at::text,
          pt.type_name,
          (p.account_id = ${userId}) as is_owner
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        WHERE p.deleted = false
          AND ${filterFragment}
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
    console.error('User posts fetch error:', err);
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
    const cursorFragment = cursor 
      ? sql.fragment`AND c.collection_id < ${cursor}` 
      : sql.fragment``;

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
    console.error('User collections fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/profiles - List user's profiles with cursor pagination
router.get('/me/profiles', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const filter = (req.query.filter as string) || 'all'; // all | owned | editor

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

    // Cursor condition for pagination
    const cursorFragment = cursor 
      ? sql.fragment`AND pr.profile_id < ${cursor}` 
      : sql.fragment``;

    const profiles = await db.any(
      sql.type(
        z.object({
          profile_id: z.number(),
          profile_type_id: z.number(),
          name: z.string(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          is_owner: z.boolean(),
          parent_profile_id: z.number().nullable(),
          parent_profile_name: z.string().nullable(),
        }),
      )`
        SELECT 
          pr.profile_id,
          pr.profile_type_id,
          pr.name,
          pr.created_at::text,
          pr.updated_at::text,
          pt.type_name,
          (pr.account_id = ${userId}) as is_owner,
          pr.parent_profile_id,
          parent.name as parent_profile_name
        FROM profiles pr
        JOIN profile_types pt ON pr.profile_type_id = pt.type_id
        LEFT JOIN profiles parent ON pr.parent_profile_id = parent.profile_id
        WHERE pr.deleted = false
          AND ${filterFragment}
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
    console.error('User profiles fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
