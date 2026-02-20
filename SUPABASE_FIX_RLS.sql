-- 🚨 URGENT FIX FOR PROJECT CREATION 🚨
-- Run this in Supabase SQL Editor immediately

-- 1. Allow users to add themselves to projects (Fixes "Project not saving" / "Rolled back")
DROP POLICY IF EXISTS "Users can add themselves as members" ON public.project_members;
CREATE POLICY "Users can add themselves as members" 
ON public.project_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Allow users to update their own role (optional, but good for initial setup)
DROP POLICY IF EXISTS "Users can update their own membership" ON public.project_members;
CREATE POLICY "Users can update their own membership" 
ON public.project_members 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Ensure 'funnel_stage' exists (Fixes "Experiment loading error")
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiments' AND column_name = 'funnel_stage') THEN 
        ALTER TABLE experiments ADD COLUMN funnel_stage TEXT DEFAULT 'Acquisition'; 
    END IF; 
END $$;

-- 4. Ensure INSERT policies exist for other tables (inherited from Project membership)
-- (These usually exist from previous schema, but re-affirming to be safe)

DROP POLICY IF EXISTS "Strategies Insert" ON public.strategies;
CREATE POLICY "Strategies Insert" ON public.strategies FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = strategies.project_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Objectives Insert" ON public.objectives;
CREATE POLICY "Objectives Insert" ON public.objectives FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = objectives.project_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Experiments Insert" ON public.experiments;
CREATE POLICY "Experiments Insert" ON public.experiments FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = experiments.project_id AND user_id = auth.uid())
);
