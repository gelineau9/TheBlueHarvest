/**
 * Activity Routes
 *
 * Public sitewide activity feed — no auth required.
 * Returns a unified, time-sorted list of recent posts, profile creations,
 * and comments across the site.
 *
 * Routes:
 *   GET /api/activity  - Sitewide activity feed
 *     Query params:
 *       limit   (default 10, max 20)
 *       offset  (default 0)
 */

import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

const router = Router();

const ActivityRowSchema = z.object({
  kind: z.enum(['post', 'profile', 'comment']),
  id: z.number(),
  title: z.string(),
  type_name: z.string(),
  username: z.string(),
  account_id: z.number(),
  // for comments: post the comment belongs to
  post_id: z.number().nullable(),
  post_title: z.string().nullable(),
  created_at: z.string(),
});

const ActivityCountSchema = z.object({ total: z.string() });

// GET /api/activity
router.get('/', async (req: Request, res: Response) => {
  const limitRaw = parseInt(String(req.query.limit ?? '10'));
  const offsetRaw = parseInt(String(req.query.offset ?? '0'));
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 10 : Math.min(limitRaw, 20);
  const offset = isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;

  try {
    const db = await getPool();

    const items = await db.any(
      sql.type(ActivityRowSchema)`
        SELECT * FROM (
          -- Posts
          SELECT
            'post'::text                   AS kind,
            p.post_id                      AS id,
            p.title                        AS title,
            pt.type_name                   AS type_name,
            a.username                     AS username,
            a.account_id                   AS account_id,
            NULL::int                      AS post_id,
            NULL::text                     AS post_title,
            p.created_at::text             AS created_at
          FROM posts p
          JOIN post_types pt ON p.post_type_id = pt.type_id
          JOIN accounts   a  ON p.account_id   = a.account_id
          WHERE p.deleted      = false
            AND p.is_published = true

          UNION ALL

          -- Profiles
          SELECT
            'profile'::text                AS kind,
            pr.profile_id                  AS id,
            pr.name                        AS title,
            prt.type_name                  AS type_name,
            a.username                     AS username,
            a.account_id                   AS account_id,
            NULL::int                      AS post_id,
            NULL::text                     AS post_title,
            pr.created_at::text            AS created_at
          FROM profiles pr
          JOIN profile_types prt ON pr.profile_type_id = prt.type_id
          JOIN accounts      a   ON pr.account_id      = a.account_id
          WHERE pr.deleted      = false
            AND pr.is_published = true

          UNION ALL

          -- Comments
          SELECT
            'comment'::text                AS kind,
            c.comment_id                   AS id,
            ''                             AS title,
            'Comment'                      AS type_name,
            a.username                     AS username,
            a.account_id                   AS account_id,
            p.post_id                      AS post_id,
            p.title                        AS post_title,
            c.created_at::text             AS created_at
          FROM comments c
          JOIN accounts a ON c.account_id = a.account_id
          JOIN posts    p ON c.post_id    = p.post_id
          WHERE c.is_deleted   = false
            AND p.deleted      = false
            AND p.is_published = true
        ) activity
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    );

    const countResult = await db.one(
      sql.type(ActivityCountSchema)`
        SELECT COUNT(*)::text AS total FROM (
          SELECT p.post_id AS id
          FROM posts p
          WHERE p.deleted      = false
            AND p.is_published = true

          UNION ALL

          SELECT pr.profile_id AS id
          FROM profiles pr
          WHERE pr.deleted      = false
            AND pr.is_published = true

          UNION ALL

          SELECT c.comment_id AS id
          FROM comments c
          JOIN posts p ON c.post_id = p.post_id
          WHERE c.is_deleted   = false
            AND p.deleted      = false
            AND p.is_published = true
        ) combined
      `,
    );

    const total = parseInt(countResult.total, 10);
    res.json({ items, total, hasMore: offset + items.length < total });
  } catch (err) {
    console.error('Activity feed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
