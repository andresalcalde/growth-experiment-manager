-- ============================================================================
-- SECURITY HOTFIX - 2026-02-23
-- ============================================================================
--
-- This file contains SQL fixes for security vulnerabilities identified in the
-- Growth Experiment Manager database schema. It addresses overly permissive
-- RLS policies, missing authorization checks, input validation gaps, and a
-- missing enum value.
--
-- WARNING: Review every statement carefully before running in production.
--
-- IMPORTANT: The ALTER TYPE ... ADD VALUE statement (Section 1) cannot run
-- inside a transaction block in PostgreSQL. You MUST run Section 1 first
-- as a separate statement OUTSIDE any BEGIN/COMMIT transaction. Only after
-- that completes should you run the remaining sections (2-7), which can
-- be executed together inside a single transaction.
--
-- Execution order:
--   1. Run Section 1 alone (outside a transaction)
--   2. Run Sections 2-7 together (can be wrapped in a transaction)
-- ============================================================================


-- ============================================================================
-- SECTION 1: Add missing enum value
-- ============================================================================
-- The frontend maps a "Viewer" role but the project_role_enum type only has
-- 'admin' and 'editor'. This adds 'viewer' so the DB can store it properly.
--
-- MUST be run outside a transaction block. PostgreSQL does not allow
-- ALTER TYPE ... ADD VALUE inside BEGIN/COMMIT.
-- ============================================================================

ALTER TYPE project_role_enum ADD VALUE IF NOT EXISTS 'viewer';


-- ============================================================================
-- SECTION 2: Restrict INSERT policy on projects
-- ============================================================================
-- The original policy used WITH CHECK (true), allowing any authenticated user
-- to insert projects directly into the table. Project creation should only
-- happen through the create_project_with_membership() SECURITY DEFINER RPC,
-- which properly sets up the creator as an admin member. Blocking direct
-- inserts prevents orphan projects with no admin owner.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  WITH CHECK (false);


-- ============================================================================
-- SECTION 3: Restrict INSERT policy on project_members
-- ============================================================================
-- The original "Admins can manage memberships" policy was too broad. This
-- replacement ensures only users who are already an admin of the target
-- project can add new members. Without this, any authenticated user could
-- insert themselves into any project's membership list.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage memberships" ON project_members;
CREATE POLICY "Admins can manage memberships"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );


-- ============================================================================
-- SECTION 4: Add missing UPDATE policy on project_members
-- ============================================================================
-- There was no UPDATE policy on project_members, which means role changes
-- (e.g., promoting editor to admin) were either silently blocked or fell
-- through to a default-deny. This policy explicitly allows project admins
-- to update membership records (e.g., change roles) within their projects.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update memberships" ON project_members;
CREATE POLICY "Admins can update memberships"
  ON project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );


-- ============================================================================
-- SECTION 5: Add input validation to create_project_with_membership
-- ============================================================================
-- The original function did not validate that the caller is authenticated or
-- that the project name is non-empty. A malicious or buggy client could
-- create projects with empty names or potentially call the function without
-- a valid session (depending on Supabase configuration). This version adds
-- explicit guards at the top of the function.
-- ============================================================================

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
  -- Validate authentication: ensure the caller has a valid Supabase session
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate project name: reject empty or whitespace-only names
  IF length(trim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Project name cannot be empty';
  END IF;

  INSERT INTO projects (name, nsm_name, nsm_value, nsm_target, nsm_unit, nsm_type, logo, industry)
  VALUES (p_name, p_nsm_name, p_nsm_value, p_nsm_target, p_nsm_unit, p_nsm_type, p_logo, p_industry)
  RETURNING id INTO v_project_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'admin');

  RETURN v_project_id;
END;
$$;


-- ============================================================================
-- SECTION 6: Add input validation to clone_demo_project
-- ============================================================================
-- The original function accepted any p_user_id and created a demo project
-- owned by that user. Because it is SECURITY DEFINER, it bypasses RLS. A
-- malicious caller could clone demo projects into another user's account by
-- passing someone else's UUID. This version validates that the caller IS
-- the target user (auth.uid() must match p_user_id).
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_demo_project(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_obj_1 uuid;
  v_obj_2 uuid;
  v_obj_3 uuid;
  v_obj_4 uuid;
  v_strat_1 uuid;
  v_strat_4 uuid;
BEGIN
  -- Validate that the caller is authenticated and is cloning for themselves
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot clone demo for another user';
  END IF;

  -- Create the demo project
  INSERT INTO projects (name, nsm_name, nsm_value, nsm_target, nsm_unit, nsm_type, is_demo)
  VALUES (
    'Demo Cliente Salud',
    'Ingresos Anuales Totales (Revenue)',
    6500000, 10000000, '$', 'currency', true
  )
  RETURNING id INTO v_project_id;

  -- Create membership
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, p_user_id, 'admin');

  -- Create objectives (Growth Levers)
  INSERT INTO objectives (project_id, title, description, status, progress)
  VALUES (v_project_id, 'Dominio de Intención de Búsqueda',
    'Capture high-intent traffic by aligning clinical content with next-gen search behavior (AEO, LLM search, voice queries).',
    'Active', 40)
  RETURNING id INTO v_obj_1;

  INSERT INTO objectives (project_id, title, description, status, progress)
  VALUES (v_project_id, 'Hiper-Personalización de Conversión',
    'Maximize throughput by deploying hyper-personalized experiences for high-LTV segments (persona-based landings, dynamic messaging).',
    'Active', 55)
  RETURNING id INTO v_obj_2;

  INSERT INTO objectives (project_id, title, description, status, progress)
  VALUES (v_project_id, 'Discovery Commerce',
    'Generate incremental demand through short-form educational assets (TikTok Lab, multi-platform discovery loops).',
    'Active', 25)
  RETURNING id INTO v_obj_3;

  INSERT INTO objectives (project_id, title, description, status, progress)
  VALUES (v_project_id, 'Eficiencia en Paid Media',
    'Reduce acquisition cost while maintaining quality through systematic creative iteration and messaging optimization.',
    'Active', 70)
  RETURNING id INTO v_obj_4;

  -- Create strategies (Initiatives)
  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_1, 'SEO para LLM', 'Organic Traffic')
  RETURNING id INTO v_strat_1;

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_1, 'Bing Search Expansion', 'Search Impressions');

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_2, 'Landings por Campaña', 'CVR');

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_2, 'Landings por Buyer Persona', 'CVR');

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_3, 'TikTok Education Lab', 'Qualified Leads');

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_3, 'Multi-Channel Discovery', 'Brand Awareness');

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_4, 'A/B Testing Creativo', 'CPA')
  RETURNING id INTO v_strat_4;

  INSERT INTO strategies (project_id, objective_id, title, target_metric)
  VALUES (v_project_id, v_obj_4, 'Messaging Iteration', 'CTR');

  -- Create sample experiments
  INSERT INTO experiments (project_id, title, status, owner_name, owner_avatar,
    hypothesis, impact, confidence, ease, ice_score, funnel_stage,
    north_star_metric, linked_strategy_id)
  VALUES
    (v_project_id, 'Answer Engine Optimization (AEO)', 'Prioritized',
     'Andrés García', 'https://i.pravatar.cc/150?u=andres',
     'Si optimizamos el contenido para responder preguntas específicas de usuarios en motores de búsqueda conversacionales, entonces incrementaremos el tráfico orgánico en 25%.',
     8, 6, 7, 336, 'Acquisition', 'Tráfico Orgánico Calificado', v_strat_1),
    (v_project_id, 'A/B Test Creativo (Meta Ads)', 'Live Testing',
     'Carlos Ruiz', 'https://i.pravatar.cc/150?u=carlos',
     'Si probamos creativos centrados en beneficios emocionales vs. racionales, entonces el CPA se reducirá en 20%.',
     8, 8, 9, 576, 'Acquisition', 'Costo por Adquisición (CPA)', v_strat_4);

  RETURN v_project_id;
END;
$$;


-- ============================================================================
-- SECTION 7: Add co-member profile reading policy
-- ============================================================================
-- Users need to see the display names and avatars of other members within
-- their shared projects (e.g., experiment owners, team lists). Without this
-- policy, profile reads for other users fail silently and the UI shows
-- blank names. This policy allows a user to read any profile that belongs
-- to someone who shares at least one project with them, in addition to
-- always being able to read their own profile.
-- ============================================================================

DROP POLICY IF EXISTS "Members can read co-member profiles" ON profiles;
CREATE POLICY "Members can read co-member profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM project_members pm1
      JOIN project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
      AND pm2.user_id = profiles.id
    )
  );


-- ============================================================================
-- END OF SECURITY HOTFIX
-- ============================================================================
