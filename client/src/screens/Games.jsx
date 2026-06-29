// Games.jsx — Games tab.
// Two views behind a segmented toggle (ui.gamesMode):
//   'summary' (default) — period-scoped activity report (buildGamesSummary)
//   'all'               — the full catalog / shelf (buildGamesList)
// All stat math lives in viewmodels/games.js; this file is presentation only.

import { useState } from 'react';
import { useStore } from '../store/store.jsx';
import { buildGamesList, buildGamesSummary } from '../viewmodels/games.js';
import { fmtDate } from '../lib/format.js';
import TierBadge from '../components/TierBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import Pill from '../components/Pill.jsx';
// Period + Custom sheets — the Summary view shares the Leaderboard's period state, so the
// same sheets must mount here (they live in Board.jsx for the Leaderboard, not globally).
import Period from '../sheets/Period.jsx';
import Custom from '../sheets/Custom.jsx';

// Human label for the shared period state (mirrors the Leaderboard pill).
const PERIOD_LABELS = {
  month: 'This Month',
  prevMonth: 'Last Month',
  ytd: 'Year to Date',
  lastYear: 'Last Year',
  all: 'All Time',
};
function periodLabel(ui) {
  if (ui.period === 'custom') {
    return fmtDate(ui.custom.start + 'T00:00:00') + '–' + fmtDate(ui.custom.end + 'T00:00:00');
  }
  return PERIOD_LABELS[ui.period] || 'This Month';
}

// ─── Segmented toggle: [ Summary | All Games ] ───
function Segmented({ mode, onChange }) {
  const seg = (key, label) => {
    const active = mode === key;
    return (
      <div
        onClick={() => onChange(key)}
        style={{
          flex: 1,
          textAlign: 'center',
          padding: '9px 0',
          borderRadius: 11,
          fontSize: 13,
          fontWeight: 800,
          // Active segment: gold fill + dark text. Inactive: transparent + muted text.
          color: active ? '#150F1F' : '#9D90B5',
          background: active ? '#FFC24B' : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color .15s, background .15s',
        }}
      >
        {label}
      </div>
    );
  };
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: 13,
    }}>
      {seg('summary', 'Summary')}
      {seg('all', 'All Games')}
    </div>
  );
}

// ─── Summary view: winner chip (avatar + name + ×wins) ───
function WinnerChip({ w }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px 4px 4px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <Avatar player={w} size={20} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#F4EEF8', whiteSpace: 'nowrap' }}>{w.name}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#9D90B5' }}>×{w.wins}</span>
    </div>
  );
}

// ─── Summary view: one game card (period-scoped stats) ───
function SummaryCard({ g, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 14,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Top row: icon · name/tier + record sub-line · big plays count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        {/* Game icon tile */}
        <div style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          background: 'linear-gradient(140deg,#2E2440,#201830)',
        }}>
          {g.icon}
        </div>

        {/* Name + tier + record/last sub-line */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              fontWeight: 700,
              fontSize: 15,
              color: '#F4EEF8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {g.name}
            </span>
            <TierBadge tier={g.tier} />
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 3 }}>
            🏅 {g.recLabel} · last {g.lastRel}
          </div>
        </div>

        {/* Plays count — the headline number (big orange) */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 30,
            color: '#FF8A3D',
            lineHeight: 1,
          }}>
            {g.plays}
          </div>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            color: '#6E6483',
            marginTop: 3,
          }}>
            {g.playsLabel}
          </div>
        </div>
      </div>

      {/* Hairline divider before the "Won by" row */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 0 11px' }} />

      {/* "Won by" — every winner in the period as a chip (no truncation) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#6E6483',
        }}>
          Won by
        </span>
        {g.winners.map(w => <WinnerChip key={w.name} w={w} />)}
      </div>
    </div>
  );
}

// ─── All Games view: single shelf row (full catalog, all-time stats) ───
function GameRow({ g, onClick }) {
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
      {/* Game icon tile */}
      <div style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        background: 'linear-gradient(140deg,#2E2440,#201830)',
      }}>
        {g.icon}
      </div>

      {/* Name + tier + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            fontWeight: 700,
            fontSize: 15,
            color: '#F4EEF8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {g.name}
          </span>
          <TierBadge tier={g.tier} />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 3 }}>
          {g.plays} plays · last {g.lastRel}
        </div>
      </div>

      {/* Record score badge + chevron */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {g.recScore != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11 }}>🏅</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 16,
              color: '#FFC24B',
              lineHeight: 1,
            }}>
              {g.recScore}
            </span>
          </div>
        )}
        <span style={{ fontSize: 16, color: '#4A4159', lineHeight: 1 }}>›</span>
      </div>
    </div>
  );
}

// ─── Empty states ───
// Summary: no games played in the selected window.
function SummaryEmpty() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9D90B5' }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>📭</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>No games played this period</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Try a wider window, or log a night.</div>
    </div>
  );
}
// All Games: no search match, or no games on the shelf at all.
function ShelfEmpty({ hasSearch }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9D90B5' }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>{hasSearch ? '🔍' : '🎲'}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>
        {hasSearch ? 'No games match' : 'No games yet'}
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        {hasSearch ? 'Try a different name, or add it to the shelf.' : 'Add a game to get started.'}
      </div>
    </div>
  );
}

// ─── Main Games screen ───
export default function Games() {
  const { data, ui, setUi, now } = useStore();
  // Local state for the All Games search query (live filtering)
  const [query, setQuery] = useState('');

  const mode = ui.gamesMode || 'summary';
  const openDetail = (id) => setUi({ screen: 'gameDetail', gameId: id, gameFrom: 'games' });

  // Build whichever view is active (both are pure functions of data + ui).
  const summary = mode === 'summary' ? buildGamesSummary(data, ui, now) : [];
  const list = mode === 'all' ? buildGamesList(data, query, now) : [];

  return (
    <>
      {/* ─── Header: title + Add button (applies to both views) ─── */}
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
            color: '#FF8A3D',
          }}>
            The Shelf
          </span>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 25,
            lineHeight: 1,
            marginTop: 1,
          }}>
            Games
          </div>
        </div>
        {/* Add game button — opens AddGame sheet; writes to the shared catalog */}
        <div
          onClick={() => setUi({ addGameOpen: true })}
          style={{
            padding: '9px 15px',
            borderRadius: 13,
            fontSize: 13,
            fontWeight: 800,
            color: '#150F1F',
            background: 'linear-gradient(135deg,#FF8A3D,#FF5E62)',
            boxShadow: '0 6px 16px rgba(255,94,98,0.3)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          ＋ Add
        </div>
      </div>

      {/* ─── Segmented toggle ─── */}
      <Segmented mode={mode} onChange={(m) => setUi({ gamesMode: m })} />

      {/* ─── Summary view ─── */}
      {mode === 'summary' && (
        <>
          {/* Period pill — shares the Leaderboard's period state */}
          <div style={{ display: 'flex', marginBottom: 13 }}>
            <Pill
              label="Period"
              value={periodLabel(ui)}
              onClick={() => setUi({ periodSheetOpen: true })}
            />
          </div>

          {summary.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.map(g => (
                <SummaryCard key={g.id} g={g} onClick={() => openDetail(g.id)} />
              ))}
            </div>
          ) : (
            <SummaryEmpty />
          )}
        </>
      )}

      {/* ─── All Games view ─── */}
      {mode === 'all' && (
        <>
          {/* Live search input */}
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍 Search games…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 15px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#F4EEF8',
              fontSize: 15,
              fontFamily: 'inherit',
              outline: 'none',
              marginBottom: 13,
            }}
          />

          {list.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.map(g => (
                <GameRow key={g.id} g={g} onClick={() => openDetail(g.id)} />
              ))}
            </div>
          ) : (
            <ShelfEmpty hasSearch={query.trim().length > 0} />
          )}
        </>
      )}

      {/* ─── Shared bottom sheets (Summary's Period pill opens these) ─── */}
      <Period />
      <Custom />
    </>
  );
}
