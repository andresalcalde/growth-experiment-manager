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
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p')
    AND n.nspname IN ('public','storage') ORDER BY 1,2`)).rows;
  const ownerColumn = (await db.query(`SELECT column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='experiments' AND column_name='owner_id'`)).rows;
  return { policies, bucket, functions, triggers, rls, ownerColumn };
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
  await db.exec(await read('../supabase/09_migration_lead_rpcs.sql'));
  const before = await snapshot();
  await db.exec(migration);
  pass('SQL completo aplica en PostgreSQL local');
  assert.equal((await db.query('SELECT owner_id FROM experiments')).rows[0].owner_id,user(1)); pass('owner_id historico solo con miembro unico');
  const secured = await snapshot();
  const backup = (await db.query('SELECT * FROM _rls_backup_20261015 ORDER BY kind,key')).rows;
  assert.deepEqual(backup.filter(row => row.kind === 'policy').map(row => row.data),before.policies.filter(p => p.tablename !== 'legacy_metadata_probe'));
  pass('captura contiene exactamente las políticas originales');
  await db.exec(migration);
  assert.deepEqual(await snapshot(), secured);
  assert.deepEqual((await db.query('SELECT * FROM _rls_backup_20261015 ORDER BY kind,key')).rows,backup);
  pass('migración idempotente sin sobreescribir captura');
  await asUser(user(1),async () => {
    const row=(await db.query(`INSERT INTO experiments(project_id,title) VALUES($1,'default owner') RETURNING id,owner_id`,[project(1)])).rows[0];
    assert.equal(row.owner_id,user(1));
    await db.query('DELETE FROM experiments WHERE id=$1',[row.id]);
    pass('owner_id omitido persiste auth.uid()');
    await db.query(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('other-bucket','mine',$1)`,[user(1)]);
    assert.equal((await db.query(`SELECT name FROM storage.objects WHERE bucket_id='other-bucket'`)).rows.length,1);
    await denied('restrictiva mixta conserva WITH CHECK externo',`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('other-bucket','forged','${user(2)}')`);
    await denied('restrictiva mixta no permite transferir objeto externo',`UPDATE storage.objects SET owner_id='${user(2)}' WHERE bucket_id='other-bucket'`);
    assert.equal((await db.query(`DELETE FROM storage.objects WHERE bucket_id='other-bucket' RETURNING *`)).rows.length,1);
    pass('restrictiva mixta conserva lectura y borrado externo legitimo');
  });
  await db.query(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('other-bucket','foreign',$1)`,[user(2)]);
  await asUser(user(1),async () => {
    await empty('restrictiva mixta conserva USING externo',`SELECT * FROM storage.objects WHERE bucket_id='other-bucket'`);
    await empty('restrictiva mixta impide borrado externo ajeno',`DELETE FROM storage.objects WHERE bucket_id='other-bucket' RETURNING *`);
    assert.equal((await db.query(`SELECT * FROM storage.objects WHERE bucket_id='experiment-evidence'`)).rows.length,2);
    pass('restrictiva antigua neutra permite evidencia legitima');
    const path=`${project(1)}/${experiment}/temporary.png`;
    await db.query(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('experiment-evidence',$1,$2)`,[path,user(1)]);
    assert.equal((await db.query('DELETE FROM storage.objects WHERE name=$1 RETURNING *',[path])).rows.length,1);
    pass('restrictiva antigua neutra permite INSERT y DELETE de evidencia');
  });
  await db.query(`DELETE FROM storage.objects WHERE bucket_id='other-bucket'`);
  await asUser(user(2), async () => {
    await denied('normal no se autoasigna admin ajeno',`INSERT INTO project_members VALUES('${project(1)}','${user(2)}','admin')`);
    await denied('admin no mueve membresía propia a proyecto ajeno',`UPDATE project_members SET project_id='${project(1)}' WHERE user_id='${user(2)}' RETURNING *`);
    assert.equal((await db.query(`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','admin') AS result`)).rows[0].result,null);
    pass('invitacion ajena retorna respuesta uniforme');
    await denied('normal no cambia global_role',`UPDATE profiles SET global_role='superadmin' WHERE id='${user(2)}'`);
    await denied('normal no activa biblioteca global',`UPDATE profiles SET can_access_global_library=true WHERE id='${user(2)}'`);
    await db.exec(`SELECT set_config('request.jwt.claims','{"user_metadata":{"global_role":"superadmin"}}',false)`);
    assert.equal((await db.query('SELECT * FROM projects')).rows.length,1);
    pass('metadata superadmin falsificado no da visibilidad global');
    assert.deepEqual((await db.query("SELECT * FROM pg_policies WHERE tablename='legacy_metadata_probe' ORDER BY policyname")).rows,
      before.policies.filter(p => p.tablename==='legacy_metadata_probe').sort((a,b)=>a.policyname.localeCompare(b.policyname)));
    pass('policies de otras apps con user_metadata y raw_user_meta_data intactas');
    await denied('email propio no editable',`UPDATE profiles SET email='stolen@test.invalid' WHERE id='${user(2)}'`);
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
  await asUser(user(2),async () => {
    assert.deepEqual((await db.query('SELECT gh_library_evidence_paths($1) AS paths',[experiment])).rows[0].paths,[]);
    pass('sin acceso a Biblioteca no obtiene objetos');
  });
  await db.query(`UPDATE profiles SET can_access_global_library=true WHERE id='${user(2)}'`);
  await db.query(`UPDATE experiments SET is_public=true WHERE id='${experiment}'`);
  await asUser(user(2),async () => {
    assert.equal((await db.query('SELECT gh_library_evidence_paths($1) AS paths',[experiment])).rows[0].paths.length,2);
    pass('biblioteca autoriza evidencia publica terminada sin membresia');
  });
  const originalRefs=(await db.query('SELECT visual_proof FROM experiments WHERE id=$1',[experiment])).rows[0].visual_proof;
  const prefix=`${project(1)}/${experiment}/`;
  const encodedNames=['a b.png','café #?%+_.png','100%_ proof.png'];
  const encodedPaths=encodedNames.map(name=>prefix+name);
  const privateExperiment='30000000-0000-0000-0000-000000000002';
  const privatePath=`${project(1)}/${privateExperiment}/secret.png`;
  const foreignPath=`${project(2)}/foreign.png`;
  const traversalPaths=[`${prefix}../secret.png`,`${prefix}%2e%2e/secret.png`,`${prefix}./secret.png`,`${prefix}%252e%252e/secret.png`];
  const temporaryPaths=[...encodedPaths,privatePath,foreignPath,...traversalPaths];
  await db.query('INSERT INTO experiments(id,project_id,title,is_public) VALUES($1,$2,$3,false)',[privateExperiment,project(1),'private']);
  for(const path of temporaryPaths) await db.query(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('experiment-evidence',$1,$2)`,[path,user(1)]);
  const legacyRefs=encodedNames.map((name,i)=>`https://test.supabase.co/storage/v1/object/${['public','sign','authenticated'][i]}/experiment-evidence/${prefix}${encodeURIComponent(name)}?token=ignored`);
  await db.query('UPDATE experiments SET visual_proof=$1 WHERE id=$2',[[...legacyRefs,
    `storage://experiment-evidence/${privatePath}`,`storage://experiment-evidence/${foreignPath}`,
    ...traversalPaths.map(path=>`storage://experiment-evidence/${path}`),
    `https://test.supabase.co/storage/v1/object/public/experiment-evidence/${prefix}%2E%2E/secret.png`,
    `https://test.supabase.co/storage/v1/object/public/experiment-evidence/${prefix}%2e%2e%2fsecret.png`,
    `https://test.supabase.co/storage/v1/object/public/experiment-evidence/${prefix}bad%ZZ.png`,
    `https://test.supabase.co/storage/v1/object/public/experiment-evidence/${prefix}%C3%28.png`,
    `https://test.supabase.co/storage/v1/object/public/experiment-evidence/${prefix}%.png`,
    // These are patterns only if user data incorrectly reaches LIKE.
    `storage://experiment-evidence/${prefix}%.png`,
  ],experiment]);
  await asUser(user(2),async () => {
    const paths=(await db.query('SELECT gh_library_evidence_paths($1) AS paths',[experiment])).rows[0].paths;
    assert.deepEqual(paths.sort(),encodedPaths.slice().sort());
    pass('biblioteca decodifica espacios, UTF8 y caracteres reservados sin wildcards');
    pass('biblioteca rechaza referencias privadas, ajenas, traversal y encoding invalido');
    assert.deepEqual((await db.query('SELECT gh_library_evidence_paths($1) AS paths',[privateExperiment])).rows[0].paths,[]);
    pass('biblioteca no firma evidencia de experimento privado');
  });
  await db.query('UPDATE experiments SET visual_proof=$1 WHERE id=$2',[originalRefs,experiment]);
  for(const path of temporaryPaths) await db.query('DELETE FROM storage.objects WHERE name=$1',[path]);
  await db.query('DELETE FROM experiments WHERE id=$1',[privateExperiment]);
  await db.query(`UPDATE experiments SET is_public=false WHERE id='${experiment}'`);
  await asUser(user(2),async () => {
    assert.deepEqual((await db.query('SELECT gh_library_evidence_paths($1) AS paths',[experiment])).rows[0].paths,[]);
    pass('biblioteca no firma experimento privado');
  });
  await db.query(`UPDATE experiments SET is_public=true,status='Idea' WHERE id='${experiment}'`);
  await asUser(user(2),async () => {
    assert.deepEqual((await db.query('SELECT gh_library_evidence_paths($1) AS paths',[experiment])).rows[0].paths,[]);
    pass('biblioteca no firma experimento activo');
  });
  await db.query(`UPDATE experiments SET status='Finished - Winner' WHERE id='${experiment}'`);
  await db.query(`UPDATE storage.objects SET owner_id='${user(3)}' WHERE name LIKE '%old.png'`);
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
  await asUser(user(3),async () => {
    await denied('viewer no registra actividad sin proyecto',`INSERT INTO activity_log(user_id,action) VALUES('${user(3)}','own')`);
    await denied('viewer no registra actividad en su proyecto',`INSERT INTO activity_log(user_id,project_id,action) VALUES('${user(3)}','${project(1)}','own')`);
    await denied('actividad ajena no insertable',`INSERT INTO activity_log(user_id,action) VALUES('${user(1)}','fake')`);
    await empty('actividad propia append-only UPDATE',"UPDATE activity_log SET action='fake' RETURNING *");
    await empty('actividad propia append-only DELETE','DELETE FROM activity_log RETURNING *');
    pass('viewer no escribe actividad');
  });
  await asUser(user(1),async () => {
    await empty('miembro no lee actividad de otro','SELECT * FROM activity_log');
    const team='40000000-0000-0000-0000-000000000001';
    assert.equal((await db.query('SELECT lead_list_my_teams() AS data')).rows[0].data.length,1);
    await db.query(`INSERT INTO activity_log(user_id,project_id,action) VALUES('${user(1)}','${project(1)}','own')`);
    await denied('actividad en proyecto ajeno no insertable',`INSERT INTO activity_log(user_id,project_id,action) VALUES('${user(1)}','${project(2)}','experiment_deleted')`);
    await denied('actividad con fecha futura no insertable',`INSERT INTO activity_log(user_id,project_id,action,created_at) VALUES('${user(1)}','${project(1)}','x','2099-01-01')`);
    await denied('actividad sin proyecto solo superadmin',`INSERT INTO activity_log(user_id,action) VALUES('${user(1)}','role_changed')`);
    assert.equal((await db.query('SELECT lead_team_activity($1) AS data',[team])).rows[0].data.length,1);
    assert.equal((await db.query('SELECT lead_team_projects($1) AS data',[team])).rows[0].data.length,1);
    pass('RPCs lead reales conservan acceso SECURITY DEFINER');
    for (const email of ['missing@test.invalid','unconfirmed@test.invalid']) {
      assert.equal((await db.query('SELECT gh_add_project_member($1,$2,$3) AS result',[project(1),email,'editor'])).rows[0].result,null);
    }
    pass('email desconocido y sin confirmar responden igual');
  });
  const quotaBefore=(await db.query(`SELECT sum(requests)::int AS n FROM gh_actor_usage WHERE actor=$1 AND kind='invite'`,[user(1)])).rows[0].n;
  await asUser(user(1),async () => {
    for(let i=0;i<2;i++) assert.equal((await db.query('SELECT gh_add_project_member($1,$2,$3) AS result',[project(1),'no-profile@mmglatam.com','editor'])).rows[0].result,null);
    await empty('Auth confirmado sin perfil no crea membresia',`SELECT * FROM project_members WHERE user_id='${user(5)}'`);
  });
  assert.equal((await db.query(`SELECT sum(requests)::int AS n FROM gh_actor_usage WHERE actor=$1 AND kind='invite'`,[user(1)])).rows[0].n,quotaBefore+2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles WHERE id=$1',[user(5)])).rows[0].n,0);
  pass('Auth confirmado sin perfil responde NULL y conserva ambos intentos de cuota');
  await asUser(user(1), async () => {
    const invited = await db.query(`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','editor') AS id`);
    assert.equal(invited.rows[0].id,null);
    assert.equal((await db.query(`SELECT role FROM project_members WHERE project_id='${project(1)}' AND user_id='${user(2)}'`)).rows[0].role,'editor'); pass('admin invita por email sin SELECT global de profiles');
    assert.equal((await db.query(`SELECT gh_add_project_member('${project(1)}','outsider@test.invalid','superadmin') AS result`)).rows[0].result,null);
    pass('rol invalido no se distingue de invitacion inexistente');
    assert.equal((await db.query(`UPDATE experiments SET title='ok' WHERE id='${experiment}' RETURNING *`)).rows.length,1);
    pass('admin conserva escritura de experimento');
    assert.equal((await db.query('DELETE FROM storage.objects RETURNING *')).rows.length,2); pass('dueño/admin borra su evidencia');
  });
  await asUser(user(4), async () => {
    assert.equal((await db.query('SELECT * FROM profiles')).rows.length,4);
    pass('otras tablas autorizan superadmin por perfil');
    assert.equal((await db.query(`UPDATE profiles SET can_access_global_library=true WHERE id='${user(2)}' RETURNING *`)).rows.length,1);
    pass('superadmin concede biblioteca global');
  });
  await asUser(user(2), async () => {
    for (let i=0;i<50;i++) assert.equal((await db.query('SELECT gh_reserve_ai_usage($1) AS ok',[user(2)])).rows[0].ok,true);
    assert.equal((await db.query('SELECT gh_reserve_ai_usage($1) AS ok',[user(2)])).rows[0].ok,false);
    pass('cuota diaria atómica deniega solicitud 51');
  },'service_role');
  await asUser(user(1),async () => {
    for(let i=0;i<30;i++) await db.query('SELECT gh_add_project_member($1,$2,$3)',[project(1),'missing@test.invalid','viewer']);
    assert.equal((await db.query(`SELECT gh_add_project_member('${project(1)}','super@test.invalid','viewer') AS result`)).rows[0].result,null);
    await empty('cuota invitacion bloquea email valido',`SELECT * FROM project_members WHERE user_id='${user(4)}'`);
    pass('intentos fallidos consumen cuota de invitacion');
  });
  await asUser(user(4),async () => {
    assert.equal((await db.query('SELECT count(*)::int AS n FROM activity_log')).rows[0].n,1);
    pass('panel Uso superadmin conserva SELECT completo');
  });
  await asUser(user(1),async () => {
    assert.equal((await db.query('SELECT gh_reserve_ai_usage($1,51) AS ok',[user(5)])).rows[0].ok,true);
    assert.equal((await db.query('SELECT gh_reserve_ai_usage($1,51) AS ok',[user(1)])).rows[0].ok,false);
    assert.equal((await db.query('SELECT requests FROM ai_global_usage')).rows[0].requests,51);
    pass('IA sin profile funciona y tope global agregado no se excede');
    assert.equal((await db.query('SELECT gh_reserve_notification($1,$2) AS result',[user(1),experiment])).rows[0].result,'reserved');
    assert.equal((await db.query('SELECT gh_reserve_notification($1,$2) AS result',[user(2),experiment])).rows[0].result,'duplicate');
    for(let i=0;i<5;i++) {
      const id=(await db.query(`INSERT INTO experiments(project_id,title) VALUES('${project(1)}','quota') RETURNING id`)).rows[0].id;
      assert.equal((await db.query('SELECT gh_reserve_notification($1,$2) AS result',[user(1),id])).rows[0].result,i<4?'reserved':'quota');
    }
    pass('correo dedupe entre actores y cuota persistente por actor');
  },'service_role');
  await asUser(user(3), async () => { await empty('usage ajeno no se lee','SELECT * FROM ai_usage'); });
  await asUser(null, async () => {
    await empty('anon no lee evidencia aunque exista policy genérica','SELECT * FROM storage.objects');
  },'anon');
  await db.query("SELECT set_config('app.rollback_supabase_url','https://test.supabase.co',false)");
  await db.exec(await read('../supabase/migrations/20261015_revertir_visual_proof.sql'));
  const converted=(await db.query('SELECT visual_proof FROM experiments WHERE id=$1',[experiment])).rows[0].visual_proof;
  assert.ok(converted.every(ref=>!ref.startsWith('storage://'))); pass('SQL companion convierte referencias para frontend anterior');
  await db.exec(rollback);
  assert.deepEqual(await snapshot(),before); pass('rollback restaura exactamente políticas, funciones, triggers, bucket y flags RLS');
  await db.exec(rollback); pass('rollback idempotente');
  await db.exec('ALTER TABLE team_members RENAME TO old_team_members; CREATE TABLE team_members (LIKE old_team_members INCLUDING DEFAULTS) PARTITION BY HASH(id); CREATE TABLE team_members_p PARTITION OF team_members FOR VALUES WITH (MODULUS 1,REMAINDER 0); INSERT INTO team_members SELECT * FROM old_team_members');
  const partitionBefore=await snapshot();
  await db.exec(migration);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM _rls_backup_20261015 WHERE kind='table' AND data->>'table'='team_members'")).rows[0].n,1);
  await db.exec(rollback);
  assert.deepEqual(await snapshot(),partitionBefore); pass('rollback captura y restaura padre particionado');
  await db.exec('DROP TABLE team_members; ALTER TABLE old_team_members RENAME TO team_members');
  // Existing owner columns keep their original default on rollback. Historical
  // duplicate names must stay unassigned instead of inheriting the new default.
  await db.exec(`ALTER TABLE experiments ADD COLUMN owner_id uuid REFERENCES auth.users(id) DEFAULT '${user(4)}'; UPDATE experiments SET owner_id=NULL; UPDATE profiles SET full_name='Owner' WHERE id='${user(3)}'`);
  const existingOwnerBefore=await snapshot();
  await db.exec(migration);
  assert.equal((await db.query('SELECT owner_id FROM experiments WHERE id=$1',[experiment])).rows[0].owner_id,null);
  pass('backfill de nombres ambiguos no elige owner ni aplica default retroactivo');
  await db.exec(rollback);
  assert.deepEqual(await snapshot(),existingOwnerBefore);
  pass('rollback restaura default owner_id preexistente y politica restrictiva exactos');
  await db.exec(`ALTER TABLE experiments DROP COLUMN owner_id; UPDATE profiles SET full_name=NULL WHERE id='${user(3)}'`);
  for(const source of ["SELECT (auth.jwt()->'user_metadata'->>'global_role')='superadmin'","SELECT EXISTS(SELECT 1 FROM auth.users WHERE raw_user_meta_data->>'global_role'='superadmin')"]) {
    await db.exec(`CREATE FUNCTION public.unsafe_role() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ ${source} $$`);
    await assert.rejects(db.exec(migration),/SECURITY DEFINER/); await db.exec('ROLLBACK; DROP FUNCTION unsafe_role()');
    pass('aborta definer que decide rol desde metadata editable');
  }
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
