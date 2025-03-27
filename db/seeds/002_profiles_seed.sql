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
