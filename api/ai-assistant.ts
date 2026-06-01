import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy server-side a OpenAI. La API key vive en `process.env.OPENAI_API_KEY`
 * (configurada en Vercel) y NUNCA llega al navegador.
 *
 * Para evitar que el endpoint sea un proxy abierto que cualquiera pueda usar
 * con tu cuota de OpenAI, exige un token de sesión Supabase válido (el cliente
 * lo manda en Authorization: Bearer <access_token>) y lo verifica contra
 * `${SUPABASE_URL}/auth/v1/user` antes de llamar a OpenAI.
 *
 * El cliente arma el body de la Chat Completion (model, messages, etc.); aquí
 * solo se inyecta la Authorization de OpenAI y se aplican topes defensivos.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY no está configurada en el servidor.' });
    return;
  }

  // --- Validación de sesión Supabase ---
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    res.status(500).json({ error: 'Configuración de Supabase ausente en el servidor.' });
    return;
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Falta el token de sesión.' });
    return;
  }
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnon },
    });
    if (!userRes.ok) {
      res.status(401).json({ error: 'Sesión inválida o expirada.' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'No se pudo validar la sesión.' });
    return;
  }

  // --- Construcción defensiva del body ---
  const body = (req.body ?? {}) as Record<string, unknown>;
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: 'Falta el campo "messages".' });
    return;
  }
  const safeBody: Record<string, unknown> = {
    model: typeof body.model === 'string' ? body.model : 'gpt-4o-mini',
    messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.4,
    max_tokens: Math.min(typeof body.max_tokens === 'number' ? body.max_tokens : 600, 1000),
  };
  if (body.response_format) safeBody.response_format = body.response_format;

  // --- Llamada a OpenAI ---
  try {
    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(safeBody),
    });
    const text = await oaRes.text();
    res.status(oaRes.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch {
    res.status(502).json({ error: 'No se pudo contactar a OpenAI.' });
  }
}
