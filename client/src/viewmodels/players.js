// players.js — view-model for the Players List screen.
// Ported from prototype playersRoster (lines 1183-1188).
// All stat math comes from stats.js — no re-computation here.

import { currentStreak } from '../lib/stats.js';

// Common helpers
const initialsOf = (p) => (p.name || '?')[0].toUpperCase();

/**
 * buildPlayersRoster(data, now) → array of player rows sorted by wins desc.
 * Includes ALL players, even those with 0 plays.
 *
 * @param {object} data  - { players, games, plays }
 * @param {Date}   now   - current date (used for streak calculation)
 */
export function buildPlayersRoster(data, now) {
  // Aggregate wins and plays per player across all recorded plays
  const map = {};
  data.plays.forEach(p => p.parts.forEach(([pid, rank]) => {
    const e = map[pid] || (map[pid] = { wins: 0, plays: 0 });
    e.plays++;
    if (rank === 1) e.wins++;
  }));

  return data.players.map(p => {
    const e = map[p.id] || { wins: 0, plays: 0 };
    const winPct = e.plays ? Math.round(e.wins / e.plays * 100) : 0;
    const streak = currentStreak(data.plays, p.id);
    return {
      id: p.id,
      name: p.name,
      initials: initialsOf(p),
      c1: p.c1,
      c2: p.c2,
      regular: !!p.regular,
      wins: e.wins,
      plays: e.plays,
      winPct,
      streak,
      onFire: streak >= 2,
    };
  }).sort((a, b) => b.wins - a.wins || b.plays - a.plays);
}
