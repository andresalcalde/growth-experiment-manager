-- ============================================================================
-- 05_migration_global_library_privacy.sql
-- Feedback Growth Lab v4 — Punto 5: control de privacidad y acceso a la
-- Biblioteca Global.
--
-- Objetivo:
--   (a) Que admins/superadmin definan qué usuarios acceden a la Biblioteca
--       Global  → columna profiles.can_access_global_library.
--   (b) Que cada experimento sea público (visible en la Biblioteca Global) o
--       privado (solo dentro del proyecto)  → columna experiments.is_public.
--   (c) Que los experimentos nuevos queden privados por defecto  → DEFAULT false.
--
-- La RPC get_global_finished_experiments() pasa a:
--   - devolver SOLO experimentos con is_public = true, y
--   - devolver filas SOLO si el usuario que llama tiene acceso
--     (can_access_global_library = true, o es admin/superadmin).
--
-- Correr en el SQL Editor de Supabase DESPUÉS de las migraciones previas.
-- Idempotente.
-- ============================================================================

-- 1) Visibilidad por experimento. Privado por defecto (los nuevos quedan
--    privados; los existentes también, hasta que un editor los publique).
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2) Acceso a la Biblioteca Global por usuario. Falso por defecto.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_global_library boolean NOT NULL DEFAULT false;

-- 2b) Grandfathering (DECISIÓN del equipo/cliente — elegir UNA opción):
--
--   OPCIÓN A (por defecto, no rompe nada): el equipo interno actual conserva
--   el acceso que ya tenía. Los clientes externos que se den de alta después
--   quedarán en false. Dejar esta línea activa:
UPDATE public.profiles SET can_access_global_library = true
  WHERE can_access_global_library IS DISTINCT FROM true;
--
--   OPCIÓN B (arranque estricto): nadie tiene acceso al inicio salvo
--   admin/superadmin (que siempre acceden por rol). Se va concediendo a mano
--   desde Admin → Usuarios. Para usar B: comentar el UPDATE de arriba.
--   (No hace falta otro UPDATE: la columna ya nace en false por DEFAULT.)

-- 3) RPC con filtro de visibilidad + control de acceso del llamante.
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
      -- (b) Solo experimentos marcados como públicos.
      AND e.is_public = true
      -- (a) Solo si el usuario que llama tiene acceso a la Biblioteca Global.
      AND EXISTS (
        SELECT 1 FROM profiles me
        WHERE me.id = auth.uid()
          AND (
            me.can_access_global_library = true
            OR me.global_role IN ('admin', 'superadmin')
          )
      )
    ORDER BY e.end_date DESC NULLS LAST
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_finished_experiments() TO authenticated;
