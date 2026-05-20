-- ============================================================================
-- Migración: áreas administrables por superadmin
-- Fecha: 2026-05-20
--
-- Convierte las áreas de un enum fijo (user_area) a una tabla (user_areas)
-- que los superadmins pueden gestionar (agregar / eliminar) desde el panel.
--
-- Seguro de re-ejecutar. El enum user_area se deja intacto (huérfano, sin uso)
-- para no arriesgar la migración con dependencias; no estorba.
-- ============================================================================

BEGIN;

-- 1. Tabla de áreas ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_areas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed con las 4 áreas actuales ------------------------------------------
INSERT INTO public.user_areas (name) VALUES
  ('Paid Media'),
  ('SEO'),
  ('Crossmedia'),
  ('CRO')
ON CONFLICT (name) DO NOTHING;

-- 3. profiles.area: enum user_area -> text -----------------------------------
-- Necesario para que un perfil pueda asignarse a un área creada después.
ALTER TABLE public.profiles
  ALTER COLUMN area TYPE text USING area::text;

-- 4. RLS: todos leen las áreas; solo superadmin las modifica -----------------
ALTER TABLE public.user_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_areas_select ON public.user_areas;
CREATE POLICY user_areas_select ON public.user_areas
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS user_areas_insert ON public.user_areas;
CREATE POLICY user_areas_insert ON public.user_areas
  FOR INSERT
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS user_areas_delete ON public.user_areas;
CREATE POLICY user_areas_delete ON public.user_areas
  FOR DELETE
  USING (public.is_superadmin());

COMMIT;
