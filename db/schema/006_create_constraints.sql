-- 006_create_constraints.sql
-- All constraints for data integrity

----------------------------------
-- PROFILES CONSTRAINTS
----------------------------------

-- Ensure account ownership is consistent with parent profile ownership
-- (handled by validate_parent_is_character trigger, but adding explicit constraint for clarity)
ALTER TABLE profiles 
    ADD CONSTRAINT check_ownership_hierarchy 
    CHECK (
        -- Characters and locations: no parent required
        (profile_type_id IN (1, 5) AND parent_profile_id IS NULL) OR
        -- Items, kinships, organizations: parent required (trigger validates it's a character)
        (profile_type_id IN (2, 3, 4) AND parent_profile_id IS NOT NULL)
    );

----------------------------------
-- AUTHORS CONSTRAINTS
----------------------------------

-- Each profile can only be an author once per post
ALTER TABLE authors 
    ADD CONSTRAINT unique_post_profile UNIQUE (post_id, profile_id);

-- Only one primary author per post (partial unique index)
CREATE UNIQUE INDEX unique_primary_author 
    ON authors (post_id) 
    WHERE is_primary = TRUE AND deleted = FALSE;

----------------------------------
-- COLLECTION AUTHORS CONSTRAINTS
----------------------------------

-- Each profile can only be an author once per collection
ALTER TABLE collection_authors 
    ADD CONSTRAINT unique_collection_profile UNIQUE (collection_id, profile_id);

-- Only one primary author per collection (partial unique index)
CREATE UNIQUE INDEX unique_primary_collection_author 
    ON collection_authors (collection_id) 
    WHERE is_primary = TRUE AND deleted = FALSE;

----------------------------------
-- PROFILE EDITORS CONSTRAINTS
----------------------------------

-- Each account can only be an editor once per profile
ALTER TABLE profile_editors 
    ADD CONSTRAINT unique_profile_editor UNIQUE (profile_id, account_id);

----------------------------------
-- POST EDITORS CONSTRAINTS
----------------------------------

-- Each account can only be an editor once per post
ALTER TABLE post_editors 
    ADD CONSTRAINT unique_post_editor UNIQUE (post_id, account_id);

----------------------------------
-- COLLECTION EDITORS CONSTRAINTS
----------------------------------

-- Each account can only be an editor once per collection
ALTER TABLE collection_editors 
    ADD CONSTRAINT unique_collection_editor UNIQUE (collection_id, account_id);

----------------------------------
-- RELATIONSHIPS CONSTRAINTS
----------------------------------

-- Prevent self-relationships
ALTER TABLE relationships 
    ADD CONSTRAINT no_self_relationship 
    CHECK (profile_id_1 <> profile_id_2);

-- Ensure bidirectional relationships use the correct direction
ALTER TABLE bidirectional_relationships 
    ADD CONSTRAINT bidirectional_direction 
    CHECK (direction = 'bidirectional');

-- Ensure unidirectional relationships use the correct direction
ALTER TABLE unidirectional_relationships 
    ADD CONSTRAINT unidirectional_direction 
    CHECK (direction = 'unidirectional');
