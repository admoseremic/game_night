import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPlayer, mapGame, mapPlay, NEWPAL } from './migrate-firestore-to-sqlite.mjs';

test('mapPlayer assigns palette by index and defaults regular true', () => {
  const p = mapPlayer({ id: 'abc', data: () => ({ name: 'Ann' }) }, 0, NEWPAL);
  assert.equal(p.id, 'abc'); assert.equal(p.name, 'Ann'); assert.equal(p.regular, 1);
  assert.equal(p.c1, NEWPAL[0][0]); assert.equal(p.c2, NEWPAL[0][1]);
});

test('mapGame derives dir from hi_score_wins and defaults tier/icon', () => {
  assert.equal(mapGame({ id: 'g', data: () => ({ name: 'X', hi_score_wins: false }) }).dir, 'low');
  const g = mapGame({ id: 'g', data: () => ({ name: 'X', hi_score_wins: true }) });
  assert.equal(g.dir, 'high'); assert.equal(g.tier, 'Medium'); assert.equal(g.icon, '🎲');
});

test('mapPlay converts timestamp and builds parts, dropping players_beaten', () => {
  const doc = { id: 'p1', data: () => ({
    game: 'g1', dateTime: { toDate: () => new Date('2026-06-01T20:00:00Z') },
    players: [{ player: 'x', rank: 1, score: 42, players_beaten: 2 }, { player: 'y', rank: 2, score: null }],
  }) };
  const play = mapPlay(doc);
  assert.equal(play.game_id, 'g1');
  assert.equal(play.played_at, '2026-06-01T20:00:00.000Z');
  assert.deepEqual(JSON.parse(play.parts), [['x', 1, 42], ['y', 2, null]]);
});
