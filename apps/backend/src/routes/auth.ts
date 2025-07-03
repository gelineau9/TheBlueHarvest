import {Router, Request, Response } from 'express';
import {sql} from 'slonik';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { body, validationResult } from 'express-validator';

const router = Router();

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
  ]
  , async (req: Request, res: Response) => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
  const { email, username, password, first_name, last_name } = req.body;

  if (!email || !username || !password) {
    res.status(400).json({ message: 'Email, username, and password are required.' });
    return;
  }

  try {
    //search for existing user
    const existing = await pool.one(sql`
      SELECT 1 FROM accounts WHERE email = ${email} 
      OR username = ${username}`
    );
    //verify existence of user
    if (existing.rowCount > 0) {
      res.status(409).json({ message: 'User with that email or username already exists.' });
      return;
    }
    //hash password
    const hashedPassword = await argon2.hash(password);
    //create user
    const result = await pool.one(sql`
      INSERT INTO accounts (email, username, hashed_password, first_name, last_name)
      VALUES (${email}, ${username}, ${hashedPassword}, ${first_name}, ${last_name})
      RETURNING account_id
    `);
    //extracts userId for making JWT
    const userId = result.rows[0].account_id;

    // create JWT
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
});
//login post request
// router.post('/login', async (req: Request, res: Response) => {
//     const {user, password} = req.body;

//     try{
//         const result = await pool.query(sql`SELECT * FROM accounts WHERE email = ${user} OR username = ${user}`);

//         const user: User | undefined = result.rows[0];
//         if (!user){
//           res.status(400).json({message: 'message'});
//           return;
//         }

//         const isValid = await argon2.verify(user.password_hash, password);
//         if(!isValid){
//           res.status(400).json({message: 'message'});
//           return;
//         } 

//         const token = jwt.sign(
//             { userId: user.account_id },
//             process.env.JWT_SECRET!,
//             { expiresIn: '1h' }
//     );

//         res.json({token});
//         return;
//     } catch(err) {
//         console.error(err);
//         res.status(500).json({message: 'msg'});
//         return;
//     }
// });


