-- ============================================================================
-- 08_migration_traceability.sql
-- Punto 3 de Catalina: trazabilidad de quién crea y quién resuelve.
-- - activity_log.details: transiciones {from, to, title} (títulos sobreviven
--   al borrado del experimento).
-- - experiments.created_by: DEFAULT auth.uid() → se llena solo en cada INSERT
--   (cliente o RPC). Backfill histórico desde activity_log.
-- - experiments.resolved_by/resolved_at: los setea el frontend al pasar a
--   Finished-* (ver ProjectContext.updateExperiment).
-- Idempotente. Correr después de 06 y 07.
-- ============================================================================

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS details jsonb;

ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Backfill del creador desde el log (solo experimentos aún vivos y sin dato).
UPDATE public.experiments e
SET created_by = al.user_id
FROM public.activity_log al
WHERE al.action = 'experiment_created'
  AND al.entity_id = e.id
  AND e.created_by IS NULL;

-- Índices sobre created_at y project_id ya existen (idx_activity_created / idx_activity_project, ver migration_growth_hub_feedback.sql).
