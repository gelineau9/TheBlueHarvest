# Development Archive

This directory contains SQL migration files that were created during iterative
development and have been replaced by consolidated versions.

## Files in this archive:

### Profile Name Uniqueness (Replaced by 007_profile_name_uniqueness.sql)

- **007_update_name_uniqueness.sql** - First iteration: Split character
  uniqueness (global) from other profile types (per-account)
- **008_fix_cross_type_uniqueness.sql** - Second iteration: Added
  profile_type_id to allow cross-type name duplicates
- **009_fix_character_cross_type.sql** - Final iteration: Fixed character
  constraint to allow cross-type duplicates

**Note:** These files are archived for historical reference. Do not apply them
to any database. Use the consolidated version in the main schema directory.
