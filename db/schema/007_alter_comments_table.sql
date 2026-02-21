-- Migration: Alter comments table for full comment system support
-- Adds user_id, parent_comment_id for threading, and updates column names

-- Drop the existing comments table (it only has seed data)
DROP TABLE IF EXISTS comments;

-- Recreate with full schema
CREATE TABLE comments (
  comment_id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES accounts(account_id),
  profile_id INTEGER REFERENCES profiles(profile_id), -- optional character attribution
  parent_comment_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE, -- for threading
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
