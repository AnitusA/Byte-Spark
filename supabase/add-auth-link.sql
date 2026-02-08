-- Add auth_user_id column to members table to link with Supabase Auth users
ALTER TABLE members 
ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);

-- Update existing members: copy their current ID to auth_user_id if they match an auth user
UPDATE members m
SET auth_user_id = au.id
FROM auth.users au
WHERE m.github_username = LOWER(au.raw_user_meta_data->>'user_name')
  AND m.auth_user_id IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN members.auth_user_id IS 'Links member to their Supabase Auth user account';

-- Verify the update
SELECT 
    id,
    name,
    github_username,
    auth_user_id,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN 'LINKED'
        ELSE 'NOT LINKED'
    END as status
FROM members;
