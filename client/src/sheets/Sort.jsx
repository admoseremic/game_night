// Sort.jsx — Bottom sheet for selecting the leaderboard sort key.
// Ported from prototype sortOptions (lines 1476–1480).
// Opens via ui.sortSheetOpen; each option sets ui.sorts[0] and closes the sheet.

import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

// Sort options with icon + description (ported from prototype sortMeta, line 1476)
const SORT_DEFS = [
  ['wins',   'Wins',    '🥇', 'First-place finishes'],
  ['winPct', 'Win %',   '📈', 'Wins ÷ games played'],
  ['losses', 'Losses',  '💀', 'Last-place finishes'],
  ['plays',  'Plays',   '🎲', 'Games played'],
  ['beat',   'Beaten',     '⚔️', 'Opponents beaten, all games'],
  ['beatPer', 'Beat/play', '📊', 'Opponents beaten ÷ games played'],
  ['wwins',  'W.Wins',     '⚖️', 'Wins weighted by game weight'],
];

export default function Sort() {
  const { ui, setUi } = useStore();

  return (
    <BottomSheet
      open={ui.sortSheetOpen}
      onClose={() => setUi({ sortSheetOpen: false })}
      title="Sort the board by"
    >
      {/* Subtitle */}
      <div style={{ fontSize: 12.5, color: '#9D90B5', marginBottom: 16, marginTop: -8 }}>
        Pick what "best" means tonight.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SORT_DEFS.map(([k, label, icon, desc]) => {
          const active = ui.sorts[0] === k;
          return (
            <div
              key={k}
              onClick={() => setUi({ sorts: [k], sortSheetOpen: false })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '13px 15px',
                borderRadius: 14,
                background: active ? 'rgba(255,194,75,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(255,194,75,0.32)' : 'rgba(255,255,255,0.07)'}`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: active ? '#FFC24B' : '#F4EEF8' }}>
                  {label}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 1 }}>
                  {desc}
                </div>
              </div>
              {active && <span style={{ fontSize: 15, color: '#FFC24B' }}>✓</span>}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
