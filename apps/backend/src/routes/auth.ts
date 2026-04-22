import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { logger } from '../utils/logger.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../utils/email.js';

const router = Router();

// Signup route
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ message: 'Email, username, and password are required' });
      return;
    }

    try {
      const pool = await getPool();

      // Check for existing user
      const existing = await pool.maybeOne(
        sql.type(z.object({ exists: z.number() }))`
          SELECT 1 as exists FROM accounts WHERE email = ${email}
          OR username = ${username}
        `,
      );

      if (existing) {
        res.status(409).json({ message: 'User with that email or username already exists.' });
        return;
      }

      // Hash password
      const hashedPassword = await argon2.hash(password);

      // Create user
      const result = await pool.one(
        sql.type(z.object({ account_id: z.number(), user_role_id: z.number() }))`
          INSERT INTO accounts (email, username, hashed_password, user_role_id)
          VALUES (${email}, ${username}, ${hashedPassword}, 1)
          RETURNING account_id, user_role_id
        `,
      );

      // Fire-and-forget audit log
      writeAuditLog({
        actorAccountId: result.account_id,
        actionType: 'account_created',
        targetType: 'account',
        targetId: result.account_id,
        metadata: { username },
      });

      // Generate email verification token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await pool.query(
        sql.unsafe`
          INSERT INTO email_verification_tokens (token_hash, account_id, expires_at)
          VALUES (${tokenHash}, ${result.account_id}, NOW() + INTERVAL '24 hours')
        `,
      );

      // Send verification email — on failure, roll back the account
      try {
        await sendVerificationEmail(email, username, rawToken);
      } catch (emailErr) {
        logger.error('[signup] Failed to send verification email — rolling back account creation', {
          emailErr,
          accountId: result.account_id,
        });
        await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id = ${result.account_id}`);
        res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
        return;
      }

      res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
    } catch (err) {
      logger.error('[signup] Unexpected error during account creation', { err });
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// Verify email route
router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid or expired verification token' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const pool = await getPool();

    // Look up the token — must be unused and not expired
    const tokenRow = await pool.maybeOne(
      sql.type(
        z.object({
          account_id: z.number(),
        }),
      )`
        SELECT account_id
        FROM email_verification_tokens
        WHERE token_hash = ${tokenHash}
          AND used_at IS NULL
          AND expires_at > NOW()
      `,
    );

    if (!tokenRow) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    // Mark account as verified and consume the token in a transaction
    await pool.transaction(async (tx) => {
      await tx.query(sql.unsafe`
        UPDATE accounts
        SET email_verified_at = NOW()
        WHERE account_id = ${tokenRow.account_id}
      `);
      await tx.query(sql.unsafe`
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE token_hash = ${tokenHash}
      `);
    });

    // Fetch the account to mint a JWT
    const account = await pool.one(
      sql.type(
        z.object({
          account_id: z.number(),
          user_role_id: z.number(),
        }),
      )`
        SELECT account_id, user_role_id
        FROM accounts
        WHERE account_id = ${tokenRow.account_id}
      `,
    );

    const jwtToken = jwt.sign(
      { userId: account.account_id, roleId: account.user_role_id, jti: crypto.randomUUID() },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    res.status(200).json({ token: jwtToken, message: 'Email verified successfully.' });
  } catch (err) {
    logger.error('[verify-email] Unexpected error', { err });
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    try {
      const pool = await getPool();

      // Find user (use maybeOne to avoid throwing error if not found)
      const user = await pool.maybeOne(
        sql.type(
          z.object({
            account_id: z.number(),
            hashed_password: z.string(),
            username: z.string(),
            user_role_id: z.number(),
            is_banned: z.boolean(),
            banned_reason: z.string().nullable(),
            email_verified_at: z.string().nullable(),
          }),
        )`
          SELECT account_id, hashed_password, username, user_role_id, is_banned, banned_reason, email_verified_at
          FROM accounts
          WHERE email = ${email}
        `,
      );

      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      // Check if account is banned before verifying password
      if (user.is_banned) {
        res.status(403).json({ error: 'account_suspended', reason: user.banned_reason ?? null });
        return;
      }

      // Block login until email is verified
      if (!user.email_verified_at) {
        res.status(403).json({
          error: 'email_not_verified',
          message: 'Please verify your email before logging in.',
        });
        return;
      }

      // Verify password
      const isValid = await argon2.verify(user.hashed_password as string, password);
      if (!isValid) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      // Create JWT
      const token = jwt.sign(
        { userId: user.account_id, roleId: user.user_role_id, jti: crypto.randomUUID() },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' },
      );

      res.json({
        token,
        user: {
          id: user.account_id,
          username: user.username,
        },
      });
    } catch (err) {
      logger.error('[login] Unexpected error', { err });
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const pool = await getPool();

    const user = await pool.maybeOne(
      sql.type(
        z.object({
          account_id: z.number(),
          username: z.string(),
          email: z.string(),
          details: z.any().nullable(),
          role_name: z.string(),
        }),
      )`
        SELECT a.account_id, a.username, a.email, a.details, ur.role_name
        FROM accounts a
        JOIN user_roles ur ON a.user_role_id = ur.role_id
        WHERE a.account_id = ${req.userId!}
      `,
    );

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    res.json({
      id: user.account_id,
      username: user.username,
      email: user.email,
      details: user.details,
      role: user.role_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user account
router.put(
  '/account',
  authenticateToken,
  [body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const pool = await getPool();
      const { username, details } = req.body;

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await pool.maybeOne(
          sql.type(z.object({ account_id: z.number() }))`
            SELECT account_id FROM accounts
            WHERE username = ${username} AND account_id != ${req.userId!}
          `,
        );

        if (existingUser) {
          res.status(409).json({ message: 'Username already taken' });
          return;
        }
      }

      // Update user account
      const updateFragments = [];

      if (username) {
        updateFragments.push(sql.fragment`username = ${username}`);
      }

      if (details !== undefined) {
        updateFragments.push(sql.fragment`details = ${sql.jsonb(details)}`);
      }

      if (updateFragments.length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      const result = await pool.one(
        sql.type(
          z.object({
            account_id: z.number(),
            username: z.string(),
            email: z.string(),
            details: z.any().nullable(),
          }),
        )`
          UPDATE accounts
          SET ${sql.join(updateFragments, sql.fragment`, `)}
          WHERE account_id = ${req.userId!}
          RETURNING account_id, username, email, details
        `,
      );

      res.json({
        id: result.account_id,
        username: result.username,
        email: result.email,
        details: result.details,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// Forgot password route — sends a reset link; always returns the same response to prevent email enumeration
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please enter a valid email address.')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;

    // Generic response used in all paths to prevent email enumeration
    const genericResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    try {
      const pool = await getPool();

      const account = await pool.maybeOne(
        sql.type(
          z.object({
            account_id: z.number(),
            username: z.string(),
            is_banned: z.boolean(),
          }),
        )`
          SELECT account_id, username, is_banned
          FROM accounts
          WHERE email = ${email}
            AND deleted = false
        `,
      );

      // Unknown email or banned account — return generic response, do nothing else
      if (!account || account.is_banned) {
        res.status(200).json(genericResponse);
        return;
      }

      // Generate and store the reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await pool.query(
        sql.unsafe`
          INSERT INTO password_reset_tokens (token_hash, account_id, expires_at)
          VALUES (${tokenHash}, ${account.account_id}, NOW() + INTERVAL '1 hour')
        `,
      );

      // Best-effort email send — log failures but never leak them to the caller
      try {
        await sendPasswordResetEmail(email, account.username, rawToken);
      } catch (emailErr) {
        logger.error('[forgot-password] Failed to send password reset email', {
          emailErr,
          accountId: account.account_id,
        });
      }

      res.status(200).json(genericResponse);
    } catch (err) {
      logger.error('[forgot-password] Unexpected error', { err });
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// Logout route — revokes the token's jti so it cannot be reused
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.json({ success: true });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;

    if (!decoded?.jti || !decoded?.exp) {
      res.json({ success: true });
      return;
    }

    const pool = await getPool();
    await pool.query(sql.unsafe`
      INSERT INTO revoked_tokens (jti, expires_at)
      VALUES (${decoded.jti}, to_timestamp(${decoded.exp}))
      ON CONFLICT DO NOTHING
    `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
