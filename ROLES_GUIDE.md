# Role Management Guide

## How Roles Work

The application has three roles:
- **rookie**: Can view leaderboard and their own profile
- **captain**: Can award points to members of their own clan
- **organizer**: Can award points to any rookie across all clans

Roles are stored in the `members` table and linked to users via their GitHub username.

## Setting Up Roles

### Step 1: Create Clans

First, insert some clans into your database:

```sql
-- In Supabase SQL Editor
INSERT INTO clans (name, logo_url) VALUES 
  ('Alpha Bashers', 'https://example.com/alpha.png'),
  ('Beta Warriors', 'https://example.com/beta.png'),
  ('Gamma Knights', 'https://example.com/gamma.png');
```

### Step 2: Assign Roles to Users

After a user logs in with GitHub for the first time, you need to create their member record:

```sql
-- Get the user's ID from Supabase Auth
-- Go to: Supabase Dashboard → Authentication → Users
-- Copy their User UID

-- Insert a new member
INSERT INTO members (id, name, github_username, clan_id, role, avatar_url)
VALUES (
  'paste-user-uid-here',           -- From Supabase Auth Users table
  'John Doe',                       -- Display name
  'johndoe',                        -- Their GitHub username (lowercase)
  (SELECT id FROM clans WHERE name = 'Alpha Bashers' LIMIT 1),  -- Assign to a clan
  'rookie',                         -- Role: 'rookie', 'captain', or 'organizer'
  'https://avatars.githubusercontent.com/u/123456'  -- GitHub avatar URL
);
```

### Step 3: Update Existing User Roles

To change a user's role:

```sql
-- Change user to captain
UPDATE members 
SET role = 'captain' 
WHERE github_username = 'johndoe';

-- Change user to organizer
UPDATE members 
SET role = 'organizer' 
WHERE github_username = 'janedoe';

-- Move user to different clan
UPDATE members 
SET clan_id = (SELECT id FROM clans WHERE name = 'Beta Warriors' LIMIT 1)
WHERE github_username = 'johndoe';
```

## Quick Setup Example

Here's a complete example to set up test users:

```sql
-- 1. Get clan IDs
SELECT id, name FROM clans;

-- 2. After users log in, check their auth IDs
-- Go to Supabase Dashboard → Authentication → Users

-- 3. Create member records (replace with actual values)
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  ('auth-id-1', 'Alice Rookie', 'alice', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'rookie'),
  ('auth-id-2', 'Bob Captain', 'bob', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'captain'),
  ('auth-id-3', 'Charlie Organizer', 'charlie', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'organizer');
```

## Automatic User Creation (Optional)

If you want users to be automatically created on first login, you can enhance the auth callback. See `auth.callback.enhanced.tsx` for an example implementation.

## Checking Current Roles

```sql
-- View all members and their roles
SELECT 
  m.name,
  m.github_username,
  m.role,
  c.name as clan_name
FROM members m
LEFT JOIN clans c ON m.clan_id = c.id
ORDER BY m.role, m.name;
```

## Role-Based Access Summary

| Role | View Leaderboard | View Profiles | Award Points | Scope |
|------|-----------------|---------------|--------------|-------|
| rookie | ✅ | ✅ (own) | ❌ | - |
| captain | ✅ | ✅ (all) | ✅ | Own clan only |
| organizer | ✅ | ✅ (all) | ✅ | All rookies |
