import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { makeHub } from '../events.js';
import { buildApp } from '../app.js';

function freshApp() {
  const db = openDb(':memory:');
  let broadcasts = 0;
  const hub = { add() {}, broadcast() { broadcasts++; }, count: () => 0 };
  const app = buildApp({ db, hub });
  return { app, db, getBroadcasts: () => broadcasts };
}

test('empty state has three empty arrays', async () => {
  const { app } = freshApp();
  const res = await app.inject({ method: 'GET', url: '/api/state' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { players: [], games: [], plays: [] });
});

test('create player returns it and shows in state with boolean regular', async () => {
  const { app, getBroadcasts } = freshApp();
  const res = await app.inject({ method: 'POST', url: '/api/players',
    payload: { name: 'Ann', regular: true, c1: '#1', c2: '#2' } });
  assert.equal(res.statusCode, 200);
  const p = res.json();
  assert.equal(p.name, 'Ann'); assert.equal(p.regular, true); assert.ok(p.id);
  const state = (await app.inject({ method: 'GET', url: '/api/state' })).json();
  assert.equal(state.players.length, 1);
  assert.equal(state.players[0].regular, true);
  assert.ok(getBroadcasts() >= 1);
});

test('create + fetch play round-trips parts and uses g/d keys', async () => {
  const { app } = freshApp();
  await app.inject({ method: 'POST', url: '/api/games',
    payload: { name: 'G', tier: 'Light', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  const res = await app.inject({ method: 'POST', url: '/api/plays',
    payload: { g: game.id, d: '2026-06-01T20:00', parts: [['x', 1, 42], ['y', 2, null]] } });
  assert.equal(res.statusCode, 200);
  const state = (await app.inject({ method: 'GET', url: '/api/state' })).json();
  assert.equal(state.plays.length, 1);
  assert.equal(state.plays[0].g, game.id);
  assert.equal(state.plays[0].d, '2026-06-01T20:00');
  assert.deepEqual(state.plays[0].parts, [['x', 1, 42], ['y', 2, null]]);
});

test('delete play removes it', async () => {
  const { app } = freshApp();
  await app.inject({ method: 'POST', url: '/api/games', payload: { name: 'G', tier: 'Light', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  const play = (await app.inject({ method: 'POST', url: '/api/plays', payload: { g: game.id, d: '2026-06-01T20:00', parts: [['x', 1, 1]] } })).json();
  await app.inject({ method: 'DELETE', url: `/api/plays/${play.id}` });
  const state = (await app.inject({ method: 'GET', url: '/api/state' })).json();
  assert.equal(state.plays.length, 0);
});

test('rejects play with duplicate player', async () => {
  const { app } = freshApp();
  await app.inject({ method: 'POST', url: '/api/games', payload: { name: 'G', tier: 'Light', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  const res = await app.inject({ method: 'POST', url: '/api/plays',
    payload: { g: game.id, d: '2026-06-01T20:00', parts: [['x', 1, 1], ['x', 2, 2]] } });
  assert.equal(res.statusCode, 400);
});

test('rejects play with a non-numeric (null) rank', async () => {
  const { app } = freshApp();
  await app.inject({ method: 'POST', url: '/api/games', payload: { name: 'G', tier: 'Light', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  const res = await app.inject({ method: 'POST', url: '/api/plays',
    payload: { g: game.id, d: '2026-06-01T20:00', parts: [['x', null, 1]] } });
  assert.equal(res.statusCode, 400);
});

test('rejects PATCH play with duplicate player', async () => {
  const { app } = freshApp();
  await app.inject({ method: 'POST', url: '/api/games', payload: { name: 'G', tier: 'Light', dir: 'high', icon: '🎲' } });
  const game = (await app.inject({ method: 'GET', url: '/api/state' })).json().games[0];
  const play = (await app.inject({ method: 'POST', url: '/api/plays',
    payload: { g: game.id, d: '2026-06-01T20:00', parts: [['x', 1, 1], ['y', 2, 2]] } })).json();
  const res = await app.inject({ method: 'PATCH', url: `/api/plays/${play.id}`,
    payload: { parts: [['x', 1, 1], ['x', 2, 2]] } });
  assert.equal(res.statusCode, 400);
});
