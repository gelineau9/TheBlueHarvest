-- 004_create_triggers.sql

----------------------------------
-- Triggers
----------------------------------

-- Trigger function to update the updated_at field
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for accounts
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for posts
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for media
CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for comments
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Trigger for authors
CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON authors
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();