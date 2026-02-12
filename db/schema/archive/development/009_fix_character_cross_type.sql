-- 009_fix_character_cross_type.sql
-- Fix character uniqueness to allow same name for different profile types
-- This allows: Character "Rohan" + Location "Rohan" in same/different accounts

-- Step 1: Drop the global character name constraint
DROP INDEX IF EXISTS unique_character_name_global;

-- Step 2: Create new constraint that allows characters with same names as other profile types
-- Characters are still globally unique among other characters
CREATE UNIQUE INDEX unique_character_name_global_per_type
ON profiles (profile_type_id, name) 
WHERE profile_type_id = 1 AND deleted = false;

COMMENT ON INDEX unique_character_name_global_per_type IS 'Character names must be globally unique among characters only (allows cross-type duplicates like Character "Rohan" + Location "Rohan")';
