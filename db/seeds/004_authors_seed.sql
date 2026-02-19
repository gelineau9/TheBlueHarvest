----------------------------------
-- Authors Seed
----------------------------------

-- No seed data for authors
-- Author relationships will be created when posts are created through the application

-- Reference queries:
-- To get all authors' names for a post:
--   SELECT profiles.name FROM authors 
--   JOIN profiles ON authors.profile_id = profiles.profile_id 
--   WHERE authors.post_id = ?;

-- For only PRIMARY authors:
--   SELECT profiles.name FROM authors 
--   JOIN profiles ON authors.profile_id = profiles.profile_id 
--   WHERE authors.post_id = ? AND authors.is_primary = TRUE;

-- To get all posts by an author:
--   SELECT posts.* FROM posts 
--   JOIN authors ON posts.post_id = authors.post_id 
--   WHERE authors.profile_id = ?;
