-- 005_constraints.sql

----------------------------------
-- Constraints
----------------------------------

-- profiles Table
ALTER TABLE profiles
ADD CONSTRAINT unique_account_name UNIQUE (account_id, name);

-- authors Table
ALTER TABLE authors
ADD CONSTRAINT unique_post_profile UNIQUE (post_id, profile_id);
CREATE UNIQUE INDEX unique_primary_author ON authors (post_id) WHERE is_primary = TRUE;

-- relationships Table
ALTER TABLE relationships
ADD CONSTRAINT profile_id_order CHECK (profile_id_1 < profile_id_2);

-- bidirectional_relationships Table
ALTER TABLE bidirectional_relationships
ADD CONSTRAINT direction_both CHECK (direction = 'both'),
ADD CONSTRAINT bidirectional_type CHECK (
    EXISTS (SELECT 1 FROM relationship_types rt WHERE rt.type_id = bidirectional_relationships.type_id AND rt.is_bidirectional = TRUE)
),
ADD CONSTRAINT unique_bidirectional UNIQUE (profile_id_1, profile_id_2, type_id);

-- unidirectional_relationships Table
ALTER TABLE unidirectional_relationships
ADD CONSTRAINT direction_single CHECK (direction IN ('forward', 'backward')),
ADD CONSTRAINT unidirectional_type CHECK (
    EXISTS (SELECT 1 FROM relationship_types rt WHERE rt.type_id = unidirectional_relationships.type_id AND rt.is_bidirectional = FALSE)
),
ADD CONSTRAINT unique_unidirectional UNIQUE (profile_id_1, profile_id_2, type_id, direction);