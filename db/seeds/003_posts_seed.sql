----------------------------------
-- Posts Seed
----------------------------------

INSERT INTO posts (account_id, post_type_id, content)
VALUES 
  -- Account id 2 creates story post 
  -- (this is not what displays, this is the "account owner" of the post)
  -- See "authors" seed/table for what displays
  (2, (SELECT type_id FROM post_types WHERE type_name = 'story'), 
  '{"title": "Arrival in Bree", "body": "Faenor steps into the Prancing Pony, the air thick with pipe smoke and the sound of laughter."}'),

  -- Account id 3 () creates story post 
  -- (this is not what displays, this is the "account owner" of the post)
  (3, (SELECT type_id FROM post_types WHERE type_name = 'story'), 
  '{"title": "Forging a New Axe", "body": "Thrandor labors in the forge, sparks flying as his hammer strikes true."}'),

INSERT INTO posts (account_id, post_type_id, content, deleted)
VALUES 
  -- As with the "profiles_seed" example, we would not generate AS deleted = TRUE, this is for demo
  -- Account id 1 (Deleted-User) creates recipe post 
  -- (this is not what displays, this is the "account owner" of the post)
  (1, (SELECT type_id FROM post_types WHERE type_name = 'recipe'), 
  '{"title": "Boiled Chicken", "ingredients": ["chicken", "water"], "steps" : ["Bring water to boil.",  "Put chicken in water.",  "Wait until chicken is boiled."]}'),
