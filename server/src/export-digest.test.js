import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDigest, prevMonthOf, MONTH_RE } from './export-digest.js';

// Same fixture as mcp-tools.test.js: 3 players, 3 games (incl. dir:'low'), plays over two months.
const data = {
  players: [
    { id: 'p1', name: 'Trevor', regular: true, c1: '#a', c2: '#b' },
    { id: 'p2', name: 'Sam', regular: true, c1: '#c', c2: '#d' },
    { id: 'p3', name: 'Jo', regular: false, c1: '#e', c2: '#f' },
  ],
  games: [
    { id: 'g1', name: 'Wingspan', tier: 'Medium', dir: 'high', icon: '🐦' },
    { id: 'g2', name: 'Brass', tier: 'Heavy', dir: 'high', icon: '🏭' },
    { id: 'g3', name: 'Golf', tier: 'Light', dir: 'low', icon: '⛳' },
  ],
  plays: [
    { id: 'x1', g: 'g1', d: '2026-05-10', parts: [['p1', 1, 80], ['p2', 2, 70]] },
    { id: 'x2', g: 'g2', d: '2026-06-02', parts: [['p2', 1, 120], ['p1', 2, 100], ['p3', 3, 90]] },
    { id: 'x3', g: 'g3', d: '2026-06-20', parts: [['p1', 1, 12], ['p2', 2, 20]] },
    { id: 'x4', g: 'g1', d: '2026-06-28', parts: [['p1', 1, 95], ['p3', 2, null]] },
  ],
};

test('prevMonthOf handles mid-year and January', () => {
  assert.equal(prevMonthOf(new Date('2026-07-06T12:00:00')), '2026-06');
  assert.equal(prevMonthOf(new Date('2027-01-15T12:00:00')), '2026-12');
});

test('MONTH_RE accepts YYYY-MM only', () => {
  assert.ok(MONTH_RE.test('2026-06'));
  assert.ok(!MONTH_RE.test('2026-13'));
  assert.ok(!MONTH_RE.test('2026-6'));
  assert.ok(!MONTH_RE.test('2026-06-01'));
  assert.ok(!MONTH_RE.test('junk'));
});

test('defaults to the previous calendar month', () => {
  const md = renderDigest(data, { now: new Date('2026-07-06T12:00:00') });
  assert.match(md, /Monthly Digest: June 2026/);
});

test('month play log is chronological and omits null scores', () => {
  const md = renderDigest(data, { month: '2026-06' });
  const brass = md.indexOf('2026-06-02 — Brass');
  const golf = md.indexOf('2026-06-20 — Golf');
  const wing = md.indexOf('2026-06-28 — Wingspan');
  assert.ok(brass > -1 && brass < golf && golf < wing, 'oldest → newest');
  assert.match(md, /1\. Trevor \(95\) · 2\. Jo\n/); // Jo's null score → no parens
});

test('month leaderboard matches stats.js weighted wins', () => {
  const md = renderDigest(data, { month: '2026-06' });
  // June: Trevor plays x2/x3/x4, wins Golf (0.5) + Wingspan (1.0) → 1.5 wwins, 67%
  assert.match(md, /\| 1 \| Trevor \| 3 \| 2 \| 1\.5 \| 67% \| 0 \|/);
});

test('records broken in the month are flagged NEW, absent otherwise', () => {
  const june = renderDigest(data, { month: '2026-06' });
  assert.match(june, /🆕 \*\*Wingspan\*\*: 95 by Trevor on 2026-06-28/);
  assert.match(june, /🆕 \*\*Golf\*\*: 12 by Trevor on 2026-06-20/);
  const may = renderDigest(data, { month: '2026-05' });
  assert.match(may, /## All-time records broken in May 2026\n\nNone\./);
});

test('empty month renders placeholder but keeps all-time sections', () => {
  const md = renderDigest(data, { month: '2026-04' });
  assert.match(md, /No plays recorded in April 2026\./);
  assert.match(md, /## All-time leaderboard/);
  assert.match(md, /\*\*Golf\*\* \(Light, lowest score wins\): 12 — Trevor, 2026-06-20/);
});

test('current win streaks lists only streaks of 2+', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /- Trevor: 2 wins in a row/); // won x3+x4 after losing x2
  assert.ok(!/- Sam:/.test(md)); // Sam last played x3 with rank 2 → streak 0
});

test('footer documents ?month and /api/state for the LLM', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /\/export\?month=YYYY-MM/);
  assert.match(md, /\/api\/state/);
});
