import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

export interface AuthRequest extends Request {
  userId?: number;
  userRoleId?: number;
}

interface DecodedToken {
  userId: number;
  roleId: number;
  jti?: string;
  iat?: number;
}

type TokenStatus = 'valid' | 'banned' | 'suspended' | 'revoked';

// Shared account/token validation used by both middlewares: bans, suspensions,
// password-reset revocation (tokens_valid_after), and the jti blocklist.
async function checkAccountToken(decoded: DecodedToken): Promise<TokenStatus> {
  const pool = await getPool();

  // Slonik's default type parser returns timestamptz columns as epoch ms numbers
  const account = await pool.maybeOne(
    sql.type(
      z.object({
        is_banned: z.boolean(),
        suspended_until: z.number().nullable(),
        tokens_valid_after: z.number().nullable(),
      }),
    )`
      SELECT is_banned, suspended_until, tokens_valid_after
      FROM accounts
      WHERE account_id = ${decoded.userId}
    `,
  );

  if (account?.is_banned) return 'banned';
  if (account?.suspended_until && account.suspended_until > Date.now()) return 'suspended';

  // Tokens issued before a password reset are revoked
  if (account?.tokens_valid_after && decoded.iat !== undefined && decoded.iat * 1000 < account.tokens_valid_after) {
    return 'revoked';
  }

  // Token blocklist (only for tokens that carry a jti — older tokens without one are allowed through)
  if (decoded.jti) {
    const revoked = await pool.maybeOne(
      sql.type(z.object({ jti: z.string() }))`
        SELECT jti FROM revoked_tokens WHERE jti = ${decoded.jti}
      `,
    );
    if (revoked) return 'revoked';
  }

  return 'valid';
}

// Optional auth - sets req.userId and req.userRoleId if a valid, non-revoked
// token from an account in good standing exists; continues anonymously otherwise
export const optionalAuthenticateToken = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
      const status = await checkAccountToken(decoded);
      if (status === 'valid') {
        req.userId = decoded.userId;
        req.userRoleId = decoded.roleId;
      }
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    req.userId = decoded.userId;
    req.userRoleId = decoded.roleId;

    const status = await checkAccountToken(decoded);

    if (status === 'banned') {
      res.status(401).json({ error: 'account_suspended' });
      return;
    }
    if (status === 'suspended') {
      res.status(403).json({ error: 'account_suspended' });
      return;
    }
    if (status === 'revoked') {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
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
