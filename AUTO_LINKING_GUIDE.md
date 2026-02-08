# GitHub Username Auto-Linking - How It Works

## The Problem
When users are pre-created in the database with placeholder IDs (like `'temp-1'` or `'placeholder-captain-1'`), we need to link them to their real Supabase auth ID when they log in with GitHub.

## The Solution
The auth callback now uses a **delete-and-recreate** strategy:

### Step-by-Step Process:

1. **User logs in with GitHub**
   - System extracts their GitHub username from OAuth metadata
   - Example: User "alice" logs in

2. **Find existing member**
   ```sql
   SELECT * FROM members WHERE github_username = 'alice'
   ```
   - If found: Member exists with placeholder ID
   - Example: `id = 'temp-captain-1'`, `role = 'captain'`

3. **Preserve user data**
   - Get all transactions for this member
   - Store member details (name, role, clan_id, etc.)

4. **Delete placeholder record**
   ```sql
   DELETE FROM members WHERE github_username = 'alice'
   ```

5. **Create new record with real auth ID**
   ```sql
   INSERT INTO members (id, name, github_username, clan_id, role, avatar_url)
   VALUES (
     'real-supabase-auth-id',  -- From GitHub OAuth
     'Alice Captain',
     'alice',
     clan_id,
     'captain',  -- Preserved from old record
     avatar_url
   )
   ```

6. **Re-link transactions**
   ```sql
   UPDATE transactions 
   SET member_id = 'real-supabase-auth-id' 
   WHERE member_id = 'temp-captain-1'
   ```

## Setup Instructions

### 1. Pre-create Members with Placeholder IDs

```sql
-- Use any placeholder ID format (will be replaced on login)
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  ('temp-captain-1', 'Alice Captain', 'alice', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'captain'),
  ('temp-captain-2', 'Bob Captain', 'bob', (SELECT id FROM clans WHERE name = 'Beta Warriors'), 'captain'),
  ('temp-org-1', 'Eve Organizer', 'eve', NULL, 'organizer'),
  ('temp-rookie-1', 'Charlie Rookie', 'charlie', (SELECT id FROM clans WHERE name = 'Alpha Bashers'), 'rookie');
```

### 2. Users Log In
When users log in with GitHub:
- System finds their record by `github_username`
- Deletes placeholder record
- Creates new record with real auth ID
- Preserves all data (role, clan, name)
- Re-links all transactions

### 3. Verify Linking
Check the browser console or server logs for:
```
GitHub Login - Username: alice Auth ID: abc123-real-uuid
Found existing member: { id: 'temp-captain-1', name: 'Alice Captain', ... }
Linking account - Old ID: temp-captain-1 New ID: abc123-real-uuid
Successfully linked account!
Re-linked 5 transactions
```

## Debugging

### Check Server Logs
The auth callback now includes console.log statements:
- `GitHub Login - Username: X Auth ID: Y` - User logged in
- `Found existing member` - Placeholder record found
- `Linking account - Old ID: X New ID: Y` - Starting link process
- `Successfully linked account!` - Link completed
- `Re-linked N transactions` - Transactions updated

### Check Database
```sql
-- View all members and their IDs
SELECT id, name, github_username, role FROM members;

-- Check if ID is a real UUID (36 chars with dashes)
SELECT 
  id,
  name,
  github_username,
  CASE 
    WHEN LENGTH(id) = 36 AND id LIKE '%-%-%-%-%' THEN 'Linked'
    ELSE 'Not Linked'
  END as status
FROM members;
```

## Common Issues

### Issue: "Account not linking"
**Solution**: Check browser console and server logs for errors. Ensure:
- GitHub username in database matches GitHub login username exactly (case-insensitive)
- User has permission to delete/insert in members table

### Issue: "Transactions lost after linking"
**Solution**: The system automatically re-links transactions. If they're missing:
```sql
-- Manually re-link transactions
UPDATE transactions 
SET member_id = 'new-auth-id'
WHERE member_id = 'old-placeholder-id';
```

### Issue: "User created as rookie instead of captain"
**Solution**: This happens if no placeholder exists. Pre-create the member first:
```sql
INSERT INTO members (id, name, github_username, clan_id, role) VALUES 
  ('temp-id', 'User Name', 'github-username', clan_id, 'captain');
```

## Benefits

✅ **Automatic**: No manual linking required
✅ **Preserves Data**: Role, clan, name, and transactions are maintained  
✅ **Flexible**: Works with any placeholder ID format
✅ **Debuggable**: Console logs show exactly what's happening
✅ **Safe**: Creates new record only after successful deletion
