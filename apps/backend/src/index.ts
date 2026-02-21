// /apps/backend/src/index.ts
import express, { Request, Response } from 'express';
import path from 'path';
import authRoutes from './routes/auth.js';
import profilesRoutes from './routes/profiles.js';
import postsRoutes from './routes/posts.js';
import collectionsRoutes from './routes/collections.js';
import collectionPostsRoutes from './routes/collectionPosts.js';
import uploadsRoutes from './routes/uploads.js';
import catalogRoutes from './routes/catalog.js';
import commentsRoutes from './routes/comments.js';
import {
  profileEditorRoutes,
  postEditorRoutes,
  collectionEditorRoutes,
  postAuthorRoutes,
  collectionAuthorRoutes,
} from './routes/editors.js';

const app = express();
const PORT = Number(process.env.BACKEND_PORT ?? 4000);

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/profiles', profileEditorRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts', postEditorRoutes);
app.use('/api/posts', postAuthorRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/collections', collectionPostsRoutes);
app.use('/api/collections', collectionEditorRoutes);
app.use('/api/collections', collectionAuthorRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/posts', commentsRoutes);

//Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the BHA Backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connection: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
