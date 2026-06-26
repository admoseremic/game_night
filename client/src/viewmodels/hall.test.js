import { it, expect } from 'vitest';
import { buildHall } from './hall.js';

const data = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true },
  ],
  games: [{ id: 'g1', name: 'G', tier: 'Medium', dir: 'high', icon: '🎲' }],
  plays: [
    { id: 'a', g: 'g1', d: '2026-01-05T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] },
    { id: 'b', g: 'g1', d: '2026-02-05T20:00', parts: [['p1', 1, 55], ['p2', 2, 30]] },
    { id: 'c', g: 'g1', d: '2026-03-05T20:00', parts: [['p2', 1, 60], ['p1', 2, 20]] },
    { id: 'd', g: 'g1', d: '2026-04-05T20:00', parts: [['p1', 1, 45], ['p2', 2, 35]] },
    { id: 'e', g: 'g1', d: '2026-05-05T20:00', parts: [['p1', 1, 48], ['p2', 2, 33]] },
  ],
};
const now = new Date('2026-06-24T20:00:00');

it('builds champ, four milestones, rivalries, and trophy records', () => {
  const vm = buildHall(data, now);
  expect(vm.empty).toBe(false);
  expect(vm.champ).toBeTruthy();
  expect(vm.milestones.length).toBe(4);
  expect(vm.rivalries.length).toBeGreaterThanOrEqual(1); // p1 & p2 met 5 times
  expect(vm.records.length).toBe(1); // g1 has a scored record
});

it('empty hall for no data', () => {
  expect(buildHall({ players: [], games: [], plays: [] }, now).empty).toBe(true);
});
