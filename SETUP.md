# Rookies Leaderboard - Setup & Troubleshooting

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Your `.env` file is already configured with Supabase credentials
   - Make sure to enable GitHub OAuth in your Supabase dashboard

3. **Set up database**:
   - Go to your Supabase SQL Editor
   - Run the SQL from `supabase/schema.sql`
   - This creates the `clans`, `members`, and `transactions` tables

4. **Configure GitHub OAuth**:
   - In Supabase Dashboard → Authentication → Providers → GitHub
   - Enable GitHub provider
   - Add your callback URL: `http://localhost:5173/auth/callback`

5. **Run the dev server**:
   ```bash
   npm run dev
   ```

## Fixed Issues

### ✅ Environment Variables Not Loading
**Problem**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` were undefined

**Solution**: Updated `vite.config.ts` to use `loadEnv()` and define environment variables in the `define` section.

### ✅ TypeScript Import Errors
**Problem**: Type imports causing "verbatimModuleSyntax" errors

**Solution**: Changed all type imports to use `import type { ... }` syntax:
```tsx
// Before
import { LoaderFunctionArgs, redirect } from "react-router";

// After
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
```

## Application Structure

- **Login**: `/login` - GitHub OAuth authentication
- **Leaderboard**: `/leaderboard` - View all rookies ranked by points
- **Profile**: `/profile/:id` - View rookie details and transaction history
- **Captain Dashboard**: `/captain` - Award points to your clan members
- **Organizer Dashboard**: `/organizer` - Award points to any rookie

## Role-Based Access

- **Rookies**: Can view leaderboard and their profile
- **Captains**: Can award points to members of their own clan
- **Organizers**: Can award points to any rookie across all clans

Roles are determined by the `role` field in the `members` table and matched against the GitHub username during authentication.
