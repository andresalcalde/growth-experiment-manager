import { supabase } from './supabase';

export async function uploadProjectLogo(
  projectId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${projectId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from('project-logos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('project-logos')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteProjectLogo(projectId: string): Promise<void> {
  // Try common extensions
  for (const ext of ['png', 'jpg', 'jpeg']) {
    await supabase.storage
      .from('project-logos')
      .remove([`${projectId}/logo.${ext}`]);
  }
}

// Platform logo: replaces the "Growth Hub" header branding for the project.
// Distinct from the project icon above; stored in the same bucket.
export async function uploadProjectPlatformLogo(
  projectId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${projectId}/platform-logo.${ext}`;

  const { error } = await supabase.storage
    .from('project-logos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('project-logos')
    .getPublicUrl(path);

  // Cache-bust so updated logos appear immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteProjectPlatformLogo(projectId: string): Promise<void> {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    await supabase.storage
      .from('project-logos')
      .remove([`${projectId}/platform-logo.${ext}`]);
  }
}
