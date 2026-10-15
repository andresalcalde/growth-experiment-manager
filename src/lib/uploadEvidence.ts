import { supabase } from './supabase';

const BUCKET = 'experiment-evidence';
const PREFIX = `storage://${BUCKET}/`;

function safeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'archivo';
}

function evidencePath(value: string): string | null {
  if (value.startsWith(PREFIX)) return value.slice(PREFIX.length);
  // Legacy public URLs and previously signed URLs both resolve to the same key.
  const match = value.match(/\/object\/(?:public|sign|authenticated)\/experiment-evidence\/([^?#]+)/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

/** Store an enduring key, never an expiring signature, in visual_proof. */
export function evidenceReference(value: string): string {
  const path = evidencePath(value);
  return path ? `${PREFIX}${path}` : value;
}

/** Presentation URLs are independent from persistent references, including failures. */
export async function resolveEvidence(values: string[] = []): Promise<Record<string, string | null>> {
  const pairs = await Promise.all(values.map(async value => {
    const reference = evidenceReference(value);
    const path = evidencePath(value);
    if (!path) return [reference, value] as const;
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      return [reference, !error && data ? data.signedUrl : null] as const;
    } catch { return [reference, null] as const; }
  }));
  return Object.fromEntries(pairs);
}

export function displayEvidence(reference: string, urls: Record<string, string | null> = {}): string {
  const key = evidenceReference(reference);
  if (key.startsWith(PREFIX)) return urls[key] || 'Evidencia no disponible';
  return reference;
}

export async function uploadExperimentEvidence(experimentId: string, file: File): Promise<string> {
  // Derive project from the authorized experiment rather than trusting UI state.
  const { data: experiment, error: lookupError } = await supabase.from('experiments')
    .select('project_id').eq('id', experimentId).single();
  if (lookupError || !experiment) throw lookupError || new Error('Experimento no accesible.');
  const path = `${experiment.project_id}/${experimentId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  return `${PREFIX}${path}`;
}

export async function deleteExperimentEvidence(url: string): Promise<void> {
  const path = evidencePath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
