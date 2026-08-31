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

-- Backfill defensivo de profiles ANTES de tocar experiments.
-- Por qué: created_by/resolved_by referencian profiles(id) y se llenan con auth.uid().
-- El trigger handle_new_user() estuvo roto en esta BD (ver hotfix_signup_trigger.sql,
-- 2026-07-23), así que pueden existir usuarios en auth.users SIN fila en profiles; esos
-- usuarios recibirían 23503 (foreign_key_violation) al crear o resolver un experimento.
-- profiles.email es NOT NULL y auth.users.email puede ser NULL: usuarios sin email quedan
-- fuera (no pueden autenticarse en esta app), así que nunca crearán experimentos.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
  AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Backfill del creador desde el log (solo experimentos aún vivos y sin dato).
-- DISTINCT ON + ORDER BY created_at ASC: si hay más de un 'experiment_created' para el
-- mismo entity_id, gana el más antiguo (determinista). Se descartan logs con user_id NULL.
UPDATE public.experiments e SET created_by = src.user_id
FROM (
  SELECT DISTINCT ON (entity_id) entity_id, user_id
  FROM public.activity_log
  WHERE action = 'experiment_created' AND user_id IS NOT NULL
  ORDER BY entity_id, created_at ASC
) src
WHERE src.entity_id = e.id AND e.created_by IS NULL;

-- Índices sobre created_at y project_id ya existen (idx_activity_created / idx_activity_project, ver migration_growth_hub_feedback.sql).

-- Refresca el cache de esquema de PostgREST: sin esto el API sigue devolviendo
-- "column not found" para las columnas nuevas durante unos minutos.
NOTIFY pgrst, 'reload schema';
