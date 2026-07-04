import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { makeHub } from './events.js';
import { buildApp } from './app.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

test('MCP over HTTP: handshake, list tools, call a tool', async () => {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO players (id,name,regular,c1,c2) VALUES ('p1','Trevor',1,'#a','#b')").run();
  db.prepare("INSERT INTO games (id,name,tier,dir,icon) VALUES ('g1','Wingspan','Medium','high','x')").run();
  db.prepare("INSERT INTO plays (id,game_id,played_at,parts) VALUES ('x1','g1','2026-06-01','[[\"p1\",1,80]]')").run();
  const app = buildApp({ db, hub: makeHub() });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const url = new URL(`http://127.0.0.1:${app.server.address().port}/mcp`);
  const client = new Client({ name: 'plan-test', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), [
    'get_head_to_head', 'get_leaderboard', 'get_overview', 'get_player_stats', 'get_plays', 'get_records',
  ]);
  const res = await client.callTool({ name: 'get_overview', arguments: {} });
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.totalPlays, 1);
  const err = await client.callTool({ name: 'get_player_stats', arguments: { player: 'Nobody' } });
  assert.equal(err.isError, true);
  await client.close();
  await app.close();
});
