/**
 * Spotlight Route
 *
 * Public endpoint — no auth required.
 *
 * GET /api/spotlight
 *   Returns up to 12 items across three priority lanes:
 *     Lane 1 "featured"  — manually pinned posts (featured_posts table)
 *     Lane 2 "today"     — events happening today (post_type_id = 4)
 *     Lane 3 "trending"  — highest-liked writing post + highest-liked art post from the current calendar month
 */

import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

const router = Router();

// Shared row schema — source / display_order are set in JS after each query
const SpotlightRowSchema = z.object({
  post_id: z.number(),
  post_type_id: z.number(),
  title: z.string(),
  content: z.unknown().nullable(),
  type_name: z.string(),
  username: z.string(),
  primary_author_id: z.number().nullable(),
  primary_author_name: z.string().nullable(),
  like_count: z.number(),
  created_at: z.string(),
});

type SpotlightRow = z.infer<typeof SpotlightRowSchema>;

interface SpotlightItem extends SpotlightRow {
  source: 'featured' | 'today' | 'trending';
  display_order: number | null;
}

// GET /api/spotlight
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getPool();

    // ── Lane 1: Featured (manually pinned) ──────────────────────────────────
    const lane1Rows = await db.any(
      sql.type(
        z.object({
          ...SpotlightRowSchema.shape,
          display_order: z.number(),
        }),
      )`
        SELECT
          p.post_id,
          p.post_type_id,
          p.title,
          p.content,
          p.created_at::text,
          pt.type_name,
          a.username,
          author_profile.profile_id  AS primary_author_id,
          author_profile.name        AS primary_author_name,
          (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
          fp.display_order
        FROM featured_posts fp
        JOIN posts p        ON fp.post_id        = p.post_id
        JOIN post_types pt  ON p.post_type_id    = pt.type_id
        JOIN accounts a     ON p.account_id      = a.account_id
        LEFT JOIN authors auth
          ON auth.post_id = p.post_id AND auth.is_primary = true AND auth.deleted = false
        LEFT JOIN profiles author_profile
          ON auth.profile_id = author_profile.profile_id
        WHERE p.deleted = false
          AND p.is_published = true
        ORDER BY fp.display_order ASC, p.created_at ASC
      `,
    );

    const lane1: SpotlightItem[] = lane1Rows.map((row) => ({
      ...row,
      source: 'featured' as const,
      display_order: row.display_order,
    }));

    const lane1Ids = lane1.map((r) => r.post_id);

    // ── Lane 2: Today's events ───────────────────────────────────────────────
    const excludeLane1Fragment =
      lane1Ids.length > 0
        ? sql.fragment`AND p.post_id NOT IN (${sql.join(
            lane1Ids.map((id) => sql.fragment`${id}`),
            sql.fragment`, `,
          )})`
        : sql.fragment``;

    const lane2Rows = await db.any(
      sql.type(SpotlightRowSchema)`
        SELECT
          p.post_id,
          p.post_type_id,
          p.title,
          p.content,
          p.created_at::text,
          pt.type_name,
          a.username,
          author_profile.profile_id  AS primary_author_id,
          author_profile.name        AS primary_author_name,
          (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.post_id) AS like_count
        FROM posts p
        JOIN post_types pt  ON p.post_type_id = pt.type_id
        JOIN accounts a     ON p.account_id   = a.account_id
        LEFT JOIN authors auth
          ON auth.post_id = p.post_id AND auth.is_primary = true AND auth.deleted = false
        LEFT JOIN profiles author_profile
          ON auth.profile_id = author_profile.profile_id
        WHERE p.deleted = false
          AND p.is_published = true
          AND p.post_type_id = 4
          AND (p.content->>'eventDateTime')::date = CURRENT_DATE
          ${excludeLane1Fragment}
        LIMIT 3
      `,
    );

    const lane2: SpotlightItem[] = lane2Rows.map((row) => ({
      ...row,
      source: 'today' as const,
      display_order: null,
    }));

    // ── Lane 3: Trending — 1 writing + 1 art ───────────────────────────────
    const lane1And2Ids = [...lane1Ids, ...lane2.map((r) => r.post_id)];

    const excludeLane1And2Fragment =
      lane1And2Ids.length > 0
        ? sql.fragment`AND p.post_id NOT IN (${sql.join(
            lane1And2Ids.map((id) => sql.fragment`${id}`),
            sql.fragment`, `,
          )})`
        : sql.fragment``;

    // Helper: fetch top post of a given type, optionally scoped to current month
    const fetchTopPost = async (postTypeId: number, monthOnly: boolean) => {
      const monthFilter = monthOnly
        ? sql.fragment`AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', NOW())`
        : sql.fragment``;
      return db.any(
        sql.type(SpotlightRowSchema)`
          SELECT
            p.post_id,
            p.post_type_id,
            p.title,
            p.content,
            p.created_at::text,
            pt.type_name,
            a.username,
            author_profile.profile_id  AS primary_author_id,
            author_profile.name        AS primary_author_name,
            (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.post_id) AS like_count
          FROM posts p
          JOIN post_types pt  ON p.post_type_id = pt.type_id
          JOIN accounts a     ON p.account_id   = a.account_id
          LEFT JOIN authors auth
            ON auth.post_id = p.post_id AND auth.is_primary = true AND auth.deleted = false
          LEFT JOIN profiles author_profile
            ON auth.profile_id = author_profile.profile_id
          WHERE p.deleted = false
            AND p.is_published = true
            AND p.post_type_id = ${postTypeId}
            ${monthFilter}
            ${excludeLane1And2Fragment}
          ORDER BY like_count DESC, p.created_at DESC
          LIMIT 1
        `,
      );
    };

    // Top writing post (post_type_id = 1) — current month, fall back to all-time
    let trendingWritingRows = await fetchTopPost(1, true);
    if (trendingWritingRows.length === 0) trendingWritingRows = await fetchTopPost(1, false);

    // Top art post (post_type_id = 2) — current month, fall back to all-time
    let trendingArtRows = await fetchTopPost(2, true);
    if (trendingArtRows.length === 0) trendingArtRows = await fetchTopPost(2, false);

    const lane3: SpotlightItem[] = [...trendingWritingRows, ...trendingArtRows].map((row) => ({
      ...row,
      source: 'trending' as const,
      display_order: null,
    }));

    // ── Combine and cap at 12 ────────────────────────────────────────────────
    const items = [...lane1, ...lane2, ...lane3].slice(0, 12);

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('Spotlight fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
