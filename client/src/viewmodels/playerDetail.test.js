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
});

it('new player with no plays returns isNew/empty', () => {
  const d = { ...data, players: [...data.players, { id: 'pNew', name: 'Zoe', c1: '#7', c2: '#8', regular: true }] };
  const vm = buildPlayerDetail(d, 'pNew', now, 'players');
  expect(vm.isNew).toBe(true);
  expect(vm.empty).toBe(true);
});

// ─── Period filter (This Year / Last 2 Years / All Time) ───
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
  const ty = buildPlayerDetail(multiYear, 'p1', now, 'players', 'thisYear');
  expect(ty.plays).toBe(2);   // only the two 2026 plays
  expect(ty.wins).toBe(2);
  expect(ty.winPct).toBe(100);
});

it('player detail: Records held stays all-time regardless of period', () => {
  // All-time g1 record is Bob's 90 (2024). Ann's 2026 best (55) is NOT an all-time record,
  // so even in the This Year view she holds no records and Bob still does.
  const annTY = buildPlayerDetail(multiYear, 'p1', now, 'players', 'thisYear');
  expect(annTY.hasRecords).toBe(false); // would be true if records were window-scoped
  const bobTY = buildPlayerDetail(multiYear, 'p2', now, 'players', 'thisYear');
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
  expect(vm.records[0]).toMatchObject({ name: 'Often', plays: 3 });
});

it('player detail: career plays but none in window → emptyWindow (not isNew)', () => {
  const d = {
    players: [{ id: 'pq', name: 'Quinn', c1: '#9', c2: '#0', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
    games: [{ id: 'g1', name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' }],
    plays: [{ id: 'old', g: 'g1', d: '2024-05-01T20:00', parts: [['pq', 1, 50], ['p2', 2, 40]] }],
  };
  const vm = buildPlayerDetail(d, 'pq', now, 'players', 'thisYear');
  expect(vm.empty).toBe(true);
  expect(vm.isNew).toBe(false);    // they have career plays, just none this year
  expect(vm.emptyWindow).toBe(true);
});
