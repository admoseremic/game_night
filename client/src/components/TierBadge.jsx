// TierBadge.jsx — Small pill showing a game's weight tier (Light / Medium / Heavy).
// Background and text color come from tierBg / tierTx format.js tokens.
// Usage: <TierBadge tier="Heavy" />

import { tierBg, tierTx } from '../lib/format.js';

export default function TierBadge({ tier }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 6px',
      borderRadius: 6,
      background: tierBg(tier),
      color: tierTx(tier),
      fontSize: '9.5px',
      fontWeight: 800,
      letterSpacing: '0.4px',
      textTransform: 'uppercase',
      lineHeight: 1.4,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {tier}
    </span>
  );
}
