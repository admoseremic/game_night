// ExpandToggle.jsx — the "Show all (N)" / "Show less" pill used to expand/collapse a capped list.
// Shared by the Player Profile (per-game breakdown, records held) and the Hall's Head-to-Head
// per-game breakdown so they stay visually identical. Parent owns the expanded state.
// Pass `style` to tweak spacing when nested inside a tighter card.

export default function ExpandToggle({ expanded, total, onToggle, style }) {
  return (
    <div
      onClick={onToggle}
      style={{
        marginTop: 10,
        textAlign: 'center',
        padding: '12px',
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        color: '#FFC24B',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer',
        userSelect: 'none',
        ...style,
      }}
    >
      {expanded ? 'Show less' : `Show all (${total})`}
    </div>
  );
}
