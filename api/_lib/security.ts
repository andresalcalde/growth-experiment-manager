import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export async function authenticatedUser(req: VercelRequest) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!url || !key || !token) return null;
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await client.auth.getUser(token);
    return !error && data.user ? { client, user: data.user } : null;
  } catch { return null; }
}

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}
