// scripts/verify-rls.mjs — Verifica RLS y RPCs de prod con 3 roles.
// Uso: node scripts/verify-rls.mjs   (lee .env del repo + GH_TEST_* del entorno)
// Antes de aplicar 06-09 DEBE fallar (recursion 42P17, superadmin sin visibilidad).
// Despues de aplicarlas DEBE pasar completo.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

// Total de checks que una corrida completa DEBE reportar: anon 2, member 3, lead 3, superadmin 3.
// Si un login o un throw aborta un bloque a mitad, los que falten se cuentan como FAIL al final.
const EXPECTED_CHECKS = 11;
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

// Envuelve un bloque de rol: si algo revienta (login fallido, red, etc.) se cuenta
// como FAIL del bloque con mensaje claro en vez de crashear el script entero.
async function block(label, fn) {
  console.log(`— ${label} —`);
  try {
    await fn();
  } catch (e) {
    fail++;
    console.log(`  FAIL [bloque ${label}] ${e?.message ?? String(e)}`);
  }
}

async function login(email, password) {
  if (!email || !password) throw new Error(`faltan credenciales de entorno para este rol (email=${email ?? 'undefined'})`);
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}
async function rest(token, path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json', ...init.headers },
  });
  let body = null; try { body = await r.json(); } catch { /* empty */ }
  return { status: r.status, body };
}
const rpc = (token, fn, args = {}) => rest(token, `rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

await block('anon', async () => {
  const t = await rest(null, 'teams?select=id&limit=1');
  ok('teams sin recursion 42P17 (200 vacio para anon)', t.status === 200 && Array.isArray(t.body) && t.body.length === 0, `got ${t.status} ${JSON.stringify(t.body)}`);
  const p = await rest(null, 'projects?select=id&limit=1');
  ok('projects invisibles para anon', p.status === 200 && Array.isArray(p.body) && p.body.length === 0, `got ${p.status}`);
});

await block('member (user normal)', async () => {
  const t = await login(process.env.GH_TEST_MEMBER_EMAIL, process.env.GH_TEST_MEMBER_PASS);
  const teams = await rest(t, 'teams?select=id,name');
  ok('member lee teams sin 500', teams.status === 200, `got ${teams.status} ${JSON.stringify(teams.body)}`);
  const act = await rpc(t, 'lead_team_activity', { p_team_id: '00000000-0000-0000-0000-000000000000' });
  // En PostgREST un RAISE EXCEPTION del guard llega como HTTP 400 con code P0001, no como 401/403:
  // por eso se valida el mensaje y no el status code. Un 404 (RPC inexistente) NO cuenta como guard.
  ok('member NO puede llamar lead_team_activity',
    act.status >= 400 && String(act.body?.message ?? '').includes('forbidden'),
    `got ${act.status} ${JSON.stringify(act.body)}`);
  const exp = await rest(t, 'experiments?select=created_by&limit=1');
  ok('experiments.created_by existe', exp.status === 200, `got ${exp.status} ${JSON.stringify(exp.body)}`);
});

await block('lead (global admin, lidera equipo de prueba)', async () => {
  const t = await login(process.env.GH_TEST_LEAD_EMAIL, process.env.GH_TEST_LEAD_PASS);
  const my = await rpc(t, 'lead_list_my_teams');
  ok('lead_list_my_teams devuelve >=1 equipo', my.status === 200 && Array.isArray(my.body) && my.body.length >= 1, `got ${my.status} ${JSON.stringify(my.body)}`);
  const teamId = my.body?.[0]?.id;
  if (teamId) {
    const projs = await rpc(t, 'lead_team_projects', { p_team_id: teamId });
    ok('lead_team_projects responde 200', projs.status === 200, `got ${projs.status}`);
    const act = await rpc(t, 'lead_team_activity', { p_team_id: teamId });
    ok('lead_team_activity responde 200', act.status === 200, `got ${act.status}`);
  } else {
    // Sin teamId no se pueden ejercitar las 2 RPCs: se cuentan como FAIL explicito
    // para que el total de checks siga siendo constante.
    ok('lead_team_projects ejecutado', false, 'sin teamId');
    ok('lead_team_activity ejecutado', false, 'sin teamId');
  }
});

await block('superadmin', async () => {
  const t = await login(process.env.GH_TEST_SUPER_EMAIL, process.env.GH_TEST_SUPER_PASS);
  const all = await rpc(t, 'admin_list_projects');
  const direct = await rest(t, 'projects?select=id');
  ok('superadmin ve por RLS tantos proyectos como admin_list_projects',
    all.status === 200 && direct.status === 200 && Array.isArray(all.body) && Array.isArray(direct.body) && direct.body.length >= all.body.length,
    `rpc=${all.body?.length} rls=${direct.body?.length}`);
  const exp = await rest(t, 'experiments?select=id&limit=1');
  ok('superadmin lee experiments por RLS', exp.status === 200 && Array.isArray(exp.body), `got ${exp.status}`);
  const log = await rest(t, 'activity_log?select=details&limit=1');
  ok('activity_log.details existe', log.status === 200, `got ${log.status}`);
});

// Un bloque abortado deja checks sin ejecutar: se imputan a FAIL para que el total
// sea siempre EXPECTED_CHECKS y el verde no pueda venir de cobertura incompleta.
const executed = pass + fail;
if (executed < EXPECTED_CHECKS) {
  const missing = EXPECTED_CHECKS - executed;
  fail += missing;
  console.log(`\nchecks no ejecutados: ${missing}`);
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL (de ${EXPECTED_CHECKS} esperados)`);
process.exit(pass === EXPECTED_CHECKS ? 0 : 1);
