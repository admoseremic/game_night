// hall.js — view-model for the Hall of Fame screen.
// Ported EXACTLY from prototype hallData() lines 1413–1486 in Game Night.dc.html.
// Adds period filter (hallPeriod: 'all'|'last2'|'thisYear'), Best Win % prize card,
// trophy cap/expander, and rival MINM=3 in thisYear mode.

import { leaderboard, recordFromPlays } from '../lib/stats.js';

// --- helpers ---
const player = (data, id) => data.players.find(x => x.id === id);
const gameOf = (data, id) => data.games.find(x => x.id === id);
// Derive initials from player's name (first char, uppercase). No .initials field on player model.
const initialsOf = (p) => (p && (p.name || '?')[0].toUpperCase()) || '?';

/**
 * buildHall(data, hallPeriod, now, recordsExpanded) → hall view-model
 *
 * hallPeriod: 'all' | 'last2' | 'thisYear'  (undefined → 'all')
 * recordsExpanded: boolean (undefined → false)
 *
 * Returns { hasData:false, ... } when the period has no plays.
 * Returns full hall shape when data exists (see return statement below).
 */
export function buildHall(data, hallPeriod, now, recordsExpanded) {
  // Normalize optional args
  const hp = hallPeriod || 'all';

  // --- Period filter ---
  const all = data.plays.filter(p => {
    const y = new Date(p.d).getFullYear();
    if (hp === 'thisYear') return y === now.getFullYear();
    if (hp === 'last2') return y >= now.getFullYear() - 1;
    return true; // 'all'
  });

  // Empty state returned when no plays exist in the selected window
  if (!all.length) return {
    hasData: false,
    milestones: [],
    rivalries: [],
    records: [],
    champ: { name: '—', initials: '?', c1: '#555', c2: '#333', wins: 0, winPct: 0, plays: 0 },
    hasWinPct: false,
    winPct: null,
    recordsTotal: 0,
    hasRivalries: false,
    recordsCapped: false,
    recordsExpanded: false,
  };

  // --- Leaderboard sorted by wins ---
  const lb = leaderboard(data, all, 'wins');
  const champRow = lb[0];

  // --- Best win % (min 3 plays to qualify) ---
  const wpLb = lb.filter(e => e.plays >= 3).sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  const wp = wpLb[0] || null;

  // --- Biggest blowout: most dominant win between 1st and 2nd place, scored plays only.
  // Ranked by PERCENTAGE margin so low-scoring games aren't unfairly beaten by high-scoring
  // ones (a 10–2 wipeout should outrank a 120–73 grind). We normalize the raw point gap by
  // the larger score on the board: for high-dir games that's the winner, for low-dir golf
  // games that's the loser — either way it's the natural 0..100% denominator and never
  // divides by zero. The DISPLAYED value still uses the absolute point margin, since people
  // relate to "won by 40 points" more than "won by 67%". ---
  let blow = null;
  all.forEach(p => {
    const g = gameOf(data, p.g);
    const sorted = [...p.parts].filter(x => x[2] != null).sort((a, b) =>
      g.dir === 'high' ? b[2] - a[2] : a[2] - b[2]
    );
    if (sorted.length < 2) return;
    const margin = Math.abs(sorted[0][2] - sorted[1][2]);
    const top = Math.max(sorted[0][2], sorted[1][2]); // larger raw score = the leading/top score
    const pct = top > 0 ? margin / top : 0;           // bounded 0..1; guard divide-by-zero
    if (!blow || pct > blow.pct) blow = { margin, pct, pid: sorted[0][0], g: p.g, date: p.d, score: sorted[0][2], runner: sorted[1][2] };
  });

  // --- Longest win streak in period ---
  let streak = { len: 0, pid: null };
  data.players.forEach(pl => {
    const ps = all.filter(p => p.parts.some(x => x[0] === pl.id)).sort((a, b) => new Date(a.d) - new Date(b.d));
    let cur = 0, mx = 0;
    ps.forEach(p => {
      const me = p.parts.find(x => x[0] === pl.id);
      if (me[1] === 1) { cur++; if (cur > mx) mx = cur; } else cur = 0;
    });
    if (mx > streak.len) streak = { len: mx, pid: pl.id };
  });
  const stP = streak.pid ? player(data, streak.pid) : null;

  // --- Most-played game ---
  const gc = {};
  all.forEach(p => gc[p.g] = (gc[p.g] || 0) + 1);
  const mpId = Object.entries(gc).sort((a, b) => b[1] - a[1])[0];
  const mpG = gameOf(data, mpId[0]);

  // --- Oldest still-standing record within the period ---
  let oldest = null;
  data.games.forEach(g => {
    const r = recordFromPlays(data, g.id, all);
    if (!r) return;
    if (!oldest || new Date(r.date) < new Date(oldest.date)) oldest = { ...r, g: g.id };
  });
  const oldP = oldest ? player(data, oldest.pid) : null;
  const oldG = oldest ? gameOf(data, oldest.g) : null;
  const ageMo = oldest ? Math.round((now - new Date(oldest.date)) / (864e5 * 30)) : 0;

  // --- Rivalries: pairs of players who've met ≥ MINM times, top 3 by most meetings ---
  const ids = data.players.map(p => p.id);
  const pairs = [];
  // Threshold: lower (3) for thisYear to account for fewer plays available
  const MINM = hp === 'thisYear' ? 3 : 5;
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
      if (m >= MINM) pairs.push({ a, b, m, aw, bw, close: Math.abs(aw - bw) / m });
    }
  }
  // Sort by most meetings first, then closeness of record (ties broken by tightest rivalry)
  pairs.sort((x, y) => (y.m - x.m) || (x.close - y.close));
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

  // --- Trophy case: record score per game, sorted by most-played, capped at 6 unless expanded ---
  let recAll = data.games.map(g => {
    const r = recordFromPlays(data, g.id, all);
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
      plays: gc[g.id] || 0,
    };
  }).filter(Boolean);
  recAll.sort((a, b) => b.plays - a.plays);
  const recordsTotal = recAll.length;
  const expanded = !!recordsExpanded;
  const records = expanded ? recAll : recAll.slice(0, 6);

  // --- Milestones (up to 4, in order: blowout, streak, most-played, oldest record) ---
  const milestones = [];
  if (blow) {
    const bp = player(data, blow.pid), bg = gameOf(data, blow.g);
    milestones.push({
      icon: '💥',
      tint: '#FF6FA5',
      label: 'Biggest blowout',
      value: bp.name + ' won by ' + blow.margin + (blow.margin === 1 ? ' point' : ' points'),
      sub: bg.icon + ' ' + bg.name + ' · ' + blow.score + ' to ' + blow.runner,
    });
  }
  if (stP) {
    milestones.push({
      icon: '🔥',
      tint: '#FF8A3D',
      label: 'Longest win streak',
      value: stP.name + ' · ' + streak.len + ' in a row',
      sub: 'Most consecutive wins',
    });
  }
  milestones.push({
    icon: '🎯',
    tint: '#34D9A0',
    label: 'Most-played game',
    value: mpG.name,
    sub: mpG.icon + ' ' + mpId[1] + ' nights logged',
  });
  if (oldest) {
    milestones.push({
      icon: '⏳',
      tint: '#9B6CFF',
      label: 'Longest-standing record',
      value: oldP.name + ' · ' + oldest.score + ' at ' + oldG.name,
      sub: 'Untouched for ' + ageMo + ' months',
    });
  }

  return {
    hasData: true,
    champ: {
      name: champRow.name,
      initials: champRow.initials, // leaderboard() already derives initials from name[0]
      c1: champRow.c1,
      c2: champRow.c2,
      wins: champRow.wins,
      winPct: champRow.winPct,
      plays: champRow.plays,
    },
    hasWinPct: !!wp,
    winPct: wp ? {
      name: wp.name,
      initials: wp.initials,
      c1: wp.c1,
      c2: wp.c2,
      winPct: wp.winPct,
      wins: wp.wins,
      plays: wp.plays,
    } : null,
    milestones,
    rivalries,
    records,
    recordsTotal,
    hasRivalries: rivalries.length > 0,
    recordsExpanded: expanded,
    recordsCapped: recordsTotal > 6,
  };
}
