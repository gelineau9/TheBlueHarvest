/**
 * 0001_initial_schema.js
 *
 * Baseline migration — applies the 12 original schema files in order.
 *
 * These files were previously applied only via docker-entrypoint-initdb.d on
 * fresh Postgres containers. This migration makes the baseline schema
 * reproducible on any existing database via the migration runner.
 *
 * NOTE: If your database was initialised from the schema files directly
 * (i.e. this is an existing installation), mark this migration as already
 * run without executing it:
 *
 *   DATABASE_URL=... npx node-pg-migrate --migrations-dir db/migrations mark-as-run 0001
 *
 * Down migration is intentionally omitted — dropping the entire schema on
 * an existing production database is destructive and must be done manually.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaDir = resolve(__dirname, '../schema');

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  const files = [
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

  for (const file of files) {
    const sql = readFileSync(resolve(schemaDir, file), 'utf8');
    pgm.sql(sql);
  }
};
