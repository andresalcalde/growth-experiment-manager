import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser, escapeHtml } from './_lib/security.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticatedUser(req);
  if (!auth) return res.status(401).json({ error: 'Sesión inválida.' });
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.experimentId !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.experimentId) ||
      Object.keys(body).some(key => key !== 'experimentId')) {
    return res.status(400).json({ error: 'Notificación inválida.' });
  }
  // Caller JWT applies RLS; the service role never performs this read.
  const { data: experiment, error } = await auth.client.from('experiments')
    .select('id,project_id,status,title,owner_id').eq('id', body.experimentId).maybeSingle();
  if (error) return res.status(503).json({ error: 'No se pudo autorizar el envío.' });
  if (!experiment || experiment.status !== 'Finished - Winner' || !experiment.owner_id) {
    return res.status(403).json({ error: 'Evento no autorizado.' });
  }
  const { data: writable, error: writeError } = await auth.client.rpc('gh_project_write', { p_project: experiment.project_id });
  if (writeError) return res.status(503).json({ error: 'No se pudo autorizar el envío.' });
  if (!writable) return res.status(403).json({ error: 'Evento no autorizado.' });
  const key = process.env.RESEND_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !serviceKey) return res.status(503).json({ error: 'Correo no configurado.' });
  const admin = createClient(process.env.VITE_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(experiment.owner_id);
  const { data: prefs, error: prefError } = await admin.rpc('get_notification_preference', { p_user_id: experiment.owner_id });
  // El dueño debe seguir siendo miembro del proyecto: owner_id lo escribe el cliente.
  const { data: membership, error: memberError } = await admin.from('project_members')
    .select('user_id').eq('project_id', experiment.project_id).eq('user_id', experiment.owner_id).maybeSingle();
  if (recipientError || prefError || memberError) return res.status(503).json({ error: 'No se pudo resolver el destinatario.' });
  if (!membership) return res.status(200).json({ success: true, skipped: true });
  if (!recipient.user?.email || !recipient.user.email_confirmed_at || !prefs ||
      prefs.volume === 'none' || !prefs.notify_winner) return res.status(200).json({ success: true, skipped: true });
  const { data: reservation, error: quotaError } = await admin.rpc('gh_reserve_notification', {
    p_actor: auth.user.id, p_experiment: experiment.id,
  });
  if (quotaError) return res.status(503).json({ error: 'No se pudo verificar la cuota.' });
  if (reservation === 'duplicate') return res.status(200).json({ success: true, skipped: true });
  if (reservation !== 'reserved') return res.status(429).json({ error: 'Cuota de notificaciones agotada.' });
  const configuredFrom = process.env.NOTIFICATIONS_FROM?.trim() || '';
  const sender = /^(?:[^<>\r\n]*<)?[^\s@<>]+@send\.mmglatam\.com>?$/i.test(configuredFrom)
    ? configuredFrom : 'no-reply@send.mmglatam.com';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
        'Idempotency-Key': `experiment-winner-${experiment.id}` },
      body: JSON.stringify({
        from: sender, to: [recipient.user.email],
        subject: `Tu experimento fue un Winner: ${experiment.title.replace(/[\r\n]/g, ' ')}`,
        html: `<h2>¡Felicitaciones!</h2><p>Tu experimento <strong>${escapeHtml(experiment.title)}</strong> fue marcado como <strong>Winner</strong> en Growth Hub.</p>`,
      }),
    });
    return res.status(response.ok ? 200 : 502).json({ success: response.ok });
  } catch { return res.status(502).json({ error: 'No se pudo enviar el correo.' }); }
}
