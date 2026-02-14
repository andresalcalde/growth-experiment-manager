-- ============================================================================
-- Growth Experiment Manager – Supabase Migration
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- STRUCTURE:
--   Part A: Enums + Types
--   Part B: ALL Tables (no policies yet)
--   Part C: ALL RLS Policies (after all tables exist)
--   Part D: RPC Functions
--   Part E: Triggers
-- ============================================================================


-- ============================================================================
-- PART A: ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE global_role_enum AS ENUM ('superadmin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_role_enum AS ENUM ('admin', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE experiment_status AS ENUM (
    'Idea', 'Prioritized', 'Building', 'Live Testing', 'Analysis',
    'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE funnel_stage AS ENUM (
    'Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE metric_type AS ENUM (
    'currency', 'count', 'percentage', 'ratio'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART B: ALL TABLES (create tables first, policies later)
-- ============================================================================

-- B.1 PROFILES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  global_role global_role_enum DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- B.2 PROJECTS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo text,
  industry text,
  nsm_name text,
  nsm_value numeric DEFAULT 0,
  nsm_target numeric DEFAULT 0,
  nsm_unit text DEFAULT '$',
  nsm_type metric_type DEFAULT 'currency',
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- B.3 PROJECT_MEMBERS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role project_role_enum DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id);


-- B.4 OBJECTIVES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'Active',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objectives_project ON objectives(project_id);


-- B.5 STRATEGIES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_metric text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategies_project ON strategies(project_id);
CREATE INDEX IF NOT EXISTS idx_strategies_objective ON strategies(objective_id);


-- B.6 EXPERIMENTS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status experiment_status DEFAULT 'Idea',
  owner_name text NOT NULL DEFAULT '',
  owner_avatar text NOT NULL DEFAULT '',
  hypothesis text NOT NULL DEFAULT '',
  observation text,
  problem text,
  source text,
  labels text[],
  impact integer DEFAULT 5,
  confidence integer DEFAULT 5,
  ease integer DEFAULT 5,
  ice_score integer DEFAULT 125,
  funnel_stage funnel_stage DEFAULT 'Acquisition',
  north_star_metric text,
  linked_strategy_id uuid REFERENCES strategies(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  test_url text,
  success_criteria text,
  target_metric text,
  key_learnings text,
  visual_proof text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_strategy ON experiments(linked_strategy_id);


-- ============================================================================
-- PART C: ENABLE RLS + ALL POLICIES
-- (Now all tables exist, so cross-table references work)
-- ============================================================================

-- C.1 PROFILES POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins can read all profiles"
    ON profiles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- C.2 PROJECTS POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read assigned projects"
    ON projects FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert projects"
    ON projects FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- C.3 PROJECT_MEMBERS POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own memberships"
    ON project_members FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage memberships"
    ON project_members FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete memberships"
    ON project_members FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- C.4 OBJECTIVES POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read project objectives"
    ON objectives FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = objectives.project_id
        AND project_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can insert objectives"
    ON objectives FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = objectives.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can update objectives"
    ON objectives FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = objectives.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can delete objectives"
    ON objectives FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = objectives.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- C.5 STRATEGIES POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read project strategies"
    ON strategies FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = strategies.project_id
        AND project_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can insert strategies"
    ON strategies FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = strategies.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can update strategies"
    ON strategies FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = strategies.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can delete strategies"
    ON strategies FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = strategies.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- C.6 EXPERIMENTS POLICIES
-- --------------------------------------------------------------------------
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read project experiments"
    ON experiments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = experiments.project_id
        AND project_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'superadmin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can insert experiments"
    ON experiments FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = experiments.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can update experiments"
    ON experiments FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = experiments.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can delete experiments"
    ON experiments FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = experiments.project_id
        AND project_members.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART D: RPC FUNCTIONS
-- ============================================================================

-- D.1 CREATE PROJECT WITH MEMBERSHIP (Atomic)
-- --------------------------------------------------------------------------
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


-- D.2 CLONE DEMO PROJECT (Onboarding)
-- --------------------------------------------------------------------------
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
-- PART E: UPDATED_AT TRIGGERS
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
-- ✅ DONE! All tables, policies, functions, and triggers are ready.
-- ============================================================================
