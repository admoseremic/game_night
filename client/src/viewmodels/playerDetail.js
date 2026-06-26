// playerDetail.js — view-model for the Player Profile screen.
// Ported from prototype playerDetail (lines 1268-1318).
// All stat math comes from stats.js and format.js — no re-computation here.

import { weight, currentStreak, recordFor } from '../lib/stats.js';
import { fmtDate, ordinal } from '../lib/format.js';

// Common helpers for this module
const player = (data, id) => data.players.find(x => x.id === id);
const gameOf = (data, id) => data.games.find(x => x.id === id);
const initialsOf = (p) => (p.name || '?')[0].toUpperCase();

/**
 * buildPlayerDetail(data, pid, now, from) → full player profile view-model.
 *
 * @param {object} data  - { players, games, plays }
 * @param {string} pid   - player id to profile
 * @param {Date}   now   - current date
 * @param {string} from  - navigation source: 'players' | 'board'
 */
export function buildPlayerDetail(data, pid, now, from) {
  const p = player(data, pid);
  // All plays involving this player, most recent first
  const plays = data.plays
    .filter(x => x.parts.some(pt => pt[0] === pid))
    .sort((a, b) => new Date(b.d) - new Date(a.d));

  // Label for the back button based on where user navigated from
  const backLabel = from === 'board' ? 'Leaderboard' : 'Players';

  // Empty/new player state — no plays recorded
  if (plays.length === 0) {
    return {
      empty: true,
      isNew: true,
      name: p.name,
      initials: initialsOf(p),
      c1: p.c1,
      c2: p.c2,
      regular: !!p.regular,
      backLabel,
      wins: 0,
      winPct: 0,
      beat: 0,
      wwinsStr: '0.0',
      plays: 0,
      streak: 0,
      showStreak: false,
      hasForm: false,
      formDots: [],
    };
  }

  // ─── Aggregate totals ───
  let wins = 0, beat = 0, wwins = 0;
  plays.forEach(pl => {
    const me = pl.parts.find(x => x[0] === pid);
    const rank = me[1];
    // Count players beaten in this session
    beat += pl.parts.filter(x => x[1] > rank).length;
    if (rank === 1) {
      wins++;
      wwins += weight(gameOf(data, pl.g).tier);
    }
  });
  const total = plays.length;
  const winPct = Math.round(wins / total * 100);
  const streak = currentStreak(data.plays, pid);

  // ─── Form dots: last 5 plays (oldest → newest), colored by win/loss ───
  const formDots = plays.slice(0, 5)
    .map(pl => pl.parts.find(x => x[0] === pid)[1] === 1)
    .reverse()
    .map(w => ({ bg: w ? '#34D9A0' : 'rgba(255,255,255,0.14)' }));

  // ─── Per-game breakdown ───
  const byGame = {};
  plays.forEach(pl => {
    const me = pl.parts.find(x => x[0] === pid);
    const gid = pl.g;
    const e = byGame[gid] || (byGame[gid] = { g: gid, plays: 0, wins: 0, best: null });
    e.plays++;
    if (me[1] === 1) e.wins++;
    if (me[2] != null) {
      const dir = gameOf(data, gid).dir;
      if (e.best == null || (dir === 'high' ? me[2] > e.best : me[2] < e.best)) e.best = me[2];
    }
  });
  const games = Object.values(byGame).map(e => {
    const g = gameOf(data, e.g);
    return {
      name: g.name,
      icon: g.icon,
      plays: e.plays,
      wins: e.wins,
      winPct: Math.round(e.wins / e.plays * 100),
      best: e.best != null ? e.best : '—',
    };
  }).sort((a, b) => b.plays - a.plays);

  // ─── Favorite game (most played) and specialty (best win% with ≥2 plays) ───
  const fav = games[0] || null;
  const specialty = [...games].filter(g => g.plays >= 2).sort((a, b) => b.winPct - a.winPct)[0] || fav;

  // ─── Biggest win (most players beaten in a single win) ───
  let biggest = null;
  plays.forEach(pl => {
    const me = pl.parts.find(x => x[0] === pid);
    if (me[1] === 1) {
      const b = pl.parts.length - 1;
      if (!biggest || b > biggest.beat) biggest = { beat: b, g: pl.g, date: pl.d };
    }
  });

  // ─── Records held ───
  const records = data.games.map(g => {
    const r = recordFor(data, g.id);
    return (r && r.pid === pid) ? { name: g.name, icon: g.icon, score: r.score } : null;
  }).filter(Boolean);

  // ─── Head-to-head rivalry ───
  const h2h = {};
  plays.forEach(pl => {
    const me = pl.parts.find(x => x[0] === pid);
    pl.parts.forEach(o => {
      if (o[0] === pid) return;
      const e = h2h[o[0]] || (h2h[o[0]] = { pid: o[0], met: 0, wins: 0, losses: 0 });
      e.met++;
      if (me[1] < o[1]) e.wins++;
      else e.losses++;
    });
  });
  // Only show rivalry cards when player has met at least 3 times
  const h2hArr = Object.values(h2h).filter(e => e.met >= 3);
  const byWin = [...h2hArr].sort((a, b) => (a.wins / a.met) - (b.wins / b.met));
  const nemE = byWin[0] || null;
  const vicE = byWin.length ? byWin[byWin.length - 1] : null;
  const showNem = !!nemE && (nemE.wins / nemE.met) <= 0.5;
  const showVic = !!vicE && vicE !== nemE && (vicE.wins / vicE.met) >= 0.5;

  // Build rivalry opponent card from h2h entry
  const oppCard = (e) => {
    if (!e) return null;
    const o = player(data, e.pid);
    return {
      name: o.name,
      initials: initialsOf(o),
      c1: o.c1,
      c2: o.c2,
      wins: e.wins,
      losses: e.losses,
      met: e.met,
    };
  };

  // ─── Recent results (last 6 plays) ───
  const recent = plays.slice(0, 6).map(pl => {
    const me = pl.parts.find(x => x[0] === pid);
    const g = gameOf(data, pl.g);
    return {
      game: g.name,
      icon: g.icon,
      ord: ordinal(me[1]),
      total: pl.parts.length,
      dateLabel: fmtDate(pl.d),
      win: me[1] === 1,
      // Badge styling: gold for win, pink for last place, subtle for mid
      badgeBg: me[1] === 1
        ? 'linear-gradient(135deg,#FFE08A,#F0A92E)'
        : (me[1] === pl.parts.length ? 'rgba(255,111,165,0.18)' : 'rgba(255,255,255,0.07)'),
      badgeTx: me[1] === 1
        ? '#2A1E08'
        : (me[1] === pl.parts.length ? '#FF6FA5' : '#C9B8E8'),
    };
  });

  return {
    empty: false,
    isNew: false,
    name: p.name,
    initials: initialsOf(p),
    c1: p.c1,
    c2: p.c2,
    regular: !!p.regular,
    backLabel,
    wins,
    winPct,
    beat,
    wwinsStr: (Math.round(wwins * 10) / 10).toFixed(1),
    plays: total,
    streak,
    showStreak: streak >= 2,
    formDots,
    hasForm: formDots.length > 0,
    fav,
    hasFav: !!fav,
    specialty,
    hasSpec: !!specialty,
    biggest: biggest
      ? {
          beat: biggest.beat,
          game: gameOf(data, biggest.g).name,
          icon: gameOf(data, biggest.g).icon,
          dateLabel: fmtDate(biggest.date),
        }
      : null,
    hasBiggest: !!biggest,
    records,
    hasRecords: records.length > 0,
    games,
    nemesis: oppCard(nemE),
    hasNemesis: showNem,
    victim: oppCard(vicE),
    hasVictim: showVic,
    hasRivalry: showNem || showVic,
    recent,
  };
}
