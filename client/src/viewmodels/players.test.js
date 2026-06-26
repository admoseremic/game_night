import { it, expect } from 'vitest';
import { buildPlayersRoster } from './players.js';
const data = {
  players: [
    { id: 'p3', name: 'Zoe', c1: '#5', c2: '#6', regular: true },
    { id: 'p1', name: 'ann', c1: '#1', c2: '#2', regular: true },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true },
  ],
  games: [], plays: [],
};
it('players roster is sorted alphabetically by name', () => {
  const list = buildPlayersRoster(data, new Date('2026-06-24T20:00:00'));
  expect(list.map(p => p.name)).toEqual(['ann', 'Bob', 'Zoe']);
});
