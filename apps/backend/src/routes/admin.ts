import { Router, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/auditLog.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────

const UserRowSchema = z.object({
  account_id: z.number(),
  username: z.string(),
  email: z.string(),
  role_name: z.string(),
  user_role_id: z.number(),
  is_banned: z.boolean(),
  banned_reason: z.string().nullable(),
  suspended_until: z.string().nullable(),
  created_at: z.string(),
});

const CountSchema = z.object({ count: z.number() });

const AuditLogRowSchema = z.object({
  log_id: z.number(),
  actor_account_id: z.number().nullable(),
  actor_username: z.string().nullable(),
  action_type: z.string(),
  target_type: z.string().nullable(),
  target_id: z.number().nullable(),
  metadata: z.any().nullable(),
  created_at: z.string(),
});

const PostExistsSchema = z.object({ post_id: z.number() });
const ProfileExistsSchema = z.object({ profile_id: z.number() });
const CommentExistsSchema = z.object({ comment_id: z.number() });
const AccountRoleSchema = z.object({ user_role_id: z.number() });

const DeletedPostRowSchema = z.object({
  post_id: z.number(),
  title: z.string(),
  post_type_id: z.number(),
  username: z.string(),
  deleted: z.boolean(),
  created_at: z.string(),
});

const DeletedProfileRowSchema = z.object({
  profile_id: z.number(),
  name: z.string(),
  profile_type_id: z.number(),
  username: z.string(),
  deleted: z.boolean(),
  created_at: z.string(),
});

const UserContentPostSchema = z.object({
  post_id: z.number(),
  title: z.string(),
  post_type_id: z.number(),
  is_published: z.boolean(),
  deleted: z.boolean(),
  created_at: z.string(),
});

const UserContentProfileSchema = z.object({
  profile_id: z.number(),
  name: z.string(),
  profile_type_id: z.number(),
  is_published: z.boolean(),
  deleted: z.boolean(),
  created_at: z.string(),
});

const UserContentCommentSchema = z.object({
  comment_id: z.number(),
  post_id: z.number(),
  content: z.string(),
  is_deleted: z.boolean(),
  created_at: z.string(),
});

const FeaturedPostRowSchema = z.object({
  featured_post_id: z.number(),
  post_id: z.number(),
  title: z.string(),
  display_order: z.number(),
  created_at: z.string(),
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────
router.get(
  '/users',
  authenticateToken,
  requireRole(2, 3),
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
    queryValidator('search').optional().isString().trim(),
    queryValidator('role').optional().isInt({ min: 1, max: 3 }).toInt(),
    queryValidator('status').optional().isIn(['active', 'banned', 'suspended', 'deleted']),
    queryValidator('joined_after').optional().isISO8601(),
    queryValidator('joined_before').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100);
    const offset = parseInt(String(req.query.offset ?? '0'));
    const search = req.query.search as string | undefined;
    const role = req.query.role ? parseInt(String(req.query.role)) : undefined;
    const status = req.query.status as string | undefined;
    const joinedAfter = req.query.joined_after as string | undefined;
    const joinedBefore = req.query.joined_before as string | undefined;

    try {
      const db = await getPool();

      const searchFilter = search
        ? sql.fragment`AND a.username ILIKE ${'%' + search + '%'}`
        : sql.fragment``;

      const roleFilter = role !== undefined
        ? sql.fragment`AND a.user_role_id = ${role}`
        : sql.fragment``;

      const statusFilter =
        status === 'banned'    ? sql.fragment`AND a.is_banned = true` :
        status === 'suspended' ? sql.fragment`AND a.suspended_until IS NOT NULL AND a.suspended_until > NOW()` :
        status === 'deleted'   ? sql.fragment`AND a.deleted = true` :
        status === 'active'    ? sql.fragment`AND a.is_banned = false AND (a.suspended_until IS NULL OR a.suspended_until <= NOW()) AND a.deleted = false` :
        sql.fragment``;

      // For deleted filter we need to include deleted rows; otherwise exclude them.
      const deletedBaseFilter = status === 'deleted'
        ? sql.fragment``
        : sql.fragment`AND a.deleted = false`;

      const joinedAfterFilter = joinedAfter
        ? sql.fragment`AND a.created_at >= ${joinedAfter}::timestamptz`
        : sql.fragment``;

      const joinedBeforeFilter = joinedBefore
        ? sql.fragment`AND a.created_at <= ${joinedBefore}::timestamptz`
        : sql.fragment``;

      const users = await db.any(
        sql.type(UserRowSchema)`
          SELECT
            a.account_id,
            a.username,
            a.email,
            ur.role_name,
            a.user_role_id,
            a.is_banned,
            a.banned_reason,
            a.suspended_until::text,
            a.created_at::text
          FROM accounts a
          JOIN user_roles ur ON a.user_role_id = ur.role_id
          WHERE 1=1
          ${deletedBaseFilter}
          ${searchFilter}
          ${roleFilter}
          ${statusFilter}
          ${joinedAfterFilter}
          ${joinedBeforeFilter}
          ORDER BY a.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const countResult = await db.one(
        sql.type(CountSchema)`
          SELECT COUNT(*)::int as count
          FROM accounts a
          WHERE 1=1
          ${deletedBaseFilter}
          ${searchFilter}
          ${roleFilter}
          ${statusFilter}
          ${joinedAfterFilter}
          ${joinedBeforeFilter}
        `,
      );

      res.json({ users, total: countResult.count, hasMore: offset + users.length < countResult.count });
    } catch (err) {
      console.error('Error fetching admin users:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// GET /api/admin/users/:id/content
// ─────────────────────────────────────────────────────────
router.get('/users/:id/content', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(String(req.params.id));
  if (isNaN(targetId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  try {
    const db = await getPool();

    const [posts, profiles, comments] = await Promise.all([
      db.any(
        sql.type(UserContentPostSchema)`
          SELECT post_id, title, post_type_id, is_published, deleted, created_at::text
          FROM posts
          WHERE account_id = ${targetId}
          ORDER BY created_at DESC
          LIMIT 50
        `,
      ),
      db.any(
        sql.type(UserContentProfileSchema)`
          SELECT profile_id, name, profile_type_id, is_published, deleted, created_at::text
          FROM profiles
          WHERE account_id = ${targetId}
          ORDER BY created_at DESC
          LIMIT 50
        `,
      ),
      db.any(
        sql.type(UserContentCommentSchema)`
          SELECT comment_id, post_id, content, is_deleted, created_at::text
          FROM comments
          WHERE account_id = ${targetId}
          ORDER BY created_at DESC
          LIMIT 50
        `,
      ),
    ]);

    res.json({ posts, profiles, comments });
  } catch (err) {
    console.error('Error fetching user content:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/role
// ─────────────────────────────────────────────────────────
router.put(
  '/users/:id/role',
  authenticateToken,
  requireRole(2),
  [body('role_id').isInt({ min: 1, max: 3 }).withMessage('role_id must be 1, 2, or 3')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const targetId = parseInt(String(req.params.id));
    if (isNaN(targetId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (req.userId === targetId) {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    const { role_id: roleId } = req.body as { role_id: number };

    try {
      const db = await getPool();

      const target = await db.maybeOne(
        sql.type(AccountRoleSchema)`
          SELECT user_role_id FROM accounts WHERE account_id = ${targetId} AND deleted = false
        `,
      );

      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await db.query(
        sql.type(z.object({}))`
          UPDATE accounts SET user_role_id = ${roleId} WHERE account_id = ${targetId}
        `,
      );

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'change_role',
        targetType: 'account',
        targetId,
        metadata: { new_role_id: roleId },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error changing user role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/ban
// ─────────────────────────────────────────────────────────
router.put(
  '/users/:id/ban',
  authenticateToken,
  requireRole(2, 3),
  [
    body('is_banned').isBoolean().withMessage('is_banned must be a boolean'),
    body('banned_reason').optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const targetId = parseInt(String(req.params.id));
    if (isNaN(targetId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (req.userId === targetId) {
      res.status(400).json({ error: 'Cannot ban yourself' });
      return;
    }

    const { is_banned: isBanned, banned_reason: bannedReason } = req.body as {
      is_banned: boolean;
      banned_reason?: string;
    };

    try {
      const db = await getPool();

      const target = await db.maybeOne(
        sql.type(AccountRoleSchema)`
          SELECT user_role_id FROM accounts WHERE account_id = ${targetId} AND deleted = false
        `,
      );

      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (target.user_role_id === 2 && req.userRoleId === 3) {
        res.status(403).json({ error: 'Moderators cannot ban admins' });
        return;
      }

      const reason = isBanned ? (bannedReason ?? null) : null;

      await db.query(
        sql.type(z.object({}))`
          UPDATE accounts
          SET is_banned = ${isBanned}, banned_reason = ${reason}
          WHERE account_id = ${targetId}
        `,
      );

      // When banning, soft-delete all content belonging to this user.
      // Content is NOT restored on unban — reinstate manually.
      if (isBanned) {
        await db.query(sql.type(z.object({}))`
          UPDATE posts SET deleted = true, is_published = false
          WHERE account_id = ${targetId} AND deleted = false
        `);
        await db.query(sql.type(z.object({}))`
          UPDATE profiles SET deleted = true, is_published = false
          WHERE account_id = ${targetId} AND deleted = false
        `);
        await db.query(sql.type(z.object({}))`
          UPDATE collections SET deleted = true
          WHERE account_id = ${targetId} AND deleted = false
        `);
        await db.query(sql.type(z.object({}))`
          UPDATE comments SET is_deleted = true
          WHERE account_id = ${targetId} AND is_deleted = false
        `);
      }

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: isBanned ? 'ban_user' : 'unban_user',
        targetType: 'account',
        targetId,
        metadata: { reason: bannedReason ?? null },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error banning/unbanning user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PUT /api/admin/users/:id/suspend
// ─────────────────────────────────────────────────────────
router.put(
  '/users/:id/suspend',
  authenticateToken,
  requireRole(2, 3),
  [
    body('suspended_until')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('suspended_until must be an ISO 8601 date or null'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const targetId = parseInt(String(req.params.id));
    if (isNaN(targetId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (req.userId === targetId) {
      res.status(400).json({ error: 'Cannot suspend yourself' });
      return;
    }

    // null = lift suspension; ISO string = suspend until that time
    const suspendedUntil = (req.body as { suspended_until?: string | null }).suspended_until ?? null;

    try {
      const db = await getPool();

      const target = await db.maybeOne(
        sql.type(AccountRoleSchema)`
          SELECT user_role_id FROM accounts WHERE account_id = ${targetId} AND deleted = false
        `,
      );

      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (target.user_role_id === 2 && req.userRoleId === 3) {
        res.status(403).json({ error: 'Moderators cannot suspend admins' });
        return;
      }

      await db.query(
        sql.type(z.object({}))`
          UPDATE accounts
          SET suspended_until = ${suspendedUntil ? sql.fragment`${suspendedUntil}::timestamptz` : sql.fragment`NULL`}
          WHERE account_id = ${targetId}
        `,
      );

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: suspendedUntil ? 'suspend_user' : 'unsuspend_user',
        targetType: 'account',
        targetId,
        metadata: { suspended_until: suspendedUntil },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error suspending/unsuspending user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id  (soft-delete account)
// ─────────────────────────────────────────────────────────
router.delete('/users/:id', authenticateToken, requireRole(2), async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(String(req.params.id));
  if (isNaN(targetId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  if (req.userId === targetId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  try {
    const db = await getPool();

    const target = await db.maybeOne(
      sql.type(AccountRoleSchema)`
        SELECT user_role_id FROM accounts WHERE account_id = ${targetId} AND deleted = false
      `,
    );

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Soft-delete account and all their content
    await db.query(sql.type(z.object({}))`
      UPDATE accounts SET deleted = true WHERE account_id = ${targetId}
    `);
    await db.query(sql.type(z.object({}))`
      UPDATE posts SET deleted = true, is_published = false
      WHERE account_id = ${targetId} AND deleted = false
    `);
    await db.query(sql.type(z.object({}))`
      UPDATE profiles SET deleted = true, is_published = false
      WHERE account_id = ${targetId} AND deleted = false
    `);
    await db.query(sql.type(z.object({}))`
      UPDATE collections SET deleted = true
      WHERE account_id = ${targetId} AND deleted = false
    `);
    await db.query(sql.type(z.object({}))`
      UPDATE comments SET is_deleted = true
      WHERE account_id = ${targetId} AND is_deleted = false
    `);

    await writeAuditLog({
      actorAccountId: req.userId!,
      actionType: 'delete_account',
      targetType: 'account',
      targetId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/posts/:id
// ─────────────────────────────────────────────────────────
router.delete('/posts/:id', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const postId = parseInt(String(req.params.id));
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    const post = await db.maybeOne(
      sql.type(PostExistsSchema)`
        SELECT post_id FROM posts WHERE post_id = ${postId}
      `,
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const isAdmin = req.userRoleId === 2;

    if (isAdmin) {
      await db.query(sql.type(z.object({}))`DELETE FROM posts WHERE post_id = ${postId}`);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'hard_delete_post',
        targetType: 'post',
        targetId: postId,
      });
      res.json({ success: true, action: 'hard_deleted' });
    } else {
      await db.query(sql.type(z.object({}))`
        UPDATE posts SET is_published = false, deleted = true WHERE post_id = ${postId}
      `);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'soft_delete_post',
        targetType: 'post',
        targetId: postId,
      });
      res.json({ success: true, action: 'soft_deleted' });
    }
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/posts/bulk
// ─────────────────────────────────────────────────────────
router.delete(
  '/posts/bulk',
  authenticateToken,
  requireRole(2, 3),
  [body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must be a non-empty array of up to 100')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const ids = (req.body as { ids: unknown[] }).ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      res.status(400).json({ error: 'No valid post IDs provided' });
      return;
    }

    const isAdmin = req.userRoleId === 2;

    try {
      const db = await getPool();

      if (isAdmin) {
        await db.query(sql.type(z.object({}))`
          DELETE FROM posts WHERE post_id = ANY(${sql.array(ids, 'int4')})
        `);
      } else {
        await db.query(sql.type(z.object({}))`
          UPDATE posts SET is_published = false, deleted = true
          WHERE post_id = ANY(${sql.array(ids, 'int4')}) AND deleted = false
        `);
      }

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: isAdmin ? 'bulk_hard_delete_posts' : 'bulk_soft_delete_posts',
        targetType: 'post',
        metadata: { ids },
      });

      res.json({ success: true, count: ids.length });
    } catch (err) {
      console.error('Error bulk deleting posts:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /api/admin/posts/:id/restore
// ─────────────────────────────────────────────────────────
router.post('/posts/:id/restore', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const postId = parseInt(String(req.params.id));
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    const post = await db.maybeOne(
      sql.type(PostExistsSchema)`
        SELECT post_id FROM posts WHERE post_id = ${postId} AND deleted = true
      `,
    );

    if (!post) {
      res.status(404).json({ error: 'Deleted post not found' });
      return;
    }

    await db.query(sql.type(z.object({}))`
      UPDATE posts SET deleted = false, is_published = true WHERE post_id = ${postId}
    `);

    await writeAuditLog({
      actorAccountId: req.userId!,
      actionType: 'restore_post',
      targetType: 'post',
      targetId: postId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/profiles/:id
// ─────────────────────────────────────────────────────────
router.delete('/profiles/:id', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(String(req.params.id));
  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    const profile = await db.maybeOne(
      sql.type(ProfileExistsSchema)`
        SELECT profile_id FROM profiles WHERE profile_id = ${profileId}
      `,
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const isAdmin = req.userRoleId === 2;

    if (isAdmin) {
      await db.query(sql.type(z.object({}))`DELETE FROM profiles WHERE profile_id = ${profileId}`);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'hard_delete_profile',
        targetType: 'profile',
        targetId: profileId,
      });
      res.json({ success: true, action: 'hard_deleted' });
    } else {
      await db.query(sql.type(z.object({}))`
        UPDATE profiles SET deleted = true, is_published = false WHERE profile_id = ${profileId}
      `);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'soft_delete_profile',
        targetType: 'profile',
        targetId: profileId,
      });
      res.json({ success: true, action: 'soft_deleted' });
    }
  } catch (err) {
    console.error('Error deleting profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/profiles/bulk
// ─────────────────────────────────────────────────────────
router.delete(
  '/profiles/bulk',
  authenticateToken,
  requireRole(2, 3),
  [body('ids').isArray({ min: 1, max: 100 }).withMessage('ids must be a non-empty array of up to 100')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const ids = (req.body as { ids: unknown[] }).ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      res.status(400).json({ error: 'No valid profile IDs provided' });
      return;
    }

    const isAdmin = req.userRoleId === 2;

    try {
      const db = await getPool();

      if (isAdmin) {
        await db.query(sql.type(z.object({}))`
          DELETE FROM profiles WHERE profile_id = ANY(${sql.array(ids, 'int4')})
        `);
      } else {
        await db.query(sql.type(z.object({}))`
          UPDATE profiles SET deleted = true, is_published = false
          WHERE profile_id = ANY(${sql.array(ids, 'int4')}) AND deleted = false
        `);
      }

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: isAdmin ? 'bulk_hard_delete_profiles' : 'bulk_soft_delete_profiles',
        targetType: 'profile',
        metadata: { ids },
      });

      res.json({ success: true, count: ids.length });
    } catch (err) {
      console.error('Error bulk deleting profiles:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /api/admin/profiles/:id/restore
// ─────────────────────────────────────────────────────────
router.post('/profiles/:id/restore', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const profileId = parseInt(String(req.params.id));
  if (isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid profile ID' });
    return;
  }

  try {
    const db = await getPool();

    const profile = await db.maybeOne(
      sql.type(ProfileExistsSchema)`
        SELECT profile_id FROM profiles WHERE profile_id = ${profileId} AND deleted = true
      `,
    );

    if (!profile) {
      res.status(404).json({ error: 'Deleted profile not found' });
      return;
    }

    await db.query(sql.type(z.object({}))`
      UPDATE profiles SET deleted = false, is_published = true WHERE profile_id = ${profileId}
    `);

    await writeAuditLog({
      actorAccountId: req.userId!,
      actionType: 'restore_profile',
      targetType: 'profile',
      targetId: profileId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/comments/:id
// ─────────────────────────────────────────────────────────
router.delete('/comments/:id', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const commentId = parseInt(String(req.params.id));
  if (isNaN(commentId)) {
    res.status(400).json({ error: 'Invalid comment ID' });
    return;
  }

  try {
    const db = await getPool();

    const comment = await db.maybeOne(
      sql.type(CommentExistsSchema)`
        SELECT comment_id FROM comments WHERE comment_id = ${commentId} AND is_deleted = false
      `,
    );

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Admins hard-delete; mods soft-delete
    const isAdmin = req.userRoleId === 2;

    if (isAdmin) {
      await db.query(sql.type(z.object({}))`DELETE FROM comments WHERE comment_id = ${commentId}`);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'hard_delete_comment',
        targetType: 'comment',
        targetId: commentId,
      });
      res.json({ success: true, action: 'hard_deleted' });
    } else {
      await db.query(sql.type(z.object({}))`
        UPDATE comments SET is_deleted = true WHERE comment_id = ${commentId}
      `);
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'soft_delete_comment',
        targetType: 'comment',
        targetId: commentId,
      });
      res.json({ success: true, action: 'soft_deleted' });
    }
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/deleted/posts
// ─────────────────────────────────────────────────────────
router.get(
  '/deleted/posts',
  authenticateToken,
  requireRole(2, 3),
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100);
    const offset = parseInt(String(req.query.offset ?? '0'));

    try {
      const db = await getPool();

      const posts = await db.any(
        sql.type(DeletedPostRowSchema)`
          SELECT p.post_id, p.title, p.post_type_id, a.username, p.deleted, p.created_at::text
          FROM posts p
          JOIN accounts a ON p.account_id = a.account_id
          WHERE p.deleted = true
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const countResult = await db.one(
        sql.type(CountSchema)`SELECT COUNT(*)::int as count FROM posts WHERE deleted = true`,
      );

      res.json({ posts, total: countResult.count, hasMore: offset + posts.length < countResult.count });
    } catch (err) {
      console.error('Error fetching deleted posts:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// GET /api/admin/deleted/profiles
// ─────────────────────────────────────────────────────────
router.get(
  '/deleted/profiles',
  authenticateToken,
  requireRole(2, 3),
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100);
    const offset = parseInt(String(req.query.offset ?? '0'));

    try {
      const db = await getPool();

      const profiles = await db.any(
        sql.type(DeletedProfileRowSchema)`
          SELECT pr.profile_id, pr.name, pr.profile_type_id, a.username, pr.deleted, pr.created_at::text
          FROM profiles pr
          JOIN accounts a ON pr.account_id = a.account_id
          WHERE pr.deleted = true
          ORDER BY pr.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const countResult = await db.one(
        sql.type(CountSchema)`SELECT COUNT(*)::int as count FROM profiles WHERE deleted = true`,
      );

      res.json({ profiles, total: countResult.count, hasMore: offset + profiles.length < countResult.count });
    } catch (err) {
      console.error('Error fetching deleted profiles:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// GET /api/admin/featured-posts
// ─────────────────────────────────────────────────────────
router.get('/featured-posts', authenticateToken, requireRole(2, 3), async (_req: AuthRequest, res: Response) => {
  try {
    const db = await getPool();

    const rows = await db.any(
      sql.type(FeaturedPostRowSchema)`
        SELECT fp.featured_post_id, fp.post_id, p.title, fp.display_order, fp.created_at::text
        FROM featured_posts fp
        JOIN posts p ON fp.post_id = p.post_id
        ORDER BY fp.display_order ASC, fp.created_at ASC
      `,
    );

    res.json({ featured: rows });
  } catch (err) {
    console.error('Error fetching featured posts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/featured-posts
// ─────────────────────────────────────────────────────────
router.post(
  '/featured-posts',
  authenticateToken,
  requireRole(2, 3),
  [
    body('post_id').isInt({ min: 1 }).withMessage('post_id must be a positive integer'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('display_order must be a non-negative integer'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { post_id: postId, display_order: displayOrder = 0 } = req.body as {
      post_id: number;
      display_order?: number;
    };

    try {
      const db = await getPool();

      const post = await db.maybeOne(
        sql.type(PostExistsSchema)`
          SELECT post_id FROM posts WHERE post_id = ${postId} AND deleted = false AND is_published = true
        `,
      );

      if (!post) {
        res.status(404).json({ error: 'Post not found or not published' });
        return;
      }

      const FeaturedInsertSchema = z.object({ featured_post_id: z.number() });
      const row = await db.one(
        sql.type(FeaturedInsertSchema)`
          INSERT INTO featured_posts (post_id, display_order, created_by)
          VALUES (${postId}, ${displayOrder}, ${req.userId!})
          ON CONFLICT (post_id) DO UPDATE SET display_order = EXCLUDED.display_order
          RETURNING featured_post_id
        `,
      );

      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'feature_post',
        targetType: 'post',
        targetId: postId,
        metadata: { display_order: displayOrder },
      });

      res.json({ success: true, featured_post_id: row.featured_post_id });
    } catch (err) {
      console.error('Error featuring post:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/featured-posts/:postId
// ─────────────────────────────────────────────────────────
router.delete('/featured-posts/:postId', authenticateToken, requireRole(2, 3), async (req: AuthRequest, res: Response) => {
  const postId = parseInt(String(req.params.postId));
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();

    const FeaturedExistsSchema = z.object({ featured_post_id: z.number() });
    const existing = await db.maybeOne(
      sql.type(FeaturedExistsSchema)`
        SELECT featured_post_id FROM featured_posts WHERE post_id = ${postId}
      `,
    );

    if (!existing) {
      res.status(404).json({ error: 'Post is not currently featured' });
      return;
    }

    await db.query(sql.type(z.object({}))`
      DELETE FROM featured_posts WHERE post_id = ${postId}
    `);

    await writeAuditLog({
      actorAccountId: req.userId!,
      actionType: 'unfeature_post',
      targetType: 'post',
      targetId: postId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error unfeaturing post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/audit-log
// ─────────────────────────────────────────────────────────
router.get(
  '/audit-log',
  authenticateToken,
  requireRole(2, 3),
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
    queryValidator('action_type').optional().isString().trim(),
    queryValidator('target_type').optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100);
    const offset = parseInt(String(req.query.offset ?? '0'));
    const actionType = req.query.action_type as string | undefined;
    const targetType = req.query.target_type as string | undefined;

    // Moderators only see their own entries
    const actorFilter =
      req.userRoleId === 3
        ? sql.fragment`AND al.actor_account_id = ${req.userId!}`
        : sql.fragment``;

    const actionTypeFilter = actionType
      ? sql.fragment`AND al.action_type = ${actionType}`
      : sql.fragment``;

    const targetTypeFilter = targetType
      ? sql.fragment`AND al.target_type = ${targetType}`
      : sql.fragment``;

    try {
      const db = await getPool();

      const entries = await db.any(
        sql.type(AuditLogRowSchema)`
          SELECT
            al.log_id,
            al.actor_account_id,
            a.username AS actor_username,
            al.action_type,
            al.target_type,
            al.target_id,
            al.metadata,
            al.created_at::text
          FROM audit_log al
          LEFT JOIN accounts a ON al.actor_account_id = a.account_id
          WHERE 1=1
          ${actorFilter}
          ${actionTypeFilter}
          ${targetTypeFilter}
          ORDER BY al.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const countResult = await db.one(
        sql.type(CountSchema)`
          SELECT COUNT(*)::int as count
          FROM audit_log al
          WHERE 1=1
          ${actorFilter}
          ${actionTypeFilter}
          ${targetTypeFilter}
        `,
      );

      res.json({ entries, total: countResult.count, hasMore: offset + entries.length < countResult.count });
    } catch (err) {
      console.error('Error fetching audit log:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
