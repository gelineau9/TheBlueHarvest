# Security & Scalability - The Blue Harvest

## Table of Contents
1. [Security Strategy](#security-strategy)
2. [Scalability Architecture](#scalability-architecture)
3. [Performance Optimization](#performance-optimization)

---

# Security Strategy

## Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                  Layer 1: Network Security                   │
│  - WAF (AWS WAF)                                            │
│  - DDoS protection (CloudFlare/AWS Shield)                  │
│  - VPC with private subnets                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Layer 2: Application Security                   │
│  - HTTPS only (TLS 1.3)                                     │
│  - Security headers (Helmet.js)                             │
│  - Rate limiting                                            │
│  - CORS configuration                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            Layer 3: Authentication & Authorization           │
│  - JWT with short expiry                                    │
│  - Refresh token rotation                                   │
│  - RBAC (Role-Based Access Control)                         │
│  - Session management                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                Layer 4: Input Validation                     │
│  - Zod schema validation                                    │
│  - SQL injection prevention (Slonik parameterized queries)  │
│  - XSS prevention (sanitization)                            │
│  - CSRF tokens                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Layer 5: Data Security                      │
│  - Encryption at rest (AWS RDS encryption)                  │
│  - Encryption in transit (TLS)                              │
│  - Password hashing (Argon2id)                              │
│  - Sensitive data masking in logs                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Layer 6: Monitoring & Auditing                  │
│  - Audit logs for sensitive operations                      │
│  - Intrusion detection                                      │
│  - Security alerts                                          │
│  - Compliance monitoring                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication & Authorization

### JWT Strategy

**Access Token**:
- Expiry: 15 minutes
- Payload: `{ accountId, username, roleId }`
- Storage: Memory (not localStorage)
- Algorithm: RS256 (asymmetric)

**Refresh Token**:
- Expiry: 7 days
- Storage: HTTP-only, Secure, SameSite cookie
- Rotation: New refresh token on each use
- Revocation: Token family tracking

**Implementation**:
```typescript
// services/auth/TokenService.ts
import jwt from 'jsonwebtoken';
import fs from 'fs';

export class TokenService {
  private accessTokenPrivateKey: Buffer;
  private accessTokenPublicKey: Buffer;
  private refreshTokenSecret: string;

  constructor() {
    // Use asymmetric keys for access tokens (more secure)
    this.accessTokenPrivateKey = fs.readFileSync(
      process.env.ACCESS_TOKEN_PRIVATE_KEY_PATH!
    );
    this.accessTokenPublicKey = fs.readFileSync(
      process.env.ACCESS_TOKEN_PUBLIC_KEY_PATH!
    );
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenPrivateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'blue-harvest',
      audience: 'blue-harvest-api',
      subject: String(payload.accountId)
    });
  }

  generateRefreshToken(accountId: number, tokenFamily: string): string {
    return jwt.sign(
      { accountId, tokenFamily },
      this.refreshTokenSecret,
      {
        algorithm: 'HS256',
        expiresIn: '7d',
        issuer: 'blue-harvest'
      }
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessTokenPublicKey, {
      algorithms: ['RS256'],
      issuer: 'blue-harvest',
      audience: 'blue-harvest-api'
    }) as TokenPayload;
  }

  // Refresh token rotation with family tracking
  async rotateRefreshToken(
    oldToken: string,
    refreshTokenRepo: RefreshTokenRepository
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = jwt.verify(oldToken, this.refreshTokenSecret) as {
      accountId: number;
      tokenFamily: string;
    };

    // Check if token was already used (potential attack)
    const wasUsed = await refreshTokenRepo.isTokenUsed(oldToken);
    if (wasUsed) {
      // Token reuse detected - revoke entire family
      await refreshTokenRepo.revokeFamily(payload.tokenFamily);
      throw new SecurityError('Token reuse detected');
    }

    // Mark token as used
    await refreshTokenRepo.markAsUsed(oldToken);

    // Generate new tokens
    const accessToken = this.generateAccessToken({
      accountId: payload.accountId,
      username: '', // fetch from DB
      roleId: 0 // fetch from DB
    });

    const refreshToken = this.generateRefreshToken(
      payload.accountId,
      payload.tokenFamily
    );

    return { accessToken, refreshToken };
  }
}
```

---

### Role-Based Access Control (RBAC)

**Roles**:
- `user` (default) - Basic access
- `moderator` - Content moderation
- `admin` - Full access

**Permission Matrix**:

| Resource | User | Moderator | Admin |
|----------|------|-----------|-------|
| Own account | RUD | RUD | CRUD |
| Others' accounts | R | R | CRUD |
| Own profiles | CRUD | CRUD | CRUD |
| Others' profiles | R | RUD | CRUD |
| Posts | CRUD (own) | CRUD (all) | CRUD (all) |
| Comments | CRUD (own) | CRUD (all) | CRUD (all) |
| Reports | C | RU | CRUD |
| System settings | - | - | CRUD |

**Middleware Implementation**:
```typescript
// middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../types/errors';

type Permission = 'create' | 'read' | 'update' | 'delete';
type Resource = 'account' | 'profile' | 'post' | 'comment' | 'report';

const permissionMatrix: Record<number, Record<Resource, Permission[]>> = {
  1: { // User role
    account: ['read', 'update', 'delete'], // own only
    profile: ['create', 'read', 'update', 'delete'], // own only
    post: ['create', 'read', 'update', 'delete'], // own only
    comment: ['create', 'read', 'update', 'delete'], // own only
    report: ['create']
  },
  2: { // Admin role
    account: ['create', 'read', 'update', 'delete'],
    profile: ['create', 'read', 'update', 'delete'],
    post: ['create', 'read', 'update', 'delete'],
    comment: ['create', 'read', 'update', 'delete'],
    report: ['create', 'read', 'update', 'delete']
  },
  3: { // Moderator role
    account: ['read'],
    profile: ['read', 'update', 'delete'],
    post: ['read', 'update', 'delete'],
    comment: ['read', 'update', 'delete'],
    report: ['read', 'update']
  }
};

export function requirePermission(
  resource: Resource,
  permission: Permission,
  checkOwnership: (req: Request, resourceId: number) => Promise<boolean> = async () => true
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!; // Set by auth middleware
    const rolePermissions = permissionMatrix[user.roleId][resource];

    if (!rolePermissions.includes(permission)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // For user role, check ownership
    if (user.roleId === 1 && permission !== 'create') {
      const resourceId = Number(req.params.id);
      const isOwner = await checkOwnership(req, resourceId);

      if (!isOwner) {
        throw new ForbiddenError('You can only access your own resources');
      }
    }

    next();
  };
}

// Usage in routes
router.delete(
  '/posts/:id',
  authMiddleware,
  requirePermission('post', 'delete', async (req, resourceId) => {
    const post = await postRepo.findById(resourceId);
    return post?.account_id === req.user!.accountId;
  }),
  postController.delete
);
```

---

## 2. Input Validation & Sanitization

### Zod Schema Validation

**Comprehensive Validation**:
```typescript
// types/dtos/auth/SignupDto.ts
import { z } from 'zod';

export const SignupDtoSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'
    ),

  email: z
    .string()
    .email('Invalid email format')
    .max(100, 'Email must be at most 100 characters')
    .toLowerCase()
    .transform((email) => email.trim()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters')
    .transform((name) => name.trim())
    .optional(),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters')
    .transform((name) => name.trim())
    .optional()
});

// Refinements for complex validation
export const CreatePostDtoSchema = z.object({
  content: z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(10).max(50000)
  }),
  postTypeId: z.number().int().positive(),
  coAuthors: z.array(z.number().int().positive()).optional()
}).refine(
  (data) => {
    // Custom validation: event posts must have date field
    if (data.postTypeId === 4) { // event type
      return 'eventDate' in data.content;
    }
    return true;
  },
  { message: 'Event posts must include eventDate' }
);
```

### XSS Prevention

**Content Sanitization**:
```typescript
// utils/sanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror']
  });
}

// Use in service layer
export class PostService {
  async createPost(dto: CreatePostDto): Promise<Post> {
    // Sanitize HTML content
    const sanitizedContent = {
      ...dto.content,
      body: sanitizeHtml(dto.content.body)
    };

    return this.postRepo.create({
      ...dto,
      content: sanitizedContent
    });
  }
}
```

### SQL Injection Prevention

**Already handled by Slonik parameterized queries**, but enforce:

```typescript
// ❌ NEVER do this
const unsafeQuery = `SELECT * FROM accounts WHERE email = '${email}'`;

// ✅ ALWAYS use parameterized queries
const safeQuery = sql`SELECT * FROM accounts WHERE email = ${email}`;

// ✅ Use sql.identifier for dynamic table/column names
const tableName = 'accounts';
const query = sql`SELECT * FROM ${sql.identifier([tableName])}`;
```

---

## 3. Rate Limiting

### Multi-tier Rate Limiting

**Global Rate Limit**:
```typescript
// middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../database/redis';

// Global limiter: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  message: 'Too many requests, please try again later'
});

// Auth endpoints: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  message: 'Too many authentication attempts, please try again later'
});

// Write operations: 20 per minute
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:write:'
  }),
  message: 'Too many requests, please slow down'
});

// Usage
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.post('/api/posts', authMiddleware, writeLimiter, postController.create);
```

### Advanced Rate Limiting

**User-specific limits based on role**:
```typescript
export function createRoleBasedLimiter(limits: Record<number, number>) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: (req) => {
      const user = req.user;
      if (!user) return limits[1]; // Default user limit
      return limits[user.roleId] || limits[1];
    },
    keyGenerator: (req) => {
      return req.user?.accountId.toString() || req.ip;
    },
    store: new RedisStore({
      client: redis,
      prefix: 'rl:role:'
    })
  });
}

// Different limits per role
const postCreationLimiter = createRoleBasedLimiter({
  1: 10,  // users: 10 posts per minute
  2: 100, // admins: 100 posts per minute
  3: 50   // moderators: 50 posts per minute
});
```

---

## 4. Security Headers

### Helmet.js Configuration

```typescript
// middleware/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.blueharvest.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' }
});
```

---

## 5. CORS Configuration

```typescript
// middleware/cors.ts
import cors from 'cors';

const allowedOrigins = [
  'https://blueharvest.com',
  'https://www.blueharvest.com',
  'https://staging.blueharvest.com'
];

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000');
}

export const corsOptions = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
});
```

---

## 6. Secrets Management

### Environment-based Secrets

**Development**: `.env` files (not committed)
**Staging/Production**: AWS Secrets Manager

```typescript
// config/secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<any> {
  if (process.env.NODE_ENV === 'development') {
    return process.env[secretName];
  }

  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    return JSON.parse(response.SecretString!);
  } catch (error) {
    console.error('Error fetching secret:', error);
    throw error;
  }
}

// Usage
const dbCredentials = await getSecret('blue-harvest/db/credentials');
const jwtKeys = await getSecret('blue-harvest/jwt/keys');
```

---

## 7. Data Encryption

### At Rest
- **Database**: AWS RDS encryption enabled
- **S3 Media**: Server-side encryption (SSE-S3)
- **Backups**: Encrypted snapshots

### In Transit
- **HTTPS only**: TLS 1.3
- **Database connections**: SSL/TLS required
- **Internal services**: mTLS (mutual TLS)

### Password Hashing

```typescript
// services/auth/PasswordService.ts
import argon2 from 'argon2';

export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id, // Hybrid of argon2i and argon2d
      memoryCost: 65536,     // 64 MB
      timeCost: 3,           // 3 iterations
      parallelism: 4,        // 4 threads
      hashLength: 32         // 32 bytes output
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // Check if hash needs rehashing (if parameters changed)
  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });
  }
}
```

---

## 8. Audit Logging

### Security Event Logging

```typescript
// services/audit/AuditService.ts
export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.auditRepo.create({
      eventType: event.type,
      accountId: event.accountId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      severity: event.severity,
      timestamp: new Date()
    });

    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(event);
    }
  }

  private async alertSecurityTeam(event: SecurityEvent): Promise<void> {
    // Send to PagerDuty, Slack, etc.
  }
}

// Usage
await auditService.logSecurityEvent({
  type: 'FAILED_LOGIN_ATTEMPT',
  accountId: null,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { email: loginDto.email },
  severity: 'warning'
});

// Monitor for brute force
const recentFailures = await auditRepo.countRecentEvents({
  type: 'FAILED_LOGIN_ATTEMPT',
  ipAddress: req.ip,
  since: new Date(Date.now() - 15 * 60 * 1000) // last 15 min
});

if (recentFailures > 5) {
  await auditService.logSecurityEvent({
    type: 'BRUTE_FORCE_DETECTED',
    ipAddress: req.ip,
    severity: 'critical'
  });
  // Block IP temporarily
}
```

---

## 9. Dependency Security

### Automated Scanning

- **npm audit**: Run on every CI build
- **Snyk**: Continuous monitoring
- **Dependabot**: Automated PRs for updates

### Policy
- Critical vulnerabilities: Fix within 24 hours
- High vulnerabilities: Fix within 7 days
- Medium vulnerabilities: Fix within 30 days
- Low vulnerabilities: Address in next sprint

---

# Scalability Architecture

## Horizontal Scaling Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                        CloudFlare CDN                         │
│                    (Static assets, DDoS protection)           │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                 Application Load Balancer (ALB)               │
│                   (Health checks, SSL termination)            │
└───────────┬────────────────────────────────────┬─────────────┘
            │                                    │
   ┌────────▼────────┐                  ┌────────▼────────┐
   │  Frontend       │                  │  Frontend       │
   │  Container 1    │                  │  Container 2    │
   │  (Next.js)      │                  │  (Next.js)      │
   └────────┬────────┘                  └────────┬────────┘
            │                                    │
            └────────────────┬───────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │  Internal ALB      │
                   └─────────┬──────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼────────┐  ┌───▼────────┐  ┌───▼────────┐
   │  Backend        │  │  Backend   │  │  Backend   │
   │  Container 1    │  │  Container │  │  Container │
   │  (Express)      │  │  2         │  │  3         │
   └────────┬────────┘  └────┬───────┘  └────┬───────┘
            │                │               │
            └────────────────┼───────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼────────┐  ┌───▼────────┐  ┌───▼────────┐
   │  Redis Cache    │  │  PostgreSQL│  │  S3 Media  │
   │  (ElastiCache)  │  │  (RDS)     │  │  Storage   │
   │                 │  │  + Read    │  │            │
   │  - Session      │  │  Replicas  │  │            │
   │  - Rate limit   │  │            │  │            │
   │  - Cache        │  │            │  │            │
   └─────────────────┘  └────────────┘  └────────────┘
```

---

## 1. Database Scaling

### Read Replicas

```typescript
// database/connection.ts
import { createPool, DatabasePool } from 'slonik';

// Primary (write) connection
export const primaryPool: DatabasePool = createPool(
  process.env.DATABASE_PRIMARY_URL!,
  {
    maximumPoolSize: 20,
    idleTimeout: 30000
  }
);

// Read replica connections
export const replicaPools: DatabasePool[] = [
  createPool(process.env.DATABASE_REPLICA_1_URL!, {
    maximumPoolSize: 50,
    idleTimeout: 30000
  }),
  createPool(process.env.DATABASE_REPLICA_2_URL!, {
    maximumPoolSize: 50,
    idleTimeout: 30000
  })
];

// Load balancer for read queries
let replicaIndex = 0;
export function getReadPool(): DatabasePool {
  const pool = replicaPools[replicaIndex];
  replicaIndex = (replicaIndex + 1) % replicaPools.length;
  return pool;
}

// Repository base class with read/write separation
export abstract class BaseRepository<T> {
  protected get writePool(): DatabasePool {
    return primaryPool;
  }

  protected get readPool(): DatabasePool {
    return getReadPool();
  }

  async findById(id: number): Promise<T | null> {
    return this.readPool.maybeOne(
      sql.type(this.schema)`
        SELECT * FROM ${sql.identifier([this.tableName])}
        WHERE id = ${id} AND deleted = FALSE
      `
    );
  }

  async create(data: Partial<T>): Promise<T> {
    return this.writePool.one(
      sql.type(this.schema)`
        INSERT INTO ${sql.identifier([this.tableName])}
        ...
        RETURNING *
      `
    );
  }
}
```

### Connection Pooling

**Configuration**:
- Primary: 20 connections
- Read replicas: 50 connections each
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

### Query Optimization

**Indexes**:
```sql
-- Frequent queries
CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at DESC) WHERE deleted = FALSE;
CREATE INDEX CONCURRENTLY idx_posts_account_id ON posts(account_id) WHERE deleted = FALSE;
CREATE INDEX CONCURRENTLY idx_comments_post_id ON comments(post_id) WHERE deleted = FALSE;

-- JSONB indexes
CREATE INDEX CONCURRENTLY idx_posts_content_gin ON posts USING GIN(content);
CREATE INDEX CONCURRENTLY idx_profiles_details_gin ON profiles USING GIN(details);

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY idx_accounts_active ON accounts(account_id) WHERE deleted = FALSE;

-- Composite indexes
CREATE INDEX CONCURRENTLY idx_authors_post_profile ON authors(post_id, profile_id);
```

---

## 2. Caching Strategy

### Multi-level Caching

```
┌──────────────────────────────────────────────────────────────┐
│              L1: Application Memory Cache                     │
│              (Node.js in-memory, 100MB, 1 min TTL)           │
└───────────────────────────┬──────────────────────────────────┘
                            │ miss
┌───────────────────────────▼──────────────────────────────────┐
│              L2: Redis Cache                                  │
│              (ElastiCache, 1GB, 5 min TTL)                   │
└───────────────────────────┬──────────────────────────────────┘
                            │ miss
┌───────────────────────────▼──────────────────────────────────┐
│              L3: Database (with query cache)                  │
└─────────────────────────────────────────────────────────────┘
```

### Redis Caching Implementation

```typescript
// services/cache/CacheService.ts
import { Redis } from 'ioredis';

export class CacheService {
  private redis: Redis;
  private memoryCache: Map<string, { value: any; expiry: number }>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.memoryCache = new Map();

    // Cleanup expired memory cache every minute
    setInterval(() => this.cleanupMemoryCache(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiry > Date.now()) {
      return memCached.value;
    }

    // L2: Redis cache
    const redisCached = await this.redis.get(key);
    if (redisCached) {
      const value = JSON.parse(redisCached);
      // Populate L1 cache
      this.memoryCache.set(key, {
        value,
        expiry: Date.now() + 60000 // 1 minute
      });
      return value;
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + Math.min(60000, ttlSeconds * 1000)
    });

    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Usage in repository
export class PostRepository extends BaseRepository<Post> {
  constructor(
    pool: DatabasePool,
    private cacheService: CacheService
  ) {
    super(pool, 'posts', PostSchema);
  }

  async findById(id: number): Promise<Post | null> {
    const cacheKey = `post:${id}`;

    // Try cache first
    const cached = await this.cacheService.get<Post>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const post = await this.readPool.maybeOne(
      sql.type(PostSchema)`
        SELECT * FROM posts
        WHERE post_id = ${id} AND deleted = FALSE
      `
    );

    // Cache if found
    if (post) {
      await this.cacheService.set(cacheKey, post, 300); // 5 minutes
    }

    return post;
  }

  async update(id: number, data: Partial<Post>): Promise<Post> {
    const updated = await this.writePool.one(
      sql.type(PostSchema)`
        UPDATE posts
        SET ${sql.join(/* ... */, sql`, `)}
        WHERE post_id = ${id}
        RETURNING *
      `
    );

    // Invalidate cache
    await this.cacheService.invalidate(`post:${id}`);
    await this.cacheService.invalidate(`posts:*`); // List caches

    return updated;
  }
}
```

### Cache Invalidation Strategy

**Patterns**:
- Write-through: Update cache on write
- Cache-aside: Lazy loading
- TTL-based: Automatic expiration

**Invalidation Rules**:
- Single entity update: Invalidate entity + list caches
- Bulk updates: Invalidate all related caches
- User logout: Invalidate user session cache

---

## 3. CDN & Static Asset Optimization

### CloudFlare Configuration

**Caching Rules**:
- Static assets: Cache for 1 year
- API responses: No cache
- Images: Cache for 1 month, WebP conversion

**Next.js Static Export** (for public pages):
```typescript
// next.config.js
module.exports = {
  output: 'export', // For static pages
  images: {
    loader: 'cloudflare',
    domains: ['blueharvest.s3.amazonaws.com']
  },
  // CDN optimization
  assetPrefix: process.env.CDN_URL,
  compress: true
};
```

---

## 4. Auto-scaling Configuration

### ECS Auto-scaling

```yaml
# infrastructure/ecs-autoscaling.yml
Resources:
  BackendServiceScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 10
      MinCapacity: 2
      ResourceId: !Sub service/${ECSCluster}/${BackendService}
      RoleARN: !GetAtt AutoScalingRole.Arn
      ScalableDimension: ecs:service:DesiredCount
      ServiceNamespace: ecs

  BackendServiceScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: BackendCPUScaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref BackendServiceScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        PredefinedMetricSpecification:
          PredefinedMetricType: ECSServiceAverageCPUUtilization
        TargetValue: 70.0
        ScaleInCooldown: 300
        ScaleOutCooldown: 60
```

**Scaling Triggers**:
- CPU > 70%: Scale out
- CPU < 30%: Scale in
- Request count > 1000/min: Scale out
- Response time p95 > 500ms: Scale out

---

## 5. Database Partitioning

### Time-based Partitioning

```sql
-- Partition posts by month
CREATE TABLE posts (
    post_id SERIAL,
    account_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ...
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE posts_2025_01 PARTITION OF posts
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE posts_2025_02 PARTITION OF posts
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automatic partition management
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'posts_' || TO_CHAR(partition_date, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF posts
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_date,
        partition_date + INTERVAL '1 month'
    );
END;
$$ LANGUAGE plpgsql;

-- Run monthly via cron
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

---

# Performance Optimization

## 1. Query Performance

### N+1 Query Prevention

```typescript
// ❌ Bad: N+1 query problem
async function getPostsWithAuthors(limit: number) {
  const posts = await postRepo.findAll(limit);

  for (const post of posts) {
    post.authors = await authorRepo.findByPostId(post.post_id); // N queries
  }

  return posts;
}

// ✅ Good: Single query with JOIN
async function getPostsWithAuthors(limit: number) {
  return readPool.any(sql.type(PostWithAuthorsSchema)`
    SELECT
      p.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'profile_id', pr.profile_id,
            'name', pr.name,
            'is_primary', a.is_primary
          )
        ) FILTER (WHERE pr.profile_id IS NOT NULL),
        '[]'
      ) as authors
    FROM posts p
    LEFT JOIN authors a ON a.post_id = p.post_id
    LEFT JOIN profiles pr ON pr.profile_id = a.profile_id
    WHERE p.deleted = FALSE
    GROUP BY p.post_id
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
}
```

### Pagination with Cursor

```typescript
// Cursor-based pagination (better for large datasets)
export interface CursorPaginationParams {
  limit: number;
  cursor?: string; // base64 encoded { id, created_at }
}

export class PostRepository {
  async findWithCursor(params: CursorPaginationParams): Promise<{
    posts: Post[];
    nextCursor: string | null;
  }> {
    let whereClause = sql`deleted = FALSE`;

    if (params.cursor) {
      const decoded = JSON.parse(
        Buffer.from(params.cursor, 'base64').toString()
      );
      whereClause = sql`
        deleted = FALSE AND
        (created_at, post_id) < (${decoded.created_at}, ${decoded.id})
      `;
    }

    const posts = await this.readPool.any(sql.type(PostSchema)`
      SELECT * FROM posts
      WHERE ${whereClause}
      ORDER BY created_at DESC, post_id DESC
      LIMIT ${params.limit + 1}
    `);

    const hasMore = posts.length > params.limit;
    const items = hasMore ? posts.slice(0, -1) : posts;

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            id: items[items.length - 1].post_id,
            created_at: items[items.length - 1].created_at
          })
        ).toString('base64')
      : null;

    return { posts: items, nextCursor };
  }
}
```

---

## 2. Response Compression

```typescript
// middleware/compression.ts
import compression from 'compression';

export const compressionMiddleware = compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});
```

---

## 3. Database Query Monitoring

```typescript
// database/interceptors/queryLogger.ts
import { Interceptor } from 'slonik';

export const queryLoggerInterceptor: Interceptor = {
  afterPoolConnection: async (context, connection) => {
    return connection;
  },

  transformQuery: (context, query) => {
    // Log slow queries
    const startTime = Date.now();

    return {
      ...query,
      sql: query.sql,
      values: query.values,
      onComplete: () => {
        const duration = Date.now() - startTime;

        if (duration > 1000) {
          // Log queries taking > 1 second
          logger.warn('Slow query detected', {
            sql: query.sql,
            duration,
            values: query.values
          });
        }
      }
    };
  }
};
```

---

## 4. Background Jobs

**For heavy operations**:
- Email sending
- Image processing
- Report generation
- Data exports

```typescript
// services/queue/JobQueue.ts
import Bull from 'bull';

export const emailQueue = new Bull('email', {
  redis: process.env.REDIS_URL
});

export const imageProcessingQueue = new Bull('image-processing', {
  redis: process.env.REDIS_URL
});

// Producer
export async function sendWelcomeEmail(accountId: number) {
  await emailQueue.add(
    'welcome-email',
    { accountId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );
}

// Consumer
emailQueue.process('welcome-email', async (job) => {
  const { accountId } = job.data;
  const account = await accountRepo.findById(accountId);
  await emailService.sendWelcome(account.email);
});
```

---

## Next Steps: Implementation Priority

### Security (Weeks 1-3)
1. Implement RBAC middleware
2. Add refresh token rotation
3. Configure security headers
4. Set up audit logging
5. Implement rate limiting

### Scalability (Weeks 4-6)
1. Set up Redis caching
2. Configure read replicas
3. Implement connection pooling
4. Add database indexes
5. Set up CloudFlare CDN

### Performance (Weeks 7-8)
1. Fix N+1 queries
2. Add cursor pagination
3. Implement background jobs
4. Query optimization
5. Load testing with k6
