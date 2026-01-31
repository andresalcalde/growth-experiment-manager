# ⚡ Supabase Integration - Quick Start Guide

**Time Required:** 10 minutes to setup, 30 minutes to integrate

---

## 🎯 What You Have

```
✅ @supabase/supabase-js installed
✅ src/lib/supabase.ts (client)
✅ src/lib/database.types.ts (types)
✅ src/hooks/*.ts (3 custom hooks)
✅ supabase-schema.sql (database)
✅ 6 documentation files
```

**Status:** Infrastructure code complete, awaiting Supabase setup

---

## ⚡ 3-Step Setup

### Step 1: Create Supabase Project (5 min)

1. Open [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Settings:
   - **Name:** `growth-experiment-manager`
   - **Password:** (choose strong password)
   - **Region:** (closest to you)
4. Click **"Create project"**
5. Wait ~2 minutes ⏳

### Step 2: Deploy Schema (2 min)

1. In Supabase dashboard → **"SQL Editor"**
2. Click **"New Query"**
3. Open `supabase-schema.sql` from your project
4. Copy ALL contents
5. Paste into SQL Editor
6. Click **"Run"** (or CMD/CTRL + Enter)
7. Should see: ✅ **"Success. No rows returned"**

### Step 3: Configure App (3 min)

1. In Supabase → **Settings** → **API**
2. Copy these two values:
   - **Project URL**
   - **anon public** key
3. In your project root:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
5. Save file

**Test:**
```bash
npm run dev
```

Open browser console. No Supabase errors = ✅ Setup complete!

---

## 🔄 Integration (30 min)

### Main File to Update: `App.tsx`

**Before:**
```typescript
const [experiments, setExperiments] = useState(MOCK_DATA);
```

**After:**
```typescript
import { useExperiments } from './hooks/useExperiments';
const { experiments, updateExperiment } = useExperiments(projectId);
```

**Full example:** See `MIGRATION_EXAMPLE.md`

---

## 📚 Documentation

| File | When to Read |
|------|--------------|
| **QUICK_START.md** | Now (this file) |
| **SUPABASE_README.md** | Overview & links |
| **MIGRATION_EXAMPLE.md** | When coding |
| **SUPABASE_SETUP.md** | Detailed setup |
| **ARCHITECTURE.md** | Understanding system |

---

## ✅ Success Checklist

Setup:
- [ ] Supabase project created
- [ ] Schema deployed (no errors)
- [ ] `.env` file configured
- [ ] `npm run dev` works

Integration:
- [ ] Updated `App.tsx`
- [ ] Tested CRUD operations
- [ ] Verified realtime sync
- [ ] Deployed to production

---

## 🆘 Troubleshooting

**"Missing environment variables"**
→ Create `.env` file with correct keys

**"Relation does not exist"**
→ Run `supabase-schema.sql` in SQL Editor

**Data not showing**
→ Check browser console for errors
→ Verify `.env` values are correct

---

## 🚀 Next Steps

1. Complete 3-step setup above
2. Read `MIGRATION_EXAMPLE.md`
3. Update `App.tsx` with Supabase hooks
4. Test and deploy!

**Total time: ~50 minutes**

---

**Need more details?** → Read `SUPABASE_README.md`
