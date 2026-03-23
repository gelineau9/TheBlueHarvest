import { Router, Response, Request } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditProfile } from './editors.js';

const router = Router();

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
    body('is_published').optional().isBoolean().withMessage('is_published must be a boolean'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { profile_type_id, name, details, parent_profile_id, is_published = true } = req.body;
    const userId = req.userId!;

    try {
      const db = await getPool();

      // ===== VALIDATION: Ownership Rules =====

      // Characters (1) and Locations (5) CANNOT have a parent
      if ([1, 5].includes(profile_type_id) && parent_profile_id) {
        const profileType = profile_type_id === 1 ? 'Characters' : 'Locations';
        res.status(400).json({
          error: `${profileType} are independent profiles and cannot belong to other profiles`,
          message: `${profileType} are independent profiles and cannot belong to other profiles`,
        });
        return;
      }

      // Items (2), Kinships (3), Organizations (4) MUST have a parent
      if ([2, 3, 4].includes(profile_type_id) && !parent_profile_id) {
        const typeNames: { [key: number]: string } = { 2: 'Items', 3: 'Kinships', 4: 'Organizations' };
        const typeName = typeNames[profile_type_id] || 'This profile type';
        res.status(400).json({
          error: `${typeName} must belong to a character. Please select a character first.`,
          message: `${typeName} must belong to a character. Please select a character first.`,
        });
        return;
      }

      // If parent_profile_id is provided, verify it exists and is owned by the user
      if (parent_profile_id) {
        const parent = await db.maybeOne(
          sql.type(
            z.object({
              profile_id: z.number(),
              profile_type_id: z.number(),
              account_id: z.number(),
              name: z.string(),
            }),
          )`
          SELECT profile_id, profile_type_id, account_id, name
          FROM profiles 
          WHERE profile_id = ${parent_profile_id} 
            AND account_id = ${userId}
            AND profile_type_id = 1
            AND deleted = false
        `,
        );

        if (!parent) {
          res.status(400).json({
            error: 'Parent profile must be a character that you own',
            message: 'Parent profile must be a character that you own',
          });
          return;
        }
      }

      // ===== CREATE PROFILE =====

      const result = await db.one(
        sql.type(
          z.object({
            profile_id: z.number(),
            account_id: z.number(),
            profile_type_id: z.number(),
            name: z.string(),
            details: z.any().nullable(),
            parent_profile_id: z.number().nullable(),
            is_published: z.boolean(),
            created_at: z.string(),
          }),
        )`
        INSERT INTO profiles (account_id, profile_type_id, name, details, parent_profile_id, is_published)
        VALUES (
          ${userId}, 
          ${profile_type_id}, 
          ${name}, 
          ${details !== null && details !== undefined ? sql.jsonb(details) : null},
          ${parent_profile_id || null},
          ${is_published}
        )
        RETURNING profile_id, account_id, profile_type_id, name, details, parent_profile_id, is_published, created_at::text
      `,
      );

      res.status(201).json({
        profile_id: result.profile_id,
        account_id: result.account_id,
        profile_type_id: result.profile_type_id,
        name: result.name,
        details: result.details,
        parent_profile_id: result.parent_profile_id,
        is_published: result.is_published,
        created_at: result.created_at,
      });
    } catch (err: any) {
      console.error('Profile creation error:', err);

      // Handle unique constraint violation
      if (err.code === '23505' || err.cause?.code === '23505') {
        let errorMessage = 'There is already a profile with this name';

        // Provide context-specific error messages based on profile type
        if (profile_type_id === 1) {
          errorMessage = 'This character name is already taken. Character names must be unique across all users.';
        } else if ([2, 3, 4].includes(profile_type_id)) {
          const typeNames: { [key: number]: string } = { 2: 'item', 3: 'kinship', 4: 'organization' };
          const typeName = typeNames[profile_type_id];
          errorMessage = `You already have a ${typeName} with this name. Please choose a different name.`;
        } else if (profile_type_id === 5) {
          errorMessage = 'You already have a location with this name. Please choose a different name.';
        }

        res.status(409).json({
          error: errorMessage,
          message: errorMessage,
        });
        return;
      }

      // Handle CHECK constraint violation (ownership hierarchy)
      if (err.code === '23514' || err.cause?.code === '23514') {
        res.status(400).json({
          error:
            'This profile cannot be created due to ownership rules. Items, Kinships, and Organizations must belong to a character you own.',
          message:
            'This profile cannot be created due to ownership rules. Items, Kinships, and Organizations must belong to a character you own.',
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

    // Define the result schema for user profiles
    const profileSchema = z.object({
      profile_id: z.number(),
      profile_type_id: z.number(),
      name: z.string(),
      is_published: z.boolean(),
      created_at: z.string(),
      type_name: z.string(),
    });

    // Build type filter fragment if type is specified
    const typeFilterFragment = typeFilter ? sql.fragment`AND p.profile_type_id = ${typeFilter}` : sql.fragment``;

    const profiles = await db.any(
      sql.type(profileSchema)`
        SELECT 
          p.profile_id, 
          p.profile_type_id, 
          p.name, 
          p.is_published,
          p.created_at::text,
          pt.type_name
        FROM profiles p
        JOIN profile_types pt ON p.profile_type_id = pt.type_id
        WHERE p.account_id = ${userId} 
          AND p.deleted = false
          ${typeFilterFragment}
        ORDER BY p.created_at DESC
      `,
    );

    res.json(profiles);
  } catch (err) {
    console.error('Profiles fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public profiles (no authentication required)
// Supports pagination with limit/offset for infinite scroll (2.2.6)
router.get('/public', async (req: Request, res: Response) => {
  // Parse limit parameter with defaults and handle negative values
  const parsedLimit = parseInt(req.query.limit as string) || 50;
  const limit = Math.min(Math.max(parsedLimit, 1), 100); // Min 1, Max 100

  // Parse offset parameter for pagination (2.2.6)
  const parsedOffset = parseInt(req.query.offset as string) || 0;
  const offset = Math.max(parsedOffset, 0); // Ensure non-negative

  // Parse and validate sort parameters (2.2.3)
  // Whitelist of allowed sort columns to prevent SQL injection
  const allowedSortColumns = ['created_at', 'updated_at', 'name'] as const;
  type SortColumn = (typeof allowedSortColumns)[number];
  const sortByParam = req.query.sortBy as string;
  const sortBy: SortColumn = allowedSortColumns.includes(sortByParam as SortColumn)
    ? (sortByParam as SortColumn)
    : 'created_at';

  // Validate sort order - only allow ASC or DESC
  const orderParam = ((req.query.order as string) || 'desc').toUpperCase();
  const sortOrder: 'ASC' | 'DESC' = orderParam === 'ASC' ? 'ASC' : 'DESC';

  // Parse and validate profile_type_id filter (2.2.4)
  // Accepts single ID or comma-separated IDs (e.g., "1" or "1,2,3")
  const validTypeIds = [1, 2, 3, 4, 5]; // Character, Item, Kinship, Organization, Location
  const profileTypeParam = req.query.profile_type_id as string;
  let profileTypeIds: number[] = [];

  if (profileTypeParam) {
    profileTypeIds = profileTypeParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && validTypeIds.includes(id));
  }

  // Parse search parameter (2.2.5)
  // Sanitize by trimming and limiting length to prevent abuse
  const searchParam = req.query.search as string;
  const searchTerm = searchParam ? searchParam.trim().slice(0, 100) : '';

  // Parse startsWith parameter — single letter filter for alphabetical browsing
  const startsWithParam = req.query.startsWith as string;
  const startsWithLetter =
    startsWithParam && /^[a-zA-Z]$/.test(startsWithParam.trim()) ? startsWithParam.trim().toUpperCase() : '';

  // Parse parent_profile_id filter (for owned-items section on character profile pages)
  const parentProfileIdParam = req.query.parent_profile_id as string;
  const parentProfileIdFilter = parentProfileIdParam ? parseInt(parentProfileIdParam, 10) : null;
  const validParentProfileId = parentProfileIdFilter && !isNaN(parentProfileIdFilter) ? parentProfileIdFilter : null;

  try {
    const db = await getPool();

    // Build query dynamically based on sort parameters
    // Using a map of pre-defined SQL fragments ensures type safety and prevents SQL injection
    const sortQueries = {
      created_at: {
        ASC: sql.fragment`ORDER BY p.created_at ASC, p.profile_id ASC`,
        DESC: sql.fragment`ORDER BY p.created_at DESC, p.profile_id DESC`,
      },
      updated_at: {
        ASC: sql.fragment`ORDER BY p.updated_at ASC, p.profile_id ASC`,
        DESC: sql.fragment`ORDER BY p.updated_at DESC, p.profile_id DESC`,
      },
      name: {
        ASC: sql.fragment`ORDER BY p.name ASC, p.profile_id ASC`,
        DESC: sql.fragment`ORDER BY p.name DESC, p.profile_id DESC`,
      },
    };

    const orderByFragment = sortQueries[sortBy][sortOrder];

    // Build WHERE clause with optional profile type filter (2.2.4)
    const typeFilterFragment =
      profileTypeIds.length > 0
        ? sql.fragment`AND p.profile_type_id IN (${sql.join(
            profileTypeIds.map((id) => sql.fragment`${id}`),
            sql.fragment`, `,
          )})`
        : sql.fragment``;

    // Build search filter fragment (2.2.5)
    // Uses ILIKE for case-insensitive partial matching
    const searchFilterFragment = searchTerm ? sql.fragment`AND p.name ILIKE ${'%' + searchTerm + '%'}` : sql.fragment``;

    // Build startsWith filter fragment — anchored prefix match for alphabetical browsing
    const startsWithFilterFragment = startsWithLetter
      ? sql.fragment`AND p.name ILIKE ${startsWithLetter + '%'}`
      : sql.fragment``;

    // Build parent_profile_id filter fragment (for items owned by a specific character)
    const parentProfileFilterFragment = validParentProfileId
      ? sql.fragment`AND p.parent_profile_id = ${validParentProfileId}`
      : sql.fragment``;

    // Get profiles with limit and offset for pagination (2.2.6)
    const profiles = await db.any(
      sql.type(
        z.object({
          profile_id: z.number(),
          profile_type_id: z.number(),
          name: z.string(),
          details: z.any().nullable(),
          created_at: z.string(),
          type_name: z.string(),
          username: z.string(),
        }),
      )`
      SELECT 
        p.profile_id, 
        p.profile_type_id, 
        p.name,
        p.details,
        p.created_at::text,
        pt.type_name,
        a.username
      FROM profiles p
      JOIN profile_types pt ON p.profile_type_id = pt.type_id
      JOIN accounts a ON p.account_id = a.account_id
      WHERE p.deleted = false
        AND p.is_published = true
      ${typeFilterFragment}
      ${searchFilterFragment}
      ${startsWithFilterFragment}
      ${parentProfileFilterFragment}
      ${orderByFragment}
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    );

    // Get total count for hasMore calculation (with same filters)
    const countResult = await db.one(
      sql.type(z.object({ total: z.string() }))`
      SELECT COUNT(*) as total
      FROM profiles p
      WHERE p.deleted = false
        AND p.is_published = true
      ${typeFilterFragment}
      ${searchFilterFragment}
      ${startsWithFilterFragment}
      ${parentProfileFilterFragment}
    `,
    );

    const total = parseInt(countResult.total);
    // hasMore is true if there are more profiles beyond the current page (2.2.6)
    const hasMore = offset + profiles.length < total;

    res.json({
      profiles,
      total,
      hasMore,
    });
  } catch (err) {
    console.error('Public profiles fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile by ID endpoint (2.3.1 - adds is_owner for edit button visibility)
router.get('/:id', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    const profile = await db.maybeOne(
      sql.type(
        z.object({
          profile_id: z.number(),
          account_id: z.number(),
          profile_type_id: z.number(),
          name: z.string(),
          details: z.any().nullable(),
          parent_profile_id: z.number().nullable(),
          is_published: z.boolean(),
          created_at: z.string(),
          updated_at: z.string().nullable(),
          deleted: z.boolean(),
          type_name: z.string(),
          username: z.string(),
          parent_name: z.string().nullable(),
          parent_id: z.number().nullable(),
        }),
      )`
      SELECT p.profile_id, p.account_id, p.profile_type_id, p.name, p.details, 
             p.parent_profile_id, p.is_published, p.created_at::text, p.updated_at::text, p.deleted, 
             pt.type_name, a.username,
             parent_p.name as parent_name,
             parent_p.profile_id as parent_id
      FROM profiles p
      JOIN profile_types pt ON p.profile_type_id = pt.type_id
      JOIN accounts a ON p.account_id = a.account_id
      LEFT JOIN profiles parent_p ON p.parent_profile_id = parent_p.profile_id
      WHERE p.profile_id = ${profileId} AND p.deleted = false
    `,
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Determine if current user can edit this profile (owner OR editor)
    const canEdit = req.userId ? await canEditProfile(db, profileId, req.userId) : false;
    // Determine if current user is the owner (for managing editors, deleting)
    const isOwner = req.userId ? profile.account_id === req.userId : false;

    // Check if user can view this profile (drafts only visible to owner/editors)
    if (!profile.is_published && !canEdit) {
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
      is_published: profile.is_published,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      deleted: profile.deleted,
      username: profile.username,
      can_edit: canEdit,
      is_owner: isOwner,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile endpoint (2.3.2)
router.put(
  '/:id',
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Profile name must be between 1 and 100 characters'),
    body('details').optional(),
    body('is_published').optional().isBoolean().withMessage('is_published must be a boolean'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const userId = req.userId!;
    const { name, details, is_published } = req.body;

    if (isNaN(profileId)) {
      res.status(400).json({ error: 'Invalid profile ID' });
      return;
    }

    // Check if at least one field is being updated
    if (name === undefined && details === undefined && is_published === undefined) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    try {
      const db = await getPool();

      // Verify the profile exists and is owned by the user
      const existingProfile = await db.maybeOne(
        sql.type(
          z.object({
            profile_id: z.number(),
            account_id: z.number(),
            profile_type_id: z.number(),
          }),
        )`
        SELECT profile_id, account_id, profile_type_id
        FROM profiles
        WHERE profile_id = ${profileId}
          AND deleted = false
      `,
      );

      if (!existingProfile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Check if user can edit (owner OR editor)
      const hasEditPermission = await canEditProfile(db, profileId, userId);
      if (!hasEditPermission) {
        res.status(403).json({ error: 'You do not have permission to edit this profile' });
        return;
      }

      // Build update query dynamically based on provided fields
      const updateFragments = [];

      if (name !== undefined) {
        updateFragments.push(sql.fragment`name = ${name}`);
      }
      if (details !== undefined) {
        updateFragments.push(sql.fragment`details = ${details !== null ? sql.jsonb(details) : null}`);
      }
      if (is_published !== undefined) {
        updateFragments.push(sql.fragment`is_published = ${is_published}`);
      }

      // Always update updated_at timestamp
      updateFragments.push(sql.fragment`updated_at = NOW()`);

      const updateFragment = sql.join(updateFragments, sql.fragment`, `);

      const updatedProfile = await db.one(
        sql.type(
          z.object({
            profile_id: z.number(),
            account_id: z.number(),
            profile_type_id: z.number(),
            name: z.string(),
            details: z.any().nullable(),
            is_published: z.boolean(),
            created_at: z.string(),
            updated_at: z.string(),
          }),
        )`
        UPDATE profiles
        SET ${updateFragment}
        WHERE profile_id = ${profileId}
        RETURNING 
          profile_id, 
          account_id, 
          profile_type_id, 
          name, 
          details, 
          is_published,
          created_at::text, 
          updated_at::text
      `,
      );

      res.json({
        profile_id: updatedProfile.profile_id,
        account_id: updatedProfile.account_id,
        profile_type_id: updatedProfile.profile_type_id,
        name: updatedProfile.name,
        details: updatedProfile.details,
        is_published: updatedProfile.is_published,
        created_at: updatedProfile.created_at,
        updated_at: updatedProfile.updated_at,
      });
    } catch (err: any) {
      console.error('Profile update error:', err);

      // Handle unique constraint violation (duplicate name)
      if (err.code === '23505' || err.cause?.code === '23505') {
        res.status(409).json({
          error: 'A profile with this name already exists',
        });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/profiles/:id - Soft delete a profile (2.4.2)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const profileId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    // Verify ownership and soft-delete in one query
    const result = await db.maybeOne(
      sql.type(
        z.object({
          profile_id: z.number(),
        }),
      )`
        UPDATE profiles
        SET deleted = true
        WHERE profile_id = ${profileId}
          AND account_id = ${userId}
          AND deleted = false
        RETURNING profile_id
      `,
    );

    if (!result) {
      res.status(404).json({ error: 'Profile not found or not authorized' });
      return;
    }

    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Profile deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Kinship Members ───────────────────────────────────────────────────────────
//
// GET    /api/profiles/:id/members         — list members of a kinship (public)
// POST   /api/profiles/:id/members         — add caller's character as a member
// DELETE /api/profiles/:id/members/:charId — remove a member (self or editor/owner)

const KinshipMemberSchema = z.object({
  character_id: z.number(),
  character_name: z.string(),
  avatar_url: z.string().nullable(),
  joined_at: z.string(),
});

// GET /api/profiles/:id/members
router.get('/:id/members', async (req: Request, res: Response) => {
  const kinshipId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(kinshipId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    // Verify profile exists and is a kinship
    const kinship = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number(), profile_type_id: z.number() }))`
        SELECT profile_id, profile_type_id FROM profiles
        WHERE profile_id = ${kinshipId} AND deleted = false
      `,
    );

    if (!kinship) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (kinship.profile_type_id !== 3) {
      res.status(400).json({ error: 'Only kinship profiles have members' });
      return;
    }

    const members = await db.any(
      sql.type(KinshipMemberSchema)`
        SELECT
          km.character_id,
          p.name AS character_name,
          p.details->'avatar'->>'url' AS avatar_url,
          km.joined_at::text
        FROM kinship_members km
        JOIN profiles p ON km.character_id = p.profile_id
        WHERE km.kinship_id = ${kinshipId}
          AND p.deleted = false
          AND p.is_published = true
        ORDER BY km.joined_at ASC
      `,
    );

    res.json({ members });
  } catch (err) {
    console.error('Error fetching kinship members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profiles/:id/members  — join a kinship (auth required)
// Body: { character_id: number }  — the character profile to add as member
router.post('/:id/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  const kinshipId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const userId = req.userId!;

  if (isNaN(kinshipId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  const characterId = parseInt(req.body.character_id);
  if (isNaN(characterId)) {
    res.status(400).json({ error: 'character_id must be a valid integer' });
    return;
  }

  try {
    const db = await getPool();

    // Verify the kinship exists and is type 3
    const kinship = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number(), profile_type_id: z.number() }))`
        SELECT profile_id, profile_type_id FROM profiles
        WHERE profile_id = ${kinshipId} AND deleted = false
      `,
    );

    if (!kinship) {
      res.status(404).json({ error: 'Kinship not found' });
      return;
    }

    if (kinship.profile_type_id !== 3) {
      res.status(400).json({ error: 'Target profile is not a kinship' });
      return;
    }

    // Verify the character exists, is type 1, and is owned by caller
    const character = await db.maybeOne(
      sql.type(z.object({ profile_id: z.number(), account_id: z.number() }))`
        SELECT profile_id, account_id FROM profiles
        WHERE profile_id = ${characterId}
          AND profile_type_id = 1
          AND deleted = false
      `,
    );

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (character.account_id !== userId) {
      res.status(403).json({ error: 'You can only add your own characters to a kinship' });
      return;
    }

    // Upsert membership (idempotent)
    await db.query(
      sql.type(z.object({}))`
        INSERT INTO kinship_members (kinship_id, character_id)
        VALUES (${kinshipId}, ${characterId})
        ON CONFLICT (kinship_id, character_id) DO NOTHING
      `,
    );

    res.status(201).json({ message: 'Joined kinship successfully' });
  } catch (err) {
    console.error('Error adding kinship member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/profiles/:id/members/:charId
router.delete('/:id/members/:charId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const kinshipId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const characterId = parseInt(req.params.charId);
  const userId = req.userId!;

  if (isNaN(kinshipId) || isNaN(characterId)) {
    res.status(400).json({ error: 'Invalid profile ID or character ID' });
    return;
  }

  try {
    const db = await getPool();

    // Membership must exist
    const membership = await db.maybeOne(
      sql.type(z.object({ kinship_id: z.number(), character_id: z.number() }))`
        SELECT kinship_id, character_id FROM kinship_members
        WHERE kinship_id = ${kinshipId} AND character_id = ${characterId}
      `,
    );

    if (!membership) {
      res.status(404).json({ error: 'Membership not found' });
      return;
    }

    // Caller must be: owner of the character, OR can_edit the kinship
    const character = await db.maybeOne(
      sql.type(z.object({ account_id: z.number() }))`
        SELECT account_id FROM profiles WHERE profile_id = ${characterId} AND deleted = false
      `,
    );

    const isCharacterOwner = character?.account_id === userId;
    const canEditKinship = await canEditProfile(db, kinshipId, userId);

    if (!isCharacterOwner && !canEditKinship) {
      res.status(403).json({ error: 'You do not have permission to remove this member' });
      return;
    }

    // Remove membership
    await db.query(
      sql.type(z.object({}))`
        DELETE FROM kinship_members
        WHERE kinship_id = ${kinshipId} AND character_id = ${characterId}
      `,
    );

    // Also clear kinship_profile_id from the character's details JSON if it matches
    await db.query(
      sql.type(z.object({}))`
        UPDATE profiles
        SET details = details - 'kinship_profile_id',
            updated_at = NOW()
        WHERE profile_id = ${characterId}
          AND details->>'kinship_profile_id' = ${kinshipId.toString()}
      `,
    );

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing kinship member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
