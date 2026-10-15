-- Reversión por captura. Revierte autorización; no borra datos de negocio.
-- Detener tráfico antes de aplicar: restaura también políticas vulnerables.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(20261015);
DO $rollback$
DECLARE b record; p record; d jsonb; role_list text; assignments text;
BEGIN
 IF to_regclass('public._rls_backup_20261015') IS NULL THEN RETURN; END IF;
 IF NOT EXISTS (SELECT 1 FROM public._rls_backup_20261015 WHERE kind = 'manifest') THEN
   RAISE EXCEPTION 'Captura incompleta'; END IF;
 FOR b IN SELECT data FROM public._rls_backup_20261015 WHERE kind = 'table' LOOP
   EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE', b.data->>'schema', b.data->>'table');
   FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = b.data->>'schema'
      AND tablename = b.data->>'table' LOOP
     EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname,b.data->>'schema',b.data->>'table');
   END LOOP;
 END LOOP;
 DROP TRIGGER IF EXISTS gh_protect_profile ON public.profiles;
 FOR b IN SELECT data FROM public._rls_backup_20261015 WHERE kind = 'function' LOOP
   EXECUTE b.data->>'definition';
 END LOOP;
 -- Los triggers originales no fueron sustituidos; restaurar igualmente su DDL
 -- y su estado de habilitación desde la captura.
 FOR b IN SELECT key,data FROM public._rls_backup_20261015 WHERE kind = 'trigger' LOOP
   EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',b.key,b.data->>'schema',b.data->>'table');
   EXECUTE b.data->>'definition';
   EXECUTE format('ALTER TABLE %I.%I %s TRIGGER %I',b.data->>'schema',b.data->>'table',
     CASE b.data->>'enabled' WHEN 'D' THEN 'DISABLE' WHEN 'A' THEN 'ENABLE ALWAYS'
       WHEN 'R' THEN 'ENABLE REPLICA' ELSE 'ENABLE' END,b.key);
 END LOOP;
 FOR b IN SELECT data FROM public._rls_backup_20261015 WHERE kind = 'policy' LOOP
   d := b.data;
   SELECT string_agg(quote_ident(r), ',') INTO role_list FROM jsonb_array_elements_text(d->'roles') r;
   EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
     d->>'policyname',d->>'schemaname',d->>'tablename',d->>'permissive',d->>'cmd',role_list,
     CASE WHEN d->>'qual' IS NOT NULL THEN ' USING (' || (d->>'qual') || ')' ELSE '' END,
     CASE WHEN d->>'with_check' IS NOT NULL THEN ' WITH CHECK (' || (d->>'with_check') || ')' ELSE '' END);
 END LOOP;
 FOR b IN SELECT data FROM public._rls_backup_20261015 WHERE kind = 'table' LOOP
   IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=b.data->>'schema' AND c.relname=b.data->>'table'
        AND c.relrowsecurity IS DISTINCT FROM (b.data->>'rls')::boolean) THEN
     EXECUTE format('ALTER TABLE %I.%I %s ROW LEVEL SECURITY',b.data->>'schema',b.data->>'table',
       CASE WHEN (b.data->>'rls')::boolean THEN 'ENABLE' ELSE 'DISABLE' END);
   END IF;
   IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=b.data->>'schema' AND c.relname=b.data->>'table'
        AND c.relforcerowsecurity IS DISTINCT FROM (b.data->>'force_rls')::boolean) THEN
     EXECUTE format('ALTER TABLE %I.%I %s FORCE ROW LEVEL SECURITY',b.data->>'schema',b.data->>'table',
       CASE WHEN (b.data->>'force_rls')::boolean THEN '' ELSE 'NO' END);
   END IF;
 END LOOP;
 SELECT data INTO d FROM public._rls_backup_20261015 WHERE kind = 'bucket' AND key = 'experiment-evidence';
 IF d IS NOT NULL THEN
   SELECT string_agg(format('%I = restored.%I', column_name,column_name), ',') INTO assignments
   FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'buckets'
     AND column_name <> 'id' AND is_generated = 'NEVER';
   EXECUTE format('UPDATE storage.buckets target SET %s FROM jsonb_populate_record(NULL::storage.buckets,$1) restored WHERE target.id = restored.id',assignments) USING d;
 ELSE
   -- Si hubo nuevas subidas, el FK impide borrar el bucket y revierte el
   -- rollback completo: respaldar/mover esos objetos antes de reintentar.
   DELETE FROM storage.buckets WHERE id = 'experiment-evidence';
 END IF;
 DROP FUNCTION IF EXISTS public.gh_library_evidence_paths(uuid);
 DROP FUNCTION IF EXISTS public.gh_evidence_path(text);
 DROP FUNCTION IF EXISTS public.gh_reserve_notification(uuid,uuid);
 DROP TABLE IF EXISTS public.gh_notification_events;
 DROP TABLE IF EXISTS public.gh_actor_usage;
 DROP FUNCTION IF EXISTS public.gh_reserve_ai_usage(uuid,integer);
 DROP TABLE IF EXISTS public.ai_global_usage;
 IF EXISTS(SELECT 1 FROM public._rls_backup_20261015 WHERE kind='column'
   AND key='experiments.owner_id' AND NOT (data->>'existed')::boolean) THEN
   ALTER TABLE public.experiments DROP COLUMN owner_id;
 ELSE
   SELECT data INTO d FROM public._rls_backup_20261015 WHERE kind='column' AND key='experiments.owner_id';
   IF d ? 'default' THEN
     IF d->>'default' IS NULL THEN
       ALTER TABLE public.experiments ALTER COLUMN owner_id DROP DEFAULT;
     ELSE
       EXECUTE 'ALTER TABLE public.experiments ALTER COLUMN owner_id SET DEFAULT ' || (d->>'default');
     END IF;
   END IF;
 END IF;
 DROP TABLE IF EXISTS public.ai_usage;
 DROP FUNCTION IF EXISTS public.gh_protect_profile();
 DROP FUNCTION IF EXISTS public.gh_evidence_project(text);
 DROP FUNCTION IF EXISTS public.gh_profile_read(uuid);
 DROP FUNCTION IF EXISTS public.gh_add_project_member(uuid,text,text);
 DROP FUNCTION IF EXISTS public.gh_project_admin(uuid);
 DROP FUNCTION IF EXISTS public.gh_project_write(uuid);
 DROP FUNCTION IF EXISTS public.gh_project_read(uuid);
 DROP TABLE public._rls_backup_20261015;
END $rollback$;
COMMIT;
