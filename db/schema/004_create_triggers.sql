-- ======================================
-- Creating triggers functions
-- ======================================

-- Trigger function to update the updated_at field for all tables
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to ensure container type integrity for objects, posts, media, and comments
CREATE FUNCTION enforce_container_integrity()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.container_type
    WHEN 'character' THEN 
      IF NOT EXISTS (SELECT 1 FROM characters WHERE id = NEW.container_id) THEN
        RAISE EXCEPTION 'Invalid container_id for character';
      END IF;
    WHEN 'account' THEN 
      IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.container_id) THEN
        RAISE EXCEPTION 'Invalid container_id for account';
      END IF;
    WHEN 'post' THEN 
      IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.container_id) THEN
        RAISE EXCEPTION 'Invalid container_id for post';
      END IF;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to ensure commenter type integrity for comments
CREATE OR REPLACE FUNCTION enforce_commenter_fk()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.commenter_type
    WHEN 'character' THEN 
      IF NOT EXISTS (SELECT 1 FROM characters WHERE id = NEW.commenter_id) THEN
        RAISE EXCEPTION 'Invalid commenter_id for character';
      END IF;
    WHEN 'account' THEN 
      IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.commenter_id) THEN
        RAISE EXCEPTION 'Invalid commenter_id for account';
      END IF;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Creating triggers for tables
-- ======================================

-- Trigger for updating accounts updated_at field
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_accounts_updated_at ON accounts IS 'Trigger to update the updated_at field for the accounts table.';

-- Trigger for updating characters updated_at field
CREATE TRIGGER update_characters_updated_at
BEFORE UPDATE ON characters
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_characters_updated_at ON characters IS 'Trigger to update the updated_at field for the characters table.';

-- Trigger for updating objects updated_at field
CREATE TRIGGER update_objects_updated_at
BEFORE UPDATE ON objects
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_objects_updated_at ON objects IS 'Trigger to update the updated_at field for the objects table.';

-- Trigger for enforcing container foreign key integrity in objects table
CREATE TRIGGER enforce_container_fk
BEFORE INSERT OR UPDATE ON objects
FOR EACH ROW EXECUTE FUNCTION enforce_container_integrity();

COMMENT ON TRIGGER enforce_container_fk ON objects IS 'Trigger to enforce container type integrity for objects table.';

-- Trigger for updating posts updated_at field
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_posts_updated_at ON posts IS 'Trigger to update the updated_at field for the posts table.';

-- Trigger for updating comments updated_at field
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_comments_updated_at ON comments IS 'Trigger to update the updated_at field for the comments table.';

-- Trigger for enforcing container foreign key integrity in comments table
CREATE TRIGGER enforce_comments_fk
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION enforce_container_integrity();

COMMENT ON TRIGGER enforce_comments_fk ON comments IS 'Trigger to enforce container type integrity for comments table.';

-- Trigger for updating media updated_at field
CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

COMMENT ON TRIGGER update_media_updated_at ON media IS 'Trigger to update the updated_at field for the media table.';

-- Trigger for enforcing container foreign key integrity in media table
CREATE TRIGGER enforce_media_fk
BEFORE INSERT OR UPDATE ON media
FOR EACH ROW EXECUTE FUNCTION enforce_container_integrity();

COMMENT ON TRIGGER enforce_media_fk ON media IS 'Trigger to enforce container type integrity for media table.';

-- Trigger to enforce the foreign key constraint on comments
CREATE TRIGGER enforce_commenter_fk
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION enforce_commenter_fk();

COMMENT ON TRIGGER enforce_commenter_fk ON comments IS 'Trigger to enforce container type integrity for media table.';
