-- ============================================================================
-- 04b_migration_teams_roles.sql
-- Punto 6 (parte 2 de 2): entidad de Equipos (usuarios + proyectos bajo un
-- líder) + RLS + RPCs de gestión.
--
-- ⚠️ REQUISITO: correr PRIMERO `04a_migration_add_admin_role.sql` (agrega el
--    valor 'admin' al enum). Este archivo USA 'admin' en is_admin_or_above(),
--    así que el enum ya debe tenerlo confirmado de una ejecución anterior.
--
-- ⚠️ TESTING OBLIGATORIO: toca roles y RLS. Verifica con un superadmin, un
--    'admin' (líder) y un 'user' normal antes de producción.
--
-- ⚠️ NO re-correr este archivo después de 06_migration_fix_teams_recursion.sql:
--    las políticas de la sección 3 son las RECURSIVAS originales y reintroducirían
--    el error 42P17. El fix vive en 06.
--
-- Idempotente. Correr en el SQL Editor de Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tablas de equipos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lead_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- OJO: se llama `team_memberships` (NO `team_members`) a propósito: ya existe
-- una tabla `team_members` en el esquema base (miembros de equipo por proyecto,
-- con otra estructura). Son cosas distintas y no deben mezclarse.
CREATE TABLE IF NOT EXISTS public.team_memberships (
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_projects (
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON public.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_project ON public.team_projects(project_id);

-- ----------------------------------------------------------------------------
-- 2) Helpers de autorización
-- ----------------------------------------------------------------------------

-- ¿El usuario actual lidera el equipo dueño de este proyecto?
CREATE OR REPLACE FUNCTION public.is_team_admin_of_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_projects tp
    JOIN teams t ON t.id = tp.team_id
    WHERE tp.project_id = p_project_id
      AND t.lead_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_team_admin_of_project(uuid) TO authenticated;

-- ¿El usuario actual tiene rol global 'admin' o superior?
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role IN ('admin', 'superadmin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) RLS de las tablas de equipos
-- ----------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;

-- Lectura: superadmin todo; el líder ve su equipo; un miembro ve su equipo.
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (
    public.is_superadmin()
    OR lead_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.team_id = id AND tm.user_id = auth.uid())
  );

-- Escritura de teams: solo superadmin (gestión desde el panel admin).
DROP POLICY IF EXISTS teams_write ON public.teams;
CREATE POLICY teams_write ON public.teams
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS team_memberships_select ON public.team_memberships;
CREATE POLICY team_memberships_select ON public.team_memberships
  FOR SELECT USING (
    public.is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.lead_user_id = auth.uid())
  );
DROP POLICY IF EXISTS team_memberships_write ON public.team_memberships;
CREATE POLICY team_memberships_write ON public.team_memberships
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS team_projects_select ON public.team_projects;
CREATE POLICY team_projects_select ON public.team_projects
  FOR SELECT USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.lead_user_id = auth.uid())
  );
DROP POLICY IF EXISTS team_projects_write ON public.team_projects;
CREATE POLICY team_projects_write ON public.team_projects
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- ----------------------------------------------------------------------------
-- 4) RPCs de gestión de equipos (superadmin)
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_list_teams();
CREATE OR REPLACE FUNCTION public.admin_list_teams()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.created_at DESC)
    FROM (
      SELECT
        te.id, te.name, te.lead_user_id, te.created_at,
        (SELECT pr.full_name FROM profiles pr WHERE pr.id = te.lead_user_id) AS lead_name,
        (SELECT jsonb_agg(jsonb_build_object('user_id', tm.user_id, 'full_name', p2.full_name, 'email', p2.email))
           FROM team_memberships tm JOIN profiles p2 ON p2.id = tm.user_id WHERE tm.team_id = te.id) AS members,
        (SELECT jsonb_agg(jsonb_build_object('project_id', tp.project_id, 'name', pj.name))
           FROM team_projects tp JOIN projects pj ON pj.id = tp.project_id WHERE tp.team_id = te.id) AS projects
      FROM teams te
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_teams() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_create_team(text, uuid);
CREATE OR REPLACE FUNCTION public.admin_create_team(p_name text, p_lead uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM public.assert_superadmin();
  INSERT INTO teams (name, lead_user_id) VALUES (p_name, p_lead) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_team(text, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_delete_team(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  DELETE FROM teams WHERE id = p_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_team(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_set_team_lead(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_set_team_lead(p_team_id uuid, p_lead uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  UPDATE teams SET lead_user_id = p_lead WHERE id = p_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_team_lead(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_add_team_member(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_add_team_member(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  INSERT INTO team_memberships (team_id, user_id) VALUES (p_team_id, p_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_team_member(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_remove_team_member(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  DELETE FROM team_memberships WHERE team_id = p_team_id AND user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_add_team_project(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_add_team_project(p_team_id uuid, p_project_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  INSERT INTO team_projects (team_id, project_id) VALUES (p_team_id, p_project_id)
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_team_project(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_remove_team_project(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_remove_team_project(p_team_id uuid, p_project_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  DELETE FROM team_projects WHERE team_id = p_team_id AND project_id = p_project_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_team_project(uuid, uuid) TO authenticated;
