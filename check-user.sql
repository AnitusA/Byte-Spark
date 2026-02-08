-- Run this in your Supabase SQL Editor to check your user data

-- 1. Check all members in the database and their roles
SELECT 
    id,
    name,
    github_username,
    auth_user_id,
    role,
    created_at
FROM members
ORDER BY created_at DESC;

-- 2. Check current auth users (to see your actual GitHub username)
SELECT 
    id,
    email,
    raw_user_meta_data->>'user_name' as github_username,
    raw_user_meta_data->>'preferred_username' as preferred_username,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- 3. Find any mismatches between auth users and members
SELECT 
    au.id as auth_id,
    au.raw_user_meta_data->>'user_name' as github_username,
    m.id as member_id,
    m.auth_user_id,
    m.role,
    CASE 
        WHEN m.auth_user_id = au.id THEN 'LINKED'
        WHEN m.auth_user_id IS NULL THEN 'NOT LINKED'
        ELSE 'LINKED TO DIFFERENT USER'
    END as status
FROM auth.users au
LEFT JOIN members m ON LOWER(au.raw_user_meta_data->>'user_name') = m.github_username;
