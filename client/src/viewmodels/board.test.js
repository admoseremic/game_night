import { it, expect } from 'vitest';
import { buildBoard } from './board.js';

const data = {
  players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
  games: [{ id: 'g1', name: 'G', tier: 'Medium', dir: 'high', icon: '🎲' }],
  plays: [{ id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, 10], ['p2', 2, 5]] }],
};
const ui = { period: 'month', sorts: ['wins'], custom: { start: '2026-01-01', end: '2026-12-31' }, absent: {} };

it('builds ranked rows with the active sort cell and a champ', () => {
  const vm = buildBoard(data, ui, new Date('2026-06-24T20:00:00'));
  expect(vm.empty).toBe(false);
  expect(vm.rows[0]).toMatchObject({ pid: 'p1', rank: 1 });
  expect(vm.rows[0].cell).toMatchObject({ label: 'Wins', value: 1 });
  expect(vm.champ.pid).toBe('p1');
});

it('empty when no plays in period', () => {
  const vm = buildBoard(data, { ...ui, period: 'lastYear' }, new Date('2026-06-24T20:00:00'));
  expect(vm.empty).toBe(true);
});
