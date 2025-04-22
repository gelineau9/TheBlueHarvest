----------------------------------
-- Accounts Seed
----------------------------------

INSERT INTO accounts (username, email, hashed_password, first_name, last_name, user_role_id)
VALUES 
  ('Deleted-Account', 'bha@example.com', 'hashed_pw0', 'Deleted', 'Account', 2),

  ('bigbootylover69420', 'bigbootylover69420@example.com', 'hashed_pw_1', 'Aranarion', 'ThErAnGeR', 3),

  ('darkrider77', 'darkrider77@example.com', 'hashed_pw_2', 'Dain', 'Shadowmane', 1),
  
  ('admin_lorien', 'admin@example.com', 'hashed_pw_3', 'Galadriel', 'Admin', 2);
