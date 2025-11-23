# Supabase Quick Start - ERIC AI

**TL;DR**: 5-minute setup to get your app working with Supabase

## 1️⃣ Create Supabase Project (2 min)
```
→ Go to https://supabase.com
→ Sign up (free tier)
→ Create new project
→ Wait for DB to provision (~2 min)
```

## 2️⃣ Get API Keys (1 min)
```
→ Project Settings → API
→ Copy URL and Anon Key
```

## 3️⃣ Create Database Table (1 min)
Go to **SQL Editor** → Copy & Run this:

```sql
CREATE TABLE matchups (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  data JSONB,
  sources JSONB,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_matchups_timestamp ON matchups(timestamp DESC);
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON matchups FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON matchups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON matchups FOR UPDATE USING (true);
```

## 4️⃣ Add Environment Variables (1 min)
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
VITE_API_KEY=your-gemini-key-here
```

## 5️⃣ Install & Run (install time varies)
```bash
npm install
npm run dev
```

## ✅ Done!
Open http://localhost:5173 and test it out!

---

## 🔍 Verify It Works

1. Select a game
2. Wait for analysis
3. Check console: Should see `[STORAGE] Saved ... to Supabase`
4. Refresh page
5. Select same game again
6. Should see `[STORAGE] Hit Supabase Cache for ...` ✅

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Local Storage Mode" | Check `.env.local` credentials are correct |
| "permission-denied" errors | Re-run the RLS policy SQL in Supabase |
| Games not caching | Check `matchups` table exists and has rows |

See `SUPABASE_MIGRATION_GUIDE.md` for detailed help.
