import { Router, Response } from 'express';
import { sql } from 'slonik';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper function to get database pool
async function getPool() {
  return await pool;
}

// Create profile endpoint
router.post(
  '/',
  authenticateToken,
  [
    body('profile_type_id').isInt({ min: 1, max: 5 }).withMessage('Profile type must be between 1 and 5'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Profile name is required and must not exceed 100 characters'),
    body('details').optional(),
    body('parent_profile_id').optional().isInt().withMessage('Parent profile must be a valid profile ID'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { profile_type_id, name, details, parent_profile_id } = req.body;
    const userId = req.userId!;

    try {
      const db = await getPool();

      // ===== VALIDATION: Ownership Rules =====

      // Characters (1) and Locations (5) CANNOT have a parent
      if ([1, 5].includes(profile_type_id) && parent_profile_id) {
        res.status(400).json({
          error: 'Characters and Locations cannot belong to another profile',
          message: 'Characters and Locations cannot belong to another profile',
        });
        return;
      }

      // Items (2), Kinships (3), Organizations (4) MUST have a parent
      if ([2, 3, 4].includes(profile_type_id) && !parent_profile_id) {
        res.status(400).json({
          error: 'Items, Kinships, and Organizations must belong to a character',
          message: 'Items, Kinships, and Organizations must belong to a character',
        });
        return;
      }

      // If parent_profile_id is provided, verify it exists and is owned by the user
      if (parent_profile_id) {
        const parent = await db.maybeOne(sql.unsafe`
          SELECT profile_id, profile_type_id, account_id, name
          FROM profiles 
          WHERE profile_id = ${parent_profile_id} 
            AND account_id = ${userId}
            AND profile_type_id = 1
            AND deleted = false
        `);

        if (!parent) {
          res.status(400).json({
            error: 'Parent profile must be a character that you own',
            message: 'Parent profile must be a character that you own',
          });
          return;
        }
      }

      // ===== CREATE THE PROFILE =====

      const result = await db.one(sql.unsafe`
        INSERT INTO profiles (account_id, profile_type_id, name, details, parent_profile_id)
        VALUES (
          ${userId}, 
          ${profile_type_id}, 
          ${name}, 
          ${details !== null && details !== undefined ? sql.jsonb(details) : null},
          ${parent_profile_id || null}
        )
        RETURNING profile_id, account_id, profile_type_id, name, details, parent_profile_id, created_at
      `);

      res.status(201).json({
        profile_id: result.profile_id,
        account_id: result.account_id,
        profile_type_id: result.profile_type_id,
        name: result.name,
        details: result.details,
        parent_profile_id: result.parent_profile_id,
        created_at: result.created_at,
      });
    } catch (err: any) {
      console.error('Profile creation error:', err);

      // Handle unique constraint violation
      // Check both err.code and err.cause?.code for Slonik v48+ compatibility
      if (err.code === '23505' || err.cause?.code === '23505') {
        res.status(409).json({
          error: 'There is already a profile with this name',
          message: 'There is already a profile with this name',
        });
        return;
      }

      // Handle CHECK constraint violation (ownership hierarchy)
      if (err.code === '23514' || err.cause?.code === '23514') {
        res.status(400).json({
          error: 'Invalid profile ownership structure',
          message: 'Invalid profile ownership structure',
        });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Get all profiles for the authenticated user (optionally filtered by type)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Optional query parameter to filter by type
  const typeFilter = req.query.type ? parseInt(req.query.type as string) : null;

  try {
    const db = await getPool();

    let query;
    if (typeFilter) {
      query = sql.unsafe`
        SELECT 
          p.profile_id, 
          p.profile_type_id, 
          p.name, 
          p.created_at,
          pt.type_name
        FROM profiles p
        JOIN profile_types pt ON p.profile_type_id = pt.type_id
        WHERE p.account_id = ${userId} 
          AND p.profile_type_id = ${typeFilter}
          AND p.deleted = false
        ORDER BY p.created_at DESC
      `;
    } else {
      query = sql.unsafe`
        SELECT 
          p.profile_id, 
          p.profile_type_id, 
          p.name, 
          p.created_at,
          pt.type_name
        FROM profiles p
        JOIN profile_types pt ON p.profile_type_id = pt.type_id
        WHERE p.account_id = ${userId} 
          AND p.deleted = false
        ORDER BY p.created_at DESC
      `;
    }

    const profiles = await db.any(query);
    res.json(profiles);
  } catch (err) {
    console.error('Profiles fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile by ID endpoint
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    const profile = await db.maybeOne(sql.unsafe`
      SELECT p.profile_id, p.account_id, p.profile_type_id, p.name, p.details, 
             p.parent_profile_id, p.created_at, p.updated_at, p.deleted, 
             pt.type_name, a.username,
             parent_p.name as parent_name,
             parent_p.profile_id as parent_id
      FROM profiles p
      JOIN profile_types pt ON p.profile_type_id = pt.type_id
      JOIN accounts a ON p.account_id = a.account_id
      LEFT JOIN profiles parent_p ON p.parent_profile_id = parent_p.profile_id
      WHERE p.profile_id = ${profileId} AND p.deleted = false
    `);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({
      profile_id: profile.profile_id,
      account_id: profile.account_id,
      profile_type_id: profile.profile_type_id,
      type_name: profile.type_name,
      name: profile.name,
      details: profile.details,
      parent_profile_id: profile.parent_profile_id,
      parent_name: profile.parent_name,
      parent_id: profile.parent_id,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      deleted: profile.deleted,
      username: profile.username,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
