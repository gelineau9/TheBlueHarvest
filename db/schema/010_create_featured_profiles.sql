-- 010_create_featured_profiles.sql
-- Junction table linking posts to featured profiles
-- Any profile type can be featured in writing (1), art (2), or media (3) posts.
-- Events (4) do not support featured profiles.

CREATE TABLE featured_profiles (
    featured_profile_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE NOT NULL,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE NOT NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE featured_profiles IS 'Junction table linking posts to profiles that are featured/mentioned in them. Supported for writing, art, and media posts only (not events).';

CREATE INDEX idx_featured_profiles_post_id ON featured_profiles(post_id) WHERE deleted = false;
CREATE INDEX idx_featured_profiles_profile_id ON featured_profiles(profile_id) WHERE deleted = false;
