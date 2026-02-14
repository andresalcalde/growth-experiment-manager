# Supabase Integration – Implementation Plan

## Project: Growth Experiment Manager
## Supabase Project: oumh-hngnwjijtmgpnhba

---

## Phase 1: Database Schema & RLS ✅ DONE

### SQL Migration: `supabase/migration.sql`
Run this entirely in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Paste → Run)

**Tables created:**
1. `profiles` – linked to auth.users via trigger (auto-created on signup)
2. `projects` – with NSM fields (nsm_name, nsm_value, nsm_target, nsm_unit, nsm_type) + is_demo flag
3. `project_members` – (project_id, user_id, role) junction table
4. `objectives` – with project_id FK, CASCADE delete
5. `strategies` – with project_id + objective_id FK, CASCADE delete
6. `experiments` – full schema with all fields, CASCADE delete

**RPC Functions:**
1. `clone_demo_project(p_user_id uuid)` – SECURITY DEFINER, creates demo project + membership + sample data
2. `create_project_with_membership(...)` – Atomic project + admin membership creation

**RLS Policies:**
- All tables have RLS enabled
- projects: users see assigned (via project_members), superadmin sees all
- project_members: user can read own rows
- objectives/strategies/experiments: filter via project membership

**Enums created:** `global_role_enum`, `project_role_enum`, `experiment_status`, `funnel_stage`, `metric_type`

---

## Phase 2: Frontend Architecture ✅ DONE

### New files:
1. `src/contexts/AuthContext.tsx` – Auth state + profile + global_role + onboarding
2. `src/contexts/ProjectContext.tsx` – Full project CRUD, optimistic mutations, active project switching
3. `src/components/AuthGate.tsx` – Login/signup screen with Growth Lab branding

### Modified files:
1. `src/main.tsx` – Wraps App in AuthProvider → AuthGate → ProjectProvider
2. `src/App.tsx` – Replaced all localStorage state with context consumers (zero UI changes)
3. `src/SettingsView.tsx` – Added `onSignOut` prop and Sign Out button
4. `src/lib/supabase.ts` – Updated to always create client, added `detectSessionInUrl`

### Key principle:
- App.tsx keeps ALL its rendering logic **untouched**
- Only the data SOURCE changed: from useState/localStorage → Supabase contexts
- Every mutation is optimistic (instant UI) with rollback on error
- Drag-and-drop still works via `setExperiments` which does local-only updates

---

## Phase 3: Onboarding Flow ✅ DONE (in AuthContext)

After login:
1. AuthContext checks `project_members` count for the user
2. If 0 → calls `clone_demo_project` RPC (creates Demo Cliente Salud project)
3. Projects are fetched by ProjectContext after auth is ready

---

## 🚀 Deployment Steps

### Step 1: Run SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy-paste contents of `supabase/migration.sql`
3. Click "Run" — all tables, RLS, triggers, RPCs created in one go

### Step 2: Enable Auth
1. In Supabase Dashboard → Authentication → Providers
2. Enable **Email** provider (password-based)
3. Optionally enable Google/GitHub OAuth

### Step 3: Create First User
1. Run the app locally (`npm run dev`)
2. Sign up with your email/password
3. Demo project will be auto-created on first login

### Step 4: Make Yourself Superadmin
```sql
UPDATE profiles SET global_role = 'superadmin' WHERE email = 'your@email.com';
```

### Step 5: Deploy
```bash
npx vercel deploy --prod
```

---

## Files Changed Summary

| File | Change Type | Description |
|------|------------|-------------|
| `supabase/migration.sql` | New | Complete DB schema, RLS, RPCs |
| `src/contexts/AuthContext.tsx` | New | Auth state management |
| `src/contexts/ProjectContext.tsx` | New | Project data management |
| `src/components/AuthGate.tsx` | New | Login/signup UI |
| `src/main.tsx` | Modified | Provider wrapping |
| `src/App.tsx` | Modified | Context consumption |
| `src/SettingsView.tsx` | Modified | Sign Out button |
| `src/lib/supabase.ts` | Modified | Client init update |
