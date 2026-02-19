-- 004_create_indexes.sql
-- All indexes for performance optimization

----------------------------------
-- ACCOUNTS INDEXES
----------------------------------

CREATE INDEX idx_accounts_username ON accounts (username) WHERE deleted = false;
CREATE INDEX idx_accounts_email ON accounts (email) WHERE deleted = false;

----------------------------------
-- PROFILES INDEXES
----------------------------------

-- Find profiles by owner
CREATE INDEX idx_profiles_account ON profiles (account_id) WHERE deleted = false;

-- Find profiles by type
CREATE INDEX idx_profiles_type ON profiles (profile_type_id) WHERE deleted = false;

-- Search profile details (JSONB)
CREATE INDEX idx_profiles_details ON profiles USING GIN (details);

-- Find child profiles
CREATE INDEX idx_profiles_parent ON profiles (parent_profile_id) WHERE deleted = false AND parent_profile_id IS NOT NULL;

-- Profile name uniqueness scopes
-- Characters: globally unique among characters only (allows cross-type duplicates)
CREATE UNIQUE INDEX character_names ON profiles (LOWER(name)) 
    WHERE profile_type_id = 1 AND deleted = false;

-- Locations: unique per account (multiple users can have same location name)
CREATE UNIQUE INDEX location_names ON profiles (account_id, LOWER(name)) 
    WHERE profile_type_id = 5 AND deleted = false;

-- Items: unique name per account per type (allows cross-type duplicates)
CREATE UNIQUE INDEX item_names ON profiles (account_id, LOWER(name)) 
    WHERE profile_type_id = 2 AND deleted = false;

-- Kinships: unique name per account per type (allows cross-type duplicates)
CREATE UNIQUE INDEX kinship_names ON profiles (account_id, LOWER(name)) 
    WHERE profile_type_id = 3 AND deleted = false;

-- Organizations: unique name per account per type (allows cross-type duplicates)
CREATE UNIQUE INDEX organization_names ON profiles (account_id, LOWER(name)) 
    WHERE profile_type_id = 4 AND deleted = false;

----------------------------------
-- POSTS INDEXES
----------------------------------

-- Find posts by owner
CREATE INDEX idx_posts_account ON posts (account_id) WHERE deleted = false;

-- Find posts by type
CREATE INDEX idx_posts_type ON posts (post_type_id) WHERE deleted = false;

-- Search post content (JSONB)
CREATE INDEX idx_posts_content ON posts USING GIN (content);

-- List posts by creation date
CREATE INDEX idx_posts_created ON posts (created_at DESC) WHERE deleted = false;

----------------------------------
-- COLLECTIONS INDEXES
----------------------------------

-- Find collections by owner
CREATE INDEX idx_collections_account ON collections (account_id) WHERE deleted = false;

-- Find collections by type
CREATE INDEX idx_collections_type ON collections (collection_type_id) WHERE deleted = false;

-- Search collection content (JSONB)
CREATE INDEX idx_collections_content ON collections USING GIN (content);

-- List collections by creation date
CREATE INDEX idx_collections_created ON collections (created_at DESC) WHERE deleted = false;

----------------------------------
-- AUTHORS INDEXES
----------------------------------

-- Find all posts by an author profile
CREATE INDEX idx_authors_profile ON authors (profile_id) WHERE deleted = false;

-- Find all authors for a post
CREATE INDEX idx_authors_post ON authors (post_id) WHERE deleted = false;

----------------------------------
-- COLLECTION AUTHORS INDEXES
----------------------------------

-- Find all collections by an author profile
CREATE INDEX idx_collection_authors_profile ON collection_authors (profile_id) WHERE deleted = false;

-- Find all authors for a collection
CREATE INDEX idx_collection_authors_collection ON collection_authors (collection_id) WHERE deleted = false;

----------------------------------
-- PROFILE EDITORS INDEXES
----------------------------------

-- Find all profiles a user can edit
CREATE INDEX idx_profile_editors_account ON profile_editors (account_id) WHERE deleted = false;

-- Find all editors for a profile
CREATE INDEX idx_profile_editors_profile ON profile_editors (profile_id) WHERE deleted = false;

----------------------------------
-- POST EDITORS INDEXES
----------------------------------

-- Find all posts a user can edit
CREATE INDEX idx_post_editors_account ON post_editors (account_id) WHERE deleted = false;

-- Find all editors for a post
CREATE INDEX idx_post_editors_post ON post_editors (post_id) WHERE deleted = false;

----------------------------------
-- COLLECTION EDITORS INDEXES
----------------------------------

-- Find all collections a user can edit
CREATE INDEX idx_collection_editors_account ON collection_editors (account_id) WHERE deleted = false;

-- Find all editors for a collection
CREATE INDEX idx_collection_editors_collection ON collection_editors (collection_id) WHERE deleted = false;

----------------------------------
-- COLLECTION POSTS INDEXES
----------------------------------

-- Find all collections containing a post
CREATE INDEX idx_collection_posts_post ON collection_posts (post_id);

-- Order posts within a collection
CREATE INDEX idx_collection_posts_sort ON collection_posts (collection_id, sort_order);

----------------------------------
-- MEDIA INDEXES
----------------------------------

CREATE INDEX idx_media_type ON media (media_type);
CREATE INDEX idx_post_media_post ON post_media (post_id);
CREATE INDEX idx_profile_media_profile ON profile_media (profile_id);
CREATE INDEX idx_account_media_account ON account_media (account_id);

----------------------------------
-- COMMENTS INDEXES
----------------------------------

CREATE INDEX idx_comments_post ON comments (post_id) WHERE deleted = false;
CREATE INDEX idx_comments_profile ON comments (profile_id) WHERE deleted = false;

----------------------------------
-- RELATIONSHIPS INDEXES
----------------------------------

CREATE INDEX idx_relationships_profile1 ON relationships (profile_id_1) WHERE deleted = false;
CREATE INDEX idx_relationships_profile2 ON relationships (profile_id_2) WHERE deleted = false;
