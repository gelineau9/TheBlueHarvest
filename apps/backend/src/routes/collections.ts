/**
 * Collections Routes
 *
 * CRUD operations for collections with author attribution.
 * Collections group multiple posts together (M:N relationship).
 * Collections are owned by accounts but visually attributed to profiles via collection_authors.
 *
 * Collection Types:
 *   - collection (NULL) - any post types allowed
 *   - chronicle (1) - writing only
 *   - album (3) - media only
 *   - gallery (2) - art only
 *   - event-series (4) - events only
 *
 * Routes:
 *   POST   /api/collections              - Create a collection with primary author
 *   GET    /api/collections              - List authenticated user's collections
 *   GET    /api/collections/public       - List public collections (paginated)
 *   GET    /api/collections/:id          - Get a single collection with authors and posts
 *   PUT    /api/collections/:id          - Update a collection
 *   DELETE /api/collections/:id          - Soft delete a collection
 *   POST   /api/collections/:id/authors  - Add an author to a collection
 *   DELETE /api/collections/:id/authors/:authorId - Remove an author
 */

import { Router, Response, Request } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditCollection } from './editors.js';
import { getAuthorableProfile } from '../utils/postValidation.js';

const router = Router();

async function getPool() {
  return await pool;
}

// POST /api/collections - Create a new collection with primary author
router.post(
  '/',
  authenticateToken,
  [
    body('collection_type_id').isInt({ min: 1, max: 5 }).withMessage('Collection type must be between 1 and 5'),
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must not exceed 200 characters'),
    body('description').optional().trim(),
    body('content').optional(),
    body('primary_author_profile_id').isInt().withMessage('Primary author profile ID is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { collection_type_id, title, description, content, primary_author_profile_id } = req.body;
    const userId = req.userId!;

    try {
      const db = await getPool();

      // Verify the primary author profile exists, is owned by user, and can author
      const authorProfile = await getAuthorableProfile(db, primary_author_profile_id, userId);
      if (!authorProfile) {
        res.status(400).json({
          error: 'Primary author must be a character, kinship, or organization that you own',
        });
        return;
      }

      // Create collection and primary author in a transaction
      const result = await db.transaction(async (tx) => {
        // Create the collection
        const collection = await tx.one(
          sql.type(
            z.object({
              collection_id: z.number(),
              account_id: z.number(),
              collection_type_id: z.number(),
              title: z.string(),
              description: z.string().nullable(),
              content: z.any().nullable(),
              created_at: z.string(),
            }),
          )`
            INSERT INTO collections (account_id, collection_type_id, title, description, content)
            VALUES (
              ${userId},
              ${collection_type_id},
              ${title},
              ${description || null},
              ${content !== null && content !== undefined ? sql.jsonb(content) : null}
            )
            RETURNING collection_id, account_id, collection_type_id, title, description, content, created_at::text
          `,
        );

        // Add primary author
        await tx.query(
          sql.type(z.object({}))`
            INSERT INTO collection_authors (collection_id, profile_id, is_primary)
            VALUES (${collection.collection_id}, ${primary_author_profile_id}, true)
          `,
        );

        return collection;
      });

      res.status(201).json({
        collection_id: result.collection_id,
        account_id: result.account_id,
        collection_type_id: result.collection_type_id,
        title: result.title,
        description: result.description,
        content: result.content,
        created_at: result.created_at,
        primary_author: {
          profile_id: authorProfile.profile_id,
          name: authorProfile.name,
        },
      });
    } catch (err: any) {
      console.error('Collection creation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /api/collections - List authenticated user's collections
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const typeFilter = req.query.type ? parseInt(req.query.type as string) : null;

  try {
    const db = await getPool();

    const typeFilterFragment = typeFilter ? sql.fragment`AND c.collection_type_id = ${typeFilter}` : sql.fragment``;

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
          post_count: z.string(),
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
          (
            SELECT COUNT(*)::text 
            FROM collection_posts cp 
            WHERE cp.collection_id = c.collection_id AND cp.deleted = false
          ) as post_count
        FROM collections c
        JOIN collection_types ct ON c.collection_type_id = ct.type_id
        WHERE c.account_id = ${userId}
          AND c.deleted = false
          ${typeFilterFragment}
        ORDER BY c.created_at DESC
      `,
    );

    res.json(collections);
  } catch (err) {
    console.error('Collections fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/collections/public - List public collections with pagination
router.get('/public', async (req: Request, res: Response) => {
  const parsedLimit = parseInt(req.query.limit as string) || 50;
  const limit = Math.min(Math.max(parsedLimit, 1), 100);
  const parsedOffset = parseInt(req.query.offset as string) || 0;
  const offset = Math.max(parsedOffset, 0);

  // Sort parameters
  const allowedSortColumns = ['created_at', 'updated_at', 'title'] as const;
  type SortColumn = (typeof allowedSortColumns)[number];
  const sortByParam = req.query.sortBy as string;
  const sortBy: SortColumn = allowedSortColumns.includes(sortByParam as SortColumn)
    ? (sortByParam as SortColumn)
    : 'created_at';
  const orderParam = ((req.query.order as string) || 'desc').toUpperCase();
  const sortOrder: 'ASC' | 'DESC' = orderParam === 'ASC' ? 'ASC' : 'DESC';

  // Collection type filter
  const validTypeIds = [1, 2, 3, 4, 5];
  const collectionTypeParam = req.query.collection_type_id as string;
  let collectionTypeIds: number[] = [];
  if (collectionTypeParam) {
    collectionTypeIds = collectionTypeParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && validTypeIds.includes(id));
  }

  // Search
  const searchParam = req.query.search as string;
  const searchTerm = searchParam ? searchParam.trim().slice(0, 100) : '';

  try {
    const db = await getPool();

    const sortQueries = {
      created_at: {
        ASC: sql.fragment`ORDER BY c.created_at ASC, c.collection_id ASC`,
        DESC: sql.fragment`ORDER BY c.created_at DESC, c.collection_id DESC`,
      },
      updated_at: {
        ASC: sql.fragment`ORDER BY c.updated_at ASC, c.collection_id ASC`,
        DESC: sql.fragment`ORDER BY c.updated_at DESC, c.collection_id DESC`,
      },
      title: {
        ASC: sql.fragment`ORDER BY c.title ASC, c.collection_id ASC`,
        DESC: sql.fragment`ORDER BY c.title DESC, c.collection_id DESC`,
      },
    };

    const orderByFragment = sortQueries[sortBy][sortOrder];

    const typeFilterFragment =
      collectionTypeIds.length > 0
        ? sql.fragment`AND c.collection_type_id IN (${sql.join(
            collectionTypeIds.map((id) => sql.fragment`${id}`),
            sql.fragment`, `,
          )})`
        : sql.fragment``;

    const searchFilterFragment = searchTerm
      ? sql.fragment`AND c.title ILIKE ${'%' + searchTerm + '%'}`
      : sql.fragment``;

    // Get collections with primary author info
    const collections = await db.any(
      sql.type(
        z.object({
          collection_id: z.number(),
          collection_type_id: z.number(),
          title: z.string(),
          description: z.string().nullable(),
          created_at: z.string(),
          type_name: z.string(),
          username: z.string(),
          primary_author_id: z.number().nullable(),
          primary_author_name: z.string().nullable(),
          post_count: z.string(),
        }),
      )`
        SELECT 
          c.collection_id,
          c.collection_type_id,
          c.title,
          c.description,
          c.created_at::text,
          ct.type_name,
          a.username,
          author_profile.profile_id as primary_author_id,
          author_profile.name as primary_author_name,
          (
            SELECT COUNT(*)::text 
            FROM collection_posts cp 
            WHERE cp.collection_id = c.collection_id AND cp.deleted = false
          ) as post_count
        FROM collections c
        JOIN collection_types ct ON c.collection_type_id = ct.type_id
        JOIN accounts a ON c.account_id = a.account_id
        LEFT JOIN collection_authors ca ON c.collection_id = ca.collection_id AND ca.is_primary = true AND ca.deleted = false
        LEFT JOIN profiles author_profile ON ca.profile_id = author_profile.profile_id
        WHERE c.deleted = false
        ${typeFilterFragment}
        ${searchFilterFragment}
        ${orderByFragment}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    );

    const countResult = await db.one(
      sql.type(z.object({ total: z.string() }))`
        SELECT COUNT(*) as total
        FROM collections c
        WHERE c.deleted = false
        ${typeFilterFragment}
        ${searchFilterFragment}
      `,
    );

    const total = parseInt(countResult.total);
    const hasMore = offset + collections.length < total;

    res.json({
      collections,
      total,
      hasMore,
    });
  } catch (err) {
    console.error('Public collections fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/collections/:id - Get a single collection with authors and posts
router.get('/:id', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const collectionId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (isNaN(collectionId)) {
    res.status(400).json({ error: 'Invalid collection ID' });
    return;
  }

  try {
    const db = await getPool();

    const collection = await db.maybeOne(
      sql.type(
        z.object({
          collection_id: z.number(),
          account_id: z.number(),
          collection_type_id: z.number(),
          title: z.string(),
          description: z.string().nullable(),
          content: z.any().nullable(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          allowed_post_types: z.array(z.number()).nullable(),
          username: z.string(),
        }),
      )`
        SELECT 
          c.collection_id, c.account_id, c.collection_type_id, c.title, c.description, c.content,
          c.created_at::text, c.updated_at::text,
          ct.type_name, ct.allowed_post_types, a.username
        FROM collections c
        JOIN collection_types ct ON c.collection_type_id = ct.type_id
        JOIN accounts a ON c.account_id = a.account_id
        WHERE c.collection_id = ${collectionId} AND c.deleted = false
      `,
    );

    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    // Get all authors for this collection
    const authors = await db.any(
      sql.type(
        z.object({
          author_id: z.number(),
          profile_id: z.number(),
          profile_name: z.string(),
          profile_type_id: z.number(),
          type_name: z.string(),
          is_primary: z.boolean(),
        }),
      )`
        SELECT 
          ca.author_id,
          ca.profile_id,
          prof.name as profile_name,
          prof.profile_type_id,
          pt.type_name,
          ca.is_primary
        FROM collection_authors ca
        JOIN profiles prof ON ca.profile_id = prof.profile_id
        JOIN profile_types pt ON prof.profile_type_id = pt.type_id
        WHERE ca.collection_id = ${collectionId} AND ca.deleted = false
        ORDER BY ca.is_primary DESC, ca.created_at ASC
      `,
    );

    // Get posts in this collection (with sort_order)
    const posts = await db.any(
      sql.type(
        z.object({
          collection_post_id: z.number(),
          post_id: z.number(),
          title: z.string(),
          post_type_id: z.number(),
          post_type_name: z.string(),
          sort_order: z.number(),
          primary_author_name: z.string().nullable(),
        }),
      )`
        SELECT 
          cp.collection_post_id,
          p.post_id,
          p.title,
          p.post_type_id,
          pt.type_name as post_type_name,
          cp.sort_order,
          author_profile.name as primary_author_name
        FROM collection_posts cp
        JOIN posts p ON cp.post_id = p.post_id
        JOIN post_types pt ON p.post_type_id = pt.type_id
        LEFT JOIN authors auth ON p.post_id = auth.post_id AND auth.is_primary = true AND auth.deleted = false
        LEFT JOIN profiles author_profile ON auth.profile_id = author_profile.profile_id
        WHERE cp.collection_id = ${collectionId} 
          AND cp.deleted = false 
          AND p.deleted = false
        ORDER BY cp.sort_order ASC
      `,
    );

    const canEdit = req.userId ? await canEditCollection(db, collectionId, req.userId) : false;
    const isOwner = req.userId ? collection.account_id === req.userId : false;

    res.json({
      collection_id: collection.collection_id,
      account_id: collection.account_id,
      collection_type_id: collection.collection_type_id,
      type_name: collection.type_name,
      allowed_post_types: collection.allowed_post_types,
      title: collection.title,
      description: collection.description,
      content: collection.content,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      username: collection.username,
      authors,
      posts,
      can_edit: canEdit,
      is_owner: isOwner,
    });
  } catch (err) {
    console.error('Collection fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/collections/:id - Update a collection
router.put(
  '/:id',
  authenticateToken,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description').optional().trim(),
    body('content').optional(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const collectionId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const userId = req.userId!;
    const { title, description, content } = req.body;

    if (isNaN(collectionId)) {
      res.status(400).json({ error: 'Invalid collection ID' });
      return;
    }

    if (title === undefined && description === undefined && content === undefined) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    try {
      const db = await getPool();

      // Verify collection exists
      const existingCollection = await db.maybeOne(
        sql.type(z.object({ collection_id: z.number() }))`
          SELECT collection_id FROM collections
          WHERE collection_id = ${collectionId} AND deleted = false
        `,
      );

      if (!existingCollection) {
        res.status(404).json({ error: 'Collection not found' });
        return;
      }

      // Check edit permission
      const hasEditPermission = await canEditCollection(db, collectionId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to edit this collection' });
        return;
      }

      // Build update query
      const updateFragments = [];
      if (title !== undefined) {
        updateFragments.push(sql.fragment`title = ${title}`);
      }
      if (description !== undefined) {
        updateFragments.push(sql.fragment`description = ${description || null}`);
      }
      if (content !== undefined) {
        updateFragments.push(sql.fragment`content = ${content !== null ? sql.jsonb(content) : null}`);
      }
      updateFragments.push(sql.fragment`updated_at = NOW()`);

      const updateFragment = sql.join(updateFragments, sql.fragment`, `);

      const updatedCollection = await db.one(
        sql.type(
          z.object({
            collection_id: z.number(),
            account_id: z.number(),
            collection_type_id: z.number(),
            title: z.string(),
            description: z.string().nullable(),
            content: z.any().nullable(),
            created_at: z.string(),
            updated_at: z.string(),
          }),
        )`
          UPDATE collections
          SET ${updateFragment}
          WHERE collection_id = ${collectionId}
          RETURNING collection_id, account_id, collection_type_id, title, description, content, created_at::text, updated_at::text
        `,
      );

      res.json(updatedCollection);
    } catch (err) {
      console.error('Collection update error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/collections/:id - Soft delete a collection (owner only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const collectionId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const userId = req.userId!;

  if (isNaN(collectionId)) {
    res.status(400).json({ error: 'Invalid collection ID' });
    return;
  }

  try {
    const db = await getPool();

    // Only owner can delete
    const result = await db.maybeOne(
      sql.type(z.object({ collection_id: z.number() }))`
        UPDATE collections
        SET deleted = true
        WHERE collection_id = ${collectionId}
          AND account_id = ${userId}
          AND deleted = false
        RETURNING collection_id
      `,
    );

    if (!result) {
      res.status(404).json({ error: 'Collection not found or not authorized' });
      return;
    }

    res.status(200).json({ message: 'Collection deleted successfully' });
  } catch (err) {
    console.error('Collection deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
