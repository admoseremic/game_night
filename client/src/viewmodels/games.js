// games.js — view-model for the Games List screen.
// Ported from prototype gamesList() lines 1216–1228.
// PURE: no side effects, no setUi. All stat math via stats.js / format.js helpers.

import { recordFor } from '../lib/stats.js';
import { tierBg, tierTx, rel } from '../lib/format.js';

// Derive initials from a player object (no initials field on model).
const initialsOf = (p) => (p.name || '?')[0].toUpperCase();

export function buildGamesList(data, query, now) {
  const q = (query || '').trim().toLowerCase();
  // Helper to look up a player by id
  const player = (id) => data.players.find(p => p.id === id);

  return data.games.map(g => {
    // All plays for this game
    const ps = data.plays.filter(p => p.g === g.id);

    // Win counts by player id
    const wc = {};
    ps.forEach(p => {
      const w = p.parts.find(x => x[1] === 1);
      if (w) wc[w[0]] = (wc[w[0]] || 0) + 1;
    });
    // Player with the most wins for this game
    const topW = Object.entries(wc).sort((a, b) => b[1] - a[1])[0];

    // Most recent play date
    const last = ps.map(p => p.d).sort().slice(-1)[0];

    // Record holder (direction-aware via recordFor)
    const rec = recordFor(data, g.id);
    const rp = rec ? player(rec.pid) : null;

    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      tier: g.tier,
      tierBg: tierBg(g.tier),
      tierTx: tierTx(g.tier),
      plays: ps.length,
      lastRel: last ? rel(last, now) : 'never',
      topWinner: topW ? player(topW[0])?.name ?? null : null,
      recScore: rec ? rec.score : null,
      // Initials and gradient colors for the record holder avatar
      recHolder: rp ? initialsOf(rp) : null,
      recC1: rp ? rp.c1 : '#555',
      recC2: rp ? rp.c2 : '#333',
    };
  })
    // Live search filter — match game name (case-insensitive)
    .filter(g => !q || g.name.toLowerCase().includes(q))
    // Sort by most played first
    .sort((a, b) => b.plays - a.plays);
}
