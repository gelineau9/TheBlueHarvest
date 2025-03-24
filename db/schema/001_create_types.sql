-- 001_create_types.sql

----------------------------------
-- Type tables
----------------------------------

-- profile Types
CREATE TABLE profile_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL
);
-- Example of profile types:
INSERT INTO profile_types (type_name) 
VALUES ('character'), ('item'), ('kinship'), ('organization');

-- account's user_role Types
CREATE TABLE user_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);
-- Example user_roles
INSERT INTO user_roles (role_name) 
VALUES ('user'), ('admin'), ('moderator');

-- relationship Types
CREATE TABLE relationship_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    is_bidirectional BOOLEAN DEFAULT FALSE
)
-- Example relationship_types
INSERT INTO relationship_types (type_name, is_bidirectional) 
VALUES ('parent', FALSE), ('child', FALSE), ('friend', TRUE), 
        ('enemy', TRUE), ('ally', TRUE), ('other', FALSE);

-- post Types
CREATE TABLE post_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    type_description TEXT -- 
);
-- Example of post types:
INSERT INTO post_types (type_name, type_description) 
VALUES ('story', 'A narrative post'), ('art', 'Visual artwork'), 
        ('recipe', 'Cooking instructions'), ('event', 'Post describing an event'),
        ('other', 'Miscellaneous content');


----------------------------------
-- Custom ENUMs
----------------------------------

CREATE TYPE relationship_direction AS ENUM ('forward', 'backward', 'both');