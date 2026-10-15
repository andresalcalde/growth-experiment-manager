// Local PostgreSQL (PGlite), no sockets, credentials or .env reads.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const migration = await read('../supabase/migrations/20261015_cierre_brechas_rls.sql');
const rollback = await read('../supabase/migrations/20261015_cierre_brechas_rls.rollback.sql');
const fixture = await read('./fixtures/security-schema.sql');
let checks = 0;
const pass = name => { checks++; console.log(`PASS ${name}`); };
const user = n => `10000000-0000-0000-0000-00000000000${n}`;
const project = n => `20000000-0000-0000-0000-00000000000${n}`;
const experiment = '30000000-0000-0000-0000-000000000001';
const db = new PGlite();
async function snapshot() {
  const policies = (await db.query('SELECT * FROM pg_policies ORDER BY schemaname,tablename,policyname')).rows;
  const bucket = (await db.query('SELECT * FROM storage.buckets ORDER BY id')).rows;
  const functions = (await db.query(`SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' ORDER BY p.proname`)).rows;
  const triggers = (await db.query(`SELECT pg_get_triggerdef(oid) AS def,tgenabled FROM pg_trigger
    WHERE NOT tgisinternal ORDER BY tgname`)).rows;
  const rls = (await db.query(`SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r'
    AND n.nspname IN ('public','storage') ORDER BY 1,2`)).rows;
  return { policies, bucket, functions, triggers, rls };
}
async function asUser(id, fn, role = 'authenticated') {
  await db.exec('SET SESSION AUTHORIZATION authenticator');
  await db.exec(`SET ROLE ${role}`);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)", [id || '',role]);
  try { return await fn(); }
  finally {
    // PGlite RESET SESSION AUTHORIZATION retains the last session identity.
    // Restore the fixture owner explicitly so subsequent DDL is not RLS-filtered.
    await db.exec('RESET ROLE; SET SESSION AUTHORIZATION postgres');
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)");
  }
}
async function denied(name, sql, code = '42501') {
  await assert.rejects(db.query(sql), error => error.code === code);
  pass(name);
}
async function empty(name, sql) { assert.equal((await db.query(sql)).rows.length,0); pass(name); }
try {
  await db.exec(fixture);
  const before = await snapshot();
  await db.exec(migration);
  pass('SQL completo aplica en PostgreSQL local');
  const secured = await snapshot();
  const backup = (await db.query('SELECT * FROM _rls_backup_20261015 ORDER BY kind,key')).rows;
  assert.deepEqual(backup.filter(row => row.kind === 'policy').map(row => row.data),before.policies);
  pass('captura contiene exactamente las políticas originales');
  await db.exec(migration);
  assert.deepEqual(await snapshot(), secured);
  assert.deepEqual((await db.query('SELECT * FROM _rls_backup_20261015 ORDER BY kind,key')).rows,backup);
  pass('migración idempotente sin sobreescribir captura');
  await asUser(user(2), async () => {
    await denied('normal no se autoasigna admin ajeno',`INSERT INTO project_members VALUES('${project(1)}','${user(2)}','admin')`);
    await denied('admin no mueve membresía propia a proyecto ajeno',`UPDATE project_members SET project_id='${project(1)}' WHERE user_id='${user(2)}' RETURNING *`);
    await denied('admin no invita a proyecto ajeno',`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','admin')`);
    await denied('normal no cambia global_role',`UPDATE profiles SET global_role='superadmin' WHERE id='${user(2)}'`);
    await denied('normal no activa biblioteca global',`UPDATE profiles SET can_access_global_library=true WHERE id='${user(2)}'`);
    await db.exec(`SELECT set_config('request.jwt.claims','{"user_metadata":{"global_role":"superadmin"}}',false)`);
    assert.equal((await db.query('SELECT * FROM projects')).rows.length,1);
    pass('metadata superadmin falsificado no da visibilidad global');
    await empty('metadata falsificado no lee otras tablas','SELECT * FROM legacy_metadata_probe');
    await denied('metadata falsificado no escribe otras tablas',`INSERT INTO legacy_metadata_probe VALUES('${user(4)}')`);
    await db.query('INSERT INTO legacy_metadata_probe VALUES($1)',[user(2)]);
    assert.equal((await db.query('SELECT * FROM legacy_metadata_probe')).rows.length,1);
    pass('reemplazo metadata conserva acceso propio, WITH CHECK y policy restrictiva');
    for (const table of ['north_star_metrics','team_members','experiments','objectives','strategies']) {
      await empty(`normal no lee ${table} ajenos`,`SELECT * FROM ${table} WHERE project_id='${project(1)}'`);
      await denied(`normal no inserta ${table} ajenos`,`INSERT INTO ${table}(project_id,title) VALUES('${project(1)}','attack')`);
      await empty(`normal no actualiza ${table} ajenos`,`UPDATE ${table} SET title='attack' WHERE project_id='${project(1)}' RETURNING *`);
      await empty(`normal no borra ${table} ajenos`,`DELETE FROM ${table} WHERE project_id='${project(1)}' RETURNING *`);
    }
    await empty('evidencia ajena no se lee','SELECT * FROM storage.objects');
    await empty('evidencia ajena no se borra','DELETE FROM storage.objects RETURNING *');
    await denied('política genérica Storage no permite subir a proyecto ajeno',`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('experiment-evidence','${project(1)}/attack','${user(2)}')`);
    await denied('backup no es legible por usuario','SELECT * FROM _rls_backup_20261015');
    await denied('cuota no se reserva por usuario','SELECT gh_reserve_ai_usage(auth.uid())');
    await denied('cuota no se escribe por usuario',`INSERT INTO ai_usage VALUES('${user(2)}',current_date,1)`);
    await empty('perfiles ajenos no exponen email',`SELECT * FROM profiles WHERE id='${user(1)}'`);
    const created = (await db.query("SELECT create_project_with_membership('nuevo') AS id")).rows[0].id;
    assert.equal((await db.query('SELECT role FROM project_members WHERE project_id=$1',[created])).rows[0].role,'admin');
    pass('RPC crea proyecto y primera membresía admin');
  });
  await asUser(user(3), async () => {
    assert.equal((await db.query('SELECT * FROM experiments')).rows.length,1); pass('viewer conserva lectura');
    for (const table of ['experiments','objectives','strategies','north_star_metrics','team_members']) {
      await denied(`viewer no inserta ${table}`,`INSERT INTO ${table}(project_id,title) VALUES('${project(1)}','attack')`);
      await empty(`viewer no actualiza ${table}`,`UPDATE ${table} SET title='attack' RETURNING *`);
      await empty(`viewer no borra ${table}`,`DELETE FROM ${table} RETURNING *`);
    }
    await empty('viewer no cambia NSM del proyecto',"UPDATE projects SET name='attack' RETURNING *");
    assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,2); pass('viewer lee evidencia nueva y legacy');
    await empty('viewer no borra evidencia de otro dueño','DELETE FROM storage.objects RETURNING *');
    await denied('viewer no sube evidencia',`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('experiment-evidence','${project(1)}/attack','${user(3)}')`);
  });
  await asUser(user(1), async () => {
    const invited = await db.query(`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','editor') AS id`);
    assert.equal(invited.rows[0].id,user(2)); pass('admin invita por email sin SELECT global de profiles');
    await denied('admin no inventa rol superadmin',`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','superadmin')`);
    assert.equal((await db.query(`UPDATE experiments SET title='ok' WHERE id='${experiment}' RETURNING *`)).rows.length,1);
    pass('admin conserva escritura de experimento');
    assert.equal((await db.query('DELETE FROM storage.objects RETURNING *')).rows.length,2); pass('dueño/admin borra su evidencia');
  });
  await asUser(user(4), async () => {
    assert.equal((await db.query('SELECT * FROM legacy_metadata_probe')).rows.length,2);
    pass('otras tablas autorizan superadmin por perfil');
    assert.equal((await db.query(`UPDATE profiles SET can_access_global_library=true WHERE id='${user(2)}' RETURNING *`)).rows.length,1);
    pass('superadmin concede biblioteca global');
  });
  await asUser(user(2), async () => {
    for (let i=0;i<50;i++) assert.equal((await db.query('SELECT gh_reserve_ai_usage($1) AS ok',[user(2)])).rows[0].ok,true);
    assert.equal((await db.query('SELECT gh_reserve_ai_usage($1) AS ok',[user(2)])).rows[0].ok,false);
    pass('cuota diaria atómica deniega solicitud 51');
  },'service_role');
  await asUser(user(3), async () => { await empty('usage ajeno no se lee','SELECT * FROM ai_usage'); });
  await asUser(null, async () => {
    await empty('anon no lee evidencia aunque exista policy genérica','SELECT * FROM storage.objects');
  },'anon');
  await db.exec(rollback);
  assert.deepEqual(await snapshot(),before); pass('rollback restaura exactamente políticas, funciones, triggers, bucket y flags RLS');
  await db.exec(rollback); pass('rollback idempotente');
  // The legacy team_members table may lack project_id: verify fail-closed branch.
  await db.exec('ALTER TABLE team_members DROP COLUMN project_id');
  await db.exec(migration);
  await asUser(user(2),async () => { await empty('team_members sin project_id solo superadmin','SELECT * FROM team_members'); });
  await db.exec(rollback);
  console.log(`${checks} checks passed; no network connections`);
} catch (error) {
  console.error(`FAIL ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
} finally { await db.close(); }
