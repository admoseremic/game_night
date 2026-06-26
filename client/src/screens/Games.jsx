// Games.jsx — Games List screen.
// Ported from prototype template lines 218–258 (sc-if gamesListView).
// Uses buildGamesList() view-model; all stat math lives in viewmodels/games.js.

import { useState } from 'react';
import { useStore } from '../store/store.jsx';
import { buildGamesList } from '../viewmodels/games.js';
import TierBadge from '../components/TierBadge.jsx';

// ─── Empty state: no games match search or no games exist ───
function EmptyState({ hasSearch }) {
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

// ─── Single game row ───
// Ported from prototype lines 231–247.
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

// ─── Main Games screen ───
export default function Games() {
  const { data, ui, setUi, now } = useStore();
  // Local state for the search query (live filtering)
  const [query, setQuery] = useState('');

  const list = buildGamesList(data, query, now);
  const isEmpty = list.length === 0;

  return (
    <>
      {/* ─── Header: title + Add button ─── */}
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
        {/* Add game button — opens AddGame sheet */}
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

      {/* ─── Live search input ─── */}
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

      {/* ─── Game rows ─── */}
      {!isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(g => (
            <GameRow
              key={g.id}
              g={g}
              onClick={() => setUi({ screen: 'gameDetail', gameId: g.id })}
            />
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {isEmpty && <EmptyState hasSearch={query.trim().length > 0} />}
    </>
  );
}
