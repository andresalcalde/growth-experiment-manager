# 🚀 Supabase Integration Guide - Growth Experiment Manager

This guide will walk you through connecting your Growth Experiment Manager to Supabase for real-time database persistence.

---

## 📋 Prerequisites

1. A Supabase account (free tier works great)
2. Node.js and npm installed
3. This project cloned/downloaded

---

## 🔧 Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Project Name**: `growth-experiment-manager` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait ~2 minutes for provisioning

---

## 🗄️ Step 2: Create Database Schema

1. In your Supabase project dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL editor
5. Click **"Run"** (or press CMD/CTRL + Enter)
6. You should see: `Success. No rows returned`

This creates all necessary tables:
- ✅ projects
- ✅ north_star_metrics
- ✅ objectives
- ✅ strategies
- ✅ team_members
- ✅ team_member_projects
- ✅ experiments

---

## 🔑 Step 3: Get Your API Keys

1. In Supabase dashboard, click "Settings" → "API"
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## ⚙️ Step 4: Configure Environment Variables

1. In the project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

---

## �� Step 5: Seed Initial Data (Optional)

To populate your database with the "Laboratorio Polanco" demo data:

1. Go to SQL Editor in Supabase
2. Run this seed script:

```sql
-- Insert Laboratorio Polanco Project
INSERT INTO projects (id, name, logo, industry) 
VALUES (
  '01. Laboratorio Polanco',
  'Laboratorio Polanco',
  '🧬',
  'HealthTech'
);

-- Insert North Star Metric
INSERT INTO north_star_metrics (project_id, name, current_value, target_value, unit, type)
VALUES (
  '01. Laboratorio Polanco',
  'Ingresos Anuales Totales (Revenue)',
  6500000,
  10000000,
  '$',
  'currency'
);

-- Insert Team Members
INSERT INTO team_members (id, name, email, avatar, role) VALUES
('tm-1', 'Andrés García', 'andres@example.com', 'https://i.pravatar.cc/150?u=andres', 'Admin'),
('tm-2', 'Alice Smith', 'alice@example.com', 'https://i.pravatar.cc/150?u=alice', 'Lead'),
('tm-3', 'María López', 'maria@example.com', 'https://i.pravatar.cc/150?u=maria', 'Lead'),
('tm-4', 'Carlos Ruiz', 'carlos@example.com', 'https://i.pravatar.cc/150?u=carlos', 'Lead'),
('tm-5', 'Sofía Mendoza', 'sofia@example.com', 'https://i.pravatar.cc/150?u=sofia', 'Lead');

-- Link team members to project
INSERT INTO team_member_projects (team_member_id, project_id) VALUES
('tm-1', '01. Laboratorio Polanco'),
('tm-2', '01. Laboratorio Polanco'),
('tm-3', '01. Laboratorio Polanco'),
('tm-4', '01. Laboratorio Polanco'),
('tm-5', '01. Laboratorio Polanco');

-- Continue with Objectives, Strategies, and Experiments...
```

*(Full seed script available in `supabase-seed.sql` if I create it)*

---

## 🧪 Step 6: Test the Connection

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open the browser** and check the console:
   - You should see NO errors about Supabase connection
   - The app should load projects from the database

3. **Test features:**
   - ✅ Switch between projects
   - ✅ Edit North Star metric
   - ✅ Change experiment status in Backlog view
   - ✅ All changes should persist and update in real-time!

---

## 🎯 Features Enabled

With Supabase connected, you now have:

### ✨ Real-Time Sync
- Multiple users can collaborate simultaneously
- Changes appear instantly across all connected clients
- No manual refresh needed

### 💾 Persistent Storage
- All data saved to PostgreSQL database
- No more lost work when closing the browser
- Professional-grade data persistence

### 🔄 Project-Aware Filtering
- Experiments automatically filtered by selected project
- Each project has its own North Star, objectives, and strategies
- Clean data separation

### 🚀 Scalability
- Ready for production deployment
- Can handle unlimited projects and experiments
- Built on enterprise-grade infrastructure

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
**Solution**: Make sure `.env` file exists and has correct values

### Error: "relation 'projects' does not exist"
**Solution**: Run the `supabase-schema.sql` in SQL Editor

### Data not loading
**Solutions**:
1. Check browser console for errors
2. Verify API keys in `.env` are correct
3. Check Row Level Security policies in Supabase dashboard

### Real-time not working
**Solution**: Check that subscriptions are enabled in Supabase → Database → Replication

---

## 📚 Next Steps

1. **Deploy to Production**: Use Vercel/Netlify and add env vars there
2. **Add Authentication**: Implement Supabase Auth for user login
3. **Customize RLS Policies**: Add team-based access control
4. **Add File Storage**: Use Supabase Storage for experiment visual proofs

---

## 🆘 Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: [Create an issue in your repo]

---

**You're all set! Your Growth Experiment Manager is now powered by Supabase! 🎉**
