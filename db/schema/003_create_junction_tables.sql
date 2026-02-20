-- 003_create_junction_tables.sql
-- Junction/relationship tables linking entities together
-- (authors, editors, collection_posts)

----------------------------------
-- AUTHORS (Posts -> Profiles)
----------------------------------

CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE NOT NULL,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE authors IS 'Junction table linking posts to profile authors. Only character, kinship, and organization profiles can author posts.';
COMMENT ON COLUMN authors.is_primary IS 'Each post must have exactly one primary author for display purposes.';

----------------------------------
-- COLLECTION AUTHORS (Collections -> Profiles)
----------------------------------

CREATE TABLE collection_authors (
    collection_author_id SERIAL PRIMARY KEY,
    collection_id INT REFERENCES collections(collection_id) ON DELETE CASCADE NOT NULL,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE collection_authors IS 'Junction table linking collections to profile authors. Only character, kinship, and organization profiles can author collections.';
COMMENT ON COLUMN collection_authors.is_primary IS 'Each collection must have exactly one primary author for display purposes.';

----------------------------------
-- PROFILE EDITORS (Profiles -> Accounts)
----------------------------------

CREATE TABLE profile_editors (
    editor_id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE NOT NULL,
    invited_by_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE profile_editors IS 'Junction table allowing multiple accounts to edit a single profile. Owner is still determined by profiles.account_id.';
COMMENT ON COLUMN profile_editors.invited_by_account_id IS 'The account that invited this editor. SET NULL on delete to preserve history.';

----------------------------------
-- POST EDITORS (Posts -> Accounts)
----------------------------------

CREATE TABLE post_editors (
    post_editor_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE NOT NULL,
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE NOT NULL,
    invited_by_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE post_editors IS 'Junction table allowing multiple accounts to edit a single post. Owner is still determined by posts.account_id.';
COMMENT ON COLUMN post_editors.invited_by_account_id IS 'The account that invited this editor. SET NULL on delete to preserve history.';

----------------------------------
-- COLLECTION EDITORS (Collections -> Accounts)
----------------------------------

CREATE TABLE collection_editors (
    collection_editor_id SERIAL PRIMARY KEY,
    collection_id INT REFERENCES collections(collection_id) ON DELETE CASCADE NOT NULL,
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE NOT NULL,
    invited_by_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE collection_editors IS 'Junction table allowing multiple accounts to edit a collection. Editors can add/remove posts they own or can edit.';
COMMENT ON COLUMN collection_editors.invited_by_account_id IS 'The account that invited this editor. SET NULL on delete to preserve history.';

----------------------------------
-- COLLECTION POSTS (Collections -> Posts, M:N)
----------------------------------

CREATE TABLE collection_posts (
    collection_id INT REFERENCES collections(collection_id) ON DELETE CASCADE NOT NULL,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE NOT NULL,
    sort_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by_account_id INT REFERENCES accounts(account_id) ON DELETE SET NULL,
    PRIMARY KEY (collection_id, post_id)
);

COMMENT ON TABLE collection_posts IS 'Junction table linking posts to collections (M:N). Posts can belong to multiple collections.';
COMMENT ON COLUMN collection_posts.sort_order IS 'Manual ordering of posts within a collection. Lower numbers appear first.';
COMMENT ON COLUMN collection_posts.added_by_account_id IS 'The account that added this post to the collection. Useful for audit trail.';
