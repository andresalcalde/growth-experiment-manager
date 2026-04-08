import { useState } from 'react';
import type { Status } from '../types';

interface Props {
  onFinalize: (status: Status) => void;
}

const OUTCOMES = [
  { status: 'Finished - Winner' as Status, label: 'Winner', icon: '🏆', color: '#10b981', desc: 'La hipotesis fue validada' },
  { status: 'Finished - Loser' as Status, label: 'Loser', icon: '❌', color: '#ef4444', desc: 'La hipotesis fue invalidada' },
  { status: 'Finished - Inconclusive' as Status, label: 'Inconclusive', icon: '🔄', color: '#6b7280', desc: 'No hay datos suficientes' },
];

export function FinalizeExperimentButton({ onFinalize }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        className="finalize-btn"
        onClick={() => setExpanded(true)}
      >
        <span>🏁</span>
        Finalizar Experimento
      </button>
    );
  }

  return (
    <div className="finalize-options">
      <p className="finalize-options__title">Selecciona el resultado:</p>
      {OUTCOMES.map(({ status, label, icon, color, desc }) => (
        <button
          key={status}
          className="finalize-option"
          style={{ '--option-color': color } as React.CSSProperties}
          onClick={() => {
            onFinalize(status);
            setExpanded(false);
          }}
        >
          <span className="finalize-option__icon">{icon}</span>
          <div>
            <span className="finalize-option__label">{label}</span>
            <span className="finalize-option__desc">{desc}</span>
          </div>
        </button>
      ))}
      <button
        className="finalize-cancel"
        onClick={() => setExpanded(false)}
      >
        Cancelar
      </button>
    </div>
  );
}
