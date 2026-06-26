// PlayerProfile.jsx — Player Profile / Detail screen.
// Ported from prototype template region ~460–520.
// Uses buildPlayerDetail() view-model; all stat math lives in viewmodels/playerDetail.js.

import { useStore } from '../store/store.jsx';
import { buildPlayerDetail } from '../viewmodels/playerDetail.js';
import Avatar from '../components/Avatar.jsx';

// ─── Stat chip (single metric display) ───
function StatChip({ value, label }) {
  return (
    <div style={{
      flex: 1,
      padding: '12px 4px',
      borderRadius: 15,
      background: 'rgba(255,255,255,0.04)',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 20,
        color: '#F4EEF8',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        color: '#6E6483',
        marginTop: 3,
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Section header ───
function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      margin: '0 2px 12px',
    }}>
      {children}
    </div>
  );
}

// ─── Favorite / Specialty game mini card ───
function GameCard({ label, icon, name, plays, winPct }) {
  return (
    <div style={{
      flex: 1,
      padding: '14px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color: '#9D90B5',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 14,
          color: '#F4EEF8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {name}
        </span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9D90B5', marginTop: 5 }}>
        {plays} plays · {winPct}% win
      </div>
    </div>
  );
}

// ─── Rivalry card (nemesis or victim) ───
function RivalryCard({ type, opp }) {
  const isNem = type === 'nemesis';
  const color = isNem ? '#FF6FA5' : '#34D9A0';
  const bg = isNem ? 'rgba(255,111,165,0.10)' : 'rgba(52,217,160,0.10)';
  const border = isNem ? 'rgba(255,111,165,0.22)' : 'rgba(52,217,160,0.22)';
  const emoji = isNem ? '😤' : '😎';
  const label = isNem ? 'Nemesis' : 'Victim';

  return (
    <div style={{
      flex: 1,
      padding: '14px',
      borderRadius: 16,
      background: bg,
      border: `1px solid ${border}`,
    }}>
      <div style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
      }}>
        {emoji} {label}
      </div>

      {/* Opponent avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 12,
          color: '#fff',
          background: `linear-gradient(135deg, ${opp.c1}, ${opp.c2})`,
        }}>
          {opp.initials}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#F4EEF8' }}>{opp.name}</span>
      </div>

      {/* W/L record */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9D90B5' }}>
        {opp.wins}W – {opp.losses}L of {opp.met} games
      </div>
    </div>
  );
}

// ─── Per-game breakdown table ───
function GamesTable({ games }) {
  return (
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
        <span style={{ flex: 1 }}>Game</span>
        <span style={{ width: 46, textAlign: 'center' }}>Plays</span>
        <span style={{ width: 46, textAlign: 'center' }}>Wins</span>
        <span style={{ width: 46, textAlign: 'right' }}>Best</span>
      </div>

      {/* Game rows */}
      {games.map((g, i) => (
        <div key={g.name + i} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 16 }}>{g.icon}</span>
            <span style={{
              fontWeight: 700,
              fontSize: 13.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {g.name}
            </span>
          </div>
          <span style={{ width: 46, textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#C9B8E8' }}>
            {g.plays}
          </span>
          <span style={{ width: 46, textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#FFC24B' }}>
            {g.wins}
          </span>
          <span style={{ width: 46, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#34D9A0' }}>
            {g.best}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Recent result row ───
function RecentRow({ r }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '10px 13px',
      borderRadius: 15,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 18 }}>{r.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.game}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9D90B5' }}>{r.dateLabel}</div>
      </div>
      {/* Placement badge */}
      <div style={{
        padding: '4px 10px',
        borderRadius: 9,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 13,
        background: r.badgeBg,
        color: r.badgeTx,
      }}>
        {r.ord} of {r.total}
      </div>
    </div>
  );
}

// ─── Empty / new player state ───
function EmptyState({ vm }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9D90B5' }}>
      {/* Large avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <Avatar player={vm} size={72} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#F4EEF8', marginBottom: 6 }}>{vm.name}</div>
      <div style={{ fontSize: 13 }}>No games recorded yet.</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>Log a game night to see this player's stats.</div>
    </div>
  );
}

// ─── Main PlayerProfile screen ───
export default function PlayerProfile() {
  const { data, ui, setUi, now } = useStore();

  // Guard: need a playerId in ui state
  if (!ui.playerId) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#9D90B5' }}>
        No player selected.
      </div>
    );
  }

  const vm = buildPlayerDetail(data, ui.playerId, now, ui.profileFrom);

  return (
    <>
      {/* ─── Back link ─── */}
      <div
        onClick={() => setUi({ screen: ui.profileFrom || 'players', playerId: null })}
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
        <span style={{ fontSize: 16 }}>‹</span> {vm.backLabel}
      </div>

      {/* ─── Player header: avatar, name, Regular badge ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Avatar player={vm} size={60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 24,
            lineHeight: 1.05,
          }}>
            {vm.name}
          </div>
          {vm.regular && (
            <span style={{
              display: 'inline-block',
              marginTop: 5,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: 6,
              color: '#9D90B5',
              background: 'rgba(255,255,255,0.07)',
            }}>
              Regular
            </span>
          )}
        </div>
      </div>

      {/* ─── Empty/new player state ─── */}
      {vm.empty && <EmptyState vm={vm} />}

      {/* ─── Rich stats (only when player has plays) ─── */}
      {!vm.empty && (
        <>
          {/* ─── Record stat row: wins / win% / beaten / weighted wins / plays ─── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <StatChip value={vm.wins} label="Wins" />
            <StatChip value={`${vm.winPct}%`} label="Win %" />
            <StatChip value={vm.beat} label="Beaten" />
            <StatChip value={vm.wwinsStr} label="W.Wins" />
            <StatChip value={vm.plays} label="Plays" />
          </div>

          {/* ─── Favorite + Specialty game cards ─── */}
          {(vm.hasFav || vm.hasSpec) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {vm.hasFav && (
                <GameCard
                  label="Favorite"
                  icon={vm.fav.icon}
                  name={vm.fav.name}
                  plays={vm.fav.plays}
                  winPct={vm.fav.winPct}
                />
              )}
              {vm.hasSpec && vm.specialty !== vm.fav && (
                <GameCard
                  label="Specialty"
                  icon={vm.specialty.icon}
                  name={vm.specialty.name}
                  plays={vm.specialty.plays}
                  winPct={vm.specialty.winPct}
                />
              )}
            </div>
          )}

          {/* ─── Biggest win ─── */}
          {vm.hasBiggest && (
            <div style={{
              padding: '14px 16px',
              borderRadius: 16,
              marginBottom: 20,
              background: 'linear-gradient(120deg,rgba(255,194,75,0.12),rgba(255,94,98,0.05))',
              border: '1px solid rgba(255,194,75,0.22)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ fontSize: 26 }}>🏆</div>
              <div>
                <div style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: '#FFC24B',
                  marginBottom: 3,
                }}>
                  Biggest Win
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>
                  {vm.biggest.game}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9D90B5', marginTop: 2 }}>
                  Beat {vm.biggest.beat} · {vm.biggest.dateLabel}
                </div>
              </div>
            </div>
          )}

          {/* ─── Per-game breakdown table ─── */}
          {vm.games.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SectionHeader>Per-game breakdown</SectionHeader>
              <GamesTable games={vm.games} />
            </div>
          )}

          {/* ─── Records held ─── */}
          {vm.hasRecords && (
            <div style={{ marginBottom: 22 }}>
              <SectionHeader>Records held 🏅</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vm.records.map((r, i) => (
                  <div key={r.name + i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: 14,
                    background: 'rgba(255,194,75,0.07)',
                    border: '1px solid rgba(255,194,75,0.18)',
                  }}>
                    <span style={{ fontSize: 18 }}>{r.icon}</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{r.name}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 18,
                      color: '#FFC24B',
                    }}>
                      {r.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Nemesis / Victim rivalry cards (only when met ≥3) ─── */}
          {vm.hasRivalry && (
            <div style={{ marginBottom: 22 }}>
              <SectionHeader>Rivalry</SectionHeader>
              <div style={{ display: 'flex', gap: 10 }}>
                {vm.hasNemesis && <RivalryCard type="nemesis" opp={vm.nemesis} />}
                {vm.hasVictim && <RivalryCard type="victim" opp={vm.victim} />}
              </div>
            </div>
          )}

          {/* ─── Recent results ─── */}
          {vm.recent.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader>Recent results</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vm.recent.map((r, i) => (
                  <RecentRow key={r.game + r.dateLabel + i} r={r} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
