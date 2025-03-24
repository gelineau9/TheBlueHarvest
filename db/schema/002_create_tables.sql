-- 002_create_tables.sql

----------------------------------
-- Data tables
----------------------------------

-- accounts Table
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    user_role_id INT REFERENCES user_roles(role_id) NOT NULL DEFAULT 
                                                            (SELECT role_id FROM user_roles 
                                                            WHERE role_name = 'user'), 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE
);

-- profiles Table
CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    profile_type_id INT REFERENCES profile_types(type_id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE 
);

-- posts Table
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(account_id) NOT NULL,
    post_type_id INT REFERENCES post_types(type_id) NOT NULL DEFAULT 
                                                            (SELECT type_id FROM post_types 
                                                            WHERE type_name = 'story'), 
    content JSONB NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE    
);

-- authors Table
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE
);

-- Parent media Table
CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    file_size INT,
    file_type VARCHAR(50),  
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- Child Tables for Specific Owners
CREATE TABLE post_media (
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE profile_media (
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE
) INHERITS (media);

CREATE TABLE account_media (
    account_id INT REFERENCES accounts(account_id) ON DELETE CASCADE
) INHERITS (media);

-- comments Table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),  
    deleted BOOLEAN DEFAULT FALSE
);

-- Parent relationships Table
CREATE TABLE relationships (
    relationship_id SERIAL PRIMARY KEY,
    profile_id_1 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    profile_id_2 INT REFERENCES profiles(profile_id) ON DELETE CASCADE,
    type_id INT REFERENCES relationship_types(type_id) ON DELETE CASCADE,
    direction relationship_direction NOT NULL
);

-- Child table: bidirectional
CREATE TABLE bidirectional_relationships (
) INHERITS (relationships);

-- Child Table: Unidirectional Relationships
CREATE TABLE unidirectional_relationships (
) INHERITS (relationships);