/**
 * Likes Routes
 *
 * Toggle likes on posts and comments. All endpoints require authentication.
 *
 * Routes:
 *   POST   /api/likes/posts/:id    - Like a post
 *   DELETE /api/likes/posts/:id    - Unlike a post
 *   POST   /api/likes/comments/:id - Like a comment
 *   DELETE /api/likes/comments/:id - Unlike a comment
 *
 * Response shape for all four: { liked: boolean, like_count: number }
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

const LikeCountSchema = z.object({ count: z.string() });

async function getPostLikeCount(db: Awaited<ReturnType<typeof getPool>>, postId: number): Promise<number> {
  const result = await db.one(
    sql.type(LikeCountSchema)`
      SELECT COUNT(*)::text AS count FROM post_likes WHERE post_id = ${postId}
    `,
  );
  return parseInt(result.count, 10);
}

async function getCommentLikeCount(db: Awaited<ReturnType<typeof getPool>>, commentId: number): Promise<number> {
  const result = await db.one(
    sql.type(LikeCountSchema)`
      SELECT COUNT(*)::text AS count FROM comment_likes WHERE comment_id = ${commentId}
    `,
  );
  return parseInt(result.count, 10);
}

// ─── Post likes ─────────────────────────────────────────────────────────────

// POST /api/likes/posts/:id - Like a post
router.post('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();

    // Verify post exists and is published (or let the FK fail naturally)
    const post = await db.maybeOne(
      sql.type(z.object({ post_id: z.number() }))`
        SELECT post_id FROM posts WHERE post_id = ${postId} AND deleted = false AND is_published = true
      `,
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Insert, ignoring duplicates
    await db.query(
      sql.type(z.object({}))`
        INSERT INTO post_likes (account_id, post_id) VALUES (${userId}, ${postId})
        ON CONFLICT DO NOTHING
      `,
    );

    const like_count = await getPostLikeCount(db, postId);
    res.json({ liked: true, like_count });
  } catch (err) {
    console.error('Post like error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/likes/posts/:id - Unlike a post
router.delete('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();

    await db.query(
      sql.type(z.object({}))`
        DELETE FROM post_likes WHERE account_id = ${userId} AND post_id = ${postId}
      `,
    );

    const like_count = await getPostLikeCount(db, postId);
    res.json({ liked: false, like_count });
  } catch (err) {
    console.error('Post unlike error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Comment likes ───────────────────────────────────────────────────────────

// POST /api/likes/comments/:id - Like a comment
router.post('/comments/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const commentId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(commentId)) {
    res.status(400).json({ error: 'Invalid comment ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();

    // Verify comment exists and is not deleted
    const comment = await db.maybeOne(
      sql.type(z.object({ comment_id: z.number() }))`
        SELECT comment_id FROM comments WHERE comment_id = ${commentId} AND is_deleted = false
      `,
    );

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    await db.query(
      sql.type(z.object({}))`
        INSERT INTO comment_likes (account_id, comment_id) VALUES (${userId}, ${commentId})
        ON CONFLICT DO NOTHING
      `,
    );

    const like_count = await getCommentLikeCount(db, commentId);
    res.json({ liked: true, like_count });
  } catch (err) {
    console.error('Comment like error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/likes/comments/:id - Unlike a comment
router.delete('/comments/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const commentId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(commentId)) {
    res.status(400).json({ error: 'Invalid comment ID' });
    return;
  }

  const userId = req.userId!;

  try {
    const db = await getPool();

    await db.query(
      sql.type(z.object({}))`
        DELETE FROM comment_likes WHERE account_id = ${userId} AND comment_id = ${commentId}
      `,
    );

    const like_count = await getCommentLikeCount(db, commentId);
    res.json({ liked: false, like_count });
  } catch (err) {
    console.error('Comment unlike error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
