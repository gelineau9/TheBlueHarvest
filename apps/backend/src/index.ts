import express, { Request, Response } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.js';
import profilesRoutes from './routes/profiles.js';
import postsRoutes from './routes/posts.js';
import collectionsRoutes from './routes/collections.js';
import collectionPostsRoutes from './routes/collectionPosts.js';
import uploadsRoutes from './routes/uploads.js';
import archiveRoutes from './routes/archive.js';
import commentsRoutes from './routes/comments.js';
import usersRoutes from './routes/users.js';
import featuredProfilesRoutes from './routes/featuredProfiles.js';
import relationshipsRoutes from './routes/relationships.js';
import likesRoutes from './routes/likes.js';
import followsRouter from './routes/follows.js';
import activityRouter from './routes/activity.js';
import adminRouter from './routes/admin.js';
import spotlightRouter from './routes/spotlight.js';
import {
  profileEditorRoutes,
  postEditorRoutes,
  collectionEditorRoutes,
  postAuthorRoutes,
  collectionAuthorRoutes,
} from './routes/editors.js';
import { errorHandler } from './middleware/error.js';
import { logger } from './utils/logger.js';
import { getPool, testConnection } from './config/database.js';

// ─────────────────────────────────────────────────────────
// Startup: validate required environment variables
// ─────────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DB_USER',
  'DB_PASSWORD',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'BACKEND_URL',
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET!.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.BACKEND_PORT ?? 4000);

// Render terminates TLS at its proxy and sets X-Forwarded-For; trust that
// single hop so req.ip resolves to the immediate caller instead of the proxy.
app.set('trust proxy', 1);

// Security headers — must be the first middleware
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (curl, mobile clients, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not in allowlist`));
    },
    credentials: true,
  }),
);

// Body parsing — 50 kb limit prevents oversized JSON payloads
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─────────────────────────────────────────────────────────
// Rate limiting
//
// All browser traffic reaches this API through the Next.js frontend on
// Vercel, so req.ip is a shared Vercel egress IP — never the real client.
// Limiters therefore key on the authenticated account (or, for credential
// endpoints, the targeted email) and only fall back to IP for anonymous
// or direct traffic.
// ─────────────────────────────────────────────────────────

const ipFallbackKey = (req: Request): string => ipKeyGenerator(req.ip ?? '');

// Key by account when the request carries a valid JWT
const accountOrIpKey = (req: Request): string => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
      return `account:${decoded.userId}`;
    } catch {
      // Invalid token — fall back to IP
    }
  }
  return ipFallbackKey(req);
};

// Key by the targeted email so brute force against one account is limited
// regardless of source IP, and one shared proxy IP can't lock out everyone
const emailOrIpKey = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `email:${email}` : ipFallbackKey(req);
};

// Stricter limit on credential endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
  message: { error: 'Too many requests, please try again later.' },
});

// General API limit — per account; anonymous traffic shares proxy-IP buckets
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountOrIpKey,
});

// Tight limit on file uploads — prevents storage exhaustion
// 20 uploads per 15 minutes per account
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountOrIpKey,
  message: { error: 'Too many uploads, please try again later.' },
});

// ─────────────────────────────────────────────────────────
// Static file serving
// ─────────────────────────────────────────────────────────
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    dotfiles: 'deny',
    setHeaders: (res) => {
      // Uploaded files are content-addressed (timestamp + random suffix),
      // so they're safe to cache aggressively.
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

// ─────────────────────────────────────────────────────────
// Health check — no auth, no rate limiting, first in chain
// ─────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─────────────────────────────────────────────────────────
// Apply rate limiters before route handlers
// ─────────────────────────────────────────────────────────

// Only the brute-forceable credential endpoints get the strict limiter;
// authenticated auth routes (/me, /logout, /account) fall under apiLimiter.
app.use(
  [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
  ],
  authLimiter,
);
app.use('/api/uploads', uploadLimiter);
app.use('/api', apiLimiter);

// ─────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────
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
app.use('/api/archive', archiveRoutes);
app.use('/api/posts', commentsRoutes);
app.use('/api/posts', featuredProfilesRoutes);
app.use('/api/profiles', relationshipsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/follows', followsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/spotlight', spotlightRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the BHA Backend!' });
});

// Global error handler — must be registered after all routes
app.use(errorHandler);

// ─────────────────────────────────────────────────────────
// Startup: verify DB, then bind HTTP server
// ─────────────────────────────────────────────────────────
async function start() {
  try {
    logger.info('Verifying database connectivity...');
    await testConnection();
    logger.info('Database connection verified.');
  } catch (err) {
    logger.error({ message: 'FATAL: Cannot connect to database at startup', error: err });
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // ─────────────────────────────────────────────────────────
  // Graceful shutdown
  // ─────────────────────────────────────────────────────────
  async function shutdown(signal: string) {
    logger.info(`Received ${signal} — shutting down gracefully...`);

    // Stop accepting new connections; wait for in-flight requests to finish
    server.close(async () => {
      try {
        const pool = await getPool();
        await pool.end();
        logger.info('Database pool closed. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error({ message: 'Error closing database pool during shutdown', error: err });
        process.exit(1);
      }
    });

    // Force exit if connections don't drain within 10 s
    setTimeout(() => {
      logger.error('Forced shutdown: connections did not drain within 10 s');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
