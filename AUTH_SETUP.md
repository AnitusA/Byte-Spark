# Auth User ID Setup Guide

## What Changed

I've added an `auth_user_id` column to the members table to properly link member records with Supabase Auth users. This is a cleaner approach that:

- **Separates concerns**: Member ID stays independent, auth link is explicit
- **Prevents conflicts**: No more deleting/recreating records to match IDs
- **Makes debugging easier**: Clear visibility of who is linked to whom

## Setup Steps

### Step 1: Run the Migration

In your **Supabase SQL Editor**, run this file:
📄 [add-auth-link.sql](add-auth-link.sql)

This will:
- Add the `auth_user_id` column to members table
- Create an index for performance
- Automatically link existing members to their auth accounts (if they exist)

### Step 2: Verify Your Setup

Run this file to check your data:
📄 [check-user.sql](check-user.sql)

Look for:
- Your GitHub username
- Your role (should be 'organizer')
- Link status (should show 'LINKED' after migration)

### Step 3: Fix Your Role (If Needed)

If your role is not 'organizer', run this command in Supabase SQL Editor:

```sql
UPDATE members 
SET role = 'organizer'
WHERE github_username = 'YOUR_GITHUB_USERNAME_HERE';
```

Replace `YOUR_GITHUB_USERNAME_HERE` with your actual GitHub username (all lowercase).

### Step 4: Test Login

1. **Log out** from the app
2. **Log back in** with GitHub
3. The system will automatically link your auth account
4. You should now have access to the organizer page

## How It Works Now

### Authentication Flow:
1. User logs in with GitHub
2. System extracts GitHub username
3. Checks if username exists in members table ✅ **Authorization Check**
4. If found, links `auth_user_id` to the Supabase Auth user ID
5. User gains access with the role from database

### Benefits:
- ✅ Only pre-registered GitHub usernames can log in
- ✅ Roles are assigned from the database, not created automatically
- ✅ Clean separation between member records and auth records
- ✅ Easy to audit who is linked to what

## Troubleshooting

### "Access Denied: Organizer role required"
**Solution**: Your role in the database is not set to 'organizer'
```sql
UPDATE members SET role = 'organizer' WHERE github_username = 'your-username';
```

### "Authorization denied - GitHub username not found"
**Solution**: Your GitHub username is not in the members table
```sql
INSERT INTO members (name, github_username, role, clan_id) 
VALUES ('Your Name', 'your-github-username', 'organizer', NULL);
```

### Still can't access after setting role to organizer?
1. Check your actual GitHub username: Run query #2 in check-user.sql
2. Ensure it matches exactly in the members table (lowercase)
3. Log out and log back in
4. Check browser console for error messages

## Next Steps

After running the migration:
1. **Log out** from your app
2. **Log back in** to link your account
3. Navigate to `/organizer` - you should have access now!
