-- 🔥 FIX: Infinite Recursion in project_members RLS Policies 🔥
-- Problem: project_members SELECT policy references project_members itself,
-- causing PostgreSQL error 42P17 (infinite recursion).
-- Solution: Use auth.uid() = user_id directly for the SELECT policy on
-- project_members (no subquery needed). For INSERT/UPDATE/DELETE,
-- use a security definer function to bypass RLS when checking membership.
-- Run this in Supabase SQL Editor.

-- ============================================================
-- STEP 1: Create a SECURITY DEFINER function that bypasses RLS
-- This allows policies on project_members to check membership
-- without triggering the RLS policy again (breaking the recursion).
-- ============================================================

create or replace function is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = p_user_id
  );
$$;

create or replace function is_project_admin(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and role = 'admin'
  );
$$;

-- ============================================================
-- STEP 2: Fix project_members policies (the recursion source)
-- ============================================================

-- DROP all existing V2 policies on project_members
drop policy if exists "Members Insert V2" on project_members;
drop policy if exists "Members Select V2" on project_members;
drop policy if exists "Members Update V2" on project_members;
drop policy if exists "Members Delete V2" on project_members;

-- SELECT: Simple direct check - no subquery needed
-- "You can see rows where you are the user_id"
create policy "Members Select V3" on project_members for select using (
  user_id = auth.uid()
  OR
  is_project_member(project_id, auth.uid())
);

-- INSERT: Self-add (project creation) or admin-add
create policy "Members Insert V3" on project_members for insert with check (
  auth.uid() = user_id -- Self-add during project creation
  OR
  is_project_admin(project_id, auth.uid()) -- Admin can add others
);

-- UPDATE: Only admins
create policy "Members Update V3" on project_members for update using (
  is_project_admin(project_id, auth.uid())
);

-- DELETE: Self-leave or admin-remove
create policy "Members Delete V3" on project_members for delete using (
  auth.uid() = user_id -- Self-leave
  OR
  is_project_admin(project_id, auth.uid()) -- Admin remove
);

-- ============================================================
-- STEP 3: Fix projects policies to use the function too
-- ============================================================

drop policy if exists "Projects Select V2" on projects;
create policy "Projects Select V3" on projects for select using (
  is_project_member(id, auth.uid())
);

drop policy if exists "Projects Update V2" on projects;
create policy "Projects Update V3" on projects for update using (
  is_project_admin(id, auth.uid())
);

drop policy if exists "Projects Delete V2" on projects;
create policy "Projects Delete V3" on projects for delete using (
  is_project_admin(id, auth.uid())
);

-- Projects Insert stays the same (no recursion issue)
-- But recreate it for consistency
drop policy if exists "Projects Insert V2" on projects;
create policy "Projects Insert V3" on projects for insert with check (
  auth.role() = 'authenticated'
);

-- ============================================================
-- STEP 4: Fix child table policies to use the function
-- ============================================================

drop policy if exists "Objectives All V2" on objectives;
create policy "Objectives All V3" on objectives for all using (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "Strategies All V2" on strategies;
create policy "Strategies All V3" on strategies for all using (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "Experiments All V2" on experiments;
create policy "Experiments All V3" on experiments for all using (
  is_project_member(project_id, auth.uid())
);

-- ============================================================
-- STEP 5: Ensure profiles policies remain intact  
-- ============================================================

drop policy if exists "Profiles Read V2" on profiles;
create policy "Profiles Read V3" on profiles for select using (true);

drop policy if exists "Profiles Update V2" on profiles;
create policy "Profiles Update V3" on profiles for update using (auth.uid() = id);

-- Allow profile inserts (for new user signup trigger)
drop policy if exists "Profiles Insert V3" on profiles;
create policy "Profiles Insert V3" on profiles for insert with check (auth.uid() = id);

-- ============================================================
-- STEP 6: Ensure the profile backfill trigger exists
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any users missing a profile
insert into public.profiles (id, email, full_name, avatar_url)
select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- ============================================================
-- DONE! ✅ All policies now use security definer functions
-- to check membership, eliminating infinite recursion.
-- ============================================================
