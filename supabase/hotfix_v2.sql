-- ============================================================================
-- HOTFIX V2: Comprehensive database fix
-- Addresses all remaining bugs found during deep QA
-- ============================================================================

-- ============================================================================
-- 1. ENSURE ALL COLUMNS EXIST ON ALL TABLES
-- ============================================================================

-- Projects table columns (idempotent)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_value numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_target numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_unit text DEFAULT '$';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nsm_type text DEFAULT 'currency';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry text;

-- Experiments table columns (idempotent)
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS owner_name text NOT NULL DEFAULT '';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS owner_avatar text NOT NULL DEFAULT '';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS observation text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS problem text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS labels text[];
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS north_star_metric text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS test_url text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS success_criteria text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS target_metric text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS key_learnings text;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS visual_proof text[];

-- Strategies table columns (idempotent)
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS target_metric text;

-- Objectives table columns (idempotent)
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;


-- ============================================================================
-- 2. FIX ALL RLS POLICIES (Drop problematic ones, recreate clean)
-- ============================================================================

-- 2A. PROFILES: Fix the superadmin policy that causes infinite recursion
-- The issue: policy queries profiles table itself = infinite recursion
-- Fix: Use auth.jwt() metadata instead of querying profiles
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Clean profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Superadmin policy: use JWT metadata to avoid recursion
-- Note: We DON'T query auth.users because anon role doesn't have access
CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- 2B. PROJECTS: Fix policies that reference profiles (can cause recursion)
DROP POLICY IF EXISTS "Users can read assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins can update their projects" ON projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete their projects" ON projects;

CREATE POLICY "Users can read assigned projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
    OR
    (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );

CREATE POLICY "Admins can update their projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'admin'
    )
    OR
    (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );

CREATE POLICY "Admins can insert projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete their projects"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'admin'
    )
    OR
    (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- 2C. OBJECTIVES: Fix superadmin check
DROP POLICY IF EXISTS "Users can read project objectives" ON objectives;

CREATE POLICY "Users can read project objectives"
  ON objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = objectives.project_id
      AND project_members.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- 2D. STRATEGIES: Fix superadmin check
DROP POLICY IF EXISTS "Users can read project strategies" ON strategies;

CREATE POLICY "Users can read project strategies"
  ON strategies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = strategies.project_id
      AND project_members.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- 2E. EXPERIMENTS: Fix superadmin check
DROP POLICY IF EXISTS "Users can read project experiments" ON experiments;

CREATE POLICY "Users can read project experiments"
  ON experiments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = experiments.project_id
      AND project_members.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- 2F. PROJECT_MEMBERS: Superadmin can also read all memberships
DROP POLICY IF EXISTS "Users can read own memberships" ON project_members;

CREATE POLICY "Users can read own memberships"
  ON project_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin'
  );


-- ============================================================================
-- 3. RECREATE ALL RPC FUNCTIONS
-- ============================================================================

-- 3A. create_project_with_membership
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
  VALUES (p_name, p_nsm_name, p_nsm_value, p_nsm_target, p_nsm_unit, p_nsm_type, p_logo, p_industry)
  RETURNING id INTO v_project_id;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'admin');

  RETURN v_project_id;
END;
$$;


-- 3B. clone_demo_project (fixed - all column names verified)
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

  -- Create sample experiments (all column names verified against table definition)
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
-- 4. ENSURE TRIGGERS EXIST
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON projects;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON objectives;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON strategies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON experiments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Check projects table
SELECT 'PROJECTS COLUMNS:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'projects' ORDER BY ordinal_position;

-- Check experiments table
SELECT 'EXPERIMENTS COLUMNS:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'experiments' ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
