// playerDetail.test.js — TDD tests for buildPlayerDetail view-model.
// Task-8 fixture used for deterministic assertions.
import { it, expect } from 'vitest';
import { buildPlayerDetail } from './playerDetail.js';

const data = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true },
    { id: 'p3', name: 'Cy', c1: '#5', c2: '#6', regular: false },
  ],
  games: [
    { id: 'g1', name: 'Light Game', tier: 'Light', dir: 'high', icon: '🔷' },
    { id: 'g2', name: 'Heavy Low', tier: 'Heavy', dir: 'low', icon: '🚀' },
  ],
  plays: [
    { id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, 50], ['p2', 2, 40], ['p3', 3, 30]] },
    { id: 'x2', g: 'g2', d: '2026-06-12T20:00', parts: [['p2', 1, 10], ['p1', 2, 20]] },
  ],
};
const now = new Date('2026-06-24T20:00:00');

it('player detail aggregates wins/plays/beat/wwins', () => {
  const vm = buildPlayerDetail(data, 'p1', now, 'players');
  expect(vm.plays).toBe(2);
  expect(vm.wins).toBe(1);
  expect(vm.beat).toBe(2); // x1: rank 1 → beat 2 players (p2,p3); x2: rank 2 → beat 0
  expect(vm.wwinsStr).toBe('0.5'); // 1 Light win = 0.5
  expect(vm.games.every(g => g.id)).toBe(true); // each per-game row carries its game id (for detail linking)
});

it('recent results order same-timestamp plays by seq, newest-logged first', () => {
  const d2 = { ...data, plays: [
    { id: 'y1', g: 'g1', d: '2026-06-12T23:01', seq: 1, parts: [['p1', 1, null], ['p2', 2, null]] },
    { id: 'y2', g: 'g2', d: '2026-06-12T23:01', seq: 2, parts: [['p1', 2, null], ['p2', 1, null]] },
  ] };
  const vm = buildPlayerDetail(d2, 'p1', now, 'players');
  expect(vm.recent.map(r => r.game)).toEqual(['Heavy Low', 'Light Game']); // y2 logged last → listed first
});

it('new player with no plays returns isNew/empty', () => {
  const d = { ...data, players: [...data.players, { id: 'pNew', name: 'Zoe', c1: '#7', c2: '#8', regular: true }] };
  const vm = buildPlayerDetail(d, 'pNew', now, 'players');
  expect(vm.isNew).toBe(true);
  expect(vm.empty).toBe(true);
});

// ─── Period filter (This Month / Last Month / This Year / All Time) ───
const multiYear = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true },
  ],
  games: [{ id: 'g1', name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' }],
  plays: [
    { id: 'o1', g: 'g1', d: '2024-05-01T20:00', parts: [['p1', 2, 30], ['p2', 1, 90]] }, // 2024: Bob wins, sets all-time record 90
    { id: 'n1', g: 'g1', d: '2026-03-01T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] }, // 2026: Ann wins
    { id: 'n2', g: 'g1', d: '2026-04-01T20:00', parts: [['p1', 1, 55], ['p2', 2, 45]] }, // 2026: Ann wins
  ],
};

it('player detail: period filter scopes performance stats', () => {
  const all = buildPlayerDetail(multiYear, 'p1', now, 'players', 'all');
  expect(all.plays).toBe(3);
  expect(all.wins).toBe(2);
  const ty = buildPlayerDetail(multiYear, 'p1', now, 'players', 'ytd');
  expect(ty.plays).toBe(2);   // only the two 2026 plays
  expect(ty.wins).toBe(2);
  expect(ty.winPct).toBe(100);
});

it('player detail: This Month / Last Month windows scope to calendar months', () => {
  // now = 2026-06-24, so 'month' = June 2026 and 'prevMonth' = May 2026.
  const d = { ...data, plays: [
    ...data.plays,                                                                        // two June 2026 plays
    { id: 'm1', g: 'g1', d: '2026-05-20T20:00', parts: [['p1', 2, 10], ['p2', 1, 60]] },  // May 2026: Ann loses
  ] };
  const thisMonth = buildPlayerDetail(d, 'p1', now, 'players', 'month');
  expect(thisMonth.plays).toBe(2);
  expect(thisMonth.wins).toBe(1);
  const lastMonth = buildPlayerDetail(d, 'p1', now, 'players', 'prevMonth');
  expect(lastMonth.plays).toBe(1);
  expect(lastMonth.wins).toBe(0);
});

it('player detail: Records held stays all-time regardless of period', () => {
  // All-time g1 record is Bob's 90 (2024). Ann's 2026 best (55) is NOT an all-time record,
  // so even in the This Year view she holds no records and Bob still does.
  const annTY = buildPlayerDetail(multiYear, 'p1', now, 'players', 'ytd');
  expect(annTY.hasRecords).toBe(false); // would be true if records were window-scoped
  const bobTY = buildPlayerDetail(multiYear, 'p2', now, 'players', 'ytd');
  expect(bobTY.hasRecords).toBe(true);
  expect(bobTY.records[0]).toMatchObject({ name: 'Catan', score: 90 });
});

it('player detail: records held sorted by the player\'s all-time plays of that game (desc)', () => {
  const d = {
    players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }],
    games: [
      { id: 'g1', name: 'Rare', tier: 'Medium', dir: 'high', icon: '🎲' },   // listed first, but played least
      { id: 'g2', name: 'Often', tier: 'Medium', dir: 'high', icon: '🃏' },
    ],
    plays: [
      { id: 'a', g: 'g1', d: '2026-01-01T20:00', parts: [['p1', 1, 10]] }, // Ann: 1 play of g1 (holds record)
      { id: 'b', g: 'g2', d: '2026-01-02T20:00', parts: [['p1', 1, 20]] }, // Ann: 3 plays of g2 (holds record)
      { id: 'c', g: 'g2', d: '2026-02-02T20:00', parts: [['p1', 1, 15]] },
      { id: 'e', g: 'g2', d: '2026-03-02T20:00', parts: [['p1', 1, 5]] },
    ],
  };
  const vm = buildPlayerDetail(d, 'p1', now, 'players', 'all');
  expect(vm.records.map(r => r.name)).toEqual(['Often', 'Rare']); // g2 (3 plays) before g1 (1 play)
  expect(vm.records[0]).toMatchObject({ id: 'g2', name: 'Often', plays: 3 }); // id present for game-detail linking
});

it('player detail: career plays but none in window → emptyWindow (not isNew)', () => {
  const d = {
    players: [{ id: 'pq', name: 'Quinn', c1: '#9', c2: '#0', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
    games: [{ id: 'g1', name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' }],
    plays: [{ id: 'old', g: 'g1', d: '2024-05-01T20:00', parts: [['pq', 1, 50], ['p2', 2, 40]] }],
  };
  const vm = buildPlayerDetail(d, 'pq', now, 'players', 'ytd');
  expect(vm.empty).toBe(true);
  expect(vm.isNew).toBe(false);    // they have career plays, just none this year
  expect(vm.emptyWindow).toBe(true);
});

// ─── Ties (competition ranking: tied players share a rank) ───
const tieData = { ...data, plays: [
  { id: 't1', g: 'g1', d: '2026-06-01T20:00', parts: [['p1', 1, 50], ['p2', 1, 50], ['p3', 3, 30]] }, // Ann & Bob tie for 1st
  { id: 't2', g: 'g1', d: '2026-06-02T20:00', parts: [['p3', 1, 50], ['p1', 2, 40], ['p2', 2, 40]] }, // Ann & Bob tie for last
  { id: 't3', g: 'g1', d: '2026-06-03T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] },
  { id: 't4', g: 'g1', d: '2026-06-04T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] },
  { id: 't5', g: 'g1', d: '2026-06-05T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] },
] };

it('ties: a meeting where both players share a rank counts for neither side in head-to-head', () => {
  const vm = buildPlayerDetail(tieData, 'p1', now, 'players');
  // Ann vs Bob: t3 + t4 + t5 are Ann wins; t1 + t2 are ties and are skipped entirely
  // (rivalry cards need ≥3 meetings, so the tied plays must NOT count toward `met`)
  expect(vm.victim).toMatchObject({ name: 'Bob', met: 3, wins: 3, losses: 0 });
});

it('ties: recent badge marks last place by worst rank, not by player count, and prefixes shared ordinals with T-', () => {
  const vm = buildPlayerDetail(tieData, 'p1', now, 'players');
  const t1 = vm.recent.find(r => r.ord === 'T-1st');
  expect(t1).toBeTruthy();
  expect(t1.win).toBe(true);
  expect(t1.badgeTx).toBe('#2A1E08'); // gold win badge, never styled as last
  const t2 = vm.recent.find(r => r.ord === 'T-2nd');
  expect(t2).toBeTruthy();
  expect(t2.badgeTx).toBe('#FF6FA5'); // rank 2 of 3 players but it IS the worst rank → last-place pink
});
