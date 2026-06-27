import { it, expect } from 'vitest';
import { weight, leaderboard, recordFor, recordFromPlays, currentStreak, computePick, inPeriod, periodPlays } from './stats.js';

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

it('recordFor ignores null scores (excluded from records)', () => {
  const d = {
    players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
    games: [{ id: 'g1', name: 'G', tier: 'Light', dir: 'high', icon: '🔷' }],
    plays: [{ id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, null], ['p2', 2, 25]] }],
  };
  // p1 won but logged no score (null) — must be ignored; record is p2's 25
  expect(recordFor(d, 'g1')).toMatchObject({ pid: 'p2', score: 25 });
});

it('recordFromPlays computes the record over a given plays subset (direction-aware)', () => {
  // data fixture is already defined at top of this file (g1 high, g2 low, plays x1/x2)
  // x1: g1 high, p1=50,p2=40,p3=30 -> record 50. Restrict to empty subset -> null.
  expect(recordFromPlays(data, 'g1', data.plays)).toMatchObject({ pid: 'p1', score: 50 });
  expect(recordFromPlays(data, 'g1', [])).toBe(null);
  expect(recordFromPlays(data, 'g2', data.plays)).toMatchObject({ pid: 'p2', score: 10 }); // low
});

it('leaderboard sorts by beat with wwins tiebreak', () => {
  // p1 beat=2 wwins=0.5, p2 beat=2 wwins=1.5, p3 beat=0 — tie on beat broken by wwins desc
  const lb = leaderboard(data, data.plays, 'beat', 'wwins');
  expect(lb.map(e => e.pid)).toEqual(['p2', 'p1', 'p3']);
});

it('inPeriod prevMonth / ytd / lastYear / custom branches', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(inPeriod({ d: '2026-05-10T20:00' }, 'prevMonth', now)).toBe(true);
  expect(inPeriod({ d: '2026-06-10T20:00' }, 'prevMonth', now)).toBe(false);
  expect(inPeriod({ d: '2026-01-05T20:00' }, 'ytd', now)).toBe(true);
  expect(inPeriod({ d: '2025-12-31T20:00' }, 'ytd', now)).toBe(false);
  expect(inPeriod({ d: '2025-06-10T20:00' }, 'lastYear', now)).toBe(true);
  expect(inPeriod({ d: '2026-03-15T20:00' }, 'custom', now, { start: '2026-03-01', end: '2026-03-31' })).toBe(true);
  expect(inPeriod({ d: '2026-04-01T20:00' }, 'custom', now, { start: '2026-03-01', end: '2026-03-31' })).toBe(false);
});

it('inPeriod prevMonth handles January year-rollover', () => {
  const now = new Date('2026-01-15T20:00:00');
  expect(inPeriod({ d: '2025-12-20T20:00' }, 'prevMonth', now)).toBe(true);
  expect(inPeriod({ d: '2026-01-10T20:00' }, 'prevMonth', now)).toBe(false);
});

it('periodPlays filters plays by period', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(periodPlays(data.plays, 'month', now).length).toBe(2);
  expect(periodPlays(data.plays, 'lastYear', now).length).toBe(0);
});
