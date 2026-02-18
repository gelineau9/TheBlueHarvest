-- 006_add_profile_hierarchy.sql
-- Adds parent-child relationship for profile ownership hierarchy
-- Account-level: Characters (1), Locations (5) - no parent
-- Character-level: Items (2), Kinships (3), Organizations (4) - must have character parent

-- Step 1: Add location profile type
INSERT INTO profile_types (type_name) VALUES ('location');
-- This creates type_id = 5 for locations

-- Step 2: Add the parent_profile_id column
ALTER TABLE profiles 
ADD COLUMN parent_profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE;

-- Step 3: Add CHECK constraint to enforce ownership rules
ALTER TABLE profiles
ADD CONSTRAINT check_ownership_hierarchy 
CHECK (
  -- Characters (1) and Locations (5) cannot have a parent
  (profile_type_id IN (1, 5) AND parent_profile_id IS NULL)
  OR
  -- Items (2), Kinships (3), Organizations (4) must have a character parent
  (profile_type_id IN (2, 3, 4) AND parent_profile_id IS NOT NULL)
);

-- Step 4: Add function to validate parent is a character
CREATE OR REPLACE FUNCTION validate_parent_is_character()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE profile_id = NEW.parent_profile_id 
        AND profile_type_id = 1  -- Must be a character
        AND deleted = false
    ) THEN
      RAISE EXCEPTION 'Parent profile must be an active character';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to validate parent profile
CREATE TRIGGER validate_parent_profile
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_parent_is_character();

-- Step 6: Add index for performance (querying children of a parent)
CREATE INDEX idx_profiles_parent ON profiles(parent_profile_id) WHERE parent_profile_id IS NOT NULL;

-- Step 7: Add index for account + type queries
CREATE INDEX idx_profiles_account_type ON profiles(account_id, profile_type_id) WHERE deleted = false;

-- Step 8: Update unique constraint to be per-parent OR per-account
-- Drop the existing constraint if it exists from migration 006
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS unique_profile_name_per_user;

-- New constraint: Names unique within their scope
-- For account-level profiles: unique per account
-- For character-level profiles: unique per parent character
CREATE UNIQUE INDEX unique_profile_name_scope ON profiles (
  COALESCE(parent_profile_id, -account_id), -- Group by parent OR account
  name
) WHERE deleted = false;

-- This allows:
-- ✓ Account 1 has Character "Frodo" and Location "Frodo's House"
-- ✓ Character "Frodo" has Item "Sting" 
-- ✓ Character "Sam" also has Item "Sting"
-- ✗ Character "Frodo" cannot have two items named "Sting"

COMMENT ON COLUMN profiles.parent_profile_id IS 'For character-level profiles (items, kinships, orgs), references the owning character. NULL for account-level profiles (characters, locations).';
COMMENT ON CONSTRAINT check_ownership_hierarchy ON profiles IS 'Ensures account-level profiles (characters, locations) have no parent, and character-level profiles (items, kinships, orgs) must have a character parent.';
