// TZ pinned BEFORE any Date use: months must bucket exactly like the app
// (stats.js does new Date(play.d) + getMonth() in local time; the production
// container runs TZ=America/Denver, same as the players).
process.env.TZ = 'America/Denver';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDigest, prevMonthOf, MONTH_RE, digestHtmlFragment } from './export-digest.js';

// Fixture mirrors mcp-tools.test.js plus x5, and uses production-shaped dates:
// app-created plays are zoneless local ('...T20:00'); migrated plays are UTC
// instants ('...T03:34:00.000Z') that can fall on the previous LOCAL day.
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
    // Prior-year play: must appear in NO 2026 section (proves the YTD year cut).
    { id: 'x0', g: 'g1', d: '2025-12-14T20:00', parts: [['p2', 1, 90], ['p3', 2, 40]] },
    { id: 'x1', g: 'g1', d: '2026-05-10T20:00', parts: [['p1', 1, 80], ['p2', 2, 70]] },
    // Stored as June 1 UTC but played May 31 evening in Denver → belongs to MAY.
    { id: 'x5', g: 'g1', d: '2026-06-01T03:34:00.000Z', parts: [['p2', 1, 60], ['p3', 2, 50]] },
    { id: 'x2', g: 'g2', d: '2026-06-02T20:00', parts: [['p2', 1, 120], ['p1', 2, 100], ['p3', 3, 90]] },
    { id: 'x3', g: 'g3', d: '2026-06-20T20:00', parts: [['p1', 1, 12], ['p2', 2, 20]] },
    { id: 'x4', g: 'g1', d: '2026-06-28T20:00', parts: [['p1', 1, 95], ['p3', 2, null]] },
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
  // No full per-game all-time records dump (161 games = noise; user cut it).
  assert.ok(!june.includes('## All-time records (best score per game)'));
});

test('YTD leaderboard covers Jan..month of the digest year, replacing all-time', () => {
  const june = renderDigest(data, { month: '2026-06' });
  assert.match(june, /## 2026 year-to-date leaderboard \(through June\)/);
  // Sam YTD (x1 loss, x5 win, x2 win, x3 loss): the Dec-2025 x0 win must NOT
  // count — with it he'd show 5 plays / 3 wins.
  assert.match(june, /\| 2 \| Sam \| 4 \| 2 \| 2\.5 \| 50% \| 2 \|/);
  assert.ok(!june.includes('## All-time leaderboard'));
});

test('empty month renders placeholders but keeps YTD section', () => {
  const md = renderDigest(data, { month: '2026-04' });
  assert.match(md, /No plays recorded in April 2026\./);
  // No 2026 plays exist through April (May is the first) → YTD placeholder too.
  assert.match(md, /## 2026 year-to-date leaderboard \(through April\)\n\nNo plays recorded in 2026 up to April\./);
});

test('current win streaks lists only streaks of 2+', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /- Trevor: 2 wins in a row/); // won x3+x4 after losing x2
  assert.ok(!/- Sam:/.test(md)); // Sam last played x3 with rank 2 → streak 0
});

test('UTC-stored evening play buckets into its LOCAL month, like the app', () => {
  const june = renderDigest(data, { month: '2026-06' });
  // x5 (June 1 03:34 UTC = May 31 evening Denver) must NOT appear in June...
  assert.ok(!june.includes('1. Sam (60)'), 'x5 leaked into the June play log');
  assert.match(june, /## June 2026 play log \(3 plays\)/);
  // ...and must appear in May, displayed with its LOCAL date.
  const may = renderDigest(data, { month: '2026-05' });
  assert.match(may, /- 2026-05-31 — Wingspan: 1\. Sam \(60\) · 2\. Jo \(50\)/);
  assert.match(may, /## May 2026 play log \(2 plays\)/);
  // May leaderboard now counts Sam's x5 win alongside his x1 loss:
  // 2 plays, 1 win (Medium → 1.0 weighted), 50%, 1 last place.
  assert.match(may, /\| Sam \| 2 \| 1 \| 1\.0 \| 50% \| 1 \|/);
});

test('footer documents ?month and /api/state for the LLM', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /\/export\?month=YYYY-MM/);
  assert.match(md, /\/api\/state/);
});

test('digestHtmlFragment: hidden div, prevMonth content, HTML-escaped names', () => {
  // A game name with markup characters must arrive escaped and inert.
  const spiky = {
    ...data,
    games: data.games.map(g => (g.id === 'g2' ? { ...g, name: 'Brass <& Sons>' } : g)),
  };
  const frag = digestHtmlFragment(spiky, { now: new Date('2026-07-06T12:00:00') });
  assert.match(frag, /^<div style="display:none" aria-hidden="true">\n/);
  assert.match(frag, /\n<\/div>$/);
  assert.match(frag, /Monthly Digest: June 2026/); // prevMonth of the fixed now
  assert.ok(frag.includes('Brass &lt;&amp; Sons&gt;'), 'markup in names is escaped');
  // Nothing between the wrapper tags may contain raw angle brackets.
  const body = frag.replace(/^<div[^>]*>\n/, '').replace(/\n<\/div>$/, '');
  assert.ok(!/[<>]/.test(body), 'fragment body is inert text');
});
