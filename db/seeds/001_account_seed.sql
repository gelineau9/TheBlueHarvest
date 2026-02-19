----------------------------------
-- Accounts Seed
----------------------------------
-- Password Reference:
-- Deleted-Account: password123
-- elegost: elegost123
-- darkrider77: darkrider123
-- admin_lorien: admin123

INSERT INTO accounts (username, email, hashed_password, user_role_id)
VALUES 
  ('Deleted-Account', 'bha@example.com', '$argon2id$v=19$m=65536,t=3,p=4$u590lwADV35ksKGb2RN8vg$Ci4O17ILSfBOGYFi4wW11ZKejQzqDt7zwc0wCNWR30c', 2),

  ('elegost', 'elegost@example.com', '$argon2id$v=19$m=65536,t=3,p=4$+yRtNz6Nulxb6C4wSN6A8Q$FMZTMxayiowFIINGH8/Yv8Dyj0JmiInbiIw4VeXCn5o', 3),

  ('darkrider77', 'darkrider77@example.com', '$argon2id$v=19$m=65536,t=3,p=4$gwopQcv9u7K6cIOAV0EB8Q$435wepC55PrdRifRN3kbOYpz/9UZ2VE588EEKipzAHM', 1),
  
  ('admin_lorien', 'admin@example.com', '$argon2id$v=19$m=65536,t=3,p=4$iqx/MOyG9OVHchnk7Uruug$EwNZwm+V6M1NPAZM6P/GZtdbGtqoKrtE8RYI6AfUWr0', 2);
