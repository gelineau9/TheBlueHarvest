// /apps/backend/src/index.ts

import express, { Request, Response } from 'express';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = Number(process.env.BACKEND_PORT ?? 4000);

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
