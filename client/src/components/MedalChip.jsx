// MedalChip.jsx — Small rounded chip for leaderboard ranks 1-3 (gold/silver/bronze).
// Uses medalBg / medalTx from format.js for consistent gradient/color tokens.
// Usage: <MedalChip rank={1} />

import { medalBg, medalTx } from '../lib/format.js';

export default function MedalChip({ rank }) {
  const bg = medalBg(rank);
  const color = medalTx(rank);

  return (
    <div style={{
      minWidth: 26,
      height: 26,
      padding: '0 5px',
      borderRadius: 9,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg,
      color: color,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 14,
      lineHeight: 1,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {rank}
    </div>
  );
}
