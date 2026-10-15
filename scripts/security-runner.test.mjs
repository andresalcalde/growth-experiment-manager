import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { runRemote, validateTarget, verificationSql } from './verify-rls-remote.mjs';

const ref = 'oumhhngnwjijtmgpnhba';
const user = n => `10000000-0000-0000-0000-00000000000${n}`;
const project = n => `20000000-0000-0000-0000-00000000000${n}`;
const fixtures = {
  RLS_TEST_USER_ID: user(2), RLS_TEST_FOREIGN_PROJECT_ID: project(1),
  RLS_TEST_VIEWER_ID: user(3), RLS_TEST_VIEWER_PROJECT_ID: project(1),
};
test('runner bloquea URL ausente, prod directo y pooler sin abrir procesos', () => {
  const execute = () => assert.fail('No debe intentar conexión');
  for (const DATABASE_URL of [undefined, `postgresql://postgres:password@db.${ref}.supabase.co/postgres`,
    `postgresql://postgres.${ref}:password@aws-0.pooler.supabase.com/postgres`,
    `postgresql://postgres.%6fumhhngnwjijtmgpnhba:password@aws-0.pooler.supabase.com/postgres`]) {
    assert.throws(() => runRemote({ DATABASE_URL, ...fixtures }, [], execute), /obligatoria|producción bloqueado/);
  }
});
test('runner exige fixtures explícitas y protocolo PostgreSQL', () => {
  assert.throws(() => runRemote({ DATABASE_URL: 'postgresql://localhost/test' }, [], () => assert.fail()), /UUID explícito/);
  assert.throws(() => validateTarget('https://localhost/test'), /PostgreSQL/);
  assert.throws(() => verificationSql({ ...fixtures, RLS_TEST_USER_ID: "';DROP TABLE profiles;--" }), /UUID explícito/);
});
test('--allow-prod solo habilita guard; prueba sin conexión', () => {
  const url = `postgresql://postgres@db.${ref}.supabase.co/postgres`;
  assert.equal(validateTarget(url, true), url);
});
test('runner usa psql sin archivos de inicio y propaga exit != 0 (mock)', () => {
  const status = runRemote({ DATABASE_URL: 'postgresql://localhost/test', ...fixtures }, [], (command, args, options) => {
    assert.equal(command, 'psql');
    assert.ok(args.includes('-X') && args.includes('--set=ON_ERROR_STOP=1'));
    assert.ok(!args.some(arg => arg.includes('postgresql://')));
    assert.equal(options.env.PGDATABASE, 'postgresql://localhost/test');
    assert.match(options.input, /ROLLBACK;/);
    return { status: 7 };
  });
  assert.equal(status, 1);
});
test('SQL del runner pasa en PGlite y no deja cambios persistentes', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('./fixtures/security-schema.sql', import.meta.url), 'utf8'));
    // Runner requires representative rows for every foreign table.
    await db.exec('INSERT INTO objectives(id,project_id,title) SELECT id,project_id,title FROM experiments; INSERT INTO strategies(id,project_id,title) SELECT id,project_id,title FROM experiments');
    await db.exec(await readFile(new URL('../supabase/migrations/20261015_cierre_brechas_rls.sql', import.meta.url), 'utf8'));
    const before = (await db.query('SELECT to_jsonb(p) AS row FROM profiles p ORDER BY id')).rows;
    await db.exec(verificationSql(fixtures));
    assert.deepEqual((await db.query('SELECT to_jsonb(p) AS row FROM profiles p ORDER BY id')).rows, before);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM experiments')).rows[0].count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM storage.objects')).rows[0].count, 2);
    // A broken policy must cause an actual SQL error, not a vacuous success.
    await db.exec('DROP POLICY gh_insert ON project_members; CREATE POLICY unsafe ON project_members FOR INSERT TO authenticated WITH CHECK(true)');
    await assert.rejects(db.exec(verificationSql(fixtures)), /FAIL autoasignación admin/);
    await db.exec('ROLLBACK');
  } finally { await db.close(); }
});
