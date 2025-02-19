-- Define ENUM type for user roles
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- Define ENUM type for character relationships
CREATE TYPE relationship_type AS ENUM ('family', 'friend', 'enemy', 'ally', 'other');

-- Define ENUM type for container types (used in objects, posts, media, and comments)
CREATE TYPE container_type AS ENUM ('character', 'account', 'post');

-- Define ENUM type for object types (this is a placeholder; you may want to expand this)
CREATE TYPE object_type AS ENUM ('NPC', 'Item');

-- Define ENUM type for commenter types (character or account)
CREATE TYPE commenter_type AS ENUM ('character', 'account');
