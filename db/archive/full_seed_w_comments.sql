----------------------------------
-- Accounts Seed
----------------------------------

INSERT INTO accounts (username, email, hashed_password, first_name, last_name, user_role_id)
VALUES 
  ('Deleted-Account', 'bha@example.com', 'hashed_pw0', 'Deleted', 'Account', 2),

  ('bigbootylover69420', 'bigbootylover69420@example.com', 'hashed_pw_1', 'Aranarion', 'ThErAnGeR', 3),

  ('darkrider77', 'darkrider77@example.com', 'hashed_pw_2', 'Dain', 'Shadowmane', 1),
  
  ('admin_lorien', 'admin@example.com', 'hashed_pw_3', 'Galadriel', 'Admin', 2);


----------------------------------
-- Profiles Seed
----------------------------------

INSERT INTO profiles (account_id, profile_type_id, name, details)
VALUES 
  -- Profile "owned" by account 2, which is accounts.username = bigbootylover69420
  (2, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Faenor Leafwhisper', 
  '{"race": "Elf", "class": "Loremaster", "biography": "A wandering scholar of Rivendell.", "profile-picture" : "s3:\\edgy-elf.png"}'),
  
  -- Profile "owned" by account 3, which is accounts.username = darkrider77
  (3, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Thrandor Oakenshield', 
  '{"race": "Dwarf", "class": "Guardian", "biography": "A steadfast protector of Erebor.", "profile-picture" : "s3:\\based-dwarf.webp"}');

INSERT INTO profiles (account_id, profile_type_id, name, details, deleted)
VALUES 
  -- Profile "owned" by account 1, which is accounts.username = Deleted-Account
  -- Also inserting this as deleted = TRUE, but when we actually "delete", we 
  -- do a soft delete and UPDATE the row to be owned by this account, and set the 
  -- deleted = TRUE at that point. This being input as deleted = TRUE is just for demo
  (1, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Sarya Nightshade', 
  '{"race": "Human", "class": "Hunter", "biography": "A ranger tracking orcs in Eriador."}', 
  TRUE);


----------------------------------
-- Posts Seed
----------------------------------

INSERT INTO posts (account_id, post_type_id, content)
VALUES 
  -- Account id 2 creates story post 
  -- (this is not what displays, this is the "account owner" of the post)
  -- See "authors" seed/table for what displays
  (2, (SELECT type_id FROM post_types WHERE type_name = 'story'), 
  '{"title": "Arrival in Bree", "body": "Faenor steps into the Prancing Pony, the air thick with pipe smoke and the sound of laughter."}'),

  -- Account id 3 () creates story post 
  -- (this is not what displays, this is the "account owner" of the post)
  (3, (SELECT type_id FROM post_types WHERE type_name = 'story'), 
  '{"title": "Forging a New Axe", "body": "Thrandor labors in the forge, sparks flying as his hammer strikes true."}');

INSERT INTO posts (account_id, post_type_id, content, deleted)
VALUES 
  -- As with the "profiles_seed" example, we would not generate AS deleted = TRUE, this is for demo
  -- Account id 1 (Deleted-User) creates recipe post 
  -- (this is not what displays, this is the "account owner" of the post)
  (1, (SELECT type_id FROM post_types WHERE type_name = 'recipe'), 
  '{"title": "Boiled Chicken", "ingredients": ["chicken", "water"], "steps" : ["Bring water to boil.",  "Put chicken in water.",  "Wait until chicken is boiled."]}', TRUE);


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


----------------------------------
-- Media Seed
----------------------------------

-- Three inserts to handle the three media tables (post, profile, account)

-- post_media (media owned by a post, be it a story, art, event, etc.)
INSERT INTO post_media (filename, url, file_size, file_type, post_id)
VALUES 
  ('faenor_bree.jpg', 's3:\\faenor_bree.jpg', 204800, 'image/jpeg', 1), -- arrival in bree
  ('thrandor_axe.jpg', 's3:\\thrandor_axe.webp', 307200, 'image/webp', 2), -- forging a new axe
  ('boiled-chicken.jpg', 's3:\\boiled-chicken.png', 256000, 'image/png', 3); -- boiled chicken

-- Profile_media (media owned by profiles, be it a character, item, kinship, etc.)
INSERT INTO profile_media (filename, url, file_size, file_type, profile_id)
VALUES 
  ('faenor_portrait.jpg', 's3:\\faenor_portrait.jpg', 204800, 'image/jpeg', 1),
  ('thrandor_portrait.jpg', 's3:\\thrandor_portrait.webp', 307200, 'image/webp', 2),
  ('sarya_face.jpg', 's3:\\sarya_face.png', 256000, 'image/png', 3);


-- account_media (media owned by accounts, actually probably not needed and very rare? possibly accound pics? I dunno)

INSERT INTO account_media (filename, url, file_size, file_type, account_id)
VALUES 
  ('deleted-user_portrait.jpg', 's3:\\deleted_portrait.jpg', 204800, 'image/jpeg', 1);


----------------------------------
-- Comments Seed
----------------------------------

INSERT INTO comments (post_id, profile_id, content)
VALUES 
-- Post 1 is Arrival in Bree, commented by profile Thrandor Oakenshield
  (1, 2, 'Welcome to Bree, traveler. Keep an eye out for brigands!'), 
-- Post 2 is Forging a New Axe, commented by profile Faenor Leafwhisper
  (2, 1, 'A fine axe indeed. May it serve you well in battle.');

-- Adding deleted comment like others
INSERT INTO comments (post_id, profile_id, content, deleted)
VALUES 
  -- Post 3 is Boiled chicken, commented by profile Sarya Nightshade
  (3, 3, 'I love the smell of boiled chicken in the morning', TRUE); 

----------------------------------
-- Relationships Seed
----------------------------------

-- Inserting bidirectional friendship between Faenor and Thrandor
INSERT INTO bidirectional_relationships (profile_id_1, profile_id_2, type_id, direction) 
VALUES 
    (1, 2, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'both');

-- Inserting unidirectional parenthood where profile 1 (Faenor) is profile 2's (Thrandor) parent
-- Don't think about the logistics
INSERT INTO unidirectional_relationships (profile_id_1, profile_id_2, type_id, direction) 
VALUES 
    (1, 2, (SELECT type_id FROM unidirectional_relationship_types WHERE type_name = 'parent'), 'forward');