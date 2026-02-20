-- 🔥 FINAL PRODUCTION FIX SCRIPT 🔥
-- Run this in Supabase SQL Editor.
-- It fixes:
-- 1. Missing user profiles (causing save errors)
-- 2. Missing columns (causing load errors)
-- 3. Blocked permissions (causing "rollback" errors)

-- Enable UUIDs
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. FIX PROFILES (Critical for saving projects)
-- ==========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  global_role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill existing users who signed up before the trigger existed
insert into public.profiles (id, email, full_name, avatar_url)
select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ==========================================
-- 2. FIX PROJECT COLUMNS (Critical for North Star)
-- ==========================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'nsm_name') then
    alter table projects add column nsm_name text;
    alter table projects add column nsm_value numeric default 0;
    alter table projects add column nsm_target numeric default 0;
    alter table projects add column nsm_unit text;
    alter table projects add column nsm_type text;
    alter table projects add column industry text;
    alter table projects add column logo text;
  end if;
end $$;

-- ==========================================
-- 3. FIX MEMBERS TABLE (Critical for access)
-- ==========================================
create table if not exists public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'viewer',
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Check if role column exists (in case table existed but was different)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'project_members' and column_name = 'role') then
        alter table project_members add column role text default 'viewer';
    end if;
end $$;

-- ==========================================
-- 4. FIX EXPERIMENTS (Critical for loading)
-- ==========================================
do $$
begin
    -- Essential Columns
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'funnel_stage') then
        alter table experiments add column funnel_stage text default 'Acquisition';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'owner_name') then
        alter table experiments add column owner_name text;
        alter table experiments add column owner_avatar text;
    end if;
    -- Extra Safety Columns
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'ice_score') then
         -- Add as simple integer to allow direct inserts from code
        alter table experiments add column ice_score integer default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'visual_proof') then
        alter table experiments add column visual_proof jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'key_learnings') then
        alter table experiments add column key_learnings text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'experiments' and column_name = 'labels') then
        alter table experiments add column labels text[];
    end if;
end $$;

-- ==========================================
-- 5. FIX PERMISSIONS (Critical for everything)
-- ==========================================

-- Enable RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table objectives enable row level security;
alter table strategies enable row level security;
alter table experiments enable row level security;

-- PROFILES Policies
drop policy if exists "Profiles Read V2" on profiles;
create policy "Profiles Read V2" on profiles for select using (true);

drop policy if exists "Profiles Update V2" on profiles;
create policy "Profiles Update V2" on profiles for update using (auth.uid() = id);

-- PROJECTS Policies
drop policy if exists "Projects Insert V2" on projects;
create policy "Projects Insert V2" on projects for insert with check (auth.role() = 'authenticated');

drop policy if exists "Projects Select V2" on projects;
create policy "Projects Select V2" on projects for select using (
  exists (select 1 from project_members where project_id = id and user_id = auth.uid())
);

drop policy if exists "Projects Update V2" on projects;
create policy "Projects Update V2" on projects for update using (
  exists (select 1 from project_members where project_id = id and user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Projects Delete V2" on projects;
create policy "Projects Delete V2" on projects for delete using (
  exists (select 1 from project_members where project_id = id and user_id = auth.uid() and role = 'admin')
);

-- MEMBERS Policies
drop policy if exists "Members Insert V2" on project_members;
create policy "Members Insert V2" on project_members for insert with check (
  auth.uid() = user_id -- Self-add (for create project)
  OR
  exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid() and pm.role = 'admin') -- Admin add
);

drop policy if exists "Members Select V2" on project_members;
create policy "Members Select V2" on project_members for select using (
  exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid())
);

drop policy if exists "Members Update V2" on project_members;
create policy "Members Update V2" on project_members for update using (
  exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid() and pm.role = 'admin')
);

drop policy if exists "Members Delete V2" on project_members;
create policy "Members Delete V2" on project_members for delete using (
  auth.uid() = user_id -- Self-leave
  OR
  exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid() and pm.role = 'admin') -- Admin remove
);

-- CHILD TABLES Policies (All access for members)
drop policy if exists "Objectives All V2" on objectives;
create policy "Objectives All V2" on objectives for all using (
  exists (select 1 from project_members where project_id = objectives.project_id and user_id = auth.uid())
);

drop policy if exists "Strategies All V2" on strategies;
create policy "Strategies All V2" on strategies for all using (
  exists (select 1 from project_members where project_id = strategies.project_id and user_id = auth.uid())
);

drop policy if exists "Experiments All V2" on experiments;
create policy "Experiments All V2" on experiments for all using (
  exists (select 1 from project_members where project_id = experiments.project_id and user_id = auth.uid())
);
