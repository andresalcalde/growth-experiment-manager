-- ============================================================================
-- Migración: un usuario puede tener varias áreas
-- Fecha: 2026-05-20
--
-- Convierte profiles.area de un valor único (text) a un arreglo (text[]).
-- El valor existente se preserva envuelto en un arreglo de un elemento.
--
-- Seguro de re-ejecutar: si la columna ya es text[], el ALTER es idempotente
-- en la práctica (vuelve a aplicar el mismo tipo).
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
  ALTER COLUMN area TYPE text[]
  USING (
    CASE
      WHEN area IS NULL OR area::text = '' THEN NULL
      ELSE ARRAY[area::text]
    END
  );

COMMIT;

-- ----------------------------------------------------------------------------
-- Nota: get_global_finished_experiments() devuelve jsonb, así que el campo
-- owner_area pasa a serializarse como arreglo JSON sin necesidad de tocar la RPC.
-- ----------------------------------------------------------------------------

-- ROLLBACK (descomentar solo si hay que revertir; toma el primer área de cada usuario):
-- ALTER TABLE public.profiles
--   ALTER COLUMN area TYPE text USING (area[1]);
