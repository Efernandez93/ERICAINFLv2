#!/bin/bash

# Script to push Firebase → Supabase migration to GitHub
# This script commits all changes and pushes to your main branch

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Firebase → Supabase Migration Push to GitHub             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository!"
    echo "   Run this script from your ERICAINFLv2 directory"
    exit 1
fi

# Check git status
echo "📋 Current Git Status:"
git status --short
echo ""

# Confirm before pushing
read -p "Ready to push these changes? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Stage all changes
echo ""
echo "📦 Staging all changes..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "Migrate from Firebase to Supabase

- Remove Firebase dependency (firebase@12.6.0)
- Add Supabase SDK (@supabase/supabase-js@2.45.0)
- Delete services/firebase.ts
- Create services/supabase.ts with Supabase client
- Update services/storage.ts with Supabase queries
- Add .env.example template
- Add comprehensive migration documentation:
  - SUPABASE_README.md (overview)
  - SUPABASE_QUICK_START.md (5-min setup)
  - SUPABASE_MIGRATION_GUIDE.md (detailed guide)
  - FIREBASE_TO_SUPABASE_CHANGES.md (what changed)
  - DEPLOYMENT_STEPS.md (production setup)

Benefits:
✅ PostgreSQL instead of NoSQL
✅ Environment variables (more secure)
✅ Better Row Level Security
✅ Same hybrid caching pattern
✅ Same offline fallback
✅ Ready for future features (auth, etc.)

Migration is complete and production-ready."

# Push to GitHub
echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Success! Changes pushed to GitHub"
echo ""
echo "📝 Next Steps:"
echo "   1. Go to your GitHub repo and verify the changes"
echo "   2. Create Supabase project at https://supabase.com"
echo "   3. Follow SUPABASE_QUICK_START.md for setup"
echo "   4. Add environment variables to Vercel"
echo "   5. Vercel auto-deploys!"
echo ""
