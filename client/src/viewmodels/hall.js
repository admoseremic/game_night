// hall.js — view-model for the Hall of Fame screen.
// Ported from prototype hallData (lines 1336–1382) + adds empty-data guards.
// All stat math comes from stats.js and format.js — no raw computation here.

import { leaderboard, recordFor } from '../lib/stats.js';
import { fmtDateY } from '../lib/format.js';

// --- helpers ---
const player = (data, id) => data.players.find(x => x.id === id);
const gameOf = (data, id) => data.games.find(x => x.id === id);
// Derive initials from player object's name field (first char, uppercase).
const initialsOf = (p) => (p && (p.name || '?')[0].toUpperCase()) || '?';

/**
 * buildHall(data, now) → hall view-model
 *
 * Returns { empty: true } when there is insufficient data to render the hall,
 * so the screen can show a friendly empty state without crashing.
 *
 * Otherwise returns:
 *   { empty, champ, milestones (always 4), rivalries, records }
 */
export function buildHall(data, now) {
  // Guard: need at least one play and one game to compute anything meaningful
  if (!data.plays.length || !data.games.length) return { empty: true };

  const all = data.plays;

  // --- GOAT: all-time weighted-wins leader ---
  const champRow = leaderboard(data, all, 'wwins')[0];

  // --- Milestone 1: Biggest win (most opponents beaten in a single play) ---
  let big = null;
  all.forEach(p => {
    const w = p.parts.find(x => x[1] === 1); // find the winner (rank 1)
    if (!w) return;
    const beaten = p.parts.length - 1; // everyone else is beaten
    if (!big || beaten > big.beaten) big = { beaten, pid: w[0], g: p.g, date: p.d };
  });

  // Guard: if no wins found at all (shouldn't happen if plays > 0, but be safe)
  if (!big) return { empty: true };

  // --- Milestone 2: Longest all-time consecutive win streak ---
  let streak = { len: 0, pid: null };
  data.players.forEach(pl => {
    // Get all plays this player participated in, chronologically
    const ps = all
      .filter(p => p.parts.some(x => x[0] === pl.id))
      .sort((a, b) => new Date(a.d) - new Date(b.d));
    let cur = 0, mx = 0;
    ps.forEach(p => {
      const me = p.parts.find(x => x[0] === pl.id);
      if (me[1] === 1) { cur++; if (cur > mx) mx = cur; } else cur = 0;
    });
    if (mx > streak.len) streak = { len: mx, pid: pl.id };
  });

  // --- Milestone 3: Most-played game ---
  const gc = {};
  all.forEach(p => gc[p.g] = (gc[p.g] || 0) + 1);
  const mpId = Object.entries(gc).sort((a, b) => b[1] - a[1])[0];
  const mpG = gameOf(data, mpId[0]);

  // --- Milestone 4: Oldest standing record (game-score record that hasn't been beaten longest) ---
  let oldest = null;
  data.games.forEach(g => {
    const r = recordFor(data, g.id);
    if (!r) return;
    if (!oldest || new Date(r.date) < new Date(oldest.date)) oldest = { ...r, g: g.id };
  });

  // --- Rivalries: pairs of players who have met ≥5 times, top 3 by closest head-to-head ---
  const ids = data.players.map(p => p.id);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      let m = 0, aw = 0, bw = 0;
      all.forEach(p => {
        const pa = p.parts.find(x => x[0] === a);
        const pb = p.parts.find(x => x[0] === b);
        if (pa && pb) {
          m++;
          if (pa[1] < pb[1]) aw++; else bw++;
        }
      });
      if (m >= 5) pairs.push({ a, b, m, aw, bw });
    }
  }
  // Sort by closest (lowest dominance ratio) first, then most meetings
  pairs.sort((x, y) =>
    (Math.abs(y.aw - y.bw) / y.m) - (Math.abs(x.aw - x.bw) / x.m) || y.m - x.m
  );
  const rivalries = pairs.slice(0, 3).map(r => {
    const A = player(data, r.a), B = player(data, r.b);
    const aLead = r.aw >= r.bw;
    return {
      aName: A.name,
      aInit: initialsOf(A),
      aC1: A.c1,
      aC2: A.c2,
      aWins: r.aw,
      bName: B.name,
      bInit: initialsOf(B),
      bC1: B.c1,
      bC2: B.c2,
      bWins: r.bw,
      meetings: r.m,
      leadName: (aLead ? A : B).name,
      aLead,
      aPct: Math.round(r.aw / r.m * 100),
      bPct: Math.round(r.bw / r.m * 100),
    };
  });

  // --- Trophy case: record score per game (only games that have scored plays) ---
  const records = data.games.map(g => {
    const r = recordFor(data, g.id);
    if (!r) return null;
    const p = player(data, r.pid);
    return {
      name: g.name,
      icon: g.icon,
      score: r.score,
      holder: p.name,
      initials: initialsOf(p),
      c1: p.c1,
      c2: p.c2,
    };
  }).filter(Boolean);

  // --- Assemble milestones (always exactly 4 entries) ---
  const bigP = player(data, big.pid);
  const bigG = gameOf(data, big.g);
  const stP = player(data, streak.pid);

  const milestones = [
    {
      icon: '⚔️',
      tint: '#FF6FA5',
      label: 'Biggest win',
      value: bigP.name + ' beat ' + big.beaten,
      sub: bigG.name + ' · ' + fmtDateY(big.date),
    },
    {
      icon: '🔥',
      tint: '#FF8A3D',
      label: 'Longest win streak',
      value: (stP ? stP.name : '—') + ' · ' + streak.len + ' in a row',
      sub: 'All-time record',
    },
    {
      icon: '🎯',
      tint: '#34D9A0',
      label: 'Most-played game',
      value: mpG.name,
      sub: mpG.icon + ' ' + mpId[1] + ' nights logged',
    },
    oldest
      ? {
          icon: '⏳',
          tint: '#9B6CFF',
          label: 'Longest-standing record',
          value: player(data, oldest.pid).name + ' · ' + oldest.score + ' at ' + gameOf(data, oldest.g).name,
          sub: 'Untouched for ' + Math.round((now - new Date(oldest.date)) / (864e5 * 30)) + ' months',
        }
      : {
          icon: '⏳',
          tint: '#9B6CFF',
          label: 'Longest-standing record',
          value: '—',
          sub: 'No scored records yet',
        },
  ];

  return {
    empty: false,
    champ: {
      name: champRow.name,
      initials: champRow.initials, // leaderboard() derives this from the player name
      c1: champRow.c1,
      c2: champRow.c2,
      wins: champRow.wins,
      wwinsStr: champRow.wwinsStr,
      beat: champRow.beat,
    },
    milestones,
    rivalries,
    records,
  };
}
