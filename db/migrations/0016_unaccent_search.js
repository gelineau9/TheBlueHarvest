/**
 * 0016_unaccent_search.js
 *
 * Archive search matched with a plain ILIKE, so "Crea" never found "Créa" —
 * a real problem on a Tolkien roleplay site, where accented names are common.
 *
 * unaccent() is only STABLE, not IMMUTABLE, so it cannot be used in an index
 * expression directly. The usual workaround is a thin IMMUTABLE wrapper that
 * pins the dictionary explicitly (the two-argument form is immutable in
 * practice; the one-argument form depends on the current search_path).
 *
 * The trigram indexes let `f_unaccent(col) ILIKE '%term%'` use an index rather
 * than scanning — a leading wildcard rules out btree entirely.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE OR REPLACE FUNCTION f_unaccent(text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      PARALLEL SAFE
      STRICT
    AS $$
      SELECT public.unaccent('public.unaccent'::regdictionary, $1)
    $$;

    CREATE INDEX IF NOT EXISTS idx_profiles_name_unaccent
      ON profiles USING gin (f_unaccent(name) gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS idx_posts_title_unaccent
      ON posts USING gin (f_unaccent(title) gin_trgm_ops);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_posts_title_unaccent;
    DROP INDEX IF EXISTS idx_profiles_name_unaccent;
    DROP FUNCTION IF EXISTS f_unaccent(text);
  `);
};
