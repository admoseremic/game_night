// games.js — view-models for the Games tab.
//   buildGamesList    → "All Games" shelf (full catalog, all-time stats, alphabetical)
//   buildGamesSummary → "Summary" view (period-scoped activity report)
// PURE: no side effects, no setUi. All stat math via stats.js / format.js helpers.

import { recordFor, periodPlays, recordFromPlays } from '../lib/stats.js';
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
    // Sort alphabetically by name (case-insensitive)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// buildGamesSummary(data, ui, now) — the period-scoped "Summary" view.
// A played-games-only activity report for the shared period window: for each game played
// in the window, how many times, the period+direction-aware record, and EVERY winner.
// Pure function of plays + games + the shared `period`/`custom` ui state.
export function buildGamesSummary(data, ui, now) {
  const player = (id) => data.players.find(p => p.id === id);
  // Plays inside the active window (same period state the Leaderboard uses).
  const ps = periodPlays(data.plays, ui.period, now, ui.custom);

  const rows = [];
  for (const g of data.games) {
    // Plays of this game within the period — skip games with none (it's a report, not the catalog).
    const gp = ps.filter(p => p.g === g.id);
    if (gp.length === 0) continue;

    // Win counts per player + each player's most-recent win date (for the tiebreak).
    const wc = {}; // pid -> { wins, lastWin: ISO }
    for (const play of gp) {
      const w = play.parts.find(x => x[1] === 1); // rank 1 = winner
      if (!w) continue;                            // guard: a play with no rank-1 contributes no chip
      const pid = w[0];
      const cur = wc[pid] || (wc[pid] = { wins: 0, lastWin: '' });
      cur.wins += 1;
      if (play.d > cur.lastWin) cur.lastWin = play.d; // ISO strings compare lexicographically
    }
    // ALL winners (no truncation), most wins first; ties broken by most-recent win.
    const winners = Object.entries(wc)
      .map(([pid, v]) => ({ pid, ...v }))
      .sort((a, b) => (b.wins - a.wins) || (b.lastWin < a.lastWin ? -1 : b.lastWin > a.lastWin ? 1 : 0))
      .map(({ pid, wins }) => {
        const p = player(pid);
        return {
          name: p?.name ?? '?',
          initials: (p?.name ?? '?')[0].toUpperCase(),
          c1: p?.c1 ?? '#555',
          c2: p?.c2 ?? '#333',
          wins,
        };
      });

    // Period-scoped, direction-aware record (null if no scores were entered in the window).
    const rec = recordFromPlays(data, g.id, gp);
    // Most recent play date in the window.
    const last = gp.map(p => p.d).sort().slice(-1)[0];

    rows.push({
      id: g.id,
      name: g.name,
      icon: g.icon,
      tier: g.tier,
      tierBg: tierBg(g.tier),
      tierTx: tierTx(g.tier),
      plays: gp.length,
      playsLabel: gp.length === 1 ? 'play' : 'plays',
      lastRel: rel(last, now),
      winners,
      recScore: rec ? rec.score : null,
      recLabel: rec ? (rec.score + ' best') : 'no scores',
    });
  }
  // Most-played in the period first; alphabetical tiebreak keeps the order stable.
  return rows.sort((a, b) => (b.plays - a.plays) || a.name.localeCompare(b.name));
}
