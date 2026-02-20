-- 001_create_types.sql
-- All type/lookup tables and their seed data

----------------------------------
-- ENUMS
----------------------------------

CREATE TYPE relationship_direction AS ENUM ('bidirectional', 'unidirectional');

----------------------------------
-- PROFILE TYPES
----------------------------------

CREATE TABLE profile_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_description TEXT
);

INSERT INTO profile_types (type_name, type_description) VALUES
('character', 'A character profile'),
('item', 'An item profile'),
('kinship', 'A kinship/group profile'),
('organization', 'An organization profile'),
('location', 'A location profile');

COMMENT ON TABLE profile_types IS 'Defines the types of profiles available. Characters and locations are top-level; items, kinships, and organizations must have a character parent.';

----------------------------------
-- USER ROLES
----------------------------------

CREATE TABLE user_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    role_description TEXT
);

INSERT INTO user_roles (role_name, role_description) VALUES
('user', 'A standard user'),
('admin', 'An administrator with full access'),
('moderator', 'A moderator with limited admin access');

----------------------------------
-- POST TYPES
----------------------------------

CREATE TABLE post_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_description TEXT
);

INSERT INTO post_types (type_name, type_description) VALUES
('writing', 'Stories, narratives, prose'),
('art', 'Visual artwork'),
('media', 'Screenshots, videos, links'),
('event', 'Event announcements and recaps');

----------------------------------
-- COLLECTION TYPES
----------------------------------

CREATE TABLE collection_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    allowed_post_types INT[],  -- NULL = any post type allowed
    type_description TEXT
);

INSERT INTO collection_types (type_name, allowed_post_types, type_description) VALUES
('collection', NULL, 'Generic collection, any post types allowed'),
('chronicle', '{1}', 'Writing posts only'),
('album', '{3}', 'Media posts only'),
('gallery', '{2}', 'Art posts only'),
('event-series', '{4}', 'Event posts only');

COMMENT ON TABLE collection_types IS 'Defines collection types. allowed_post_types constrains which post types can be added (NULL = unrestricted).';
COMMENT ON COLUMN collection_types.allowed_post_types IS 'Array of post_type IDs allowed in this collection type. NULL means any post type.';

----------------------------------
-- RELATIONSHIP TYPES
----------------------------------

CREATE TABLE bidirectional_relationship_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_description TEXT
);

INSERT INTO bidirectional_relationship_types (type_name, type_description) VALUES
('friend', 'A friendly relationship'),
('enemy', 'An enemy relationship'),
('ally', 'An ally relationship');

CREATE TABLE unidirectional_relationship_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_description TEXT
);

INSERT INTO unidirectional_relationship_types (type_name, type_description) VALUES
('parent', 'A parent relationship'),
('child', 'A child relationship'),
('other', 'An other relationship');
