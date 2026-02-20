----------------------------------
-- Media Seed
----------------------------------

-- Three inserts to handle the three media tables (post, profile, account)

-- post_media (media owned by a post, be it a story, art, event, etc.)
INSERT INTO post_media (url, media_type, post_id)
VALUES 
  ('s3://faenor_bree.jpg', 'image/jpeg', 1),
  ('s3://thrandor_axe.webp', 'image/webp', 2),
  ('s3://boiled-chicken.png', 'image/png', 3);

-- Profile_media (media owned by profiles, be it a character, item, kinship, etc.)
INSERT INTO profile_media (url, media_type, profile_id)
VALUES 
  ('s3://faenor_portrait.jpg', 'image/jpeg', 1),
  ('s3://thrandor_portrait.webp', 'image/webp', 2),
  ('s3://sarya_face.png', 'image/png', 3);


-- account_media (media owned by accounts, actually probably not needed and very rare? possibly accound pics? I dunno)

INSERT INTO account_media (url, media_type, account_id)
VALUES 
  ('s3://deleted_portrait.jpg', 'image/jpeg', 1);
