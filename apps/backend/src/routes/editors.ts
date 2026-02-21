/**
 * Generic Editor Routes Factory
 *
 * Creates editor management routes for any entity (profiles, posts, collections).
 * Reduces code duplication by parameterizing table names and ownership checks.
 *
 * Usage:
 *   createEditorRoutes({
 *     entityName: 'post',
 *     entityTable: 'posts',
 *     entityIdColumn: 'post_id',
 *     editorTable: 'post_editors',
 *     isOwner: isPostOwner,
 *   })
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

// Reusable Zod schemas
const EditorSchema = z.object({
  editor_id: z.number(),
  account_id: z.number(),
  username: z.string(),
  invited_by_account_id: z.number().nullable(),
  invited_by_username: z.string().nullable(),
  created_at: z.string(),
});

const EditorBasicSchema = z.object({
  editor_id: z.number(),
  account_id: z.number(),
  created_at: z.string(),
});

const EditorCheckSchema = z.object({
  editor_id: z.number(),
  deleted: z.boolean(),
});

const EditorDeleteSchema = z.object({
  editor_id: z.number(),
  account_id: z.number(),
});

async function getPool() {
  return await pool;
}

function parseParam(param: string | string[]): number {
  return parseInt(Array.isArray(param) ? param[0] : param);
}

export interface EditorRoutesConfig {
  entityName: string; // 'profile', 'post', 'collection'
  entityTable: string; // 'profiles', 'posts', 'collections'
  entityIdColumn: string; // 'profile_id', 'post_id', 'collection_id'
  editorTable: string; // 'profile_editors', 'post_editors', 'collection_editors'
  editorIdColumn: string; // 'editor_id', 'post_editor_id', 'collection_editor_id'
  paramName: string; // 'profileId', 'postId', 'collectionId'
  isOwner: (db: any, entityId: number, userId: number) => Promise<boolean>;
}

export function createEditorRoutes(config: EditorRoutesConfig): Router {
  const router = Router();
  const { entityName, entityTable, entityIdColumn, editorTable, editorIdColumn, paramName, isOwner } = config;

  // Helper to build identifier safely (table/column names can't be parameterized)
  const entityIdent = sql.identifier([entityIdColumn]);
  const editorTableIdent = sql.identifier([editorTable]);
  const entityTableIdent = sql.identifier([entityTable]);
  const editorIdIdent = sql.identifier([editorIdColumn]);

  // GET /:entityId/editors - List all editors
  router.get(`/:${paramName}/editors`, async (req: AuthRequest, res: Response) => {
    const entityId = parseParam(req.params[paramName]);

    if (isNaN(entityId)) {
      res.status(400).json({ error: `Invalid ${entityName} ID` });
      return;
    }

    try {
      const db = await getPool();

      // Verify entity exists
      const entityExists = await db.maybeOne(
        sql.type(z.object({ id: z.number() }))`
          SELECT ${entityIdent} as id FROM ${entityTableIdent}
          WHERE ${entityIdent} = ${entityId} AND deleted = false
        `,
      );

      if (!entityExists) {
        res.status(404).json({ error: `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} not found` });
        return;
      }

      // Get all editors - using raw SQL for dynamic table/column names
      const editors = await db.any(
        sql.type(EditorSchema)`
          SELECT 
            e.${editorIdIdent} as editor_id,
            e.account_id,
            a.username,
            e.invited_by_account_id,
            inviter.username as invited_by_username,
            e.created_at::text
          FROM ${editorTableIdent} e
          JOIN accounts a ON e.account_id = a.account_id
          LEFT JOIN accounts inviter ON e.invited_by_account_id = inviter.account_id
          WHERE e.${entityIdent} = ${entityId} AND e.deleted = false
          ORDER BY e.created_at ASC
        `,
      );

      res.json({ editors });
    } catch (err) {
      console.error(`Error fetching ${entityName} editors:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /:entityId/editors - Add an editor (owner only)
  router.post(
    `/:${paramName}/editors`,
    authenticateToken,
    [body('username').trim().notEmpty().withMessage('Username is required')],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const entityId = parseParam(req.params[paramName]);
      const userId = req.userId!;
      const { username } = req.body;

      if (isNaN(entityId)) {
        res.status(400).json({ error: `Invalid ${entityName} ID` });
        return;
      }

      try {
        const db = await getPool();

        // Verify caller is owner
        const ownerCheck = await isOwner(db, entityId, userId);
        if (!ownerCheck) {
          res.status(403).json({ error: `Only the ${entityName} owner can add editors` });
          return;
        }

        // Find account to add
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

        if (targetAccount.account_id === userId) {
          res.status(400).json({ error: 'You cannot add yourself as an editor - you are the owner' });
          return;
        }

        // Check if already an editor
        const existingEditor = await db.maybeOne(
          sql.type(EditorCheckSchema)`
            SELECT ${editorIdIdent} as editor_id, deleted FROM ${editorTableIdent}
            WHERE ${entityIdent} = ${entityId} AND account_id = ${targetAccount.account_id}
          `,
        );

        if (existingEditor) {
          if (!existingEditor.deleted) {
            res.status(409).json({ error: 'This user is already an editor' });
            return;
          }

          // Reactivate soft-deleted editor
          const reactivated = await db.one(
            sql.type(EditorBasicSchema)`
              UPDATE ${editorTableIdent}
              SET deleted = false, invited_by_account_id = ${userId}, created_at = NOW()
              WHERE ${editorIdIdent} = ${existingEditor.editor_id}
              RETURNING ${editorIdIdent} as editor_id, account_id, created_at::text
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
          sql.type(EditorBasicSchema)`
            INSERT INTO ${editorTableIdent} (${entityIdent}, account_id, invited_by_account_id)
            VALUES (${entityId}, ${targetAccount.account_id}, ${userId})
            RETURNING ${editorIdIdent} as editor_id, account_id, created_at::text
          `,
        );

        res.status(201).json({
          editor_id: newEditor.editor_id,
          account_id: newEditor.account_id,
          username: targetAccount.username,
          created_at: newEditor.created_at,
        });
      } catch (err) {
        console.error(`Error adding ${entityName} editor:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // DELETE /:entityId/editors/:editorId - Remove an editor (owner or self)
  router.delete(`/:${paramName}/editors/:editorId`, authenticateToken, async (req: AuthRequest, res: Response) => {
    const entityId = parseParam(req.params[paramName]);
    const editorId = parseParam(req.params.editorId);
    const userId = req.userId!;

    if (isNaN(entityId) || isNaN(editorId)) {
      res.status(400).json({ error: `Invalid ${entityName} ID or editor ID` });
      return;
    }

    try {
      const db = await getPool();

      // Get editor record
      const editor = await db.maybeOne(
        sql.type(EditorDeleteSchema)`
          SELECT ${editorIdIdent} as editor_id, account_id FROM ${editorTableIdent}
          WHERE ${editorIdIdent} = ${editorId} AND ${entityIdent} = ${entityId} AND deleted = false
        `,
      );

      if (!editor) {
        res.status(404).json({ error: 'Editor not found' });
        return;
      }

      // Check permissions
      const ownerCheck = await isOwner(db, entityId, userId);
      const isSelf = editor.account_id === userId;

      if (!ownerCheck && !isSelf) {
        res.status(403).json({ error: 'You do not have permission to remove this editor' });
        return;
      }

      // Soft-delete
      await db.query(
        sql.type(z.object({}))`
          UPDATE ${editorTableIdent}
          SET deleted = true
          WHERE ${editorIdIdent} = ${editorId}
        `,
      );

      res.status(200).json({ message: 'Editor removed successfully' });
    } catch (err) {
      console.error(`Error removing ${entityName} editor:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

// --- Ownership check helpers (consolidated here) ---

export async function isProfileOwner(db: any, profileId: number, userId: number): Promise<boolean> {
  const profile = await db.maybeOne(
    sql.type(z.object({ account_id: z.number() }))`
      SELECT account_id FROM profiles
      WHERE profile_id = ${profileId} AND deleted = false
    `,
  );
  return profile?.account_id === userId;
}

export async function isPostOwner(db: any, postId: number, userId: number): Promise<boolean> {
  const post = await db.maybeOne(
    sql.type(z.object({ account_id: z.number() }))`
      SELECT account_id FROM posts
      WHERE post_id = ${postId} AND deleted = false
    `,
  );
  return post?.account_id === userId;
}

export async function isCollectionOwner(db: any, collectionId: number, userId: number): Promise<boolean> {
  const collection = await db.maybeOne(
    sql.type(z.object({ account_id: z.number() }))`
      SELECT account_id FROM collections
      WHERE collection_id = ${collectionId} AND deleted = false
    `,
  );
  return collection?.account_id === userId;
}

// --- Exported canEdit helpers (for use in main routes) ---

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

export async function canEditPost(db: any, postId: number, userId: number): Promise<boolean> {
  const result = await db.maybeOne(
    sql.type(z.object({ can_edit: z.boolean() }))`
      SELECT EXISTS (
        SELECT 1 FROM posts
        WHERE post_id = ${postId} AND account_id = ${userId} AND deleted = false
        UNION
        SELECT 1 FROM post_editors
        WHERE post_id = ${postId} AND account_id = ${userId} AND deleted = false
      ) as can_edit
    `,
  );
  return result?.can_edit ?? false;
}

export async function canEditCollection(db: any, collectionId: number, userId: number): Promise<boolean> {
  const result = await db.maybeOne(
    sql.type(z.object({ can_edit: z.boolean() }))`
      SELECT EXISTS (
        SELECT 1 FROM collections
        WHERE collection_id = ${collectionId} AND account_id = ${userId} AND deleted = false
        UNION
        SELECT 1 FROM collection_editors
        WHERE collection_id = ${collectionId} AND account_id = ${userId} AND deleted = false
      ) as can_edit
    `,
  );
  return result?.can_edit ?? false;
}

// ============================================================
// AUTHOR ROUTES FACTORY
// ============================================================

// Zod schemas for author routes
const AuthorCheckSchema = z.object({
  author_id: z.number(),
  deleted: z.boolean(),
});

const AuthorResultSchema = z.object({
  author_id: z.number(),
  profile_id: z.number(),
  is_primary: z.boolean(),
});

const AuthorDeleteSchema = z.object({
  author_id: z.number(),
  is_primary: z.boolean(),
});

export interface AuthorRoutesConfig {
  entityName: string; // 'post', 'collection'
  entityIdColumn: string; // 'post_id', 'collection_id'
  authorTable: string; // 'authors', 'collection_authors'
  canEdit: (db: any, entityId: number, userId: number) => Promise<boolean>;
}

export function createAuthorRoutes(config: AuthorRoutesConfig): Router {
  const router = Router();
  const { entityName, entityIdColumn, authorTable, canEdit } = config;

  const entityIdent = sql.identifier([entityIdColumn]);
  const authorTableIdent = sql.identifier([authorTable]);

  // POST /:id/authors - Add an author
  router.post(
    '/:id/authors',
    authenticateToken,
    [body('profile_id').isInt().withMessage('Profile ID is required')],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const entityId = parseParam(req.params.id);
      const userId = req.userId!;
      const { profile_id } = req.body;

      if (isNaN(entityId)) {
        res.status(400).json({ error: `Invalid ${entityName} ID` });
        return;
      }

      try {
        const db = await getPool();

        // Verify user can edit
        const hasEditPermission = await canEdit(db, entityId, userId);
        if (!hasEditPermission) {
          res.status(403).json({ error: `You do not have permission to modify this ${entityName}` });
          return;
        }

        // Verify the profile can be an author
        const { getAuthorableProfile } = await import('../utils/postValidation.js');
        const authorProfile = await getAuthorableProfile(db, profile_id, userId);
        if (!authorProfile) {
          res.status(400).json({
            error: 'Author must be a character, kinship, or organization that you own',
          });
          return;
        }

        // Check if already an author
        const existingAuthor = await db.maybeOne(
          sql.type(AuthorCheckSchema)`
            SELECT author_id, deleted FROM ${authorTableIdent}
            WHERE ${entityIdent} = ${entityId} AND profile_id = ${profile_id}
          `,
        );

        if (existingAuthor) {
          if (!existingAuthor.deleted) {
            res.status(409).json({ error: `This profile is already an author of this ${entityName}` });
            return;
          }

          // Reactivate soft-deleted author
          const reactivated = await db.one(
            sql.type(AuthorResultSchema)`
              UPDATE ${authorTableIdent}
              SET deleted = false
              WHERE author_id = ${existingAuthor.author_id}
              RETURNING author_id, profile_id, is_primary
            `,
          );

          res.status(201).json({
            author_id: reactivated.author_id,
            profile_id: reactivated.profile_id,
            profile_name: authorProfile.name,
            is_primary: reactivated.is_primary,
          });
          return;
        }

        // Add new author (not primary)
        const newAuthor = await db.one(
          sql.type(AuthorResultSchema)`
            INSERT INTO ${authorTableIdent} (${entityIdent}, profile_id, is_primary)
            VALUES (${entityId}, ${profile_id}, false)
            RETURNING author_id, profile_id, is_primary
          `,
        );

        res.status(201).json({
          author_id: newAuthor.author_id,
          profile_id: newAuthor.profile_id,
          profile_name: authorProfile.name,
          is_primary: newAuthor.is_primary,
        });
      } catch (err) {
        console.error(`Error adding ${entityName} author:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // DELETE /:id/authors/:authorId - Remove an author
  router.delete('/:id/authors/:authorId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const entityId = parseParam(req.params.id);
    const authorId = parseParam(req.params.authorId);
    const userId = req.userId!;

    if (isNaN(entityId) || isNaN(authorId)) {
      res.status(400).json({ error: `Invalid ${entityName} ID or author ID` });
      return;
    }

    try {
      const db = await getPool();

      // Check edit permission
      const hasEditPermission = await canEdit(db, entityId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: `You do not have permission to modify this ${entityName}` });
        return;
      }

      // Get the author record
      const author = await db.maybeOne(
        sql.type(AuthorDeleteSchema)`
          SELECT author_id, is_primary FROM ${authorTableIdent}
          WHERE author_id = ${authorId} AND ${entityIdent} = ${entityId} AND deleted = false
        `,
      );

      if (!author) {
        res.status(404).json({ error: 'Author not found' });
        return;
      }

      // Cannot remove primary author
      if (author.is_primary) {
        res.status(400).json({ error: 'Cannot remove the primary author. Transfer primary status first.' });
        return;
      }

      // Soft-delete the author
      await db.query(
        sql.type(z.object({}))`
          UPDATE ${authorTableIdent} SET deleted = true WHERE author_id = ${authorId}
        `,
      );

      res.status(200).json({ message: 'Author removed successfully' });
    } catch (err) {
      console.error(`Error removing ${entityName} author:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

// --- Pre-configured editor routers ---

export const profileEditorRoutes = createEditorRoutes({
  entityName: 'profile',
  entityTable: 'profiles',
  entityIdColumn: 'profile_id',
  editorTable: 'profile_editors',
  editorIdColumn: 'editor_id',
  paramName: 'profileId',
  isOwner: isProfileOwner,
});

export const postEditorRoutes = createEditorRoutes({
  entityName: 'post',
  entityTable: 'posts',
  entityIdColumn: 'post_id',
  editorTable: 'post_editors',
  editorIdColumn: 'post_editor_id',
  paramName: 'postId',
  isOwner: isPostOwner,
});

export const collectionEditorRoutes = createEditorRoutes({
  entityName: 'collection',
  entityTable: 'collections',
  entityIdColumn: 'collection_id',
  editorTable: 'collection_editors',
  editorIdColumn: 'collection_editor_id',
  paramName: 'collectionId',
  isOwner: isCollectionOwner,
});

// --- Pre-configured author routers ---

export const postAuthorRoutes = createAuthorRoutes({
  entityName: 'post',
  entityIdColumn: 'post_id',
  authorTable: 'authors',
  canEdit: canEditPost,
});

export const collectionAuthorRoutes = createAuthorRoutes({
  entityName: 'collection',
  entityIdColumn: 'collection_id',
  authorTable: 'collection_authors',
  canEdit: canEditCollection,
});
