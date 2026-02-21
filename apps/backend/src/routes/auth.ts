import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';

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
        sql.type(z.object({ account_id: z.number() }))`
          INSERT INTO accounts (email, username, hashed_password, user_role_id)
          VALUES (${email}, ${username}, ${hashedPassword}, 1)
          RETURNING account_id
        `,
      );

      // Create JWT
      const token = jwt.sign({ userId: result.account_id }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      res.status(201).json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

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
          }),
        )`
          SELECT account_id, hashed_password, username
          FROM accounts
          WHERE email = ${email}
        `,
      );

      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isValid = await argon2.verify(user.hashed_password as string, password);
      if (!isValid) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      // Create JWT
      const token = jwt.sign({ userId: user.account_id }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      res.json({
        token,
        user: {
          id: user.account_id,
          username: user.username,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const pool = await getPool();

    // Get current user
    const user = await pool.maybeOne(
      sql.type(
        z.object({
          account_id: z.number(),
          username: z.string(),
          email: z.string(),
        }),
      )`
        SELECT account_id, username, email
        FROM accounts
        WHERE account_id = ${decoded.userId}
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
    });
  } catch (err) {
    console.error(err);
    // Distinguish between expired and invalid tokens
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    res.status(401).json({ message: 'Authentication failed' });
  }
});

// Update user account
router.put(
  '/account',
  [body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
      const pool = await getPool();

      const { username } = req.body;

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await pool.maybeOne(
          sql.type(z.object({ account_id: z.number() }))`
            SELECT account_id FROM accounts
            WHERE username = ${username} AND account_id != ${decoded.userId}
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

      if (updateFragments.length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      // Update user account
      const result = await pool.one(
        sql.type(
          z.object({
            account_id: z.number(),
            username: z.string(),
            email: z.string(),
          }),
        )`
          UPDATE accounts
          SET ${sql.join(updateFragments, sql.fragment`, `)}
          WHERE account_id = ${decoded.userId}
          RETURNING account_id, username, email
        `,
      );

      res.json({
        id: result.account_id,
        username: result.username,
        email: result.email,
      });
    } catch (err) {
      console.error(err);
      // Distinguish between expired and invalid tokens
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ message: 'Token expired' });
        return;
      }
      if (err instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;
