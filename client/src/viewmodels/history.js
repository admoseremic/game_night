// history.js — view-model for the Play History screen (Task 17).
// Ported from prototype historyDays (lines 1321–1333).
// Pure function — no side effects, no React imports.

import { fmtDateY, rel } from '../lib/format.js';

/**
 * buildHistory(data, now) → DayGroup[]
 *
 * Groups plays by calendar day, sorted reverse-chronologically.
 * Each DayGroup contains a list of game rows with winner/loser/score info.
 *
 * @param {object} data - { players, games, plays }
 * @param {Date}   now  - current date for relative time strings
 * @returns {Array} DayGroup[]
 */
export function buildHistory(data, now) {
  // Helpers to look up player/game by id
  const player = (id) => data.players.find(x => x.id === id);
  const gameOf = (id) => data.games.find(x => x.id === id);
  // Derive initials from name (no initials field on player model)
  const initialsOf = (p) => (p.name || '?')[0].toUpperCase();

  // Group plays by calendar day (using toDateString as the key)
  const byDay = {};
  [...data.plays]
    .sort((a, b) => new Date(b.d) - new Date(a.d))
    .forEach(pl => {
      const key = new Date(pl.d).toDateString();
      (byDay[key] || (byDay[key] = [])).push(pl);
    });

  // Sort day keys reverse-chronologically and map to DayGroup objects
  return Object.keys(byDay)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(k => {
      const plays = byDay[k];
      return {
        dateLabel: fmtDateY(plays[0].d),
        rel: rel(plays[0].d, now),
        count: plays.length,
        countLabel: plays.length + (plays.length === 1 ? ' game' : ' games'),
        games: plays.map(pl => {
          const g = gameOf(pl.g);
          // Sort parts by rank ascending — rank 1 is winner, highest rank is loser
          const sorted = [...pl.parts].sort((a, b) => a[1] - b[1]);
          const w = sorted[0];                    // winner (rank 1)
          const l = sorted[sorted.length - 1];    // loser (worst rank)
          const wp = player(w[0]);
          const lp = player(l[0]);
          return {
            id: pl.id,
            game: g.name,
            icon: g.icon,
            winner: wp.name,
            wInitials: initialsOf(wp),
            wc1: wp.c1,
            wc2: wp.c2,
            loser: lp.name,
            players: pl.parts.length,
            // Each score sits next to its own player ('' when that score wasn't recorded)
            wScoreStr: w[2] != null ? (' ' + w[2]) : '',
            lScoreStr: l[2] != null ? (' ' + l[2]) : '',
          };
        }),
      };
    });
}
