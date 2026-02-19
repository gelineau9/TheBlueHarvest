/**
 * Posts Routes
 *
 * CRUD operations for posts with author attribution.
 * Posts are owned by accounts but visually attributed to profiles via the authors table.
 *
 * Routes:
 *   POST   /api/posts              - Create a post with primary author
 *   GET    /api/posts              - List authenticated user's posts
 *   GET    /api/posts/public       - List public posts (paginated)
 *   GET    /api/posts/:id          - Get a single post with authors
 *   PUT    /api/posts/:id          - Update a post
 *   DELETE /api/posts/:id          - Soft delete a post
 *   POST   /api/posts/:id/authors  - Add an author to a post
 *   DELETE /api/posts/:id/authors/:authorId - Remove an author
 */

import { Router, Response, Request } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditPost, isPostOwner } from './editors.js';
import { getAuthorableProfile, AUTHOR_PROFILE_TYPES } from '../utils/postValidation.js';

const router = Router();

async function getPool() {
  return await pool;
}

// POST /api/posts - Create a new post with primary author
router.post(
  '/',
  authenticateToken,
  [
    body('post_type_id').isInt({ min: 1, max: 4 }).withMessage('Post type must be between 1 and 4'),
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must not exceed 200 characters'),
    body('content').optional(),
    body('primary_author_profile_id').isInt().withMessage('Primary author profile ID is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { post_type_id, title, content, primary_author_profile_id } = req.body;
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

      // Create post and primary author in a transaction
      const result = await db.transaction(async (tx) => {
        // Create the post
        const post = await tx.one(
          sql.type(
            z.object({
              post_id: z.number(),
              account_id: z.number(),
              post_type_id: z.number(),
              title: z.string(),
              content: z.any().nullable(),
              created_at: z.string(),
            }),
          )`
            INSERT INTO posts (account_id, post_type_id, title, content)
            VALUES (
              ${userId},
              ${post_type_id},
              ${title},
              ${content !== null && content !== undefined ? sql.jsonb(content) : null}
            )
            RETURNING post_id, account_id, post_type_id, title, content, created_at::text
          `,
        );

        // Add primary author
        await tx.query(
          sql.type(z.object({}))`
            INSERT INTO authors (post_id, profile_id, is_primary)
            VALUES (${post.post_id}, ${primary_author_profile_id}, true)
          `,
        );

        return post;
      });

      res.status(201).json({
        post_id: result.post_id,
        account_id: result.account_id,
        post_type_id: result.post_type_id,
        title: result.title,
        content: result.content,
        created_at: result.created_at,
        primary_author: {
          profile_id: authorProfile.profile_id,
          name: authorProfile.name,
        },
      });
    } catch (err: any) {
      console.error('Post creation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /api/posts - List authenticated user's posts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const typeFilter = req.query.type ? parseInt(req.query.type as string) : null;

  try {
    const db = await getPool();

    const typeFilterFragment = typeFilter ? sql.fragment`AND p.post_type_id = ${typeFilter}` : sql.fragment``;

    const posts = await db.any(
      sql.type(
        z.object({
          post_id: z.number(),
          post_type_id: z.number(),
          title: z.string(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
        }),
      )`
        SELECT 
          p.post_id,
          p.post_type_id,
          p.title,
          p.created_at::text,
          p.updated_at::text,
          pt.type_name
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        WHERE p.account_id = ${userId}
          AND p.deleted = false
          ${typeFilterFragment}
        ORDER BY p.created_at DESC
      `,
    );

    res.json(posts);
  } catch (err) {
    console.error('Posts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/public - List public posts with pagination
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

  // Post type filter
  const validTypeIds = [1, 2, 3, 4];
  const postTypeParam = req.query.post_type_id as string;
  let postTypeIds: number[] = [];
  if (postTypeParam) {
    postTypeIds = postTypeParam
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
        ASC: sql.fragment`ORDER BY p.created_at ASC, p.post_id ASC`,
        DESC: sql.fragment`ORDER BY p.created_at DESC, p.post_id DESC`,
      },
      updated_at: {
        ASC: sql.fragment`ORDER BY p.updated_at ASC, p.post_id ASC`,
        DESC: sql.fragment`ORDER BY p.updated_at DESC, p.post_id DESC`,
      },
      title: {
        ASC: sql.fragment`ORDER BY p.title ASC, p.post_id ASC`,
        DESC: sql.fragment`ORDER BY p.title DESC, p.post_id DESC`,
      },
    };

    const orderByFragment = sortQueries[sortBy][sortOrder];

    const typeFilterFragment =
      postTypeIds.length > 0
        ? sql.fragment`AND p.post_type_id IN (${sql.join(
            postTypeIds.map((id) => sql.fragment`${id}`),
            sql.fragment`, `,
          )})`
        : sql.fragment``;

    const searchFilterFragment = searchTerm
      ? sql.fragment`AND p.title ILIKE ${'%' + searchTerm + '%'}`
      : sql.fragment``;

    // Get posts with primary author info
    const posts = await db.any(
      sql.type(
        z.object({
          post_id: z.number(),
          post_type_id: z.number(),
          title: z.string(),
          created_at: z.string(),
          type_name: z.string(),
          username: z.string(),
          primary_author_id: z.number().nullable(),
          primary_author_name: z.string().nullable(),
        }),
      )`
        SELECT 
          p.post_id,
          p.post_type_id,
          p.title,
          p.created_at::text,
          pt.type_name,
          a.username,
          author_profile.profile_id as primary_author_id,
          author_profile.name as primary_author_name
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        JOIN accounts a ON p.account_id = a.account_id
        LEFT JOIN authors auth ON p.post_id = auth.post_id AND auth.is_primary = true AND auth.deleted = false
        LEFT JOIN profiles author_profile ON auth.profile_id = author_profile.profile_id
        WHERE p.deleted = false
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
        FROM posts p
        WHERE p.deleted = false
        ${typeFilterFragment}
        ${searchFilterFragment}
      `,
    );

    const total = parseInt(countResult.total);
    const hasMore = offset + posts.length < total;

    res.json({
      posts,
      total,
      hasMore,
    });
  } catch (err) {
    console.error('Public posts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/:id - Get a single post with all authors
router.get('/:id', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    const post = await db.maybeOne(
      sql.type(
        z.object({
          post_id: z.number(),
          account_id: z.number(),
          post_type_id: z.number(),
          title: z.string(),
          content: z.any().nullable(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          type_name: z.string(),
          username: z.string(),
        }),
      )`
        SELECT 
          p.post_id, p.account_id, p.post_type_id, p.title, p.content,
          p.created_at::text, p.updated_at::text,
          pt.type_name, a.username
        FROM posts p
        JOIN post_types pt ON p.post_type_id = pt.type_id
        JOIN accounts a ON p.account_id = a.account_id
        WHERE p.post_id = ${postId} AND p.deleted = false
      `,
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Get all authors for this post
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
          auth.author_id,
          auth.profile_id,
          prof.name as profile_name,
          prof.profile_type_id,
          pt.type_name,
          auth.is_primary
        FROM authors auth
        JOIN profiles prof ON auth.profile_id = prof.profile_id
        JOIN profile_types pt ON prof.profile_type_id = pt.type_id
        WHERE auth.post_id = ${postId} AND auth.deleted = false
        ORDER BY auth.is_primary DESC, auth.created_at ASC
      `,
    );

    const canEdit = req.userId ? await canEditPost(db, postId, req.userId) : false;
    const isOwner = req.userId ? post.account_id === req.userId : false;

    res.json({
      post_id: post.post_id,
      account_id: post.account_id,
      post_type_id: post.post_type_id,
      type_name: post.type_name,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      updated_at: post.updated_at,
      username: post.username,
      authors,
      can_edit: canEdit,
      is_owner: isOwner,
    });
  } catch (err) {
    console.error('Post fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/posts/:id - Update a post
router.put(
  '/:id',
  authenticateToken,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('content').optional(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const userId = req.userId!;
    const { title, content } = req.body;

    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    if (title === undefined && content === undefined) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    try {
      const db = await getPool();

      // Verify post exists
      const existingPost = await db.maybeOne(
        sql.type(z.object({ post_id: z.number() }))`
          SELECT post_id FROM posts
          WHERE post_id = ${postId} AND deleted = false
        `,
      );

      if (!existingPost) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Check edit permission
      const hasEditPermission = await canEditPost(db, postId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to edit this post' });
        return;
      }

      // Build update query
      const updateFragments = [];
      if (title !== undefined) {
        updateFragments.push(sql.fragment`title = ${title}`);
      }
      if (content !== undefined) {
        updateFragments.push(sql.fragment`content = ${content !== null ? sql.jsonb(content) : null}`);
      }
      updateFragments.push(sql.fragment`updated_at = NOW()`);

      const updateFragment = sql.join(updateFragments, sql.fragment`, `);

      const updatedPost = await db.one(
        sql.type(
          z.object({
            post_id: z.number(),
            account_id: z.number(),
            post_type_id: z.number(),
            title: z.string(),
            content: z.any().nullable(),
            created_at: z.string(),
            updated_at: z.string(),
          }),
        )`
          UPDATE posts
          SET ${updateFragment}
          WHERE post_id = ${postId}
          RETURNING post_id, account_id, post_type_id, title, content, created_at::text, updated_at::text
        `,
      );

      res.json(updatedPost);
    } catch (err) {
      console.error('Post update error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/posts/:id - Soft delete a post (owner only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const userId = req.userId!;

  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    // Only owner can delete
    const result = await db.maybeOne(
      sql.type(z.object({ post_id: z.number() }))`
        UPDATE posts
        SET deleted = true
        WHERE post_id = ${postId}
          AND account_id = ${userId}
          AND deleted = false
        RETURNING post_id
      `,
    );

    if (!result) {
      res.status(404).json({ error: 'Post not found or not authorized' });
      return;
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Post deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
