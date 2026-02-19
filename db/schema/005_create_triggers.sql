-- 005_create_triggers.sql
-- All trigger functions and triggers for automatic updates

----------------------------------
-- UPDATE MODIFIED COLUMN FUNCTION
----------------------------------

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

----------------------------------
-- VALIDATE PARENT IS CHARACTER FUNCTION
----------------------------------

-- Ensures that items, kinships, and organizations have a character parent owned by the same account
CREATE OR REPLACE FUNCTION validate_parent_is_character()
RETURNS TRIGGER AS $$
BEGIN
    -- Characters (type 1) and Locations (type 5) should not have a parent
    IF NEW.profile_type_id IN (1, 5) THEN
        IF NEW.parent_profile_id IS NOT NULL THEN
            RAISE EXCEPTION 'Characters and locations cannot have a parent profile';
        END IF;
        RETURN NEW;
    END IF;
    
    -- Items (2), Kinships (3), and Organizations (4) MUST have a parent
    IF NEW.parent_profile_id IS NULL THEN
        RAISE EXCEPTION 'Items, kinships, and organizations must have a parent character profile';
    END IF;
    
    -- Validate the parent is a character (type 1) owned by the same account
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profile_id = NEW.parent_profile_id 
        AND profile_type_id = 1 
        AND account_id = NEW.account_id
        AND deleted = false
    ) THEN
        RAISE EXCEPTION 'Parent must be a character profile owned by the same account';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

----------------------------------
-- UPDATED_AT TRIGGERS
----------------------------------

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON authors
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

----------------------------------
-- VALIDATION TRIGGERS
----------------------------------

CREATE TRIGGER validate_profile_parent
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE validate_parent_is_character();
