# ERIC AI - Supabase Edition

Your ERIC AI app has been successfully migrated from Firebase to Supabase! 🎉

## 📚 Documentation Index

Choose the guide that fits your needs:

### 🚀 **Just Want to Get Started?**
→ **[SUPABASE_QUICK_START.md](SUPABASE_QUICK_START.md)** (5 minutes)
- Create Supabase project
- Add API keys
- Run the app

### 🔧 **Need Detailed Setup Instructions?**
→ **[SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md)** (15 minutes)
- Complete step-by-step setup
- Database schema explanation
- Troubleshooting guide
- Security configuration
- Testing instructions

### 📝 **Want to Understand the Changes?**
→ **[FIREBASE_TO_SUPABASE_CHANGES.md](FIREBASE_TO_SUPABASE_CHANGES.md)** (10 minutes)
- What code changed
- Before/after comparisons
- Why changes were made
- Data model mapping

### 🌍 **Ready to Deploy?**
→ **[DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md)** (10 minutes)
- Push to GitHub
- Set environment variables in Vercel
- Verify production deployment
- Troubleshooting

---

## ✅ What's Ready

- ✅ Firebase completely removed
- ✅ Supabase SDK installed
- ✅ All service layer updated
- ✅ Environment variables configured
- ✅ Database schema provided
- ✅ Documentation complete

---

## 🎯 Quick Actions

### Start Development
```bash
npm install
npm run dev
```

### Deploy to Production
```bash
git push origin main
# Vercel auto-deploys!
```

### Check What Changed
```bash
git log --oneline -5
# Shows all migration commits
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ERIC AI App                          │
│  (React + TypeScript + Tailwind CSS)                    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 StorageService                          │
│  (services/storage.ts)                                  │
│  - Hybrid cloud/local caching                           │
│  - Circuit breaker pattern                              │
│  - 24-hour expiry                                       │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
    ┌──────▼──────┐            ┌────────▼────────┐
    │   Supabase  │            │  LocalStorage   │
    │   (Cloud)   │            │   (Fallback)    │
    │             │            │                 │
    │ PostgreSQL  │            │  5MB max        │
    │ Realtime    │            │  Auto-pruned    │
    └─────────────┘            └─────────────────┘
```

---

## 📊 Database Schema

### `matchups` Table
```sql
id              TEXT PRIMARY KEY    -- Game ID (e.g., "kc-lv-2023")
timestamp       BIGINT              -- When cached (milliseconds)
data            JSONB               -- Analysis result object
sources         JSONB               -- Citation sources
raw_text        TEXT                -- Raw AI response
created_at      TIMESTAMP           -- Auto-created
updated_at      TIMESTAMP           -- Auto-updated
```

---

## 🔐 Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_KEY=your-gemini-api-key
```

---

## 🧪 Testing the Setup

### 1. Local Development Test
```bash
npm run dev
# Visit http://localhost:5173
# Select a game and wait for analysis
# Check console for: [STORAGE] Saved ... to Supabase
```

### 2. Cache Hit Test
```
1. Analyze a game (wait for completion)
2. Refresh the page
3. Select the same game again
4. Should instantly load from cache
5. Console shows: [STORAGE] Hit Supabase Cache for ...
```

### 3. Offline Test
```
1. Disconnect internet (or use DevTools offline mode)
2. App still works with LocalStorage cache
3. Console shows: [STORAGE] Hit Local Cache for ...
```

---

## 📱 Features

### Cloud Caching
- Analyzes are stored in Supabase PostgreSQL
- Cross-device sync (analyze on desktop, access on mobile)
- Instant retrieval on subsequent requests

### Local Fallback
- App works offline using browser LocalStorage
- Graceful degradation if cloud fails
- Automatic circuit breaker pattern

### Smart Loading
- 2-stage analysis: Fast roster fetch, then deep analysis
- Real-time streaming of AI reasoning
- Visual feedback on cloud status

### Mobile Responsive
- Touch-friendly UI
- Collapsible sidebar
- Optimized for all screen sizes

---

## 🚀 Next Steps

1. **Today:**
   - Follow SUPABASE_QUICK_START.md
   - Create Supabase project
   - Add environment variables
   - Test locally

2. **Tomorrow:**
   - Deploy to production
   - Set Vercel environment variables
   - Monitor logs

3. **This Week:**
   - Monitor usage
   - Gather feedback
   - Consider additional features (auth, user accounts, etc.)

---

## 💡 Tips & Tricks

### Monitor Database Growth
```bash
# In Supabase dashboard → Logs
# Watch queries in real-time
```

### Check Storage Usage
```bash
# In Supabase dashboard → Database → matchups
# View how many games are cached
```

### Clear Cache (Manual)
```javascript
// In browser console:
localStorage.clear(); // Clears LocalStorage cache
// (Cloud cache cleared via Supabase dashboard)
```

### Enable Production Analytics
```bash
# In Vercel dashboard → Analytics
# Monitor real-time usage
```

---

## ❓ FAQ

**Q: Why Supabase instead of Firebase?**
A: Supabase offers:
- Open-source PostgreSQL (more flexible)
- Better row-level security
- Built-in authentication (when needed)
- More generous free tier
- Better for structured data

**Q: Can I use this offline?**
A: Yes! LocalStorage fallback works completely offline.

**Q: Will my cached data migrate?**
A: No. Old Firebase cache won't appear in Supabase. Users will need to re-analyze games once (30-60 seconds), then they'll be cached in Supabase.

**Q: Can I add user accounts later?**
A: Yes! Supabase has built-in Auth. We can add this feature anytime.

**Q: What if Supabase goes down?**
A: App falls back to LocalStorage. Users won't lose data, just can't sync to cloud temporarily.

---

## 📞 Support

### Need Help?
1. Check the troubleshooting section in SUPABASE_MIGRATION_GUIDE.md
2. Review error messages in browser console
3. Check Supabase project status dashboard
4. Review Supabase documentation: https://supabase.com/docs

### Report an Issue?
Create an issue on GitHub with:
- Error message from console
- Steps to reproduce
- What you expected to happen
- Screenshots if helpful

---

## 📄 Files Changed

| File | Status | Action |
|------|--------|--------|
| `package.json` | Updated | Firebase removed, Supabase added |
| `services/firebase.ts` | Deleted | No longer needed |
| `services/supabase.ts` | Created | New initialization |
| `services/storage.ts` | Updated | Supabase queries |
| `.env.example` | Created | Setup template |
| `App.tsx` | Unchanged | Uses StorageService |
| All other files | Unchanged | No changes needed |

---

## 🎉 You're All Set!

Your ERIC AI app is now powered by Supabase. Happy analyzing! 🏈

**Questions?** See the documentation files above.

**Ready to deploy?** Follow DEPLOYMENT_STEPS.md.

**Want to understand changes?** Read FIREBASE_TO_SUPABASE_CHANGES.md.
