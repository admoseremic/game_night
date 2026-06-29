// Players.jsx — Players List screen.
// Ported from prototype template lines 582–600.
// Uses buildPlayersRoster() view-model; all stat math lives in viewmodels/players.js.

import { useStore } from '../store/store.jsx';
import { buildPlayersRoster } from '../viewmodels/players.js';
import Avatar from '../components/Avatar.jsx';

// ─── Single player row ───
// Shows avatar, name, Regular badge, stat line, and fire badge when on streak.
// hideRegularBadge suppresses the "Regular" pill when the row already lives under a Regulars section.
function PlayerRow({ p, onClick, hideRegularBadge }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: 13,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Player avatar tile */}
      <Avatar player={p} size={46} />

      {/* Name + badges + stat line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{
            fontWeight: 700,
            fontSize: 15,
            color: '#F4EEF8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {p.name}
          </span>

          {/* Regular player badge */}
          {p.regular && !hideRegularBadge && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 6,
              color: '#9D90B5',
              background: 'rgba(255,255,255,0.07)',
            }}>
              Regular
            </span>
          )}

          {/* Fire badge when on a win streak ≥2 */}
          {p.onFire && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.4px',
              padding: '2px 7px',
              borderRadius: 6,
              color: '#FF8A3D',
              background: 'rgba(255,138,61,0.16)',
            }}>
              🔥 {p.streak}
            </span>
          )}
        </div>

        {/* Stat line: wins · plays · win% */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 3 }}>
          {p.wins} wins · {p.plays} plays · {p.winPct}% win
        </div>
      </div>

      {/* Chevron */}
      <span style={{ fontSize: 16, color: '#4A4159', lineHeight: 1, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── Main Players screen ───
export default function Players() {
  const { data, ui, setUi, now } = useStore();
  const roster = buildPlayersRoster(data, now);

  // Split the roster so regulars get their own section up top, the rest below
  const regulars = roster.filter(p => p.regular);
  const others = roster.filter(p => !p.regular);
  const openProfile = (id) => setUi({ screen: 'playerDetail', playerId: id, profileFrom: 'players' });

  // Shared uppercase section-header style (color overridden per section)
  const sectionLabel = {
    fontSize: 11, fontWeight: 800, letterSpacing: '.6px',
    textTransform: 'uppercase', margin: '0 2px 9px',
  };

  return (
    <>
      {/* ─── Header: title + Add Player button ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        margin: '4px 2px 16px',
      }}>
        <div>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#9B6CFF',
          }}>
            The Crew
          </span>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 25,
            lineHeight: 1,
            marginTop: 1,
          }}>
            Players
          </div>
        </div>

        {/* Add player button — opens AddPlayer sheet */}
        <div
          onClick={() => setUi({ addPlayerOpen: true })}
          style={{
            padding: '9px 15px',
            borderRadius: 13,
            fontSize: 13,
            fontWeight: 800,
            color: '#150F1F',
            background: 'linear-gradient(135deg,#9B6CFF,#FF5E62)',
            boxShadow: '0 6px 16px rgba(155,108,255,0.3)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          ＋ Add
        </div>
      </div>

      {/* ─── Player rows — Regulars section up top, everyone else below ─── */}
      {roster.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Regulars section (only when there are regulars) */}
          {regulars.length > 0 && (
            <div>
              <div style={{ ...sectionLabel, color: '#FFC24B' }}>★ Regulars</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {regulars.map(p => (
                  <PlayerRow key={p.id} p={p} hideRegularBadge onClick={() => openProfile(p.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Everyone else — header shown only when a Regulars section sits above it */}
          {others.length > 0 && (
            <div>
              {regulars.length > 0 && (
                <div style={{ ...sectionLabel, color: '#9D90B5' }}>Everyone else</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {others.map(p => (
                  <PlayerRow key={p.id} p={p} onClick={() => openProfile(p.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Empty state ─── */
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9D90B5' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>No players yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add players to start tracking stats.</div>
        </div>
      )}
    </>
  );
}
