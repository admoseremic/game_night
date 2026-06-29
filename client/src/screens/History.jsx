// History.jsx — Play History screen (Task 17).
// Ported from prototype isHistory template (lines 368–455).
// Shows plays grouped by calendar night, reverse-chronological,
// with winner/loser/score per game row plus edit and delete controls.

import { useStore } from '../store/store.jsx';
import { buildHistory } from '../viewmodels/history.js';
import Avatar from '../components/Avatar.jsx';

// Single game row inside a day group.
// Shows: icon, game name, winner (with avatar), loser, score, edit+delete controls.
function GameRow({ row, onEdit, onDelete }) {
  const winner = { name: row.winner, c1: row.wc1, c2: row.wc2 };

  return (
    <div
      onClick={onEdit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 13px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Game icon tile */}
      <div style={{
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 11,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        background: 'linear-gradient(140deg,#2E2440,#221A30)',
      }}>
        {row.icon}
      </div>

      {/* Game name + winner/loser line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 14,
          color: '#F4EEF8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {row.game}
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#9D90B5',
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          🥇 {row.winner}{row.wScoreStr}
          {row.players > 1 && <> · 🔻 {row.loser}{row.lScoreStr}</>}
        </div>
      </div>

      {/* Edit button — opens LogPlay in edit mode */}
      <div
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14,
        }}
      >
        ✏️
      </div>

      {/* Delete button — opens DeleteConfirm sheet */}
      <div
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,77,109,0.12)',
          border: '1px solid rgba(255,77,109,0.22)',
          fontSize: 15,
        }}
      >
        🗑️
      </div>
    </div>
  );
}

// Empty state when no plays have been logged at all.
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9D90B5' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>No plays logged yet</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Log a game night to build the receipt.</div>
    </div>
  );
}

// Main History screen component.
export default function History() {
  const { data, ui, setUi, now } = useStore();

  // Build the grouped history view-model — pure, no math in JSX
  const days = buildHistory(data, now);

  return (
    <>
      {/* ─── Back link — navigates to Leaderboard (board screen) ─── */}
      <div
        onClick={() => setUi({ screen: 'board' })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 14,
          fontSize: 13,
          fontWeight: 700,
          color: '#9D90B5',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16 }}>‹</span> Leaderboard
      </div>

      {/* ─── Header ─── */}
      <div style={{ margin: '2px 2px 18px' }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#FF8A3D',
        }}>
          The Receipt
        </span>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 25,
          lineHeight: 1,
          marginTop: 1,
        }}>
          Play History
        </div>
      </div>

      {/* ─── Empty state ─── */}
      {days.length === 0 && <EmptyState />}

      {/* ─── Day groups ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {days.map(day => (
          <div key={day.dateLabel + day.rel}>
            {/* Date header row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '0 2px 10px',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: '#F4EEF8',
              }}>
                {day.dateLabel}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5' }}>
                {day.countLabel} · {day.rel}
              </span>
            </div>

            {/* Game rows for this day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {day.games.map(row => (
                <GameRow
                  key={row.id}
                  row={row}
                  // Edit: open LogPlay pre-filled with this play
                  onEdit={() => setUi({ logOpen: true, editPlayId: row.id })}
                  // Delete: open DeleteConfirm sheet
                  onDelete={() => setUi({ deletePlayId: row.id })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
