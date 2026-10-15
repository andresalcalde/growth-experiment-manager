-- Cierre de autorización Growth Hub. SOLO preparar/revisar; aplicación requiere GO.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(20261015);
CREATE TABLE IF NOT EXISTS public._rls_backup_20261015 (
  kind text NOT NULL, key text NOT NULL, data jsonb NOT NULL,
  PRIMARY KEY (kind, key)
);
ALTER TABLE public._rls_backup_20261015 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._rls_backup_20261015 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._rls_backup_20261015 TO service_role;
-- Sin políticas: ni siquiera un superadmin de aplicación puede editar el backup.
-- Solo owner SQL/service role (lectura) lo ve. Nunca sobreescribir una captura.
DO $capture$
DECLARE captured_table record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public._rls_backup_20261015 WHERE kind = 'manifest') THEN
    IF to_regclass('public.ai_usage') IS NOT NULL OR to_regclass('public.ai_global_usage') IS NOT NULL
       OR to_regclass('public.gh_actor_usage') IS NOT NULL OR to_regclass('public.gh_notification_events') IS NOT NULL OR EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname LIKE 'gh\_%' ESCAPE '\'
    ) THEN RAISE EXCEPTION 'Objetos gh_* o ai_usage preexistentes: revisar colisiones'; END IF;
    INSERT INTO public._rls_backup_20261015
    SELECT 'table', c.oid::regclass::text,
      jsonb_build_object('schema', n.nspname, 'table', c.relname,
                         'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p') AND (
      (n.nspname = 'public' AND c.relname IN ('projects','project_members','profiles',
        'experiments','objectives','strategies','north_star_metrics','team_members','activity_log'))
      OR (n.nspname = 'storage' AND c.relname = 'objects')
    );
    INSERT INTO public._rls_backup_20261015
    SELECT 'metadata_inventory',p.schemaname || '.' || p.tablename || '.' || p.policyname,to_jsonb(p)
    FROM pg_policies p WHERE concat(p.qual,p.with_check) ~* 'user_meta';
    INSERT INTO public._rls_backup_20261015
    SELECT 'policy', p.schemaname || '.' || p.tablename || '.' || p.policyname, to_jsonb(p)
    FROM pg_policies p JOIN public._rls_backup_20261015 b
      ON b.kind = 'table' AND p.schemaname = b.data->>'schema' AND p.tablename = b.data->>'table';
    INSERT INTO public._rls_backup_20261015
      SELECT 'bucket', 'experiment-evidence', to_jsonb(b) FROM storage.buckets b WHERE id = 'experiment-evidence';
    -- No sustituimos protect_global_role: conservamos su protección del último
    -- superadmin y añadimos un trigger independiente para ambos privilegios.
    INSERT INTO public._rls_backup_20261015
      SELECT 'function', p.oid::regprocedure::text,
        jsonb_build_object('definition', pg_get_functiondef(p.oid))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'protect_global_role';
    INSERT INTO public._rls_backup_20261015
      SELECT 'trigger', t.tgname, jsonb_build_object('definition', pg_get_triggerdef(t.oid),
        'enabled', t.tgenabled, 'schema', 'public', 'table', 'profiles')
      FROM pg_trigger t WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;
    INSERT INTO public._rls_backup_20261015
      SELECT 'column', 'experiments.owner_id', jsonb_build_object('existed', EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema='public'
          AND table_name='experiments' AND column_name='owner_id'));
    INSERT INTO public._rls_backup_20261015 VALUES ('manifest','captured','{}');
  END IF;
  -- Locks prevent concurrent DDL on touched tables during policy replacement.
  FOR captured_table IN SELECT data FROM public._rls_backup_20261015 WHERE kind = 'table' LOOP
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE', captured_table.data->>'schema', captured_table.data->>'table');
  END LOOP;
END $capture$;

CREATE OR REPLACE FUNCTION public.gh_project_read(p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_superadmin() OR EXISTS (
   SELECT 1 FROM public.project_members WHERE project_id = p_project AND user_id = auth.uid()));
$$;
CREATE OR REPLACE FUNCTION public.gh_project_write(p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_superadmin() OR EXISTS (
   SELECT 1 FROM public.project_members WHERE project_id = p_project AND user_id = auth.uid()
     AND role::text IN ('admin','editor')));
$$;
CREATE OR REPLACE FUNCTION public.gh_project_admin(p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_superadmin() OR EXISTS (
   SELECT 1 FROM public.project_members WHERE project_id = p_project AND user_id = auth.uid() AND role::text = 'admin'));
$$;
-- Shared actor quotas. Reservations return a generic result instead of raising:
-- raising would roll back the counter on an unknown/unconfirmed email.
CREATE TABLE IF NOT EXISTS public.gh_actor_usage (
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL, window_start timestamptz NOT NULL, requests integer NOT NULL,
 PRIMARY KEY(actor,kind,window_start)
);
ALTER TABLE public.gh_actor_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gh_actor_usage FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gh_actor_usage TO service_role;
CREATE OR REPLACE FUNCTION public.gh_add_project_member(p_project uuid, p_email text, p_role text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE target_user uuid; reserved integer;
BEGIN
 IF public.gh_project_admin(p_project) IS NOT TRUE OR p_role IS NULL
    OR p_role NOT IN ('admin','editor','viewer') THEN RETURN NULL; END IF;
 INSERT INTO public.gh_actor_usage VALUES(auth.uid(),'invite',date_trunc('hour',now()),1)
 ON CONFLICT(actor,kind,window_start) DO UPDATE SET requests=gh_actor_usage.requests+1
 WHERE gh_actor_usage.requests < 20 RETURNING requests INTO reserved;
 IF reserved IS NULL THEN RETURN NULL; END IF;
 SELECT id INTO target_user FROM auth.users
 WHERE lower(email)=lower(trim(p_email)) AND email_confirmed_at IS NOT NULL;
 IF target_user IS NULL THEN RETURN NULL; END IF;
 INSERT INTO public.project_members(project_id,user_id,role)
 VALUES(p_project,target_user,p_role::public.project_role_enum) ON CONFLICT DO NOTHING;
 -- Uniform response: no email-existence oracle, including success and duplicates.
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.gh_profile_read(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT auth.uid() IS NOT NULL AND (p_user = auth.uid() OR public.is_superadmin() OR EXISTS (
   SELECT 1 FROM public.project_members me JOIN public.project_members other USING (project_id)
   WHERE me.user_id = auth.uid() AND other.user_id = p_user));
$$;
CREATE OR REPLACE FUNCTION public.gh_protect_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND (NEW.email IS DISTINCT FROM (SELECT u.email FROM auth.users u WHERE u.id=NEW.id)
                            OR COALESCE(NEW.global_role::text, 'user') <> 'user'
                            OR COALESCE(NEW.can_access_global_library, false)))
     OR (TG_OP = 'UPDATE' AND (NEW.global_role IS DISTINCT FROM OLD.global_role
                    OR NEW.can_access_global_library IS DISTINCT FROM OLD.can_access_global_library
                    OR NEW.email IS DISTINCT FROM OLD.email)) THEN
    IF NOT public.is_superadmin() AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT (auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin')) THEN
      RAISE EXCEPTION 'Solo superadmin puede cambiar privilegios del perfil' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gh_protect_profile ON public.profiles;
CREATE TRIGGER gh_protect_profile BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.gh_protect_profile();

-- Reemplazo completo en tablas del Hub: ninguna permisiva antigua puede sumarse por OR.
DO $policies$
DECLARE t text; p record; project_expr text; read_expr text; write_expr text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','project_members','profiles','experiments','objectives',
                           'strategies','north_star_metrics','team_members','activity_log'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF t = 'profiles' THEN
      read_expr := 'public.gh_profile_read(id)';
      EXECUTE 'CREATE POLICY gh_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_superadmin())';
      EXECUTE 'CREATE POLICY gh_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_superadmin()) WITH CHECK (id = auth.uid() OR public.is_superadmin())';
    ELSIF t = 'activity_log' THEN
      read_expr := 'user_id = auth.uid() OR public.is_superadmin()';
      EXECUTE 'CREATE POLICY gh_insert ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
    ELSE
      project_expr := CASE WHEN t = 'projects' THEN 'id' ELSE 'project_id' END;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                     AND table_name = t AND column_name = project_expr) THEN
        -- Legacy team_members sin vínculo verificable: solo superadmin. La UI
        -- Mi equipo usa project_members + profiles y no depende de esta tabla.
        IF t <> 'team_members' THEN RAISE EXCEPTION 'Falta project_id en %', t; END IF;
        read_expr := 'public.is_superadmin()'; write_expr := read_expr;
      ELSE
        read_expr := format('public.gh_project_read(%I)', project_expr);
        write_expr := format('public.gh_project_write(%I)', project_expr);
      END IF;
      IF t = 'project_members' THEN
        write_expr := 'public.gh_project_admin(project_id)';
        EXECUTE format('CREATE POLICY gh_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s AND role::text IN (''admin'',''editor'',''viewer''))', t, write_expr);
        EXECUTE format('CREATE POLICY gh_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s AND role::text IN (''admin'',''editor'',''viewer''))', t, write_expr, write_expr);
      ELSIF t = 'projects' THEN
        -- Primera membresía solo vía create_project_with_membership (SECURITY DEFINER).
        EXECUTE 'CREATE POLICY gh_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_superadmin())';
        EXECUTE format('CREATE POLICY gh_update ON public.projects FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', write_expr, write_expr);
      ELSE
        EXECUTE format('CREATE POLICY gh_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t,
          CASE WHEN t = 'activity_log' THEN write_expr || ' AND user_id = auth.uid()' ELSE write_expr END);
        EXECUTE format('CREATE POLICY gh_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t, write_expr, write_expr);
      END IF;
      EXECUTE format('CREATE POLICY gh_delete ON public.%I FOR DELETE TO authenticated USING (%s)', t,
        CASE WHEN t IN ('projects','project_members') THEN format('public.gh_project_admin(%I)', project_expr) ELSE write_expr END);
    END IF;
    EXECUTE format('CREATE POLICY gh_select ON public.%I FOR SELECT TO authenticated USING (%s)', t, read_expr);
  END LOOP;
END $policies$;

-- Other applications keep their policies verbatim. Only Hub tables are replaced.
-- Match user_meta, including raw_user_meta_data (capture inventory and final check).
DO $metadata$
DECLARE p record; f record;
BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE concat(qual,with_check) ~* 'user_meta' LOOP
   IF p.schemaname='public' AND p.tablename IN ('projects','project_members','profiles',
      'experiments','objectives','strategies','north_star_metrics','team_members','activity_log') THEN
     RAISE EXCEPTION 'Metadata residual en Hub: %.% %',p.schemaname,p.tablename,p.policyname;
   END IF;
   RAISE NOTICE 'PENDIENTE otra app (sin cambios): %.% %',p.schemaname,p.tablename,p.policyname;
 END LOOP;
 FOR f IN SELECT n.nspname,proc.proname FROM pg_proc proc JOIN pg_namespace n ON n.oid=proc.pronamespace
   WHERE proc.prosecdef AND (proc.prosrc ~* 'user_meta' OR proc.prosrc ~* 'auth[.]jwt[[:space:]]*[(]')
   AND proc.prosrc ~* '(global_role|superadmin|["'']role["''])' LOOP
   RAISE EXCEPTION 'SECURITY DEFINER decide rol desde metadata/JWT: %.%',f.nspname,f.proname;
 END LOOP;
END $metadata$;

-- Add a durable owner identity. Historical ambiguous names remain unassigned.
ALTER TABLE public.experiments ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.experiments e SET owner_id = (
 SELECT min(pm.user_id::text)::uuid FROM public.project_members pm JOIN public.profiles pr ON pr.id=pm.user_id
 WHERE pm.project_id=e.project_id AND lower(trim(pr.full_name))=lower(trim(e.owner_name))
 HAVING count(*)=1
) WHERE e.owner_id IS NULL;

-- Ruta nueva: project_id/experiment_id/archivo. Compatibilidad con evidencia
-- antigua experiment_id/archivo sin mover objetos ni reescribir sus metadatos.
CREATE OR REPLACE FUNCTION public.gh_evidence_project(p_name text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT COALESCE(
   (SELECT id FROM public.projects WHERE id::text = split_part(p_name,'/',1)),
   (SELECT project_id FROM public.experiments WHERE id::text = split_part(p_name,'/',1)));
$$;
INSERT INTO storage.buckets(id,name,public) VALUES ('experiment-evidence','experiment-evidence',false)
  ON CONFLICT(id) DO UPDATE SET public = false;
DO $storage$
DECLARE p record; role_list text;
BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
   AND (policyname LIKE 'gh_evidence_%' OR (concat(qual,with_check) LIKE '%experiment-evidence%'
     AND concat(qual,with_check) NOT LIKE '%bucket_id <> ''experiment-evidence''%')) LOOP
   EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',p.policyname);
   IF p.policyname NOT LIKE 'gh_evidence_%' THEN
     SELECT string_agg(quote_ident(r),',') INTO role_list FROM unnest(p.roles) r;
     EXECUTE format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s%s%s',
       p.policyname,p.permissive,p.cmd,role_list,
       CASE WHEN p.qual IS NOT NULL THEN ' USING (bucket_id <> ''experiment-evidence'' AND (' || p.qual || '))' ELSE '' END,
       CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (bucket_id <> ''experiment-evidence'' AND (' || p.with_check || '))' ELSE '' END);
   END IF;
 END LOOP;
END $storage$;
CREATE POLICY gh_evidence_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id = 'experiment-evidence' AND public.gh_project_read(public.gh_evidence_project(name)));
CREATE POLICY gh_evidence_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id = 'experiment-evidence' AND public.gh_project_write(public.gh_evidence_project(name))
             AND split_part(name,'/',1) = public.gh_evidence_project(name)::text);
CREATE POLICY gh_evidence_update ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id = 'experiment-evidence' AND public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name))))
 WITH CHECK (bucket_id = 'experiment-evidence' AND public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name))));
CREATE POLICY gh_evidence_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id = 'experiment-evidence' AND public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name))));
-- Restrictivas: otra política genérica de Storage no puede reabrir este bucket.
CREATE POLICY gh_evidence_guard_select ON storage.objects AS RESTRICTIVE FOR SELECT TO public
 USING (bucket_id <> 'experiment-evidence' OR public.gh_project_read(public.gh_evidence_project(name)));
CREATE POLICY gh_evidence_guard_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO public
 WITH CHECK (bucket_id <> 'experiment-evidence' OR (public.gh_project_write(public.gh_evidence_project(name))
             AND split_part(name,'/',1) = public.gh_evidence_project(name)::text));
CREATE POLICY gh_evidence_guard_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
 USING (bucket_id <> 'experiment-evidence' OR (public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name)))))
 WITH CHECK (bucket_id <> 'experiment-evidence' OR (public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name)))));
CREATE POLICY gh_evidence_guard_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO public
 USING (bucket_id <> 'experiment-evidence' OR (public.gh_project_write(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name)))));

CREATE TABLE IF NOT EXISTS public.ai_usage (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 day date NOT NULL, requests integer NOT NULL CHECK (requests BETWEEN 1 AND 50),
 PRIMARY KEY(user_id, day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
DROP POLICY IF EXISTS gh_ai_own ON public.ai_usage;
CREATE POLICY gh_ai_own ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE IF NOT EXISTS public.ai_global_usage (
 day date PRIMARY KEY, requests integer NOT NULL CHECK(requests > 0)
);
ALTER TABLE public.ai_global_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_global_usage FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.ai_global_usage TO service_role;
CREATE OR REPLACE FUNCTION public.gh_reserve_ai_usage(p_user_id uuid, p_global_limit integer DEFAULT 1000) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE reserved integer; today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
 IF p_global_limit IS NULL OR p_global_limit < 1 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RETURN false; END IF;
 -- Global row locks serialize all reservations. Roll back both counters on denial.
 BEGIN
   INSERT INTO public.ai_global_usage VALUES(today,1)
   ON CONFLICT(day) DO UPDATE SET requests=ai_global_usage.requests+1
   WHERE ai_global_usage.requests < p_global_limit RETURNING requests INTO reserved;
   IF reserved IS NULL THEN RETURN false; END IF;
   INSERT INTO public.ai_usage(user_id,day,requests) VALUES(p_user_id,today,1)
   ON CONFLICT(user_id,day) DO UPDATE SET requests=ai_usage.requests+1
   WHERE ai_usage.requests < 50 RETURNING requests INTO reserved;
   IF reserved IS NULL THEN RAISE EXCEPTION 'quota' USING ERRCODE='P0002'; END IF;
 EXCEPTION WHEN no_data_found THEN RETURN false;
 END;
 RETURN true;
END $$;
CREATE TABLE IF NOT EXISTS public.gh_notification_events (
 experiment_id uuid PRIMARY KEY REFERENCES public.experiments(id) ON DELETE CASCADE,
 actor uuid NOT NULL REFERENCES auth.users(id), reserved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gh_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gh_notification_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gh_notification_events TO service_role;
CREATE OR REPLACE FUNCTION public.gh_reserve_notification(p_actor uuid,p_experiment uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE reserved integer;
BEGIN
 -- Global experiment lock: concurrent actors/instances cannot send the same event.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_experiment::text,0));
 IF EXISTS(SELECT 1 FROM public.gh_notification_events WHERE experiment_id=p_experiment) THEN RETURN 'duplicate'; END IF;
 INSERT INTO public.gh_actor_usage VALUES(p_actor,'notification',date_trunc('minute',now()),1)
 ON CONFLICT(actor,kind,window_start) DO UPDATE SET requests=gh_actor_usage.requests+1
 WHERE gh_actor_usage.requests < 5 RETURNING requests INTO reserved;
 IF reserved IS NULL THEN RETURN 'quota'; END IF;
 INSERT INTO public.gh_notification_events(experiment_id,actor) VALUES(p_experiment,p_actor);
 RETURN 'reserved';
END $$;
CREATE OR REPLACE FUNCTION public.gh_library_evidence_paths(p_experiment uuid) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT COALESCE(array_agg(o.name),ARRAY[]::text[]) FROM storage.objects o
 WHERE o.bucket_id='experiment-evidence' AND EXISTS (
  SELECT 1 FROM public.experiments e CROSS JOIN LATERAL unnest(e.visual_proof) v(ref)
  WHERE e.id=p_experiment AND e.is_public AND e.status::text LIKE 'Finished%'
   AND public.gh_evidence_project(o.name)=e.project_id
   AND (v.ref='storage://experiment-evidence/' || o.name OR
     split_part(v.ref,'?',1) = substring(v.ref FROM '^https?://[^/]+') || '/storage/v1/object/public/experiment-evidence/' || o.name OR
     split_part(v.ref,'?',1) = substring(v.ref FROM '^https?://[^/]+') || '/storage/v1/object/sign/experiment-evidence/' || o.name)
 ) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND
  (can_access_global_library OR global_role::text IN ('admin','superadmin')));
$$;
DO $grants$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'gh\_%' ESCAPE '\' LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
 END LOOP;
END $grants$;
GRANT EXECUTE ON FUNCTION public.gh_add_project_member(uuid,text,text), public.gh_library_evidence_paths(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gh_project_read(uuid), public.gh_project_write(uuid),
 public.gh_project_admin(uuid), public.gh_profile_read(uuid), public.gh_evidence_project(text) TO authenticated, anon;

DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE concat(qual,with_check) ~* 'user_meta'
   AND schemaname='public' AND tablename IN ('projects','project_members','profiles','experiments',
      'objectives','strategies','north_star_metrics','team_members','activity_log')) THEN
   RAISE EXCEPTION 'Quedan políticas basadas en user_metadata'; END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
   AND tablename IN ('projects','project_members','profiles','experiments','objectives','strategies',
                     'north_star_metrics','team_members','activity_log') AND policyname NOT LIKE 'gh_%') THEN
   RAISE EXCEPTION 'Quedan políticas heredadas'; END IF;
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'experiment-evidence' AND public) THEN
   RAISE EXCEPTION 'Bucket aún público'; END IF;
END $verify$;
COMMIT;
-- Lista efectiva y exacta para revisión tras aplicación autorizada.
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
 WHERE (schemaname = 'public' AND policyname LIKE 'gh_%')
 OR (schemaname = 'storage' AND policyname LIKE 'gh_evidence_%') ORDER BY 1,2,3;
