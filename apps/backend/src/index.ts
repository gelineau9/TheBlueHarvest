// /apps/backend/src/index.ts
import express, { Request, Response } from 'express';
import authRoutes from './routes/auth.js';
import profilesRoutes from './routes/profiles.js';
import postsRoutes from './routes/posts.js';
import collectionsRoutes from './routes/collections.js';
import collectionPostsRoutes from './routes/collectionPosts.js';
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

//Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the BHA Backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connection: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
