-- Quick Setup Script for Rookies Leaderboard
-- Run this in your Supabase SQL Editor after running schema.sql

-- Step 1: Verify clans were created
SELECT * FROM clans;

-- Step 2: Create sample test data (optional - for testing without real users)
-- Note: Replace these IDs with actual Supabase Auth user IDs after users log in

-- Sample rookies (you'll need to replace the IDs with real auth user IDs)
-- To get real IDs: Supabase Dashboard → Authentication → Users → Copy User UID

/*
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  -- Alpha Bashers
  ('replace-with-auth-id-1', 'Alice Rookie', 'alice', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'rookie'),
  ('replace-with-auth-id-2', 'Bob Rookie', 'bob', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'rookie'),
  ('replace-with-auth-id-3', 'Charlie Captain', 'charlie', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'captain'),
  
  -- Beta Warriors
  ('replace-with-auth-id-4', 'Diana Rookie', 'diana', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'rookie'),
  ('replace-with-auth-id-5', 'Eve Rookie', 'eve', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'rookie'),
  
  -- Gamma Knights
  ('replace-with-auth-id-6', 'Frank Rookie', 'frank', (SELECT id FROM clans WHERE name = 'Gamma Knights'), 'rookie'),
  
  -- Organizer (can be in any clan or no clan)
  ('replace-with-auth-id-7', 'Grace Organizer', 'grace', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'organizer');
*/

-- Step 3: After users log in, find their auth IDs
-- Go to: Supabase Dashboard → Authentication → Users
-- Then run this to create their member record:

/*
INSERT INTO members (id, name, github_username, clan_id, role, avatar_url)
VALUES (
  'paste-user-uid-here',                                    -- From Auth Users table
  'Your Name',                                              -- Display name
  'yourgithubusername',                                     -- GitHub username (lowercase)
  (SELECT id FROM clans WHERE name = 'Alpha Bashers'),     -- Choose a clan
  'rookie',                                                 -- 'rookie', 'captain', or 'organizer'
  'https://avatars.githubusercontent.com/u/your-id'        -- GitHub avatar URL
);
*/

-- Step 4: Award some test points (optional)
/*
INSERT INTO transactions (member_id, amount, description, given_by_id) VALUES
  (
    (SELECT id FROM members WHERE github_username = 'alice'),
    100,
    'Great participation in the event!',
    (SELECT id FROM members WHERE github_username = 'charlie')
  ),
  (
    (SELECT id FROM members WHERE github_username = 'bob'),
    75,
    'Excellent teamwork',
    (SELECT id FROM members WHERE github_username = 'charlie')
  );
*/

-- Useful queries for managing roles:

-- View all members with their roles and clans
SELECT 
  m.name,
  m.github_username,
  m.role,
  c.name as clan_name,
  COALESCE(SUM(t.amount), 0) as total_points
FROM members m
LEFT JOIN clans c ON m.clan_id = c.id
LEFT JOIN transactions t ON m.id = t.member_id
GROUP BY m.id, m.name, m.github_username, m.role, c.name
ORDER BY m.role, total_points DESC;

-- Change a user's role
-- UPDATE members SET role = 'captain' WHERE github_username = 'alice';

-- Move a user to a different clan
-- UPDATE members SET clan_id = (SELECT id FROM clans WHERE name = 'Beta Warriors') WHERE github_username = 'alice';
