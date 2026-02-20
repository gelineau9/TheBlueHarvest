import { Router, Request, Response } from 'express';
import { sql, DatabasePool } from 'slonik';
import { z } from 'zod';

const router = Router();

// Validation schema for public catalog query params
const publicCatalogQuerySchema = z.object({
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
 * GET /api/catalog/public
 * Returns a unified list of public profiles and posts
 * Supports filtering by content type, subtypes, search, sorting, and pagination
 */
router.get('/public', async (req: Request, res: Response) => {
  const pool: DatabasePool = req.app.get('dbPool');

  try {
    // Validate query parameters
    const parseResult = publicCatalogQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.issues,
      });
    }

    const { contentType, profileTypes, postTypes, search, sortBy, order, limit, offset } = parseResult.data;

    // Parse type filters
    const profileTypeIds = profileTypes
      ? profileTypes.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id) && id >= 1 && id <= 5)
      : [];
    const postTypeIds = postTypes
      ? postTypes.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id) && id >= 1 && id <= 4)
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
          pt.name AS type_name,
          p.name AS name,
          NULL AS thumbnail,
          COALESCE(p.details->>'description', '')::text AS preview,
          NULL AS author_name,
          a.username AS username,
          p.created_at AS created_at,
          p.updated_at AS updated_at
        FROM profiles p
        JOIN profile_types pt ON p.profile_type_id = pt.profile_type_id
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
          pt.name AS type_name,
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
        JOIN post_types pt ON ps.post_type_id = pt.post_type_id
        JOIN accounts a ON ps.account_id = a.account_id
        LEFT JOIN post_authors pa ON ps.post_id = pa.post_id AND pa.is_primary = true
        LEFT JOIN profiles author_profile ON pa.profile_id = author_profile.profile_id
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
    const unionQuery = queryParts.length === 1
      ? queryParts[0]
      : sql.fragment`(${queryParts[0]}) UNION ALL (${queryParts[1]})`;

    // Map sortBy to the correct column
    const sortColumn = sortBy === 'name' ? sql.identifier(['name']) : sql.identifier([sortBy]);
    const sortDirection = order === 'asc' ? sql.fragment`ASC` : sql.fragment`DESC`;

    // Count total items
    const countQuery = sql.type(z.object({ count: z.number() }))`
      SELECT COUNT(*)::int AS count FROM (${unionQuery}) AS combined
    `;

    const countResult = await pool.one(countQuery);
    const total = countResult.count;

    // Fetch paginated items
    const itemsQuery = sql.unsafe`
      SELECT * FROM (${unionQuery}) AS combined
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const itemsResult = await pool.any(itemsQuery);

    const items = itemsResult.map((row) => ({
      id: row.id as number,
      contentCategory: row.content_category as 'profile' | 'post',
      typeId: row.type_id as number,
      typeName: row.type_name as string,
      name: row.name as string,
      thumbnail: row.thumbnail as string | null,
      preview: row.preview as string,
      authorName: row.author_name as string | null,
      username: row.username as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return res.json({
      items,
      total,
      hasMore: offset + items.length < total,
    });
  } catch (error) {
    console.error('Error fetching public catalog:', error);
    return res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

export default router;
