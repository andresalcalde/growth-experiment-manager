-- ============================================================================
-- Migración: Growth Hub V2 — Feedback Nicolás
-- Fecha: 2026-05-28
-- Branch: CK
--
-- Implementa los siguientes puntos de feedback en una sola migración:
--   1. Auto-update de la NSM desde Google Sheets / webhook
--      - Agrega columnas a `projects` para configurar fuente de sincronización
--        de la North Star Metric (currentValue se actualiza automáticamente).
--      - Como NSM está denormalizada en `projects` (columnas nsm_*), las nuevas
--        columnas viven en `projects` también.
--
-- La migración es idempotente y segura de re-ejecutar.
-- ============================================================================

BEGIN;

-- ── 1. NSM autosync ──────────────────────────────────────────────────────────
-- source_type: cómo se actualiza la métrica
--   'manual'        → el usuario edita el valor a mano (default, comportamiento actual)
--   'google_sheets' → polling desde una URL CSV pública (export?format=csv)
--   'webhook'       → endpoint /functions/v1/nsm-webhook?token=... (a implementar)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nsm_source_type') THEN
    CREATE TYPE nsm_source_type AS ENUM ('manual', 'google_sheets', 'webhook');
  END IF;
END$$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS nsm_source_type   nsm_source_type NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS nsm_source_url    text,
  ADD COLUMN IF NOT EXISTS nsm_source_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nsm_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS nsm_sync_status   text,
  ADD COLUMN IF NOT EXISTS nsm_webhook_token text;

-- Token único para identificar el proyecto en el webhook (1-shot generation).
-- No regenera tokens existentes para no romper integraciones ya configuradas.
UPDATE public.projects
   SET nsm_webhook_token = encode(gen_random_bytes(16), 'hex')
 WHERE nsm_webhook_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_nsm_webhook_token_uniq
  ON public.projects(nsm_webhook_token)
  WHERE nsm_webhook_token IS NOT NULL;

COMMENT ON COLUMN public.projects.nsm_source_type IS
  'Fuente de actualización de la NSM: manual, google_sheets o webhook.';
COMMENT ON COLUMN public.projects.nsm_source_url IS
  'Para google_sheets: URL CSV pública (docs.google.com/.../export?format=csv).';
COMMENT ON COLUMN public.projects.nsm_source_config IS
  'JSON con configuración del parser: { sheetName, column, headerRow }.';
COMMENT ON COLUMN public.projects.nsm_webhook_token IS
  'Token único usado por la edge function nsm-webhook para identificar el proyecto.';

COMMIT;

-- ROLLBACK:
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_source_type;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_source_url;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_source_config;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_last_synced_at;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_sync_status;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS nsm_webhook_token;
-- DROP INDEX IF EXISTS projects_nsm_webhook_token_uniq;
-- DROP TYPE IF EXISTS nsm_source_type;
