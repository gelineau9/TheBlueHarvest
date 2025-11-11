# Backend Architecture - The Blue Harvest

## Overview

The Blue Harvest backend follows a **clean, layered architecture** pattern with clear separation of concerns. This enterprise-grade architecture ensures maintainability, testability, and scalability.

## Current Architecture Issues

### Problems with Current Implementation

1. **No layer separation** - Routes directly access database ([auth.ts:45-120](../apps/backend/src/routes/auth.ts))
2. **Business logic in routes** - Password hashing, validation mixed with HTTP handling
3. **No repository pattern** - SQL queries scattered throughout
4. **No service layer** - No reusable business logic modules
5. **Tight coupling** - Difficult to test, mock, or replace components
6. **No DTOs/Types** - Unsafe SQL queries, no type safety between layers

### Technical Debt
- 6 TODOs in [auth.ts](../apps/backend/src/routes/auth.ts) for removing unsafe SQL queries
- Direct database access from routes
- No input validation layer separation
- No standardized error handling

---

## Target Architecture: 4-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Controllers)                  │
│  - HTTP Request/Response handling                            │
│  - Input validation (DTOs)                                   │
│  - Route definitions                                         │
│  - Authentication/Authorization middleware                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     SERVICE LAYER                            │
│  - Business logic                                            │
│  - Use case orchestration                                    │
│  - Transaction management                                    │
│  - Domain validations                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   REPOSITORY LAYER                           │
│  - Data access abstraction                                   │
│  - CRUD operations                                           │
│  - Query builders                                            │
│  - Database-specific logic                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DATABASE LAYER                            │
│  - Connection pooling                                        │
│  - Query execution                                           │
│  - Transaction handling                                      │
│  - Migration management                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Layer Specifications

### 1. Database Layer

**Purpose**: Manage database connections, pooling, and low-level query execution

**Location**: `apps/backend/src/database/`

**Structure**:
```
database/
├── connection.ts          # Database pool configuration
├── migrations/            # Database migrations
│   ├── 001_initial.sql
│   ├── 002_add_indexes.sql
│   └── runner.ts          # Migration execution
├── seeds/                 # Seed data for testing
│   ├── dev-seeds.ts
│   └── test-seeds.ts
└── types/                 # Database type definitions
    ├── tables.ts          # Table row types
    └── enums.ts           # Enum types
```

**Responsibilities**:
- Create and manage Slonik connection pool
- Health checks and monitoring
- Query execution with proper typing
- Connection lifecycle management
- Transaction primitives

**Example**:
```typescript
// database/connection.ts
import { createPool, DatabasePool } from 'slonik';
import { z } from 'zod';
import { createTypeParserPreset } from 'slonik';

const typeParser = createTypeParserPreset();

export const pool: DatabasePool = createPool(
  process.env.DATABASE_URL,
  {
    typeParser,
    maximumPoolSize: 10,
    idleTimeout: 30000,
    interceptors: [
      // Logging interceptor
      // Query timing interceptor
      // Error handling interceptor
    ]
  }
);

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query(sql`SELECT 1`);
    return true;
  } catch (error) {
    return false;
  }
}
```

**Key Technologies**:
- Slonik for type-safe queries
- Zod for runtime validation
- pg for PostgreSQL driver

---

### 2. Repository Layer

**Purpose**: Abstract data access patterns and encapsulate database queries

**Location**: `apps/backend/src/repositories/`

**Structure**:
```
repositories/
├── base/
│   ├── BaseRepository.ts       # Generic CRUD operations
│   └── interfaces.ts           # Repository interfaces
├── AccountRepository.ts
├── ProfileRepository.ts
├── PostRepository.ts
├── CommentRepository.ts
├── MediaRepository.ts
├── RelationshipRepository.ts
└── index.ts                    # Export all repositories
```

**Responsibilities**:
- CRUD operations for each entity
- Complex queries (joins, aggregations)
- Soft delete handling
- Pagination logic
- Query optimization
- Type-safe query building

**Pattern**: Repository Pattern with Generic Base

**Example**:
```typescript
// repositories/base/BaseRepository.ts
import { DatabasePool, sql } from 'slonik';

export interface IBaseRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(filters?: object): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  softDelete(id: number): Promise<void>;
  hardDelete(id: number): Promise<void>;
}

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  constructor(
    protected pool: DatabasePool,
    protected tableName: string,
    protected schema: ZodSchema<T>
  ) {}

  async findById(id: number): Promise<T | null> {
    const result = await this.pool.one(
      sql.type(this.schema)`
        SELECT * FROM ${sql.identifier([this.tableName])}
        WHERE id = ${id} AND deleted = FALSE
      `
    );
    return result || null;
  }

  async findAll(limit = 50, offset = 0): Promise<T[]> {
    return this.pool.any(
      sql.type(this.schema)`
        SELECT * FROM ${sql.identifier([this.tableName])}
        WHERE deleted = FALSE
        LIMIT ${limit} OFFSET ${offset}
      `
    );
  }

  // ... other CRUD methods
}

// repositories/AccountRepository.ts
import { BaseRepository } from './base/BaseRepository';
import { Account, AccountSchema } from '../types/entities';

export class AccountRepository extends BaseRepository<Account> {
  constructor(pool: DatabasePool) {
    super(pool, 'accounts', AccountSchema);
  }

  async findByEmail(email: string): Promise<Account | null> {
    return this.pool.maybeOne(
      sql.type(AccountSchema)`
        SELECT * FROM accounts
        WHERE email = ${email} AND deleted = FALSE
      `
    );
  }

  async findByUsername(username: string): Promise<Account | null> {
    return this.pool.maybeOne(
      sql.type(AccountSchema)`
        SELECT * FROM accounts
        WHERE username = ${username} AND deleted = FALSE
      `
    );
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.pool.oneFirst(
      sql.type(z.object({ exists: z.boolean() }))`
        SELECT EXISTS(
          SELECT 1 FROM accounts
          WHERE email = ${email} AND deleted = FALSE
        ) as exists
      `
    );
    return result.exists;
  }

  async createWithRole(
    data: CreateAccountDto,
    roleId: number = 1
  ): Promise<Account> {
    return this.pool.one(
      sql.type(AccountSchema)`
        INSERT INTO accounts (
          username, email, hashed_password,
          first_name, last_name, user_role_id
        )
        VALUES (
          ${data.username}, ${data.email}, ${data.hashedPassword},
          ${data.firstName}, ${data.lastName}, ${roleId}
        )
        RETURNING *
      `
    );
  }
}
```

**Benefits**:
- Centralized data access logic
- Easy to mock for testing
- Database-agnostic interfaces
- Type safety with Zod schemas
- Reusable query patterns

---

### 3. Service Layer

**Purpose**: Implement business logic and orchestrate repositories

**Location**: `apps/backend/src/services/`

**Structure**:
```
services/
├── auth/
│   ├── AuthService.ts          # Authentication logic
│   ├── PasswordService.ts      # Password hashing/validation
│   ├── TokenService.ts         # JWT generation/validation
│   └── types.ts                # Service DTOs
├── account/
│   ├── AccountService.ts       # Account management
│   └── types.ts
├── profile/
│   ├── ProfileService.ts       # Profile CRUD
│   ├── RelationshipService.ts  # Character relationships
│   └── types.ts
├── post/
│   ├── PostService.ts          # Post management
│   ├── CommentService.ts       # Comments
│   ├── AuthorService.ts        # Multi-author logic
│   └── types.ts
├── media/
│   ├── MediaService.ts         # Media management
│   ├── UploadService.ts        # S3 uploads
│   └── types.ts
└── index.ts                    # Service registry/factory
```

**Responsibilities**:
- Business logic execution
- Input validation (business rules)
- Transaction coordination
- Multiple repository orchestration
- Error handling with domain exceptions
- Event emission (for future event-driven architecture)

**Pattern**: Service Layer Pattern with Dependency Injection

**Example**:
```typescript
// services/auth/AuthService.ts
import { AccountRepository } from '../../repositories/AccountRepository';
import { PasswordService } from './PasswordService';
import { TokenService } from './TokenService';
import {
  SignupDto,
  LoginDto,
  AuthResponse,
  AuthServiceError
} from './types';

export class AuthService {
  constructor(
    private accountRepo: AccountRepository,
    private passwordService: PasswordService,
    private tokenService: TokenService
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    // Business rule: Check if email exists
    const emailExists = await this.accountRepo.existsByEmail(dto.email);
    if (emailExists) {
      throw new AuthServiceError('Email already registered', 'EMAIL_EXISTS');
    }

    // Business rule: Check if username exists
    const usernameExists = await this.accountRepo.existsByUsername(
      dto.username
    );
    if (usernameExists) {
      throw new AuthServiceError(
        'Username already taken',
        'USERNAME_EXISTS'
      );
    }

    // Hash password
    const hashedPassword = await this.passwordService.hash(dto.password);

    // Create account
    const account = await this.accountRepo.createWithRole({
      ...dto,
      hashedPassword
    });

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      accountId: account.account_id,
      username: account.username,
      roleId: account.user_role_id
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      accountId: account.account_id
    });

    return {
      account: this.sanitizeAccount(account),
      accessToken,
      refreshToken
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find account by email or username
    const account = dto.email
      ? await this.accountRepo.findByEmail(dto.email)
      : await this.accountRepo.findByUsername(dto.username);

    if (!account) {
      throw new AuthServiceError(
        'Invalid credentials',
        'INVALID_CREDENTIALS'
      );
    }

    // Verify password
    const isValid = await this.passwordService.verify(
      account.hashed_password,
      dto.password
    );

    if (!isValid) {
      throw new AuthServiceError(
        'Invalid credentials',
        'INVALID_CREDENTIALS'
      );
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      accountId: account.account_id,
      username: account.username,
      roleId: account.user_role_id
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      accountId: account.account_id
    });

    return {
      account: this.sanitizeAccount(account),
      accessToken,
      refreshToken
    };
  }

  private sanitizeAccount(account: Account) {
    const { hashed_password, ...safe } = account;
    return safe;
  }
}

// services/auth/PasswordService.ts
import argon2 from 'argon2';

export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}

// services/auth/TokenService.ts
import jwt from 'jsonwebtoken';
import { TokenPayload } from './types';

export class TokenService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'blue-harvest',
      audience: 'blue-harvest-api'
    });
  }

  generateRefreshToken(payload: { accountId: number }): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'blue-harvest'
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessTokenSecret, {
      issuer: 'blue-harvest',
      audience: 'blue-harvest-api'
    }) as TokenPayload;
  }

  verifyRefreshToken(token: string): { accountId: number } {
    return jwt.verify(token, this.refreshTokenSecret, {
      issuer: 'blue-harvest'
    }) as { accountId: number };
  }
}
```

**Benefits**:
- Business logic isolation
- Easy unit testing
- Reusable across different interfaces (REST, GraphQL, gRPC)
- Clear error handling
- Transaction management

---

### 4. API Layer (Controllers)

**Purpose**: Handle HTTP requests/responses and route to services

**Location**: `apps/backend/src/controllers/`

**Structure**:
```
controllers/
├── base/
│   ├── BaseController.ts       # Common controller utilities
│   └── decorators.ts           # Route decorators (future)
├── AuthController.ts
├── AccountController.ts
├── ProfileController.ts
├── PostController.ts
├── CommentController.ts
├── MediaController.ts
└── index.ts
```

**Responsibilities**:
- HTTP request parsing
- DTO validation (using Zod)
- Service orchestration
- Response formatting
- HTTP status codes
- Error transformation to HTTP responses

**Pattern**: Controller Pattern with Express

**Example**:
```typescript
// controllers/AuthController.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { SignupDtoSchema, LoginDtoSchema } from '../services/auth/types';
import { ApiError } from '../middleware/error';

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const dto = SignupDtoSchema.parse(req.body);

      // Call service
      const result = await this.authService.signup(dto);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Send response
      res.status(201).json({
        success: true,
        data: {
          account: result.account,
          accessToken: result.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = LoginDtoSchema.parse(req.body);
      const result = await this.authService.login(dto);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: {
          account: result.account,
          accessToken: result.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie('refreshToken');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.user is set by auth middleware
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  };
}
```

**Routes**:
```typescript
// routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post('/signup', authController.signup);
  router.post('/login', authController.login);
  router.post('/logout', authController.logout);
  router.get('/me', authMiddleware, authController.me);
  router.post('/refresh', authController.refreshToken);

  return router;
}
```

**Benefits**:
- Thin controllers (logic in services)
- Consistent response formats
- Easy integration testing
- Clear HTTP semantics

---

## Dependency Injection Container

**Purpose**: Manage service instantiation and dependencies

**Location**: `apps/backend/src/container/`

**Pattern**: Simple Factory Pattern (can upgrade to InversifyJS later)

```typescript
// container/index.ts
import { pool } from '../database/connection';
import { AccountRepository } from '../repositories/AccountRepository';
import { AuthService } from '../services/auth/AuthService';
import { PasswordService } from '../services/auth/PasswordService';
import { TokenService } from '../services/auth/TokenService';
import { AuthController } from '../controllers/AuthController';

class Container {
  private instances = new Map<string, any>();

  // Repositories
  get accountRepository(): AccountRepository {
    if (!this.instances.has('accountRepository')) {
      this.instances.set('accountRepository', new AccountRepository(pool));
    }
    return this.instances.get('accountRepository');
  }

  // Services
  get passwordService(): PasswordService {
    if (!this.instances.has('passwordService')) {
      this.instances.set('passwordService', new PasswordService());
    }
    return this.instances.get('passwordService');
  }

  get tokenService(): TokenService {
    if (!this.instances.has('tokenService')) {
      this.instances.set('tokenService', new TokenService());
    }
    return this.instances.get('tokenService');
  }

  get authService(): AuthService {
    if (!this.instances.has('authService')) {
      this.instances.set(
        'authService',
        new AuthService(
          this.accountRepository,
          this.passwordService,
          this.tokenService
        )
      );
    }
    return this.instances.get('authService');
  }

  // Controllers
  get authController(): AuthController {
    if (!this.instances.has('authController')) {
      this.instances.set(
        'authController',
        new AuthController(this.authService)
      );
    }
    return this.instances.get('authController');
  }
}

export const container = new Container();
```

---

## Type System

**Location**: `apps/backend/src/types/`

**Structure**:
```
types/
├── entities/              # Database entities
│   ├── Account.ts
│   ├── Profile.ts
│   ├── Post.ts
│   └── index.ts
├── dtos/                  # Data Transfer Objects
│   ├── auth/
│   │   ├── SignupDto.ts
│   │   ├── LoginDto.ts
│   │   └── index.ts
│   ├── profile/
│   └── post/
├── responses/             # API response types
│   ├── ApiResponse.ts
│   ├── PaginatedResponse.ts
│   └── index.ts
└── errors/                # Custom error types
    ├── AuthError.ts
    ├── ValidationError.ts
    └── index.ts
```

**Example**:
```typescript
// types/entities/Account.ts
import { z } from 'zod';

export const AccountSchema = z.object({
  account_id: z.number(),
  username: z.string(),
  email: z.string().email(),
  hashed_password: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  user_role_id: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  deleted: z.boolean()
});

export type Account = z.infer<typeof AccountSchema>;

// types/dtos/auth/SignupDto.ts
import { z } from 'zod';

export const SignupDtoSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional()
});

export type SignupDto = z.infer<typeof SignupDtoSchema>;

// types/responses/ApiResponse.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

---

## Error Handling Strategy

**Global Error Hierarchy**:
```typescript
// types/errors/BaseError.ts
export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// types/errors/AuthError.ts
export class AuthError extends BaseError {
  statusCode = 401;
  code = 'AUTH_ERROR';

  constructor(message: string, public subCode?: string) {
    super(message);
  }
}

// types/errors/ValidationError.ts
export class ValidationError extends BaseError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';

  constructor(message: string, public errors: any[]) {
    super(message);
  }
}

// types/errors/NotFoundError.ts
export class NotFoundError extends BaseError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}
```

**Error Middleware**:
```typescript
// middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../types/errors/BaseError';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  // Handle known errors
  if (error instanceof BaseError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors
      }
    });
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
```

---

## Migration Path

### Phase 1: Foundation (Week 1-2)
1. Set up database layer with Slonik types
2. Create base repository class
3. Create type definitions (entities, DTOs)
4. Set up DI container

### Phase 2: Auth Refactor (Week 2-3)
1. Create AccountRepository
2. Create AuthService, PasswordService, TokenService
3. Create AuthController
4. Refactor existing auth routes
5. Add comprehensive tests

### Phase 3: Expand (Week 3-6)
1. Profile system (Repository → Service → Controller)
2. Post system
3. Media system
4. Relationships system

### Phase 4: Enhancement (Week 6+)
1. Add caching layer (Redis)
2. Add event system
3. Add background jobs
4. Performance optimization

---

## Testing Strategy Per Layer

### Database Layer Tests
- Connection pool behavior
- Health checks
- Transaction handling
- Query execution

### Repository Layer Tests
- CRUD operations
- Query correctness
- Soft delete behavior
- Edge cases (null, empty)

### Service Layer Tests
- Business logic correctness
- Error handling
- Transaction coordination
- Multiple repository interaction

### Controller Layer Tests
- Request validation
- Response formatting
- HTTP status codes
- Error transformation

---

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to unit test each layer in isolation
3. **Maintainability**: Changes isolated to specific layers
4. **Scalability**: Can extract services to microservices later
5. **Type Safety**: End-to-end type safety with Zod + TypeScript
6. **Flexibility**: Easy to swap implementations (e.g., change database)
7. **Team Collaboration**: Clear boundaries for parallel development
8. **Documentation**: Self-documenting code structure
9. **Error Handling**: Consistent error propagation
10. **Performance**: Optimizations can be made at each layer independently
