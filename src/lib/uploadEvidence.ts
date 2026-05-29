import { supabase } from './supabase';

const BUCKET = 'experiment-evidence';

// Normaliza el nombre del archivo para una key segura en Storage.
function safeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita acentos
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'archivo';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext ? `${base}.${ext}` : base;
}

/**
 * Sube un archivo de evidencia de un experimento y devuelve su URL pública.
 * Acepta cualquier tipo de archivo (imágenes, PDF, docs, etc.).
 */
export async function uploadExperimentEvidence(
  experimentId: string,
  file: File
): Promise<string> {
  const path = `${experimentId}/${Date.now()}-${safeName(file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Elimina un archivo de evidencia a partir de su URL pública.
 * No-op si la URL no pertenece a este bucket (p. ej. evidencia legacy en base64).
 */
export async function deleteExperimentEvidence(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
