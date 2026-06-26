import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';

test('openDb creates the three tables with expected columns', () => {
  const db = openDb(':memory:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
  assert.deepEqual(tables, ['games', 'players', 'plays']);
  const playCols = db.prepare("PRAGMA table_info(plays)").all().map(c => c.name);
  assert.deepEqual(playCols, ['id', 'game_id', 'played_at', 'parts']);
});

test('plays.parts round-trips as JSON', () => {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO games(id,name,tier,dir,icon) VALUES('g1','G','Light','high','🎲')").run();
  db.prepare("INSERT INTO plays(id,game_id,played_at,parts) VALUES('p1','g1','2026-06-01T20:00', ?)")
    .run(JSON.stringify([['x', 1, 42], ['y', 2, null]]));
  const row = db.prepare("SELECT parts FROM plays WHERE id='p1'").get();
  assert.deepEqual(JSON.parse(row.parts), [['x', 1, 42], ['y', 2, null]]);
});
