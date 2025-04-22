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