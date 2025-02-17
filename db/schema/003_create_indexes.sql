-- ======================================
-- INDEXES (Examples)
-- ======================================
CREATE UNIQUE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_characters_account_id ON characters(account_id);
CREATE INDEX idx_characters_last_accessed ON characters(last_accessed_at DESC); -- allows us to sort recently accessed characters easily
CREATE INDEX idx_posts_character ON posts(container_id) WHERE container_type = 'character'; -- partial index for character posts if we expect most posts are done by characters not accounts
CREATE INDEX idx_comments_post_id ON comments(post_id); -- index since we will query often for showing comments
CREATE INDEX idx_objects_container ON objects(container_type, container_id); -- polymorphic index
CREATE INDEX idx_media_container ON media(container_type, container_id); -- polymorphic index
CREATE INDEX idx_posts_container ON posts(container_type, container_id); -- polymorphic indexes
CREATE INDEX idx_comments_container ON comments(commenter_type, commenter_id); -- polymorphic index
