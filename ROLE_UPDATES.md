# Role-Based Access Control - Updated

## Changes Made

### 1. Captain Bashers (Captains)
**Previous**: Could award points to all members in their clan
**Now**: Can **only award points to rookies** in their clan

- Captains cannot award points to other captains or organizers
- This ensures proper hierarchy and prevents captains from awarding points to peers

### 2. Organizers
**Previous**: Could award points to all rookies across all clans
**Now**: Can **award points to all captain bashers** across all clans

- Organizers manage and evaluate captain performance
- They award points to captains, not rookies
- This creates a clear management hierarchy: Organizers → Captains → Rookies

### 3. GitHub Username Matching (Auto-Linking)
**New Feature**: Automatic account linking on login

When a user logs in with GitHub:
1. System extracts their GitHub username
2. Checks if a member record with that username exists in the database
3. **If found**: Links the auth account to the existing member record
4. **If not found**: Creates a new member record with default "rookie" role

#### How It Works:

```sql
-- Pre-create members in database with GitHub usernames
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  ('temp-id-1', 'Alice Captain', 'alice', clan_id, 'captain');

-- When 'alice' logs in with GitHub:
-- 1. System finds the record with github_username = 'alice'
-- 2. Updates the 'id' field with her actual Supabase auth ID
-- 3. She's now linked and has 'captain' role automatically!
```

## Updated Workflow

### For Captains:
1. Log in with GitHub
2. Navigate to `/captain`
3. See **only rookies** from your clan
4. Award points to rookies for their performance

### For Organizers:
1. Log in with GitHub
2. Navigate to `/organizer`
3. See **all captain bashers** from all clans
4. Award points to captains for their leadership and management

### For Rookies:
1. Log in with GitHub
2. View leaderboard
3. See your profile and points history
4. Compete for the top position!

## Setup Instructions

### Pre-create Members with GitHub Usernames

```sql
-- Create members BEFORE they log in
-- Use placeholder IDs - they'll be updated on first login
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  -- Captains
  ('placeholder-1', 'Alice Captain', 'alice', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'captain'),
  ('placeholder-2', 'Bob Captain', 'bob', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'captain'),
  
  -- Rookies
  ('placeholder-3', 'Charlie Rookie', 'charlie', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'rookie'),
  ('placeholder-4', 'Diana Rookie', 'diana', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'rookie'),
  
  -- Organizer
  ('placeholder-5', 'Eve Organizer', 'eve', NULL, 'organizer');
```

When these users log in with GitHub:
- Their placeholder ID is replaced with their real Supabase auth ID
- They automatically get their assigned role
- No manual linking required!

## Role Hierarchy

```
Organizers
    ↓ (award points to)
Captain Bashers
    ↓ (award points to)
Rookies
```

## Testing

1. **Create test members** with GitHub usernames in database
2. **Log in** with those GitHub accounts
3. **Verify** automatic linking and role assignment
4. **Test** point awarding based on roles
