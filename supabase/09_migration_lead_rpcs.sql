-- ============================================================================
-- 09_migration_lead_rpcs.sql
-- Punto 1 de Catalina: el líder (global_role='admin') ve la actividad de sus
-- equipos y sus proyectos. Acceso vía RPCs SECURITY DEFINER gateadas por
-- liderazgo real — NO se relaja la RLS de projects/experiments.
-- Idempotente. Correr después de 06 y 08.
-- ============================================================================

DROP FUNCTION IF EXISTS public.lead_list_my_teams();
CREATE OR REPLACE FUNCTION public.lead_list_my_teams()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE v_is_super boolean := public.is_superadmin();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.name)
    FROM (
      SELECT
        te.id, te.name, te.lead_user_id,
        (SELECT pr.full_name FROM profiles pr WHERE pr.id = te.lead_user_id) AS lead_name,
        -- COALESCE por subselect: jsonb_agg sobre conjunto vacío devuelve NULL,
        -- y el COALESCE de la raíz sólo cubre el array de nivel superior. Un
        -- equipo sin miembros/proyectos debe entregar [] al frontend, no null.
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'user_id', tm.user_id, 'full_name', p2.full_name, 'email', p2.email,
            'last_seen_at', p2.last_seen_at, 'area', p2.area)), '[]'::jsonb)
           FROM team_memberships tm JOIN profiles p2 ON p2.id = tm.user_id
           WHERE tm.team_id = te.id) AS members,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'project_id', tp.project_id, 'name', pj.name, 'archived', pj.archived)), '[]'::jsonb)
           FROM team_projects tp JOIN projects pj ON pj.id = tp.project_id
           WHERE tp.team_id = te.id) AS projects
      FROM teams te
      WHERE v_is_super OR te.lead_user_id = auth.uid()
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lead_list_my_teams() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_list_my_teams() TO authenticated;

DROP FUNCTION IF EXISTS public.lead_team_projects(uuid);
CREATE OR REPLACE FUNCTION public.lead_team_projects(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  -- Gate a prueba de NULL: si cualquiera de los dos checks devuelve NULL,
  -- `IS NOT TRUE` deniega (con `NOT (...)` el resultado NULL no dispara el IF).
  IF (public.is_superadmin() OR public.is_team_lead_of(p_team_id)) IS NOT TRUE THEN
    RAISE EXCEPTION 'forbidden: not lead of this team';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.name)
    FROM (
      SELECT
        pj.id, pj.name, pj.archived,
        -- experiments.status es el enum experiment_status: LIKE no aplica a enum,
        -- hay que castear a text (mismo patrón que migration_growth_hub_feedback.sql).
        (SELECT count(*) FROM experiments e
          WHERE e.project_id = pj.id AND e.status::text NOT LIKE 'Finished%') AS active_experiments,
        (SELECT count(*) FROM experiments e
          WHERE e.project_id = pj.id AND e.status::text LIKE 'Finished%') AS finished_experiments,
        (SELECT max(al.created_at) FROM activity_log al
          WHERE al.project_id = pj.id) AS last_activity
      FROM team_projects tp
      JOIN projects pj ON pj.id = tp.project_id
      WHERE tp.team_id = p_team_id
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lead_team_projects(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_team_projects(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.lead_team_activity(uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.lead_team_activity(
  p_team_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  -- Gate a prueba de NULL: si cualquiera de los dos checks devuelve NULL,
  -- `IS NOT TRUE` deniega (con `NOT (...)` el resultado NULL no dispara el IF).
  IF (public.is_superadmin() OR public.is_team_lead_of(p_team_id)) IS NOT TRUE THEN
    RAISE EXCEPTION 'forbidden: not lead of this team';
  END IF;
  -- ORDER BY explícito en el agregado: el LIMIT interno elige las 500 filas más
  -- recientes, pero no garantiza el orden en que jsonb_agg las concatena.
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.created_at DESC)
    FROM (
      SELECT
        al.id, al.user_id, pr.full_name AS user_name,
        al.project_id, pj.name AS project_name,
        al.action, al.entity_type, al.entity_id, al.details, al.created_at
      FROM activity_log al
      LEFT JOIN profiles pr ON pr.id = al.user_id
      LEFT JOIN projects pj ON pj.id = al.project_id
      -- Alcance (decisión de producto, no relajar):
      -- el líder ve la actividad de los proyectos DE SU EQUIPO, más las acciones
      -- globales sin proyecto de sus miembros. La rama amplia original
      -- (`user_id IN miembros` sin restringir project_id) filtraba actividad de
      -- proyectos ajenos al equipo — exponía nombres de proyecto y títulos de
      -- experimentos de OTROS equipos a través de un miembro compartido.
      WHERE (
        al.project_id IN (SELECT project_id FROM team_projects WHERE team_id = p_team_id)
        OR (
          al.user_id IN (SELECT user_id FROM team_memberships WHERE team_id = p_team_id)
          AND al.project_id IS NULL
        )
      )
      AND (p_from IS NULL OR al.created_at >= p_from)
      AND (p_to IS NULL OR al.created_at <= p_to)
      ORDER BY al.created_at DESC
      LIMIT 500
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lead_team_activity(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lead_team_activity(uuid, timestamptz, timestamptz) TO authenticated;
