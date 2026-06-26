// Celebration.jsx — Full-screen overlay shown after logging a new play.
// Shows confetti, a 🥇 "WINNER!" or 🏆 "NEW RECORD!" hero, winner avatar,
// game info, optional score, and a "Keep playing" dismiss button.
//
// ui.celebrate = {
//   type: 'win'|'record', name, initials, c1, c2,
//   gameName, icon, scoreStr, beaten,
//   confetti: [{ left, delay, dur, color, size, shape }, ...]
// }
//
// Respects prefers-reduced-motion: confetti is hidden, pop/float animations skipped.

import { useStore } from '../store/store.jsx';

export default function Celebration() {
  const { ui, setUi } = useStore();
  const cel = ui.celebrate;
  if (!cel) return null;

  const isRecord = cel.type === 'record';
  const emoji = isRecord ? '🏆' : '🥇';
  const title = isRecord ? 'NEW RECORD!' : 'WINNER!';
  const titleColor = isRecord ? '#FFC24B' : '#FF8A3D';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(80% 50% at 50% 38%, rgba(255,138,61,0.22), rgba(19,14,27,0.97) 70%), rgba(12,8,18,0.96)',
    }}>
      <style>{`
        @keyframes gnConfFall {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes gnCelPop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes gnCelFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gn-conf { animation: none !important; opacity: 0 !important; }
          .gn-cel-pop { animation: none !important; }
          .gn-cel-float { animation: none !important; }
        }
      `}</style>

      {/* Confetti — each piece falls from top, staggered by delay */}
      {cel.confetti.map((c, i) => (
        <div
          key={i}
          className="gn-conf"
          style={{
            position: 'absolute',
            top: -20,
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: c.shape,
            animationName: 'gnConfFall',
            animationDuration: `${c.dur}ms`,
            animationDelay: `${c.delay}ms`,
            animationTimingFunction: 'ease-in',
            animationFillMode: 'forwards',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Hero content card */}
      <div
        className="gn-cel-pop"
        style={{ position: 'relative', textAlign: 'center', padding: '0 30px', animation: 'gnCelPop 0.5s ease' }}
      >
        {/* Trophy / medal emoji floats up and down */}
        <div
          className="gn-cel-float"
          style={{
            fontSize: 84, lineHeight: 1,
            animation: 'gnCelFloat 2s ease-in-out infinite',
            filter: 'drop-shadow(0 10px 22px rgba(0,0,0,.5))',
          }}
        >
          {emoji}
        </div>

        {/* Win / record title */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34,
          letterSpacing: 1, color: titleColor, marginTop: 14,
        }}>
          {title}
        </div>

        {/* Winner avatar (large, gradient square) */}
        <div style={{
          width: 96, height: 96, margin: '22px auto 0', borderRadius: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, color: '#fff',
          background: `linear-gradient(135deg, ${cel.c1}, ${cel.c2})`,
          boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
        }}>
          {cel.initials}
        </div>

        {/* Winner name */}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginTop: 16 }}>
          {cel.name}
        </div>

        {/* Game + optional score */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#C9B8E8', marginTop: 6 }}>
          won {cel.gameName} {cel.icon}{cel.scoreStr ? ` · ${cel.scoreStr}` : ''}
        </div>

        {/* Players beaten count */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#9D90B5', marginTop: 4 }}>
          ⚔️ beat {cel.beaten} {cel.beaten === 1 ? 'player' : 'players'} at the table
        </div>

        {/* Dismiss */}
        <div
          onClick={() => setUi({ celebrate: null })}
          style={{
            margin: '30px auto 0', display: 'inline-block', padding: '14px 32px',
            borderRadius: 16, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
            color: '#150F1F', background: 'linear-gradient(135deg,#FFD66B,#F0A92E)',
            boxShadow: '0 10px 24px rgba(240,169,46,0.4)', cursor: 'pointer',
          }}
        >
          Keep playing →
        </div>
      </div>
    </div>
  );
}
