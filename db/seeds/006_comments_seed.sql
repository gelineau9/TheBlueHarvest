----------------------------------
-- Comments Seed
----------------------------------

INSERT INTO comments (post_id, profile_id, content)
VALUES 
-- Post 1 is Arrival in Bree, commented by profile Thrandor Oakenshield
  (1, 2, 'Welcome to Bree, traveler. Keep an eye out for brigands!'), 
-- Post 2 is Forging a New Axe, commented by profile Faenor Leafwhisper
  (2, 1, 'A fine axe indeed. May it serve you well in battle.');

-- Adding deleted comment like others
INSERT INTO comments (post_id, profile_id, content, deleted)
VALUES 
  -- Post 3 is Boiled chicken, commented by profile Sarya Nightshade
  (3, 3, 'I love the smell of boiled chicken in the morning', TRUE); 
