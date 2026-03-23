-- Migration 012: Add kinship_members table and ally/enemy relationship types

-- Add 'ally' relationship type (enemy and friend already exist; relative and rival added in 011)
INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'ally', 'An ally relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'ally');

INSERT INTO bidirectional_relationship_types (type_name, type_description)
  SELECT 'enemy', 'An enemy relationship'
  WHERE NOT EXISTS (SELECT 1 FROM bidirectional_relationship_types WHERE type_name = 'enemy');

-- Create kinship_members junction table
-- Tracks which character profiles are members of a given kinship profile
CREATE TABLE IF NOT EXISTS kinship_members (
  kinship_id   INT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kinship_id, character_id)
);
