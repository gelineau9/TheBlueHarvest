-- 007_profile_name_uniqueness.sql
-- Consolidated migration for profile name uniqueness constraints
-- This replaces the original 007, 008, 009 migrations that were created during iterative development

-- DROP OLD CONSTRAINTS (if they exist from previous migrations)
-- This includes the original unique_account_name constraint from 005_constraints.sql
-- and the unique_profile_name_scope index from 006_add_profile_hierarchy.sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS unique_account_name;
DROP INDEX IF EXISTS unique_profile_name_scope;
DROP INDEX IF EXISTS unique_profile_name_per_account;
DROP INDEX IF EXISTS unique_character_name_global;
DROP INDEX IF EXISTS unique_other_names_per_account;
DROP INDEX IF EXISTS unique_other_profile_name_per_account;
DROP INDEX IF EXISTS unique_character_name_global_per_type;
DROP INDEX IF EXISTS unique_location_name_per_account;
DROP INDEX IF EXISTS character_names;
DROP INDEX IF EXISTS profile_names;
DROP INDEX IF EXISTS location_names;


-- CHARACTERS: Globally unique among characters only (allows cross-type duplicates)
-- Example: Character "Rohan" can coexist with Location "Rohan"
CREATE UNIQUE INDEX character_names
ON profiles (profile_type_id, name) 
WHERE profile_type_id = 1 AND deleted = false;

COMMENT ON INDEX character_names IS 
'Character names must be globally unique among characters only (allows cross-type duplicates like Character "Rohan" + Location "Rohan")';

-- ITEMS, KINSHIPS, ORGANIZATIONS: Unique per account and per type
-- Example: User can have Item "Sword" and Kinship "Sword" (different types)
-- But cannot have two Items named "Sword" for the same account
CREATE UNIQUE INDEX profile_names
ON profiles (account_id, profile_type_id, name)
WHERE profile_type_id IN (2, 3, 4) AND deleted = false;

COMMENT ON INDEX profile_names IS 
'Items, Kinships, and Organizations must have unique names per account per type (allows cross-type duplicates)';

-- LOCATIONS: Unique per account only (allows same location name across users)
-- Example: User A and User B can both have Location "Rivendell"
CREATE UNIQUE INDEX location_names
ON profiles (account_id, name)
WHERE profile_type_id = 5 AND deleted = false;

COMMENT ON INDEX location_names IS 
'Location names must be unique per account (multiple users can have same location name)';
