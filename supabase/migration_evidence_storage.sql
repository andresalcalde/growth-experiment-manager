-- Migración: bucket de Storage para evidencia de experimentos (CaseStudyModal editable)
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema base.
-- Crea un bucket público 'experiment-evidence' y políticas para usuarios autenticados.

-- 1. Bucket público (idempotente)
insert into storage.buckets (id, name, public)
values ('experiment-evidence', 'experiment-evidence', true)
on conflict (id) do update set public = true;

-- 2. Políticas RLS sobre storage.objects para este bucket
-- Lectura pública (las URLs son getPublicUrl)
drop policy if exists "evidence_public_read" on storage.objects;
create policy "evidence_public_read"
  on storage.objects for select
  using (bucket_id = 'experiment-evidence');

-- Subida: cualquier usuario autenticado
drop policy if exists "evidence_auth_insert" on storage.objects;
create policy "evidence_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'experiment-evidence');

-- Actualización: cualquier usuario autenticado
drop policy if exists "evidence_auth_update" on storage.objects;
create policy "evidence_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'experiment-evidence');

-- Borrado: cualquier usuario autenticado
drop policy if exists "evidence_auth_delete" on storage.objects;
create policy "evidence_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'experiment-evidence');
