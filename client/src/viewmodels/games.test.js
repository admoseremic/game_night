import { it, expect } from 'vitest';
import { buildGamesList, buildGamesSummary } from './games.js';
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

// ─── buildGamesSummary (period-scoped activity report) ───
// Fixed "now" inside June 2026 so 'month' = June, 'all' = everything.
const NOW = new Date('2026-06-28T12:00:00');
const summaryData = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#a1', c2: '#a2' },
    { id: 'p2', name: 'Bob', c1: '#b1', c2: '#b2' },
  ],
  games: [
    { id: 'g1', name: 'Catan', tier: 'Heavy', dir: 'high', icon: '🌾' },
    { id: 'g2', name: 'Golf',  tier: 'Light', dir: 'low',  icon: '⛳' }, // dir:low → record is LOWEST score
    { id: 'g3', name: 'Chess', tier: 'Heavy', dir: 'high', icon: '♟️' }, // never played → excluded
  ],
  plays: [
    // Catan: 3 plays in June. Ann wins twice (incl. the record 12), Bob once.
    { id: 'x1', g: 'g1', d: '2026-06-01T20:00:00', parts: [['p1', 1, 10], ['p2', 2, 5]] },
    { id: 'x2', g: 'g1', d: '2026-06-10T20:00:00', parts: [['p2', 1, 8],  ['p1', 2, 3]] },
    { id: 'x3', g: 'g1', d: '2026-06-20T20:00:00', parts: [['p1', 1, 12], ['p2', 2, 4]] },
    // Golf: 1 play in MAY (outside 'month'). dir:low → record is the lowest score (2).
    { id: 'x4', g: 'g2', d: '2026-05-15T20:00:00', parts: [['p2', 1, 2],  ['p1', 2, 7]] },
  ],
};
const allUi = { period: 'all', custom: { start: '2026-01-01', end: '2026-12-31' } };

it('summary excludes never-played games and sorts by plays desc', () => {
  const rows = buildGamesSummary(summaryData, allUi, NOW);
  expect(rows.map(r => r.id)).toEqual(['g1', 'g2']); // g3 excluded; g1 (3 plays) before g2 (1 play)
});

it('summary pluralizes the plays label', () => {
  const rows = buildGamesSummary(summaryData, allUi, NOW);
  expect(rows.find(r => r.id === 'g1').plays).toBe(3);
  expect(rows.find(r => r.id === 'g1').playsLabel).toBe('plays');
  expect(rows.find(r => r.id === 'g2').plays).toBe(1);
  expect(rows.find(r => r.id === 'g2').playsLabel).toBe('play');
});

it('summary record is direction-aware (high=max, low=min)', () => {
  const rows = buildGamesSummary(summaryData, allUi, NOW);
  expect(rows.find(r => r.id === 'g1').recScore).toBe(12); // dir:high → highest
  expect(rows.find(r => r.id === 'g1').recLabel).toBe('12 best');
  expect(rows.find(r => r.id === 'g2').recScore).toBe(2);  // dir:low → lowest
});

it('summary shows "no scores" when no scores were entered', () => {
  const noScoreData = {
    players: summaryData.players,
    games: [{ id: 'g1', name: 'Catan', tier: 'Heavy', dir: 'high', icon: '🌾' }],
    plays: [{ id: 'y1', g: 'g1', d: '2026-06-05T20:00:00', parts: [['p1', 1, null], ['p2', 2, null]] }],
  };
  const rows = buildGamesSummary(noScoreData, allUi, NOW);
  expect(rows[0].recScore).toBe(null);
  expect(rows[0].recLabel).toBe('no scores');
});

it('summary lists ALL winners, most wins first', () => {
  const rows = buildGamesSummary(summaryData, allUi, NOW);
  const winners = rows.find(r => r.id === 'g1').winners;
  expect(winners.map(w => w.name)).toEqual(['Ann', 'Bob']); // Ann 2 wins, Bob 1
  expect(winners[0].wins).toBe(2);
  expect(winners[1].wins).toBe(1);
  expect(winners[0].initials).toBe('A');
  expect(winners[0].c1).toBe('#a1'); // carries avatar gradient stops
});

it('summary breaks winner ties by most-recent win', () => {
  const tieData = {
    players: summaryData.players,
    games: [{ id: 'g1', name: 'Catan', tier: 'Heavy', dir: 'high', icon: '🌾' }],
    plays: [
      { id: 't1', g: 'g1', d: '2026-06-01T20:00:00', parts: [['p1', 1, 5], ['p2', 2, 3]] }, // Ann wins (earlier)
      { id: 't2', g: 'g1', d: '2026-06-15T20:00:00', parts: [['p2', 1, 6], ['p1', 2, 4]] }, // Bob wins (later)
    ],
  };
  const winners = buildGamesSummary(tieData, allUi, NOW)[0].winners;
  // Both have 1 win; Bob's win is more recent → Bob first.
  expect(winners.map(w => w.name)).toEqual(['Bob', 'Ann']);
});

it('summary respects the shared period (month excludes the May play)', () => {
  const rows = buildGamesSummary(summaryData, { period: 'month', custom: allUi.custom }, NOW);
  expect(rows.map(r => r.id)).toEqual(['g1']); // Golf's only play was in May → excluded this month
});
