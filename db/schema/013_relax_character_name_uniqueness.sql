-- Migration 013: Relax character name uniqueness from global to per-account
--
-- Previously, character names were globally unique across the entire site.
-- This is too restrictive for a community RP platform where multiple players
-- may legitimately have characters with the same name.
--
-- New constraint: a single account cannot have two characters with the same
-- name (case-insensitive), but different accounts may share character names.

DROP INDEX IF EXISTS character_names;

CREATE UNIQUE INDEX character_names ON profiles (account_id, LOWER(name))
    WHERE profile_type_id = 1 AND deleted = false;
