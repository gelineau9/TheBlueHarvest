import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from 'slonik';
import { z } from 'zod';
import { getPool } from '../config/database.js';

export interface AuthRequest extends Request {
  userId?: number;
  /** Role names held by the account, resolved from the database on every request. */
  userRoles?: string[];
}

interface DecodedToken {
  userId: number;
  jti?: string;
  iat?: number;
}

type TokenStatus = 'valid' | 'banned' | 'suspended' | 'revoked';

interface AccountCheck {
  status: TokenStatus;
  roles: string[];
}

// Shared account/token validation used by both middlewares: bans, suspensions,
// password-reset revocation (tokens_valid_after), and the jti blocklist.
//
// Roles are resolved here rather than read from the JWT so that granting or
// revoking a role takes effect on the next request instead of whenever the
// token happens to expire. An account with no account_roles rows is an
// ordinary user — baseline permissions are implied, not stored.
async function checkAccountToken(decoded: DecodedToken): Promise<AccountCheck> {
  const pool = await getPool();

  // Slonik's default type parser returns timestamptz columns as epoch ms numbers.
  // Roles come back as a comma-joined string to avoid depending on array parsing.
  const account = await pool.maybeOne(
    sql.type(
      z.object({
        is_banned: z.boolean(),
        suspended_until: z.number().nullable(),
        tokens_valid_after: z.number().nullable(),
        roles: z.string().nullable(),
      }),
    )`
      SELECT a.is_banned,
             a.suspended_until,
             a.tokens_valid_after,
             string_agg(ur.role_name, ',') AS roles
      FROM accounts a
      LEFT JOIN account_roles ar ON ar.account_id = a.account_id
      LEFT JOIN user_roles    ur ON ur.role_id    = ar.role_id
      WHERE a.account_id = ${decoded.userId}
      GROUP BY a.account_id, a.is_banned, a.suspended_until, a.tokens_valid_after
    `,
  );

  const roles = account?.roles ? account.roles.split(',') : [];

  if (account?.is_banned) return { status: 'banned', roles };
  if (account?.suspended_until && account.suspended_until > Date.now()) return { status: 'suspended', roles };

  // Tokens issued before a password reset are revoked
  if (account?.tokens_valid_after && decoded.iat !== undefined && decoded.iat * 1000 < account.tokens_valid_after) {
    return { status: 'revoked', roles };
  }

  // Token blocklist (only for tokens that carry a jti — older tokens without one are allowed through)
  if (decoded.jti) {
    const revoked = await pool.maybeOne(
      sql.type(z.object({ jti: z.string() }))`
        SELECT jti FROM revoked_tokens WHERE jti = ${decoded.jti}
      `,
    );
    if (revoked) return { status: 'revoked', roles };
  }

  return { status: 'valid', roles };
}

// Optional auth - sets req.userId and req.userRoles if a valid, non-revoked
// token from an account in good standing exists; continues anonymously otherwise
export const optionalAuthenticateToken = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
      const { status, roles } = await checkAccountToken(decoded);
      if (status === 'valid') {
        req.userId = decoded.userId;
        req.userRoles = roles;
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

    const { status, roles } = await checkAccountToken(decoded);
    req.userRoles = roles;

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

/** True if the request's account holds the named role. */
export const hasRole = (req: AuthRequest, role: string): boolean => req.userRoles?.includes(role) ?? false;

// Usage: router.get('/admin/users', authenticateToken, requireAnyRole('admin', 'moderator'), handler)
export const requireAnyRole =
  (...allowedRoles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRoles?.some((role) => allowedRoles.includes(role))) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
