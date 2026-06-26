// Picker.jsx — "Who goes first?" full-screen random-starter picker (Task 17).
// Ported from prototype picker overlay (lines 779–817).
// Full-screen (not BottomSheet). Local state: sel map (pid→bool), result, prev, rolling.
// Regulars pre-selected on mount. Roll picks randomly, never repeating the previous pick
// unless only one player is available. 850ms dice animation before revealing result.

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Picker() {
  const { data, ui, setUi } = useStore();

  // Seed sel with regulars pre-selected on mount
  const initialSel = () => {
    const m = {};
    data.players.forEach(p => { m[p.id] = !!p.regular; });
    return m;
  };

  const [sel, setSel] = useState(initialSel);   // pid → bool
  const [result, setResult] = useState(null);    // pid of winner
  const [prev, setPrev] = useState(null);        // pid of previous roll (to avoid repeat)
  const [rolling, setRolling] = useState(false);

  // Ref for timeout cleanup on unmount
  const timerRef = useRef(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Re-seed sel when player list changes (e.g. new player added while picker is open)
  useEffect(() => {
    setSel(initialSel());
    setResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.players.length]);

  // Close the picker overlay
  const onClose = () => setUi({ pickerOpen: false });

  // Toggle a player's inclusion in the roll
  const toggle = (pid) => setSel(s => ({ ...s, [pid]: !s[pid] }));

  // Count of selected players
  const count = Object.values(sel).filter(Boolean).length;

  // Roll logic — ported from prototype rollPicker (lines 1416–1423)
  const roll = () => {
    if (count < 2) return;
    const ids = Object.keys(sel).filter(k => sel[k]);
    // Avoid repeating the previous pick; fall back to full pool if necessary
    let pool = ids.filter(id => id !== prev);
    if (!pool.length) pool = ids;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    // Start animation
    setRolling(true);
    setResult(null);

    // After 850ms reveal the result
    timerRef.current = setTimeout(() => {
      setRolling(false);
      setResult(pick);
      setPrev(pick);
    }, 850);
  };

  // Determine display state
  const hasResult = !rolling && result !== null;
  const idle = !rolling && result === null;
  const resultPlayer = hasResult ? data.players.find(p => p.id === result) : null;

  return (
    // Full-screen overlay — fixed, high z-index, dark gradient background
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 70,
      background: 'linear-gradient(180deg,#181122,#0D0A18)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
      // Inject float animation for the dice and spin-in for the result avatar
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes gnFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes gnSpinIn {
          from { transform: scale(0.5) rotate(-20deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{
        padding: '58px 18px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
        }}>
          Who goes first?
        </div>
        <div
          onClick={onClose}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.07)',
            fontSize: 17,
            color: '#C9B8E8',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          ✕
        </div>
      </div>

      {/* ─── Result stage ─── */}
      <div style={{
        margin: '14px 18px 8px',
        borderRadius: 24,
        padding: '26px 20px',
        textAlign: 'center',
        background: 'linear-gradient(160deg,#241B33,#181122)',
        border: '1px solid rgba(155,108,255,0.25)',
        minHeight: 188,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Rolling — animated dice */}
        {rolling && (
          <>
            <div style={{ fontSize: 66, animation: 'gnFloat .5s ease-in-out infinite' }}>🎲</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#C9B8E8', marginTop: 10 }}>Rolling…</div>
          </>
        )}

        {/* Result — winner revealed */}
        {hasResult && resultPlayer && (
          <>
            <Avatar player={resultPlayer} size={88} />
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 26,
              marginTop: 14,
            }}>
              {resultPlayer.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFC24B', marginTop: 3 }}>
              🎉 goes first!
            </div>
          </>
        )}

        {/* Idle — prompt to configure and roll */}
        {idle && (
          <>
            <div style={{ fontSize: 60, opacity: 0.85 }}>🎲</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#9D90B5', marginTop: 10 }}>
              Pick who's in, then roll
            </div>
          </>
        )}
      </div>

      {/* ─── Player chips ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 12px' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: '#6E6483',
          margin: '6px 2px 10px',
        }}>
          Who's playing? · {count} in
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.players.map(p => {
            const selected = !!sel[p.id];
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 13px 8px 8px',
                  borderRadius: 13,
                  background: selected ? 'rgba(155,108,255,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected ? 'rgba(155,108,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  opacity: selected ? 1 : 0.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
                }}
              >
                <Avatar player={p} size={30} />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Roll button ─── */}
      <div style={{ padding: '12px 18px 30px' }}>
        <div
          onClick={roll}
          style={{
            padding: 17,
            borderRadius: 17,
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 17,
            color: '#fff',
            background: 'linear-gradient(135deg,#9B6CFF,#6C8BFF)',
            opacity: count >= 2 ? 1 : 0.4,
            boxShadow: '0 10px 26px rgba(108,139,255,0.35)',
            cursor: count >= 2 ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          🎲 {count >= 2 ? 'Roll' : 'Select 2+ players to roll'}
        </div>
      </div>
    </div>
  );
}
