-- ============================================================================
-- FIX: Remove duplicate create_project_with_membership function
-- 
-- PROBLEM: Two overloaded versions exist due to type mismatch:
--   1. Original migration: p_nsm_type metric_type  (enum)
--   2. Hotfix v2:          p_nsm_type text
-- This causes "could not choose a best candidate function" error.
--
-- SOLUTION: Drop BOTH versions, recreate with TEXT type only.
-- ============================================================================

-- Drop the OLD version (with metric_type enum parameter)
DROP FUNCTION IF EXISTS create_project_with_membership(
  text, text, numeric, numeric, text, metric_type, text, text
);

-- Drop the NEW version (with text parameter) 
DROP FUNCTION IF EXISTS create_project_with_membership(
  text, text, numeric, numeric, text, text, text, text
);

-- Recreate the single, correct version
CREATE OR REPLACE FUNCTION create_project_with_membership(
  p_name text,
  p_nsm_name text DEFAULT NULL,
  p_nsm_value numeric DEFAULT 0,
  p_nsm_target numeric DEFAULT 0,
  p_nsm_unit text DEFAULT '$',
  p_nsm_type text DEFAULT 'currency',
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
  VALUES (p_name, p_nsm_name, p_nsm_value, p_nsm_target, p_nsm_unit, p_nsm_type::metric_type, p_logo, p_industry)
  RETURNING id INTO v_project_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'admin');

  RETURN v_project_id;
END;
$$;

-- Verify: should show exactly ONE function
SELECT proname, pg_get_function_arguments(oid) as args
FROM pg_proc 
WHERE proname = 'create_project_with_membership'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
