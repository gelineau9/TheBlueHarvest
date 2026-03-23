----------------------------------
-- Profiles Seed
----------------------------------

INSERT INTO profiles (account_id, profile_type_id, name, details)
VALUES 
  -- elegost (account 2)
  (2, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Faenor Leafwhisper', 
  '{"race": "Elf", "occupation": "Scholar", "residence": "Rivendell", "description": "Spends most of his time in the library arguing with books. Knows three languages and is insufferable about it."}'),
  
  -- darkrider77 (account 3)
  (3, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Thrandor Oakenshield', 
  '{"race": "Dwarf", "occupation": "Guardian", "residence": "Erebor", "age": "183", "description": "Has guarded the eastern gate for sixty years. Refuses to retire. Nephew keeps leaving him food he didn''t ask for."}'),

  -- elegost (account 2)
  (2, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Mira Dunwell',
  '{"race": "Hobbit", "occupation": "Innkeeper", "residence": "Michel Delving", "age": "42", "description": "Runs the Dusty Mug on the main road. Good ale, bad hours. Her regulars have been the same twelve people for twenty years."}'),

  -- darkrider77 (account 3)
  (3, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Aldric Vane',
  '{"race": "Human", "occupation": "Blacksmith", "residence": "Bree", "age": "38", "description": "Makes horseshoes mostly. Did one sword for a ranger a few years back and hasn''t stopped bringing it up."}'),

  -- admin_lorien (account 4)
  (4, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Serethi of the Pale Road',
  '{"race": "Elf", "occupation": "Wanderer", "kinship": "House of Fenmere", "description": "Left her kin sometime in the second age and hasn''t explained why to anyone''s satisfaction. Keeps showing up in places she wasn''t expected."}'),

  -- admin_lorien (account 4)
  (4, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Bogdan Holt',
  '{"race": "Human", "occupation": "Cartographer", "residence": "Annuminas", "age": "55", "description": "Has mapped most of Eriador twice over. The second time was because he didn''t trust the first."}'),

  -- elegost (account 2)
  (2, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Wrynn Ashford',
  '{"race": "Human", "occupation": "Herbalist", "residence": "Combe", "age": "29", "appearance": "Short, usually has dirt on her hands.", "description": "Sells remedies out of a wagon. Some of them work."}'),

  -- darkrider77 (account 3)
  (3, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Gunnvor',
  '{"race": "Dwarf", "occupation": "Miner", "kinship": "Longbeards", "age": "210", "description": "Doesn''t talk much. Found a vein of mithril once and told no one for three weeks while she thought about what to do with that information."}'),

  -- admin_lorien (account 4)
  (4, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Tomas Greyveil',
  '{"race": "Human", "occupation": "Messenger", "residence": "Weathertop area", "age": "24", "description": "Hired by the Dunedain to carry letters. Has not read any of them. Probably."}'),

  -- elegost (account 2)
  (2, (SELECT type_id FROM profile_types WHERE type_name = 'character'),
  'Caladwen',
  '{"race": "Half-elf", "occupation": "Healer", "residence": "Imladris", "description": "Works in the healing halls. Has a lot of opinions about which herbs Elrond is using wrong. Has not shared these opinions with Elrond."}');

INSERT INTO profiles (account_id, profile_type_id, name, details, deleted)
VALUES 
  -- Profile "owned" by account 1, which is accounts.username = Deleted-Account
  -- Also inserting this as deleted = TRUE, but when we actually "delete", we 
  -- do a soft delete and UPDATE the row to be owned by this account, and set the 
  -- deleted = TRUE at that point. This being input as deleted = TRUE is just for demo
  (1, (SELECT type_id FROM profile_types WHERE type_name = 'character'), 
  'Sarya Nightshade', 
  '{"race": "Human", "occupation": "Hunter", "description": "A ranger tracking orcs in Eriador."}', 
  TRUE);
