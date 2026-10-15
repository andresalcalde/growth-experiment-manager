-- Fixture mínima local, NO representa un dump de producción.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE ROLE authenticator;
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT current_setting('request.jwt.claim.role',true) $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE TYPE public.project_role_enum AS ENUM ('admin','editor','viewer');
CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text NOT NULL,global_role text DEFAULT 'user',
 can_access_global_library boolean DEFAULT false,full_name text);
CREATE TABLE public.projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL);
CREATE TABLE public.project_members(project_id uuid REFERENCES projects(id),user_id uuid REFERENCES profiles(id),
 role project_role_enum,PRIMARY KEY(project_id,user_id));
CREATE TABLE public.experiments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid REFERENCES projects(id),title text);
CREATE TABLE public.objectives(LIKE public.experiments INCLUDING ALL);
CREATE TABLE public.strategies(LIKE public.experiments INCLUDING ALL);
CREATE TABLE public.north_star_metrics(LIKE public.experiments INCLUDING ALL);
CREATE TABLE public.team_members(LIKE public.experiments INCLUDING ALL);
CREATE TABLE public.activity_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,user_id uuid,action text);
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),
 name text,owner_id text, UNIQUE(bucket_id,name));
CREATE TABLE public.legacy_metadata_probe(id uuid);
CREATE FUNCTION public.is_superadmin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'superadmin') $$;
CREATE FUNCTION public.protect_global_role() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN RETURN NEW; END $$;
CREATE TRIGGER trg_protect_global_role BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_global_role();
CREATE FUNCTION public.create_project_with_membership(p_name text) RETURNS uuid LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = public AS $$
 DECLARE new_id uuid;
 BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
 INSERT INTO projects(name) VALUES(p_name) RETURNING id INTO new_id;
 INSERT INTO project_members VALUES(new_id,auth.uid(),'admin'); RETURN new_id;
 END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','projects','project_members','experiments','objectives','strategies',
 'north_star_metrics','team_members','activity_log'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY "Allow all operations" ON public.%I TO authenticated USING (true) WITH CHECK (true)',t);
 END LOOP;
END $$;
CREATE POLICY "Users can add themselves as members" ON project_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
ALTER TABLE legacy_metadata_probe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Metadata bypass" ON legacy_metadata_probe FOR ALL TO authenticated
 USING (id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin')
 WITH CHECK (id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin');
CREATE POLICY "Metadata restrictive" ON legacy_metadata_probe AS RESTRICTIVE FOR SELECT TO authenticated
 USING (id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'superadmin');
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_public_read ON storage.objects FOR SELECT USING(bucket_id = 'experiment-evidence');
CREATE POLICY evidence_auth_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id = 'experiment-evidence');
CREATE POLICY evidence_auth_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id = 'experiment-evidence');
CREATE POLICY evidence_auth_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id = 'experiment-evidence');
-- Generic permissive policy must not defeat the new restrictive bucket guards.
CREATE POLICY other_storage_policy ON storage.objects TO authenticated USING(true) WITH CHECK(true);
GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public,storage TO authenticated,anon,service_role;
INSERT INTO profiles(id,email,global_role) VALUES
 ('10000000-0000-0000-0000-000000000001','owner@test.invalid','user'),
 ('10000000-0000-0000-0000-000000000002','outsider@test.invalid','user'),
 ('10000000-0000-0000-0000-000000000003','viewer@test.invalid','user'),
 ('10000000-0000-0000-0000-000000000004','super@test.invalid','superadmin');
INSERT INTO projects(id,name) VALUES
 ('20000000-0000-0000-0000-000000000001','A'),('20000000-0000-0000-0000-000000000002','B');
INSERT INTO legacy_metadata_probe VALUES ('10000000-0000-0000-0000-000000000001');
INSERT INTO project_members VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','admin'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','admin'),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','viewer');
INSERT INTO experiments VALUES('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','original');
INSERT INTO north_star_metrics SELECT * FROM experiments;
INSERT INTO team_members SELECT * FROM experiments;
INSERT INTO storage.buckets VALUES('experiment-evidence','experiment-evidence',true,26214400);
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES
 ('experiment-evidence','20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/proof.png','10000000-0000-0000-0000-000000000001'),
 ('experiment-evidence','30000000-0000-0000-0000-000000000001/old.png','10000000-0000-0000-0000-000000000001');
