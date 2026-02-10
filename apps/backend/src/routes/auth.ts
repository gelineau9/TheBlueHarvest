import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = Router();

// Helper function to get database pool
async function getPool() {
  console.log('Using database pool:', pool);
  return await pool;
}

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

    const { email, username, password, first_name, last_name } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ message: 'Email, username, and password are required' });
      return;
    }

    try {
      const pool = await getPool();

      // Check for existing user
      // TODO: Add types so we can remove unsafe
      const existing = await pool.maybeOne(sql.unsafe`
        SELECT 1 FROM accounts WHERE email = ${email}
        OR username = ${username}
      `);

      if (existing) {
        res.status(409).json({ message: 'User with that email or username already exists.' });
        return;
      }

      // Hash password
      const hashedPassword = await argon2.hash(password);

      // Create user (convert undefined to null for optional fields)
      // TODO: Add types so we can remove unsafe
      const result = await pool.one(sql.unsafe`
        INSERT INTO accounts (email, username, hashed_password, first_name, last_name, user_role_id)
        VALUES (${email}, ${username}, ${hashedPassword}, ${first_name ?? null}, ${last_name ?? null}, 1)
        RETURNING account_id
      `);

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
      // TODO: Add types so we can remove unsafe
      const user = await pool.maybeOne(sql.unsafe`
      SELECT account_id, hashed_password, username, first_name, last_name
      FROM accounts
      WHERE email = ${email}
    `);

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
          firstName: user.first_name,
          lastName: user.last_name,
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

    // TODO: Add types so we can remove unsafe
    const user = await pool.maybeOne(sql.unsafe`
      SELECT account_id, username, first_name, last_name, email
      FROM accounts
      WHERE account_id = ${decoded.userId}
    `);

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    res.json({
      id: user.account_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
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

// Update user profile
router.put(
  '/profile',
  [
    body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required.'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required.'),
  ],
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

      const { username, firstName, lastName } = req.body;

      // Check if username is already taken by another user
      if (username) {
        // TODO: Add types so we can remove unsafe
        const existingUser = await pool.maybeOne(sql.unsafe`
        SELECT account_id FROM accounts
        WHERE username = ${username} AND account_id != ${decoded.userId}
      `);

        if (existingUser) {
          res.status(409).json({ message: 'Username already taken' });
          return;
        }
      }

      // Update user profile
      const updateFragments = [];

      if (username) {
        updateFragments.push(sql.fragment`username = ${username}`);
      }
      if (firstName) {
        updateFragments.push(sql.fragment`first_name = ${firstName}`);
      }
      if (lastName) {
        updateFragments.push(sql.fragment`last_name = ${lastName}`);
      }

      if (updateFragments.length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      // TODO: Add types so we can remove unsafe
      const result = await pool.one(sql.unsafe`
      UPDATE accounts
      SET ${sql.join(updateFragments, sql.fragment`, `)}
      WHERE account_id = ${decoded.userId}
      RETURNING account_id, username, first_name, last_name, email
    `);

      res.json({
        id: result.account_id,
        username: result.username,
        firstName: result.first_name,
        lastName: result.last_name,
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
