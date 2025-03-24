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
-- Data tables
----------------------------------

-- accounts Table
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- UNIQUE for auth sanity, but we can relax that if needed
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    user_role_id INT REFERENCES user_roles(role_id) NOT NULL DEFAULT 1, -- Default to 'user' (role_id 1)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE         -- for soft deletion
);

-- profiles Table
CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    profile_type_id INT REFERENCES profile_types(type_id) NOT NULL, -- new type table for profiles
    name VARCHAR(100) NOT NULL,
    details JSONB, -- Flexible profile info (e.g., { "strength": 10, "bio": "A brave soul" }), indexed with GIN
    -- Can also include information like {"Profile-Picture" : "s3:\\hash-profile-pic.jpg"}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE         -- for soft deletion
    UNIQUE (account_id, name) -- Prevents duplicate profiles with the same name per account - optional
);

-- posts Table
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL, -- which account created the post, regardless of the "author" displayed
    post_type_id INT REFERENCES post_types(type_id) NOT NULL DEFAULT (SELECT type_id 
                                                                        FROM post_types 
                                                                        WHERE type_name = 'story'), 
    -- the type of post that has been posted (e.g. "story", "art"), defaulting to "other" type for flexibility
    content JSONB NOT NULL, -- JSONB for future plans of including rich-text formatting. For now can be a simple JSON we add, like { "content" : "This is the content of a post"}
    -- Example of JSONB keys being restricted by post_type (handled by backend validation, not DB):
    -- Story: { "title": "My Tale", "text": "Once upon a time..." }
    -- Art: { "title": "Sunset", "image_url": "s3://hash-sunset-art.jpg" }
    -- Recipe: { "title": "Cake", "ingredients": ["flour", "sugar"], "steps": "Mix and bake" }
    -- Other: { "text": "Freeform content" }
    -- Note: GIN index idx_posts_content supports JSONB queries like: SELECT * FROM posts WHERE content->>'title' = 'My Tale'; 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE         -- for soft deletion
);

-- authors Table
-- Query like `SELECT profile_id FROM authors WHERE post_id = 1 AND is_primary = true` gets the main author, or skip the filter for all authors.
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- Flags the main author (for multi-authorship)
    deleted BOOLEAN DEFAULT FALSE         -- for soft deletion (author removed from post)
    UNIQUE (post_id, profile_id) -- Adding unique constraint so that no post can be authored by the same profile multiple times
);
-- partial unique index on post_id where is_primary = true to ensure only one primary author per post
CREATE UNIQUE INDEX unique_primary_author ON authors (post_id) WHERE is_primary = TRUE;

-- Using inheritance for media Table
-- Parent media Table
CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    file_size INT,
    file_type VARCHAR(50),  
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- Child Tables for Specific Owners
CREATE TABLE post_media (
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE profile_media (
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE account_media (
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE
) INHERITS (media);

-- media table Usage Notes:
-- Insert into post_media for media owned by a post (e.g., INSERT INTO post_media (url, post_id) VALUES ('url', 1);)
-- Query all media with SELECT * FROM media;
-- Query post-specific media with SELECT * FROM post_media WHERE post_id = 1;
-- Add a new owner type (e.g., event) by creating event_media inheriting from media.

-- comments Table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE, -- Post being commented on
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE, -- Commenter
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE         -- for soft deletion
);

----------------------------------
-- Relationship tables (not originally intended for MVP)
----------------------------------

-- Relationship direction type
-- 'forward' means profile_id_1 to profile_id_2
-- 'backward' means profile_id_2 to profile_id_1
-- 'both' means bidirectional
CREATE TYPE relationship_direction AS ENUM ('forward', 'backward', 'both');

-- Explanation of relationships table:
-- redesign of relationships to leverage inheritance to enforce directionality while keeping things elegant and simple for querying (you're welcome devs)
-- developers can query the parent table (relationships) to get all relationships, but inserts must go through the appropriate child table
-- e.g. SELECT * FROM relationships WHERE profile_id_1 = 1; gets all relationships involving a profile, regardless of directionality
-- inserting examples:
-- Bidirectional: 
-- INSERT INTO bidirectional_relationships (profile_id_1, profile_id_2, type_id, direction) VALUES (1, 2, (SELECT type_id FROM relationship_types WHERE type_name = 'friend'), 'both');
-- Unidirectional: 
-- INSERT INTO unidirectional_relationships (profile_id_1, profile_id_2, type_id, direction) VALUES (1, 2, (SELECT type_id FROM relationship_types WHERE type_name = 'parent'), 'forward');
-- trying to insert into the wrong child table (e.g. 'parent' into bidirectional_relationships) will fail because of the CHECK constraints.


-- parent relationships Table
CREATE TABLE relationships (
    relationship_id SERIAL PRIMARY KEY,
    profile_id_1 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    profile_id_2 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    type_id INT REFERENCES relationship_types(type_id) ON DELETE CASCADE,
    direction relationship_direction NOT NULL,
    CHECK (profile_id_1 < profile_id_2)
);

-- Child table: bidirectional
CREATE TABLE bidirectional_relationships (
    CHECK (direction = 'both'),
    --Ensure type_id references only bidirectional types
    CONSTRAINT bidirectional_type CHECK (
        EXISTS (SELECT 1 FROM relationship_types rt WHERE rt.type_id = bidirectional_relationships.type_id AND rt.is_bidirectional = TRUE),
    ),
    UNIQUE (profile_id_1, profile_id_2, type_id)
) INHERITS (relationships);

-- Child Table: Unidirectional Relationships
CREATE TABLE unidirectional_relationships (
    CHECK (direction IN ('forward', 'backward')),
    -- Ensure type_id references only unidirectional types
    CONSTRAINT unidirectional_type CHECK (
        EXISTS (SELECT 1 FROM relationship_types rt WHERE rt.type_id = unidirectional_relationships.type_id AND rt.is_bidirectional = FALSE)
    ),
    UNIQUE (profile_id_1, profile_id_2, type_id, direction)
) INHERITS (relationships);



----------------------------------
-- Indexes
----------------------------------

-- GIN indexes for our JSONB columns
CREATE INDEX idx_profiles_details ON profiles USING GIN (details);
CREATE INDEX idx_posts_content ON posts USING GIN (content);

-- Foreign key indexes
CREATE INDEX idx_profiles_account_id ON profiles (account_id); -- fetch all profiles based on the account_id very often
CREATE INDEX idx_posts_account_id ON posts (account_id); -- fetch all posts by an account_id sort of often, more likely to fetch the authors table to see which authors are to be displayed on a post
CREATE INDEX idx_comments_post_id ON comments (post_id); -- fetch all comments for a specific post (WHERE post_id = X) often

-- Media indexes
CREATE INDEX idx_media_post_id ON media (post_id);
CREATE INDEX idx_media_profile_id ON media (profile_id);
CREATE INDEX idx_media_account_id ON media (account_id);

-- Relationships indexes since child tables don't automatically get indexed based on parent
CREATE INDEX idx_bidirectional_profile_id_1 ON bidirectional_relationships (profile_id_1);
CREATE INDEX idx_bidirectional_profile_id_2 ON bidirectional_relationships (profile_id_2);
CREATE INDEX idx_unidirectional_profile_id_1 ON unidirectional_relationships (profile_id_1);
CREATE INDEX idx_unidirectional_profile_id_2 ON unidirectional_relationships (profile_id_2);

-- Sorting by created_at to find most recent
CREATE INDEX idx_profiles_created_at ON profiles (created_at);
CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_comments_created_at ON comments (created_at);


-- Sorting by updated_at to find most recent updates
CREATE INDEX idx_profiles_updated_at ON profiles (updated_at);
CREATE INDEX idx_posts_updated_at ON posts (updated_at);
CREATE INDEX idx_comments_updated_at ON comments (updated_at);

-- Index post_type_id to speed up filtering by type as posts table grows
CREATE INDEX idx_posts_post_type_id ON posts (post_type_id);

----------------------------------
-- Triggers
----------------------------------

-- Trigger function to update the updated_at field for all tables
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating accounts updated_at field
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for updating profiles updated_at field
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for updating posts updated_at field
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for updating media updated_at field
CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for updating comments updated_at field
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for updating authors updated_at field
CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON authors
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();