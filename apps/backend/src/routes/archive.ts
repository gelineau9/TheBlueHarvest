import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import pool from '../config/database.js';

const router = Router();

// Helper function to get database pool
async function getPool() {
  return await pool;
}

// Validation schema for public archive query params
const publicArchiveQuerySchema = z.object({
  contentType: z.enum(['all', 'profiles', 'posts']).default('all'),
  profileTypes: z.string().optional(), // comma-separated profile type IDs (1-5)
  postTypes: z.string().optional(), // comma-separated post type IDs (1-4)
  search: z.string().max(100).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/archive/public
 * Returns a unified list of public profiles and posts
 * Supports filtering by content type, subtypes, search, sorting, and pagination
 */
router.get('/public', async (req: Request, res: Response) => {
  try {
    const db = await getPool();
    // Validate query parameters
    const parseResult = publicArchiveQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.issues,
      });
    }

    const { contentType, profileTypes, postTypes, search, sortBy, order, limit, offset } = parseResult.data;

    // Parse type filters
    const profileTypeIds = profileTypes
      ? profileTypes
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id) && id >= 1 && id <= 5)
      : [];
    const postTypeIds = postTypes
      ? postTypes
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id) && id >= 1 && id <= 4)
      : [];

    // Determine which content to include based on contentType and subtype filters
    const includeProfiles = contentType === 'all' || contentType === 'profiles';
    const includePosts = contentType === 'all' || contentType === 'posts';

    // Build the UNION query
    const queryParts: ReturnType<typeof sql.fragment>[] = [];

    // Profiles subquery
    if (includeProfiles) {
      const profileConditions = [sql.fragment`p.deleted = false`];

      if (profileTypeIds.length > 0) {
        profileConditions.push(sql.fragment`p.profile_type_id = ANY(${sql.array(profileTypeIds, 'int4')})`);
      }

      if (search) {
        profileConditions.push(sql.fragment`p.name ILIKE ${'%' + search + '%'}`);
      }

      const profileQuery = sql.fragment`
        SELECT
          p.profile_id AS id,
          'profile' AS content_category,
          p.profile_type_id AS type_id,
          pt.type_name AS type_name,
          p.name AS name,
          NULL AS thumbnail,
          COALESCE(p.details->>'description', '')::text AS preview,
          NULL AS author_name,
          a.username AS username,
          p.created_at AS created_at,
          p.updated_at AS updated_at
        FROM profiles p
        JOIN profile_types pt ON p.profile_type_id = pt.type_id
        JOIN accounts a ON p.account_id = a.account_id
        WHERE ${sql.join(profileConditions, sql.fragment` AND `)}
      `;

      queryParts.push(profileQuery);
    }

    // Posts subquery
    if (includePosts) {
      const postConditions = [sql.fragment`ps.deleted = false`];

      if (postTypeIds.length > 0) {
        postConditions.push(sql.fragment`ps.post_type_id = ANY(${sql.array(postTypeIds, 'int4')})`);
      }

      if (search) {
        postConditions.push(sql.fragment`ps.title ILIKE ${'%' + search + '%'}`);
      }

      const postQuery = sql.fragment`
        SELECT
          ps.post_id AS id,
          'post' AS content_category,
          ps.post_type_id AS type_id,
          pt.type_name AS type_name,
          ps.title AS name,
          CASE 
            WHEN ps.post_type_id IN (2, 3) AND ps.content->'images' IS NOT NULL AND jsonb_array_length(ps.content->'images') > 0 
            THEN ps.content->'images'->0->>'url'
            WHEN ps.post_type_id = 4 AND ps.content->'headerImage' IS NOT NULL 
            THEN ps.content->'headerImage'->>'url'
            ELSE NULL
          END AS thumbnail,
          CASE
            WHEN ps.post_type_id = 1 THEN LEFT(COALESCE(ps.content->>'body', ''), 200)
            ELSE LEFT(COALESCE(ps.content->>'description', ''), 200)
          END AS preview,
          author_profile.name AS author_name,
          a.username AS username,
          ps.created_at AS created_at,
          ps.updated_at AS updated_at
        FROM posts ps
        JOIN post_types pt ON ps.post_type_id = pt.type_id
        JOIN accounts a ON ps.account_id = a.account_id
        LEFT JOIN authors auth ON ps.post_id = auth.post_id AND auth.is_primary = true AND auth.deleted = false
        LEFT JOIN profiles author_profile ON auth.profile_id = author_profile.profile_id
        WHERE ${sql.join(postConditions, sql.fragment` AND `)}
      `;

      queryParts.push(postQuery);
    }

    // If no content types to include, return empty
    if (queryParts.length === 0) {
      return res.json({
        items: [],
        total: 0,
        hasMore: false,
      });
    }

    // Combine with UNION ALL
    const unionQuery =
      queryParts.length === 1 ? queryParts[0] : sql.fragment`(${queryParts[0]}) UNION ALL (${queryParts[1]})`;

    // Count total items
    const countQuery = sql.type(z.object({ count: z.number() }))`
      SELECT COUNT(*)::int AS count FROM (${unionQuery}) AS combined
    `;

    const countResult = await db.one(countQuery);
    const total = countResult.count;

    // Fetch paginated items with dynamic ORDER BY
    // We need to use sql.fragment for the ORDER BY clause since column names come from validated enum
    const orderByClause =
      sortBy === 'name'
        ? order === 'asc'
          ? sql.fragment`name ASC`
          : sql.fragment`name DESC`
        : sortBy === 'updated_at'
          ? order === 'asc'
            ? sql.fragment`updated_at ASC`
            : sql.fragment`updated_at DESC`
          : order === 'asc'
            ? sql.fragment`created_at ASC`
            : sql.fragment`created_at DESC`;

    const itemsQuery = sql.type(
      z.object({
        id: z.number(),
        content_category: z.string(),
        type_id: z.number(),
        type_name: z.string(),
        name: z.string(),
        thumbnail: z.string().nullable(),
        preview: z.string().nullable(),
        author_name: z.string().nullable(),
        username: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
      }),
    )`
      SELECT * FROM (${unionQuery}) AS combined
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const itemsResult = await db.any(itemsQuery);

    const items = itemsResult.map((row) => ({
      id: row.id,
      contentCategory: row.content_category as 'profile' | 'post',
      typeId: row.type_id,
      typeName: row.type_name,
      name: row.name,
      thumbnail: row.thumbnail,
      preview: row.preview || '',
      authorName: row.author_name,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      items,
      total,
      hasMore: offset + items.length < total,
    });
  } catch (error) {
    console.error('Error fetching public archive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch archive', details: errorMessage });
  }
});

export default router;
