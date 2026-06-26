import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './events.js';

// Fake reply.raw capturing writes and handlers
function fakeReply() {
  const chunks = [], handlers = {};
  return {
    raw: {
      write: (s) => { chunks.push(s); return true; },
      on: (event, fn) => { handlers[event] = fn; },
      emit: (event) => handlers[event]?.(),
      setHeader: () => {},
    },
    _chunks: chunks,
  };
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

test('add removes a client when its stream closes', () => {
  const hub = makeHub();
  const a = fakeReply();
  hub.add(a);
  assert.equal(hub.count(), 1);
  a.raw.emit('close');
  assert.equal(hub.count(), 0);
});

test('broadcast drops a client whose write throws', () => {
  const hub = makeHub();
  let writeCount = 0;
  const bad = { raw: { write: () => { writeCount++; if (writeCount > 1) throw new Error('dead'); return true; }, on: () => {}, setHeader: () => {} } };
  hub.add(bad);
  assert.equal(hub.count(), 1);
  hub.broadcast('changed');
  assert.equal(hub.count(), 0);
});
