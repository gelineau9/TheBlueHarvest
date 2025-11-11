# Entity Relationship Diagram - The Blue Harvest

## Overview

The Blue Harvest database uses PostgreSQL with a sophisticated schema design featuring table inheritance, JSONB fields, and custom ENUM types. The schema supports a multi-faceted social platform for Lord of the Rings role-playing communities.

## Database Architecture Patterns

### Table Inheritance
The schema uses PostgreSQL table inheritance for:
- **Media tables** - `media` parent with `post_media`, `profile_media`, `account_media` children
- **Relationship tables** - `relationships` parent with `bidirectional_relationships` and `unidirectional_relationships` children

### Flexible Data Storage
- **JSONB fields** used in `posts.content` and `profiles.details` for flexible, schema-less data
- **Custom ENUM types** for relationship directions

### Soft Deletes
All main tables include a `deleted` boolean flag instead of hard deletions, preserving data integrity and audit trails.

## Core Entities

### 1. Accounts
**Table**: `accounts`

User authentication and account information.

**Columns**:
- `account_id` (SERIAL, PK) - Unique account identifier
- `username` (VARCHAR(50), UNIQUE, NOT NULL) - Unique username
- `email` (VARCHAR(100), UNIQUE, NOT NULL) - Unique email address
- `hashed_password` (VARCHAR(255), NOT NULL) - Argon2 hashed password
- `first_name` (VARCHAR(50)) - User's first name
- `last_name` (VARCHAR(50)) - User's last name
- `user_role_id` (INT, FK → user_roles, NOT NULL, DEFAULT 1) - User role reference
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted` (BOOLEAN, DEFAULT FALSE)

**Relationships**:
- Has many `profiles` (1:N)
- Has many `posts` (1:N)
- Has many `account_media` (1:N)
- Has one `user_role` (N:1)

---

### 2. User Roles
**Table**: `user_roles`

Defines system-wide user roles and permissions.

**Columns**:
- `role_id` (SERIAL, PK)
- `role_name` (VARCHAR(50), UNIQUE, NOT NULL)

**Default Values**:
- `user` (role_id: 1)
- `admin` (role_id: 2)
- `moderator` (role_id: 3)

**Relationships**:
- Referenced by many `accounts` (1:N)

---

### 3. Profiles
**Table**: `profiles`

Character, item, kinship, or organization profiles created by users.

**Columns**:
- `profile_id` (SERIAL, PK)
- `account_id` (INT, FK → accounts, NOT NULL) - Owner account
- `profile_type_id` (INT, FK → profile_types, NOT NULL) - Type of profile
- `name` (VARCHAR(100), NOT NULL) - Profile name
- `details` (JSONB) - Flexible JSON data for profile-specific fields
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted` (BOOLEAN, DEFAULT FALSE)

**Constraints**:
- `unique_account_name` - Unique combination of (account_id, name)

**Relationships**:
- Belongs to one `account` (N:1)
- Has one `profile_type` (N:1)
- Has many `profile_media` (1:N)
- Has many `comments` (1:N)
- Has many `authors` entries (1:N) - Can author multiple posts
- Can have many `relationships` with other profiles (N:N)

---

### 4. Profile Types
**Table**: `profile_types`

Defines types of profiles users can create.

**Columns**:
- `type_id` (SERIAL, PK)
- `type_name` (VARCHAR(50), UNIQUE, NOT NULL)

**Default Values**:
- `character` - Represents a character in Middle-earth
- `item` - Represents items, artifacts, or objects
- `kinship` - Represents groups/guilds
- `organization` - Represents organizations or factions

**Relationships**:
- Referenced by many `profiles` (1:N)

---

### 5. Posts
**Table**: `posts`

User-generated content including stories, art, recipes, and events.

**Columns**:
- `post_id` (SERIAL, PK)
- `account_id` (INT, FK → accounts, NOT NULL) - Post creator
- `post_type_id` (INT, FK → post_types, NOT NULL, DEFAULT 1) - Type of post
- `content` (JSONB, NOT NULL) - Flexible post content structure
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted` (BOOLEAN, DEFAULT FALSE)

**Relationships**:
- Belongs to one `account` (N:1)
- Has one `post_type` (N:1)
- Has many `authors` (1:N) - Supports multi-author posts
- Has many `comments` (1:N)
- Has many `post_media` (1:N)

---

### 6. Post Types
**Table**: `post_types`

Defines categories of posts.

**Columns**:
- `type_id` (SERIAL, PK)
- `type_name` (VARCHAR(50), UNIQUE, NOT NULL)
- `type_description` (TEXT) - Description of the post type

**Default Values**:
- `story` - A narrative post
- `art` - Visual artwork
- `recipe` - Cooking instructions
- `event` - Post describing an event
- `other` - Miscellaneous content

**Relationships**:
- Referenced by many `posts` (1:N)

---

### 7. Authors
**Table**: `authors`

Junction table linking profiles to posts, supporting multi-author posts.

**Columns**:
- `author_id` (SERIAL, PK)
- `post_id` (INT, FK → posts, ON DELETE CASCADE)
- `profile_id` (INT, FK → profiles, ON DELETE CASCADE)
- `is_primary` (BOOLEAN, DEFAULT FALSE) - Indicates primary author
- `deleted` (BOOLEAN, DEFAULT FALSE)

**Constraints**:
- `unique_post_profile` - Unique combination of (post_id, profile_id)
- `unique_primary_author` - Only one primary author per post (partial unique index WHERE is_primary = TRUE)

**Relationships**:
- Belongs to one `post` (N:1)
- Belongs to one `profile` (N:1)

---

### 8. Comments
**Table**: `comments`

Comments on posts made by profiles.

**Columns**:
- `comment_id` (SERIAL, PK)
- `post_id` (INT, FK → posts, ON DELETE CASCADE)
- `profile_id` (INT, FK → profiles, ON DELETE CASCADE)
- `content` (TEXT, NOT NULL) - Comment text
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted` (BOOLEAN, DEFAULT FALSE)

**Relationships**:
- Belongs to one `post` (N:1)
- Belongs to one `profile` (N:1)

---

## Media System (Table Inheritance)

### Parent Table: Media
**Table**: `media`

Base table for all media files (not used directly).

**Columns**:
- `media_id` (SERIAL, PK)
- `filename` (VARCHAR(255), NOT NULL)
- `url` (VARCHAR(255), NOT NULL) - Storage URL (likely S3)
- `file_size` (INT) - Size in bytes
- `file_type` (VARCHAR(50)) - MIME type
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `deleted` (BOOLEAN, DEFAULT FALSE)

### Child Tables

#### Post Media
**Table**: `post_media`

Inherits from `media`, adds:
- `post_id` (INT, FK → posts, ON DELETE CASCADE)

#### Profile Media
**Table**: `profile_media`

Inherits from `media`, adds:
- `profile_id` (INT, FK → profiles, ON DELETE CASCADE)

#### Account Media
**Table**: `account_media`

Inherits from `media`, adds:
- `account_id` (INT, FK → accounts, ON DELETE CASCADE)

---

## Relationships System (Table Inheritance)

### Custom ENUM Type
**Type**: `relationship_direction`

Values:
- `forward` - Relationship goes from profile_id_1 → profile_id_2
- `backward` - Relationship goes from profile_id_2 → profile_id_1
- `both` - Bidirectional relationship

### Parent Table: Relationships
**Table**: `relationships`

Base table for profile-to-profile relationships.

**Columns**:
- `relationship_id` (SERIAL, PK)
- `profile_id_1` (INT, FK → profiles, ON DELETE CASCADE)
- `profile_id_2` (INT, FK → profiles, ON DELETE CASCADE)
- `direction` (relationship_direction, NOT NULL)

**Constraints**:
- `profile_id_order` - CHECK(profile_id_1 < profile_id_2) ensures consistent ordering

### Child Tables

#### Bidirectional Relationships
**Table**: `bidirectional_relationships`

Inherits from `relationships`, adds:
- `type_id` (INT, FK → bidirectional_relationship_types, ON DELETE CASCADE)

**Constraints**:
- `direction_both` - CHECK(direction = 'both')
- `unique_bidirectional` - UNIQUE(profile_id_1, profile_id_2, type_id)

**Bidirectional Relationship Types**:
- `friend` - Friendship
- `enemy` - Adversarial relationship
- `ally` - Alliance

#### Unidirectional Relationships
**Table**: `unidirectional_relationships`

Inherits from `relationships`, adds:
- `type_id` (INT, FK → unidirectional_relationship_types, ON DELETE CASCADE)

**Constraints**:
- `direction_single` - CHECK(direction IN ('forward', 'backward'))
- `unique_unidirectional` - UNIQUE(profile_id_1, profile_id_2, type_id, direction)

**Unidirectional Relationship Types**:
- `parent` - Parent-child relationship
- `child` - Child-parent relationship
- `other` - Other directional relationships

---

## Type Reference Tables

### Summary of Type Tables

| Table | Purpose | Default Values |
|-------|---------|----------------|
| `user_roles` | User permission levels | user, admin, moderator |
| `profile_types` | Profile categories | character, item, kinship, organization |
| `post_types` | Post categories | story, art, recipe, event, other |
| `bidirectional_relationship_types` | Mutual relationships | friend, enemy, ally |
| `unidirectional_relationship_types` | Directional relationships | parent, child, other |

---

## Key Design Decisions

### 1. Table Inheritance
**Why?** Allows sharing common columns (filename, url, etc.) while maintaining specific foreign key relationships for different entity types.

**Trade-offs**:
- ✅ Reduces redundancy
- ✅ Easier schema maintenance
- ⚠️ Slightly more complex queries

### 2. JSONB for Content and Details
**Why?** Different post types and profile types have different data requirements that don't fit a rigid schema.

**Examples**:
- Story posts: `{title, body, tags}`
- Event posts: `{title, description, date, location, rsvp_count}`
- Character profiles: `{race, age, backstory, appearance}`
- Item profiles: `{description, owner, history}`

**Benefits**:
- ✅ Flexible schema evolution
- ✅ Supports varying data structures
- ✅ Built-in JSON querying in PostgreSQL

### 3. Soft Deletes
**Why?** Preserve data for audit trails and potential recovery.

**Implementation**: `deleted` boolean flag on all main tables instead of actual deletions.

### 4. Separate Relationship Type Tables
**Why?** Bidirectional and unidirectional relationships have different semantics and constraints.

**Benefit**: Type safety at the database level - prevents incorrect relationship direction assignment.

### 5. Authors as Junction Table
**Why?** Supports multi-author posts (collaborative storytelling) while tracking the primary author.

**Example**: Two players co-writing a story about their characters' adventure.

---

## Entity Relationship Summary

```
accounts (1) ──────< (N) profiles
    │                      │
    │                      ├──< comments
    │                      ├──< authors (junction)
    │                      └──< profile_media
    │
    ├──< posts
    │      │
    │      ├──< authors (junction) >── profiles
    │      ├──< comments
    │      └──< post_media
    │
    └──< account_media

profiles (N) ──< relationships >── (N) profiles
    ├── bidirectional_relationships (friend, enemy, ally)
    └── unidirectional_relationships (parent, child, other)
```

---

## Database Initialization Order

As defined in the schema files:

1. **001_create_types.sql** - Type reference tables
2. **002_create_tables.sql** - Main data tables
3. **003_create_indexes.sql** - Performance indexes
4. **004_create_triggers.sql** - Automated timestamp updates
5. **005_constraints.sql** - Data integrity constraints

---

## Future Considerations

### Potential Additions
- **Notifications** table for user alerts
- **Events** table separate from posts for structured event management
- **RSVP** junction table for event attendance
- **Tags** system for posts and profiles
- **Reactions** table for emoji/like reactions to posts
- **Direct messages** for private communication

### Scaling Considerations
- Partitioning for large `posts` and `comments` tables
- Archival strategy for old/deleted content
- Read replicas for query performance
- Caching layer for frequently accessed data
