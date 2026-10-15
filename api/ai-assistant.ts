import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from './_lib/security.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticatedUser(req);
  if (!auth) return res.status(401).json({ error: 'Sesión inválida.' });
  const body = (req.body ?? {}) as Record<string, unknown>;
  const model = body.model ?? 'gpt-4o-mini';
  if (model !== 'gpt-4o-mini') return res.status(400).json({ error: 'Modelo no permitido.' });
  const messages = body.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 50 ||
      !messages.every(message => message && ['system', 'user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string' && message.content.length <= 20_000) ||
      JSON.stringify(messages).length > 60_000 ||
      (body.max_tokens !== undefined && (typeof body.max_tokens !== 'number' ||
        !Number.isInteger(body.max_tokens) || body.max_tokens < 1))) {
    return res.status(400).json({ error: 'Solicitud inválida.' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !serviceKey) return res.status(503).json({ error: 'IA no configurada.' });
  // Atomic reservation shared across serverless instances. Provider failures
  // also consume a request, so retries cannot bypass the daily budget.
  const admin = createClient(process.env.VITE_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: allowed, error } = await admin.rpc('gh_reserve_ai_usage', { p_user_id: auth.user.id });
  if (error) return res.status(503).json({ error: 'No se pudo verificar la cuota.' });
  if (!allowed) return res.status(429).json({ error: 'Cuota diaria agotada (50 solicitudes UTC).' });
  const safeBody = {
    model, messages,
    temperature: typeof body.temperature === 'number' && Number.isFinite(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature)) : 0.4,
    max_tokens: Math.min(typeof body.max_tokens === 'number' ? body.max_tokens : 600, 1000),
    ...(body.response_format && typeof body.response_format === 'object' &&
      'type' in body.response_format && body.response_format.type === 'json_object'
      ? { response_format: { type: 'json_object' } } : {}),
  };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(safeBody),
    });
    res.setHeader('Content-Type', 'application/json');
    return res.status(response.status).send(await response.text());
  } catch { return res.status(502).json({ error: 'No se pudo contactar a OpenAI.' }); }
}
