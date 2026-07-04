# Game Night MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remote read-only MCP endpoint at `POST /mcp` on the existing Fastify server, exposing six tools whose numbers come from the client's own `stats.js`.

**Architecture:** `readState(db)` (extracted from the `/api/state` route) feeds pure tool functions in `server/src/mcp-tools.js`; `server/src/routes/mcp.js` wires them to a stateless Streamable-HTTP `McpServer` created per request. Docker runtime image gains one COPY so the client `stats.js` import resolves in the container.

**Tech Stack:** `@modelcontextprotocol/sdk` + `zod` (new server deps), Node 20 `node:test`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-mcp-server-design.md`. INVARIANT: `/mcp` gets read-only tools ONLY; no auth by design (data already public via `/api/state`).
- Stat invariants (CLAUDE.md): lower rank = better; tier weights Light 0.5 / Medium 1.0 / Heavy 1.5; record direction per-game (`dir:'high'|'low'`); scores nullable; plays `{id,g,d,parts}` with `parts` = `[[playerId,rank,scoreOrNull],…]`.
- Import path from `server/src/*` to client stats: `../../client/src/lib/stats.js`. Never import client viewmodels (UI-flavored).
- Test bootstrap pattern (matches `routes.test.js`): `openDb(':memory:')` + `buildApp({db, hub})` + `app.inject`; run with `cd server && npm test`.
- Deploy is manual: `git push` + `./deploy.sh`. Nothing auto-deploys.
- Periods everywhere: `month|prevMonth|ytd|lastYear|all`; leaderboard sorts: `wins|wwins|winPct|plays|losses|beat|beatPer`.

---

### Task 1: Extract `readState(db)` and refactor the state route

**Files:**
- Create: `server/src/read-state.js`
- Modify: `server/src/routes/state.js`

**Interfaces:**
- Produces: `readState(db) → {players, games, plays}` — exact `/api/state` shape (`regular` boolean, plays `{id,g,d,parts}` ordered by `played_at` ASC). Tasks 2–3 consume it.

- [ ] **Step 1: Create `server/src/read-state.js`**

```js
// readState(db) — the whole dataset in the exact shape the client gets from
// GET /api/state ({players, games, plays}). Shared by the state route and the
// MCP tools (server/src/mcp-tools.js) so both are always identically shaped.
export function readState(db) {
  const players = db.prepare('SELECT id,name,regular,c1,c2 FROM players ORDER BY name')
    .all().map(p => ({ ...p, regular: !!p.regular }));
  const games = db.prepare('SELECT id,name,tier,dir,icon FROM games').all();
  const plays = db.prepare('SELECT id,game_id,played_at,parts FROM plays ORDER BY played_at')
    .all().map(r => ({ id: r.id, g: r.game_id, d: r.played_at, parts: JSON.parse(r.parts) }));
  return { players, games, plays };
}
```

- [ ] **Step 2: Replace `server/src/routes/state.js` with**

```js
// GET /api/state — the whole dataset in one shot (client computes everything). Spec §5/§11.
import { readState } from '../read-state.js';
export async function stateRoutes(app) {
  app.get('/api/state', async () => readState(app.db));
}
```

- [ ] **Step 3: Run tests** — `cd server && npm test`. Expected: all 19 pass (pure refactor; `routes.test.js` state tests prove parity).
- [ ] **Step 4: Commit** — `git add server/src/read-state.js server/src/routes/state.js && git commit -m "refactor(server): extract readState(db) for reuse by MCP tools"`

### Task 2: Pure tool functions (TDD)

**Files:**
- Create: `server/src/mcp-tools.js`
- Test: `server/src/mcp-tools.test.js`

**Interfaces:**
- Consumes: `readState` shape; client `stats.js` exports (`weight, periodPlays, leaderboard, recordFor, currentStreak`).
- Produces (Task 3 wires these): `ToolError` class; `getOverview(data)`, `getPlays(data, {since,until,game,player,limit})`, `getLeaderboard(data, {period,sort})`, `getRecords(data, {game})`, `getPlayerStats(data, {player})`, `getHeadToHead(data, {playerA,playerB,period})` — each returns a plain JSON-able object; bad player/game/period args throw `ToolError` with a helpful message.

- [ ] **Step 1: Write failing tests** — create `server/src/mcp-tools.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `cd server && npm test` → new file errors with "Cannot find module './mcp-tools.js'"; existing 19 still pass.
- [ ] **Step 3: Implement `server/src/mcp-tools.js`**

```js
// Pure MCP tool implementations: (data, args) → JSON-able result.
// data is the readState(db) shape — identical to GET /api/state — and all stat
// math comes from the client's own stats.js so MCP answers ALWAYS match the app
// (tier weights, rank direction, streaks). Wired to the protocol in routes/mcp.js.
// Head-to-head re-implements the viewmodel's core rule (shared play, lower rank
// wins) WITHOUT importing headToHead.js — that file is UI-flavored (colors etc.).
import { weight, periodPlays, leaderboard, recordFor, currentStreak } from '../../client/src/lib/stats.js';

export class ToolError extends Error {}

const PERIODS = ['month', 'prevMonth', 'ytd', 'lastYear', 'all'];
const SORTS = ['wins', 'wwins', 'winPct', 'plays', 'losses', 'beat', 'beatPer'];
const norm = (s) => String(s).trim().toLowerCase();
const byId = (list, id) => list.find(x => x.id === id);

function findPlayer(data, ref) {
  const p = byId(data.players, ref) || data.players.find(x => norm(x.name) === norm(ref));
  if (!p) throw new ToolError(`Unknown player "${ref}". Players: ${data.players.map(x => x.name).join(', ')}`);
  return p;
}
function findGame(data, ref) {
  const g = byId(data.games, ref) || data.games.find(x => norm(x.name) === norm(ref));
  if (!g) throw new ToolError(`Unknown game "${ref}". Games: ${data.games.map(x => x.name).join(', ')}`);
  return g;
}
function checkPeriod(period = 'all') {
  if (!PERIODS.includes(period)) throw new ToolError(`Unknown period "${period}". Use: ${PERIODS.join(', ')}`);
  return period;
}

export function getOverview(data) {
  return {
    players: data.players.map(({ id, name, regular }) => ({ id, name, regular })),
    games: data.games,
    totalPlays: data.plays.length,
    firstPlay: data.plays[0]?.d ?? null,
    lastPlay: data.plays.at(-1)?.d ?? null,
  };
}

export function getPlays(data, { since, until, game, player, limit } = {}) {
  let plays = data.plays;
  if (game) { const g = findGame(data, game); plays = plays.filter(p => p.g === g.id); }
  if (player) { const pl = findPlayer(data, player); plays = plays.filter(p => p.parts.some(x => x[0] === pl.id)); }
  if (since) plays = plays.filter(p => p.d.slice(0, 10) >= since);
  if (until) plays = plays.filter(p => p.d.slice(0, 10) <= until);
  const newestFirst = [...plays].reverse(); // readState orders ASC by played_at
  const capped = newestFirst.slice(0, Math.min(limit ?? 50, 200));
  return {
    count: plays.length,
    returned: capped.length,
    plays: capped.map(p => ({
      date: p.d,
      game: byId(data.games, p.g).name,
      results: [...p.parts].sort((a, b) => a[1] - b[1])
        .map(([pid, rank, score]) => ({ player: byId(data.players, pid).name, rank, score })),
    })),
  };
}

export function getLeaderboard(data, { period = 'all', sort = 'wins' } = {}) {
  checkPeriod(period);
  if (!SORTS.includes(sort)) throw new ToolError(`Unknown sort "${sort}". Use: ${SORTS.join(', ')}`);
  const rows = leaderboard(data, periodPlays(data.plays, period, new Date()), sort);
  // Strip UI-only fields; everything numeric passes through untouched (parity!).
  return { period, sort, standings: rows.map(({ c1, c2, initials, wwinsStr, beatPerStr, pid, ...keep }) => keep) };
}

export function getRecords(data, { game } = {}) {
  const games = game ? [findGame(data, game)] : data.games;
  const records = games.map(g => {
    const r = recordFor(data, g.id);
    return r && {
      game: g.name, tier: g.tier, direction: g.dir,
      holder: byId(data.players, r.pid).name, score: r.score, date: r.date,
    };
  }).filter(Boolean);
  return { records };
}

export function getPlayerStats(data, { player } = {}) {
  const p = findPlayer(data, player ?? '');
  const mine = data.plays.filter(x => x.parts.some(pt => pt[0] === p.id));
  let wins = 0, wwins = 0;
  const perGame = {};
  for (const play of mine) {
    const me = play.parts.find(pt => pt[0] === p.id);
    const g = byId(data.games, play.g);
    const e = perGame[play.g] || (perGame[play.g] = { game: g.name, plays: 0, wins: 0, best: null });
    e.plays++;
    if (me[1] === 1) { wins++; wwins += weight(g.tier); e.wins++; }
    const score = me[2];
    if (score != null && (e.best == null || (g.dir === 'high' ? score > e.best : score < e.best))) e.best = score;
  }
  const recent = mine.slice(-5).reverse().map(play => {
    const me = play.parts.find(pt => pt[0] === p.id);
    return { date: play.d, game: byId(data.games, play.g).name, rank: me[1], of: play.parts.length, score: me[2] };
  });
  return {
    player: p.name, plays: mine.length, wins,
    winPct: mine.length ? Math.round(wins / mine.length * 100) : 0,
    weightedWins: Math.round(wwins * 10) / 10,
    currentStreak: currentStreak(data.plays, p.id),
    perGame: Object.values(perGame).sort((a, b) => b.plays - a.plays),
    recent,
  };
}

export function getHeadToHead(data, { playerA, playerB, period = 'all' } = {}) {
  checkPeriod(period);
  const A = findPlayer(data, playerA ?? ''), B = findPlayer(data, playerB ?? '');
  if (A.id === B.id) throw new ToolError('Pick two different players.');
  let meetings = 0, aWins = 0, bWins = 0, last = null;
  const perGame = {};
  for (const play of periodPlays(data.plays, period, new Date())) {
    const pa = play.parts.find(x => x[0] === A.id), pb = play.parts.find(x => x[0] === B.id);
    if (!pa || !pb) continue;
    meetings++;
    const aWon = pa[1] < pb[1]; // lower rank wins (rank tie counts for B — matches headToHead.js)
    if (aWon) aWins++; else bWins++;
    const g = byId(data.games, play.g);
    const e = perGame[play.g] || (perGame[play.g] = { game: g.name, meetings: 0, aWins: 0, bWins: 0 });
    e.meetings++; if (aWon) e.aWins++; else e.bWins++;
    if (!last || play.d > last.date) last = { date: play.d, game: g.name, winner: aWon ? A.name : B.name };
  }
  return {
    playerA: A.name, playerB: B.name, period, meetings, aWins, bWins,
    verdict: meetings === 0 ? 'No meetings in this period'
      : aWins === bWins ? 'All square' : `${aWins > bWins ? A.name : B.name} leads the series`,
    lastMeeting: last,
    perGame: Object.values(perGame).sort((a, b) => b.meetings - a.meetings),
  };
}
```

- [ ] **Step 4: Run tests** — `cd server && npm test`. Expected: all pass (19 old + 9 new).
- [ ] **Step 5: Commit** — `git add server/src/mcp-tools.js server/src/mcp-tools.test.js && git commit -m "feat(mcp): pure read-only tool functions over client stats.js"`

### Task 3: Protocol wiring + integration test

**Files:**
- Create: `server/src/routes/mcp.js`
- Modify: `server/src/app.js` (register route), `server/package.json` (deps)
- Test: `server/src/mcp.integration.test.js`

**Interfaces:**
- Consumes: Task 2's tool functions + `ToolError`; `readState`.
- Produces: `POST /mcp` speaking MCP Streamable HTTP (stateless, JSON responses); `GET|DELETE /mcp` → 405.

- [ ] **Step 1: Install deps** — `cd server && npm install @modelcontextprotocol/sdk zod` (SDK is MIT, zod is its schema lib). Expected: clean install, lockfile updated.
- [ ] **Step 2: Write failing integration test** — `server/src/mcp.integration.test.js`:

```js
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
```

- [ ] **Step 3: Run to verify failure** — `cd server && npm test` → integration test fails (404 on /mcp).
- [ ] **Step 4: Create `server/src/routes/mcp.js`**

```js
// POST /mcp — remote MCP endpoint (Streamable HTTP, STATELESS: fresh server +
// transport per request, no sessions). Read-only tools over the same dataset as
// /api/state, computed with the client's own stats.js so numbers always match
// the app. INVARIANT: never register mutating tools here — the endpoint is
// intentionally unauthenticated (the data is already public via GET /api/state).
// Friend onboarding instructions: docs/mcp.md.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readState } from '../read-state.js';
import * as tools from '../mcp-tools.js';

const period = z.enum(['month', 'prevMonth', 'ytd', 'lastYear', 'all']).optional()
  .describe('Time window (default all)');

function buildMcpServer(db) {
  const server = new McpServer({ name: 'game-night', version: '1.0.0' });
  // Uniform wrapper: fresh state per call; ToolError → in-band MCP tool error.
  const run = (fn) => (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(fn(readState(db), args ?? {}), null, 1) }] };
    } catch (e) {
      if (e instanceof tools.ToolError) return { isError: true, content: [{ type: 'text', text: e.message }] };
      throw e;
    }
  };
  server.registerTool('get_overview', {
    description: 'Players, games (with tier/score-direction), total play count and date range. Call this first to orient.',
  }, run(tools.getOverview));
  server.registerTool('get_plays', {
    description: 'List plays, newest first, with player names, ranks (1 = winner) and scores. Filterable.',
    inputSchema: {
      since: z.string().optional().describe('YYYY-MM-DD inclusive'),
      until: z.string().optional().describe('YYYY-MM-DD inclusive'),
      game: z.string().optional().describe('Game name or id'),
      player: z.string().optional().describe('Player name or id'),
      limit: z.number().int().positive().optional().describe('Default 50, max 200'),
    },
  }, run(tools.getPlays));
  server.registerTool('get_leaderboard', {
    description: "The app's official weighted leaderboard (Light 0.5 / Medium 1.0 / Heavy 1.5).",
    inputSchema: { period, sort: z.enum(['wins', 'wwins', 'winPct', 'plays', 'losses', 'beat', 'beatPer']).optional() },
  }, run(tools.getLeaderboard));
  server.registerTool('get_records', {
    description: 'All-time best score per game with holder and date (per-game high/low direction respected).',
    inputSchema: { game: z.string().optional().describe('Game name or id (omit for all)') },
  }, run(tools.getRecords));
  server.registerTool('get_player_stats', {
    description: 'One player: wins, win %, weighted wins, current win streak, per-game breakdown, recent results.',
    inputSchema: { player: z.string().describe('Player name or id') },
  }, run(tools.getPlayerStats));
  server.registerTool('get_head_to_head', {
    description: 'Two players compared across shared plays: series score, verdict, last meeting, per-game tallies.',
    inputSchema: { playerA: z.string(), playerB: z.string(), period },
  }, run(tools.getHeadToHead));
  return server;
}

export async function mcpRoutes(app) {
  app.post('/mcp', async (req, reply) => {
    const server = buildMcpServer(app.db);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.hijack(); // SDK writes the raw response itself
    reply.raw.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });
  // Stateless mode: no SSE notification stream, no sessions to delete.
  const notAllowed = async (_req, reply) => reply.code(405)
    .send({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  app.get('/mcp', notAllowed);
  app.delete('/mcp', notAllowed);
}
```

- [ ] **Step 5: Register in `server/src/app.js`** — add `import { mcpRoutes } from './routes/mcp.js';` after the eventRoutes import, and `app.register(mcpRoutes);` after `app.register(eventRoutes);`.
- [ ] **Step 6: Run tests** — `cd server && npm test`. Expected: all pass (29 total).
- [ ] **Step 7: Commit** — `git add server/src/routes/mcp.js server/src/app.js server/src/mcp.integration.test.js server/package.json server/package-lock.json && git commit -m "feat(mcp): remote MCP endpoint at POST /mcp (stateless, read-only)"`

### Task 4: Docker image + onboarding doc + CLAUDE.md

**Files:**
- Modify: `Dockerfile`, `CLAUDE.md`
- Create: `docs/mcp.md`

- [ ] **Step 1: Dockerfile** — in the runtime stage, directly after `COPY --from=client /app/client/dist /app/client/dist`, add:

```dockerfile
# Client stat core is imported by the MCP tools at runtime (server/src/mcp-tools.js)
COPY client/src/lib/stats.js /app/client/src/lib/stats.js
```

- [ ] **Step 2: Prove the image works** — `docker build -t gamenight-mcp-test . && docker run --rm gamenight-mcp-test node -e "import('./src/mcp-tools.js').then(() => console.log('stats import OK'))"`. Expected: `stats import OK`. Then `docker rmi gamenight-mcp-test`.
- [ ] **Step 3: Create `docs/mcp.md`**

```markdown
# Game Night MCP — connect your Claude

Read-only MCP endpoint over the live leaderboard data (same math as the app).

## Claude Code
    claude mcp add --transport http gamenight https://gamenight.trevorwithdata.com/mcp

## Claude Desktop
Settings → Connectors → Add custom connector → `https://gamenight.trevorwithdata.com/mcp` (no auth).

## Tools
`get_overview` · `get_plays` · `get_leaderboard` · `get_records` · `get_player_stats` · `get_head_to_head`

## Starter newsletter prompt
> Using the gamenight tools: pull last month's plays (`get_plays` with since/until),
> the month's leaderboard (`get_leaderboard` period "prevMonth"), all-time records
> (`get_records`), and head-to-heads for the most active pair. Write a punchy
> monthly Game Night newsletter: standings, highlights, records broken, a "rivalry
> corner", and one gentle roast of whoever finished last. Verify every number
> against the tool output — never estimate stats.
```

- [ ] **Step 4: CLAUDE.md** — in Architecture bullets add: `- MCP: read-only remote endpoint at POST /mcp (server/src/routes/mcp.js + mcp-tools.js, stateless Streamable HTTP; tools compute with client stats.js — see docs/mcp.md). Never add mutating tools; it is public by design.`
- [ ] **Step 5: Commit** — `git add Dockerfile docs/mcp.md CLAUDE.md && git commit -m "feat(mcp): ship stats.js in runtime image; onboarding doc"`

### Task 5: Deploy + through-the-edge verification

**Files:** none

- [ ] **Step 1:** `git push && ./deploy.sh`
- [ ] **Step 2: Local container check** — `curl -s http://127.0.0.1:5557/api/state -o /dev/null -w '%{http_code}\n'` → 200.
- [ ] **Step 3: MCP handshake through Cloudflare** — from this box run the Task 3 client snippet against `https://gamenight.trevorwithdata.com/mcp` (node one-off in scratchpad using server/node_modules): list tools (expect 6), call `get_leaderboard` period `month`, spot-check a number against the live app.
- [ ] **Step 4: Buddy onboarding** — send him the `claude mcp add` one-liner + starter prompt from docs/mcp.md. His first `get_overview` call is the acceptance test.
