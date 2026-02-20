-- 002_create_tables.sql
-- Core entity tables (accounts, profiles, posts, collections, media, comments, relationships)

----------------------------------
-- ACCOUNTS
----------------------------------

CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    user_role_id INT REFERENCES user_roles(role_id) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

----------------------------------
-- PROFILES
----------------------------------

CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    profile_type_id INT REFERENCES profile_types(type_id) NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    details JSONB,
    parent_profile_id INT REFERENCES profiles(profile_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE profiles IS 'User-created profiles. Characters and locations are top-level; items, kinships, and organizations must have a character parent.';
COMMENT ON COLUMN profiles.parent_profile_id IS 'For items, kinships, and organizations, this must reference a character profile owned by the same account.';

----------------------------------
-- POSTS
----------------------------------

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    post_type_id INT REFERENCES post_types(type_id) NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE posts IS 'User-created posts. Owner determined by account_id. Visual authorship via authors table.';
COMMENT ON COLUMN posts.title IS 'Post title, max 200 characters.';
COMMENT ON COLUMN posts.content IS 'JSONB containing body, tags, and other type-specific fields.';

----------------------------------
-- COLLECTIONS
----------------------------------

CREATE TABLE collections (
    collection_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    collection_type_id INT REFERENCES collection_types(type_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE collections IS 'Groups of posts. Can be typed (chronicle, gallery, etc.) or generic. Owner determined by account_id.';
COMMENT ON COLUMN collections.collection_type_id IS 'Optional type that constrains which post types can be added. NULL = generic collection.';
COMMENT ON COLUMN collections.title IS 'Collection title, max 200 characters.';
COMMENT ON COLUMN collections.description IS 'Optional longer description of the collection.';
COMMENT ON COLUMN collections.content IS 'JSONB for additional metadata if needed.';

----------------------------------
-- MEDIA (Inheritance)
----------------------------------

CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    url VARCHAR(2083) NOT NULL,
    media_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE post_media (
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE profile_media (
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE account_media (
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE
) INHERITS (media);

----------------------------------
-- COMMENTS
----------------------------------

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

----------------------------------
-- RELATIONSHIPS (Inheritance)
----------------------------------

CREATE TABLE relationships (
    relationship_id SERIAL PRIMARY KEY,
    profile_id_1 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    profile_id_2 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    direction relationship_direction NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE bidirectional_relationships (
    type_id INT REFERENCES bidirectional_relationship_types(type_id)
) INHERITS (relationships);

CREATE TABLE unidirectional_relationships (
    type_id INT REFERENCES unidirectional_relationship_types(type_id)
) INHERITS (relationships);
