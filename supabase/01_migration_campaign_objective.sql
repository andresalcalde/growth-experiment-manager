-- ============================================================================
-- migration_campaign_objective.sql
-- Punto 2 del feedback Growth Lab: filtro por "objetivo de campaña" en la
-- Biblioteca Global.
--
-- Agrega la columna `campaign_objective` a experiments (texto libre: Ventas,
-- Leads, Tráfico, Awareness, etc.) y la expone en la RPC global.
--
-- Correr en el SQL Editor de Supabase DESPUÉS del esquema base y las
-- migraciones previas. Idempotente.
-- ============================================================================

-- 1) Columna nueva (nullable: los experimentos existentes quedan sin objetivo;
--    la obligatoriedad se exige en el formulario de creación del frontend).
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS campaign_objective text;

-- 2) Reemplaza la RPC para incluir campaign_objective en el payload global.
DROP FUNCTION IF EXISTS public.get_global_finished_experiments();

CREATE OR REPLACE FUNCTION public.get_global_finished_experiments()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  FROM (
    SELECT
      e.id,
      e.project_id,
      p.name AS project_name,
      e.title,
      e.status,
      e.owner_name,
      e.owner_avatar,
      (SELECT pr.area FROM profiles pr
         WHERE lower(pr.full_name) = lower(e.owner_name) LIMIT 1) AS owner_area,
      e.hypothesis,
      e.observation,
      e.problem,
      e.funnel_stage,
      e.north_star_metric,
      e.campaign_objective,
      e.impact,
      e.confidence,
      e.ease,
      e.ice_score,
      e.start_date,
      e.end_date,
      e.key_learnings,
      e.verdict,
      e.visual_proof
    FROM experiments e
    JOIN projects p ON p.id = e.project_id
    WHERE e.status::text IN (
      'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
    )
    ORDER BY e.end_date DESC NULLS LAST
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_finished_experiments() TO authenticated;
