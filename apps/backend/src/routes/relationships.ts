/**
 * Character Relationships Routes
 *
 * Manages bidirectional relationships between character profiles.
 * Only character profiles (profile_type_id = 1) may have relationships.
 *
 * Relationship categories map to bidirectional_relationship_types:
 *   'friend'   → Friends
 *   'relative' → Relatives  (optional label, e.g. "mother", "cousin")
 *   'rival'    → Enemies & Rivals
 *
 * Routes:
 *   GET    /api/profiles/:profileId/relationships        - List all relationships for a profile
 *   POST   /api/profiles/:profileId/relationships        - Add a relationship
 *   DELETE /api/profiles/:profileId/relationships/:relId - Remove a relationship (soft-delete)
 *
 * Requires migration 011_add_relationship_label.sql to be applied.
 */

import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { parseParam } from '../utils/params.js';

const router = Router();

// ── Zod schemas ───────────────────────────────────────────────────────────────

const RelationshipRowSchema = z.object({
  relationship_id: z.number(),
  profile_id_1: z.number(),
  profile_id_2: z.number(),
  type_name: z.string(),
  label: z.string().nullable(),
  other_profile_id: z.number(),
  other_profile_name: z.string(),
  other_profile_avatar_url: z.string().nullable(),
  created_at: z.string(),
});

const RelationshipCheckSchema = z.object({
  relationship_id: z.number(),
  profile_id_1: z.number(),
  profile_id_2: z.number(),
  deleted: z.boolean(),
});

const NewRelationshipSchema = z.object({
  relationship_id: z.number(),
  profile_id_1: z.number(),
  profile_id_2: z.number(),
});

const ProfileCheckSchema = z.object({
  profile_id: z.number(),
  profile_type_id: z.number(),
  name: z.string(),
  avatar_url: z.string().nullable(),
});

const TypeIdSchema = z.object({
  type_id: z.number(),
});

// ── Helper: can caller edit a profile? ───────────────────────────────────────

async function canEditProfile(db: any, profileId: number, userId: number): Promise<boolean> {
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

// ── GET /api/profiles/:profileId/relationships ────────────────────────────────

router.get('/:profileId/relationships', async (req: AuthRequest, res: Response) => {
  const profileId = parseParam(req.params.profileId);
  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    // Verify profile exists
    const profile = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number(), profile_type_id: z.number() }))`
        SELECT profile_id, profile_type_id FROM profiles
        WHERE profile_id = ${profileId} AND deleted = false
      `,
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (profile.profile_type_id !== 1) {
      res.json({ relationships: [] });
      return;
    }

    // Fetch all active bidirectional relationships involving this profile.
    // Returns "other" side's profile_id, name, and avatar URL.
    const rows = await db.any(
      sql.type(RelationshipRowSchema)`
        SELECT
          br.relationship_id,
          br.profile_id_1,
          br.profile_id_2,
          brt.type_name,
          br.label,
          CASE
            WHEN br.profile_id_1 = ${profileId} THEN br.profile_id_2
            ELSE br.profile_id_1
          END AS other_profile_id,
          CASE
            WHEN br.profile_id_1 = ${profileId} THEN p2.name
            ELSE p1.name
          END AS other_profile_name,
          CASE
            WHEN br.profile_id_1 = ${profileId} THEN p2.details->'avatar'->>'url'
            ELSE p1.details->'avatar'->>'url'
          END AS other_profile_avatar_url,
          br.created_at::text
        FROM bidirectional_relationships br
        JOIN bidirectional_relationship_types brt ON br.type_id = brt.type_id
        JOIN profiles p1 ON br.profile_id_1 = p1.profile_id
        JOIN profiles p2 ON br.profile_id_2 = p2.profile_id
        WHERE (br.profile_id_1 = ${profileId} OR br.profile_id_2 = ${profileId})
          AND br.deleted = false
        ORDER BY brt.type_name ASC, br.created_at ASC
      `,
    );

    res.json({ relationships: rows });
  } catch (err) {
    console.error('Error fetching relationships:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/profiles/:profileId/relationships ───────────────────────────────

router.post(
  '/:profileId/relationships',
  authenticateToken,
  [
    body('type').isIn(['friend', 'relative', 'rival']).withMessage('type must be friend, relative, or rival'),
    body('profile_id_2').isInt({ min: 1 }).withMessage('profile_id_2 must be a positive integer'),
    body('label').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const profileId = parseParam(req.params.profileId);
    const userId = req.userId!;
    const { type, label } = req.body;
    const targetId = parseInt(req.body.profile_id_2);

    if (isNaN(profileId)) {
      res.status(400).json({ error: 'Invalid profile ID' });
      return;
    }

    if (targetId === profileId) {
      res.status(400).json({ error: 'A character cannot have a relationship with itself' });
      return;
    }

    try {
      const db = await getPool();

      // Verify caller can edit the source profile
      const hasEditPermission = await canEditProfile(db, profileId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to add relationships for this profile' });
        return;
      }

      // Verify source profile is a character
      const sourceProfile = await db.maybeOne(
        sql.type(z.object({ profile_id: z.number(), profile_type_id: z.number() }))`
          SELECT profile_id, profile_type_id FROM profiles
          WHERE profile_id = ${profileId} AND deleted = false
        `,
      );

      if (!sourceProfile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      if (sourceProfile.profile_type_id !== 1) {
        res.status(400).json({ error: 'Relationships are only supported for character profiles' });
        return;
      }

      // Verify target profile is a character
      const targetProfile = await db.maybeOne(
        sql.type(ProfileCheckSchema)`
          SELECT profile_id, profile_type_id, name, details->'avatar'->>'url' AS avatar_url
          FROM profiles
          WHERE profile_id = ${targetId} AND deleted = false
        `,
      );

      if (!targetProfile) {
        res.status(404).json({ error: 'Target profile not found' });
        return;
      }

      if (targetProfile.profile_type_id !== 1) {
        res.status(400).json({ error: 'Relationships are only supported between character profiles' });
        return;
      }

      // Resolve type_id
      const typeRow = await db.maybeOne(
        sql.type(TypeIdSchema)`
          SELECT type_id FROM bidirectional_relationship_types WHERE type_name = ${type}
        `,
      );

      if (!typeRow) {
        res.status(400).json({ error: `Unknown relationship type: ${type}` });
        return;
      }

      // Enforce profile_id_1 < profile_id_2
      const pid1 = Math.min(profileId, targetId);
      const pid2 = Math.max(profileId, targetId);

      const labelVal = label?.trim() || null;

      // Check for existing relationship (same pair + same type)
      const existing = await db.maybeOne(
        sql.type(RelationshipCheckSchema)`
          SELECT relationship_id, profile_id_1, profile_id_2, deleted
          FROM bidirectional_relationships
          WHERE profile_id_1 = ${pid1} AND profile_id_2 = ${pid2} AND type_id = ${typeRow.type_id}
        `,
      );

      if (existing && !existing.deleted) {
        res.status(409).json({ error: 'This relationship already exists' });
        return;
      }

      if (existing && existing.deleted) {
        // Reactivate soft-deleted relationship
        const reactivated = await db.one(
          sql.type(NewRelationshipSchema)`
            UPDATE bidirectional_relationships
            SET deleted = false, label = ${labelVal}, updated_at = NOW()
            WHERE relationship_id = ${existing.relationship_id}
            RETURNING relationship_id, profile_id_1, profile_id_2
          `,
        );

        res.status(201).json({
          relationship_id: reactivated.relationship_id,
          profile_id_1: reactivated.profile_id_1,
          profile_id_2: reactivated.profile_id_2,
          type,
          label: labelVal,
          other_profile_id: targetId,
          other_profile_name: targetProfile.name,
          other_profile_avatar_url: targetProfile.avatar_url,
        });
        return;
      }

      // Insert new relationship
      const newRel = await db.one(
        sql.type(NewRelationshipSchema)`
          INSERT INTO bidirectional_relationships
            (profile_id_1, profile_id_2, type_id, direction, label)
          VALUES
            (${pid1}, ${pid2}, ${typeRow.type_id}, 'bidirectional', ${labelVal})
          RETURNING relationship_id, profile_id_1, profile_id_2
        `,
      );

      res.status(201).json({
        relationship_id: newRel.relationship_id,
        profile_id_1: newRel.profile_id_1,
        profile_id_2: newRel.profile_id_2,
        type,
        label: labelVal,
        other_profile_id: targetId,
        other_profile_name: targetProfile.name,
        other_profile_avatar_url: targetProfile.avatar_url,
      });
    } catch (err) {
      console.error('Error adding relationship:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ── DELETE /api/profiles/:profileId/relationships/:relId ─────────────────────

router.delete('/:profileId/relationships/:relId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const profileId = parseParam(req.params.profileId);
  const relId = parseParam(req.params.relId);
  const userId = req.userId!;

  if (isNaN(profileId) || isNaN(relId)) {
    res.status(400).json({ error: 'Invalid profile ID or relationship ID' });
    return;
  }

  try {
    const db = await getPool();

    // Fetch the relationship, confirming the given profileId is one of the sides
    const rel = await db.maybeOne(
      sql.type(RelationshipCheckSchema)`
        SELECT relationship_id, profile_id_1, profile_id_2, deleted
        FROM bidirectional_relationships
        WHERE relationship_id = ${relId}
          AND (profile_id_1 = ${profileId} OR profile_id_2 = ${profileId})
          AND deleted = false
      `,
    );

    if (!rel) {
      res.status(404).json({ error: 'Relationship not found' });
      return;
    }

    // Caller must be able to edit either profile in the relationship
    const canEdit1 = await canEditProfile(db, rel.profile_id_1, userId);
    const canEdit2 = await canEditProfile(db, rel.profile_id_2, userId);

    if (!canEdit1 && !canEdit2) {
      res.status(403).json({ error: 'You do not have permission to remove this relationship' });
      return;
    }

    await db.query(
      sql.type(z.object({}))`
        UPDATE bidirectional_relationships
        SET deleted = true, updated_at = NOW()
        WHERE relationship_id = ${relId}
      `,
    );

    res.status(200).json({ message: 'Relationship removed successfully' });
  } catch (err) {
    console.error('Error removing relationship:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
