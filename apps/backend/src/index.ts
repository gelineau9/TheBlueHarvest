// /apps/backend/src/index.ts

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

//Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the BHA Backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connection: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
