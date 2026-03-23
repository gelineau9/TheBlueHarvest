----------------------------------
-- Relationships Seed
----------------------------------

-- profile_id reference (after 002_profiles_seed.sql runs):
--  1 = Faenor Leafwhisper     (elegost)
--  2 = Thrandor Oakenshield   (darkrider77)
--  3 = Mira Dunwell           (elegost)
--  4 = Aldric Vane            (darkrider77)
--  5 = Serethi of the Pale Road (admin_lorien)
--  6 = Bogdan Holt            (admin_lorien)
--  7 = Wrynn Ashford          (elegost)
--  8 = Gunnvor                (darkrider77)
--  9 = Tomas Greyveil         (admin_lorien)
-- 10 = Caladwen               (elegost)
-- 11 = Sarya Nightshade       (Deleted-Account, deleted=true)

INSERT INTO bidirectional_relationships (profile_id_1, profile_id_2, type_id, direction)
VALUES
  -- Faenor and Thrandor are friends (the original)
  (1, 2, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional'),

  -- Faenor and Caladwen are colleagues — friends
  (1, 10, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional'),

  -- Mira and Aldric are friends (Bree-area acquaintances)
  (3, 4, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional'),

  -- Mira and Wrynn are friends (Wrynn sells herbs, Mira buys them)
  (3, 7, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional'),

  -- Serethi and Faenor are rivals — old grievance, unresolved
  (1, 5, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'rival'), 'bidirectional'),

  -- Bogdan and Tomas are friends (Tomas carries Bogdan's maps)
  (6, 9, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional'),

  -- Thrandor and Gunnvor are relatives
  (2, 8, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'relative'), 'bidirectional'),

  -- Aldric and Thrandor are friends (blacksmith and guardian, Erebor)
  (2, 4, (SELECT type_id FROM bidirectional_relationship_types WHERE type_name = 'friend'), 'bidirectional');

-- Inserting unidirectional parenthood where profile 1 (Faenor) is profile 2's (Thrandor) parent
-- Don't think about the logistics
INSERT INTO unidirectional_relationships (profile_id_1, profile_id_2, type_id, direction) 
VALUES 
    (1, 2, (SELECT type_id FROM unidirectional_relationship_types WHERE type_name = 'parent'), 'unidirectional');
