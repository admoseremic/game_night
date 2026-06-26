// gameDetail.js — view-model for the Game Deep-Dive screen.
// Ported from prototype gameDetail() lines 1230–1262.
// PURE: no side effects, no setUi. All stat math via stats.js / format.js helpers.

import { recordFor } from '../lib/stats.js';
import { tierBg, tierTx, rel, fmtDate, fmtDateY, medalBg, medalTx } from '../lib/format.js';

// Derive initials from a player object (no initials field on model).
const initialsOf = (p) => (p.name || '?')[0].toUpperCase();

export function buildGameDetail(data, gameId, now) {
  const g = data.games.find(x => x.id === gameId);
  // Helper to look up a player by id
  const player = (id) => data.players.find(p => p.id === id);

  // Filter and sort plays for this game chronologically
  const ps = data.plays
    .filter(p => p.g === gameId)
    .sort((a, b) => new Date(a.d) - new Date(b.d));

  // Empty state: game has never been played
  if (ps.length === 0) {
    return {
      empty: true,
      name: g.name,
      icon: g.icon,
      tier: g.tier,
      tierBg: tierBg(g.tier),
      tierTx: tierTx(g.tier),
      tierW: g.tier === 'Heavy' ? '×1.5' : g.tier === 'Light' ? '×0.5' : '×1.0',
      dirLabel: g.dir === 'high' ? 'High score wins' : 'Low score wins',
    };
  }

  // ─── Top scores: all scored parts, direction-aware ───
  const entries = [];
  for (const play of ps) {
    for (const [pid, , score] of play.parts) {
      if (score != null) entries.push({ pid, score, date: play.d });
    }
  }
  // Sort descending for high-score games, ascending for low-score games
  entries.sort((a, b) => g.dir === 'high' ? b.score - a.score : a.score - b.score);
  const topScores = entries.slice(0, 5).map((e, i) => {
    const p = player(e.pid);
    return {
      name: p.name,
      initials: initialsOf(p),
      c1: p.c1,
      c2: p.c2,
      score: e.score,
      dateLabel: fmtDateY(e.date),
      pos: i + 1,
      posBg: medalBg(i + 1),
      posTx: medalTx(i + 1),
    };
  });

  // ─── Win leaderboard (wins / plays / win% / personal best) ───
  const wm = {};
  for (const play of ps) {
    for (const [pid, rank] of play.parts) {
      const e = wm[pid] || (wm[pid] = { pid, plays: 0, wins: 0, best: null });
      e.plays++;
      if (rank === 1) e.wins++;
    }
  }
  // Personal bests: direction-aware
  for (const e of entries) {
    const w = wm[e.pid];
    if (!w) continue;
    if (w.best == null || (g.dir === 'high' ? e.score > w.best : e.score < w.best)) {
      w.best = e.score;
    }
  }
  const winLB = Object.values(wm).map(e => {
    const p = player(e.pid);
    return {
      name: p.name,
      initials: initialsOf(p),
      c1: p.c1,
      c2: p.c2,
      wins: e.wins,
      plays: e.plays,
      winPct: Math.round(e.wins / e.plays * 100),
      best: e.best != null ? e.best : '—',
    };
  }).sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);

  // ─── Score history bars (winning score per session, scaled min→max) ───
  const hist = ps.map(p => {
    const w = p.parts.find(x => x[1] === 1);
    return { v: (w && w[2] != null) ? w[2] : null, date: p.d };
  }).filter(h => h.v != null);
  const vals = hist.map(h => h.v);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const range = (mx - mn) || 1;
  const histBars = hist.map(h => ({
    h: 20 + Math.round((h.v - mn) / range * 72), // min 20px, max 92px
    v: h.v,
    label: fmtDate(h.date),
  }));

  // ─── Aggregate stats ───
  const totalP = ps.reduce((s, p) => s + p.parts.length, 0);
  const king = winLB[0];

  return {
    empty: false,
    id: gameId,
    name: g.name,
    icon: g.icon,
    tier: g.tier,
    tierBg: tierBg(g.tier),
    tierTx: tierTx(g.tier),
    dirLabel: g.dir === 'high' ? 'High score wins' : 'Low score wins',
    tierW: g.tier === 'Heavy' ? '×1.5' : g.tier === 'Light' ? '×0.5' : '×1.0',
    plays: ps.length,
    lastRel: rel(ps[ps.length - 1].d, now),
    avgPlayers: Math.round(totalP / ps.length),
    record: topScores[0] || null, // direction-aware #1 score; null when no scored plays exist
    topScores,
    winLB,
    histBars,
    // King of the game = most wins
    kingName: king ? king.name : '—',
    kingInitials: king ? king.initials : '?',
    kingC1: king ? king.c1 : '#555',
    kingC2: king ? king.c2 : '#333',
    kingWins: king ? king.wins : 0,
  };
}
