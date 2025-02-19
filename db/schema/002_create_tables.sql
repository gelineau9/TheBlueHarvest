-- ======================================
-- ACCOUNTS TABLE (for user authentication and as container for characters)
-- ======================================
CREATE TABLE accounts  (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL, -- we need to make sure we validate proper email addresses at the app level
  hashed_password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  user_role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,  
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,  
  deleted BOOLEAN DEFAULT FALSE         -- for soft deletion
);

COMMENT ON TABLE accounts IS 'Stores user account information, including authentication details and role.';
COMMENT ON COLUMN accounts.id IS 'Primary key for the accounts table.';
COMMENT ON COLUMN accounts.username IS 'Unique username for authentication and display purposes.';
COMMENT ON COLUMN accounts.email IS 'Email address used for login and notifications.';
COMMENT ON COLUMN accounts.hashed_password IS 'Hashed password for security.';
COMMENT ON COLUMN accounts.first_name IS 'First name of the user.';
COMMENT ON COLUMN accounts.last_name IS 'Last name of the user.';
COMMENT ON COLUMN accounts.user_role IS 'Role of the user (e.g., user, admin, moderator).';
COMMENT ON COLUMN accounts.created_at IS 'Timestamp of when the account was created.';
COMMENT ON COLUMN accounts.updated_at IS 'Timestamp of when the account was last updated.';
COMMENT ON COLUMN accounts.deleted IS 'Soft deletion flag; TRUE means the account is inactive but not removed from the DB.';

-- ======================================
-- CHARACTERS TABLE (each account can have multiple characters)
-- ======================================
CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  account_id INTEGER DEFAULT 1 REFERENCES accounts(id) ON DELETE SET DEFAULT, -- default to a "deleted_account" if needed
  name VARCHAR(100) NOT NULL,
  profile_picture_url TEXT,
  profile JSONB,  -- Each character can have custom profile information
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE characters IS 'Stores character information, linked to the accounts table.';
COMMENT ON COLUMN characters.id IS 'Primary key for the characters table.';
COMMENT ON COLUMN characters.account_id IS 'Foreign key linked to the accounts table.';
COMMENT ON COLUMN characters.name IS 'Name of the character.';
COMMENT ON COLUMN characters.profile_picture_url IS 'URL of the character profile picture.';
COMMENT ON COLUMN characters.profile IS 'JSONB field for storing character details.';
COMMENT ON COLUMN characters.last_accessed_at IS 'Timestamp of when the character was last accessed.';
COMMENT ON COLUMN characters.created_at IS 'Timestamp of when the character was created.';
COMMENT ON COLUMN characters.updated_at IS 'Timestamp of when the character was last updated.';
COMMENT ON COLUMN characters.deleted IS 'Soft deletion flag; TRUE means the character is inactive but not removed from the DB.';

-- ======================================
-- CHARACTER RELATIONSHIPS TABLE (for Family/Friends, etc.)
-- ======================================
CREATE TABLE character_relationships (
  character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
  --relationship_type VARCHAR(50) NOT NULL, -- e.g. 'family', 'friend'
  relationship_type relationship_type NOT NULL, -- using ENUM for fixed values, we can decide what relationships are allowed later. May want to add child to make the family tree easier to code (linked lists woo!)
  CHECK (character_id <> related_character_id), -- to prevent self-referencing relationships
  PRIMARY KEY (character_id, related_character_id, relationship_type)
);

COMMENT ON TABLE character_relationships IS 'Stores relationships between characters.';
COMMENT ON COLUMN character_relationships.character_id IS 'Foreign key linked to the characters table.';
COMMENT ON COLUMN character_relationships.related_character_id IS 'Foreign key linked to the characters table.';
COMMENT ON COLUMN character_relationships.relationship_type IS 'Type of relationship between characters.';

-- ======================================
-- OBJECTS TABLE (for NPC profiles, items, etc. linked to a character)
-- ======================================
CREATE TABLE objects (
  id SERIAL PRIMARY KEY,
  container_id INTEGER,      -- polymorphic: could refer to a character, account, etc. This is who owns the object
  container_type container_type,  -- e.g. 'character', 'account'
  object_type VARCHAR(50) NOT NULL,  -- e.g., 'NPC', 'Item'
  name VARCHAR(100) NOT NULL,
  details JSONB,  -- flexible storage for object attributes
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE objects IS 'Stores objects (e.g., NPCs, items) linked to characters or accounts.';
COMMENT ON COLUMN objects.id IS 'Primary key for the objects table.';
COMMENT ON COLUMN objects.container_id IS 'Foreign key linked to the container (e.g., character, account).';
COMMENT ON COLUMN objects.container_type IS 'Type of container (e.g., character, account).';
COMMENT ON COLUMN objects.object_type IS 'Type of object (e.g., NPC, Item).';
COMMENT ON COLUMN objects.name IS 'Name of the object.';
COMMENT ON COLUMN objects.details IS 'JSONB field for storing object details.';
COMMENT ON COLUMN objects.created_at IS 'Timestamp of when the object was created.';
COMMENT ON COLUMN objects.updated_at IS 'Timestamp of when the object was last updated.';
COMMENT ON COLUMN objects.deleted IS 'Soft deletion flag; TRUE means the object is inactive but not removed from the DB.';

-- ======================================
-- POSTS TABLE (for story posts, kinship posts, etc.)
-- ======================================
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  container_id INTEGER,      -- polymorphic: could refer to a character, account, etc.
  container_type container_type,  -- e.g. 'character', 'account'
  content JSONB,             -- post content (structured as needed)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE posts IS 'Stores posts linked to characters or accounts.';
COMMENT ON COLUMN posts.id IS 'Primary key for the posts table.';
COMMENT ON COLUMN posts.container_id IS 'Foreign key linked to the container (e.g., character, account).';
COMMENT ON COLUMN posts.container_type IS 'Type of container (e.g., character, account).';
COMMENT ON COLUMN posts.content IS 'JSONB field for storing post content.';
COMMENT ON COLUMN posts.created_at IS 'Timestamp of when the post was created.';
COMMENT ON COLUMN posts.updated_at IS 'Timestamp of when the post was last updated.';
COMMENT ON COLUMN posts.deleted IS 'Soft deletion flag; TRUE means the post is inactive but not removed from the DB.';

-- ======================================
-- COMMENTS TABLE (social functions on posts)
-- ======================================
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  commenter_id INTEGER DEFAULT 1, 
  commenter_type commenter_type DEFAULT 'account' NOT NULL, -- e.g., 'account', 'character'
  comment VARCHAR(1000) NOT NULL, -- limited to 1000 characters, we can adjust as needed, if we want no limit, TEXT is an option
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE comments IS 'Stores comments linked to posts.';
COMMENT ON COLUMN comments.id IS 'Primary key for the comments table.';
COMMENT ON COLUMN comments.post_id IS 'Foreign key linked to the posts table.';
COMMENT ON COLUMN comments.commenter_id IS 'Foreign key linked to the commenter (e.g., character, account).';
COMMENT ON COLUMN comments.commenter_type IS 'Type of commenter (e.g., character, account).';
COMMENT ON COLUMN comments.comment IS 'Comment text.';
COMMENT ON COLUMN comments.created_at IS 'Timestamp of when the comment was created.';
COMMENT ON COLUMN comments.updated_at IS 'Timestamp of when the comment was last updated.';
COMMENT ON COLUMN comments.deleted IS 'Soft deletion flag; TRUE means the comment is inactive but not removed from the DB.';

-- ======================================
-- MEDIA TABLE (for image hosting, art, etc.)
-- ======================================
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  container_id INTEGER,
  container_type container_type,
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  uploaded_by INTEGER DEFAULT 1 REFERENCES accounts(id) ON DELETE SET DEFAULT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE media IS 'Stores media files linked to various containers (e.g., characters, accounts, posts).';
COMMENT ON COLUMN media.id IS 'Primary key for the media table.';
COMMENT ON COLUMN media.container_id IS 'Foreign key linked to the container (e.g., character, account, post).';
COMMENT ON COLUMN media.container_type IS 'Type of container (e.g., character, account, post).'; 
COMMENT ON COLUMN media.filename IS 'Name of the media file.';
COMMENT ON COLUMN media.url IS 'URL of the media file.';
COMMENT ON COLUMN media.file_size IS 'Size of the media file in bytes.';
COMMENT ON COLUMN media.file_type IS 'Type of media file (e.g., image/jpeg, video/mp4).';
COMMENT ON COLUMN media.uploaded_by IS 'Foreign key linked to the account that uploaded the media.';
COMMENT ON COLUMN media.created_at IS 'Timestamp of when the media was uploaded.';
COMMENT ON COLUMN media.updated_at IS 'Timestamp of when the media was last updated.';
COMMENT ON COLUMN media.deleted IS 'Soft deletion flag; TRUE means the media is inactive but not removed from the DB.';
