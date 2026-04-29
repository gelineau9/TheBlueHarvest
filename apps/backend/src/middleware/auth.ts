import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

export interface AuthRequest extends Request {
  userId?: number;
  userRoleId?: number;
}

// Optional auth - sets req.userId and req.userRoleId if valid token exists, but doesn't reject if missing/invalid
export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; roleId: number };
      req.userId = decoded.userId;
      req.userRoleId = decoded.roleId;
    }
  } catch {
    // Token invalid or expired - continue without userId
  }
  next();
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; roleId: number; jti?: string };
    req.userId = decoded.userId;
    req.userRoleId = decoded.roleId;

    // Check if the account is banned on every authenticated request
    const pool = await getPool();
    const account = await pool.maybeOne(
      sql.type(z.object({ is_banned: z.boolean(), suspended_until: z.string().nullable() }))`
        SELECT is_banned, suspended_until
        FROM accounts
        WHERE account_id = ${req.userId}
      `,
    );

    if (account?.is_banned) {
      res.status(401).json({ error: 'account_suspended' });
      return;
    }

    if (account?.suspended_until && new Date(account.suspended_until) > new Date()) {
      res.status(403).json({ error: 'account_suspended' });
      return;
    }

    // Check token blocklist (only for tokens that carry a jti — older tokens without one are allowed through)
    if (decoded.jti) {
      const revoked = await pool.maybeOne(
        sql.type(z.object({ jti: z.string() }))`
          SELECT jti FROM revoked_tokens WHERE jti = ${decoded.jti}
        `,
      );
      if (revoked) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Usage: router.get('/admin/users', authenticateToken, requireRole(2), handler)
// roleIds: 1=user, 2=admin, 3=moderator
export const requireRole =
  (...allowedRoleIds: number[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRoleId === undefined || !allowedRoleIds.includes(req.userRoleId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
