// Period.jsx — Bottom sheet for selecting the leaderboard time period.
// Ported from prototype periodOptions (lines 1466–1474).
// Opens via ui.periodSheetOpen; each option sets ui.period and closes the sheet.
// The "Custom range…" option closes this and opens ui.customOpen.

import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';
import { fmtDate } from '../lib/format.js';

// Period options — 5 standard + custom (ported from prototype periodFull, line 1466)
const PERIOD_FULL = [
  ['month', 'This Month'],
  ['prevMonth', 'Last Month'],
  ['ytd', 'Year to Date'],
  ['lastYear', 'Last Year'],
  ['all', 'All Time'],
];

export default function Period() {
  const { ui, setUi } = useStore();
  const isCustomActive = ui.period === 'custom';

  const options = PERIOD_FULL.map(([k, l]) => {
    const active = ui.period === k;
    return {
      key: k,
      label: l,
      active,
      isCustom: false,
      tx: active ? '#FFC24B' : '#F4EEF8',
      bg: active ? 'rgba(255,194,75,0.12)' : 'rgba(255,255,255,0.04)',
      bd: active ? 'rgba(255,194,75,0.32)' : 'rgba(255,255,255,0.07)',
      onClick: () => setUi({ period: k, periodSheetOpen: false }),
    };
  });

  // Custom range option (ported from prototype line 1472–1474)
  const customLabel = isCustomActive
    ? ('Custom · ' + fmtDate(ui.custom.start + 'T00:00:00') + '–' + fmtDate(ui.custom.end + 'T00:00:00'))
    : 'Custom range…';
  options.push({
    key: 'custom',
    label: customLabel,
    active: isCustomActive,
    isCustom: true,
    tx: isCustomActive ? '#FFC24B' : '#C9B8E8',
    bg: isCustomActive ? 'rgba(255,194,75,0.12)' : 'rgba(155,108,255,0.14)',
    bd: isCustomActive ? 'rgba(255,194,75,0.32)' : 'rgba(155,108,255,0.3)',
    onClick: () => setUi({ periodSheetOpen: false, customOpen: true }),
  });

  return (
    <BottomSheet
      open={ui.periodSheetOpen}
      onClose={() => setUi({ periodSheetOpen: false })}
      title="Time period"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(o => (
          <div
            key={o.key}
            onClick={o.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 15px',
              borderRadius: 14,
              background: o.bg,
              border: `1px solid ${o.bd}`,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: o.tx }}>{o.label}</span>
            {/* Active checkmark */}
            {o.active && !o.isCustom && (
              <span style={{ fontSize: 15, color: '#FFC24B' }}>✓</span>
            )}
            {/* Custom arrow indicator */}
            {o.isCustom && !o.active && (
              <span style={{ fontSize: 13, color: '#9D90B5' }}>›</span>
            )}
            {/* Active + custom: show checkmark */}
            {o.isCustom && o.active && (
              <span style={{ fontSize: 15, color: '#FFC24B' }}>✓</span>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
