// Board.jsx — Home/Leaderboard screen.
// Ported from prototype board template (lines 143–213) + renderVals (lines 1429–1496).
// Uses buildBoard() view-model; all stat math lives in viewmodels/board.js.

import { useStore } from '../store/store.jsx';
import { buildBoard } from '../viewmodels/board.js';
import Avatar from '../components/Avatar.jsx';
import MedalChip from '../components/MedalChip.jsx';
import Pill from '../components/Pill.jsx';

// The four bottom sheets — each is independently gated by a ui flag
import Period from '../sheets/Period.jsx';
import Sort from '../sheets/Sort.jsx';
import Explain from '../sheets/Explain.jsx';
import Custom from '../sheets/Custom.jsx';

// Champion hero card at the top of the board.
// Shows the #1 player's avatar, name, and their active sort stat.
function ChampHero({ champ }) {
  if (!champ) return null;

  // Build a player-like object for Avatar (needs .name, .c1, .c2)
  const player = { name: champ.name, c1: champ.c1, c2: champ.c2 };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 20,
      // Champion row gets the gold gradient treatment (ported from prototype rowBg/rowBd for rank===1)
      background: 'linear-gradient(120deg,rgba(255,194,75,0.18),rgba(255,138,61,0.08))',
      border: '1px solid rgba(255,194,75,0.35)',
      marginBottom: 10,
    }}>
      {/* Medal chip (rank 1 = gold) */}
      <div style={{ width: 30, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <MedalChip rank={1} />
      </div>

      {/* Avatar */}
      <Avatar player={player} size={52} />

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--text-primary)',
          lineHeight: 1.1,
        }}>
          {champ.name}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
          {champ.plays} plays · {champ.winPct}% win
        </div>
      </div>

      {/* Active sort stat (large, gold) */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: '#FFC24B',
          lineHeight: 1,
        }}>
          {champ.cell.value}
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          marginTop: 3,
        }}>
          {champ.cell.label}
        </div>
      </div>
    </div>
  );
}

// Single ranked leaderboard row (rank 2+).
// Ported from prototype board row template (lines 188–206).
function BoardRow({ row, onClick }) {
  const player = { name: row.name, c1: row.c1, c2: row.c2 };
  const isTop3 = row.rank <= 3;

  // Top-3 rows get a subtle tinted background; others get the neutral card style
  const rowBg = row.rank === 1
    ? 'linear-gradient(120deg,rgba(255,194,75,0.14),rgba(255,138,61,0.06))'
    : 'rgba(255,255,255,0.035)';
  const rowBd = row.rank === 1
    ? 'rgba(255,194,75,0.32)'
    : 'rgba(255,255,255,0.06)';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px 11px 11px',
        borderRadius: 18,
        background: rowBg,
        border: `1px solid ${rowBd}`,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Rank medal chip */}
      <div style={{ width: 30, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <MedalChip rank={row.rank} />
      </div>

      {/* Player avatar */}
      <Avatar player={player} size={42} />

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>{row.name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 1 }}>
          {row.plays} plays · {row.winPct}% win
        </div>
      </div>

      {/* Active sort stat (large, gold) — ported from prototype r.cells (line 1491) */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          color: row.cell.color,
          lineHeight: 1,
        }}>
          {row.cell.value}
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          color: '#6E6483',
          marginTop: 3,
        }}>
          {row.cell.label}
        </div>
      </div>
    </div>
  );
}

// Empty state (ported from prototype lines 209–215)
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9D90B5' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🎲</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>No games this period</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Log a night to crown a champion.</div>
    </div>
  );
}

// Main Board screen component
export default function Board() {
  const { data, ui, setUi, now } = useStore();

  // Build view-model — all stats computed here, no math in JSX
  const vm = buildBoard(data, ui, now);

  return (
    <>
      {/* ─── Header: title + action buttons ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '4px 2px 14px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--orange)',
          }}>
            Standings
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 25,
            lineHeight: 1,
          }}>
            Leaderboard
          </span>
        </div>

        {/* Action buttons — ? opens Explain sheet */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            onClick={() => setUi({ explainOpen: true })}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 800,
              fontSize: 15,
              color: '#C9B8E8',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            ?
          </div>
        </div>
      </div>

      {/* ─── Period + Sort pills ─── (ported from prototype lines 168–183) */}
      <div style={{ display: 'flex', gap: 8, margin: '0 2px 14px' }}>
        <Pill
          label="Period"
          value={vm.periodLabel}
          onClick={() => setUi({ periodSheetOpen: true })}
        />
        {/* Sort pill: value shown in gold to indicate it's the active metric */}
        <div
          onClick={() => setUi({ sortSheetOpen: true })}
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
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--text-faint)',
            }}>
              Sort by
            </span>
            <span style={{
              fontSize: '13.5px',
              fontWeight: 700,
              // Sort value shown in gold (ported from prototype line 179)
              color: '#FFC24B',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {vm.sortLabel}
            </span>
          </div>
          <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: 10 }}>▼</span>
        </div>
      </div>

      {/* ─── Champion hero (rank 1 player, shown above the list) ─── */}
      {!vm.empty && <ChampHero champ={vm.champ} />}

      {/* ─── Leaderboard rows (rank 2+) ─── */}
      {!vm.empty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {vm.rows.slice(1).map(row => (
            <BoardRow
              key={row.pid}
              row={row}
              onClick={() => setUi({ screen: 'playerDetail', playerId: row.pid, profileFrom: 'board' })}
            />
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {vm.empty && <EmptyState />}

      {/* ─── Bottom sheets (controlled by ui flags) ─── */}
      <Period />
      <Sort />
      <Explain />
      <Custom />
    </>
  );
}
