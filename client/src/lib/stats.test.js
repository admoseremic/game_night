import { describe, it, expect } from 'vitest';
import { weight, leaderboard, recordFor, currentStreak, computePick, inPeriod } from './stats.js';

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

it('weight maps tiers', () => {
  expect(weight('Light')).toBe(0.5); expect(weight('Medium')).toBe(1.0); expect(weight('Heavy')).toBe(1.5);
});

it('leaderboard aggregates wins, plays, beat, wwins, winPct', () => {
  const lb = leaderboard(data, data.plays, 'wins');
  const byId = Object.fromEntries(lb.map(e => [e.pid, e]));
  expect(byId.p1).toMatchObject({ wins: 1, plays: 2, beat: 2, winPct: 50 });
  expect(byId.p2).toMatchObject({ wins: 1, plays: 2, beat: 2, winPct: 50 });
  expect(byId.p3).toMatchObject({ wins: 0, plays: 1, beat: 0, winPct: 0 });
  expect(byId.p1.wwinsStr).toBe('0.5'); // win in Light
  expect(byId.p2.wwinsStr).toBe('1.5'); // win in Heavy
  expect(lb[0].rank).toBe(1);
});

it('recordFor respects direction (high=max, low=min)', () => {
  expect(recordFor(data, 'g1')).toMatchObject({ pid: 'p1', score: 50 });
  expect(recordFor(data, 'g2')).toMatchObject({ pid: 'p2', score: 10 });
});

it('currentStreak counts consecutive most-recent wins', () => {
  expect(currentStreak(data.plays, 'p1')).toBe(0); // latest play p1 came 2nd
  expect(currentStreak(data.plays, 'p2')).toBe(1); // latest play p2 won, prior lost
});

it('computePick returns worst finisher of most-recent play, cascading on absent', () => {
  expect(computePick(data, data.plays, {}).pickPart[0]).toBe('p1'); // x2 worst finisher
  expect(computePick(data, data.plays, { p1: true }).pickPart[0]).toBe('p2');
});

it('inPeriod month filter', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(inPeriod({ d: '2026-06-10T20:00' }, 'month', now)).toBe(true);
  expect(inPeriod({ d: '2026-05-10T20:00' }, 'month', now)).toBe(false);
  expect(inPeriod({ d: '2026-05-10T20:00' }, 'all', now)).toBe(true);
});
