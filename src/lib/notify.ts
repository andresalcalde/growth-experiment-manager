import { supabase } from './supabase';

/**
 * Envío de notificaciones por correo (punto 7 del feedback Growth Lab).
 *
 * Todo es "fire-and-forget": si el correo falla (p. ej. SMTP/Resend no
 * configurado), NO debe romper el flujo de la app — se traga el error.
 * El envío real lo hace la función serverless `api/send-notification.ts`.
 */
async function notifyEmail(to: string | string[], subject: string, html: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch {
    /* fire-and-forget */
  }
}

interface NotifPref {
  volume: 'all' | 'important' | 'none';
  notify_winner: boolean;
  notify_assignment: boolean;
  notify_new_project: boolean;
}

// Resuelve el perfil (id, email, prefs) de un usuario por su nombre. El modelo
// guarda el owner del experimento como texto, no como FK — match por nombre.
async function resolveRecipientByName(name: string): Promise<{ email: string; prefs: NotifPref } | null> {
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('full_name', name)
      .maybeSingle();
    if (!prof?.email) return null;
    const { data: pref } = await supabase.rpc('get_notification_preference', { p_user_id: prof.id });
    return { email: prof.email as string, prefs: (pref as NotifPref) ?? { volume: 'all', notify_winner: true, notify_assignment: true, notify_new_project: true } };
  } catch {
    return null;
  }
}

/**
 * Notifica al owner cuando su experimento resulta Winner. Respeta la preferencia
 * del destinatario (volume != 'none' && notify_winner).
 */
export async function notifyExperimentWinner(ownerName: string, experimentTitle: string): Promise<void> {
  if (!ownerName) return;
  const rcpt = await resolveRecipientByName(ownerName);
  if (!rcpt) return;
  if (rcpt.prefs.volume === 'none' || !rcpt.prefs.notify_winner) return;
  await notifyEmail(
    rcpt.email,
    `🏆 Tu experimento fue un Winner: ${experimentTitle}`,
    `<h2>¡Felicitaciones!</h2><p>Tu experimento <strong>${experimentTitle}</strong> fue marcado como <strong>Winner</strong> en Growth Hub.</p>`,
  );
}
