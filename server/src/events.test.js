import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './events.js';

// Fake reply.raw capturing writes
function fakeReply() {
  const chunks = [];
  return { raw: { write: (s) => { chunks.push(s); return true; },
    on: () => {}, setHeader: () => {} }, _chunks: chunks };
}

test('broadcast writes a changed event to every client', () => {
  const hub = makeHub();
  const a = fakeReply(), b = fakeReply();
  hub.add(a); hub.add(b);
  assert.equal(hub.count(), 2);
  hub.broadcast('changed');
  const joined = a._chunks.join('');
  assert.match(joined, /event: changed/);
  assert.match(joined, /data: /);
  assert.match(b._chunks.join(''), /event: changed/);
});
