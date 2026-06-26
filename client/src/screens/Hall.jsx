// Hall.jsx — Hall of Fame screen.
// Ported from prototype template lines 610–694.
// Shows: All-time header, G.O.A.T card, 4 milestone cards,
//        Rivalries (head-to-head split bars), Trophy case (record scores per game).

import { useStore } from '../store/store.jsx';
import { buildHall } from '../viewmodels/hall.js';
import Avatar from '../components/Avatar.jsx';

// --- Sub-components ---

// GOAT card: the all-time weighted-wins champion with gradient dark card.
function GoatCard({ champ }) {
  // Build a player-like object for Avatar (needs .name, .c1, .c2)
  const player = { name: champ.name, c1: champ.c1, c2: champ.c2 };

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      padding: '22px 20px',
      marginBottom: 18,
      background: 'linear-gradient(155deg,#3A2A14 0%,#1B1228 70%)',
      border: '1px solid rgba(255,194,75,0.34)',
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Watermark trophy emoji */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -20,
        fontSize: 150,
        opacity: 0.12,
        transform: 'rotate(12deg)',
        pointerEvents: 'none',
      }}>🏆</div>

      <div style={{ position: 'relative' }}>
        {/* Kicker */}
        <div style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: '#FFC24B',
          marginBottom: 14,
        }}>★ The G.O.A.T · All Time</div>

        {/* Avatar + name + stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <Avatar player={player} size={66} />

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1,
              color: '#fff',
            }}>{champ.name}</div>

            {/* Stat pills: wins / w.wins / beaten */}
            <div style={{ display: 'flex', gap: 14, marginTop: 9 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#FFC24B' }}>
                  {champ.wins}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5', marginLeft: 4 }}>wins</span>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#34D9A0' }}>
                  {champ.wwinsStr}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5', marginLeft: 4 }}>w.wins</span>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#FF6FA5' }}>
                  {champ.beat}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5', marginLeft: 4 }}>beaten</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Single milestone card row (icon box + label/value/sub).
function MilestoneCard({ m }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Icon box with subtle tinted background */}
      <div style={{
        width: 46,
        height: 46,
        flexShrink: 0,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 23,
        background: 'rgba(255,255,255,0.05)',
      }}>{m.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '.6px',
          textTransform: 'uppercase',
          color: m.tint,
        }}>{m.label}</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: '#F4EEF8',
          marginTop: 2,
          lineHeight: 1.1,
        }}>{m.value}</div>
        <div style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: '#9D90B5',
          marginTop: 2,
        }}>{m.sub}</div>
      </div>
    </div>
  );
}

// Single rivalry card with mini avatar, wins, head-to-head split bar.
function RivalryCard({ r }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Player A vs Player B header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        {/* Player A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 13,
            color: '#fff',
            background: `linear-gradient(135deg, ${r.aC1}, ${r.aC2})`,
          }}>{r.aInit}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.aName}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#FFC24B' }}>{r.aWins} wins</div>
          </div>
        </div>

        {/* VS divider */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 13,
          color: '#6E6483',
        }}>VS</div>

        {/* Player B (right-aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.bName}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#FFC24B' }}>{r.bWins} wins</div>
          </div>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 13,
            color: '#fff',
            background: `linear-gradient(135deg, ${r.bC1}, ${r.bC2})`,
          }}>{r.bInit}</div>
        </div>
      </div>

      {/* Head-to-head split bar: aPct% for A, remainder for B */}
      <div style={{
        display: 'flex',
        height: 7,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: `${r.aPct}%`,
          background: `linear-gradient(90deg, ${r.aC1}, ${r.aC2})`,
        }} />
        <div style={{
          flex: 1,
          background: `linear-gradient(90deg, ${r.bC2}, ${r.bC1})`,
        }} />
      </div>

      {/* Lead summary */}
      <div style={{
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: '#9D90B5',
        marginTop: 9,
      }}>👑 {r.leadName} leads · {r.meetings} meetings</div>
    </div>
  );
}

// Single trophy case row (game icon + name + holder avatar + record score).
function TrophyRow({ g }) {
  const holder = { name: g.holder, c1: g.c1, c2: g.c2 };
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 14px',
      borderRadius: 15,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: 20 }}>{g.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 13.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{g.name}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9D90B5' }}>held by {g.holder}</div>
      </div>
      {/* Holder avatar */}
      <Avatar player={holder} size={30} />
      {/* Record score */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 19,
        color: '#FFC24B',
        minWidth: 38,
        textAlign: 'right',
      }}>{g.score}</div>
    </div>
  );
}

// --- Main Hall screen ---

export default function Hall() {
  const { data, now } = useStore();
  const vm = buildHall(data, now);

  // Empty state: friendly message when no plays have been logged yet
  if (vm.empty) {
    return (
      <div style={{ padding: '40px 4px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>Hall of Fame</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Play some games to fill the Hall of Fame.<br />
          Records, rivalries, and G.O.A.T status await.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* All-time header */}
      <div style={{ margin: '4px 2px 16px' }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#FFC24B',
        }}>All-time</span>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 25,
          lineHeight: 1,
          marginTop: 1,
        }}>Hall of Fame</div>
      </div>

      {/* G.O.A.T card */}
      <GoatCard champ={vm.champ} />

      {/* Records & milestones section */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16,
        margin: '0 2px 12px',
      }}>Records &amp; milestones</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {vm.milestones.map((m, i) => (
          <MilestoneCard key={i} m={m} />
        ))}
      </div>

      {/* Rivalries section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 12px' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
        }}>Rivalries</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5' }}>head-to-head</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {vm.rivalries.length === 0 ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9D90B5', padding: '10px 2px' }}>
            No rivalries yet — pairs need at least 5 meetings to qualify.
          </div>
        ) : (
          vm.rivalries.map((r, i) => (
            <RivalryCard key={i} r={r} />
          ))
        )}
      </div>

      {/* Trophy case section */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16,
        margin: '0 2px 12px',
      }}>Trophy case · record scores</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vm.records.length === 0 ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9D90B5', padding: '10px 2px' }}>
            No scored records yet — add scores when logging plays.
          </div>
        ) : (
          vm.records.map((g, i) => (
            <TrophyRow key={i} g={g} />
          ))
        )}
      </div>
    </div>
  );
}
