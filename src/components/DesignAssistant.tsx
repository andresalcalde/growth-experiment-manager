import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, AlertTriangle } from 'lucide-react';
import {
  askDesignAssistant,
  validateDesignDraft,
  type ChatMessage,
  type DesignContext,
  type DesignDraft,
} from '../services/aiAssistant';

/**
 * DesignAssistant — panel lateral colapsable (drawer derecho) con UI de chat.
 *
 * Modo:
 * - Floating button "Asistente IA" en la etapa Design.
 * - Al abrir, panel a la derecha con quick-action chips y un thread de chat.
 * - Las validaciones heurísticas del draft se muestran como warnings amarillos.
 *
 * Estado del thread es local (no se persiste) — es una sesión de coaching, no
 * un historial conversacional largo. Reset al cerrar.
 */

interface DesignAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  projectContext: DesignContext;
  currentDesign?: DesignDraft;
}

const QUICK_ACTIONS = [
  { label: 'Revisar mi hipótesis', prompt: 'Revisa la hipótesis actual del draft. ¿Está bien estructurada? Si no, reescríbela en formato SI / ENTONCES / PORQUE.' },
  { label: 'Proponer criterios de éxito', prompt: 'Propón 2-3 criterios de éxito medibles para la hipótesis actual, alineados con la North Star.' },
  { label: 'Sugerir métrica objetivo', prompt: 'Sugiere qué métrica objetivo conviene mover con esta hipótesis y por qué.' },
  { label: 'Mejorar el contexto', prompt: 'Revisa el contexto estratégico (objetivos, iniciativas). ¿Hay gaps? Propón mejoras concretas.' },
];

export const DesignAssistant: React.FC<DesignAssistantProps> = ({
  isOpen,
  onClose,
  projectContext,
  currentDesign,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Warnings derived directly from props (no extra setState round-trip).
  // El response del backend puede sobre-escribir esto vía `overrideWarnings`.
  const [overrideWarnings, setOverrideWarnings] = useState<string[] | null>(null);
  const warnings = overrideWarnings ?? validateDesignDraft(currentDesign);
  const threadRef = useRef<HTMLDivElement>(null);

  // Reset override when draft changes — useEffect lo hace sin disparar render cascada
  // porque solo seteamos null si overrideWarnings ya no estaba en null.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (overrideWarnings !== null) setOverrideWarnings(null); }, [currentDesign, overrideWarnings]);

  // Auto-scroll al final del thread.
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const resp = await askDesignAssistant({
      projectContext,
      currentDesign,
      history: messages,
      userMessage: trimmed,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: resp.reply }]);
    setOverrideWarnings(resp.warnings);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop click-to-close (semi-transparent so user sees the form) */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 9998 }}
      />
      {/* Panel */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 95vw)',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 30px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Asistente IA</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Design · Hipótesis SI / ENTONCES / PORQUE</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: 6,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#92400e', fontSize: 12, fontWeight: 700 }}>
              <AlertTriangle size={13} />
              Validaciones del Design
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#92400e', fontSize: 12, lineHeight: 1.5 }}>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Acciones rápidas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => sendMessage(a.prompt)}
                disabled={loading}
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 99,
                  background: 'white',
                  color: '#4F46E5',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div
          ref={threadRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: '#fafafa',
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 12px' }}>
              <Sparkles size={28} style={{ opacity: 0.6, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>¿En qué te ayudo?</div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                Puedo revisar tu hipótesis, proponer criterios de éxito o señalar gaps en tu contexto estratégico.
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: 12,
                background: m.role === 'user' ? '#4F46E5' : 'white',
                color: m.role === 'user' ? 'white' : '#111827',
                border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 12px', borderRadius: 12, background: 'white', border: '1px solid #e5e7eb', color: '#6b7280', fontSize: 12 }}>
              Pensando…
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            borderTop: '1px solid #e5e7eb',
            background: 'white',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta o pega tu hipótesis…"
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 13,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '0 14px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </aside>
    </>
  );
};

/**
 * Floating button to open the assistant. Mount in the Design view.
 */
export const DesignAssistantButton: React.FC<{ onClick: () => void; warningCount?: number }> = ({ onClick, warningCount = 0 }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 50,
      padding: '12px 18px',
      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      color: 'white',
      border: 'none',
      borderRadius: 99,
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 10px 30px rgba(79, 70, 229, 0.4)',
    }}
    title="Abrir asistente IA"
  >
    <Sparkles size={16} />
    Asistente IA
    {warningCount > 0 && (
      <span
        style={{
          marginLeft: 4,
          background: '#fbbf24',
          color: '#78350f',
          padding: '2px 7px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {warningCount}
      </span>
    )}
  </button>
);
