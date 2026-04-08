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
  const progress = northStar.targetValue > 0
    ? Math.min((northStar.currentValue / northStar.targetValue) * 100, 100)
    : 0;

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
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="north-star-bar__pct">{Math.round(progress)}%</span>
    </div>
  );
}
