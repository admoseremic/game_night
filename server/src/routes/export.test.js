import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { buildApp } from '../app.js';

function freshApp() {
  const db = openDb(':memory:');
  const hub = { add() {}, broadcast() {}, count: () => 0 };
  return buildApp({ db, hub });
}

test('GET /export returns a markdown digest with no-store', async () => {
  const app = freshApp();
  const res = await app.inject({ method: 'GET', url: '/export?month=2026-06' });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/markdown/);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(res.body, /# Game Night — Monthly Digest: June 2026/);
  assert.match(res.body, /No plays recorded in June 2026/); // empty db
});

test('GET /export reflects seeded plays in month sections', async () => {
  const app = freshApp();
  await app.inject({ method: 'POST', url: '/api/players',
    payload: { name: 'Ann', regular: true, c1: '#1', c2: '#2' } });
  const player = (await app.inject({ method: 'GET', url: '/api/state' })).json().players[0];
  await app.inject({ method: 'POST', url: '/api/games',
    payload: { name: 'Catan', tier: 'Medium', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  await app.inject({ method: 'POST', url: '/api/plays',
    payload: { g: game.id, d: '2026-06-15T20:00', parts: [[player.id, 1, 10]] } });
  const res = await app.inject({ method: 'GET', url: '/export?month=2026-06' });
  assert.match(res.body, /2026-06-15 — Catan: 1\. Ann \(10\)/);
  assert.match(res.body, /\| 1 \| Ann \| 1 \| 1 \| 1\.0 \| 100% \| 0 \|/);
  assert.match(res.body, /🆕 \*\*Catan\*\*: 10 by Ann on 2026-06-15/);
});

test('GET /export rejects malformed month with 400', async () => {
  const app = freshApp();
  for (const bad of ['2026-13', 'junk', '2026-6', '2026-06-01']) {
    const res = await app.inject({ method: 'GET', url: `/export?month=${bad}` });
    assert.equal(res.statusCode, 400, `month=${bad}`);
    assert.match(res.body, /YYYY-MM/);
  }
});

test('GET /export/:month (path form) serves the digest — query-strip-proof', async () => {
  const app = freshApp();
  const res = await app.inject({ method: 'GET', url: '/export/2026-06' });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/markdown/);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(res.body, /# Game Night — Monthly Digest: June 2026/);
  const bad = await app.inject({ method: 'GET', url: '/export/junk' });
  assert.equal(bad.statusCode, 400);
  assert.match(bad.body, /YYYY-MM/);
});

test('GET /llms.txt is plain text pointing at /export', async () => {
  const app = freshApp();
  const res = await app.inject({ method: 'GET', url: '/llms.txt' });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/plain/);
  assert.match(res.body, /gamenight\.trevorwithdata\.com\/export/);
  assert.match(res.body, /api\/state/);
});
