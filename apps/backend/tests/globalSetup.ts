/**
 * globalSetup.ts
 *
 * Runs once before all vitest test suites. Applies the full DB schema to the
 * test database so integration tests have the correct tables/types/indexes.
 *
 * This is required in CI where the test Postgres container starts empty.
 * In local dev the schema is already present (applied via docker-entrypoint-initdb.d
 * on first boot), so this is a no-op (CREATE TABLE IF NOT EXISTS / IF NOT EXISTS guards).
 *
 * Execution order mirrors the docker-entrypoint-initdb.d ordering:
 *   001 → 012  (schema files)
 *   then the migration-equivalent DDL for 0002, 0003, 0004, 0005 (IF NOT EXISTS guards)
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const result: Record<string, string> = {};
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

// Resolve env the same way vitest.config.ts does.
const rootEnv = parseEnvFile(path.resolve(__dirname, '../../../.env'));
const testEnv = parseEnvFile(path.resolve(__dirname, '../.env.test'));
const env = { ...rootEnv, ...testEnv };

function get(key: string): string {
  return env[key] ?? process.env[key] ?? '';
}

export async function setup(): Promise<void> {
  const connectionString =
    env['DATABASE_URL'] ||
    process.env['DATABASE_URL'] ||
    `postgres://${get('DB_USER')}:${get('DB_PASSWORD')}@${get('DB_HOST') || 'localhost'}:${get('DB_PORT') || '5432'}/${get('DB_NAME')}`;

  const client = new Client({ connectionString });
  await client.connect();

  const schemaDir = path.resolve(__dirname, '../../../db/schema');

  // All schema files in alphabetical (numeric) order.
  const schemaFiles = [
    '001_create_types.sql',
    '002_create_tables.sql',
    '003_create_junction_tables.sql',
    '004_create_indexes.sql',
    '005_create_triggers.sql',
    '006_create_constraints.sql',
    '007_alter_comments_table.sql',
    '008_add_is_published.sql',
    '009_add_account_details.sql',
    '010_create_featured_profiles.sql',
    '011_add_relationship_label.sql',
    '012_kinship_members_and_rel_types.sql',
  ];

  for (const file of schemaFiles) {
    const filePath = path.join(schemaDir, file);
    if (!existsSync(filePath)) {
      console.warn(`[globalSetup] Schema file not found, skipping: ${file}`);
      continue;
    }
    const sql = readFileSync(filePath, 'utf-8');
    try {
      await client.query(sql);
    } catch (err: any) {
      // Tolerate "already exists" errors so local dev runs don't fail.
      if (!err.message?.includes('already exists')) {
        throw new Error(`[globalSetup] Failed applying ${file}: ${err.message}`);
      }
    }
  }

  // Migration 0002: roles and bans columns (IF NOT EXISTS guards)
  await client.query(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banned_reason TEXT;
  `);

  // Migration 0003: post_likes and comment_likes tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      account_id  INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      post_id     INTEGER NOT NULL REFERENCES posts(post_id)       ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);

    CREATE TABLE IF NOT EXISTS comment_likes (
      account_id  INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      comment_id  INTEGER NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, comment_id)
    );

    CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
  `);

  // Migration 0004: audit_log table
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id           SERIAL PRIMARY KEY,
      actor_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      action_type      TEXT NOT NULL,
      target_type      TEXT,
      target_id        INT,
      metadata         JSONB,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON audit_log(actor_account_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_target     ON audit_log(target_type, target_id);
  `);

  // Migration 0005: suspend + featured_posts
  await client.query(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ DEFAULT NULL;

    CREATE TABLE IF NOT EXISTS featured_posts (
      featured_post_id  SERIAL PRIMARY KEY,
      post_id           INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
      display_order     INT NOT NULL DEFAULT 0,
      created_by        INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT featured_posts_post_id_unique UNIQUE (post_id)
    );
    CREATE INDEX IF NOT EXISTS idx_featured_posts_order ON featured_posts(display_order);
  `);

  // Migration 0006: account_follows + profile_follows
  await client.query(`
    CREATE TABLE IF NOT EXISTS account_follows (
      follower_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      followed_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_id, followed_id),
      CHECK (follower_id <> followed_id)
    );
    CREATE TABLE IF NOT EXISTS profile_follows (
      account_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      profile_id  INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (account_id, profile_id)
    );
  `);

  // Migration 0007: revoked_tokens (JWT blocklist)
  await client.query(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti         TEXT PRIMARY KEY,
      expires_at  TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens (expires_at);
  `);

  // Migration 0008: email verification
  await client.query(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NULL;
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash   TEXT PRIMARY KEY,
      account_id   INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_ver_tokens_account ON email_verification_tokens (account_id);
  `);

  // Migration 0009: password reset
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash   TEXT PRIMARY KEY,
      account_id   INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      expires_at   TIMESTAMPTZ NOT NULL,
      used_at      TIMESTAMPTZ DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pw_reset_tokens_account ON password_reset_tokens (account_id);
  `);

  // Migration 0011: session revocation on password reset
  await client.query(`
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ DEFAULT NULL;
  `);

  // Migration 0012: lowercase email uniqueness
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_idx ON accounts (LOWER(email));
  `);

  // Migration 0013: stacked roles (account_roles junction + guide_author role)
  await client.query(`
    INSERT INTO user_roles (role_name, role_description)
    SELECT 'guide_author', 'May write and publish guides'
    WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE role_name = 'guide_author');

    CREATE TABLE IF NOT EXISTS account_roles (
      account_id  INT REFERENCES accounts(account_id) ON DELETE CASCADE,
      role_id     INT REFERENCES user_roles(role_id)  ON DELETE CASCADE,
      granted_by  INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (account_id, role_id)
    );

    CREATE INDEX IF NOT EXISTS idx_account_roles_account ON account_roles (account_id);
  `);

  // Migration 0014: resources + resource_types
  await client.query(`
    CREATE TABLE IF NOT EXISTS resource_types (
      type_id          SERIAL PRIMARY KEY,
      type_name        VARCHAR(50) NOT NULL UNIQUE,
      type_description TEXT,
      required_role_id INT REFERENCES user_roles(role_id)
    );

    INSERT INTO resource_types (type_name, type_description, required_role_id)
    SELECT 'guide', 'Official site guides and how-tos', (SELECT role_id FROM user_roles WHERE role_name = 'guide_author')
    WHERE NOT EXISTS (SELECT 1 FROM resource_types WHERE type_name = 'guide');

    CREATE TABLE IF NOT EXISTS resources (
      resource_id      SERIAL PRIMARY KEY,
      resource_type_id INT REFERENCES resource_types(type_id) NOT NULL,
      slug             VARCHAR(120) NOT NULL,
      title            VARCHAR(200) NOT NULL,
      summary          TEXT,
      content          JSONB,
      display_order    INT NOT NULL DEFAULT 0,
      is_published     BOOLEAN NOT NULL DEFAULT false,
      created_by       INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      updated_by       INT REFERENCES accounts(account_id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted          BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_slug ON resources (slug) WHERE deleted = false;
    CREATE INDEX IF NOT EXISTS idx_resources_type_published
      ON resources (resource_type_id, is_published, display_order) WHERE deleted = false;
  `);

  await client.end();
  console.log('[globalSetup] Test database schema applied.');
}
