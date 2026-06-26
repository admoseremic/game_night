import { it, expect } from 'vitest';
import { buildGamesList } from './games.js';
const data = {
  players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }],
  games: [
    { id: 'g2', name: 'Banana', tier: 'Light', dir: 'high', icon: '🍌' },
    { id: 'g1', name: 'apple', tier: 'Light', dir: 'high', icon: '🍎' },
    { id: 'g3', name: 'Cherry', tier: 'Light', dir: 'high', icon: '🍒' },
  ],
  plays: [],
};
it('games list is sorted alphabetically by name (case-insensitive)', () => {
  const list = buildGamesList(data, '', new Date('2026-06-24T20:00:00'));
  expect(list.map(g => g.name)).toEqual(['apple', 'Banana', 'Cherry']);
});
