import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron de alertas de inactividad para superadmins (punto 7 del feedback).
 *
 * Corre en schedule (ver vercel.json). Busca usuarios inactivos (>14 días sin
 * `last_seen_at`) y notifica por correo a los superadmins. Usa el service-role
 * key para leer todos los perfiles, así que NO se expone al cliente.
 *
 * REQUIERE en Vercel: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, RESEND_API_KEY,
 * NOTIFICATIONS_FROM. Vercel manda `Authorization: Bearer $CRON_SECRET`.
 */
const DAY = 86400000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Seguridad: solo el cron de Vercel (o quien tenga el secreto) puede invocar.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM;
  if (!supabaseUrl || !serviceKey || !resendKey || !from) {
    res.status(500).json({ error: 'Faltan variables de entorno del servidor.' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Perfiles: superadmins (destinatarios) + usuarios inactivos.
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, full_name, global_role, last_seen_at');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const now = Date.now();
  const inactive = (profiles || []).filter(p => {
    const last = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
    return (now - last) / DAY > 14;
  });
  const admins = (profiles || []).filter(p => p.global_role === 'superadmin' && p.email);

  if (inactive.length === 0 || admins.length === 0) {
    res.status(200).json({ ok: true, inactive: inactive.length, notified: 0 });
    return;
  }

  const list = inactive
    .map(p => `<li>${p.full_name || p.email || p.id} — ${p.last_seen_at ? `${Math.floor((now - new Date(p.last_seen_at).getTime()) / DAY)} días` : 'nunca activo'}</li>`)
    .join('');
  const html = `<h2>Usuarios inactivos en Growth Hub</h2>
    <p>${inactive.length} usuario(s) llevan más de 14 días sin actividad:</p>
    <ul>${list}</ul>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from, to: admins.map(a => a.email), subject: `Growth Hub · ${inactive.length} usuario(s) inactivos`, html }),
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ error: 'Fallo al enviar correo', detail: t });
      return;
    }
  } catch {
    res.status(502).json({ error: 'No se pudo contactar al proveedor de correo.' });
    return;
  }

  res.status(200).json({ ok: true, inactive: inactive.length, notified: admins.length });
}
