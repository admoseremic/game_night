// history.test.js — TDD test for buildHistory view-model (Task 17).
// Fixture matches Task 8 fixture: two plays on different days.

import { it, expect } from 'vitest';
import { buildHistory } from './history.js';

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

it('groups plays by night, reverse-chron, with winner/loser/score', () => {
  const days = buildHistory(data, now);
  expect(days.length).toBe(2);
  expect(days[0].games.length).toBe(1);
  expect(days[0].games[0].winner).toBe('Bob');   // 2026-06-12 most recent
  expect(days[0].games[0].loser).toBe('Ann');
  expect(days[0].games[0].scoreStr).toBe(' · 10 pts');
  expect(days[1].games[0].winner).toBe('Ann');   // 2026-06-10
});
