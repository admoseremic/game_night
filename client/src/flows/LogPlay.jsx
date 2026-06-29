// LogPlay.jsx — Two-step full-screen overlay for logging a play session.
// Step 0: pick a game (searchable list + "New game" affordance).
// Step 1: set finish order by tapping players, optional scores, datetime.
//
// Uses LOCAL React state so in-progress data never touches the global store until save.
// On open: reads ui.editPlayId → edit mode (pre-fills from existing play, step=1).
//          No editPlayId → new mode (blank state, step=0).
//
// Save order (CRITICAL): compute prev record BEFORE calling addPlay so new-record
// detection works correctly against pre-mutation data. editPlay skips celebration.

import { useState } from 'react';
import { useStore } from '../store/store.jsx';
import Avatar from '../components/Avatar.jsx';
import MedalChip from '../components/MedalChip.jsx';
import TierBadge from '../components/TierBadge.jsx';
import { recordFor } from '../lib/stats.js';

// Convert a Date to "YYYY-MM-DDTHH:MM" for datetime-local input value
function toLocalDT(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Generate ~46 confetti piece descriptors (ported from prototype lines 1395-1399)
function makeConfetti() {
  const cols = ['#FFC24B','#FF8A3D','#FF5E62','#FF4D8D','#34D9A0','#9B6CFF','#60A5FA','#fff'];
  return Array.from({ length: 46 }, () => ({
    left: Math.round(Math.random() * 100),
    delay: Math.round(Math.random() * 450),
    dur: 1500 + Math.round(Math.random() * 1400),
    color: cols[Math.floor(Math.random() * cols.length)],
    size: 6 + Math.round(Math.random() * 8),
    rot: Math.round(Math.random() * 360),
    shape: Math.random() > 0.5 ? '50%' : '2px',
  }));
}

export default function LogPlay() {
  const { data, ui, setUi, now, actions } = useStore();

  // Determine edit vs new mode from ui flags (captured once on mount via useState initializers)
  const isEdit = !!ui.editPlayId;
  const editPlay = isEdit ? data.plays.find(p => p.id === ui.editPlayId) : null;

  // Derive initial edit-mode values synchronously (useState initializers run once on mount)
  const editSorted = isEdit && editPlay ? [...editPlay.parts].sort((a, b) => a[1] - b[1]) : [];
  const initScores = {};
  editSorted.forEach(x => { if (x[2] != null) initScores[x[0]] = '' + x[2]; });

  const [step, setStep] = useState(isEdit && editPlay ? 1 : 0);
  const [gameId, setGameId] = useState(isEdit && editPlay ? editPlay.g : null);
  const [order, setOrder] = useState(isEdit && editPlay ? editSorted.map(x => x[0]) : []);
  const [scores, setScores] = useState(initScores);
  const [date, setDate] = useState(isEdit && editPlay ? editPlay.d : toLocalDT(now));
  const [search, setSearch] = useState('');

  // Close and clear ui flags
  const close = () => setUi({ logOpen: false, editPlayId: null });

  // Toggle a player in/out of the finish order; removes their score on removal
  const toggleLogPlayer = (id) => {
    const idx = order.indexOf(id);
    if (idx >= 0) {
      const next = [...order];
      next.splice(idx, 1);
      setOrder(next);
      setScores(prev => { const s = { ...prev }; delete s[id]; return s; });
    } else {
      setOrder([...order, id]);
    }
  };

  // Update score text for a player
  const setScoreFor = (id, value) => setScores(s => ({ ...s, [id]: value }));

  // Move a player up one slot in the finish order (swaps with the player above)
  const moveUp = (pid) => {
    const i = order.indexOf(pid);
    if (i <= 0) return;
    const next = [...order];
    next[i - 1] = order[i];
    next[i] = order[i - 1];
    setOrder(next);
  };

  // Save the play — ported from prototype saveLog (lines 1400-1412)
  const saveLog = () => {
    if (order.length < 1) return;

    // Build parts array: [pid, rank(1-based), score|null]
    const parts = order.map((pid, i) => {
      const v = scores[pid];
      return [pid, i + 1, (v !== undefined && v !== '') ? Number(v) : null];
    });

    if (isEdit) {
      // Edit mode: update in place, no celebration
      actions.editPlay(ui.editPlayId, { g: gameId, d: date, parts });
      setUi({ logOpen: false, editPlayId: null });
      return;
    }

    // NEW mode: compute prev record BEFORE addPlay (essential — data does not yet include this play)
    const prev = recordFor(data, gameId);
    const g = data.games.find(x => x.id === gameId);
    const winScore = parts[0][2];
    const isRecord = winScore != null && (!prev || (g.dir === 'high' ? winScore > prev.score : winScore < prev.score));
    const beaten = parts.length - 1;
    const wp = data.players.find(x => x.id === order[0]);

    actions.addPlay({ g: gameId, d: date, parts });
    setUi({
      logOpen: false,
      editPlayId: null,
      celebrate: {
        type: isRecord ? 'record' : 'win',
        name: wp.name,
        initials: wp.name[0].toUpperCase(),
        c1: wp.c1,
        c2: wp.c2,
        gameName: g.name,
        icon: g.icon,
        scoreStr: winScore != null ? ('' + winScore) : '',
        beaten,
        confetti: makeConfetti(),
      },
    });
  };

  // Computed derived values for rendering
  // Filter games by search text, then sort alphabetically by name
  const filteredGames = data.games
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const pool = data.players.filter(p => !order.includes(p.id));
  // Split the add-pool so regulars surface in their own section up top, the rest below
  const poolRegulars = pool.filter(p => p.regular);
  const poolOthers = pool.filter(p => !p.regular);
  const selectedGame = data.games.find(g => g.id === gameId);

  const canSave = order.length >= 1;
  const canAdvance = !!gameId; // for the step-0 "Next" button

  // Render a tappable "add player" chip — shared by the Regulars and Everyone-else sections
  const playerChip = (p) => (
    <div
      key={p.id}
      onClick={() => toggleLogPlayer(p.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px 8px 8px',
        borderRadius: 13, cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)',
        // Regular players get a gold border to stand out
        border: `1px solid ${p.regular ? 'rgba(255,194,75,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <Avatar player={p} size={30} />
      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</span>
      <span style={{ fontSize: 15, color: '#FF8A3D', fontWeight: 700 }}>+</span>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(120% 60% at 50% 0%, #2A1B3D 0%, #130E1B 60%)',
    }}>
      {/* Top bar — back (step 1 new only) + kicker/title + close */}
      <div style={{ padding: '58px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={step === 1 && !isEdit ? () => setStep(0) : undefined}
          style={{
            width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.07)', fontSize: 20, color: '#C9B8E8',
            cursor: step === 1 && !isEdit ? 'pointer' : 'default',
            opacity: step === 1 && !isEdit ? 1 : 0,
            pointerEvents: step === 1 && !isEdit ? 'auto' : 'none',
          }}
        >‹</div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#FF8A3D' }}>
            {isEdit ? 'EDIT PLAY' : 'LOG A PLAY'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 1 }}>
            {step === 0 ? 'Pick the game' : (selectedGame ? selectedGame.name : 'Finish order & scores')}
          </div>
        </div>

        <div
          onClick={close}
          style={{
            width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.07)', fontSize: 17, color: '#C9B8E8',
            cursor: 'pointer',
          }}
        >✕</div>
      </div>

      {/* Scrollable body — overflowX:hidden guards against any child (e.g. the date input) forcing horizontal page scroll */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 18px 20px' }}>

        {/* ── STEP 0: pick game ── */}
        {step === 0 && (
          <>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the shelf…"
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#F4EEF8', fontSize: 15, fontFamily: 'inherit', outline: 'none',
                marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredGames.map(g => (
                <div
                  key={g.id}
                  onClick={() => { setGameId(g.id); setStep(1); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 15, cursor: 'pointer',
                    background: gameId === g.id ? 'rgba(255,138,61,0.12)' : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${gameId === g.id ? '#FF8A3D' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <div style={{
                    width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    background: 'linear-gradient(140deg,#2E2440,#201830)',
                  }}>{g.icon}</div>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{g.name}</span>
                  <TierBadge tier={g.tier} />
                </div>
              ))}

              {/* New game affordance — opens AddGame sheet (rendered by App) */}
              <div
                onClick={() => setUi({ addGameOpen: true })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 15, cursor: 'pointer',
                  background: 'rgba(155,108,255,0.08)',
                  border: '1px dashed rgba(155,108,255,0.3)',
                }}
              >
                <div style={{
                  width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  background: 'rgba(155,108,255,0.12)',
                }}>＋</div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#B49BFF' }}>New game</span>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 1: finish order + scores ── */}
        {step === 1 && (
          <>
            {/* Selected game summary */}
            {selectedGame && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                borderRadius: 14, background: 'rgba(255,138,61,0.1)',
                border: '1px solid rgba(255,138,61,0.2)', marginBottom: 10,
              }}>
                <span style={{ fontSize: 22 }}>{selectedGame.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{selectedGame.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FF8A3D' }}>tap in order →</span>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#9D90B5', margin: '0 2px 14px', lineHeight: 1.4 }}>
              Tap players in their finish order, then type each score — optional.
            </div>

            {/* Datetime input */}
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: '#6E6483', margin: '0 2px 8px' }}>
              📅 Date & time
            </div>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%', maxWidth: '100%', minWidth: 0, padding: '12px 14px', borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: '#F4EEF8', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                marginBottom: 18, colorScheme: 'dark', boxSizing: 'border-box',
                // WebKit/iOS date inputs have an intrinsic min-width that ignores width:100% and overflows
                // the page horizontally; appearance:none lets our width constraints take effect (tap still opens the native picker)
                WebkitAppearance: 'none', appearance: 'none',
              }}
            />

            {/* Finish order list — shown only when at least one player added */}
            {order.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: '#FFC24B', margin: '0 2px 9px' }}>
                  🏁 Finish order & scores
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {order.map((pid, i) => {
                    const player = data.players.find(p => p.id === pid);
                    if (!player) return null;
                    return (
                      <div
                        key={pid}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                          borderRadius: 14, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <MedalChip rank={i + 1} />
                        <Avatar player={player} size={34} />
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {player.name}
                        </span>
                        {/* Move-up arrow: shown when not first; useful in edit mode and general reordering */}
                        {i > 0 && (
                          <div
                            onClick={() => moveUp(pid)}
                            style={{
                              width: 28, height: 28, flexShrink: 0, borderRadius: 9, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(255,194,75,0.12)', color: '#FFC24B', fontSize: 15, cursor: 'pointer',
                            }}
                          >↑</div>
                        )}
                        {/* Optional score input */}
                        <input
                          value={scores[pid] !== undefined ? scores[pid] : ''}
                          onChange={e => setScoreFor(pid, e.target.value)}
                          inputMode="numeric"
                          placeholder="score"
                          style={{
                            width: 56, flexShrink: 0, padding: '8px 6px', borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                            color: '#FFC24B', fontWeight: 800, fontSize: 15, textAlign: 'center',
                            fontFamily: 'var(--font-display)', outline: 'none',
                          }}
                        />
                        {/* Remove button */}
                        <div
                          onClick={() => toggleLogPlayer(pid)}
                          style={{
                            width: 28, height: 28, flexShrink: 0, borderRadius: 9, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.06)', color: '#9D90B5', fontSize: 15, cursor: 'pointer',
                          }}
                        >✕</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Player pool — Regulars surfaced in their own section up top for quick selection */}
            {poolRegulars.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: '#FFC24B', margin: '0 2px 9px' }}>
                  ★ Regulars
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {poolRegulars.map(playerChip)}
                </div>
              </>
            )}

            {/* Everyone else — the rest of the players (plus the add-player affordance) */}
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: '#6E6483', margin: '0 2px 9px' }}>
              {poolRegulars.length > 0 ? 'Everyone else' : 'Tap to add'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {poolOthers.map(playerChip)}

              {/* Add player affordance — opens AddPlayer sheet (rendered by App) */}
              <div
                onClick={() => setUi({ addPlayerOpen: true })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px 8px 10px',
                  borderRadius: 13, cursor: 'pointer',
                  background: 'rgba(155,108,255,0.08)',
                  border: '1px dashed rgba(155,108,255,0.3)',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#B49BFF' }}>＋ Add player</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer action button */}
      <div style={{ padding: '12px 18px 30px', background: 'linear-gradient(0deg,#130E1B 60%,rgba(19,14,27,0))' }}>
        {step === 0 ? (
          // Step 0: "Next" advances to step 1 once a game is selected
          <div
            onClick={canAdvance ? () => setStep(1) : undefined}
            style={{
              padding: 16, borderRadius: 17, textAlign: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff',
              background: canAdvance ? 'linear-gradient(135deg,#FF8A3D,#FF5E62)' : 'rgba(255,255,255,0.08)',
              opacity: canAdvance ? 1 : 0.5,
              boxShadow: canAdvance ? '0 10px 24px rgba(255,94,98,0.3)' : 'none',
              cursor: canAdvance ? 'pointer' : 'default',
            }}
          >Next →</div>
        ) : (
          // Step 1: Save / Update — requires at least 1 player in order
          <div
            onClick={canSave ? saveLog : undefined}
            style={{
              padding: 16, borderRadius: 17, textAlign: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff',
              background: canSave ? 'linear-gradient(135deg,#FF8A3D,#FF5E62)' : 'rgba(255,255,255,0.08)',
              opacity: canSave ? 1 : 0.5,
              boxShadow: canSave ? '0 10px 24px rgba(255,94,98,0.3)' : 'none',
              cursor: canSave ? 'pointer' : 'default',
            }}
          >{isEdit ? 'Update play ✓' : 'Save play ✓'}</div>
        )}
      </div>
    </div>
  );
}
