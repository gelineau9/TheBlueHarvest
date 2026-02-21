----------------------------------
-- Posts Seed
----------------------------------

INSERT INTO posts (account_id, post_type_id, title, content)
VALUES 
  (2, 1, 'Arrival in Bree', 
   '{"body": "The rain fell heavy as I passed through the gates of Bree. A new chapter begins.", "tags": ["bree", "travel"]}'),
  
  (3, 1, 'A Dwarf''s Promise', 
   '{"body": "By my beard, I shall not rest until the orcs pay for what they have done.", "tags": ["dwarf", "revenge"]}'),
  
  (2, 1, 'The Prancing Pony', 
   '{"body": "Fine ale and good company. What more could one ask for?", "tags": ["bree", "tavern"]}');
