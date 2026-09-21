// ties.test.js — pure helpers behind the "＝ tie with row above" control in LogPlay.
// Ranks use competition ranking (1-2-2-4): a tied group shares the rank of its first member
// and the next untied row's rank is its 1-based list position.
import { it, expect } from 'vitest';
import { deriveRanks, tiesFromParts, moveUpWithTies, removeWithTies, winnersOf } from './ties.js';

it('deriveRanks: no ties → ranks are list positions', () => {
  expect(deriveRanks(['a', 'b', 'c'], {})).toEqual([1, 2, 3]);
});

it('deriveRanks: tied rows share the rank above and the next rank skips (1-2-2-4)', () => {
  expect(deriveRanks(['a', 'b', 'c', 'd'], { c: true })).toEqual([1, 2, 2, 4]);
});

it('deriveRanks: everyone tied → all rank 1', () => {
  expect(deriveRanks(['a', 'b', 'c'], { b: true, c: true })).toEqual([1, 1, 1]);
});

it('deriveRanks: a tie flag on the first row is ignored (nothing above it)', () => {
  expect(deriveRanks(['a', 'b'], { a: true })).toEqual([1, 2]);
});

it('tiesFromParts: flags a player whose rank equals the previous player in rank order', () => {
  const parts = [['p4', 4, null], ['p1', 1, 42], ['p3', 2, 30], ['p2', 2, 30]];
  expect(tiesFromParts(parts)).toEqual({ p2: true }); // sorted by rank: p1(1) p3(2) p2(2) p4(4) → only p2 tied above
});

it('moveUpWithTies: swaps with the row above and clears ties on both swapped players and the one now below', () => {
  const r = moveUpWithTies(['a', 'b', 'c', 'd'], { b: true, c: true, d: true }, 'c');
  expect(r.order).toEqual(['a', 'c', 'b', 'd']);
  expect(r.ties).toEqual({}); // b, c cleared (swapped); d cleared (now below a new neighbour)
});

it('moveUpWithTies: first row cannot move and nothing changes', () => {
  const r = moveUpWithTies(['a', 'b'], { b: true }, 'a');
  expect(r.order).toEqual(['a', 'b']);
  expect(r.ties).toEqual({ b: true });
});

it('removeWithTies: drops the player and clears their flag plus the flag of the row below', () => {
  const r = removeWithTies(['a', 'b', 'c', 'd'], { b: true, c: true, d: true }, 'b');
  expect(r.order).toEqual(['a', 'c', 'd']);
  expect(r.ties).toEqual({ d: true }); // b gone, c cleared (would attach to a), d untouched
});

it('winnersOf: every rank-1 part wins; beaten is players minus winners', () => {
  const parts = [['a', 1, 9], ['b', 1, 9], ['c', 3, 2]];
  expect(winnersOf(parts)).toEqual({ pids: ['a', 'b'], beaten: 1 });
});

it('winnersOf: everyone tied → all win, beaten 0', () => {
  expect(winnersOf([['a', 1, null], ['b', 1, null]])).toEqual({ pids: ['a', 'b'], beaten: 0 });
});
