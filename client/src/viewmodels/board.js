// board.js — view-model for the Board (Leaderboard) screen.
// Ported from prototype renderVals() lines 1429–1496.
// All stat math comes from stats.js and format.js — no re-computation here.

import { periodPlays, leaderboard, computePick } from '../lib/stats.js';
import { medalBg, medalTx, fmtDate } from '../lib/format.js';

const periodLabels = {
  month: 'This Month',
  prevMonth: 'Last Month',
  ytd: 'Year to Date',
  lastYear: 'Last Year',
  all: 'All Time',
  // Note: 'custom' is intentionally omitted — the custom branch returns a formatted
  // date-range string directly (e.g. "Jun 10–Jun 24") before this map is consulted.
};

const sortLabels = {
  wins: 'Wins',
  winPct: 'Win %',
  plays: 'Plays',
  beat: 'Beaten',
  wwins: 'W.Wins',
};

// Format a single leaderboard entry value for a given sort key (ported from prototype fmtVal, line 1488).
function fmtVal(e, key) {
  if (key === 'wwins') return e.wwinsStr;
  if (key === 'winPct') return e.winPct + '%';
  if (key === 'beat') return e.beat;
  if (key === 'plays') return e.plays;
  return e.wins;
}

/**
 * buildBoard(data, ui, now) → { champ, rows, empty, periodLabel, sortLabel, pick }
 *
 * @param {object} data  - { players, games, plays }
 * @param {object} ui    - { period, sorts, custom:{start,end}, absent }
 * @param {Date}   now   - current date (used for period filtering)
 */
export function buildBoard(data, ui, now) {
  // Filter plays to the selected period
  const plays = periodPlays(data.plays, ui.period, now, ui.custom);

  // Build leaderboard sorted by primary (and optional secondary) key
  const lb = leaderboard(data, plays, ui.sorts[0], ui.sorts[1]); // sorts[1] may be undefined

  const key = ui.sorts[0];

  // Map each leaderboard entry to a display row with medal styling + active sort cell
  const rows = lb.map(r => ({
    ...r,
    medalBg: medalBg(r.rank),
    medalTx: medalTx(r.rank),
    // Single cell for the active sort key (displayed large/gold in the row)
    cell: {
      value: fmtVal(r, key),
      label: sortLabels[key],
      color: '#FFC24B',
    },
  }));

  // Period label — custom range shows "Jun 10–Jun 24" style, others use the map
  const periodLabel =
    ui.period === 'custom'
      ? fmtDate(ui.custom.start + 'T00:00:00') + '–' + fmtDate(ui.custom.end + 'T00:00:00')
      : periodLabels[ui.period];

  return {
    champ: rows[0] || null,          // top-ranked player (or null if empty)
    rows,
    empty: rows.length === 0,
    periodLabel,
    sortLabel: sortLabels[key],
    // Pick = most-recent play overall (NOT period-filtered), ported from prototype
    pick: computePick(data, data.plays, ui.absent),
  };
}
