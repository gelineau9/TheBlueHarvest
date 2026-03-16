-- Migration: Add details JSONB column to accounts table
-- Purpose: Store flexible account data like avatar, bio, display preferences
-- Similar to profiles.details pattern

ALTER TABLE accounts
ADD COLUMN details JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN accounts.details IS 'Flexible JSON storage for account data (avatar, bio, etc.)';
