-- ============================================================================
-- HOTFIX: Add missing columns to projects table + Fix RLS infinite recursion
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- FIX 1: Add missing columns to projects table
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_value numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_target numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_unit text DEFAULT '$';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_type metric_type DEFAULT 'currency';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry text;

-- ============================================================================
-- FIX 2: Fix infinite recursion in profiles RLS policies
-- The problem is that policies on "profiles" do a subquery on "profiles"
-- which triggers the same RLS check, causing infinite recursion.
-- Solution: Drop the recursive superadmin policy and recreate it
-- using auth.jwt() to avoid querying the profiles table.
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;

-- Recreate it using auth.jwt() which doesn't trigger RLS
CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    (auth.jwt() ->> 'role') = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data ->> 'global_role' = 'superadmin'
    )
  );

-- Alternative simpler fix: allow all authenticated users to read profiles
-- This is common in apps where users need to see each other's names
-- DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
-- CREATE POLICY "All authenticated users can read profiles"
--   ON profiles FOR SELECT
--   USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- FIX 3: Recreate the RPC functions to ensure they exist
-- ============================================================================

-- D.1 CREATE PROJECT WITH MEMBERSHIP (Atomic)
CREATE OR REPLACE FUNCTION create_project_with_membership(
  p_name text,
  p_nsm_name text DEFAULT NULL,
  p_nsm_value numeric DEFAULT 0,
  p_nsm_target numeric DEFAULT 0,
  p_nsm_unit text DEFAULT '$',
  p_nsm_type metric_type DEFAULT 'currency',
  p_logo text DEFAULT NULL,
  p_industry text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  INSERT INTO projects (name, nsm_name, nsm_value, nsm_target, nsm_unit, nsm_type, logo, industry)
  VALUES (p_name, p_nsm_name, p_nsm_value, p_nsm_target, p_nsm_unit, p_nsm_type, p_logo, p_industry)
  RETURNING id INTO v_project_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'admin');

  RETURN v_project_id;
END;
$$;

-- ============================================================================
-- VERIFY: Check that the columns now exist
-- ============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
