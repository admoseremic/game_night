// headToHead.js — view-model for the interactive Head-to-Head picker on the Hall of Fame screen.
// Ported from prototype headToHead() (Game Night.dc.html ~1592). Lets the user compare ANY two
// players in the active Hall window: wins vs wins, split bar, who-leads verdict, latest meeting,
// and a per-game W–L breakdown. Pure function — the screen owns the click handlers and passes
// the current selection ({ a, b, slot }) in; we never mutate or hold UI state here.

import { fmtDate } from '../lib/format.js';

const player = (data, id) => data.players.find(x => x.id === id);
const gameOf = (data, id) => data.games.find(x => x.id === id);
// First letter of name, uppercase — no .initials field on the player model (matches hall.js).
const initialsOf = (p) => (p && (p.name || '?')[0].toUpperCase()) || '?';

/**
 * buildHeadToHead(data, hallPeriod, now, h2h) → head-to-head view-model
 *
 * hallPeriod: 'all' | 'last2' | 'thisYear'  (undefined → 'all') — same window as the rest of Hall.
 * h2h: { a, b, slot } — selected player ids (or null) and the active slot ('a'|'b').
 *
 * When nothing is picked yet (a and b both null) we default to the MOST-CONTESTED pair in the
 * window (most shared games) so the panel opens with a live matchup; falls back to the first two
 * players. The default is derived here, NOT written back to state, so it recomputes when the
 * window changes while an explicit pick still sticks.
 */
export function buildHeadToHead(data, hallPeriod, now, h2h) {
  const hp = hallPeriod || 'all';
  const slot = (h2h && h2h.slot) || 'a';

  // Same period filter as buildHall
  const all = data.plays.filter(p => {
    const y = new Date(p.d).getFullYear();
    if (hp === 'thisYear') return y === now.getFullYear();
    if (hp === 'last2') return y >= now.getFullYear() - 1;
    return true; // 'all'
  });

  // Resolve the selected pair, defaulting to the most-contested pair when nothing is picked.
  let aId = (h2h && h2h.a) || null;
  let bId = (h2h && h2h.b) || null;
  if (aId == null && bId == null) {
    const ids = data.players.map(p => p.id);
    let best = null;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        let mm = 0;
        all.forEach(p => { if (p.parts.find(x => x[0] === a) && p.parts.find(x => x[0] === b)) mm++; });
        if (mm > 0 && (!best || mm > best.m)) best = { a, b, m: mm };
      }
    }
    if (best) { aId = best.a; bId = best.b; }
    else { aId = (data.players[0] || {}).id || null; bId = (data.players[1] || {}).id || null; }
  }

  const A = aId ? player(data, aId) : null;
  const B = bId ? player(data, bId) : null;

  // Slot card (avatar + name + whether it's the active slot)
  const card = (p, which) => p ? { name: p.name, initials: initialsOf(p), c1: p.c1, c2: p.c2, active: slot === which } : null;

  // Roster strip — every player, flagged if they currently occupy a slot
  const roster = data.players.map(p => {
    const isA = p.id === aId, isB = p.id === bId;
    return {
      id: p.id, name: p.name, initials: initialsOf(p), c1: p.c1, c2: p.c2,
      isA, isB,
      ring: (isA || isB) ? '#FFC24B' : 'transparent',
      tag: isA ? 'A' : isB ? 'B' : '',
      tagShow: isA || isB,
      op: (isA || isB) ? 1 : 0.78,
    };
  });

  // Aggregate the matchup over the filtered window (a "meeting" = both players in one play)
  const ready = !!(A && B);
  let m = 0, aw = 0, bw = 0, lastD = null, lastTxt = '';
  const pg = {}; // per-game tally keyed by game id
  if (ready) {
    all.forEach(p => {
      const pa = p.parts.find(x => x[0] === aId);
      const pb = p.parts.find(x => x[0] === bId);
      if (pa && pb) {
        m++;
        const aWon = pa[1] < pb[1]; // lower rank wins
        if (aWon) aw++; else bw++;
        const g = gameOf(data, p.g);
        if (!pg[p.g]) pg[p.g] = { name: g.name, icon: g.icon, m: 0, a: 0, b: 0 };
        pg[p.g].m++; if (aWon) pg[p.g].a++; else pg[p.g].b++;
        if (!lastD || new Date(p.d) > new Date(lastD)) {
          lastD = p.d;
          lastTxt = (aWon ? A.name : B.name) + ' won · ' + g.name + ' · ' + fmtDate(p.d);
        }
      }
    });
  }

  const even = aw === bw;
  const aLead = aw >= bw;
  // Per-game rows, most-met first; brighten the leader's number, dim the loser's, neutral on ties
  const games = Object.values(pg).sort((x, y) => y.m - x.m).map(r => ({
    name: r.name, icon: r.icon, m: r.m, a: r.a, b: r.b,
    aCol: r.a === r.b ? '#9D90B5' : (r.a > r.b ? '#F4EEF8' : '#6E6483'),
    bCol: r.a === r.b ? '#9D90B5' : (r.b > r.a ? '#F4EEF8' : '#6E6483'),
  }));

  return {
    roster,
    // slots
    aCard: card(A, 'a'), bCard: card(B, 'b'),
    hasA: !!A, hasB: !!B, noA: !A, noB: !B,
    aActive: slot === 'a', bActive: slot === 'b',
    aRing: slot === 'a' ? '#FFC24B' : 'rgba(255,255,255,0.08)',
    bRing: slot === 'b' ? '#FFC24B' : 'rgba(255,255,255,0.08)',
    // result
    ready, notReady: !ready,
    meetings: m, hasMeetings: m > 0, noMeetings: ready && m === 0,
    aWins: aw, bWins: bw,
    aPct: m ? Math.round(aw / m * 100) : 50, bPct: m ? Math.round(bw / m * 100) : 50,
    aName: A ? A.name : '', bName: B ? B.name : '',
    aC1: A ? A.c1 : '#555', aC2: A ? A.c2 : '#333', bC1: B ? B.c1 : '#555', bC2: B ? B.c2 : '#333',
    leadName: even ? 'Dead even' : (aLead ? A.name : B.name), even,
    verdict: even ? 'All square right now' : ((aLead ? A.name : B.name) + ' leads the series'),
    lastTxt, hasLast: !!lastTxt,
    games, hasGames: games.length > 0,
  };
}
