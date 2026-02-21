/**
 * Comments Routes
 *
 * CRUD operations for post comments with optional character attribution.
 *
 * Routes:
 *   POST   /api/posts/:postId/comments  - Create a comment (authenticated)
 *   GET    /api/posts/:postId/comments  - Get all comments for a post
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

async function getPool() {
  return await pool;
}

// Zod schemas for type-safe queries
const CommentSchema = z.object({
  comment_id: z.number(),
  post_id: z.number(),
  user_id: z.number(),
  profile_id: z.number().nullable(),
  parent_comment_id: z.number().nullable(),
  content: z.string(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const CommentWithUserSchema = z.object({
  comment_id: z.number(),
  post_id: z.number(),
  user_id: z.number(),
  profile_id: z.number().nullable(),
  parent_comment_id: z.number().nullable(),
  content: z.string().nullable(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  username: z.string(),
  profile_name: z.string().nullable(),
});

const PostExistsSchema = z.object({
  post_id: z.number(),
});

const ProfileValidationSchema = z.object({
  profile_id: z.number(),
  account_id: z.number(),
  profile_type_id: z.number(),
  name: z.string(),
});

// POST /api/posts/:postId/comments - Create a comment
router.post(
  '/:postId/comments',
  authenticateToken,
  [
    body('content').trim().isLength({ min: 1 }).withMessage('Comment content is required'),
    body('profile_id').optional().isInt({ min: 1 }).withMessage('Profile ID must be a positive integer'),
    body('parent_comment_id').optional().isInt({ min: 1 }).withMessage('Parent comment ID must be a positive integer'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const postId = parseInt(Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId);
    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const userId = req.userId!;
    const { content, profile_id, parent_comment_id } = req.body;

    try {
      const db = await getPool();

      // Validate post exists
      const post = await db.maybeOne(
        sql.type(PostExistsSchema)`
          SELECT post_id FROM posts WHERE post_id = ${postId} AND deleted = FALSE
        `,
      );

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // If profile_id is provided, validate it exists and belongs to the user
      // Only allow characters (profile_type_id = 1) for attribution
      if (profile_id) {
        const profile = await db.maybeOne(
          sql.type(ProfileValidationSchema)`
            SELECT profile_id, account_id, profile_type_id, name
            FROM profiles
            WHERE profile_id = ${profile_id}
              AND account_id = ${userId}
              AND profile_type_id = 1
              AND deleted = FALSE
          `,
        );

        if (!profile) {
          res.status(400).json({
            error: 'Invalid profile: must be a character that you own',
          });
          return;
        }
      }

      // If parent_comment_id is provided, validate it exists and belongs to the same post
      if (parent_comment_id) {
        const parentComment = await db.maybeOne(
          sql.type(z.object({ comment_id: z.number() }))`
            SELECT comment_id FROM comments 
            WHERE comment_id = ${parent_comment_id} 
              AND post_id = ${postId}
              AND is_deleted = FALSE
          `,
        );

        if (!parentComment) {
          res.status(400).json({ error: 'Parent comment not found' });
          return;
        }
      }

      // Create the comment
      const comment = await db.one(
        sql.type(CommentSchema)`
          INSERT INTO comments (post_id, user_id, profile_id, parent_comment_id, content)
          VALUES (
            ${postId},
            ${userId},
            ${profile_id ?? null},
            ${parent_comment_id ?? null},
            ${content}
          )
          RETURNING 
            comment_id, post_id, user_id, profile_id, parent_comment_id,
            content, is_deleted, 
            created_at::text, updated_at::text
        `,
      );

      // Fetch the comment with user info for response
      const commentWithUser = await db.one(
        sql.type(CommentWithUserSchema)`
          SELECT 
            c.comment_id, c.post_id, c.user_id, c.profile_id, c.parent_comment_id,
            c.content, c.is_deleted,
            c.created_at::text, c.updated_at::text,
            a.username,
            p.name as profile_name
          FROM comments c
          JOIN accounts a ON c.user_id = a.account_id
          LEFT JOIN profiles p ON c.profile_id = p.profile_id
          WHERE c.comment_id = ${comment.comment_id}
        `,
      );

      res.status(201).json(commentWithUser);
    } catch (err) {
      console.error('Error creating comment:', err);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  },
);

// GET /api/posts/:postId/comments - Get all comments for a post
router.get('/:postId/comments', async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    // Validate post exists
    const post = await db.maybeOne(
      sql.type(PostExistsSchema)`
        SELECT post_id FROM posts WHERE post_id = ${postId} AND deleted = FALSE
      `,
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Get all comments for the post with user info
    // For deleted comments, return null content
    const comments = await db.any(
      sql.type(CommentWithUserSchema)`
        SELECT 
          c.comment_id, c.post_id, c.user_id, c.profile_id, c.parent_comment_id,
          CASE WHEN c.is_deleted THEN NULL ELSE c.content END as content,
          c.is_deleted,
          c.created_at::text, c.updated_at::text,
          a.username,
          p.name as profile_name
        FROM comments c
        JOIN accounts a ON c.user_id = a.account_id
        LEFT JOIN profiles p ON c.profile_id = p.profile_id
        WHERE c.post_id = ${postId}
        ORDER BY c.created_at ASC
      `,
    );

    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

export default router;
