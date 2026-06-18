import { supabase } from './supabase';

// Reusa el bucket `user-panel-logos` (ya tiene políticas RLS por usuario:
// cada usuario escribe bajo su propia carpeta `${userId}/...`). Guardamos el
// avatar como `${userId}/avatar.ext` para no requerir un bucket nuevo.
const BUCKET = 'user-panel-logos';

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust para que la foto actualizada se vea de inmediato.
  return `${data.publicUrl}?v=${Date.now()}`;
}
