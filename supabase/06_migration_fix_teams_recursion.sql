-- ============================================================================
-- 06_migration_fix_teams_recursion.sql
-- Las políticas de teams/team_memberships se referencian circularmente →
-- error 42P17 (recursión infinita, verificado en prod el 2026-08-27).
-- Fix: helpers SECURITY DEFINER que saltan RLS al chequear pertenencia
-- (mismo patrón que is_project_member en FIX_RLS_RECURSION.sql).
-- Idempotente. Correr en el SQL Editor de Supabase ANTES que 07/08/09.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_team_member_of(p_team_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_team_member_of(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_team_lead_of(p_team_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id AND lead_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_team_lead_of(uuid) TO authenticated;

-- Recrear políticas SELECT sin subqueries cruzadas (la recursión vivía aquí).
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (
    public.is_superadmin()
    OR lead_user_id = auth.uid()
    OR public.is_team_member_of(id)
  );

DROP POLICY IF EXISTS team_memberships_select ON public.team_memberships;
CREATE POLICY team_memberships_select ON public.team_memberships
  FOR SELECT USING (
    public.is_superadmin()
    OR user_id = auth.uid()
    OR public.is_team_lead_of(team_id)
  );

DROP POLICY IF EXISTS team_projects_select ON public.team_projects;
CREATE POLICY team_projects_select ON public.team_projects
  FOR SELECT USING (
    public.is_superadmin()
    OR public.is_team_lead_of(team_id)
    OR public.is_team_member_of(team_id)
  );

-- Las políticas de escritura (solo superadmin) no recursan: se dejan intactas.
