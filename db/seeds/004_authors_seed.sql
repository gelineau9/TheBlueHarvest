----------------------------------
-- Authors Seed
----------------------------------

INSERT INTO authors (post_id, profile_id, is_primary)
VALUES 
  -- post ID 1 (Arrival in Bree) has primary author with profile_id 1 ('Faenor Leafwhisper')
  (1, 1, TRUE),

  -- post ID 2 (Forging a New Axe) has primary author with profile_id 2 ('Thrandor Oakenshield')
  (2, 2, TRUE),

  -- post ID 2 (Forging a New Axe) has NON-primary author with profile_id 1 ('Faenor Leafwhisper')
  (2, 1, FALSE);

  -- So, to get all authors' names for post_id = 2, you can do:
  -- SELECT profiles.name FROM authors JOIN profiles on authors.profile_id = profiles.profile_id WHERE authors.post_id = 2; 
  --> returns: 'Thrandor Oakenshield', 'Faenor Leafwhisper'

  -- For only getting PRIMARY authors for post_id = 2:
  -- SELECT profiles.name FROM authors JOIN profiles on authors.profile_id = profiles.profile_id WHERE authors.post_id = 2 AND authors.is_primary = TRUE; 
  --> returns: 'Thrandor Oakenshield'


  -- To get all posts that author 'Faenor Leafwhisper' has contributed to, you can do:
  -- SELECT posts.* FROM posts JOIN authors ON posts.post_id = authors.post_id JOIN profiles ON authors.profile_id = profiles.profile_id WHERE profiles.name = 'Faenor Leafwhisper'; 
  --> returns: 'Arrival in Bree', 'Forging a New Axe'
