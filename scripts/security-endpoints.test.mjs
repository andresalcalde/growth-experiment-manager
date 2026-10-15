// Node 22+: --experimental-strip-types --experimental-test-module-mocks --test
// Supabase and provider calls are mocked; this suite never opens a connection.
import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';

const originalFetch = globalThis.fetch;
Object.assign(process.env, {
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service', OPENAI_API_KEY: 'test-openai', RESEND_API_KEY: 'test-resend',
});
let state;
mock.module('@supabase/supabase-js', { namedExports: {
  createClient(_url, key) {
    state.clients.push(key);
    return {
      auth: { async getUser(token) {
        state.tokens.push(token);
        return token === 'valid' ? { data: { user: state.user }, error: null }
          : { data: { user: null }, error: new Error('invalid JWT') };
      } },
      from(table) {
        const query = { table, filters: [] };
        const chain = {
          select() { return chain; },
          eq(...args) { query.filters.push(['eq', ...args]); return chain; },
          in(...args) { query.filters.push(['in', ...args]); return chain; },
          limit() { return chain; },
          then(resolve, reject) {
            state.queries.push(query);
            return Promise.resolve(state.query(query)).then(resolve, reject);
          },
        };
        return chain;
      },
      async rpc(name, args) {
        state.reservations.push({ key, name, args });
        return { data: state.quota, error: null };
      },
    };
  },
} });
const { default: notify } = await import('../api/send-notification.ts');
const { default: ai } = await import('../api/ai-assistant.ts');
beforeEach(() => {
  state = {
    user: { id: 'sender', email: 'sender@test.invalid' },
    clients: [], tokens: [], queries: [], reservations: [], fetches: [], quota: true,
    query: () => ({ data: [], error: null }),
  };
  globalThis.fetch = async (url, init) => {
    state.fetches.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
});
after(() => { globalThis.fetch = originalFetch; mock.restoreAll(); });
async function request(handler, body, token = 'valid') {
  const response = {
    code: 0, body: undefined,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    setHeader() {},
  };
  await handler({ method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body }, response);
  return response;
}
const notification = to => ({ to, type: 'experiment_winner', experimentTitle: '<img src=x onerror=alert(1)>' });
const completion = { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hola' }] };

test('endpoints rechazan JWT inválido o ausente antes de consultar datos', async () => {
  for (const handler of [notify, ai]) {
    assert.equal((await request(handler, {}, 'invalid')).code, 401);
    assert.equal((await request(handler, {}, null)).code, 401);
  }
  assert.deepEqual(state.tokens, ['invalid', 'invalid']);
  assert.equal(state.queries.length + state.fetches.length + state.reservations.length, 0);
});
test('send-notification rechaza correo externo sin perfil accesible', async () => {
  state.query = ({ table }) => ({ data: table === 'project_members' ? [{ project_id: 'A' }] : [], error: null });
  assert.equal((await request(notify, notification('external@example.invalid'))).code, 403);
  assert.deepEqual(state.tokens, ['valid']);
  assert.equal(state.fetches.length, 0);
});
test('send-notification rechaza perfil visible sin proyecto compartido', async () => {
  state.query = ({ table, filters }) => ({ error: null, data: table === 'profiles'
    ? [{ id: 'external', email: 'external@example.invalid' }]
    : filters.some(filter => filter[1] === 'user_id' && filter[2] === 'sender') ? [{ project_id: 'A' }] : [] });
  assert.equal((await request(notify, notification('external@example.invalid'))).code, 403);
  assert.equal(state.fetches.length, 0);
});
test('send-notification no acepta HTML arbitrario', async () => {
  assert.equal((await request(notify, { ...notification('sender@test.invalid'), html: '<script>attack</script>' })).code, 400);
  assert.equal(state.fetches.length, 0);
});
test('send-notification autoriza destinatario compartido y escapa la plantilla', async () => {
  state.query = ({ table }) => ({ error: null, data: table === 'profiles'
    ? [{ id: 'coworker', email: 'coworker@test.invalid' }] : [{ project_id: 'A', user_id: 'coworker' }] });
  assert.equal((await request(notify, notification('coworker@test.invalid'))).code, 200);
  const email = state.fetches[0].body;
  assert.match(email.from, /@send\.mmglatam\.com>/);
  assert.ok(email.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!email.html.includes('<img'));
  assert.deepEqual(email.to, ['coworker@test.invalid']);
});
test('send-notification limita 5 envíos/minuto por usuario y permite envío propio', async () => {
  state.user = { id: 'rate-test', email: 'self@test.invalid' };
  state.query = ({ table }) => ({ error: null, data: table === 'profiles' ? [state.user] : [] });
  for (let i = 0; i < 5; i++) assert.equal((await request(notify, notification(state.user.email))).code, 200);
  assert.equal((await request(notify, notification(state.user.email))).code, 429);
  assert.equal(state.fetches.length, 5);
});
test('ai-assistant rechaza modelo no permitido con 400 antes de reservar cuota', async () => {
  assert.equal((await request(ai, { ...completion, model: 'gpt-not-allowed' })).code, 400);
  assert.deepEqual(state.tokens, ['valid']);
  assert.equal(state.reservations.length + state.fetches.length, 0);
});
test('ai-assistant reserva cuota con service role y limita salida a 1000 tokens', async () => {
  assert.equal((await request(ai, { ...completion, max_tokens: 9000 })).code, 200);
  assert.deepEqual(state.reservations, [{ key: 'test-service', name: 'gh_reserve_ai_usage', args: { p_user_id: 'sender' } }]);
  assert.equal(state.fetches[0].body.max_tokens, 1000);
});
test('ai-assistant con cuota agotada no llama al proveedor', async () => {
  state.quota = false;
  assert.equal((await request(ai, completion)).code, 429);
  assert.equal(state.fetches.length, 0);
});
