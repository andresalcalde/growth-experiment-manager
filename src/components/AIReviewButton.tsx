import React, { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { reviewText, type ReviewField, type ReviewResult } from '../services/aiAssistant';

interface AIReviewButtonProps {
  field: ReviewField;
  /** Texto actual del campo a revisar. */
  value: string;
  /** Contexto breve del experimento (título, hipótesis…) para mejor revisión. */
  context?: string;
  /** Se llama con el texto corregido cuando el usuario pulsa "Aplicar". */
  onApply: (text: string) => void;
}

/**
 * Botón "✨ Revisar" + popover de sugerencia de IA para un campo de texto.
 * Manual (una llamada a OpenAI por clic). El usuario decide Aplicar/Descartar.
 */
export const AIReviewButton: React.FC<AIReviewButtonProps> = ({ field, value, context, onApply }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setOpen(true);
    setResult(null);
    setError(null);
    if (!value || value.trim().length === 0) {
      setError('Escribe algo primero para poder revisarlo.');
      return;
    }
    setLoading(true);
    try {
      const r = await reviewText({ field, text: value, context });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al revisar.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (result?.suggestion) onApply(result.suggestion);
    setOpen(false);
    setResult(null);
  };

  const close = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={run}
        disabled={loading}
        title="Revisar y mejorar la redacción con IA"
        style={{
          background: 'none',
          border: 'none',
          color: '#7C3AED',
          cursor: loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
        {loading ? 'Revisando…' : 'Revisar'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '340px',
            maxWidth: '80vw',
            background: 'white',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.18))',
            zIndex: 50,
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Sparkles size={13} /> Sugerencia IA
            </span>
            <button onClick={close} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
              <Loader2 size={16} className="spin" /> Analizando la redacción…
            </div>
          )}

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--status-loser, #DC2626)', margin: '4px 0 0' }}>{error}</p>
          )}

          {result && (
            <div>
              <div
                style={{
                  background: 'var(--bg-sidebar, #f9fafb)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginBottom: '10px',
                }}
              >
                {result.suggestion}
              </div>

              {result.issues.length > 0 && (
                <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {result.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={close}
                  style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Descartar
                </button>
                <button
                  onClick={apply}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} /> Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
