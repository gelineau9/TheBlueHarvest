/**
 * Collection Posts Routes
 *
 * Manages the M:N relationship between collections and posts.
 * Posts can belong to multiple collections, and collections can contain multiple posts.
 * Enforces collection type constraints (e.g., chronicles only accept writing posts).
 *
 * Routes:
 *   POST   /api/collections/:collectionId/posts           - Add a post to a collection
 *   DELETE /api/collections/:collectionId/posts/:postId   - Remove a post from a collection
 *   PUT    /api/collections/:collectionId/posts/reorder   - Reorder posts in a collection
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditCollection } from './editors.js';
import { canAddPostToCollection, isPostInCollection, getNextSortOrder } from '../utils/postValidation.js';

const router = Router();

async function getPool() {
  return await pool;
}

// POST /api/collections/:collectionId/posts - Add a post to a collection
router.post(
  '/:collectionId/posts',
  authenticateToken,
  [body('post_id').isInt().withMessage('Post ID is required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const collectionId = parseInt(
      Array.isArray(req.params.collectionId) ? req.params.collectionId[0] : req.params.collectionId,
    );
    const userId = req.userId!;
    const { post_id } = req.body;

    if (isNaN(collectionId)) {
      res.status(400).json({ error: 'Invalid collection ID' });
      return;
    }

    try {
      const db = await getPool();

      // Verify user can edit the collection
      const hasEditPermission = await canEditCollection(db, collectionId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to modify this collection' });
        return;
      }

      // Check if post is already in collection
      const alreadyInCollection = await isPostInCollection(db, collectionId, post_id);
      if (alreadyInCollection) {
        res.status(409).json({ error: 'This post is already in the collection' });
        return;
      }

      // Check collection type constraints
      const typeCheck = await canAddPostToCollection(db, collectionId, post_id);
      if (!typeCheck.allowed) {
        res.status(400).json({ error: typeCheck.reason });
        return;
      }

      // Check if there's a soft-deleted entry to reactivate
      const existingEntry = await db.maybeOne(
        sql.type(z.object({ collection_post_id: z.number(), deleted: z.boolean() }))`
          SELECT collection_post_id, deleted FROM collection_posts
          WHERE collection_id = ${collectionId} AND post_id = ${post_id}
        `,
      );

      if (existingEntry && existingEntry.deleted) {
        // Reactivate with new sort order
        const newSortOrder = await getNextSortOrder(db, collectionId);
        const reactivated = await db.one(
          sql.type(
            z.object({
              collection_post_id: z.number(),
              post_id: z.number(),
              sort_order: z.number(),
            }),
          )`
            UPDATE collection_posts
            SET deleted = false, sort_order = ${newSortOrder}, created_at = NOW()
            WHERE collection_post_id = ${existingEntry.collection_post_id}
            RETURNING collection_post_id, post_id, sort_order
          `,
        );

        res.status(201).json({
          collection_post_id: reactivated.collection_post_id,
          post_id: reactivated.post_id,
          sort_order: reactivated.sort_order,
        });
        return;
      }

      // Add new entry
      const sortOrder = await getNextSortOrder(db, collectionId);
      const newEntry = await db.one(
        sql.type(
          z.object({
            collection_post_id: z.number(),
            post_id: z.number(),
            sort_order: z.number(),
          }),
        )`
          INSERT INTO collection_posts (collection_id, post_id, sort_order)
          VALUES (${collectionId}, ${post_id}, ${sortOrder})
          RETURNING collection_post_id, post_id, sort_order
        `,
      );

      res.status(201).json({
        collection_post_id: newEntry.collection_post_id,
        post_id: newEntry.post_id,
        sort_order: newEntry.sort_order,
      });
    } catch (err) {
      console.error('Error adding post to collection:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/collections/:collectionId/posts/:postId - Remove a post from a collection
router.delete('/:collectionId/posts/:postId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const collectionId = parseInt(
    Array.isArray(req.params.collectionId) ? req.params.collectionId[0] : req.params.collectionId,
  );
  const postId = parseInt(Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId);
  const userId = req.userId!;

  if (isNaN(collectionId) || isNaN(postId)) {
    res.status(400).json({ error: 'Invalid collection ID or post ID' });
    return;
  }

  try {
    const db = await getPool();

    // Verify user can edit the collection
    const hasEditPermission = await canEditCollection(db, collectionId, userId);
    if (!hasEditPermission) {
      res.status(403).json({ error: 'You do not have permission to modify this collection' });
      return;
    }

    // Check if post is in collection
    const entry = await db.maybeOne(
      sql.type(z.object({ collection_post_id: z.number() }))`
        SELECT collection_post_id FROM collection_posts
        WHERE collection_id = ${collectionId} AND post_id = ${postId} AND deleted = false
      `,
    );

    if (!entry) {
      res.status(404).json({ error: 'Post not found in collection' });
      return;
    }

    // Soft-delete the entry
    await db.query(
      sql.type(z.object({}))`
        UPDATE collection_posts
        SET deleted = true
        WHERE collection_post_id = ${entry.collection_post_id}
      `,
    );

    res.status(200).json({ message: 'Post removed from collection successfully' });
  } catch (err) {
    console.error('Error removing post from collection:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/collections/:collectionId/posts/reorder - Reorder posts in a collection
router.put(
  '/:collectionId/posts/reorder',
  authenticateToken,
  [
    body('post_ids').isArray({ min: 1 }).withMessage('post_ids must be an array of post IDs in the desired order'),
    body('post_ids.*').isInt().withMessage('Each post_id must be an integer'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const collectionId = parseInt(
      Array.isArray(req.params.collectionId) ? req.params.collectionId[0] : req.params.collectionId,
    );
    const userId = req.userId!;
    const { post_ids } = req.body as { post_ids: number[] };

    if (isNaN(collectionId)) {
      res.status(400).json({ error: 'Invalid collection ID' });
      return;
    }

    try {
      const db = await getPool();

      // Verify user can edit the collection
      const hasEditPermission = await canEditCollection(db, collectionId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to modify this collection' });
        return;
      }

      // Update sort_order for each post in the provided order
      await db.transaction(async (tx) => {
        for (let i = 0; i < post_ids.length; i++) {
          await tx.query(
            sql.type(z.object({}))`
              UPDATE collection_posts
              SET sort_order = ${i}
              WHERE collection_id = ${collectionId} 
                AND post_id = ${post_ids[i]} 
                AND deleted = false
            `,
          );
        }
      });

      res.status(200).json({ message: 'Posts reordered successfully' });
    } catch (err) {
      console.error('Error reordering posts:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
