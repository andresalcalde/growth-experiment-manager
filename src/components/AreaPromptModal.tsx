import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Prompt obligatorio: si el perfil no tiene área, se pide antes de seguir usando la app.
export const AreaPromptModal: React.FC = () => {
  const { profile, updateArea, areas } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!profile || profile.area) return null;

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await updateArea(selected);
    } catch (err) {
      console.error('Error saving area:', err);
      alert('No se pudo guardar el área. Intenta de nuevo.');
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
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>¿Cuál es tu área?</h2>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px' }}>
          Necesitamos tu área de trabajo para segmentar métricas y aprendizajes. Es obligatorio.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {areas.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '12px' }}>
              Cargando áreas…
            </div>
          ) : areas.map(area => (
            <button
              key={area.id}
              onClick={() => setSelected(area.name)}
              style={{
                padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', textAlign: 'center',
                border: '2px solid ' + (selected === area.name ? '#4F46E5' : '#e5e7eb'),
                background: selected === area.name ? '#eef2ff' : 'white',
                color: selected === area.name ? '#4F46E5' : '#374151',
              }}
            >
              {area.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: !selected || saving ? '#c7d2fe' : '#4F46E5', color: 'white',
            fontWeight: 700, fontSize: '14px', cursor: !selected || saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};
