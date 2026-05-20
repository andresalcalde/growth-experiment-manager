import { supabase } from './supabase';

export async function uploadUserPanelLogo(
  userId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from('user-panel-logos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('user-panel-logos')
    .getPublicUrl(path);

  // Cache-bust so updated logos appear immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteUserPanelLogo(userId: string): Promise<void> {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    await supabase.storage
      .from('user-panel-logos')
      .remove([`${userId}/logo.${ext}`]);
  }
}
