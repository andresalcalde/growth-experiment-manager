import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * ResetPassword — captura la sesión "recovery" que Supabase inyecta al volver
 * desde el email link y permite al usuario fijar una nueva contraseña.
 *
 * Flujo:
 * - El usuario abre /reset-password desde el email.
 * - Supabase parsea el fragment de la URL (#access_token=...&type=recovery)
 *   automáticamente, dispara `onAuthStateChange` con event="PASSWORD_RECOVERY"
 *   y deja una sesión válida.
 * - El componente solo necesita llamar `supabase.auth.updateUser({ password })`.
 *
 * Después de actualizar, redirige a `/` para que AuthGate muestre la app.
 */
export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    // Detecta si hay una sesión de recovery activa.
    // Supabase emite PASSWORD_RECOVERY cuando carga el fragment del email.
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session?.user) {
        setTokenReady(true);
      }
    });

    // Si ya hay sesión válida (ej. tras refresh), también permitimos cambiar.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTokenReady(true);
    });

    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirige al inicio después de 1.5s — el AuthProvider ya tiene la sesión.
        setTimeout(() => {
          window.location.replace('/');
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f6f5f1',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'white',
          borderRadius: 10,
          padding: '44px 38px',
          border: '1px solid rgba(17,17,20,0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 20,
              color: '#111114',
              margin: 0,
              marginBottom: 6,
            }}
          >
            Nueva contraseña
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Elige una contraseña nueva para tu cuenta.
          </p>
        </div>

        {!tokenReady && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              fontSize: 13,
              color: '#92400e',
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Esperando enlace de recuperación… Si abriste este link desde un email pero esto no
            avanza, vuelve a solicitar el enlace.
          </div>
        )}

        {success ? (
          <div
            style={{
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              fontSize: 13,
              color: '#166534',
              lineHeight: 1.5,
            }}
          >
            Contraseña actualizada. Redirigiendo…
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#dc2626',
                }}
              >
                {error}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={!tokenReady}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Confirma la contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={!tokenReady}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !tokenReady || !password || !confirmPassword}
              style={{
                width: '100%',
                padding: 13,
                borderRadius: 8,
                border: 'none',
                background: '#111114',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting || !tokenReady ? 'not-allowed' : 'pointer',
                opacity: submitting || !tokenReady ? 0.6 : 1,
                marginTop: 8,
              }}
            >
              {submitting ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
