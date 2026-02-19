-- 003_create_indexes.sql

----------------------------------
-- Indexes
----------------------------------

-- GIN indexes for JSONB columns
CREATE INDEX idx_profiles_details ON profiles USING GIN (details);
CREATE INDEX idx_posts_content ON posts USING GIN (content);

-- Foreign key indexes
CREATE INDEX idx_profiles_account_id ON profiles (account_id);
CREATE INDEX idx_posts_account_id ON posts (account_id);
CREATE INDEX idx_comments_post_id ON comments (post_id);

-- Media indexes
CREATE INDEX idx_media_post_id ON post_media (post_id);
CREATE INDEX idx_media_profile_id ON profile_media (profile_id);
CREATE INDEX idx_media_account_id ON account_media (account_id);
CREATE INDEX idx_media_filename ON media (filename);

-- Relationships indexes
CREATE INDEX idx_bidirectional_profile_id_1 ON bidirectional_relationships (profile_id_1);
CREATE INDEX idx_bidirectional_profile_id_2 ON bidirectional_relationships (profile_id_2);
CREATE INDEX idx_unidirectional_profile_id_1 ON unidirectional_relationships (profile_id_1);
CREATE INDEX idx_unidirectional_profile_id_2 ON unidirectional_relationships (profile_id_2);

-- Sorting by created_at
CREATE INDEX idx_profiles_created_at ON profiles (created_at);
CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_comments_created_at ON comments (created_at);

-- Sorting by updated_at
CREATE INDEX idx_profiles_updated_at ON profiles (updated_at);
CREATE INDEX idx_posts_updated_at ON posts (updated_at);
CREATE INDEX idx_comments_updated_at ON comments (updated_at);

-- Index post_type_id
CREATE INDEX idx_posts_post_type_id ON posts (post_type_id);