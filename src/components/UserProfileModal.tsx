import React, { useEffect, useRef, useState } from 'react';
import { X, UploadCloud, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadUserAvatar } from '../lib/uploadUserAvatar';
import { supabase } from '../lib/supabase';

type NotifVolume = 'all' | 'important' | 'none';
interface NotifPrefs {
  volume: NotifVolume;
  notify_winner: boolean;
  notify_assignment: boolean;
  notify_new_project: boolean;
}
const DEFAULT_PREFS: NotifPrefs = { volume: 'all', notify_winner: true, notify_assignment: true, notify_new_project: true };

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * UserProfileModal — edición de perfil accesible globalmente (sin necesidad de
 * estar dentro de un proyecto). Permite modificar nombre, área(s), contraseña y
 * foto. Lee y escribe vía AuthContext, así que solo necesita isOpen/onClose.
 */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, user, areas, updateProfile, updatePassword, updateArea } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sincroniza el formulario con el perfil cada vez que se abre.
  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.full_name || '');
      setSelectedAreas(profile.area || []);
      setAvatarUrl(profile.avatar_url || null);
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, profile]);

  // Carga las preferencias de notificación al abrir.
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    supabase
      .from('notification_preferences')
      .select('volume, notify_winner, notify_assignment, notify_new_project')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPrefs(data as NotifPrefs);
        else if (!cancelled) setPrefs(DEFAULT_PREFS);
      });
    return () => { cancelled = true; };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const toggleArea = (name: string) => {
    setSelectedAreas((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  };

  const handlePickPhoto = () => fileRef.current?.click();

  const handlePhoto = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('La foto no debe exceder 2MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadUserAvatar(user.id, file);
      setAvatarUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    // Validación de contraseña solo si el usuario escribió algo.
    if (password || confirmPassword) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), avatar_url: avatarUrl });
      // Solo escribe el área si cambió (evita writes innecesarios).
      const prevAreas = (profile?.area || []).slice().sort().join('|');
      const nextAreas = selectedAreas.slice().sort().join('|');
      if (prevAreas !== nextAreas) {
        await updateArea(selectedAreas);
      }
      if (password) {
        await updatePassword(password);
      }
      // Preferencias de notificación (upsert sobre la PK user_id).
      if (user) {
        await supabase
          .from('notification_preferences')
          .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() });
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (profile?.full_name || profile?.email || '?').charAt(0).toUpperCase();
  const hasPhoto = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:'));

  return (
    <div
      className="drawer-overlay"
      style={{ alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: '16px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 600, margin: 0 }}>Mi perfil</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <X size={22} color="var(--text-subtle)" />
            </button>
          </div>

          {/* Foto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#111114', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, overflow: 'hidden', flexShrink: 0 }}>
              {hasPhoto ? <img src={avatarUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }}
              />
              <button
                onClick={handlePickPhoto}
                disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px', cursor: uploading ? 'default' : 'pointer' }}
              >
                {uploading ? <Loader2 size={14} className="spin" /> : <UploadCloud size={14} />}
                {uploading ? 'Subiendo…' : 'Cambiar foto'}
              </button>
              {hasPhoto && (
                <button
                  onClick={() => setAvatarUrl(null)}
                  style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Nombre */}
          <Field label="Nombre">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              style={inputStyle}
            />
          </Field>

          {/* Email (read-only) */}
          <Field label="Email">
            <input type="email" value={profile?.email || ''} disabled style={{ ...inputStyle, background: '#f9fafb', color: 'var(--text-subtle)', cursor: 'not-allowed' }} />
          </Field>

          {/* Áreas */}
          <Field label="Área">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {areas.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>No hay áreas definidas.</span>}
              {areas.map((a) => {
                const on = selectedAreas.includes(a.name);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleArea(a.name)}
                    style={{
                      fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '99px', cursor: 'pointer',
                      border: on ? '1px solid #4F46E5' : '1px solid var(--border-subtle)',
                      background: on ? '#eef2ff' : 'white',
                      color: on ? '#4F46E5' : 'var(--text-muted)',
                    }}
                  >
                    {on && <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                    {a.name}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Contraseña */}
          <Field label="Nueva contraseña (opcional)">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" style={inputStyle} autoComplete="new-password" />
          </Field>
          {password && (
            <Field label="Confirma la contraseña">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </Field>
          )}

          {/* Notificaciones por correo */}
          <Field label="Notificaciones por correo">
            <select
              value={prefs.volume}
              onChange={(e) => setPrefs((p) => ({ ...p, volume: e.target.value as NotifVolume }))}
              style={{ ...inputStyle, marginBottom: '10px' }}
            >
              <option value="all">Todas</option>
              <option value="important">Solo las importantes</option>
              <option value="none">Ninguna</option>
            </select>
            {prefs.volume !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                <Toggle label="Experimento exitoso (Winner)" checked={prefs.notify_winner} onChange={(v) => setPrefs((p) => ({ ...p, notify_winner: v }))} />
                <Toggle label="Asignación a un experimento" checked={prefs.notify_assignment} onChange={(v) => setPrefs((p) => ({ ...p, notify_assignment: v }))} />
                <Toggle label="Incorporación a un proyecto" checked={prefs.notify_new_project} onChange={(v) => setPrefs((p) => ({ ...p, notify_new_project: v }))} />
              </div>
            )}
          </Field>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>Cambios guardados.</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#111114', color: 'white', fontSize: '14px', fontWeight: 600, cursor: saving || uploading ? 'default' : 'pointer', opacity: saving || uploading ? 0.6 : 1 }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{label}</label>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
