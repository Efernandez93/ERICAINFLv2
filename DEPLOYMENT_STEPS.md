# Deployment Steps - Firebase to Supabase

## Step 1: Update Your GitHub Repository

### Push the changes
```bash
git add .
git commit -m "Migrate from Firebase to Supabase"
git push origin main
```

### Changes being pushed:
- `package.json` - Firebase removed, Supabase added
- `services/supabase.ts` - New file
- `services/storage.ts` - Updated with Supabase queries
- `services/firebase.ts` - DELETED
- `.env.example` - New template
- Documentation files - New guides

---

## Step 2: Local Development Setup

```bash
# 1. Clone or pull the latest code
git pull origin main

# 2. Install new dependencies
npm install

# 3. Create .env.local file
cp .env.example .env.local

# 4. Edit .env.local with your Supabase credentials
# Add:
#   VITE_SUPABASE_URL=your-url
#   VITE_SUPABASE_ANON_KEY=your-key
#   VITE_API_KEY=your-gemini-key

# 5. Start development server
npm run dev
```

---

## Step 3: Deploy to Vercel

### Option A: Automatic Deployment (Recommended)

Vercel auto-deploys when you push to GitHub.

**Just make sure environment variables are set:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your ERIC AI project
3. Go to **Settings** → **Environment Variables**
4. Add three variables:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Anon Key
   - `VITE_API_KEY` = Your Gemini API Key

5. Each variable should have:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Click "Save"
7. Vercel auto-redeploys your app with the new environment variables

**Done!** Your app is now live with Supabase.

### Option B: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Follow the prompts to set environment variables.

---

## Step 4: Verify Production Deployment

1. Visit your live URL: `https://ericainf-lv2.vercel.app`
2. Open browser DevTools (F12)
3. Select a game and run an analysis
4. Check console for: `[STORAGE] Saved ... to Supabase` ✅
5. Refresh the page
6. Select the same game again
7. Should see: `[STORAGE] Hit Supabase Cache for ...` ✅

---

## Step 5: Enable Production Features (Optional)

### Add Custom Domain
```
Vercel Dashboard → Settings → Domains
```

### Enable Analytics
```
Vercel Dashboard → Analytics
```

### Set up GitHub Integration
```
Vercel Dashboard → Deployments
→ Create new Deployment from GitHub
```

---

## Troubleshooting Production Issues

### App shows "Local Storage Mode"
1. Check Vercel environment variables are set
2. Verify Supabase project is running
3. Wait a few minutes - Vercel might still be propagating changes
4. Redeploy: Push to GitHub again or use `vercel --prod`

### 404 Errors
1. Check build was successful: Vercel Dashboard → Deployments
2. Check for build errors in deployment logs
3. Ensure all imports are correct

### Database queries failing
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
2. Check Supabase RLS policies are configured
3. Verify `matchups` table exists in Supabase

---

## Rollback to Firebase (If Needed)

If you need to rollback:

```bash
# Revert to Firebase version
git revert HEAD

# Push to GitHub
git push origin main

# Vercel auto-deploys the old version
```

But we recommend sticking with Supabase - it's more flexible and just as reliable!

---

## Summary

✅ **Migration Complete**
- Local: `npm run dev` - Works with Supabase
- Production: Auto-deploys to Vercel with Supabase

🚀 **Your ERIC AI app is live with Supabase!**
