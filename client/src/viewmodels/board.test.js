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

it('cell formats wwins as the wwinsStr string for the wwins sort', () => {
  // p1 won the Medium game (weight 1.0) -> wwinsStr '1.0'
  const vm = buildBoard(data, { ...ui, sorts: ['wwins'] }, new Date('2026-06-24T20:00:00'));
  expect(vm.rows[0]).toMatchObject({ pid: 'p1' });
  expect(vm.rows[0].cell).toMatchObject({ label: 'W.Wins', value: '1.0' });
});

it('pick reflects the most-recent play across all time, not the board period', () => {
  const d = {
    players: data.players,
    games: data.games,
    plays: [
      { id: 'a', g: 'g1', d: '2025-03-01T20:00', parts: [['p1', 1, 9], ['p2', 2, 1]] }, // in lastYear
      { id: 'b', g: 'g1', d: '2026-06-12T20:00', parts: [['p2', 1, 9], ['p1', 2, 1]] }, // most recent overall, NOT lastYear
    ],
  };
  const vm = buildBoard(d, { ...ui, period: 'lastYear' }, new Date('2026-06-24T20:00:00'));
  // board (lastYear) reflects only the 2025 play, where p1 won
  expect(vm.rows.find(r => r.pid === 'p1').wins).toBe(1);
  // but pick comes from the most-recent (2026) play -> worst finisher there is p1
  expect(vm.pick.pickPart[0]).toBe('p1');
});
