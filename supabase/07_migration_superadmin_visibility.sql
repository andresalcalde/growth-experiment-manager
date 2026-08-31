-- ============================================================================
-- 07_migration_superadmin_visibility.sql
-- Punto 2 de Catalina: superadmin ve TODOS los proyectos y su contenido sin
-- membresía explícita. Prod puede estar corriendo políticas "V3" (de
-- FIX_RLS_RECURSION.sql) que NO incluyen la cláusula superadmin — por eso
-- este archivo AGREGA políticas OR nuevas en vez de reescribir existentes.
-- Idempotente. Correr después de 06.
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY "Superadmins read all projects"
    ON public.projects FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all project_members"
    ON public.project_members FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all objectives"
    ON public.objectives FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all strategies"
    ON public.strategies FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all experiments"
    ON public.experiments FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all north_star_metrics"
    ON public.north_star_metrics FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- team_members = tabla del esquema base (miembros por proyecto), NO team_memberships.
DO $$ BEGIN
  CREATE POLICY "Superadmins read all team_members"
    ON public.team_members FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
