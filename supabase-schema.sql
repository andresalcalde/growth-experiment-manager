-- Growth Experiment Manager - Supabase Schema (Updated to match Codebase)
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  global_role TEXT DEFAULT 'user' CHECK (global_role IN ('superadmin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Projects (Includes North Star Metric fields)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  logo TEXT,
  -- Embedded North Star Metric
  nsm_name TEXT,
  nsm_value NUMERIC DEFAULT 0,
  nsm_target NUMERIC DEFAULT 0,
  nsm_unit TEXT,
  nsm_type TEXT, -- 'currency', 'percentage', 'count', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project Members (Access Control)
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. Objectives
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Strategies
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_metric TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Experiments
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Use profiles/users
  
  -- Core Data
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Idea',
  
  -- Context
  hypothesis TEXT,
  observation TEXT,
  problem TEXT,
  source TEXT,
  labels TEXT[], -- Array of strings
  
  -- Scoring
  impact INTEGER DEFAULT 5,
  confidence INTEGER DEFAULT 5,
  ease INTEGER DEFAULT 5,
  ice_score INTEGER GENERATED ALWAYS AS (impact * confidence * ease) STORED,
  
  -- Metadata
  funnel_stage TEXT,
  north_star_metric TEXT, -- Snapshot of NSM name
  linked_strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  
  -- Execution
  start_date DATE,
  end_date DATE,
  test_url TEXT,
  success_criteria TEXT,
  target_metric TEXT,
  
  -- Results
  key_learnings TEXT,
  visual_proof JSONB, -- Array of URLs
  
  -- Denormalized Snapshot Data (optional, based on code usage)
  owner_name TEXT,
  owner_avatar TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for authenticated users (Refine for production)
-- Project access checks should ideally use "EXISTS (SELECT 1 FROM project_members ...)"
-- For now, allowing authenticated users to see everything or refined:

-- Profile: Users can read all profiles (to add team members), update own.
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: Accessible if member
CREATE POLICY "Projects Viewable by Members" ON public.projects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Projects Editable by Admin/Editor" ON public.projects
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('admin', 'editor')
  )
);

CREATE POLICY "Projects Created by Users" ON public.projects FOR INSERT WITH CHECK (true); 
-- Note: Creator must immediately add themselves as admin in transaction or via trigger

-- Project Members:
CREATE POLICY "Members Viewable by Project Members" ON public.project_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Objectives/Strategies/Experiments: Inherit from Project
CREATE POLICY "Objectives Viewable" ON public.objectives FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = objectives.project_id AND user_id = auth.uid())
);
CREATE POLICY "Strategies Viewable" ON public.strategies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = strategies.project_id AND user_id = auth.uid())
);
CREATE POLICY "Experiments Viewable" ON public.experiments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = experiments.project_id AND user_id = auth.uid())
);

-- Allow Insert/Update for members (simplified)
CREATE POLICY "Objectives Editable" ON public.objectives FOR ALL USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = objectives.project_id AND user_id = auth.uid())
);
CREATE POLICY "Strategies Editable" ON public.strategies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = strategies.project_id AND user_id = auth.uid())
);
CREATE POLICY "Experiments Editable" ON public.experiments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = experiments.project_id AND user_id = auth.uid())
);
