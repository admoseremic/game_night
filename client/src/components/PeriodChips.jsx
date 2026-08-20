// PeriodChips.jsx — the four-way time-window filter (This Month / Last Month / This Year / All Time).
// Shared by the Hall of Fame and the Player Profile so both stay visually + behaviorally identical.
// Generic: the parent owns the active value and decides what onSelect(key) mutates.
//
// The keys are the SAME vocabulary as stats.js `inPeriod` (and the Board's Period sheet), so the
// view-models filter with inPeriod(play, key, now) — no separate window math lives here.

export const CHIPS = [
  { key: 'month',     label: 'This Month' },
  { key: 'prevMonth', label: 'Last Month' },
  { key: 'ytd',       label: 'This Year'  },
  { key: 'all',       label: 'All Time'   },
];

// Human label for a period key (used for kicker text on the screens)
export function periodLabel(key) {
  return (CHIPS.find(c => c.key === key) || CHIPS[3]).label;
}

// Active chip gets the gold background; the rest stay subtle.
// Four chips share one row, so the type/padding is tighter than a three-chip row would need.
export default function PeriodChips({ active, onSelect, style }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, ...style }}>
      {CHIPS.map(c => {
        const isActive = c.key === active;
        return (
          <div
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 2px',
              borderRadius: 12,
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
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
