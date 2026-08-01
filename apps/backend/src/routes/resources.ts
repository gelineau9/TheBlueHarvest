/**
 * Resources Route
 *
 * Official site content, typed via resource_types. Guides are the first type;
 * future types (Discord forum mirrors, live-map data) slot in as new rows in
 * resource_types without backend changes.
 *
 * Read access is public and limited to published, non-deleted rows.
 * Write access is data-driven: the type's required_role_id names the role an
 * author must hold. Admins and moderators may write any type and edit anyone's
 * resource; an author may only edit their own.
 */
import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, requireAnyRole, hasRole, AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────

const ResourceRowSchema = z.object({
  resource_id: z.number(),
  resource_type_id: z.number(),
  type_name: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  content: z.unknown().nullable(),
  display_order: z.number(),
  is_published: z.boolean(),
  created_by: z.number().nullable(),
  author_username: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ResourceTypeSchema = z.object({
  type_id: z.number(),
  type_name: z.string(),
  required_role_id: z.number().nullable(),
  required_role_name: z.string().nullable(),
});

const OwnerSchema = z.object({
  resource_id: z.number(),
  created_by: z.number().nullable(),
  resource_type_id: z.number(),
});

// Columns shared by every read; keeps the public and admin queries identical in shape
const resourceColumns = sql.fragment`
  r.resource_id,
  r.resource_type_id,
  rt.type_name,
  r.slug,
  r.title,
  r.summary,
  r.content,
  r.display_order,
  r.is_published,
  r.created_by,
  a.username AS author_username,
  r.created_at::text,
  r.updated_at::text
`;

const resourceJoins = sql.fragment`
  FROM resources r
  JOIN resource_types rt ON rt.type_id = r.resource_type_id
  LEFT JOIN accounts a ON a.account_id = r.created_by
`;

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** URL-safe slug from a title. Falls back to 'resource' if nothing survives. */
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
  return base || 'resource';
}

/**
 * A slug unique among live rows. Appends -2, -3, … on collision rather than
 * failing, so two guides may share a title.
 */
async function uniqueSlug(db: Awaited<ReturnType<typeof getPool>>, title: string, excludeId?: number): Promise<string> {
  const base = slugify(title);
  for (let suffix = 1; suffix < 100; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const clash = await db.maybeOne(
      sql.type(z.object({ resource_id: z.number() }))`
        SELECT resource_id FROM resources
        WHERE slug = ${candidate}
          AND deleted = false
          ${excludeId ? sql.fragment`AND resource_id != ${excludeId}` : sql.fragment``}
      `,
    );
    if (!clash) return candidate;
  }
  // Astronomically unlikely; keeps the return type honest
  return `${base}-${Date.now()}`;
}

async function getResourceType(
  db: Awaited<ReturnType<typeof getPool>>,
  typeId: number,
): Promise<z.infer<typeof ResourceTypeSchema> | null> {
  return db.maybeOne(
    sql.type(ResourceTypeSchema)`
      SELECT rt.type_id, rt.type_name, rt.required_role_id, ur.role_name AS required_role_name
      FROM resource_types rt
      LEFT JOIN user_roles ur ON ur.role_id = rt.required_role_id
      WHERE rt.type_id = ${typeId}
    `,
  );
}

/** Staff may author any resource type and see every draft. */
function isStaff(req: AuthRequest): boolean {
  return hasRole(req, 'admin') || hasRole(req, 'moderator');
}

/**
 * Rewriting someone else's words is an admin-only act — moderators moderate,
 * they don't author. Deletion is separate (see canModerate) so moderators can
 * still take a guide down.
 */
function canEditOthers(req: AuthRequest): boolean {
  return hasRole(req, 'admin');
}

/** Taking a resource down is a moderation action, available to both. */
function canModerate(req: AuthRequest): boolean {
  return hasRole(req, 'admin') || hasRole(req, 'moderator');
}

// ─────────────────────────────────────────────────────────
// GET /api/resources — public list, published only
// ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const typeName = typeof req.query.type === 'string' ? req.query.type : undefined;

  try {
    const db = await getPool();

    const typeFilter = typeName ? sql.fragment`AND rt.type_name = ${typeName}` : sql.fragment``;

    const resources = await db.any(
      sql.type(ResourceRowSchema)`
        SELECT ${resourceColumns}
        ${resourceJoins}
        WHERE r.deleted = false
          AND r.is_published = true
          ${typeFilter}
        ORDER BY r.display_order ASC, r.created_at DESC
      `,
    );

    res.json({ resources });
  } catch (err) {
    logger.error('Error fetching resources:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/resources/manage — authors' and staff view, includes drafts
// Declared before /:slug so it isn't captured as a slug.
// ─────────────────────────────────────────────────────────
router.get(
  '/manage',
  authenticateToken,
  requireAnyRole('admin', 'moderator', 'guide_author'),
  async (req: AuthRequest, res: Response) => {
    const typeName = typeof req.query.type === 'string' ? req.query.type : undefined;

    try {
      const db = await getPool();

      const typeFilter = typeName ? sql.fragment`AND rt.type_name = ${typeName}` : sql.fragment``;

      // Authors see their own drafts; staff see everything
      const ownerFilter = isStaff(req) ? sql.fragment`` : sql.fragment`AND r.created_by = ${req.userId!}`;

      const resources = await db.any(
        sql.type(ResourceRowSchema)`
          SELECT ${resourceColumns}
          ${resourceJoins}
          WHERE r.deleted = false
            ${typeFilter}
            ${ownerFilter}
          ORDER BY r.display_order ASC, r.created_at DESC
        `,
      );

      res.json({ resources });
    } catch (err) {
      logger.error('Error fetching manageable resources:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// GET /api/resources/:slug — public single, published only
// ─────────────────────────────────────────────────────────
router.get('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug);

  try {
    const db = await getPool();

    const resource = await db.maybeOne(
      sql.type(ResourceRowSchema)`
        SELECT ${resourceColumns}
        ${resourceJoins}
        WHERE r.slug = ${slug}
          AND r.deleted = false
          AND r.is_published = true
      `,
    );

    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    res.json(resource);
  } catch (err) {
    logger.error('Error fetching resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/resources — create
// ─────────────────────────────────────────────────────────
router.post(
  '/',
  authenticateToken,
  [
    body('resource_type_id').isInt({ min: 1 }).withMessage('resource_type_id is required'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 characters)'),
    body('summary').optional({ nullable: true }).isLength({ max: 500 }).withMessage('Summary must be under 500 chars'),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_published').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      resource_type_id: typeId,
      title,
      summary = null,
      content = null,
      display_order: displayOrder = 0,
      is_published: isPublished = false,
    } = req.body;

    try {
      const db = await getPool();

      const type = await getResourceType(db, typeId);
      if (!type) {
        res.status(400).json({ error: 'Unknown resource type' });
        return;
      }

      // Data-driven permission, with a staff override so admins are never locked out
      if (!isStaff(req) && !(type.required_role_name && hasRole(req, type.required_role_name))) {
        res.status(403).json({ error: `You do not have permission to create ${type.type_name} resources` });
        return;
      }

      const slug = await uniqueSlug(db, title);

      const created = await db.one(
        sql.type(z.object({ resource_id: z.number(), slug: z.string() }))`
          INSERT INTO resources (resource_type_id, slug, title, summary, content, display_order, is_published, created_by, updated_by)
          VALUES (
            ${typeId},
            ${slug},
            ${title},
            ${summary},
            ${content !== null && content !== undefined ? sql.jsonb(content) : null},
            ${displayOrder},
            ${isPublished},
            ${req.userId!},
            ${req.userId!}
          )
          RETURNING resource_id, slug
        `,
      );

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'resource_created',
        targetType: 'resource',
        targetId: created.resource_id,
        metadata: { type: type.type_name, title, is_published: isPublished },
      });

      res.status(201).json({ resource_id: created.resource_id, slug: created.slug });
    } catch (err) {
      logger.error('Error creating resource:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PUT /api/resources/:id — update (own resource, or any if staff)
// ─────────────────────────────────────────────────────────
router.put(
  '/:id',
  authenticateToken,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('summary').optional({ nullable: true }).isLength({ max: 500 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('is_published').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const resourceId = parseInt(String(req.params.id));
    if (isNaN(resourceId)) {
      res.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    const { title, summary, content, display_order: displayOrder, is_published: isPublished } = req.body;

    try {
      const db = await getPool();

      const existing = await db.maybeOne(
        sql.type(OwnerSchema)`
          SELECT resource_id, created_by, resource_type_id
          FROM resources
          WHERE resource_id = ${resourceId} AND deleted = false
        `,
      );

      if (!existing) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      if (!canEditOthers(req) && existing.created_by !== req.userId) {
        res.status(403).json({ error: 'You may only edit your own resources' });
        return;
      }

      const updates = [sql.fragment`updated_by = ${req.userId!}`];

      if (title !== undefined) {
        updates.push(sql.fragment`title = ${title}`);
        // Slug follows the title so URLs stay meaningful after a rename
        updates.push(sql.fragment`slug = ${await uniqueSlug(db, title, resourceId)}`);
      }
      if (summary !== undefined) updates.push(sql.fragment`summary = ${summary}`);
      if (content !== undefined) {
        updates.push(sql.fragment`content = ${content !== null && content !== undefined ? sql.jsonb(content) : null}`);
      }
      if (displayOrder !== undefined) updates.push(sql.fragment`display_order = ${displayOrder}`);
      if (isPublished !== undefined) updates.push(sql.fragment`is_published = ${isPublished}`);

      const updated = await db.one(
        sql.type(z.object({ resource_id: z.number(), slug: z.string() }))`
          UPDATE resources
          SET ${sql.join(updates, sql.fragment`, `)}
          WHERE resource_id = ${resourceId}
          RETURNING resource_id, slug
        `,
      );

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'resource_updated',
        targetType: 'resource',
        targetId: resourceId,
        metadata: { title, is_published: isPublished },
      });

      res.json({ resource_id: updated.resource_id, slug: updated.slug });
    } catch (err) {
      logger.error('Error updating resource:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// DELETE /api/resources/:id — soft delete (own resource, or any if staff)
// ─────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const resourceId = parseInt(String(req.params.id));
  if (isNaN(resourceId)) {
    res.status(400).json({ error: 'Invalid resource ID' });
    return;
  }

  try {
    const db = await getPool();

    const existing = await db.maybeOne(
      sql.type(OwnerSchema)`
        SELECT resource_id, created_by, resource_type_id
        FROM resources
        WHERE resource_id = ${resourceId} AND deleted = false
      `,
    );

    if (!existing) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    if (!canModerate(req) && existing.created_by !== req.userId) {
      res.status(403).json({ error: 'You may only delete your own resources' });
      return;
    }

    await db.query(sql.unsafe`
      UPDATE resources SET deleted = true, updated_by = ${req.userId!} WHERE resource_id = ${resourceId}
    `);

    await writeAuditLog({
      actorAccountId: req.userId!,
      actionType: 'resource_deleted',
      targetType: 'resource',
      targetId: resourceId,
    });

    res.status(204).send();
  } catch (err) {
    logger.error('Error deleting resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
