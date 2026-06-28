// GameDetail.jsx — Game Deep-Dive screen.
// Ported from prototype template lines 261–366 (sc-if gameDetailView).
// Uses buildGameDetail() view-model; all stat math lives in viewmodels/gameDetail.js.

import { useStore } from '../store/store.jsx';
import { buildGameDetail } from '../viewmodels/gameDetail.js';
import TierBadge from '../components/TierBadge.jsx';

// ─── Record hero card (top record score + holder) ───
// Ported from prototype lines 278–288.
function RecordHero({ record }) {
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      padding: '18px 20px',
      background: 'linear-gradient(150deg,#2E1F44,#1B1228)',
      border: '1px solid rgba(255,194,75,0.28)',
      marginBottom: 14,
    }}>
      {/* Decorative glow orb */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -30,
        width: 170,
        height: 170,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,194,75,0.28), rgba(255,194,75,0) 68%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            color: '#FFC24B',
            marginBottom: 6,
          }}>
            🏅 Record Score
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 46,
            lineHeight: 1,
            color: '#fff',
          }}>
            {record.score}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#C9B8E8', marginTop: 6 }}>
            {record.name} · {record.dateLabel}
          </div>
        </div>

        {/* Record holder avatar */}
        <div style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 24,
          color: '#fff',
          background: `linear-gradient(135deg, ${record.c1}, ${record.c2})`,
          boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
        }}>
          {record.initials}
        </div>
      </div>
    </div>
  );
}

// ─── Stat strip (plays / avg players / last played) ───
// Ported from prototype lines 291–304.
function StatStrip({ plays, avgPlayers, lastRel, dirLabel, tierW }) {
  const cellStyle = {
    padding: '12px 4px',
    borderRadius: 15,
    background: 'rgba(255,255,255,0.04)',
    textAlign: 'center',
  };
  const valStyle = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 20,
    color: '#F4EEF8',
  };
  const labelStyle = {
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: '#6E6483',
    marginTop: 3,
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      <div style={{ ...cellStyle, flex: 1 }}>
        <div style={valStyle}>{plays}</div>
        <div style={labelStyle}>Times played</div>
      </div>
      <div style={{ ...cellStyle, flex: 1 }}>
        <div style={valStyle}>{avgPlayers}</div>
        <div style={labelStyle}>Avg players</div>
      </div>
      <div style={{ ...cellStyle, flex: 1.2 }}>
        <div style={valStyle}>{lastRel}</div>
        <div style={labelStyle}>Last played</div>
      </div>
    </div>
  );
}

// ─── King of the game card ───
// Ported from prototype lines 307–317.
function KingCard({ name, c1, c2, initials, wins, gameName }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      padding: '14px 16px',
      borderRadius: 18,
      marginBottom: 22,
      background: 'linear-gradient(120deg,rgba(255,138,61,0.14),rgba(255,94,98,0.05))',
      border: '1px solid rgba(255,138,61,0.22)',
    }}>
      <div style={{ fontSize: 26 }}>👑</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: '#FF8A3D',
        }}>
          King of {gameName}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 19,
          marginTop: 1,
        }}>
          {name}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          color: '#FFC24B',
          lineHeight: 1,
        }}>
          {wins}
        </div>
        <div style={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#6E6483',
          marginTop: 2,
        }}>
          wins
        </div>
      </div>
    </div>
  );
}

// ─── Winning scores bar chart ───
// Ported from prototype lines 320–329. Heights are pre-computed in view-model (20–92px range).
function HistChart({ histBars }) {
  if (!histBars || histBars.length === 0) return null;
  return (
    <>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16,
        margin: '0 2px 12px',
      }}>
        Winning scores over time
      </div>
      {/* Bars and the date axis are SEPARATE rows in one scroll container, so every bar shares a
          common baseline no matter how the date labels wrap. (Previously bars + dates were one
          flex-end column each, so a one-line date made that column shorter and dropped its bar
          lower than neighbors whose dates wrapped to two lines.) Both rows use identical flex:1
          columns + gap + padding, so bars and their dates stay aligned. */}
      <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', marginBottom: 24 }}>
        {/* Bars — value label floats above each bar; flex-end gives them all the same baseline.
            Height fits the tallest column: value label (~13) + 5px gap + 92px max bar. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 114, padding: '0 4px' }}>
          {histBars.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9D90B5' }}>{b.v}</div>
              <div style={{
                width: '100%',
                maxWidth: 26,
                height: b.h,
                borderRadius: '7px 7px 3px 3px',
                background: 'linear-gradient(180deg,#FF8A3D,#FF5E62)',
              }} />
            </div>
          ))}
        </div>
        {/* Date axis — its own row, so variable label wrapping can't shift the bars */}
        <div style={{ display: 'flex', gap: 6, padding: '5px 4px 0' }}>
          {histBars.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 600, color: '#6E6483' }}>{b.label}</div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Top 5 scores list ───
// Ported from prototype lines 332–345.
function TopScores({ topScores }) {
  return (
    <>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16,
        margin: '0 2px 12px',
      }}>
        Top scores
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {topScores.map((s) => (
          <div key={s.pos} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 13px',
            borderRadius: 15,
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {/* Medal position badge */}
            <div style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 12,
              color: s.posTx,
              background: s.posBg,
            }}>
              {s.pos}
            </div>

            {/* Player initials avatar */}
            <div style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              color: '#fff',
              background: `linear-gradient(135deg, ${s.c1}, ${s.c2})`,
            }}>
              {s.initials}
            </div>

            {/* Name + date */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9D90B5' }}>{s.dateLabel}</div>
            </div>

            {/* Score */}
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 20,
              color: '#FFC24B',
            }}>
              {s.score}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Everyone's record table (win leaderboard) ───
// Ported from prototype lines 348–364.
function WinLBTable({ winLB }) {
  return (
    <>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16,
        margin: '0 2px 12px',
      }}>
        Everyone's record here
      </div>
      <div style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '9px 14px',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#6E6483',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ flex: 1 }}>Player</span>
          <span style={{ width: 46, textAlign: 'center' }}>Wins</span>
          <span style={{ width: 46, textAlign: 'center' }}>Win %</span>
          <span style={{ width: 46, textAlign: 'right' }}>Best</span>
        </div>

        {/* Player rows */}
        {winLB.map((p, i) => (
          <div key={p.name + i} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Avatar + name */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <div style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 11,
                color: '#fff',
                background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
              }}>
                {p.initials}
              </div>
              <span style={{
                fontWeight: 700,
                fontSize: 13.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {p.name}
              </span>
            </div>
            <span style={{ width: 46, textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#FFC24B' }}>
              {p.wins}
            </span>
            <span style={{ width: 46, textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#C9B8E8' }}>
              {p.winPct}%
            </span>
            <span style={{ width: 46, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#34D9A0' }}>
              {p.best}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Empty state for a never-played game ───
function EmptyState({ name, icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9D90B5' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#F4EEF8', marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 13 }}>No plays recorded yet.</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>Log a game night to see stats here.</div>
    </div>
  );
}

// ─── Main GameDetail screen ───
export default function GameDetail() {
  const { data, ui, setUi, now } = useStore();

  // Guard: if no gameId is set, show nothing meaningful
  if (!ui.gameId) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#9D90B5' }}>
        No game selected.
      </div>
    );
  }

  const vm = buildGameDetail(data, ui.gameId, now);

  // Back navigation: when opened from a player profile (gameFrom='playerDetail'), return to that
  // player (playerId is still set) and label the link with their name; otherwise the games list.
  const fromPlayer = ui.gameFrom === 'playerDetail';
  const backPlayer = fromPlayer ? data.players.find(p => p.id === ui.playerId) : null;
  const backLabel = backPlayer ? backPlayer.name : 'All games';

  return (
    <>
      {/* ─── Back link ─── */}
      <div
        onClick={() => setUi({ screen: fromPlayer ? 'playerDetail' : 'games', gameId: null, gameFrom: null })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          margin: '2px 0 14px',
          fontSize: 13,
          fontWeight: 700,
          color: '#9D90B5',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16 }}>‹</span> {backLabel}
      </div>

      {/* ─── Game title header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
        {/* Icon tile */}
        <div style={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          background: 'linear-gradient(140deg,#2E2440,#201830)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {vm.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 23,
            lineHeight: 1.05,
          }}>
            {vm.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
            {/* Tier badge with weight multiplier */}
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 6,
              color: vm.tierTx,
              background: vm.tierBg,
            }}>
              {vm.tier} {vm.tierW}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5' }}>
              {vm.dirLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Empty state for never-played game ─── */}
      {vm.empty && <EmptyState name={vm.name} icon={vm.icon} />}

      {/* ─── Rich stats (only when game has been played) ─── */}
      {!vm.empty && (
        <>
          {/* Only render record hero when at least one scored play exists */}
          {vm.record ? (
            <RecordHero record={vm.record} />
          ) : (
            <div style={{
              borderRadius: 18,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 14,
              fontSize: 13,
              fontWeight: 600,
              color: '#9D90B5',
              textAlign: 'center',
            }}>
              No scores recorded for this game yet.
            </div>
          )}
          <StatStrip
            plays={vm.plays}
            avgPlayers={vm.avgPlayers}
            lastRel={vm.lastRel}
            dirLabel={vm.dirLabel}
            tierW={vm.tierW}
          />
          <KingCard
            name={vm.kingName}
            c1={vm.kingC1}
            c2={vm.kingC2}
            initials={vm.kingInitials}
            wins={vm.kingWins}
            gameName={vm.name}
          />
          <HistChart histBars={vm.histBars} />
          <TopScores topScores={vm.topScores} />
          <WinLBTable winLB={vm.winLB} />
        </>
      )}
    </>
  );
}
