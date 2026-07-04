import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leaderboard, periodPlays } from '../../client/src/lib/stats.js';
import * as tools from './mcp-tools.js';

// Fixture: 3 players, 3 games (incl. a dir:'low' game), plays spanning two months.
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

test('getOverview counts and date range', () => {
  const o = tools.getOverview(data);
  assert.equal(o.totalPlays, 4);
  assert.equal(o.firstPlay, '2026-05-10');
  assert.equal(o.lastPlay, '2026-06-28');
  assert.equal(o.players.length, 3);
  assert.equal(o.players[0].c1, undefined); // UI colors stripped
});

test('getPlays filters by player+since, newest first, resolves names', () => {
  const r = tools.getPlays(data, { player: 'trevor', since: '2026-06-01' });
  assert.equal(r.count, 3);
  assert.equal(r.plays[0].date, '2026-06-28');
  assert.equal(r.plays[0].game, 'Wingspan');
  assert.deepEqual(r.plays[0].results[0], { player: 'Trevor', rank: 1, score: 95 });
});

test('getPlays unknown game throws ToolError listing names', () => {
  assert.throws(() => tools.getPlays(data, { game: 'Catan' }),
    (e) => e instanceof tools.ToolError && /Wingspan/.test(e.message));
});

test('getLeaderboard parity with client stats.js and no UI fields', () => {
  const r = tools.getLeaderboard(data, { period: 'all', sort: 'wins' });
  const expected = leaderboard(data, periodPlays(data.plays, 'all', new Date()), 'wins');
  assert.equal(r.standings.length, expected.length);
  r.standings.forEach((row, i) => {
    assert.equal(row.name, expected[i].name);
    assert.equal(row.wins, expected[i].wins);
    assert.equal(row.wwins, expected[i].wwins);
    assert.equal(row.winPct, expected[i].winPct);
    assert.equal(row.c1, undefined);
    assert.equal(row.initials, undefined);
  });
});

test('getLeaderboard rejects a bogus period', () => {
  assert.throws(() => tools.getLeaderboard(data, { period: 'fortnight' }),
    (e) => e instanceof tools.ToolError);
});

test('getRecords honors low direction and skips unscored games', () => {
  const r = tools.getRecords(data, {});
  const golf = r.records.find(x => x.game === 'Golf');
  assert.equal(golf.holder, 'Trevor');
  assert.equal(golf.score, 12); // lower is better for Golf
  const wingspan = r.records.find(x => x.game === 'Wingspan');
  assert.equal(wingspan.score, 95);
});

test('getPlayerStats aggregates wins, weighted wins, streak, per-game best', () => {
  const r = tools.getPlayerStats(data, { player: 'Trevor' });
  assert.equal(r.plays, 4);
  assert.equal(r.wins, 3);            // x1, x3, x4
  assert.equal(r.weightedWins, 2.5);  // 1.0 + 0.5 + 1.0
  assert.equal(r.currentStreak, 2);   // x3, x4 after losing x2
  const golf = r.perGame.find(x => x.game === 'Golf');
  assert.equal(golf.best, 12);
});

test('getHeadToHead tallies shared plays with lower-rank-wins', () => {
  const r = tools.getHeadToHead(data, { playerA: 'Trevor', playerB: 'Sam' });
  assert.equal(r.meetings, 3);        // x1, x2, x3 (not x4)
  assert.equal(r.aWins, 2);
  assert.equal(r.bWins, 1);
  assert.match(r.verdict, /Trevor leads/);
  assert.equal(r.lastMeeting.game, 'Golf');
});

test('getHeadToHead rejects identical players', () => {
  assert.throws(() => tools.getHeadToHead(data, { playerA: 'Jo', playerB: 'jo' }),
    (e) => e instanceof tools.ToolError);
});
