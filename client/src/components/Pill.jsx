// Pill.jsx — Tappable filter pill used on the board (period / sort-by selectors).
// Shows a muted uppercase label above a brighter value, with a hairline border.
// Usage: <Pill label="Period" value="This month" onClick={openSheet} />

export default function Pill({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '9px 13px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Muted small uppercase label */}
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: 'var(--text-faint)',
        }}>
          {label}
        </span>
        {/* Brighter primary value */}
        <span style={{
          fontSize: '13.5px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {value}
        </span>
      </div>
      {/* Chevron indicator */}
      <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: 10 }}>▼</span>
    </div>
  );
}
