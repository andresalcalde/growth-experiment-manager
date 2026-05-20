-- ============================================================================
-- Migración: logo de plataforma por proyecto
-- Fecha: 2026-05-20
--
-- Agrega projects.platform_logo_url: reemplaza el logo "Growth Hub" de la
-- cabecera para todos los miembros de ese proyecto. Es independiente de
-- projects.logo_url (el ícono chico del proyecto que se ve en el portafolio).
--
-- El archivo se sube al bucket existente `project-logos` con la ruta
-- <projectId>/platform-logo.<ext>, así reutiliza las policies de ese bucket.
--
-- Seguro de re-ejecutar.
-- ============================================================================

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS platform_logo_url text;

COMMIT;

-- ROLLBACK:
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS platform_logo_url;
