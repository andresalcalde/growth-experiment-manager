import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Envío de notificaciones por correo (punto 7 del feedback Growth Lab).
 *
 * Usa la API REST de Resend (sin SDK) con `process.env.RESEND_API_KEY`. El
 * remitente se toma de `process.env.NOTIFICATIONS_FROM` (ej.
 * "Growth Hub <no-reply@tudominio.com>"). Requiere un token de sesión Supabase
 * válido para no ser un proxy de correo abierto.
 *
 * Body: { to: string | string[], subject: string, html: string }
 *
 * REQUIERE configurar en Vercel: RESEND_API_KEY y NOTIFICATIONS_FROM.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM;
  if (!resendKey || !from) {
    res.status(500).json({ error: 'Notificaciones no configuradas (RESEND_API_KEY / NOTIFICATIONS_FROM).' });
    return;
  }

  // --- Validación de sesión Supabase (igual que ai-assistant) ---
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

  // --- Body defensivo ---
  const body = (req.body ?? {}) as Record<string, unknown>;
  const to = Array.isArray(body.to)
    ? (body.to as unknown[]).filter((x): x is string => typeof x === 'string')
    : typeof body.to === 'string' ? [body.to] : [];
  const subject = typeof body.subject === 'string' ? body.subject : '';
  const html = typeof body.html === 'string' ? body.html : '';
  if (to.length === 0 || !subject || !html) {
    res.status(400).json({ error: 'Faltan campos: to, subject, html.' });
    return;
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch {
    res.status(502).json({ error: 'No se pudo contactar al proveedor de correo.' });
  }
}
