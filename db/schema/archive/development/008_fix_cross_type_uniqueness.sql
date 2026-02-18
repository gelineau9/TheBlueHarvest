-- 008_fix_cross_type_uniqueness.sql
-- Fix uniqueness constraints to allow same name across different profile types
-- Example: Character "Rohan" + Location "Rohan" should be allowed in same account

-- Step 1: Drop the overly restrictive constraint
DROP INDEX IF EXISTS unique_other_profile_name_per_account;

-- Step 2: Create new constraint that includes profile_type_id
-- This allows: Item "Rangers" + Organization "Rangers" in same account
-- But prevents: Item "Rangers" + Item "Rangers" in same account
CREATE UNIQUE INDEX unique_other_profile_name_per_account_and_type 
ON profiles (account_id, profile_type_id, name) 
WHERE profile_type_id IN (2, 3, 4, 5) AND deleted = false;

COMMENT ON INDEX unique_other_profile_name_per_account_and_type IS 'Items, Kinships, Organizations, and Locations must have unique names per account per type (allows cross-type duplicates)';
