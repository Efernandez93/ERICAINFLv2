# Firebase → Supabase Migration Guide for ERIC AI

This guide walks you through setting up Supabase for your ERIC AI application. The migration is complete and ready for deployment!

## ✅ What's Been Done

- ✅ Removed Firebase dependency from `package.json`
- ✅ Added Supabase SDK (`@supabase/supabase-js`)
- ✅ Created new `services/supabase.ts` initialization file
- ✅ Updated `services/storage.ts` with Supabase queries
- ✅ Deleted old `services/firebase.ts` file
- ✅ Created `.env.example` with required variables

## 🚀 Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Click "Start your project" and sign up
3. Create a new project (free tier available)
4. Wait for PostgreSQL database to be provisioned (~2 minutes)

## 🔑 Step 2: Get Your Credentials

1. In your Supabase project, go to **Project Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`

## 📊 Step 3: Create Database Table

In Supabase, go to **SQL Editor** and run this query:

```sql
-- Create matchups table
CREATE TABLE IF NOT EXISTS matchups (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  data JSONB,
  sources JSONB,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matchups_timestamp ON matchups(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_matchups_created_at ON matchups(created_at DESC);

-- Enable Row Level Security
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow public read
CREATE POLICY "Allow public read" ON matchups
  FOR SELECT
  USING (true);

-- Allow public write (app caching)
CREATE POLICY "Allow public write" ON matchups
  FOR INSERT
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update" ON matchups
  FOR UPDATE
  USING (true);
```

## 🔐 Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_API_KEY=your-gemini-api-key-here
   ```

## 📦 Step 5: Install Dependencies

```bash
npm install
```

This will install Supabase SDK to replace Firebase.

## ▶️ Step 6: Start the App

```bash
npm run dev
```

The app will:
1. Load cached analyses from Supabase (cloud first)
2. Fall back to browser LocalStorage if offline
3. Display "Cloud Connected" or "Local Storage Mode" in the footer

## 🔄 Data Storage Architecture

### **When you analyze an NFL game:**

1. **Save to Supabase** (Cloud)
   - Table: `matchups`
   - Document ID: Game ID (e.g., `kc-lv-2023`)
   - Fields: timestamp, data, sources, raw_text

2. **Fallback to LocalStorage** (If cloud fails)
   - Key: `eric_ai_cache_v1_[gameId]`
   - 24-hour expiry
   - Auto-pruned when quota exceeded

3. **Circuit Breaker Pattern**
   - If cloud fails → automatically falls back to LocalStorage
   - No spamming of failed requests
   - Auto-recovers on page refresh

## 📋 Database Schema

### `matchups` Table

```sql
Column          | Type      | Purpose
----------------|-----------|--------------------------------------------------
id              | TEXT      | Game ID (primary key, e.g., "kc-lv-2023")
timestamp       | BIGINT    | When analysis was cached (milliseconds)
data            | JSONB     | AnalysisResult object (defenses, legs, rosters)
sources         | JSONB     | Array of GroundingSource citations
raw_text        | TEXT      | Raw AI response for debugging
created_at      | TIMESTAMP | Auto-generated when record created
updated_at      | TIMESTAMP | Auto-generated when record updated
```

## 🧪 Testing the Setup

### Test Connection

Open browser DevTools console and run:
```javascript
// Check if Supabase initialized
console.log(window.supabase);

// Test a read operation
const { data, error } = await supabase
  .from('matchups')
  .select('id')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
```

### Test Cache Operation

1. Select a game in the UI (e.g., "Chiefs vs Raiders")
2. Wait for analysis to complete (30-60 seconds)
3. Check browser console for logs:
   - `[STORAGE] Saved kc-lv-2023 to Supabase` ✅ Cloud save success
   - `[STORAGE] Saved kc-lv-2023 to LocalStorage` ✅ Fallback save
4. Refresh the page
5. Select the same game again
6. Should see: `[STORAGE] Hit Supabase Cache for kc-lv-2023` ✅ Cloud cache hit

## 🛡️ Security Considerations

### Current Setup
- **Public read/write access** - Anyone can read/write to the matchups table
- ✅ Good for: Shared cache, no authentication needed
- ❌ Not good for: Private user data

### If you add authentication later:

Replace RLS policies with:
```sql
-- Only authenticated users can read/write
CREATE POLICY "Authenticated users" ON matchups
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

Then configure Firebase Auth or Supabase Auth.

## 🚢 Deployment to Vercel

1. Add environment variables in Vercel dashboard:
   - Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Add `VITE_API_KEY`

2. Deploy:
   ```bash
   git push origin main
   ```

3. Vercel auto-deploys and your app is live!

## 📝 Migration Checklist

- [ ] Created Supabase project
- [ ] Copied API credentials (URL + Anon Key)
- [ ] Created `matchups` table with SQL
- [ ] Set Row Level Security (RLS) policies
- [ ] Created `.env.local` with credentials
- [ ] Ran `npm install`
- [ ] Started app with `npm run dev`
- [ ] Tested connection in browser console
- [ ] Analyzed a game and verified cache save
- [ ] Refreshed page and verified cache hit
- [ ] (Optional) Pushed to GitHub and deployed to Vercel

## 🆘 Troubleshooting

### App shows "Local Storage Mode"

**Problem**: Cloud connection failed
**Solutions**:
1. Check `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify Supabase project is running (check Supabase dashboard)
3. Check RLS policies are configured correctly
4. Wait a few seconds and refresh - might be a temporary network issue

### Console shows "Supabase Config missing"

**Problem**: Environment variables not loaded
**Solutions**:
1. Make sure you created `.env.local` (not just `.env`)
2. Restart dev server: `npm run dev`
3. Check spelling of variable names (`VITE_` prefix required for Vite)

### "permission-denied" errors

**Problem**: RLS policies not set correctly
**Solutions**:
1. Go to Supabase → SQL Editor
2. Verify the RLS policy SQL ran without errors
3. Check `matchups` table has RLS enabled:
   - In Table Editor, click `matchups` table
   - Check "RLS Enabled" is ON
4. Re-run the RLS policy creation SQL

### Games not showing as "READY" (cached)

**Problem**: Cache not saving to Supabase
**Solutions**:
1. Check browser console for save errors
2. Go to Supabase → Table Editor → `matchups`
3. Manually analyze a game and wait for it to complete
4. Check if new row appears in table
5. If no row, RLS policies are blocking writes

## 📚 File Changes Summary

| File | Change | Reason |
|------|--------|--------|
| `package.json` | Removed `firebase`, added `@supabase/supabase-js` | Swap backend |
| `services/firebase.ts` | Deleted | No longer needed |
| `services/supabase.ts` | Created | New initialization |
| `services/storage.ts` | Updated | Use Supabase queries instead of Firebase |
| `.env.example` | Created | Help with setup |

## 🎉 Done!

Your app now uses Supabase for cloud storage while maintaining the same LocalStorage fallback pattern. The migration is complete and production-ready!

**Questions?** Check the [Supabase docs](https://supabase.com/docs) or [Supabase community](https://discord.supabase.com).
