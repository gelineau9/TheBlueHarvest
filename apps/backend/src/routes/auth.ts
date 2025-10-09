import {Router, Request, Response } from 'express';
import {sql, createPool} from 'slonik';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const router = Router();

// Helper function to get database pool
async function getPool() {
  return await createPool(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
}

// Signup route
router.post('/signup', [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address.'),
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long.'),
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
      const existing = await pool.one(sql.unsafe`
        SELECT 1 FROM accounts WHERE email = ${email}
        OR username = ${username}
      `);

      if (existing) {
        res.status(409).json({ message: 'User with that email or username already exists.' });
        return;
      }

      // Hash password
      const hashedPassword = await argon2.hash(password);

      // Create user
      const result = await pool.one(sql.unsafe`
        INSERT INTO accounts (email, username, hashed_password, first_name, last_name, user_role_id)
        VALUES (${email}, ${username}, ${hashedPassword}, ${first_name}, ${last_name}, 1)
        RETURNING account_id
      `);

      // Create JWT
      const token = jwt.sign(
        { userId: result.account_id },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      res.status(201).json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Login route
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),
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

    // Find user
    const user = await pool.one(sql.unsafe`
      SELECT account_id, hashed_password, username, first_name, last_name
      FROM accounts
      WHERE email = ${email}
    `);

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Verify password (temporary simple check for testing)
    const isValid = user.hashed_password === password;
    if (!isValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Create JWT
    const token = jwt.sign(
      { userId: user.account_id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.account_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

    const user = await pool.one(sql.unsafe`
      SELECT account_id, username, first_name, last_name
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
      lastName: user.last_name
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
