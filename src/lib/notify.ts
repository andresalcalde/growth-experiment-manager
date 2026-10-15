import { supabase } from './supabase';

/** Best effort; the server resolves recipient, content and preferences. */
export async function notifyExperimentWinner(experimentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ experimentId }),
    });
  } catch { /* Notification failures must not break experiment editing. */ }
}
