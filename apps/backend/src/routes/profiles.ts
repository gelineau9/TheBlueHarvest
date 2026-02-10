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
    body('profile_type_id')
      .isInt({ min: 1, max: 4 })
      .withMessage('Profile type must be 1 (character), 2 (item), 3 (kinship), or 4 (organization)'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Profile name is required and must not exceed 100 characters'),
    body('details').optional(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { profile_type_id, name, details } = req.body;
    const userId = req.userId!;

    try {
      const db = await getPool();

      // Create the profile
      const result = await db.one(sql.unsafe`
        INSERT INTO profiles (account_id, profile_type_id, name, details)
        VALUES (${userId}, ${profile_type_id}, ${name}, ${details !== null && details !== undefined ? sql.jsonb(details) : null})
        RETURNING profile_id, account_id, profile_type_id, name, details, created_at
      `);

      res.status(201).json({
        profile_id: result.profile_id,
        account_id: result.account_id,
        profile_type_id: result.profile_type_id,
        name: result.name,
        details: result.details,
        created_at: result.created_at,
      });
    } catch (err) {
      console.error('Profile creation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

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
             p.created_at, p.updated_at, p.deleted, pt.type_name, a.username
      FROM profiles p
      JOIN profile_types pt ON p.profile_type_id = pt.type_id
      JOIN accounts a ON p.account_id = a.account_id
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
