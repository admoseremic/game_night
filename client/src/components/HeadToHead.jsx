// HeadToHead.jsx — interactive "Head to head" comparison block for the Hall of Fame.
// Sits above the Rivalries section. Pick any two players (tap a slot to make it the active
// target, tap a roster avatar to fill it) and see their full matchup in the active Hall window:
// wins vs wins, split bar, who-leads verdict, latest meeting, and a per-game W–L breakdown.
// Ported from prototype template lines 677–773; all logic lives in viewmodels/headToHead.js.
// Reads/writes ui.h2hA / ui.h2hB / ui.h2hSlot — pure UI/session state, not persisted server-side.

import { useStore } from '../store/store.jsx';
import { buildHeadToHead } from '../viewmodels/headToHead.js';

// ─── Single slot: filled (avatar + name, solid active ring) or empty ("?" placeholder, dashed ring) ───
function Slot({ card, ring, placeholder, onClick }) {
  const base = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '12px 8px', borderRadius: 15, cursor: 'pointer',
  };
  if (card) {
    return (
      <div onClick={onClick} style={{ ...base, background: 'rgba(255,255,255,0.04)', border: `2px solid ${ring}` }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 17, color: '#fff', background: `linear-gradient(135deg, ${card.c1}, ${card.c2})`,
        }}>{card.initials}</div>
        <div style={{ fontWeight: 700, fontSize: 12.5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{card.name}</div>
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{ ...base, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${ring}` }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 20, color: '#6E6483', background: 'rgba(255,255,255,0.04)',
      }}>?</div>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#9D90B5' }}>{placeholder}</div>
    </div>
  );
}

export default function HeadToHead() {
  const { data, ui, setUi, now } = useStore();
  // Same window as the rest of Hall (default 'thisYear', matching Hall.jsx)
  const period = ui.hallPeriod || 'thisYear';
  const vm = buildHeadToHead(data, period, now, { a: ui.h2hA, b: ui.h2hB, slot: ui.h2hSlot });

  // Tap a roster avatar → fill the active slot, then flip the active slot to the other one
  // (two taps from empty fills both). Picking someone already in the OTHER slot pulls them
  // out of it rather than letting one player occupy both slots.
  const pick = (pid) => setUi(s => {
    const slot = s.h2hSlot || 'a';
    if (slot === 'a') return { h2hA: pid, h2hB: s.h2hB === pid ? null : s.h2hB, h2hSlot: 'b' };
    return { h2hA: s.h2hA === pid ? null : s.h2hA, h2hB: pid, h2hSlot: 'a' };
  });
  // Tap a slot → make it the active target for the next roster tap
  const setSlot = (slot) => setUi({ h2hSlot: slot });

  // Shared style for the divider that introduces the result / empty-state panel
  const panelTop = { marginTop: 6, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' };

  return (
    <>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 12px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Head to head</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5' }}>pick any two</span>
      </div>

      <div style={{
        padding: 16, borderRadius: 18, marginBottom: 24,
        background: 'linear-gradient(135deg,rgba(255,194,75,0.08),rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Slots: A vs B */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Slot card={vm.aCard} ring={vm.aRing} placeholder="Player A" onClick={() => setSlot('a')} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#6E6483', flexShrink: 0 }}>VS</div>
          <Slot card={vm.bCard} ring={vm.bRing} placeholder="Player B" onClick={() => setSlot('b')} />
        </div>

        {/* Roster strip — horizontal scroll; selected players get a gold ring + A/B badge */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 8px', margin: '0 -2px' }}>
          {vm.roster.map(p => (
            <div
              key={p.id}
              onClick={() => pick(p.id)}
              style={{ flexShrink: 0, position: 'relative', width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: p.op, cursor: 'pointer' }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, color: '#fff', background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                boxShadow: `0 0 0 2px ${p.ring}`,
              }}>{p.initials}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9D90B5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.name}</div>
              {p.tagShow && (
                <div style={{ position: 'absolute', top: -3, right: 1, width: 15, height: 15, borderRadius: '50%', background: '#FFC24B', color: '#150F1F', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.tag}</div>
              )}
            </div>
          ))}
        </div>

        {/* Result panel — both picked and they've met in this window */}
        {vm.hasMeetings && (
          <div style={panelTop}>
            {/* Wins vs wins headline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1, color: '#F4EEF8' }}>{vm.aWins}</div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', paddingBottom: 5 }}>wins</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1, color: '#F4EEF8' }}>{vm.bWins}</div>
            </div>
            {/* Split bar */}
            <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ width: `${vm.aPct}%`, background: `linear-gradient(90deg, ${vm.aC1}, ${vm.aC2})` }} />
              <div style={{ flex: 1, background: `linear-gradient(90deg, ${vm.bC2}, ${vm.bC1})` }} />
            </div>
            {/* Verdict + latest */}
            <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#FFC24B', marginTop: 10 }}>{vm.verdict} · {vm.meetings} meetings</div>
            {vm.hasLast && (
              <div style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: '#9D90B5', marginTop: 3 }}>Latest · {vm.lastTxt}</div>
            )}
            {/* Per-game breakdown */}
            {vm.hasGames && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
                {vm.games.map((g, i) => (
                  <div key={g.name + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.035)' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{g.icon}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: g.aCol }}>{g.a}</span>
                      <span style={{ fontSize: 11, color: '#4E4663' }}>–</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: g.bCol }}>{g.b}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Both picked but never met in this window */}
        {vm.noMeetings && (
          <div style={{ ...panelTop, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#9D90B5' }}>
            These two haven't faced off in this window yet.
          </div>
        )}

        {/* Fewer than two players picked */}
        {vm.notReady && (
          <div style={{ ...panelTop, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#9D90B5' }}>
            Pick two players to see the matchup.
          </div>
        )}
      </div>
    </>
  );
}
