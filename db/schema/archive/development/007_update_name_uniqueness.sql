-- 007_update_name_uniqueness.sql
-- Update unique name constraints:
-- - Character names must be globally unique
-- - Other profile types (item, kinship, organization, location) must be unique per account

-- Step 1: Drop existing unique constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS unique_account_name;
DROP INDEX IF EXISTS unique_profile_name_scope;

-- Step 2: Add global uniqueness for character names (type 1)
-- Only non-deleted characters are checked
CREATE UNIQUE INDEX unique_character_name_global 
ON profiles (name) 
WHERE profile_type_id = 1 AND deleted = false;

-- Step 3: Add per-account uniqueness for non-character profiles (types 2, 3, 4, 5)
-- Items, Kinships, Organizations, and Locations can reuse names within the same account
CREATE UNIQUE INDEX unique_other_profile_name_per_account 
ON profiles (account_id, name) 
WHERE profile_type_id IN (2, 3, 4, 5) AND deleted = false;

COMMENT ON INDEX unique_character_name_global IS 'Character names must be globally unique across all accounts';
COMMENT ON INDEX unique_other_profile_name_per_account IS 'Items, Kinships, Organizations, and Locations must have unique names per account';
