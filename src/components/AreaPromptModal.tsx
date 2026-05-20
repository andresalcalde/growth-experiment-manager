import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Prompt obligatorio: si el perfil no tiene áreas, se piden antes de seguir usando la app.
export const AreaPromptModal: React.FC = () => {
  const { profile, updateArea, areas } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  if (!profile || (profile.area && profile.area.length > 0)) return null;

  const toggle = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    try {
      setSaving(true);
      await updateArea(selected);
    } catch (err) {
      console.error('Error saving areas:', err);
      alert('No se pudieron guardar las áreas. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px',
    }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '10px' }}>
            <Briefcase size={22} color="#4F46E5" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>¿En qué áreas trabajas?</h2>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px' }}>
          Necesitamos tus áreas de trabajo para segmentar métricas y aprendizajes.
          Puedes seleccionar más de una. Es obligatorio.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {areas.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '12px' }}>
              Cargando áreas…
            </div>
          ) : areas.map(area => {
            const on = selected.includes(area.name);
            return (
              <button
                key={area.id}
                onClick={() => toggle(area.name)}
                style={{
                  padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'center',
                  border: '2px solid ' + (on ? '#4F46E5' : '#e5e7eb'),
                  background: on ? '#eef2ff' : 'white',
                  color: on ? '#4F46E5' : '#374151',
                }}
              >
                {area.name}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={selected.length === 0 || saving}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: selected.length === 0 || saving ? '#c7d2fe' : '#4F46E5', color: 'white',
            fontWeight: 700, fontSize: '14px',
            cursor: selected.length === 0 || saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};
