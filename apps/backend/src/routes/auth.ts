import {Router, Request, Response } from 'express';
import {sql} from 'slonik';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pool from '../config/database.ts';
import {User} from '../types';

const router = Router();


//login post request
router.post('./login', async (req: Request, res: Response) => {
    const {user, password} = req.body;

    try{
        const result = await pool.query(sql'SELECT * FROM accounts WHERE email = ${user} OR username = ${user}');

        const user: User | undefined = result.rows[0];
        if (!user) return res.status(400).json({message: 'message'});

        const isValid = await argon2.verify(user.password_hash, password);
        if(!isValid) return res.status(400).json({message: 'message'});

        const token = jwt.sign(
            //not sure what to do here
            { userId: user.account_id},
            //env variable for secret key,
            { expiresIn: '1h'}
        );

        return res.json({token});
    } catch(err) {
        console.error(err);
        return res.status(500).json({message: 'msg'});
    }
});


