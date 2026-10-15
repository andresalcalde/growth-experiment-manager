// Opt-in PostgreSQL verification. Requires psql on PATH and explicit fixtures.
// No .env reads, migrations, or committed writes. Never run by npm build/test.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROD_REF = 'oumhhngnwjijtmgpnhba';
export function validateTarget(value, allowProd = false) {
  if (!value) throw new Error('DATABASE_URL explícita obligatoria; no se lee .env.');
  let target;
  try { target = new URL(value); } catch { throw new Error('DATABASE_URL inválida.'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error('DATABASE_URL debe ser PostgreSQL.');
  if (!allowProd && decodeURIComponent(value).toLowerCase().includes(PROD_REF)) {
    throw new Error('Destino de producción bloqueado; requiere --allow-prod.');
  }
  return value;
}
export function verificationSql(env) {
  const required = ['RLS_TEST_USER_ID', 'RLS_TEST_FOREIGN_PROJECT_ID', 'RLS_TEST_VIEWER_ID', 'RLS_TEST_VIEWER_PROJECT_ID'];
  for (const key of required) if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env[key] || '')) {
    throw new Error(`${key} debe ser un UUID explícito de la BD de pruebas.`);
  }
  const [user, foreign, viewer, own] = required.map(key => env[key]);
  return `BEGIN;
SET LOCAL statement_timeout = '10s';
CREATE TEMP TABLE gh_negative_samples(table_name text PRIMARY KEY, sample jsonb) ON COMMIT DROP;
GRANT SELECT ON gh_negative_samples TO authenticated;
DO $fixtures$
DECLARE t text; has_project boolean; sampled bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id='${user}' AND global_role::text <> 'superadmin')
 OR NOT EXISTS(SELECT 1 FROM profiles WHERE id='${viewer}' AND global_role::text <> 'superadmin')
 OR EXISTS(SELECT 1 FROM project_members WHERE user_id='${user}' AND project_id='${foreign}')
 OR NOT EXISTS(SELECT 1 FROM project_members WHERE user_id='${viewer}' AND project_id='${own}' AND role::text='viewer')
 THEN RAISE EXCEPTION 'Fixtures de usuario/proyecto/viewer inválidas'; END IF;
 IF to_regclass('public._rls_backup_20261015') IS NULL THEN RAISE EXCEPTION 'Migración de seguridad ausente'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE concat(qual,with_check) ~* 'user_meta' AND ((schemaname='public' AND tablename IN ('projects','project_members','profiles','experiments','objectives','strategies','north_star_metrics','team_members','activity_log')) OR (schemaname='storage' AND tablename='objects')))
 OR EXISTS(SELECT 1 FROM storage.buckets WHERE id='experiment-evidence' AND public)
 THEN RAISE EXCEPTION 'Persisten metadata o bucket público'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='experiment-evidence' AND gh_evidence_project(name)='${foreign}')
 THEN RAISE EXCEPTION 'Falta evidencia en el proyecto ajeno'; END IF;
 FOREACH t IN ARRAY ARRAY['experiments','objectives','strategies','north_star_metrics','team_members'] LOOP
   SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='project_id') INTO has_project;
   EXECUTE format('INSERT INTO gh_negative_samples SELECT %L,to_jsonb(r) FROM public.%I r %s LIMIT 1', t,t,
     CASE WHEN has_project THEN 'WHERE project_id=''' || '${foreign}' || '''::uuid' ELSE '' END);
   GET DIAGNOSTICS sampled = ROW_COUNT;
   IF sampled <> 1 THEN RAISE EXCEPTION 'Falta fila de prueba ajena en %',t; END IF;
 END LOOP;
 INSERT INTO gh_negative_samples SELECT 'viewer_experiments',to_jsonb(r) FROM experiments r WHERE project_id='${own}' LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Falta experimento del viewer'; END IF;
END $fixtures$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${user}',true),set_config('request.jwt.claim.role','authenticated',true),
 set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated","user_metadata":{"global_role":"superadmin"}}',true);
DO $negative$
DECLARE t text; sample_row jsonb; affected bigint; has_project boolean;
BEGIN
 BEGIN
  INSERT INTO project_members(project_id,user_id,role) VALUES('${foreign}','${user}','admin');
  RAISE EXCEPTION 'FAIL autoasignación admin';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS autoasignación admin denegada'; END;
 BEGIN
  UPDATE profiles SET global_role='superadmin' WHERE id='${user}';
  RAISE EXCEPTION 'FAIL global_role';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS global_role protegido'; END;
 BEGIN
  UPDATE profiles SET can_access_global_library=NOT coalesce(can_access_global_library,false) WHERE id='${user}';
  RAISE EXCEPTION 'FAIL biblioteca global';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS biblioteca global protegida'; END;
 IF EXISTS(SELECT 1 FROM projects WHERE id='${foreign}') THEN RAISE EXCEPTION 'FAIL metadata falsificado'; END IF;
 RAISE NOTICE 'PASS metadata falsificado sin acceso ajeno';
 FOREACH t IN ARRAY ARRAY['experiments','objectives','strategies','north_star_metrics','team_members'] LOOP
  SELECT sample INTO sample_row FROM gh_negative_samples WHERE table_name=t;
  has_project := sample_row ? 'project_id';
  EXECUTE format('SELECT count(*) FROM public.%I %s',t,CASE WHEN has_project THEN 'WHERE project_id=''' || '${foreign}' || '''::uuid' ELSE '' END) INTO affected;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL lectura ajena %',t; END IF;
  BEGIN
   EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I,$1)',t,t)
    USING sample_row || jsonb_build_object('id',gen_random_uuid());
   RAISE EXCEPTION 'FAIL inserción ajena %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE format('UPDATE public.%I SET id=id WHERE id=$1',t) USING (sample_row->>'id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL update ajeno %',t; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING (sample_row->>'id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL delete ajeno %',t; END IF;
  RAISE NOTICE 'PASS lectura/escritura ajena denegada %',t;
 END LOOP;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='experiment-evidence' AND gh_evidence_project(name)='${foreign}')
 THEN RAISE EXCEPTION 'FAIL evidencia ajena visible'; END IF;
 DELETE FROM storage.objects WHERE bucket_id='experiment-evidence' AND gh_evidence_project(name)='${foreign}';
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'FAIL borrado evidencia ajena'; END IF;
 RAISE NOTICE 'PASS evidencia ajena no se lee ni se borra';
END $negative$;
SELECT set_config('request.jwt.claim.sub','${viewer}',true),
 set_config('request.jwt.claims','{"sub":"${viewer}","role":"authenticated"}',true);
DO $viewer$
DECLARE sample_row jsonb; affected bigint;
BEGIN
 SELECT sample INTO sample_row FROM gh_negative_samples WHERE table_name='viewer_experiments';
 IF NOT EXISTS(SELECT 1 FROM experiments WHERE id=(sample_row->>'id')::uuid) THEN RAISE EXCEPTION 'FAIL viewer sin lectura'; END IF;
 BEGIN
  INSERT INTO experiments SELECT * FROM jsonb_populate_record(NULL::experiments,sample_row || jsonb_build_object('id',gen_random_uuid()));
  RAISE EXCEPTION 'FAIL viewer inserta';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE experiments SET id=id WHERE id=(sample_row->>'id')::uuid;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'FAIL viewer actualiza'; END IF;
 DELETE FROM experiments WHERE id=(sample_row->>'id')::uuid;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'FAIL viewer borra'; END IF;
 RAISE NOTICE 'PASS viewer conserva lectura sin escritura';
END $viewer$;
ROLLBACK;
`;
}
export function runRemote(env = process.env, args = process.argv.slice(2), execute = spawnSync) {
  if (args.some(arg => arg !== '--allow-prod')) throw new Error('Solo se admite --allow-prod.');
  const url = validateTarget(env.DATABASE_URL, args.includes('--allow-prod'));
  const sql = verificationSql(env);
  const result = execute('psql', ['-X', '--no-password', '--set=ON_ERROR_STOP=1'], {
    env: { ...env, PGDATABASE: url, PGCONNECT_TIMEOUT: '5' }, input: sql, encoding: 'utf8', timeout: 60_000,
    windowsHide: true,
  });
  if (result.error) throw new Error('No se pudo ejecutar psql (requerido en PATH) o se agotó el tiempo.');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0 ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = runRemote(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
