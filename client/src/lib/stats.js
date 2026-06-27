// PURE stat core, ported EXACTLY from new_game_night_design/Game Night.dc.html (class Component).
// data = { players, games, plays }. See plan Global Constraints.
const game = (data, id) => data.games.find(g => g.id === id);
const pl = (data, id) => data.players.find(p => p.id === id);
const initials = (p) => (p.name || '?').slice(0, 1).toUpperCase();

export function weight(t) { return t === 'Heavy' ? 1.5 : t === 'Light' ? 0.5 : 1.0; }

export function inPeriod(play, period, now, custom) {
  const d = new Date(play.d), n = now;
  if (period === 'all') return true;
  if (period === 'month') return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (period === 'prevMonth') { const m = (n.getMonth() + 11) % 12, y = n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear(); return d.getFullYear() === y && d.getMonth() === m; }
  if (period === 'ytd') return d.getFullYear() === n.getFullYear();
  if (period === 'lastYear') return d.getFullYear() === n.getFullYear() - 1;
  if (period === 'custom') { const s = new Date(custom.start + 'T00:00:00'); const e = new Date(custom.end + 'T23:59:59'); return d >= s && d <= e; }
  return true;
}
export function periodPlays(plays, period, now, custom) { return plays.filter(x => inPeriod(x, period, now, custom)); }

export function leaderboard(data, plays, sort, sort2) {
  const m = {};
  for (const play of plays) {
    const tw = weight(game(data, play.g).tier);
    for (const [pid, rank] of play.parts) {
      const e = m[pid] || (m[pid] = { pid, plays: 0, wins: 0, beat: 0, wwins: 0 });
      e.plays++; e.beat += play.parts.filter(x => x[1] > rank).length;
      if (rank === 1) { e.wins++; e.wwins += tw; }
    }
  }
  let arr = Object.values(m).map(e => { const p = pl(data, e.pid); return { ...e, name: p.name, c1: p.c1, c2: p.c2, initials: initials(p),
    winPct: e.plays ? Math.round(e.wins / e.plays * 100) : 0, wwinsStr: (Math.round(e.wwins * 10) / 10).toFixed(1) }; });
  const keyVal = (e, key) => key === 'wins' ? e.wins : key === 'plays' ? e.plays : key === 'winPct' ? e.winPct : key === 'beat' ? e.beat : e.wwins;
  const key = sort || 'wins';
  arr.sort((a, b) => (keyVal(b, key) - keyVal(a, key)) || (sort2 ? (keyVal(b, sort2) - keyVal(a, sort2)) : 0));
  arr.forEach((e, i) => e.rank = i + 1);
  return arr;
}

export function recordFromPlays(data, gameId, plays) {
  const g = game(data, gameId); let best = null;
  for (const play of plays) {
    if (play.g !== gameId) continue;
    for (const [pid, , score] of play.parts) {
      if (score == null) continue;
      if (!best || (g.dir === 'high' ? score > best.score : score < best.score)) best = { pid, score, date: play.d };
    }
  }
  return best;
}

export function recordFor(data, gameId) {
  return recordFromPlays(data, gameId, data.plays);
}

export function currentStreak(plays, pid) {
  const ps = plays.filter(p => p.parts.some(x => x[0] === pid)).sort((a, b) => new Date(b.d) - new Date(a.d));
  let s = 0; for (const p of ps) { const me = p.parts.find(x => x[0] === pid); if (me[1] === 1) s++; else break; } return s;
}

export function computePick(data, plays, absent = {}) {
  const sorted = [...plays].sort((a, b) => new Date(b.d) - new Date(a.d));
  if (!sorted.length) return null;
  const last = sorted[0];
  const ordered = [...last.parts].sort((a, b) => b[1] - a[1]); // worst finisher first
  const pickPart = ordered.find(p => !absent[p[0]]) || null;
  return { game: game(data, last.g), date: last.d, ordered, pickPart };
}
