// Explain.jsx — Bottom sheet explaining what the leaderboard numbers mean.
// Ported from prototype lines 1019–1028.
// Opens via ui.explainOpen; "Got it" button closes it.

import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

// Stat explanations (ported from prototype lines 1023–1026)
const STATS = [
  {
    icon: '🥇',
    label: 'Wins',
    desc: 'First-place finishes. One winner per game.',
  },
  {
    icon: '📈',
    label: 'Win %',
    desc: 'Wins ÷ games played, as a percentage.',
  },
  {
    icon: '💀',
    label: 'Losses',
    desc: 'Last-place finishes — games where you came in dead last. Solo games don’t count.',
  },
  {
    icon: '⚔️',
    label: 'Players Beaten',
    desc: 'Everyone who finished below you, summed across all games. Beating a 6-player table counts more than a 2-player one.',
  },
  {
    icon: '📊',
    label: 'Beaten per Play',
    desc: 'Players beaten ÷ games played — your average per night. Fair across people who’ve played more or fewer games.',
  },
  {
    icon: '⚖️',
    label: 'Weighted Wins',
    desc: 'Wins worth more for heavier games — Light ×0.5, Medium ×1, Heavy ×1.5. Rewards beating the brain-burners.',
  },
];

export default function Explain() {
  const { ui, setUi } = useStore();

  return (
    <BottomSheet
      open={ui.explainOpen}
      onClose={() => setUi({ explainOpen: false })}
      title="What the numbers mean"
    >
      {/* Subtitle (ported from prototype line 1021) */}
      <div style={{ fontSize: 12.5, color: '#9D90B5', marginBottom: 18, marginTop: -8 }}>
        Tap any stat to sort the board by it.
      </div>

      {/* Stat rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ display: 'flex', gap: 13 }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: '#9D90B5', lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Got it button (ported from prototype line 1028) */}
      <div
        onClick={() => setUi({ explainOpen: false })}
        style={{
          marginTop: 22,
          textAlign: 'center',
          padding: '14px',
          borderRadius: 15,
          background: 'rgba(255,255,255,0.07)',
          fontWeight: 700,
          fontSize: 14,
          color: '#F4EEF8',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        Got it
      </div>
    </BottomSheet>
  );
}
