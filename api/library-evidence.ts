import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from './_lib/security.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = await authenticatedUser(req);
  if (!auth) return res.status(401).json({ error: 'Sesión inválida.' });
  const id = req.body?.experimentId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Experimento inválido.' });
  }
  // Only DB-stored keys authorized by the definer can be signed here.
  const { data: paths, error } = await auth.client.rpc('gh_library_evidence_paths', { p_experiment: id });
  if (error) return res.status(503).json({ error: 'Evidencia no disponible.' });
  if (!paths?.length) return res.status(200).json({ urls: {} });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Evidencia no disponible.' });
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const urls: Record<string, string | null> = {};
  for (const path of paths as string[]) {
    const { data, error: signError } = await admin.storage.from('experiment-evidence').createSignedUrl(path, 3600);
    urls[`storage://experiment-evidence/${path}`] = signError ? null : data?.signedUrl ?? null;
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ urls });
}
