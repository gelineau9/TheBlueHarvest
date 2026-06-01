-- Migration 015: Fix collection_posts table
--
-- The original schema defined collection_posts with a composite PK (collection_id, post_id)
-- and no soft-delete support. The application code requires:
--   - collection_post_id SERIAL (auto-increment primary key)
--   - deleted BOOLEAN (soft delete support)
--   - created_at TIMESTAMPTZ (for audit trail)
--
-- This migration:
--   1. Drops the composite PK constraint
--   2. Adds collection_post_id as a serial PK
--   3. Adds deleted and created_at columns
--   4. Preserves all existing rows

-- Step 1: Drop the existing composite primary key
ALTER TABLE collection_posts DROP CONSTRAINT IF EXISTS collection_posts_pkey;

-- Step 2: Add collection_post_id as serial primary key
ALTER TABLE collection_posts ADD COLUMN IF NOT EXISTS collection_post_id SERIAL;
-- Make it the primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collection_posts_pkey' AND conrelid = 'collection_posts'::regclass
  ) THEN
    ALTER TABLE collection_posts ADD PRIMARY KEY (collection_post_id);
  END IF;
END $$;

-- Step 3: Add deleted column (soft delete support)
ALTER TABLE collection_posts ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Step 4: Add created_at column (replaces added_at semantically)
ALTER TABLE collection_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Ensure a unique constraint exists so duplicate (collection_id, post_id) active rows are prevented
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_posts_unique_active
  ON collection_posts (collection_id, post_id)
  WHERE deleted = false;

COMMENT ON COLUMN collection_posts.collection_post_id IS 'Auto-increment surrogate PK to support soft deletes of the same collection/post pair.';
COMMENT ON COLUMN collection_posts.deleted IS 'Soft delete flag. Deleted rows are kept for audit trail.';
COMMENT ON COLUMN collection_posts.created_at IS 'When this post was added to the collection.';
