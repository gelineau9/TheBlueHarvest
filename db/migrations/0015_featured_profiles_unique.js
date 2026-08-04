/**
 * 0015_featured_profiles_unique.js
 *
 * POST /api/posts/:id/featured upserts with
 *   ON CONFLICT (post_id, profile_id) DO UPDATE SET deleted = false
 * but featured_profiles only ever had two *partial* indexes
 * (WHERE deleted = false). ON CONFLICT requires a matching unique constraint,
 * so every attempt to feature a profile failed with
 *   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
 * and returned a 500 — the feature has never worked in production.
 *
 * The index must be unconditional (not partial) because the upsert deliberately
 * targets soft-deleted rows in order to restore them.
 *
 * Existing duplicates are consolidated first: if any row for a pair is live,
 * the surviving row is made live, then the extras are removed.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    -- Keep the lowest id per pair; if any duplicate was live, the survivor is live
    UPDATE featured_profiles fp
    SET deleted = false
    WHERE fp.deleted = true
      AND fp.featured_profile_id = (
        SELECT MIN(m.featured_profile_id) FROM featured_profiles m
        WHERE m.post_id = fp.post_id AND m.profile_id = fp.profile_id
      )
      AND EXISTS (
        SELECT 1 FROM featured_profiles other
        WHERE other.post_id = fp.post_id
          AND other.profile_id = fp.profile_id
          AND other.deleted = false
      );

    DELETE FROM featured_profiles fp
    USING featured_profiles keep
    WHERE fp.post_id = keep.post_id
      AND fp.profile_id = keep.profile_id
      AND fp.featured_profile_id > keep.featured_profile_id;

    CREATE UNIQUE INDEX featured_profiles_post_profile_key
      ON featured_profiles (post_id, profile_id);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS featured_profiles_post_profile_key;`);
};
