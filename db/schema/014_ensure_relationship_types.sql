-- Migration 014: Ensure all bidirectional relationship types exist
-- This is a safety migration — inserts any missing types idempotently.
-- Needed because 'ally' was added to 012 after some live databases had already
-- applied that migration, leaving them without the ally type.

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'friend', 'A friendly relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'friend');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'enemy', 'An enemy relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'enemy');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'ally', 'An ally relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'ally');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'relative', 'A relative relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'relative');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'rival', 'A rival relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'rival');
