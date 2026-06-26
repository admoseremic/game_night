// Avatar.jsx — Rounded-square gradient tile showing a player's first initial.
// Usage: <Avatar player={playerObj} size={40} />
// player must have { name, c1, c2 } — c1/c2 are the gradient color stops.

export default function Avatar({ player, size = 40 }) {
  const radius = Math.round(size * 0.3); // ~30% of size
  const fontSize = Math.round(size * 0.45);
  const initial = player?.name ? player.name[0].toUpperCase() : '?';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: `linear-gradient(135deg, ${player?.c1 ?? '#9B6CFF'}, ${player?.c2 ?? '#FF5E62'})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      // Ensure the text is readable on any gradient
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: fontSize,
      color: '#fff',
      lineHeight: 1,
      userSelect: 'none',
    }}>
      {initial}
    </div>
  );
}
