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
