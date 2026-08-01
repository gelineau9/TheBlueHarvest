/**
 * 0014_resources.js
 *
 * Official site content, typed so one table can hold several kinds of
 * resource. Guides are the first type; Discord forum mirrors and live-map
 * data are expected later and slot in as additional resource_types.
 *
 * Write permission is data-driven: each type names the role required to
 * author it (resource_types.required_role_id), so adding a future type plus
 * its role needs no backend change. Admins and moderators override.
 *
 * Fields universal to every resource type are columns; anything type-specific
 * (a guide's rich-text body, a map entry's coordinates) lives in content JSONB.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE resource_types (
      type_id          SERIAL PRIMARY KEY,
      type_name        VARCHAR(50) NOT NULL UNIQUE,
      type_description TEXT,
      required_role_id INT REFERENCES user_roles(role_id)
    );

    COMMENT ON COLUMN resource_types.required_role_id IS
      'Role required to author resources of this type. NULL = admin/moderator only.';

    INSERT INTO resource_types (type_name, type_description, required_role_id)
    VALUES (
      'guide',
      'Official site guides and how-tos',
      (SELECT role_id FROM user_roles WHERE role_name = 'guide_author')
    );

    CREATE TABLE resources (
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

    COMMENT ON COLUMN resources.slug IS
      'Stable public URL segment. Official content is linked from outside the site, so URLs must not be numeric ids.';

    -- Slugs are the public URL, unique among live rows
    CREATE UNIQUE INDEX idx_resources_slug ON resources (slug) WHERE deleted = false;

    -- Serves the public per-type listing
    CREATE INDEX idx_resources_type_published
      ON resources (resource_type_id, is_published, display_order) WHERE deleted = false;

    CREATE TRIGGER update_resources_modtime
      BEFORE UPDATE ON resources
      FOR EACH ROW EXECUTE FUNCTION update_modified_column();
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS resources;
    DROP TABLE IF EXISTS resource_types;
  `);
};
