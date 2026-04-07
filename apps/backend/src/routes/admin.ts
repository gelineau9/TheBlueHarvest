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
const AccountRoleSchema = z.object({ user_role_id: z.number() });

// ─────────────────────────────────────────────────────────
// 3a. GET /api/admin/users
// ─────────────────────────────────────────────────────────
router.get(
  '/users',
  authenticateToken,
  requireRole(2, 3),
  [
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
    queryValidator('search').optional().isString().trim(),
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

    try {
      const db = await getPool();

      const searchFilter = search
        ? sql.fragment`AND a.username ILIKE ${'%' + search + '%'}`
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
            a.created_at::text
          FROM accounts a
          JOIN user_roles ur ON a.user_role_id = ur.role_id
          WHERE a.deleted = false
          ${searchFilter}
          ORDER BY a.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const countResult = await db.one(
        sql.type(CountSchema)`
          SELECT COUNT(*)::int as count
          FROM accounts a
          WHERE a.deleted = false
          ${searchFilter}
        `,
      );

      const total = countResult.count;

      res.json({ users, total, hasMore: offset + users.length < total });
    } catch (err) {
      console.error('Error fetching admin users:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─────────────────────────────────────────────────────────
// 3b. PUT /api/admin/users/:id/role
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
// 3c. PUT /api/admin/users/:id/ban
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

      // Moderators cannot ban admins
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
// 3d. DELETE /api/admin/posts/:id
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
      await db.query(
        sql.type(z.object({}))`DELETE FROM posts WHERE post_id = ${postId}`,
      );
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'hard_delete_post',
        targetType: 'post',
        targetId: postId,
      });
      res.json({ success: true, action: 'hard_deleted' });
    } else {
      await db.query(
        sql.type(z.object({}))`
          UPDATE posts SET is_published = false, deleted = true WHERE post_id = ${postId}
        `,
      );
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
// 3e. DELETE /api/admin/profiles/:id
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
      await db.query(
        sql.type(z.object({}))`DELETE FROM profiles WHERE profile_id = ${profileId}`,
      );
      await writeAuditLog({
        actorAccountId: req.userId!,
        actionType: 'hard_delete_profile',
        targetType: 'profile',
        targetId: profileId,
      });
      res.json({ success: true, action: 'hard_deleted' });
    } else {
      await db.query(
        sql.type(z.object({}))`
          UPDATE profiles SET deleted = true WHERE profile_id = ${profileId}
        `,
      );
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
// 3f. GET /api/admin/audit-log
// ─────────────────────────────────────────────────────────
router.get(
  '/audit-log',
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

    // Moderators only see their own entries
    const actorFilter =
      req.userRoleId === 3
        ? sql.fragment`AND al.actor_account_id = ${req.userId!}`
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
        `,
      );

      const total = countResult.count;

      res.json({ entries, total, hasMore: offset + entries.length < total });
    } catch (err) {
      console.error('Error fetching audit log:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
