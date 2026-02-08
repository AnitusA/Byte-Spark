-- Fix: Set your role to organizer
-- Replace 'your-github-username' with your actual GitHub username (lowercase)

-- Option 1: Update by GitHub username
UPDATE members 
SET role = 'organizer'
WHERE github_username = 'your-github-username';

-- Option 2: Update by auth user ID (if you know your auth ID)
-- UPDATE members 
-- SET role = 'organizer'
-- WHERE id = 'your-auth-user-id';

-- Verify the update
SELECT id, name, github_username, role 
FROM members 
WHERE github_username = 'your-github-username';
