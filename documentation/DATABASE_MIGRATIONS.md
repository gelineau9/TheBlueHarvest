# Database Migration Strategy - The Blue Harvest

## Overview

Comprehensive database migration strategy covering tool selection, implementation patterns, and operational procedures for managing schema changes across all environments.

---

## Current State Analysis

### Existing Setup

**Location**: `db/schema/`

**Structure**:
```
db/
├── schema/
│   ├── 001_create_types.sql
│   ├── 002_create_tables.sql
│   ├── 003_create_indexes.sql
│   ├── 004_create_triggers.sql
│   └── 005_constraints.sql
├── seeds/
│   ├── 001_account_seed.sql
│   ├── 002_profiles_seed.sql
│   └── ...
└── archive/
    ├── full_schema_w_comments.sql
    └── full_seed_w_comments.sql
```

**Current Method**:
- SQL files executed via Docker entrypoint on container startup
- No migration tracking
- No rollback capability
- No version control of schema changes
- Destructive on restart

**Problems**:
- ❌ No incremental migrations
- ❌ Can't track what migrations have run
- ❌ No rollback mechanism
- ❌ Difficult to manage across environments
- ❌ Schema drift between environments
- ❌ No migration validation
- ❌ Seed data mixed with schema

---

## Migration Tool Comparison

### 1. Prisma

**Pros**:
- ✅ Schema-first approach with Prisma Schema Language
- ✅ Automatic migration generation
- ✅ Type-safe Prisma Client (alternative to Slonik)
- ✅ Built-in migration tracking
- ✅ Shadow database for safety
- ✅ Excellent TypeScript integration
- ✅ Database introspection
- ✅ Visual database browser (Prisma Studio)
- ✅ Great documentation

**Cons**:
- ❌ Own query builder (would replace Slonik)
- ❌ Less control over raw SQL
- ❌ Limited support for advanced PostgreSQL features
- ❌ Schema language learning curve
- ❌ Not great for existing complex schemas
- ❌ Table inheritance not well supported

**Best For**: Greenfield projects, teams wanting ORM

---

### 2. node-pg-migrate

**Pros**:
- ✅ JavaScript/TypeScript migrations
- ✅ Up and down migrations
- ✅ Programmatic API
- ✅ Works with existing Slonik setup
- ✅ No schema language to learn
- ✅ Supports all PostgreSQL features
- ✅ Migration locking
- ✅ Transaction support
- ✅ Simple and lightweight

**Cons**:
- ❌ No automatic migration generation
- ❌ Manual migration writing
- ❌ Less tooling than Prisma
- ❌ No visual tools

**Best For**: Existing projects with raw SQL, full PostgreSQL feature usage

---

### 3. Knex.js

**Pros**:
- ✅ Query builder + migration tool
- ✅ Schema builder API
- ✅ Up and down migrations
- ✅ Seed files support
- ✅ Multiple database support
- ✅ Transaction support

**Cons**:
- ❌ Query builder API (would replace Slonik)
- ❌ Less type-safe than Slonik
- ❌ More complex API
- ❌ Overhead if only using for migrations

**Best For**: Projects wanting query builder + migrations in one

---

### 4. Flyway (JVM-based)

**Pros**:
- ✅ Industry standard
- ✅ SQL-based migrations
- ✅ Version control integration
- ✅ Undo migrations (paid)
- ✅ Excellent for complex schemas
- ✅ Enterprise features

**Cons**:
- ❌ Requires Java runtime
- ❌ Some features require paid version
- ❌ Heavier weight
- ❌ Node.js integration not native

**Best For**: Enterprise Java shops, complex migrations

---

### 5. db-migrate

**Pros**:
- ✅ Multiple database support
- ✅ Up/down migrations
- ✅ SQL or JavaScript migrations
- ✅ CLI tool

**Cons**:
- ❌ Less actively maintained
- ❌ Smaller community
- ❌ Less features than alternatives

**Best For**: Simple migration needs

---

### 6. Liquibase (XML/YAML/JSON/SQL)

**Pros**:
- ✅ Database-agnostic
- ✅ Multiple formats
- ✅ Rollback support
- ✅ Enterprise features

**Cons**:
- ❌ XML-heavy (by default)
- ❌ Complex setup
- ❌ Requires Java
- ❌ Overkill for most projects

**Best For**: Enterprise multi-database environments

---

### 7. Raw SQL Migration Tool (Custom)

**Pros**:
- ✅ Full control
- ✅ Simple implementation
- ✅ No dependencies
- ✅ Works exactly as needed

**Cons**:
- ❌ Must build everything
- ❌ Maintenance burden
- ❌ Reinventing the wheel

**Best For**: Specific requirements not met by existing tools

---

## Recommendation: node-pg-migrate

### Why node-pg-migrate?

For The Blue Harvest project, **node-pg-migrate** is the best choice because:

1. **Preserves existing Slonik setup** - No need to replace type-safe queries
2. **Supports advanced PostgreSQL features** - Table inheritance, JSONB, custom types
3. **Incremental migration from current state** - Can start with existing schema
4. **TypeScript-first** - Fully typed migration files
5. **Production-ready** - Used by many large projects
6. **Lightweight** - Doesn't force architectural changes
7. **Full SQL control** - Write raw SQL when needed

---

## Implementation Plan with node-pg-migrate

### Installation

```bash
npm install --save node-pg-migrate
npm install --save-dev @types/node-pg-migrate
```

### Project Structure

```
db/
├── migrations/              # New: Migration files
│   ├── 1710000000000_initial_schema.ts
│   ├── 1710000001000_add_notifications_table.ts
│   ├── 1710000002000_add_user_preferences.ts
│   └── ...
├── schema/                  # Archive: Original schema (keep for reference)
│   └── [existing files]
├── seeds/                   # Seed files (separate from migrations)
│   ├── dev/
│   │   ├── 001_accounts.ts
│   │   └── 002_profiles.ts
│   ├── test/
│   │   └── 001_test_data.ts
│   └── production/
│       └── 001_essential_data.ts
└── scripts/
    ├── migrate.ts           # Migration runner
    ├── rollback.ts          # Rollback utility
    ├── seed.ts              # Seed data runner
    └── reset.ts             # Reset database (dev only)
```

---

### Configuration

**File**: `database.json` or `db/config.ts`

```typescript
// db/config.ts
import { type MigrationDirection } from 'node-pg-migrate';

export interface DatabaseConfig {
  development: ConnectionConfig;
  test: ConnectionConfig;
  staging: ConnectionConfig;
  production: ConnectionConfig;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export const databaseConfig: DatabaseConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    database: process.env.DB_NAME || 'bha_db',
    user: process.env.DB_USER || 'merry',
    password: process.env.DB_PASSWORD || 'secondbreakfast',
    ssl: false
  },
  test: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: Number(process.env.TEST_DB_PORT) || 5432,
    database: process.env.TEST_DB_NAME || 'test_db',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    ssl: false
  },
  staging: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: true
  },
  production: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: true
  }
};

export function getConfig(env: string = process.env.NODE_ENV || 'development') {
  return databaseConfig[env as keyof DatabaseConfig];
}
```

**File**: `migrate-config.js` (required by node-pg-migrate CLI)

```javascript
module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  dir: 'db/migrations',
  migrationsTable: 'pgmigrations',
  direction: 'up',
  count: Infinity,
  schema: 'public',
  decamelize: true,
  ignorePattern: '\\..*',

  // TypeScript support
  tsconfig: 'tsconfig.json',

  // Migration options
  migrationOptions: {
    noLock: false,
    transactional: true
  }
};
```

---

### Initial Migration (Convert Existing Schema)

**File**: `db/migrations/1710000000000_initial_schema.ts`

```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Type tables
  pgm.createTable('profile_types', {
    type_id: 'id',
    type_name: { type: 'varchar(50)', notNull: true, unique: true }
  });

  pgm.sql(`
    INSERT INTO profile_types (type_name)
    VALUES ('character'), ('item'), ('kinship'), ('organization')
  `);

  pgm.createTable('user_roles', {
    role_id: 'id',
    role_name: { type: 'varchar(50)', notNull: true, unique: true }
  });

  pgm.sql(`
    INSERT INTO user_roles (role_name)
    VALUES ('user'), ('admin'), ('moderator')
  `);

  pgm.createTable('bidirectional_relationship_types', {
    type_id: 'id',
    type_name: { type: 'varchar(50)', notNull: true, unique: true }
  });

  pgm.sql(`
    INSERT INTO bidirectional_relationship_types (type_name)
    VALUES ('friend'), ('enemy'), ('ally')
  `);

  pgm.createTable('unidirectional_relationship_types', {
    type_id: 'id',
    type_name: { type: 'varchar(50)', notNull: true, unique: true }
  });

  pgm.sql(`
    INSERT INTO unidirectional_relationship_types (type_name)
    VALUES ('parent'), ('child'), ('other')
  `);

  pgm.createTable('post_types', {
    type_id: 'id',
    type_name: { type: 'varchar(50)', notNull: true, unique: true },
    type_description: { type: 'text' }
  });

  pgm.sql(`
    INSERT INTO post_types (type_name, type_description)
    VALUES
      ('story', 'A narrative post'),
      ('art', 'Visual artwork'),
      ('recipe', 'Cooking instructions'),
      ('event', 'Post describing an event'),
      ('other', 'Miscellaneous content')
  `);

  // ENUM types
  pgm.createType('relationship_direction', ['forward', 'backward', 'both']);

  // Data tables
  pgm.createTable('accounts', {
    account_id: 'id',
    username: { type: 'varchar(50)', notNull: true, unique: true },
    email: { type: 'varchar(100)', notNull: true, unique: true },
    hashed_password: { type: 'varchar(255)', notNull: true },
    first_name: { type: 'varchar(50)' },
    last_name: { type: 'varchar(50)' },
    user_role_id: {
      type: 'integer',
      notNull: true,
      default: 1,
      references: 'user_roles(role_id)'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  pgm.createTable('profiles', {
    profile_id: 'id',
    account_id: {
      type: 'integer',
      notNull: true,
      references: 'accounts(account_id)'
    },
    profile_type_id: {
      type: 'integer',
      notNull: true,
      references: 'profile_types(type_id)'
    },
    name: { type: 'varchar(100)', notNull: true },
    details: { type: 'jsonb' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  pgm.createTable('posts', {
    post_id: 'id',
    account_id: {
      type: 'integer',
      notNull: true,
      references: 'accounts(account_id)'
    },
    post_type_id: {
      type: 'integer',
      notNull: true,
      default: 1,
      references: 'post_types(type_id)'
    },
    content: { type: 'jsonb', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  pgm.createTable('authors', {
    author_id: 'id',
    post_id: {
      type: 'integer',
      references: 'posts(post_id)',
      onDelete: 'CASCADE'
    },
    profile_id: {
      type: 'integer',
      references: 'profiles(profile_id)',
      onDelete: 'CASCADE'
    },
    is_primary: { type: 'boolean', default: false },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  // Media tables with inheritance
  pgm.createTable('media', {
    media_id: 'id',
    filename: { type: 'varchar(255)', notNull: true },
    url: { type: 'varchar(255)', notNull: true },
    file_size: { type: 'integer' },
    file_type: { type: 'varchar(50)' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  // Child tables using INHERITS (requires raw SQL)
  pgm.sql(`
    CREATE TABLE post_media (
      post_id INT REFERENCES posts(post_id) ON DELETE CASCADE
    ) INHERITS (media);

    CREATE TABLE profile_media (
      profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE
    ) INHERITS (media);

    CREATE TABLE account_media (
      account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE
    ) INHERITS (media);
  `);

  pgm.createTable('comments', {
    comment_id: 'id',
    post_id: {
      type: 'integer',
      references: 'posts(post_id)',
      onDelete: 'CASCADE'
    },
    profile_id: {
      type: 'integer',
      references: 'profiles(profile_id)',
      onDelete: 'CASCADE'
    },
    content: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    deleted: { type: 'boolean', notNull: true, default: false }
  });

  // Relationships with inheritance
  pgm.sql(`
    CREATE TABLE relationships (
      relationship_id SERIAL PRIMARY KEY,
      profile_id_1 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
      profile_id_2 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
      direction relationship_direction NOT NULL
    );

    CREATE TABLE bidirectional_relationships (
      type_id INT REFERENCES bidirectional_relationship_types(type_id) ON DELETE CASCADE
    ) INHERITS (relationships);

    CREATE TABLE unidirectional_relationships (
      type_id INT REFERENCES unidirectional_relationship_types(type_id) ON DELETE CASCADE
    ) INHERITS (relationships);
  `);

  // Indexes
  pgm.createIndex('accounts', 'email');
  pgm.createIndex('accounts', 'username');
  pgm.createIndex('profiles', 'account_id');
  pgm.createIndex('profiles', 'profile_type_id');
  pgm.createIndex('posts', 'account_id');
  pgm.createIndex('posts', 'post_type_id');
  pgm.createIndex('posts', 'created_at');
  pgm.createIndex('comments', 'post_id');
  pgm.createIndex('comments', 'profile_id');
  pgm.createIndex('authors', 'post_id');
  pgm.createIndex('authors', 'profile_id');

  // JSONB indexes
  pgm.sql(`
    CREATE INDEX idx_posts_content_gin ON posts USING GIN(content);
    CREATE INDEX idx_profiles_details_gin ON profiles USING GIN(details);
  `);

  // Triggers
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Constraints
  pgm.addConstraint('profiles', 'unique_account_name', {
    unique: ['account_id', 'name']
  });

  pgm.addConstraint('authors', 'unique_post_profile', {
    unique: ['post_id', 'profile_id']
  });

  pgm.sql(`
    CREATE UNIQUE INDEX unique_primary_author ON authors (post_id) WHERE is_primary = TRUE;
  `);

  pgm.addConstraint('relationships', 'profile_id_order', {
    check: 'profile_id_1 < profile_id_2'
  });

  pgm.addConstraint('bidirectional_relationships', 'direction_both', {
    check: "direction = 'both'"
  });

  pgm.addConstraint('bidirectional_relationships', 'unique_bidirectional', {
    unique: ['profile_id_1', 'profile_id_2', 'type_id']
  });

  pgm.addConstraint('unidirectional_relationships', 'direction_single', {
    check: "direction IN ('forward', 'backward')"
  });

  pgm.addConstraint('unidirectional_relationships', 'unique_unidirectional', {
    unique: ['profile_id_1', 'profile_id_2', 'type_id', 'direction']
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop in reverse order
  pgm.sql('DROP TABLE IF EXISTS unidirectional_relationships CASCADE');
  pgm.sql('DROP TABLE IF EXISTS bidirectional_relationships CASCADE');
  pgm.sql('DROP TABLE IF EXISTS relationships CASCADE');
  pgm.dropTable('comments', { cascade: true });
  pgm.sql('DROP TABLE IF EXISTS account_media CASCADE');
  pgm.sql('DROP TABLE IF EXISTS profile_media CASCADE');
  pgm.sql('DROP TABLE IF EXISTS post_media CASCADE');
  pgm.dropTable('media', { cascade: true });
  pgm.dropTable('authors', { cascade: true });
  pgm.dropTable('posts', { cascade: true });
  pgm.dropTable('profiles', { cascade: true });
  pgm.dropTable('accounts', { cascade: true });
  pgm.dropType('relationship_direction');
  pgm.dropTable('post_types', { cascade: true });
  pgm.dropTable('unidirectional_relationship_types', { cascade: true });
  pgm.dropTable('bidirectional_relationship_types', { cascade: true });
  pgm.dropTable('user_roles', { cascade: true });
  pgm.dropTable('profile_types', { cascade: true });
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
}
```

---

### Example: Adding a New Feature (Notifications)

**File**: `db/migrations/1710000001000_add_notifications_table.ts`

```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create notification_types table
  pgm.createTable('notification_types', {
    type_id: 'id',
    type_name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' }
  });

  pgm.sql(`
    INSERT INTO notification_types (type_name, description) VALUES
    ('comment', 'Someone commented on your post'),
    ('mention', 'Someone mentioned you'),
    ('follow', 'Someone followed you'),
    ('like', 'Someone liked your post'),
    ('event_reminder', 'Upcoming event reminder')
  `);

  // Create notifications table
  pgm.createTable('notifications', {
    notification_id: 'id',
    account_id: {
      type: 'integer',
      notNull: true,
      references: 'accounts(account_id)',
      onDelete: 'CASCADE'
    },
    notification_type_id: {
      type: 'integer',
      notNull: true,
      references: 'notification_types(type_id)'
    },
    content: { type: 'jsonb', notNull: true },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Indexes
  pgm.createIndex('notifications', 'account_id');
  pgm.createIndex('notifications', ['account_id', 'is_read']);
  pgm.createIndex('notifications', 'created_at');

  // Add notification preferences to accounts
  pgm.addColumn('accounts', {
    notification_preferences: {
      type: 'jsonb',
      default: pgm.func(`'{"email": true, "push": false}'::jsonb`)
    }
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('accounts', 'notification_preferences');
  pgm.dropTable('notifications', { cascade: true });
  pgm.dropTable('notification_types', { cascade: true });
}
```

---

### Migration Scripts

**File**: `db/scripts/migrate.ts`

```typescript
import runner from 'node-pg-migrate';
import { getConfig } from '../config';
import { logger } from '../../apps/backend/src/utils/logger';

export async function migrate(direction: 'up' | 'down' = 'up', count?: number) {
  const config = getConfig();

  try {
    logger.info('Starting migrations...', { direction, count });

    await runner({
      databaseUrl: `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`,
      dir: 'db/migrations',
      direction,
      count: count || Infinity,
      migrationsTable: 'pgmigrations',
      verbose: true,
      logger: {
        info: (msg: string) => logger.info(msg),
        warn: (msg: string) => logger.warn(msg),
        error: (msg: string) => logger.error(msg)
      }
    });

    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const direction = (process.argv[2] as 'up' | 'down') || 'up';
  const count = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  migrate(direction, count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

**File**: `db/scripts/rollback.ts`

```typescript
import { migrate } from './migrate';
import { logger } from '../../apps/backend/src/utils/logger';

async function rollback(count: number = 1) {
  logger.warn('Rolling back migrations', { count });

  try {
    await migrate('down', count);
    logger.info('Rollback completed successfully');
  } catch (error) {
    logger.error('Rollback failed', { error: error.message });
    throw error;
  }
}

if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 1;

  rollback(count)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

**File**: `db/scripts/seed.ts`

```typescript
import { pool } from '../../apps/backend/src/database/connection';
import { sql } from 'slonik';
import { logger } from '../../apps/backend/src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function seed(environment: 'dev' | 'test' | 'production' = 'dev') {
  const seedDir = path.join(__dirname, '..', 'seeds', environment);

  logger.info('Starting seed process', { environment, seedDir });

  try {
    // Get all seed files
    const files = fs
      .readdirSync(seedDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      logger.info(`Running seed file: ${file}`);
      const seedSQL = fs.readFileSync(path.join(seedDir, file), 'utf-8');
      await pool.query(sql.unsafe`${seedSQL}`);
    }

    logger.info('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed', { error: error.message });
    throw error;
  }
}

if (require.main === module) {
  const env = (process.argv[2] as 'dev' | 'test' | 'production') || 'dev';

  seed(env)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

**File**: `db/scripts/reset.ts` (Development only!)

```typescript
import { pool } from '../../apps/backend/src/database/connection';
import { sql } from 'slonik';
import { migrate } from './migrate';
import { seed } from './seed';
import { logger } from '../../apps/backend/src/utils/logger';

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset production database!');
  }

  logger.warn('Resetting database - all data will be lost!');

  try {
    // Drop all tables
    await pool.query(sql.unsafe`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO ${sql.identifier([process.env.DB_USER!])};
      GRANT ALL ON SCHEMA public TO public;
    `);

    logger.info('Database reset, running migrations...');
    await migrate('up');

    logger.info('Seeding database...');
    await seed('dev');

    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Database reset failed', { error: error.message });
    throw error;
  }
}

if (require.main === module) {
  reset()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

---

### NPM Scripts

**Add to `apps/backend/package.json`**:

```json
{
  "scripts": {
    "migrate": "ts-node -r dotenv/config db/scripts/migrate.ts up",
    "migrate:down": "ts-node -r dotenv/config db/scripts/migrate.ts down 1",
    "migrate:create": "node-pg-migrate create --migration-file-language ts",
    "migrate:status": "node-pg-migrate list",
    "db:seed": "ts-node -r dotenv/config db/scripts/seed.ts dev",
    "db:seed:test": "ts-node -r dotenv/config db/scripts/seed.ts test",
    "db:reset": "ts-node -r dotenv/config db/scripts/reset.ts",
    "db:rollback": "ts-node -r dotenv/config db/scripts/rollback.ts"
  }
}
```

---

## Migration Workflow

### Development

```bash
# Create new migration
npm run migrate:create add_user_preferences

# Edit the generated migration file
# db/migrations/[timestamp]_add_user_preferences.ts

# Run migrations
npm run migrate

# If something goes wrong, rollback
npm run migrate:down

# Reset database (drops everything)
npm run db:reset
```

### Testing

```bash
# In CI/CD pipeline or local testing
export NODE_ENV=test
export DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db

# Run migrations on test database
npm run migrate

# Run tests
npm test

# Cleanup
npm run db:reset
```

### Staging/Production

```bash
# Check migration status
npm run migrate:status

# Dry run (check what will happen)
npm run migrate -- --dry-run

# Run migrations
npm run migrate

# If needed, rollback (with caution!)
npm run db:rollback
```

---

## Migration Best Practices

### 1. Always Write Down Migrations

Every `up` migration MUST have a corresponding `down` migration.

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('accounts', {
    last_login: { type: 'timestamptz' }
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('accounts', 'last_login');
}
```

### 2. Use Transactions

Migrations run in transactions by default. Keep them atomic.

```typescript
// If you need manual transaction control
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction(); // Disable auto-transaction if needed

  // Then use pgm.db.query for custom transactions
}
```

### 3. Never Modify Existing Migrations

Once a migration is run in production, never modify it. Create a new migration instead.

```typescript
// ❌ WRONG: Modifying existing migration
// db/migrations/001_initial.ts - DO NOT EDIT

// ✅ CORRECT: Create new migration
// db/migrations/002_fix_column_type.ts
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('accounts', 'username', {
    type: 'varchar(100)' // Increased from 50
  });
}
```

### 4. Handle Data Migrations Carefully

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add column with default
  pgm.addColumn('accounts', {
    email_verified: { type: 'boolean', default: false, notNull: true }
  });

  // Migrate existing data
  pgm.sql(`
    UPDATE accounts
    SET email_verified = TRUE
    WHERE created_at < '2024-01-01'
  `);
}
```

### 5. Test Migrations on Copy of Production Data

```bash
# Backup production database
pg_dump -h prod-host -U user -d bha_db > backup.sql

# Restore to staging
psql -h staging-host -U user -d bha_staging < backup.sql

# Test migrations on staging
npm run migrate

# Verify data integrity
npm run verify:data
```

### 6. Use Descriptive Migration Names

```bash
# Good names
npm run migrate:create add_notifications_table
npm run migrate:create add_user_email_verification
npm run migrate:create optimize_posts_indexes

# Bad names
npm run migrate:create update
npm run migrate:create fix
npm run migrate:create changes
```

### 7. Keep Migrations Small

One feature = one migration (usually)

```typescript
// ❌ BAD: Giant migration doing too much
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create 10 tables
  // Add 50 indexes
  // Migrate all existing data
  // ... 500 lines
}

// ✅ GOOD: Small, focused migrations
// 001_add_notifications_table.ts
// 002_add_notification_preferences.ts
// 003_add_notification_indexes.ts
```

---

## Handling Production Migrations

### Zero-Downtime Migrations

**Problem**: Adding NOT NULL column causes downtime

```typescript
// ❌ BAD: Will fail if table has data
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('accounts', {
    phone: { type: 'varchar(20)', notNull: true } // ❌ Fails!
  });
}

// ✅ GOOD: Multi-step migration
// Migration 1: Add nullable column
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('accounts', {
    phone: { type: 'varchar(20)' } // Nullable first
  });
}

// Migration 2: Backfill data (can run async)
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    UPDATE accounts
    SET phone = '+1-000-000-0000'
    WHERE phone IS NULL
  `);
}

// Migration 3: Add NOT NULL constraint
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('accounts', 'phone', {
    notNull: true
  });
}
```

### Renaming Columns (Zero Downtime)

```typescript
// Step 1: Add new column
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('accounts', {
    full_name: { type: 'varchar(100)' }
  });

  // Copy data
  pgm.sql(`
    UPDATE accounts
    SET full_name = CONCAT(first_name, ' ', last_name)
  `);
}

// Step 2: Update application code to use new column (deploy)

// Step 3: Remove old columns
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('accounts', 'first_name');
  pgm.dropColumn('accounts', 'last_name');
}
```

---

## Migration Monitoring

### Track Migration Duration

```typescript
// db/scripts/migrate.ts (enhanced)
import runner from 'node-pg-migrate';
import { logger } from '../../apps/backend/src/utils/logger';

export async function migrate(direction: 'up' | 'down' = 'up') {
  const startTime = Date.now();

  try {
    await runner({
      // ... config
      logger: {
        info: (msg: string) => {
          logger.info(msg);
          // Also send to metrics
          migrationDuration.observe(Date.now() - startTime);
        }
      }
    });

    const duration = Date.now() - startTime;
    logger.info('Migration completed', { duration });

    // Alert if migration took too long
    if (duration > 60000) {
      await alertSlowMigration(duration);
    }
  } catch (error) {
    logger.error('Migration failed', { error });
    await alertMigrationFailure(error);
    throw error;
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/database-migrations.yml
name: Database Migrations

on:
  pull_request:
    paths:
      - 'db/migrations/**'

jobs:
  test-migrations:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.7.0'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations up
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run migrate

      - name: Verify schema
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run verify:schema

      - name: Test rollback (last migration)
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run migrate:down

      - name: Re-run migration
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run migrate

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm test
```

---

## Comparison: Prisma vs node-pg-migrate

### If You Choose Prisma Instead

**Prisma Schema**: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Account {
  id              Int       @id @default(autoincrement()) @map("account_id")
  username        String    @unique @db.VarChar(50)
  email           String    @unique @db.VarChar(100)
  hashedPassword  String    @map("hashed_password") @db.VarChar(255)
  firstName       String?   @map("first_name") @db.VarChar(50)
  lastName        String?   @map("last_name") @db.VarChar(50)
  userRoleId      Int       @default(1) @map("user_role_id")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deleted         Boolean   @default(false)

  userRole        UserRole  @relation(fields: [userRoleId], references: [id])
  profiles        Profile[]
  posts           Post[]

  @@map("accounts")
}

// ... other models
```

**Trade-offs**:
- ✅ Auto-generated types
- ✅ Prisma Client (type-safe queries)
- ❌ Would replace Slonik
- ❌ Limited PostgreSQL features
- ❌ No table inheritance support

---

## Recommendation Summary

**Use node-pg-migrate** for The Blue Harvest because:

1. Preserves current Slonik investment
2. Full PostgreSQL feature support
3. TypeScript migrations
4. Up/down migrations
5. Production-ready
6. Straightforward migration from current setup

**Implementation Timeline**:
- Week 1: Setup node-pg-migrate, create initial migration
- Week 2: Test migration workflow, create migration scripts
- Week 3: CI/CD integration, team training
- Week 4+: Use for all future schema changes
