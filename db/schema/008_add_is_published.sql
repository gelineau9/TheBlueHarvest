-- Migration: Add is_published column to posts and profiles tables
-- This enables draft functionality - users can save content without publishing it publicly

-- Add is_published to posts table (default TRUE for backwards compatibility)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE NOT NULL;

-- Add is_published to profiles table (default TRUE for backwards compatibility)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE NOT NULL;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_profiles_is_published ON profiles(is_published);

-- Comment on columns for documentation
COMMENT ON COLUMN posts.is_published IS 'Whether the post is publicly visible. FALSE = draft, TRUE = published';
COMMENT ON COLUMN profiles.is_published IS 'Whether the profile is publicly visible. FALSE = draft, TRUE = published';
