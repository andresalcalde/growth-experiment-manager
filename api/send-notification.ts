import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUser, escapeHtml } from './_lib/security.ts';

// Simple per-instance limiter; instances do not share these windows.
const windows = new Map<string, { until: number; count: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticatedUser(req);
  if (!auth) return res.status(401).json({ error: 'Sesión inválida.' });
  const body = (req.body ?? {}) as Record<string, unknown>;
  const to = typeof body.to === 'string' ? [body.to] : body.to;
  if (!Array.isArray(to) || !to.length || to.length > 10 ||
      !to.every((value): value is string => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+$/.test(value)) ||
      body.type !== 'experiment_winner' || typeof body.experimentTitle !== 'string' ||
      !body.experimentTitle.trim() || body.experimentTitle.length > 300 || 'html' in body) {
    return res.status(400).json({ error: 'Notificación inválida.' });
  }
  // Check shared projects explicitly, even for a superadmin caller.
  const { data: memberships, error: ownError } = await auth.client.from('project_members')
    .select('project_id').eq('user_id', auth.user.id);
  if (ownError) return res.status(503).json({ error: 'No se pudo autorizar el envío.' });
  const { data: profiles, error } = await auth.client.from('profiles').select('id,email').in('email', to);
  if (error || !profiles || profiles.length !== new Set(to).size) {
    return res.status(403).json({ error: 'Destinatario no autorizado.' });
  }
  const projectIds = (memberships || []).map(row => row.project_id);
  for (const profile of profiles) {
    if (profile.id === auth.user.id) continue;
    if (!projectIds.length) return res.status(403).json({ error: 'Destinatario no autorizado.' });
    const { data, error: memberError } = await auth.client.from('project_members')
      .select('user_id').eq('user_id', profile.id).in('project_id', projectIds).limit(1);
    if (memberError || !data?.length) return res.status(403).json({ error: 'Destinatario no autorizado.' });
  }
  const now = Date.now();
  for (const [id, window] of windows) if (window.until <= now) windows.delete(id);
  const window = windows.get(auth.user.id) || { until: now + 60_000, count: 0 };
  if (window.count >= 5) return res.status(429).json({ error: 'Máximo 5 notificaciones por minuto.' });
  window.count++;
  windows.set(auth.user.id, window);
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'Correo no configurado.' });
  const title = escapeHtml(body.experimentTitle);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: 'Growth Hub <no-reply@send.mmglatam.com>', to,
        subject: `🏆 Tu experimento fue un Winner: ${body.experimentTitle.replace(/[\r\n]/g, ' ')}`,
        html: `<h2>¡Felicitaciones!</h2><p>Tu experimento <strong>${title}</strong> fue marcado como <strong>Winner</strong> en Growth Hub.</p>`,
      }),
    });
    return res.status(response.ok ? 200 : 502).json({ success: response.ok });
  } catch { return res.status(502).json({ error: 'No se pudo enviar el correo.' }); }
}
