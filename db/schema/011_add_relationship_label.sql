-- Migration: Add label column to bidirectional_relationships
-- and add 'relative' and 'rival' types to bidirectional_relationship_types

-- Add label column to bidirectional_relationships
-- Used for the 'relative' category to store the specific relationship (e.g. "mother", "cousin")
ALTER TABLE bidirectional_relationships
  ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- Add new relationship types
INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'relative', 'A relative relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'relative');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'rival', 'A rival relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'rival');
