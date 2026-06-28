import { it, expect } from 'vitest';
import { buildHeadToHead } from './headToHead.js';

// Ann(p1) vs Bob(p2): 3 meetings (Ann 2, Bob 1). Ann vs Cy(p3): 1. Bob vs Cy: 0.
const data = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#1', c2: '#2' },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4' },
    { id: 'p3', name: 'Cy', c1: '#5', c2: '#6' },
  ],
  games: [
    { id: 'g1', name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' },
    { id: 'g2', name: 'Chess', tier: 'Heavy', dir: 'high', icon: '♟️' },
  ],
  plays: [
    { id: 'a', g: 'g1', d: '2026-01-05T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] }, // Ann beats Bob (Catan)
    { id: 'b', g: 'g1', d: '2026-02-05T20:00', parts: [['p2', 1, 55], ['p1', 2, 30]] }, // Bob beats Ann (Catan)
    { id: 'c', g: 'g2', d: '2026-03-05T20:00', parts: [['p1', 1, 9], ['p2', 2, 3]] },   // Ann beats Bob (Chess) — latest A/B meeting
    { id: 'd', g: 'g1', d: '2026-04-05T20:00', parts: [['p1', 1, 60], ['p3', 2, 20]] }, // Ann beats Cy
  ],
};
const now = new Date('2026-06-24T20:00:00');

it('h2h: defaults to the most-contested pair and computes the matchup', () => {
  const vm = buildHeadToHead(data, 'all', now, { a: null, b: null, slot: 'a' });
  expect(vm.ready).toBe(true);
  expect(vm.aCard.name).toBe('Ann');   // most-contested pair = Ann vs Bob (3 meetings)
  expect(vm.bCard.name).toBe('Bob');
  expect(vm.meetings).toBe(3);
  expect(vm.aWins).toBe(2);
  expect(vm.bWins).toBe(1);
  expect(vm.aPct).toBe(67);            // round(2/3*100)
  expect(vm.verdict).toMatch(/Ann leads/);
  expect(vm.lastTxt).toMatch(/Ann won · Chess · Mar 5/);
  // per-game breakdown sorted by most meetings first
  expect(vm.games.map(g => g.name)).toEqual(['Catan', 'Chess']);
  expect(vm.games[0]).toMatchObject({ a: 1, b: 1, m: 2 });
});

it('h2h: roster tags the two selected players A/B', () => {
  const vm = buildHeadToHead(data, 'all', now, { a: 'p1', b: 'p3', slot: 'a' });
  const byId = Object.fromEntries(vm.roster.map(r => [r.id, r]));
  expect(byId.p1.tag).toBe('A');
  expect(byId.p1.tagShow).toBe(true);
  expect(byId.p3.tag).toBe('B');
  expect(byId.p2.tagShow).toBe(false); // Bob not selected
  expect(vm.meetings).toBe(1);          // Ann vs Cy met once
});

it('h2h: two players who never met → ready but no meetings', () => {
  const vm = buildHeadToHead(data, 'all', now, { a: 'p2', b: 'p3', slot: 'a' });
  expect(vm.ready).toBe(true);
  expect(vm.hasMeetings).toBe(false);
  expect(vm.noMeetings).toBe(true);
  expect(vm.meetings).toBe(0);
});

it('h2h: respects the hall period window', () => {
  const pdata = {
    players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2' }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4' }],
    games: [{ id: 'g1', name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' }],
    plays: [
      { id: 'old', g: 'g1', d: '2023-01-05T20:00', parts: [['p1', 1, 50], ['p2', 2, 40]] },
      { id: 'new', g: 'g1', d: '2026-02-05T20:00', parts: [['p1', 1, 55], ['p2', 2, 30]] },
    ],
  };
  expect(buildHeadToHead(pdata, 'all', now, { a: 'p1', b: 'p2', slot: 'a' }).meetings).toBe(2);
  expect(buildHeadToHead(pdata, 'thisYear', now, { a: 'p1', b: 'p2', slot: 'a' }).meetings).toBe(1);
});
