import type { NorthStarMetric } from '../types';

function formatValue(value: number, type: string): string {
  switch (type) {
    case 'currency': return `$${value.toLocaleString()}`;
    case 'percentage': return `${value}%`;
    case 'ratio': return value.toFixed(2);
    default: return value.toLocaleString();
  }
}

export function NorthStarBar({ northStar }: { northStar: NorthStarMetric }) {
  // Progreso real (sin tope). Puede superar 100% cuando se sobrecumple la meta.
  const progress = northStar.targetValue > 0
    ? (northStar.currentValue / northStar.targetValue) * 100
    : 0;
  const isOver = progress > 100;
  // El tramo base (0–100%) llena la barra; el sobrecumplimiento se muestra aparte.
  const baseWidth = Math.min(progress, 100);

  return (
    <div className="north-star-bar">
      <div className="north-star-bar__icon">&#11088;</div>
      <div className="north-star-bar__info">
        <span className="north-star-bar__label">North Star</span>
        <span className="north-star-bar__name">{northStar.name}</span>
      </div>
      <div className="north-star-bar__metrics">
        <span className="north-star-bar__current">{formatValue(northStar.currentValue, northStar.type)}</span>
        <span className="north-star-bar__separator">/</span>
        <span className="north-star-bar__target">{formatValue(northStar.targetValue, northStar.type)}</span>
      </div>
      <div className="north-star-bar__track">
        <div
          className="north-star-bar__fill"
          style={{
            width: `${baseWidth}%`,
            // Sobrecumplimiento: tinte dorado para diferenciarlo del tramo base.
            ...(isOver ? { background: 'linear-gradient(90deg, var(--status-winner, #16a34a), #f59e0b)' } : {}),
          }}
        />
      </div>
      <span
        className="north-star-bar__pct"
        style={isOver ? { color: '#b45309', fontWeight: 700 } : undefined}
        title={isOver ? `Sobrecumplimiento: +${Math.round(progress - 100)}% sobre la meta` : undefined}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
}
