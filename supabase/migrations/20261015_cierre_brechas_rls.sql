-- Cierre de autorización Growth Hub. SOLO preparar/revisar; aplicación requiere GO.
BEGIN;
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
    IF to_regclass('public.ai_usage') IS NOT NULL OR EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname LIKE 'gh\_%' ESCAPE '\'
    ) THEN RAISE EXCEPTION 'Objetos gh_* o ai_usage preexistentes: revisar colisiones'; END IF;
    INSERT INTO public._rls_backup_20261015
    SELECT 'table', c.oid::regclass::text,
      jsonb_build_object('schema', n.nspname, 'table', c.relname,
                         'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND (
      (n.nspname = 'public' AND c.relname IN ('projects','project_members','profiles',
        'experiments','objectives','strategies','north_star_metrics','team_members','activity_log'))
      OR (n.nspname = 'storage' AND c.relname = 'objects')
      OR EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname
        AND p.tablename = c.relname AND concat(p.qual, p.with_check) LIKE '%user_metadata%')
    );
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
CREATE OR REPLACE FUNCTION public.gh_add_project_member(p_project uuid, p_email text, p_role text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE target_user uuid;
BEGIN
 IF NOT public.gh_project_admin(p_project) OR p_role NOT IN ('admin','editor','viewer') OR p_role IS NULL THEN
   RAISE EXCEPTION 'Invitación no autorizada' USING ERRCODE = '42501'; END IF;
 SELECT id INTO STRICT target_user FROM public.profiles WHERE lower(email) = lower(trim(p_email));
 INSERT INTO public.project_members(project_id,user_id,role)
   VALUES (p_project,target_user,p_role::public.project_role_enum);
 RETURN target_user;
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
  IF (TG_OP = 'INSERT' AND (COALESCE(NEW.global_role::text, 'user') <> 'user'
                            OR COALESCE(NEW.can_access_global_library, false)))
     OR (TG_OP = 'UPDATE' AND (NEW.global_role IS DISTINCT FROM OLD.global_role
                    OR NEW.can_access_global_library IS DISTINCT FROM OLD.can_access_global_library)) THEN
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

-- Fuera de las tablas normalizadas, conservar exactamente el predicado salvo
-- el origen de global_role. Cualquier forma desconocida aborta toda la transacción.
DO $metadata$
DECLARE p record; q text; w text; role_list text; pattern text;
BEGIN
  pattern := '\(\(auth\.jwt\(\) -> ''user_metadata''::text\) ->> ''global_role''::text\) = ''superadmin''::text';
  FOR p IN SELECT * FROM pg_policies WHERE concat(qual,with_check) LIKE '%user_metadata%' LOOP
    q := regexp_replace(p.qual, pattern, 'public.is_superadmin()', 'g');
    w := regexp_replace(p.with_check, pattern, 'public.is_superadmin()', 'g');
    IF concat(q,w) LIKE '%user_metadata%' THEN
      RAISE EXCEPTION 'Predicado metadata no reconocido: %.% %', p.schemaname,p.tablename,p.policyname;
    END IF;
    SELECT string_agg(quote_ident(r), ',') INTO role_list FROM unnest(p.roles) r;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      p.policyname,p.schemaname,p.tablename,p.permissive,p.cmd,role_list,
      CASE WHEN q IS NOT NULL THEN ' USING (' || q || ')' ELSE '' END,
      CASE WHEN w IS NOT NULL THEN ' WITH CHECK (' || w || ')' ELSE '' END);
  END LOOP;
END $metadata$;

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
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (concat(qual,with_check) LIKE '%experiment-evidence%' OR policyname LIKE 'gh_evidence_%') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',p.policyname);
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
 USING (bucket_id = 'experiment-evidence' AND public.gh_project_read(public.gh_evidence_project(name))
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
 USING (bucket_id <> 'experiment-evidence' OR (public.gh_project_read(public.gh_evidence_project(name))
        AND (owner_id = auth.uid()::text OR public.gh_project_admin(public.gh_evidence_project(name)))));

CREATE TABLE IF NOT EXISTS public.ai_usage (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 day date NOT NULL, requests integer NOT NULL CHECK (requests BETWEEN 1 AND 50),
 PRIMARY KEY(user_id, day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
DROP POLICY IF EXISTS gh_ai_own ON public.ai_usage;
CREATE POLICY gh_ai_own ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.gh_reserve_ai_usage(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE reserved integer;
BEGIN
 INSERT INTO public.ai_usage(user_id, day, requests) VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date, 1)
 ON CONFLICT(user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
   WHERE ai_usage.requests < 50 RETURNING requests INTO reserved;
 RETURN reserved IS NOT NULL;
END $$;
DO $grants$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'gh\_%' ESCAPE '\' LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
 END LOOP;
END $grants$;
GRANT EXECUTE ON FUNCTION public.gh_add_project_member(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gh_project_read(uuid), public.gh_project_write(uuid),
 public.gh_project_admin(uuid), public.gh_profile_read(uuid), public.gh_evidence_project(text) TO authenticated, anon;

DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE concat(qual,with_check) LIKE '%user_metadata%') THEN
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
