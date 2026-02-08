# Deploying Rookies Leaderboard to Vercel

## Prerequisites

1. ✅ GitHub account
2. ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
3. ✅ Your code pushed to a GitHub repository

## Step 1: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Rookies Leaderboard"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/rookies-leaderboard.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. **Import** your GitHub repository
4. Vercel will auto-detect React Router settings
5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add each variable from your `.env` file:
     ```
     SUPABASE_URL=your-supabase-url
     SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     GITHUB_CLIENT_ID=your-github-client-id
     GITHUB_CLIENT_SECRET=your-github-client-secret
     ```
6. Click **"Deploy"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? rookies-leaderboard
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET

# Deploy to production
vercel --prod
```

## Step 3: Configure GitHub OAuth Callback

After deployment, you'll get a URL like: `https://rookies-leaderboard.vercel.app`

1. **Update Supabase Auth Settings**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add to **Redirect URLs**: `https://rookies-leaderboard.vercel.app/auth/callback`

2. **Update GitHub OAuth App**:
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Update **Authorization callback URL**: `https://rookies-leaderboard.vercel.app/auth/callback`

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try logging in with GitHub
3. Test all features:
   - Leaderboard
   - Captain dashboard
   - Organizer dashboard
   - Admin page

## Important Notes

### Environment Variables
- ⚠️ **Never commit `.env` to GitHub**
- ✅ `.env` is already in `.gitignore`
- ✅ Set environment variables in Vercel dashboard

### Build Settings (Auto-detected)
Vercel automatically detects:
- **Framework**: React Router
- **Build Command**: `npm run build`
- **Output Directory**: `build/client`
- **Install Command**: `npm install`

### Custom Domain (Optional)
1. Go to your project in Vercel
2. Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### GitHub OAuth Not Working
- Verify callback URL in GitHub OAuth app matches Vercel URL
- Check Supabase redirect URLs include Vercel URL
- Ensure environment variables are set correctly

### 404 Errors
- React Router should handle routing automatically
- If issues persist, check `react-router.config.ts`

## Continuous Deployment

Once connected to GitHub, Vercel automatically:
- ✅ Deploys on every push to `main`
- ✅ Creates preview deployments for pull requests
- ✅ Runs builds and tests

## Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Open project in browser
vercel open

# Remove deployment
vercel remove rookies-leaderboard
```

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Set up custom domain (optional)
3. ✅ Monitor analytics in Vercel dashboard
4. ✅ Set up error tracking (optional - Sentry, etc.)

---

**Your app will be live at**: `https://your-project-name.vercel.app`

Good luck with your deployment! 🚀
