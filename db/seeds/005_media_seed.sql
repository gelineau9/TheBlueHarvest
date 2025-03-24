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
