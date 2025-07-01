import {Router, Request, Response } from 'express';
import {sql} from 'slonik';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pool from '../config/database.ts';
import {User} from '../types';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  const { email, username, password, first_name, last_name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Email, username, and password are required.' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query(sql`
      SELECT 1 FROM accounts WHERE email = ${email} OR username = ${username}
    `);

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'User with that email or username already exists.' });
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Insert new user
    const result = await pool.query(sql`
      INSERT INTO accounts (email, username, hashed_password, first_name, last_name)
      VALUES (${email}, ${username}, ${hashedPassword}, ${first_name}, ${last_name})
      RETURNING account_id
    `);

    const userId = result.rows[0].account_id;

    // Issue JWT
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
//login post request
router.post('/login', async (req: Request, res: Response) => {
    const {user, password} = req.body;

    try{
        const result = await pool.query(sql'SELECT * FROM accounts WHERE email = ${user} OR username = ${user}');

        const user: User | undefined = result.rows[0];
        if (!user) return res.status(400).json({message: 'message'});

        const isValid = await argon2.verify(user.password_hash, password);
        if(!isValid) return res.status(400).json({message: 'message'});

        const token = jwt.sign(
            { userId: user.account_id },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
    );

        return res.json({token});
    } catch(err) {
        console.error(err);
        return res.status(500).json({message: 'msg'});
    }
});


