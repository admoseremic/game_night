// PeriodChips.jsx — the three-way time-window filter (This Year / Last 2 Years / All Time).
// Shared by the Hall of Fame and the Player Profile so both stay visually + behaviorally identical.
// Generic: the parent owns the active value and decides what onSelect(key) mutates.

export const CHIPS = [
  { key: 'thisYear', label: 'This Year' },
  { key: 'last2',    label: 'Last 2 Years' },
  { key: 'all',      label: 'All Time' },
];

// Human label for a period key (used for kicker text on the screens)
export function periodLabel(key) {
  return (CHIPS.find(c => c.key === key) || CHIPS[2]).label;
}

// Active chip gets the gold background; the rest stay subtle.
export default function PeriodChips({ active, onSelect, style }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, ...style }}>
      {CHIPS.map(c => {
        const isActive = c.key === active;
        return (
          <div
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 4px',
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              color: isActive ? '#150F1F' : '#9D90B5',
              background: isActive ? '#FFC24B' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? '#FFC24B' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {c.label}
          </div>
        );
      })}
    </div>
  );
}
