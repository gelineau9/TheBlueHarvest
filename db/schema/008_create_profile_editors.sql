-- 008_create_profile_editors.sql
-- Adds the ability to invite other accounts as editors on profiles
-- Pattern is reusable for post_editors, etc.

----------------------------------
-- Table
----------------------------------

CREATE TABLE profile_editors (
    editor_id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE NOT NULL,
    invited_by_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE,
    
    -- Each account can only be an editor once per profile
    CONSTRAINT unique_profile_editor UNIQUE (profile_id, account_id)
);

----------------------------------
-- Indexes
----------------------------------

-- Find all profiles a user can edit
CREATE INDEX idx_profile_editors_account ON profile_editors (account_id) WHERE deleted = false;

-- Find all editors for a profile
CREATE INDEX idx_profile_editors_profile ON profile_editors (profile_id) WHERE deleted = false;

----------------------------------
-- Comments
----------------------------------

COMMENT ON TABLE profile_editors IS 'Junction table allowing multiple accounts to edit a single profile. Owner is still determined by profiles.account_id.';
COMMENT ON COLUMN profile_editors.invited_by_account_id IS 'The account that invited this editor. SET NULL on delete to preserve history.';
