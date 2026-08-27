-- supabase/audit/00_audit_prod.sql — SOLO LECTURA.
-- Correr en el SQL Editor de Supabase (prod) y pegar el output completo
-- en claudedocs/prod-policy-audit-2026-08-27.md
-- Contexto: la BD de prod diverge del repo; este inventario es el insumo del
-- Gate A antes de aplicar las migraciones 06-09 (ajustes Catalina 2026-08).

-- 1) Todas las políticas RLS de las tablas relevantes
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('projects','project_members','objectives','strategies','experiments',
                    'north_star_metrics','team_members','teams','team_memberships','team_projects',
                    'activity_log','profiles','user_areas')
ORDER BY tablename, cmd, policyname;

-- 2) Funciones public existentes (para saber qué RPCs/helpers ya están)
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 3) Columnas de las tablas que las migraciones van a tocar
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('experiments','activity_log','projects','profiles','teams')
ORDER BY table_name, ordinal_position;

-- 4) Triggers activos
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
