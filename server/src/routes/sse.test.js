// sse.test.js — real-HTTP integration test for the SSE /api/events route.
// Verifies that a mutation (POST /api/players) broadcasts a "changed" frame
// to a live SSE client connected over a real socket.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb } from '../db.js';
import { makeHub } from '../events.js';
import { buildApp } from '../app.js';

test('SSE: a mutation broadcasts a changed frame to a live client', async () => {
  const app = buildApp({ db: openDb(':memory:'), hub: makeHub() });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address();
  // Keep a reference so we can destroy the SSE connection in the finally block,
  // preventing the event loop from hanging after app.close().
  let sseReq;
  try {
    const got = new Promise((resolve, reject) => {
      sseReq = http.get({ host: '127.0.0.1', port, path: '/api/events' }, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; if (buf.includes('event: changed')) resolve('changed'); });
        res.on('error', reject);
      });
      sseReq.on('error', reject);
      setTimeout(() => reject(new Error('timeout waiting for SSE changed frame')), 3000);
    });
    // Let the GET register as a client in the hub before triggering the mutation.
    await new Promise((r) => setTimeout(r, 150));
    const res = await app.inject({ method: 'POST', url: '/api/players', payload: { name: 'Z', regular: true, c1: '#1', c2: '#2' } });
    assert.equal(res.statusCode, 200);
    assert.equal(await got, 'changed');
  } finally {
    // Destroy the open SSE connection so app.close() can complete cleanly.
    if (sseReq) sseReq.destroy();
    await app.close();
  }
});
