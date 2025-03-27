INSERT INTO objects (container_id, container_type, object_type, name, details)
VALUES 
  (1, 'character', 'NPC', 'Eldrin the Wise', '{"race": "Elf", "role": "Lorekeeper", "location": "Rivendell"}'), -- Belongs to character Faenor (container id 1 with type character is Faenor)
  (2, 'character', 'Item', 'Dwarven War Axe', '{"damage": "1d12", "origin": "Forged in Erebor"}'), -- Belongs to character Thrandor (container id 2 with type character is Thrandor)
  (2, 'account', 'Item', 'Elven Cloak', '{"effect": "Grants stealth bonus", "material": "Mithril-threaded fabric"}'), -- Belongs to account bigbootylover69420 (container id 2 with type account is bigbootylover69420)
  (1, 'account', 'NPC', 'Grimm the Grim', '{"race": "Vampire", "role": "Boyfriend", "location": "Mount Doom"}'); -- Belongs to account Deleted-Account (container id 1 with type account is Deleted-Account)
  