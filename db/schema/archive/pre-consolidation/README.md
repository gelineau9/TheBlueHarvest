# Pre-Consolidation Schema Files

These files represent the original migration-based schema structure before
consolidation on Feb 19, 2026.

## Why Archived

The schema was consolidated from 14 separate migration files into 6 logical
files to:

- Reduce context complexity for AI assistants
- Provide single source of truth per concern
- Simplify schema comprehension

## Original File Mapping

| Original File                   | Content                          | Consolidated Into                           |
| ------------------------------- | -------------------------------- | ------------------------------------------- |
| 003_create_indexes.sql          | Original indexes                 | 004_create_indexes.sql                      |
| 004_create_triggers.sql         | Original triggers                | 005_create_triggers.sql                     |
| 005_constraints.sql             | Original constraints             | 006_create_constraints.sql                  |
| 006_add_profile_hierarchy.sql   | parent_profile_id, location type | 002_create_tables.sql, 001_create_types.sql |
| 007_profile_name_uniqueness.sql | Profile name indexes             | 004_create_indexes.sql                      |
| 008_create_profile_editors.sql  | profile_editors table            | 003_create_junction_tables.sql              |

## New Consolidated Structure

```
001_create_types.sql        - All type tables + seeds
002_create_tables.sql       - Core entity tables
003_create_junction_tables.sql - Junction/relationship tables
004_create_indexes.sql      - All indexes
005_create_triggers.sql     - All triggers
006_create_constraints.sql  - All constraints
```
