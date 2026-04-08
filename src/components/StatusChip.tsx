import type { Status } from '../types';

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  'Idea':         { icon: '💡', color: 'var(--status-idea)' },
  'Prioritized':  { icon: '🎯', color: 'var(--status-prioritized)' },
  'Building':     { icon: '🔧', color: 'var(--status-dev)' },
  'Live Testing': { icon: '🧪', color: 'var(--status-testing)' },
  'Analysis':     { icon: '📊', color: 'var(--status-inconclusive)' },
};

const ACTIVE_STATUSES: Status[] = ['Idea', 'Prioritized', 'Building', 'Live Testing', 'Analysis'];

interface StatusChipProps {
  status: Status;
  onChange: (newStatus: Status) => void;
}

export function StatusChip({ status, onChange }: StatusChipProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Idea'];

  return (
    <div
      className="status-chip"
      style={{ '--chip-color': config.color } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="status-chip__icon">{config.icon}</span>
      <select
        value={status}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value as Status);
        }}
        onClick={(e) => e.stopPropagation()}
        className="status-chip__select"
      >
        {ACTIVE_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span className="status-chip__arrow">&#9662;</span>
    </div>
  );
}
