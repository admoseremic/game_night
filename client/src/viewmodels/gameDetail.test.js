// gameDetail.test.js — TDD: write FIRST, run to fail, then implement buildGameDetail.
import { it, expect } from 'vitest';
import { buildGameDetail } from './gameDetail.js';

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

it('high-score game: record + plays + top score', () => {
  const vm = buildGameDetail(data, 'g1', now);
  expect(vm.empty).toBe(false);
  expect(vm.plays).toBe(1);
  expect(vm.record.score).toBe(50);
  expect(vm.topScores[0].score).toBe(50);
});
it('low-score game: min score is the record', () => {
  expect(buildGameDetail(data, 'g2', now).record.score).toBe(10);
});
it('game played with no scores: not empty but record is null', () => {
  const d = {
    players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
    games: [{ id: 'g1', name: 'G', tier: 'Medium', dir: 'high', icon: '🎲' }],
    plays: [{ id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, null], ['p2', 2, null]] }],
  };
  const vm = buildGameDetail(d, 'g1', new Date('2026-06-24T20:00:00'));
  expect(vm.empty).toBe(false);
  expect(vm.record).toBe(null);
  expect(vm.topScores.length).toBe(0);
  expect(vm.winLB.length).toBe(2); // win leaderboard still works without scores
});
it('empty state for a never-played game', () => {
  const vm = buildGameDetail({ ...data, plays: [] }, 'g1', now);
  expect(vm.empty).toBe(true);
  expect(vm.dirLabel).toBe('High score wins'); // g1 is dir:'high'
  expect(vm.tierW).toBe('×0.5');               // g1 is Light
  expect(vm.tierTx).toBeTruthy();
});
