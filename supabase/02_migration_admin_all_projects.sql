-- ============================================================================
-- migration_admin_all_projects.sql
-- Punto 4 del feedback Growth Lab: visibilidad y gestión de TODOS los proyectos
-- para el superadmin, sin depender de que el creador lo comparta.
--
-- Estrategia: RPCs SECURITY DEFINER gateadas por is_superadmin(). No se relaja
-- la RLS de `projects` para usuarios normales — el superadmin opera vía estas
-- funciones que corren como owner.
--
-- Correr en el SQL Editor de Supabase. Idempotente.
-- REQUIERE TESTING: valida con un usuario superadmin y uno normal.
-- ============================================================================

-- 1) Archivado de proyectos (soft-delete reversible).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Helper interno: lanza excepción si quien llama no es superadmin.
CREATE OR REPLACE FUNCTION public.assert_superadmin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'forbidden: superadmin role required';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.assert_superadmin() TO authenticated;

-- 2) Listar TODOS los proyectos con conteos.
DROP FUNCTION IF EXISTS public.admin_list_projects();
CREATE OR REPLACE FUNCTION public.admin_list_projects()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.created_at DESC)
    FROM (
      SELECT
        p.id,
        p.name,
        p.archived,
        p.created_at,
        (SELECT count(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT count(*) FROM experiments e WHERE e.project_id = p.id) AS experiment_count
      FROM projects p
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_projects() TO authenticated;

-- 3) Listar miembros de un proyecto (con nombre/email del perfil).
DROP FUNCTION IF EXISTS public.admin_list_project_members(uuid);
CREATE OR REPLACE FUNCTION public.admin_list_project_members(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.full_name NULLS LAST)
    FROM (
      SELECT
        pm.user_id,
        pr.full_name,
        pr.email,
        pm.role::text AS role
      FROM project_members pm
      JOIN profiles pr ON pr.id = pm.user_id
      WHERE pm.project_id = p_project_id
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_project_members(uuid) TO authenticated;

-- 4) Agregar (o actualizar rol de) un miembro.
DROP FUNCTION IF EXISTS public.admin_upsert_project_member(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.admin_upsert_project_member(
  p_project_id uuid, p_user_id uuid, p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (p_project_id, p_user_id, p_role::project_role_enum)
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_project_member(uuid, uuid, text) TO authenticated;

-- 5) Remover un miembro.
DROP FUNCTION IF EXISTS public.admin_remove_project_member(uuid, uuid);
CREATE OR REPLACE FUNCTION public.admin_remove_project_member(
  p_project_id uuid, p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  DELETE FROM project_members
  WHERE project_id = p_project_id AND user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_project_member(uuid, uuid) TO authenticated;

-- 6) Archivar / desarchivar un proyecto.
DROP FUNCTION IF EXISTS public.admin_set_project_archived(uuid, boolean);
CREATE OR REPLACE FUNCTION public.admin_set_project_archived(
  p_project_id uuid, p_archived boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_superadmin();
  UPDATE projects SET archived = p_archived WHERE id = p_project_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_project_archived(uuid, boolean) TO authenticated;
