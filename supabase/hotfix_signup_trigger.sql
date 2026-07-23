-- ============================================================================
-- hotfix_signup_trigger.sql
-- Arregla la creación de cuentas rota (2026-07-23).
--
-- Síntoma: POST /auth/v1/signup devolvía 500 "Database error saving new user".
-- Causa: el trigger handle_new_user() EN PRODUCCIÓN estaba desincronizado del
--   repo — insertaba en profiles (id, full_name, role), pero la tabla usa la
--   columna `global_role` (no `role`) y `email` es NOT NULL. El insert fallaba.
-- Fix: restaurar la versión correcta (inserta email, deja global_role en su
--   default 'user'). Idempotente. Correr en el SQL Editor de Supabase.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El trigger ya existe (on_auth_user_created AFTER INSERT ON auth.users);
-- solo se reemplaza el cuerpo de la función.
