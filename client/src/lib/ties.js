// ties.js — pure helpers behind the "＝ tie with the row above" control in flows/LogPlay.jsx.
//
// The finish list is an ordered array of player ids; ties are a SEPARATE map of
// { [playerId]: true } meaning "this player is tied with the row directly above".
// Ranks are derived from (order, ties) at render and on save using competition ranking
// (1-2-2-4): a tied row inherits the rank above it, an untied row's rank is its 1-based
// position. Nothing derived is stored — the play's `parts` just carry the shared rank.
//
// Tie flags are a relation to the row above, so any reorder/removal that changes a
// player's neighbour clears the affected flags rather than silently re-pairing people
// (per the UX spec).

// order: string[] of player ids; ties: { [pid]: true }. Returns number[] of ranks, one per row.
export function deriveRanks(order, ties) {
  const ranks = [];
  order.forEach((pid, i) => {
    // First row can never be tied (no row above) — its flag is ignored.
    ranks.push(i > 0 && ties[pid] ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

// Rebuild tie flags from a saved play's parts ([pid, rank, score]) — used by edit mode.
// A player is tied if their rank equals the previous player's rank in rank order.
export function tiesFromParts(parts) {
  const sorted = [...parts].sort((a, b) => a[1] - b[1]);
  const ties = {};
  sorted.forEach((p, i) => { if (i > 0 && p[1] === sorted[i - 1][1]) ties[p[0]] = true; });
  return ties;
}

// Move `pid` up one slot. Clears the tie flag on both swapped players and on the player
// now directly below them (its "row above" changed). Returns { order, ties }.
export function moveUpWithTies(order, ties, pid) {
  const i = order.indexOf(pid);
  if (i <= 0) return { order, ties };
  const next = [...order];
  next[i - 1] = order[i];
  next[i] = order[i - 1];
  const t = { ...ties };
  delete t[next[i - 1]];
  delete t[next[i]];
  if (next[i + 1]) delete t[next[i + 1]];
  return { order: next, ties: t };
}

// Remove `pid` from the list. Clears their flag and the flag of the player that was below
// them (it would otherwise attach to a new neighbour). Returns { order, ties }.
export function removeWithTies(order, ties, pid) {
  const i = order.indexOf(pid);
  if (i < 0) return { order, ties };
  const next = order.filter(x => x !== pid);
  const t = { ...ties };
  delete t[pid];
  if (order[i + 1]) delete t[order[i + 1]];
  return { order: next, ties: t };
}

// Winners of a saved play = every rank-1 part (a tie for first has several). `beaten` is the
// number of players the winners finished ahead of — used by the post-save celebration.
export function winnersOf(parts) {
  const pids = parts.filter(p => p[1] === 1).map(p => p[0]);
  return { pids, beaten: parts.length - pids.length };
}
