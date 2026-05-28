import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordProps {
  onBack: () => void;
}

/**
 * ForgotPassword — formulario de "olvidé contraseña".
 *
 * Llama a `supabase.auth.resetPasswordForEmail` que envía un email con un
 * enlace que apunta a `<origin>/reset-password`. El componente `ResetPassword`
 * captura el token desde el fragment de la URL (`#access_token=...`) y permite
 * setear la nueva contraseña vía `supabase.auth.updateUser`.
 */
export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
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
            Recuperar contraseña
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Te enviaremos un enlace para que la restablezcas.
          </p>
        </div>

        {success ? (
          <div
            style={{
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              fontSize: 13,
              color: '#166534',
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Listo. Si <strong>{email}</strong> está registrado, recibirás un email con el enlace para
            restablecer tu contraseña. Revisa también la carpeta de spam.
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
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              style={{
                width: '100%',
                padding: 13,
                borderRadius: 8,
                border: 'none',
                background: '#111114',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting || !email.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !email.trim() ? 0.6 : 1,
                marginTop: 8,
              }}
            >
              {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#4F46E5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
