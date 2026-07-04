// Pure MCP tool implementations: (data, args) → JSON-able result.
// data is the readState(db) shape — identical to GET /api/state — and all stat
// math comes from the client's own stats.js so MCP answers ALWAYS match the app
// (tier weights, rank direction, streaks). Wired to the protocol in routes/mcp.js.
// Head-to-head re-implements the viewmodel's core rule (shared play, lower rank
// wins) WITHOUT importing headToHead.js — that file is UI-flavored (colors etc.).
import { weight, periodPlays, leaderboard, recordFor, currentStreak } from '../../client/src/lib/stats.js';

export class ToolError extends Error {}

const PERIODS = ['month', 'prevMonth', 'ytd', 'lastYear', 'all'];
const SORTS = ['wins', 'wwins', 'winPct', 'plays', 'losses', 'beat', 'beatPer'];
const norm = (s) => String(s).trim().toLowerCase();
const byId = (list, id) => list.find(x => x.id === id);

function findPlayer(data, ref) {
  const p = byId(data.players, ref) || data.players.find(x => norm(x.name) === norm(ref));
  if (!p) throw new ToolError(`Unknown player "${ref}". Players: ${data.players.map(x => x.name).join(', ')}`);
  return p;
}
function findGame(data, ref) {
  const g = byId(data.games, ref) || data.games.find(x => norm(x.name) === norm(ref));
  if (!g) throw new ToolError(`Unknown game "${ref}". Games: ${data.games.map(x => x.name).join(', ')}`);
  return g;
}
function checkPeriod(period = 'all') {
  if (!PERIODS.includes(period)) throw new ToolError(`Unknown period "${period}". Use: ${PERIODS.join(', ')}`);
  return period;
}

export function getOverview(data) {
  return {
    players: data.players.map(({ id, name, regular }) => ({ id, name, regular })),
    games: data.games,
    totalPlays: data.plays.length,
    firstPlay: data.plays[0]?.d ?? null,
    lastPlay: data.plays.at(-1)?.d ?? null,
  };
}

export function getPlays(data, { since, until, game, player, limit } = {}) {
  let plays = data.plays;
  if (game) { const g = findGame(data, game); plays = plays.filter(p => p.g === g.id); }
  if (player) { const pl = findPlayer(data, player); plays = plays.filter(p => p.parts.some(x => x[0] === pl.id)); }
  if (since) plays = plays.filter(p => p.d.slice(0, 10) >= since);
  if (until) plays = plays.filter(p => p.d.slice(0, 10) <= until);
  const newestFirst = [...plays].reverse(); // readState orders ASC by played_at
  const capped = newestFirst.slice(0, Math.min(limit ?? 50, 200));
  return {
    count: plays.length,
    returned: capped.length,
    plays: capped.map(p => ({
      date: p.d,
      game: byId(data.games, p.g).name,
      results: [...p.parts].sort((a, b) => a[1] - b[1])
        .map(([pid, rank, score]) => ({ player: byId(data.players, pid).name, rank, score })),
    })),
  };
}

export function getLeaderboard(data, { period = 'all', sort = 'wins' } = {}) {
  checkPeriod(period);
  if (!SORTS.includes(sort)) throw new ToolError(`Unknown sort "${sort}". Use: ${SORTS.join(', ')}`);
  const rows = leaderboard(data, periodPlays(data.plays, period, new Date()), sort);
  // Strip UI-only fields; everything numeric passes through untouched (parity!).
  return { period, sort, standings: rows.map(({ c1, c2, initials, wwinsStr, beatPerStr, pid, ...keep }) => keep) };
}

export function getRecords(data, { game } = {}) {
  const games = game ? [findGame(data, game)] : data.games;
  const records = games.map(g => {
    const r = recordFor(data, g.id);
    return r && {
      game: g.name, tier: g.tier, direction: g.dir,
      holder: byId(data.players, r.pid).name, score: r.score, date: r.date,
    };
  }).filter(Boolean);
  return { records };
}

export function getPlayerStats(data, { player } = {}) {
  const p = findPlayer(data, player ?? '');
  const mine = data.plays.filter(x => x.parts.some(pt => pt[0] === p.id));
  let wins = 0, wwins = 0;
  const perGame = {};
  for (const play of mine) {
    const me = play.parts.find(pt => pt[0] === p.id);
    const g = byId(data.games, play.g);
    const e = perGame[play.g] || (perGame[play.g] = { game: g.name, plays: 0, wins: 0, best: null });
    e.plays++;
    if (me[1] === 1) { wins++; wwins += weight(g.tier); e.wins++; }
    const score = me[2];
    if (score != null && (e.best == null || (g.dir === 'high' ? score > e.best : score < e.best))) e.best = score;
  }
  const recent = mine.slice(-5).reverse().map(play => {
    const me = play.parts.find(pt => pt[0] === p.id);
    return { date: play.d, game: byId(data.games, play.g).name, rank: me[1], of: play.parts.length, score: me[2] };
  });
  return {
    player: p.name, plays: mine.length, wins,
    winPct: mine.length ? Math.round(wins / mine.length * 100) : 0,
    weightedWins: Math.round(wwins * 10) / 10,
    currentStreak: currentStreak(data.plays, p.id),
    perGame: Object.values(perGame).sort((a, b) => b.plays - a.plays),
    recent,
  };
}

export function getHeadToHead(data, { playerA, playerB, period = 'all' } = {}) {
  checkPeriod(period);
  const A = findPlayer(data, playerA ?? ''), B = findPlayer(data, playerB ?? '');
  if (A.id === B.id) throw new ToolError('Pick two different players.');
  let meetings = 0, aWins = 0, bWins = 0, last = null;
  const perGame = {};
  for (const play of periodPlays(data.plays, period, new Date())) {
    const pa = play.parts.find(x => x[0] === A.id), pb = play.parts.find(x => x[0] === B.id);
    if (!pa || !pb) continue;
    meetings++;
    const aWon = pa[1] < pb[1]; // lower rank wins (rank tie counts for B — matches headToHead.js)
    if (aWon) aWins++; else bWins++;
    const g = byId(data.games, play.g);
    const e = perGame[play.g] || (perGame[play.g] = { game: g.name, meetings: 0, aWins: 0, bWins: 0 });
    e.meetings++; if (aWon) e.aWins++; else e.bWins++;
    if (!last || play.d > last.date) last = { date: play.d, game: g.name, winner: aWon ? A.name : B.name };
  }
  return {
    playerA: A.name, playerB: B.name, period, meetings, aWins, bWins,
    verdict: meetings === 0 ? 'No meetings in this period'
      : aWins === bWins ? 'All square' : `${aWins > bWins ? A.name : B.name} leads the series`,
    lastMeeting: last,
    perGame: Object.values(perGame).sort((a, b) => b.meetings - a.meetings),
  };
}
