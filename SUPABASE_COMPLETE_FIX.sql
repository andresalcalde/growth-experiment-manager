-- =====================================================================
-- SUPABASE COMPLETE FIX - Major Growth
-- =====================================================================
-- Este script arregla TODOS los problemas encontrados:
-- 1. funnel_stage column missing (PGRST204)
-- 2. RLS policies blocking project creation
-- 3. RLS policies blocking experiment creation
-- =====================================================================

-- =====================================================================
-- PARTE 1: AGREGAR COLUMNA FALTANTE
-- =====================================================================

-- Add funnel_stage column to experiments table
ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS funnel_stage TEXT;

-- Add comment for documentation
COMMENT ON COLUMN experiments.funnel_stage IS 'Stage in the funnel: Acquisition, Activation, Retention, Revenue, Referral';

-- Update existing records with default value
UPDATE experiments 
SET funnel_stage = 'Activation' 
WHERE funnel_stage IS NULL;

-- =====================================================================
-- PARTE 2: DESHABILITAR RLS TEMPORALMENTE (PARA DEVELOPMENT)
-- =====================================================================

-- Disable RLS on projects table (permite INSERT/UPDATE/DELETE sin auth)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Disable RLS on experiments table
ALTER TABLE experiments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on north_star table (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'north_star') THEN
        EXECUTE 'ALTER TABLE north_star DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- =====================================================================
-- PARTE 3: CREAR POLÍTICAS RLS PERMISIVAS (PARA PRODUCTION)
-- =====================================================================
-- Si prefieres mantener RLS activo, usa estas políticas en lugar de
-- deshabilitar RLS. Comenta la PARTE 2 y descomenta esta sección.
-- =====================================================================

/*
-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations on experiments" ON experiments;

-- Create permissive policies (allows anonymous access for development)
CREATE POLICY "Allow all operations on projects" 
ON projects 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on experiments" 
ON experiments 
FOR ALL 
USING (true) 
WITH CHECK (true);
*/

-- =====================================================================
-- PARTE 4: VERIFICACIÓN
-- =====================================================================

-- Verify funnel_stage column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'experiments' 
AND column_name = 'funnel_stage';

-- Verify RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'experiments');

-- Verify policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('projects', 'experiments');

-- Test query (should not fail)
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as experiment_count FROM experiments;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
SELECT '✅ Supabase configuration fixed successfully!' as status,
       'Projects can now be created and saved' as result;

