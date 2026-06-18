-- ============================================================================
-- 04a_migration_add_admin_role.sql
-- Punto 6 (parte 1 de 2): agrega el rol intermedio 'admin' al enum.
--
-- DEBE correrse SOLO y ANTES de 04b. Postgres no permite USAR un valor de enum
-- recién agregado dentro de la misma transacción en que se agregó (error 55P04).
-- Por eso esta línea va en su propia ejecución: córrela, dale Run, y reci é n
-- entonces corre 04b (que sí usa 'admin' en la función is_admin_or_above).
--
-- Idempotente: si 'admin' ya existe, no hace nada.
-- ============================================================================

ALTER TYPE global_role_enum ADD VALUE IF NOT EXISTS 'admin';
