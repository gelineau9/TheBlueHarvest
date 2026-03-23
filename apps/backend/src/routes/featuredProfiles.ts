/**
 * Featured Profiles Routes
 *
 * Manages the featured_profiles junction table — which profiles are featured
 * in a given post. Only supported for writing (1), art (2), and media (3) posts.
 *
 * Routes:
 *   POST   /api/posts/:id/featured            - Add a featured profile to a post
 *   DELETE /api/posts/:id/featured/:featuredId - Remove a featured profile from a post
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditPost } from './editors.js';

const router = Router();

// POST /api/posts/:id/featured - Add a featured profile to a post
router.post(
  '/:id/featured',
  authenticateToken,
  [body('profile_id').isInt({ min: 1 }).withMessage('profile_id must be a positive integer')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const userId = req.userId!;
    const { profile_id } = req.body;

    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    try {
      const db = await getPool();

      // Verify post exists and is a supported type (writing=1, art=2, media=3, NOT event=4)
      const post = await db.maybeOne(
        sql.type(z.object({ post_id: z.number(), post_type_id: z.number() }))`
          SELECT post_id, post_type_id FROM posts
          WHERE post_id = ${postId} AND deleted = false
        `,
      );

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (post.post_type_id === 4) {
        res.status(400).json({ error: 'Featured profiles are not supported for event posts' });
        return;
      }

      // Check edit permission
      const hasEditPermission = await canEditPost(db, postId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to edit this post' });
        return;
      }

      // Verify the profile exists and is published
      const profile = await db.maybeOne(
        sql.type(z.object({ profile_id: z.number(), name: z.string(), profile_type_id: z.number() }))`
          SELECT profile_id, name, profile_type_id FROM profiles
          WHERE profile_id = ${profile_id} AND deleted = false AND is_published = true
        `,
      );

      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Check for existing (non-deleted) featured entry to avoid duplicates
      const existing = await db.maybeOne(
        sql.type(z.object({ featured_profile_id: z.number() }))`
          SELECT featured_profile_id FROM featured_profiles
          WHERE post_id = ${postId} AND profile_id = ${profile_id} AND deleted = false
        `,
      );

      if (existing) {
        res.status(409).json({ error: 'This profile is already featured in this post' });
        return;
      }

      // Insert (or un-delete if a soft-deleted row exists)
      const result = await db.one(
        sql.type(z.object({ featured_profile_id: z.number() }))`
          INSERT INTO featured_profiles (post_id, profile_id)
          VALUES (${postId}, ${profile_id})
          ON CONFLICT DO NOTHING
          RETURNING featured_profile_id
        `,
      );

      res.status(201).json({
        featured_profile_id: result.featured_profile_id,
        post_id: postId,
        profile_id: profile.profile_id,
        name: profile.name,
        profile_type_id: profile.profile_type_id,
      });
    } catch (err) {
      console.error('Featured profile add error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/posts/:id/featured/:featuredId - Remove a featured profile from a post
router.delete('/:id/featured/:featuredId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const featuredId = parseInt(Array.isArray(req.params.featuredId) ? req.params.featuredId[0] : req.params.featuredId);
  const userId = req.userId!;

  if (isNaN(postId) || isNaN(featuredId)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  try {
    const db = await getPool();

    // Check edit permission
    const hasEditPermission = await canEditPost(db, postId, userId);
    if (!hasEditPermission) {
      res.status(403).json({ error: 'You do not have permission to edit this post' });
      return;
    }

    // Soft delete the featured profile entry
    const result = await db.maybeOne(
      sql.type(z.object({ featured_profile_id: z.number() }))`
        UPDATE featured_profiles
        SET deleted = true
        WHERE featured_profile_id = ${featuredId}
          AND post_id = ${postId}
          AND deleted = false
        RETURNING featured_profile_id
      `,
    );

    if (!result) {
      res.status(404).json({ error: 'Featured profile entry not found' });
      return;
    }

    res.status(200).json({ message: 'Featured profile removed successfully' });
  } catch (err) {
    console.error('Featured profile remove error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
