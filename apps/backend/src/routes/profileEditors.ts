/**
 * Profile Editors Routes
 *
 * Manages editor permissions for profiles - allows profile owners to invite
 * other accounts to edit their profiles.
 *
 * Pattern is designed to be replicable for post_editors, etc.
 *
 * Routes:
 *   GET    /api/profiles/:profileId/editors     - List editors for a profile
 *   POST   /api/profiles/:profileId/editors     - Add an editor (owner only)
 *   DELETE /api/profiles/:profileId/editors/:editorId - Remove an editor (owner or self)
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper function to get database pool
async function getPool() {
  return await pool;
}

// Helper: Check if user is the profile owner
async function isProfileOwner(db: any, profileId: number, userId: number): Promise<boolean> {
  const profile = await db.maybeOne(
    sql.type(z.object({ account_id: z.number() }))`
      SELECT account_id FROM profiles
      WHERE profile_id = ${profileId} AND deleted = false
    `,
  );
  return profile?.account_id === userId;
}

// Helper: Check if user can edit profile (owner OR editor)
// Exported for use in profiles.ts authorization checks
export async function canEditProfile(db: any, profileId: number, userId: number): Promise<boolean> {
  const result = await db.maybeOne(
    sql.type(z.object({ can_edit: z.boolean() }))`
      SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE profile_id = ${profileId} AND account_id = ${userId} AND deleted = false
        UNION
        SELECT 1 FROM profile_editors
        WHERE profile_id = ${profileId} AND account_id = ${userId} AND deleted = false
      ) as can_edit
    `,
  );
  return result?.can_edit ?? false;
}

// GET /api/profiles/:profileId/editors - List all editors for a profile
// Anyone can view the editors list (public info)
router.get('/:profileId/editors', async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(req.params.profileId);

  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    // Verify profile exists
    const profileExists = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number() }))`
        SELECT profile_id FROM profiles
        WHERE profile_id = ${profileId} AND deleted = false
      `,
    );

    if (!profileExists) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Get all editors with their account info
    const editors = await db.any(
      sql.type(
        z.object({
          editor_id: z.number(),
          account_id: z.number(),
          username: z.string(),
          invited_by_account_id: z.number().nullable(),
          invited_by_username: z.string().nullable(),
          created_at: z.string(),
        }),
      )`
        SELECT 
          pe.editor_id,
          pe.account_id,
          a.username,
          pe.invited_by_account_id,
          inviter.username as invited_by_username,
          pe.created_at::text
        FROM profile_editors pe
        JOIN accounts a ON pe.account_id = a.account_id
        LEFT JOIN accounts inviter ON pe.invited_by_account_id = inviter.account_id
        WHERE pe.profile_id = ${profileId} AND pe.deleted = false
        ORDER BY pe.created_at ASC
      `,
    );

    res.json({ editors });
  } catch (err) {
    console.error('Error fetching profile editors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profiles/:profileId/editors - Add an editor to a profile
// Only the profile owner can add editors
router.post(
  '/:profileId/editors',
  authenticateToken,
  [body('username').trim().notEmpty().withMessage('Username is required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const profileId = parseInt(req.params.profileId);
    const userId = req.userId!;
    const { username } = req.body;

    if (isNaN(profileId)) {
      res.status(400).json({ error: 'Invalid profile ID' });
      return;
    }

    try {
      const db = await getPool();

      // Verify caller is the profile owner
      const isOwner = await isProfileOwner(db, profileId, userId);
      if (!isOwner) {
        res.status(403).json({ error: 'Only the profile owner can add editors' });
        return;
      }

      // Find the account to add as editor
      const targetAccount = await db.maybeOne(
        sql.type(z.object({ account_id: z.number(), username: z.string() }))`
          SELECT account_id, username FROM accounts
          WHERE LOWER(username) = LOWER(${username}) AND deleted = false
        `,
      );

      if (!targetAccount) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Can't add yourself as an editor (you're already the owner)
      if (targetAccount.account_id === userId) {
        res.status(400).json({ error: 'You cannot add yourself as an editor - you are the owner' });
        return;
      }

      // Check if already an editor
      const existingEditor = await db.maybeOne(
        sql.type(z.object({ editor_id: z.number(), deleted: z.boolean() }))`
          SELECT editor_id, deleted FROM profile_editors
          WHERE profile_id = ${profileId} AND account_id = ${targetAccount.account_id}
        `,
      );

      if (existingEditor) {
        if (!existingEditor.deleted) {
          res.status(409).json({ error: 'This user is already an editor' });
          return;
        }

        // Reactivate soft-deleted editor
        const reactivated = await db.one(
          sql.type(
            z.object({
              editor_id: z.number(),
              account_id: z.number(),
              created_at: z.string(),
            }),
          )`
            UPDATE profile_editors
            SET deleted = false, invited_by_account_id = ${userId}, created_at = NOW()
            WHERE editor_id = ${existingEditor.editor_id}
            RETURNING editor_id, account_id, created_at::text
          `,
        );

        res.status(201).json({
          editor_id: reactivated.editor_id,
          account_id: reactivated.account_id,
          username: targetAccount.username,
          created_at: reactivated.created_at,
        });
        return;
      }

      // Add new editor
      const newEditor = await db.one(
        sql.type(
          z.object({
            editor_id: z.number(),
            account_id: z.number(),
            created_at: z.string(),
          }),
        )`
          INSERT INTO profile_editors (profile_id, account_id, invited_by_account_id)
          VALUES (${profileId}, ${targetAccount.account_id}, ${userId})
          RETURNING editor_id, account_id, created_at::text
        `,
      );

      res.status(201).json({
        editor_id: newEditor.editor_id,
        account_id: newEditor.account_id,
        username: targetAccount.username,
        created_at: newEditor.created_at,
      });
    } catch (err) {
      console.error('Error adding profile editor:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/profiles/:profileId/editors/:editorId - Remove an editor
// Owner can remove any editor, editors can remove themselves
router.delete('/:profileId/editors/:editorId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(req.params.profileId);
  const editorId = parseInt(req.params.editorId);
  const userId = req.userId!;

  if (isNaN(profileId) || isNaN(editorId)) {
    res.status(400).json({ error: 'Invalid profile ID or editor ID' });
    return;
  }

  try {
    const db = await getPool();

    // Get the editor record to check permissions
    const editor = await db.maybeOne(
      sql.type(z.object({ editor_id: z.number(), account_id: z.number() }))`
        SELECT editor_id, account_id FROM profile_editors
        WHERE editor_id = ${editorId} AND profile_id = ${profileId} AND deleted = false
      `,
    );

    if (!editor) {
      res.status(404).json({ error: 'Editor not found' });
      return;
    }

    // Check permissions: must be profile owner OR the editor removing themselves
    const isOwner = await isProfileOwner(db, profileId, userId);
    const isSelf = editor.account_id === userId;

    if (!isOwner && !isSelf) {
      res.status(403).json({ error: 'You do not have permission to remove this editor' });
      return;
    }

    // Soft-delete the editor
    await db.query(
      sql.type(z.object({}))`
        UPDATE profile_editors
        SET deleted = true
        WHERE editor_id = ${editorId}
      `,
    );

    res.status(200).json({ message: 'Editor removed successfully' });
  } catch (err) {
    console.error('Error removing profile editor:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
