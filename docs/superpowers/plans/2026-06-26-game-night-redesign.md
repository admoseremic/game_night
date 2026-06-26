# Game Night Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Game Night PWA against the new design (`new_game_night_design/`) as a self-hosted React+Vite app served by a Node/Fastify + SQLite server, behind Caddy on the box, migrating all existing Firestore data — with client-side stats, optimistic updates, and SSE live cross-device sync.

**Architecture:** One repo, two packages: `client/` (React+Vite PWA, owns all UI and all stat math) and `server/` (Fastify + better-sqlite3, serves the built PWA + a JSON API + an SSE stream). A single Docker image runs the server; SQLite lives on a bind-mounted volume. The full design and all decision records are in `docs/superpowers/specs/2026-06-26-game-night-redesign-design.md` — read it first.

**Tech Stack:** React 18, Vite 5, `vite-plugin-pwa`, vitest (client tests). Node 20, Fastify 4, `better-sqlite3`, `@fastify/compress`, `@fastify/static`, `node:test` (server tests). `firebase-admin` (migration script only). Docker + Caddy on the box.

## Global Constraints

- **Stat math is the critical-correctness surface** and must reproduce the prototype's `class Component` (`new_game_night_design/Game Night.dc.html`, lines 1060–1639) **exactly**. That file is the source of truth for algorithms; the spec's §6 and `new_game_night_design/README.md` are the source of truth for screens/tokens.
- **Lower rank number = better.** Rank 1 = winner; one winner per play. Scores optional (`null` allowed); ranks required. No duplicate player within a play.
- **Tier weights:** Light = 0.5, Medium = 1.0, Heavy = 1.5.
- **Record direction is per-game:** `dir==='high'` → max score wins; `dir==='low'` → min score wins.
- **Nothing derived is ever stored** (records, players-beaten, streaks, leaderboards, rivalries, current-pick all recompute on read).
- **No auth** — API is wide open, matching today.
- **Data model:** `players(id,name,regular,c1,c2)`, `games(id,name,tier,dir,icon)`, `plays(id,game_id,played_at,parts)` where `parts` is JSON `[[playerId,rank,scoreOrNull],…]`.
- **SSE:** every mutation broadcasts a `changed` event; clients refetch `/api/state`. Caddy block must NOT gzip (compression done in Fastify, skipping `text/event-stream`).
- **Design tokens** (colors/fonts/radii) per spec §6 / README "Design Tokens". Fonts: Bricolage Grotesque (display), Plus Jakarta Sans (body). App bg `#130E1B`.
- **Commit after every task.** Branch: `redesign` (do not work on `main`).

---

## File Structure

```
game_night/
├── client/
│   ├── index.html
│   ├── vite.config.js                # Vite + PWA plugin + dev proxy to server
│   ├── package.json
│   └── src/
│       ├── main.jsx                  # app root, store provider, router
│       ├── theme.css                 # design tokens as CSS variables + font imports
│       ├── lib/
│       │   ├── stats.js              # PURE stat core (ported exactly) — TESTED
│       │   ├── stats.test.js
│       │   ├── format.js             # date/relative/ordinal + tier/medal presentation helpers
│       │   ├── api.js                # fetch wrapper over /api/*
│       │   └── colors.js             # NEWPAL palette for new players
│       ├── store/
│       │   └── store.jsx             # data store (players/games/plays) + UI state + optimistic + SSE
│       ├── components/               # Avatar, MedalChip, TierBadge, Pill, BottomSheet, BottomNav, Celebration
│       ├── viewmodels/               # board.js, games.js, gameDetail.js, players.js, playerDetail.js, history.js, hall.js — build view data from stats.js
│       ├── screens/                  # Board, Games, GameDetail, Players, PlayerProfile, Hall, History
│       ├── flows/                    # LogPlay.jsx
│       └── sheets/                   # AddGame, AddPlayer, Pick, Picker, Period, Sort, Explain, DeleteConfirm, Custom
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js                  # boot Fastify, compress, static, routes
│       ├── db.js                     # SQLite connection + schema
│       ├── events.js                 # SSE client set + broadcast()
│       └── routes/
│           ├── state.js              # GET /api/state
│           ├── players.js            # POST/PATCH/DELETE
│           ├── games.js
│           ├── plays.js
│           └── events.js             # GET /api/events (SSE)
├── scripts/
│   └── migrate-firestore-to-sqlite.mjs
├── Dockerfile
├── deploy.sh
└── README.md
```

---

## Phase A — Server foundation

### Task 1: Repo scaffold + branch

**Files:**
- Create: `client/package.json`, `server/package.json`, `.gitignore` (update), `client/.gitignore`, `server/.gitignore`
- Modify: root `README.md` later (Task 20)

- [ ] **Step 1: Create the branch**

```bash
cd /home/trevor/game_night
git checkout -b redesign
```

- [ ] **Step 2: Scaffold the server package**

Create `server/package.json`:
```json
{
  "name": "game-night-server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "@fastify/compress": "^7.0.3",
    "@fastify/static": "^7.0.4",
    "better-sqlite3": "^11.3.0",
    "fastify": "^4.28.1"
  }
}
```

- [ ] **Step 3: Scaffold the client package**

Create `client/package.json`:
```json
{
  "name": "game-night-client",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 4: Append build artifacts to `.gitignore`**

Add these lines to the root `.gitignore`:
```
node_modules/
client/dist/
server/data/
*.db
.env
serviceAccount*.json
```

- [ ] **Step 5: Install deps**

Run: `cd /home/trevor/game_night/server && npm install && cd ../client && npm install`
Expected: both complete without error; `better-sqlite3` compiles.

- [ ] **Step 6: Commit**

```bash
cd /home/trevor/game_night
git add client/package.json server/package.json .gitignore client/.gitignore server/.gitignore
git commit -m "scaffold client + server packages"
```

---

### Task 2: SQLite schema + db module

**Files:**
- Create: `server/src/db.js`, `server/src/db.test.js`

**Interfaces:**
- Produces: `openDb(path)` → better-sqlite3 `Database` with schema applied (tables `players`, `games`, `plays` + indexes). `path` defaults to `process.env.DB_PATH || ':memory:'`.

- [ ] **Step 1: Write the failing test**

`server/src/db.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: FAIL — cannot find `./db.js`.

- [ ] **Step 3: Write minimal implementation**

`server/src/db.js`:
```js
// SQLite connection + schema. One file is the whole database; see spec §4.
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  regular INTEGER NOT NULL DEFAULT 1, c1 TEXT NOT NULL, c2 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Medium', dir TEXT NOT NULL DEFAULT 'high', icon TEXT NOT NULL DEFAULT '🎲'
);
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  played_at TEXT NOT NULL,
  parts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_plays_game_id ON plays(game_id);
`;

export function openDb(path = process.env.DB_PATH || ':memory:') {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/db.js server/src/db.test.js
git commit -m "server: SQLite schema + db module"
```

---

### Task 3: SSE broadcast module

**Files:**
- Create: `server/src/events.js`, `server/src/events.test.js`

**Interfaces:**
- Produces: `makeHub()` → `{ add(reply), broadcast(eventName), count() }`. `add` registers a Fastify reply's raw stream as an SSE client and writes the SSE preamble; `broadcast` writes `event: <name>\ndata: {...}\n\n` to every registered client; dead/closed clients are dropped.

- [ ] **Step 1: Write the failing test**

`server/src/events.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: FAIL — cannot find `./events.js`.

- [ ] **Step 3: Write minimal implementation**

`server/src/events.js`:
```js
// In-memory set of connected SSE clients + broadcast. See spec §13.
export function makeHub() {
  const clients = new Set();
  return {
    add(reply) {
      reply.raw.write(': connected\n\n'); // SSE preamble / keep-alive comment
      clients.add(reply);
      reply.raw.on('close', () => clients.delete(reply));
    },
    broadcast(eventName) {
      const payload = `event: ${eventName}\ndata: {"type":"${eventName}"}\n\n`;
      for (const reply of clients) {
        try { reply.raw.write(payload); } catch { clients.delete(reply); }
      }
    },
    count() { return clients.size; },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/events.js server/src/events.test.js
git commit -m "server: SSE broadcast hub"
```

---

### Task 4: CRUD + state routes (registered on a Fastify instance)

**Files:**
- Create: `server/src/routes/state.js`, `server/src/routes/players.js`, `server/src/routes/games.js`, `server/src/routes/plays.js`, `server/src/routes/events.js`
- Create: `server/src/app.js` (builds a Fastify instance for tests, no listen)
- Create: `server/src/routes/routes.test.js`

**Interfaces:**
- Consumes: `openDb` (Task 2), `makeHub` (Task 3).
- Produces: `buildApp({ db, hub })` → Fastify instance with all `/api/*` routes registered. Decorates `app.db` and `app.hub`.
  - `GET /api/state` → `{ players:[{id,name,regular(bool),c1,c2}], games:[{id,name,tier,dir,icon}], plays:[{id,g,d,parts}] }` (note: API uses `g`/`d` to match the client model; `regular` is a boolean; `parts` is parsed JSON).
  - `POST /api/players {name, regular, c1, c2}` → created player; `PATCH /api/players/:id {name?, regular?}`; `DELETE /api/players/:id`.
  - `POST /api/games {name, tier, dir, icon}` → created game; `PATCH`/`DELETE` likewise.
  - `POST /api/plays {g, d, parts}` → created play; `PATCH /api/plays/:id {g?, d?, parts?}`; `DELETE /api/plays/:id`.
  - Every successful mutation calls `hub.broadcast('changed')`.
  - Server generates ids: players `np<rand>`, games `ng<rand>`, plays `pl<rand>` (use `crypto.randomUUID()` suffix).

- [ ] **Step 1: Write the failing test**

`server/src/routes/routes.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: FAIL — cannot find `../app.js`.

- [ ] **Step 3: Write the implementation**

`server/src/app.js`:
```js
// Builds a Fastify instance with all /api routes. No .listen() here so tests can inject().
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { stateRoutes } from './routes/state.js';
import { playerRoutes } from './routes/players.js';
import { gameRoutes } from './routes/games.js';
import { playRoutes } from './routes/plays.js';
import { eventRoutes } from './routes/events.js';

export function buildApp({ db, hub }) {
  const app = Fastify({ logger: false });
  app.decorate('db', db);
  app.decorate('hub', hub);
  app.decorate('newId', (prefix) => prefix + randomUUID().slice(0, 8));
  app.register(stateRoutes);
  app.register(playerRoutes);
  app.register(gameRoutes);
  app.register(playRoutes);
  app.register(eventRoutes);
  return app;
}
```

`server/src/routes/state.js`:
```js
// GET /api/state — the whole dataset in one shot (client computes everything). Spec §5/§11.
export async function stateRoutes(app) {
  app.get('/api/state', async () => {
    const players = app.db.prepare('SELECT id,name,regular,c1,c2 FROM players ORDER BY name')
      .all().map(p => ({ ...p, regular: !!p.regular }));
    const games = app.db.prepare('SELECT id,name,tier,dir,icon FROM games').all();
    const plays = app.db.prepare('SELECT id,game_id,played_at,parts FROM plays ORDER BY played_at')
      .all().map(r => ({ id: r.id, g: r.game_id, d: r.played_at, parts: JSON.parse(r.parts) }));
    return { players, games, plays };
  });
}
```

`server/src/routes/players.js`:
```js
export async function playerRoutes(app) {
  app.post('/api/players', async (req, reply) => {
    const { name, regular = true, c1, c2 } = req.body || {};
    if (!name || !c1 || !c2) return reply.code(400).send({ error: 'name, c1, c2 required' });
    const id = app.newId('np');
    app.db.prepare('INSERT INTO players(id,name,regular,c1,c2) VALUES(?,?,?,?,?)')
      .run(id, name, regular ? 1 : 0, c1, c2);
    app.hub.broadcast('changed');
    return { id, name, regular: !!regular, c1, c2 };
  });
  app.patch('/api/players/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM players WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const name = req.body?.name ?? cur.name;
    const regular = req.body?.regular ?? !!cur.regular;
    app.db.prepare('UPDATE players SET name=?, regular=? WHERE id=?').run(name, regular ? 1 : 0, req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, name, regular: !!regular, c1: cur.c1, c2: cur.c2 };
  });
  app.delete('/api/players/:id', async (req) => {
    app.db.prepare('DELETE FROM players WHERE id=?').run(req.params.id);
    app.hub.broadcast('changed');
    return { ok: true };
  });
}
```

`server/src/routes/games.js`:
```js
export async function gameRoutes(app) {
  app.post('/api/games', async (req, reply) => {
    const { name, tier = 'Medium', dir = 'high', icon = '🎲' } = req.body || {};
    if (!name) return reply.code(400).send({ error: 'name required' });
    const id = app.newId('ng');
    app.db.prepare('INSERT INTO games(id,name,tier,dir,icon) VALUES(?,?,?,?,?)').run(id, name, tier, dir, icon);
    app.hub.broadcast('changed');
    return { id, name, tier, dir, icon };
  });
  app.patch('/api/games/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const g = { name: req.body?.name ?? cur.name, tier: req.body?.tier ?? cur.tier,
      dir: req.body?.dir ?? cur.dir, icon: req.body?.icon ?? cur.icon };
    app.db.prepare('UPDATE games SET name=?, tier=?, dir=?, icon=? WHERE id=?')
      .run(g.name, g.tier, g.dir, g.icon, req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, ...g };
  });
  app.delete('/api/games/:id', async (req) => {
    app.db.prepare('DELETE FROM games WHERE id=?').run(req.params.id);
    app.hub.broadcast('changed');
    return { ok: true };
  });
}
```

`server/src/routes/plays.js`:
```js
function validateParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return 'parts required';
  const ids = new Set();
  for (const p of parts) {
    if (!Array.isArray(p) || p.length !== 3) return 'each part is [playerId,rank,score]';
    if (ids.has(p[0])) return 'duplicate player in play';
    ids.add(p[0]);
  }
  return null;
}
export async function playRoutes(app) {
  app.post('/api/plays', async (req, reply) => {
    const { g, d, parts } = req.body || {};
    if (!g || !d) return reply.code(400).send({ error: 'g and d required' });
    const err = validateParts(parts);
    if (err) return reply.code(400).send({ error: err });
    const id = app.newId('pl');
    app.db.prepare('INSERT INTO plays(id,game_id,played_at,parts) VALUES(?,?,?,?)')
      .run(id, g, d, JSON.stringify(parts));
    app.hub.broadcast('changed');
    return { id, g, d, parts };
  });
  app.patch('/api/plays/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM plays WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const g = req.body?.g ?? cur.game_id;
    const d = req.body?.d ?? cur.played_at;
    const parts = req.body?.parts ?? JSON.parse(cur.parts);
    const err = validateParts(parts);
    if (err) return reply.code(400).send({ error: err });
    app.db.prepare('UPDATE plays SET game_id=?, played_at=?, parts=? WHERE id=?')
      .run(g, d, JSON.stringify(parts), req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, g, d, parts };
  });
  app.delete('/api/plays/:id', async (req) => {
    app.db.prepare('DELETE FROM plays WHERE id=?').run(req.params.id);
    app.hub.broadcast('changed');
    return { ok: true };
  });
}
```

`server/src/routes/events.js`:
```js
// GET /api/events — SSE stream. Spec §13.
export async function eventRoutes(app) {
  app.get('/api/events', (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    app.hub.add(reply);
    // keep the request open; do not return.
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: PASS (all route tests + earlier db/events tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/app.js server/src/routes/
git commit -m "server: state + CRUD + events routes with broadcast"
```

---

### Task 5: Server boot — static serving + compression + listen

**Files:**
- Create: `server/src/index.js`

**Interfaces:**
- Consumes: `buildApp` (Task 4), `openDb` (Task 2), `makeHub` (Task 3).
- Produces: runnable server. Serves `client/dist` (env `CLIENT_DIR`, default `../client/dist`) for non-`/api` routes with SPA fallback to `index.html`. Listens on `PORT` (default 3000), host `0.0.0.0`. Registers `@fastify/compress` configured to skip `text/event-stream`.

- [ ] **Step 1: Write `server/src/index.js`**

```js
// Production boot: DB + SSE hub + API routes + static client + compression.
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { makeHub } from './events.js';
import { buildApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = process.env.CLIENT_DIR || path.resolve(__dirname, '../../client/dist');
const PORT = Number(process.env.PORT || 3000);

const db = openDb();
const hub = makeHub();
const app = buildApp({ db, hub });

// Compress JSON etc., but NEVER text/event-stream (would buffer SSE). Spec §8/§13.
await app.register(fastifyCompress, {
  global: true,
  customTypes: /^(?!text\/event-stream)(application\/json|text\/|application\/javascript)/,
});

await app.register(fastifyStatic, { root: CLIENT_DIR, wildcard: false });

// SPA fallback: anything not /api and not a real file -> index.html
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
  return reply.sendFile('index.html');
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => console.log(`game-night server on :${PORT}, client=${CLIENT_DIR}`))
  .catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Smoke-test boot without a client build**

Run: `cd /home/trevor/game_night/server && DB_PATH=:memory: CLIENT_DIR=/tmp PORT=3999 node src/index.js & sleep 1 && curl -s localhost:3999/api/state && kill %1`
Expected: prints `{"players":[],"games":[],"plays":[]}`.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.js
git commit -m "server: boot with static SPA + compression (SSE-safe)"
```

---

## Phase B — Migration

### Task 6: Firestore → SQLite migration script

**Files:**
- Create: `scripts/migrate-firestore-to-sqlite.mjs`
- Create: `scripts/migrate.test.mjs` (tests the pure mapping functions)

**Interfaces:**
- Produces pure mappers (exported for test): `mapPlayer(doc, index, palette)`, `mapGame(doc)`, `mapPlay(doc)`. The script's `main()` reads Firestore via `firebase-admin` and writes via `openDb`.
- Mapping rules (spec §7): players keep Firestore id, `regular` default `true`, colors assigned from `NEWPAL` by index; games `dir = hi_score_wins ? 'high' : 'low'`, `tier` default `Medium`, `icon` default `🎲`; plays `played_at = dateTime.toDate().toISOString()`, `parts = players.map(p => [p.player, p.rank, p.score ?? null])`, drop `players_beaten`.

- [ ] **Step 1: Write the failing test**

`scripts/migrate.test.mjs`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night && node --test scripts/migrate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`scripts/migrate-firestore-to-sqlite.mjs`:
```js
// One-time migration: existing Firestore (game-night-trevorwithdata) -> SQLite. Spec §7.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json DB_PATH=./server/data/gamenight.db \
//        node scripts/migrate-firestore-to-sqlite.mjs
import { openDb } from '../server/src/db.js';

export const NEWPAL = [
  ['#22D3EE', '#0EA5E9'], ['#A78BFA', '#7C3AED'], ['#F472B6', '#DB2777'], ['#FBBF24', '#F59E0B'],
  ['#4ADE80', '#16A34A'], ['#FB923C', '#EA580C'], ['#38BDF8', '#6366F1'], ['#F87171', '#DC2626'],
];

export function mapPlayer(doc, index, palette) {
  const d = doc.data();
  const pal = palette[index % palette.length];
  return { id: doc.id, name: d.name, regular: 1, c1: pal[0], c2: pal[1] };
}
export function mapGame(doc) {
  const d = doc.data();
  return { id: doc.id, name: d.name, tier: d.tier || 'Medium',
    dir: d.hi_score_wins === false ? 'low' : 'high', icon: d.icon || '🎲' };
}
export function mapPlay(doc) {
  const d = doc.data();
  const parts = (d.players || []).map(p => [p.player, p.rank, (p.score ?? null)]);
  return { id: doc.id, game_id: d.game, played_at: d.dateTime.toDate().toISOString(), parts: JSON.stringify(parts) };
}

async function main() {
  const admin = (await import('firebase-admin')).default;
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const fs = admin.firestore();
  const db = openDb();

  const players = (await fs.collection('players').get()).docs;
  const games = (await fs.collection('games').get()).docs;
  const plays = (await fs.collection('plays').get()).docs;

  const insP = db.prepare('INSERT OR REPLACE INTO players(id,name,regular,c1,c2) VALUES(@id,@name,@regular,@c1,@c2)');
  const insG = db.prepare('INSERT OR REPLACE INTO games(id,name,tier,dir,icon) VALUES(@id,@name,@tier,@dir,@icon)');
  const insPl = db.prepare('INSERT OR REPLACE INTO plays(id,game_id,played_at,parts) VALUES(@id,@game_id,@played_at,@parts)');

  db.transaction(() => {
    players.forEach((doc, i) => insP.run(mapPlayer(doc, i, NEWPAL)));
    games.forEach(doc => insG.run(mapGame(doc)));
    plays.forEach(doc => insPl.run(mapPlay(doc)));
  })();

  console.log(`migrated: ${players.length} players, ${games.length} games, ${plays.length} plays`);
}

// Only run main() when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night && node --test scripts/migrate.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-firestore-to-sqlite.mjs scripts/migrate.test.mjs
git commit -m "migration: Firestore -> SQLite mappers + script"
```

> **Note for the operator (not a code step):** running `main()` requires a service-account key for `game-night-trevorwithdata` (or `firebase firestore:export`). Add `firebase-admin` to a throwaway `scripts/package.json` or install globally for the one run. After running, verify counts and spot-check a high-`dir` and low-`dir` game record vs. the live app, then copy `gamenight.db` to `/home/trevor/docker/game-night/data/`.

---

## Phase C — Client foundation

### Task 7: Vite + React + PWA scaffold + theme tokens

**Files:**
- Create: `client/vite.config.js`, `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx`, `client/src/theme.css`

**Interfaces:**
- Produces: a running dev app shell. `vite.config.js` proxies `/api` to `http://localhost:3000` in dev. PWA manifest: name "Game Night", theme/background `#130E1B`, standalone, portrait, icons from existing `public/icon-192.png`/`icon-512.png` (copy into `client/public/`).

- [ ] **Step 1: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Game Night', short_name: 'GameNight',
        description: 'Game night leaderboards, records & history',
        start_url: '/', display: 'standalone', orientation: 'portrait',
        background_color: '#130E1B', theme_color: '#130E1B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
```

- [ ] **Step 2: Create `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx`**

`client/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#130E1B" />
    <title>Game Night</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`client/src/main.jsx`:
```js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
```

`client/src/App.jsx` (temporary shell, replaced in Task 11+):
```js
export default function App() {
  return <div style={{ padding: 20, color: 'var(--text-primary)' }}>Game Night — building…</div>;
}
```

- [ ] **Step 3: Create `client/src/theme.css` with the design tokens**

Copy the tokens from spec §6 / README "Design Tokens" into CSS variables and import the two Google Fonts. Include at minimum:
```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #130E1B;
  --card: rgba(255,255,255,0.035);
  --hairline: rgba(255,255,255,0.08);
  --text-primary: #F4EEF8; --text-secondary: #C9B8E8; --text-muted: #9D90B5; --text-faint: #6E6483;
  --orange: #FF8A3D; --gold: #FFC24B; --green: #34D9A0; --pink: #FF6FA5; --purple: #9B6CFF; --danger: #FF4D6D;
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin: 0; font-family: var(--font-body); color: var(--text-primary);
  background:
    radial-gradient(120% 80% at 50% -10%, #36234D 0%, transparent 60%),
    var(--bg);
  background-attachment: fixed;
  overscroll-behavior: none;
}
```

- [ ] **Step 4: Verify dev server boots**

Run: `cd /home/trevor/game_night/client && npm run dev -- --port 5173 & sleep 2 && curl -s localhost:5173 | grep -q 'id="root"' && echo OK && kill %1`
Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
mkdir -p client/public && cp public/icon-192.png public/icon-512.png client/public/
git add client/vite.config.js client/index.html client/src/main.jsx client/src/App.jsx client/src/theme.css client/public/
git commit -m "client: Vite+React+PWA scaffold + design tokens"
```

---

### Task 8: stats.js — pure stat core (THE critical module)

**Files:**
- Create: `client/src/lib/stats.js`, `client/src/lib/stats.test.js`

**Interfaces:**
- Produces pure functions. `data = { players, games, plays }`; players `{id,name,regular,c1,c2}` (derive `initials = name[0]`); games `{id,name,tier,dir,icon}`; plays `{id,g,d,parts:[[pid,rank,score]]}`. Ported verbatim from `Game Night.dc.html` lines 1140–1382.
  - `weight(tier)`, `inPeriod(play, period, now, custom)`, `periodPlays(plays, period, now, custom)`
  - `leaderboard(data, plays, sort, sort2)` → ranked array of `{pid,name,c1,c2,initials,plays,wins,beat,wwins,winPct,wwinsStr,rank}`
  - `recordFor(data, gameId)` → `{pid,score,date}|null`
  - `currentStreak(plays, pid)` → number
  - `computePick(data, plays, absent)` → `{game,date,ordered,pickPart}|null`

> Later view-model tasks (12–18) reuse these. `gameDetail`/`playerDetail`/`hallData` are built in their screen tasks on top of these primitives (they are mostly presentation).

- [ ] **Step 1: Write the failing test**

`client/src/lib/stats.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { weight, leaderboard, recordFor, currentStreak, computePick, inPeriod } from './stats.js';

const data = {
  players: [
    { id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true },
    { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true },
    { id: 'p3', name: 'Cy', c1: '#5', c2: '#6', regular: false },
  ],
  games: [
    { id: 'g1', name: 'Light Game', tier: 'Light', dir: 'high', icon: '🔷' },
    { id: 'g2', name: 'Heavy Low', tier: 'Heavy', dir: 'low', icon: '🚀' },
  ],
  plays: [
    { id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, 50], ['p2', 2, 40], ['p3', 3, 30]] },
    { id: 'x2', g: 'g2', d: '2026-06-12T20:00', parts: [['p2', 1, 10], ['p1', 2, 20]] },
  ],
};

it('weight maps tiers', () => {
  expect(weight('Light')).toBe(0.5); expect(weight('Medium')).toBe(1.0); expect(weight('Heavy')).toBe(1.5);
});

it('leaderboard aggregates wins, plays, beat, wwins, winPct', () => {
  const lb = leaderboard(data, data.plays, 'wins');
  const byId = Object.fromEntries(lb.map(e => [e.pid, e]));
  expect(byId.p1).toMatchObject({ wins: 1, plays: 2, beat: 2, winPct: 50 });
  expect(byId.p2).toMatchObject({ wins: 1, plays: 2, beat: 2, winPct: 50 });
  expect(byId.p3).toMatchObject({ wins: 0, plays: 1, beat: 0, winPct: 0 });
  expect(byId.p1.wwinsStr).toBe('0.5'); // win in Light
  expect(byId.p2.wwinsStr).toBe('1.5'); // win in Heavy
  expect(lb[0].rank).toBe(1);
});

it('recordFor respects direction (high=max, low=min)', () => {
  expect(recordFor(data, 'g1')).toMatchObject({ pid: 'p1', score: 50 });
  expect(recordFor(data, 'g2')).toMatchObject({ pid: 'p2', score: 10 });
});

it('currentStreak counts consecutive most-recent wins', () => {
  expect(currentStreak(data.plays, 'p1')).toBe(0); // latest play p1 came 2nd
  expect(currentStreak(data.plays, 'p2')).toBe(1); // latest play p2 won, prior lost
});

it('computePick returns worst finisher of most-recent play, cascading on absent', () => {
  expect(computePick(data, data.plays, {}).pickPart[0]).toBe('p1'); // x2 worst finisher
  expect(computePick(data, data.plays, { p1: true }).pickPart[0]).toBe('p2');
});

it('inPeriod month filter', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(inPeriod({ d: '2026-06-10T20:00' }, 'month', now)).toBe(true);
  expect(inPeriod({ d: '2026-05-10T20:00' }, 'month', now)).toBe(false);
  expect(inPeriod({ d: '2026-05-10T20:00' }, 'all', now)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/client && npm test`
Expected: FAIL — `./stats.js` missing.

- [ ] **Step 3: Write `client/src/lib/stats.js`** (ported from prototype 1140–1382; pure, no `this`)

```js
// PURE stat core, ported EXACTLY from new_game_night_design/Game Night.dc.html (class Component).
// data = { players, games, plays }. See plan Global Constraints.
const game = (data, id) => data.games.find(g => g.id === id);
const pl = (data, id) => data.players.find(p => p.id === id);
const initials = (p) => (p.name || '?').slice(0, 1).toUpperCase();

export function weight(t) { return t === 'Heavy' ? 1.5 : t === 'Light' ? 0.5 : 1.0; }

export function inPeriod(play, period, now, custom) {
  const d = new Date(play.d), n = now;
  if (period === 'all') return true;
  if (period === 'month') return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (period === 'prevMonth') { const m = (n.getMonth() + 11) % 12, y = n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear(); return d.getFullYear() === y && d.getMonth() === m; }
  if (period === 'ytd') return d.getFullYear() === n.getFullYear();
  if (period === 'lastYear') return d.getFullYear() === n.getFullYear() - 1;
  if (period === 'custom') { const s = new Date(custom.start + 'T00:00:00'); const e = new Date(custom.end + 'T23:59:59'); return d >= s && d <= e; }
  return true;
}
export function periodPlays(plays, period, now, custom) { return plays.filter(x => inPeriod(x, period, now, custom)); }

export function leaderboard(data, plays, sort, sort2) {
  const m = {};
  for (const play of plays) {
    const tw = weight(game(data, play.g).tier);
    for (const [pid, rank] of play.parts) {
      const e = m[pid] || (m[pid] = { pid, plays: 0, wins: 0, beat: 0, wwins: 0 });
      e.plays++; e.beat += play.parts.filter(x => x[1] > rank).length;
      if (rank === 1) { e.wins++; e.wwins += tw; }
    }
  }
  let arr = Object.values(m).map(e => { const p = pl(data, e.pid); return { ...e, name: p.name, c1: p.c1, c2: p.c2, initials: initials(p),
    winPct: e.plays ? Math.round(e.wins / e.plays * 100) : 0, wwinsStr: (Math.round(e.wwins * 10) / 10).toFixed(1) }; });
  const keyVal = (e, key) => key === 'wins' ? e.wins : key === 'plays' ? e.plays : key === 'winPct' ? e.winPct : key === 'beat' ? e.beat : e.wwins;
  const key = sort || 'wins';
  arr.sort((a, b) => (keyVal(b, key) - keyVal(a, key)) || (sort2 ? (keyVal(b, sort2) - keyVal(a, sort2)) : 0));
  arr.forEach((e, i) => e.rank = i + 1);
  return arr;
}

export function recordFor(data, gameId) {
  const g = game(data, gameId); let best = null;
  for (const play of data.plays) {
    if (play.g !== gameId) continue;
    for (const [pid, , score] of play.parts) {
      if (score == null) continue;
      if (!best || (g.dir === 'high' ? score > best.score : score < best.score)) best = { pid, score, date: play.d };
    }
  }
  return best;
}

export function currentStreak(plays, pid) {
  const ps = plays.filter(p => p.parts.some(x => x[0] === pid)).sort((a, b) => new Date(b.d) - new Date(a.d));
  let s = 0; for (const p of ps) { const me = p.parts.find(x => x[0] === pid); if (me[1] === 1) s++; else break; } return s;
}

export function computePick(data, plays, absent = {}) {
  const sorted = [...plays].sort((a, b) => new Date(b.d) - new Date(a.d));
  if (!sorted.length) return null;
  const last = sorted[0];
  const ordered = [...last.parts].sort((a, b) => b[1] - a[1]); // worst finisher first
  const pickPart = ordered.find(p => !absent[p[0]]) || null;
  return { game: game(data, last.g), date: last.d, ordered, pickPart };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night/client && npm test`
Expected: PASS (all stats tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/stats.js client/src/lib/stats.test.js
git commit -m "client: pure stat core (ported exactly) + unit tests"
```

---

### Task 9: format + colors helpers

**Files:**
- Create: `client/src/lib/format.js`, `client/src/lib/colors.js`, `client/src/lib/format.test.js`

**Interfaces:**
- Produces (from prototype): `fmtDate(iso)`, `fmtDateY(iso)`, `rel(iso, now)`, `ordinal(n)`, `tierBg(t)`, `tierTx(t)`, `MEDALS` (`[[g1,g2,tx],…]` for ranks 1–3), `medalBg(rank)`, `medalTx(rank)`. `colors.js` exports `NEWPAL` and `nextColor(playerCount)`.

- [ ] **Step 1: Write the failing test**

`client/src/lib/format.test.js`:
```js
import { it, expect } from 'vitest';
import { rel, ordinal, tierTx, fmtDate } from './format.js';

it('ordinal', () => { expect(ordinal(1)).toBe('1st'); expect(ordinal(2)).toBe('2nd'); expect(ordinal(11)).toBe('11th'); });
it('tierTx colors', () => { expect(tierTx('Heavy')).toBe('#FF6FA5'); expect(tierTx('Light')).toBe('#34D9A0'); expect(tierTx('Medium')).toBe('#FF8A3D'); });
it('rel relative time', () => {
  const now = new Date('2026-06-24T20:00:00');
  expect(rel('2026-06-24T08:00', now)).toBe('today');
  expect(rel('2026-06-23T20:00', now)).toBe('yesterday');
});
it('fmtDate', () => { expect(fmtDate('2026-06-10T20:00')).toBe('Jun 10'); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/client && npm test`
Expected: FAIL — `./format.js` missing.

- [ ] **Step 3: Write the implementation**

`client/src/lib/format.js` (port from prototype 1141–1145, 1213–1214, 1264, 1489):
```js
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(iso) { const d = new Date(iso); return MON[d.getMonth()] + ' ' + d.getDate(); }
export function fmtDateY(iso) { const d = new Date(iso); return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
export function rel(iso, now) {
  const days = Math.floor((now - new Date(iso)) / 864e5);
  if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return days + ' days ago';
  if (days < 30) return Math.floor(days / 7) + 'w ago'; if (days < 365) return Math.floor(days / 30) + 'mo ago'; return Math.floor(days / 365) + 'y ago';
}
export function ordinal(n) { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
export function tierBg(t) { return t === 'Heavy' ? 'rgba(255,77,141,0.16)' : t === 'Light' ? 'rgba(52,217,160,0.16)' : 'rgba(255,138,61,0.16)'; }
export function tierTx(t) { return t === 'Heavy' ? '#FF6FA5' : t === 'Light' ? '#34D9A0' : '#FF8A3D'; }
export const MEDALS = [['#FFE08A','#F0A92E','#3A2A08'],['#E6ECF5','#AEB8C9','#222833'],['#F3B27A','#D9824A','#3A1E0C']];
export function medalBg(rank) { const m = MEDALS[rank - 1]; return m ? `linear-gradient(135deg,${m[0]},${m[1]})` : 'rgba(255,255,255,0.08)'; }
export function medalTx(rank) { const m = MEDALS[rank - 1]; return m ? m[2] : '#9D90B5'; }
```

`client/src/lib/colors.js`:
```js
export const NEWPAL = [
  ['#22D3EE','#0EA5E9'],['#A78BFA','#7C3AED'],['#F472B6','#DB2777'],['#FBBF24','#F59E0B'],
  ['#4ADE80','#16A34A'],['#FB923C','#EA580C'],['#38BDF8','#6366F1'],['#F87171','#DC2626'],
];
export function nextColor(playerCount) { return NEWPAL[playerCount % NEWPAL.length]; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/trevor/game_night/client && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/format.js client/src/lib/colors.js client/src/lib/format.test.js
git commit -m "client: format + color helpers"
```

---

### Task 10: API layer + data store (optimistic + SSE live sync)

**Files:**
- Create: `client/src/lib/api.js`, `client/src/store/store.jsx`

**Interfaces:**
- Consumes: `nextColor` (Task 9).
- Produces:
  - `api.js`: `getState()`, `createPlayer(body)`, `updatePlayer(id,body)`, `deletePlayer(id)`, `createGame`, `updateGame`, `deleteGame`, `createPlay`, `updatePlay`, `deletePlay`. All `fetch`-based, JSON.
  - `store.jsx`: `<StoreProvider>` + `useStore()` returning `{ data:{players,games,plays}, ui, setUi, actions }`. On mount: `getState()` + open `EventSource('/api/events')` (on `changed` → refetch). Also refetch on `window` focus. `actions` do **optimistic** local update then call the API (rollback on throw). `now` is `new Date()` provided once at provider mount for stat functions.

- [ ] **Step 1: Write `client/src/lib/api.js`**

```js
async function j(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
  return res.json();
}
export const getState = () => j('GET', '/api/state');
export const createPlayer = (b) => j('POST', '/api/players', b);
export const updatePlayer = (id, b) => j('PATCH', `/api/players/${id}`, b);
export const deletePlayer = (id) => j('DELETE', `/api/players/${id}`);
export const createGame = (b) => j('POST', '/api/games', b);
export const updateGame = (id, b) => j('PATCH', `/api/games/${id}`, b);
export const deleteGame = (id) => j('DELETE', `/api/games/${id}`);
export const createPlay = (b) => j('POST', '/api/plays', b);
export const updatePlay = (id, b) => j('PATCH', `/api/plays/${id}`, b);
export const deletePlay = (id) => j('DELETE', `/api/plays/${id}`);
```

- [ ] **Step 2: Write `client/src/store/store.jsx`**

```js
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as api from '../lib/api.js';
import { nextColor } from '../lib/colors.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [data, setData] = useState({ players: [], games: [], plays: [] });
  const [ui, setUiState] = useState({ screen: 'board', period: 'month', sorts: ['wins'],
    gameId: null, playerId: null, custom: { start: '2026-01-01', end: '2026-06-25' }, absent: {} });
  const now = useRef(new Date()).current;
  const setUi = useCallback((patch) => setUiState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  const refetch = useCallback(async () => { try { setData(await api.getState()); } catch (e) { console.error(e); } }, []);

  useEffect(() => {
    refetch();
    const es = new EventSource('/api/events');
    es.addEventListener('changed', refetch);
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => { es.close(); window.removeEventListener('focus', onFocus); };
  }, [refetch]);

  // Optimistic helper: apply local mutation, fire API, rollback+refetch on error.
  const optimistic = useCallback(async (mutate, call) => {
    const prev = data;
    setData(d => mutate(d));
    try { await call(); await refetch(); }
    catch (e) { console.error(e); setData(prev); }
  }, [data, refetch]);

  const actions = {
    addPlay: (play) => optimistic(
      d => ({ ...d, plays: [...d.plays, { ...play, id: 'tmp-' + Math.round(now.getTime()) }] }),
      () => api.createPlay(play)),
    editPlay: (id, play) => optimistic(
      d => ({ ...d, plays: d.plays.map(p => p.id === id ? { ...p, ...play } : p) }),
      () => api.updatePlay(id, play)),
    removePlay: (id) => optimistic(
      d => ({ ...d, plays: d.plays.filter(p => p.id !== id) }),
      () => api.deletePlay(id)),
    addPlayer: (name, regular) => { const [c1, c2] = nextColor(data.players.length);
      return optimistic(d => ({ ...d, players: [...d.players, { id: 'tmp', name, regular, c1, c2 }] }),
        () => api.createPlayer({ name, regular, c1, c2 })); },
    addGame: (g) => optimistic(d => ({ ...d, games: [...d.games, { ...g, id: 'tmp' }] }), () => api.createGame(g)),
  };

  return <Ctx.Provider value={{ data, ui, setUi, now, refetch, actions }}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 3: Manually verify against the running server**

Run server (Task 5) and client dev (Task 7). In the browser console on the dev app, confirm `EventSource('/api/events')` connects (Network tab shows `events` pending) and that creating a player via the API triggers a refetch. (No automated test for the provider in this pass; covered by E2E behavior during screen tasks.)

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/api.js client/src/store/store.jsx
git commit -m "client: API layer + store with optimistic updates + SSE live sync"
```

---

## Phase D — Client UI (port from prototype)

> **Porting method for all Phase D tasks:** the prototype `Game Night.dc.html` is the visual + behavioral source of truth. For each screen: (1) read the cited template line range and view-model method; (2) translate DC `{{ binding }}` + inline styles into a React component using `theme.css` tokens and the `format.js`/`stats.js` helpers; (3) wire interactions to `store` actions/`setUi`. README.md is authoritative where it and the prototype differ. Each task's "test" is the listed **acceptance criteria** verified in the browser against the prototype.

### Task 11: Shared components + app shell + bottom nav

**Files:**
- Create: `client/src/components/Avatar.jsx`, `MedalChip.jsx`, `TierBadge.jsx`, `Pill.jsx`, `BottomSheet.jsx`, `BottomNav.jsx`
- Modify: `client/src/App.jsx` (wrap in `StoreProvider`, render shell + bottom nav + screen switch)

**Interfaces:**
- Produces: `<Avatar player size/>` (gradient tile + initial, prototype style e.g. line 192/99), `<MedalChip rank/>` (uses `medalBg/medalTx`), `<TierBadge tier/>` (uses `tierBg/tierTx`, line 236), `<Pill label value onClick/>` (board pills, lines 168–181), `<BottomSheet open onClose title>` (slide-up + dimmed backdrop, tokens spec §6), `<BottomNav screen onNav onLog/>` (5-slot floating pill with raised center ➕, spec §6 "Bottom nav"). `App.jsx` renders the current `ui.screen`.

- [ ] **Step 1:** Build the six components per the cited prototype styles, using theme tokens. Center ➕ uses orange→red gradient `linear-gradient(135deg,#FF8A3D,#FF5E62)`, 54px, raised 22px, 3px `#1C1528` ring.
- [ ] **Step 2:** Rewrite `App.jsx`:
```js
import { StoreProvider, useStore } from './store/store.jsx';
import BottomNav from './components/BottomNav.jsx';
import Board from './screens/Board.jsx';
// ...import other screens as they are built; default to Board until then.

function Shell() {
  const { ui, setUi } = useStore();
  const screens = { board: Board /*, games, players, hall, gameDetail, playerDetail, history*/ };
  const Screen = screens[ui.screen] || Board;
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 96px' }}><Screen /></div>
      <BottomNav screen={ui.screen} onNav={(s) => setUi({ screen: s })} onLog={() => setUi({ logOpen: true })} />
    </div>
  );
}
export default function App() { return <StoreProvider><Shell /></StoreProvider>; }
```
- [ ] **Step 3: Acceptance criteria** — app renders the dark themed shell; bottom nav shows 5 slots with a raised orange ➕; tapping tabs switches `ui.screen`; sheets slide up over a dimmed backdrop. Visually matches prototype nav (spec §6).
- [ ] **Step 4: Commit** `git add client/src/components client/src/App.jsx && git commit -m "client: shared components + shell + bottom nav"`

---

### Task 12: Board (Leaderboard) screen + Period/Sort/Explain sheets

**Files:**
- Create: `client/src/screens/Board.jsx`, `client/src/viewmodels/board.js`, `client/src/sheets/Period.jsx`, `client/src/sheets/Sort.jsx`, `client/src/sheets/Explain.jsx`, `client/src/sheets/Custom.jsx`
- Test: `client/src/viewmodels/board.test.js`

**Interfaces:**
- Consumes: `leaderboard`, `periodPlays`, `currentStreak`, `computePick` (stats.js); `medalBg/medalTx`, `fmtDate` (format.js).
- Produces: `buildBoard(data, ui, now)` → `{ champ, rows:[{...lbRow, medalBg, medalTx, cell:{value,label,color}}], empty:boolean, periodLabel, sortLabel, pick }`. Template: prototype lines 143–213 (board) + 1429–1496 (`renderVals`) + sheets 1465–1496. `Period`/`Sort` options per prototype `periodOptions`/`sortOptions` (1466–1481). `Custom` per 1455–1462.

- [ ] **Step 1: Write the failing view-model test**

`client/src/viewmodels/board.test.js`:
```js
import { it, expect } from 'vitest';
import { buildBoard } from './board.js';

const data = {
  players: [{ id: 'p1', name: 'Ann', c1: '#1', c2: '#2', regular: true }, { id: 'p2', name: 'Bob', c1: '#3', c2: '#4', regular: true }],
  games: [{ id: 'g1', name: 'G', tier: 'Medium', dir: 'high', icon: '🎲' }],
  plays: [{ id: 'x1', g: 'g1', d: '2026-06-10T20:00', parts: [['p1', 1, 10], ['p2', 2, 5]] }],
};
const ui = { period: 'month', sorts: ['wins'], custom: { start: '2026-01-01', end: '2026-12-31' }, absent: {} };

it('builds ranked rows with the active sort cell and a champ', () => {
  const vm = buildBoard(data, ui, new Date('2026-06-24T20:00:00'));
  expect(vm.empty).toBe(false);
  expect(vm.rows[0]).toMatchObject({ pid: 'p1', rank: 1 });
  expect(vm.rows[0].cell).toMatchObject({ label: 'Wins', value: 1 });
  expect(vm.champ.pid).toBe('p1');
});

it('empty when no plays in period', () => {
  const vm = buildBoard(data, { ...ui, period: 'lastYear' }, new Date('2026-06-24T20:00:00'));
  expect(vm.empty).toBe(true);
});
```

- [ ] **Step 2: Run** `cd client && npm test` → FAIL (`./board.js` missing).
- [ ] **Step 3: Implement `viewmodels/board.js`** using `periodPlays` + `leaderboard`; map each row to add `medalBg/medalTx` and a `cell` for `ui.sorts[0]` (value formatting per prototype `fmtVal`, 1488). `champ = rows[0] || null`. `pick = computePick(...)`. `empty = rows.length === 0`. `periodLabel`/`sortLabel` per prototype maps (1432/1464).
- [ ] **Step 4: Run** `cd client && npm test` → PASS.
- [ ] **Step 5: Implement `Board.jsx` + the four sheets** per template; wire pills to open Period/Sort sheets, `?` to Explain, custom to Custom sheet. Empty state "No games this period" (line 212).
- [ ] **Step 6: Acceptance criteria** — leaderboard renders ranked rows with medals, `{plays} plays · {winPct}% win`, and the active sort stat large/gold; Period and Sort pills open bottom sheets that change the table live (instant, no reload); Custom range works; `?` explains metrics; empty state shows when the period has no plays. Matches prototype board.
- [ ] **Step 7: Commit** `git add client/src/screens/Board.jsx client/src/viewmodels/board.js client/src/sheets && git commit -m "client: Board screen + period/sort/explain/custom sheets"`

---

### Task 13: Log-a-Play flow + Celebration

**Files:**
- Create: `client/src/flows/LogPlay.jsx`, `client/src/components/Celebration.jsx`, `client/src/sheets/AddGame.jsx`, `client/src/sheets/AddPlayer.jsx`
- Modify: `client/src/App.jsx` (render `LogPlay` when `ui.logOpen`, `Celebration` when `ui.celebrate`)

**Interfaces:**
- Consumes: `store.actions.addPlay/editPlay/addGame/addPlayer`, `recordFor` (to detect new record), `weight`.
- Produces: two-step flow per prototype: step 0 pick game (searchable list, lines 1499–1503), step 1 finish order + scores (tap players in order → auto rank; inline score; remove ✕; "Tap to add" pool with regulars highlighted; ↑ reorder for edit) (lines 1504–1514). On save, build `parts = logOrder.map((pid,i)=>[pid,i+1, score|null])`, call `addPlay`/`editPlay`, and unless `celebrations===false`, show `Celebration` with `type` (`record` if new direction-aware record else `win`), winner avatar, game, score, players-beaten (port `saveLog` 1400–1412 + `makeConfetti` 1395–1399).

- [ ] **Step 1:** Implement `LogPlay.jsx` (both steps), reusing `MedalChip`, `Avatar`, `TierBadge`. Date/time editable (`<input type="datetime-local">` bound to `logDate`).
- [ ] **Step 2:** Implement `Celebration.jsx` (confetti fall + 🥇 "WINNER!" / 🏆 "NEW RECORD!" hero; "Keep playing" dismiss). Respect `prefers-reduced-motion`.
- [ ] **Step 3:** Implement `AddGame.jsx` (name, tier segmented Light/Medium/Heavy, dir High/Low, emoji picker — port `openAddGame`/`saveGame` 1195–1198) and `AddPlayer.jsx` (name + Regular toggle — 1190–1194); both call store actions.
- [ ] **Step 4: Acceptance criteria** — center ➕ opens the flow; pick a game, tap players into finish order (auto-ranked with medals), enter optional scores, save; the new play appears **instantly** in all stats (optimistic); a celebration shows winner/record correctly (record only when the winning score beats the prior record respecting `dir`); editing an existing play via History pre-fills and updates in place; Add Game / Add Player sheets create entities. Matches prototype.
- [ ] **Step 5: Commit** `git add client/src/flows client/src/components/Celebration.jsx client/src/sheets/AddGame.jsx client/src/sheets/AddPlayer.jsx client/src/App.jsx && git commit -m "client: log-a-play flow + celebration + add game/player"`

---

### Task 14: Games list + Game deep-dive

**Files:**
- Create: `client/src/screens/Games.jsx`, `client/src/screens/GameDetail.jsx`, `client/src/viewmodels/games.js`, `client/src/viewmodels/gameDetail.js`
- Test: `client/src/viewmodels/gameDetail.test.js`

**Interfaces:**
- Produces: `buildGamesList(data, query, now)` (port `gamesList` 1216–1228 — most-played sort, plays count, last relative, record score+holder, live search). `buildGameDetail(data, gameId, now)` (port `gameDetail` 1230–1262 — record hero, times played / avg players / last played, King of game, winning-scores bar chart, top-5 direction-aware scores, everyone's record table; empty state).

- [ ] **Step 1: Write `gameDetail.test.js`** asserting on the fixture from Task 8: `buildGameDetail(data,'g1',now)` → `record.score===50`, `plays===1`, `topScores[0].score===50`; `buildGameDetail(data,'g2',now)` (low) → `record.score===10`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** both view-models. **Step 4: Run** → PASS.
- [ ] **Step 5: Implement `Games.jsx`** (template 223–253: header, + Add, search, rows; "No games match" empty) and `GameDetail.jsx` (template 263–355: back link, record hero, stat strip, King, bar chart, top scores, record table). Row tap → `setUi({screen:'gameDetail', gameId})`.
- [ ] **Step 6: Acceptance criteria** — Games list sorted by most-played with record badges and live search; tapping a game opens the deep-dive matching the prototype (record hero, stat strip, King, winning-scores chart scaled to min/max, top-5 med/holder/date, everyone's-record table); direction-aware records correct for low-score games; empty state for a never-played game.
- [ ] **Step 7: Commit** `git add client/src/screens/Games.jsx client/src/screens/GameDetail.jsx client/src/viewmodels/games.js client/src/viewmodels/gameDetail.js client/src/viewmodels/gameDetail.test.js && git commit -m "client: games list + game deep-dive"`

---

### Task 15: Players list + Player profile

**Files:**
- Create: `client/src/screens/Players.jsx`, `client/src/screens/PlayerProfile.jsx`, `client/src/viewmodels/players.js`, `client/src/viewmodels/playerDetail.js`
- Test: `client/src/viewmodels/playerDetail.test.js`

**Interfaces:**
- Produces: `buildPlayersRoster(data, now)` (port `playersRoster` 1183–1189 — sorted by wins, 🔥 streak badge when ≥2). `buildPlayerDetail(data, pid, now, from)` (port `playerDetail` 1268–1319 — record, fav/specialty game, biggest win, current form/streak dots, per-game breakdown, records held, nemesis/victim rivalry, recent results; empty/new state).

- [ ] **Step 1: Write `playerDetail.test.js`** on the Task 8 fixture: `buildPlayerDetail(data,'p1',now)` → `plays===2`, `wins===1`, `beat===2`, `wwinsStr==='0.5'`. New-player path returns `isNew:true`.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Implement screens** — `Players.jsx` (template 582–600) and `PlayerProfile.jsx` (template 460–520 region; back label respects `profileFrom`). Roster rows + leaderboard rows both deep-link via `setUi({screen:'playerDetail', playerId, profileFrom})`.
- [ ] **Step 6: Acceptance criteria** — roster sorted by wins with Regular badge, `{wins} wins · {plays} plays · {winPct}% win`, 🔥 when streak≥2; profile shows record, favorite/specialty, biggest win, form dots, per-game table, records held, nemesis/victim (when met≥3), recent results; new player shows empty state. Matches prototype.
- [ ] **Step 7: Commit** `git add client/src/screens/Players.jsx client/src/screens/PlayerProfile.jsx client/src/viewmodels/players.js client/src/viewmodels/playerDetail.js client/src/viewmodels/playerDetail.test.js && git commit -m "client: players list + player profile"`

---

### Task 16: Hall of Fame

**Files:**
- Create: `client/src/screens/Hall.jsx`, `client/src/viewmodels/hall.js`
- Test: `client/src/viewmodels/hall.test.js`

**Interfaces:**
- Produces: `buildHall(data, now)` (port `hallData` 1336–1382 — G.O.A.T (all-time `wwins` leader), milestones (biggest win, longest streak, most-played, longest-standing record), rivalries (pairs with ≥5 meetings, top 3 by dominance), trophy case (record per game)).

- [ ] **Step 1: Write `hall.test.js`** with a fixture having a pair meeting ≥5 times; assert `buildHall` returns a `champ`, four `milestones`, ≥1 `rivalries`, and `records` length === number of games with a scored play.
- [ ] **Step 2:** FAIL → **Step 3:** implement (guard against empty data: if no plays, return a flag the screen renders as an empty hall) → **Step 4:** PASS.
- [ ] **Step 5: Implement `Hall.jsx`** (template 611–580 region for All-time / G.O.A.T / milestones / rivalries / trophy case).
- [ ] **Step 6: Acceptance criteria** — Hall shows G.O.A.T card, the four milestone cards with correct values, rivalry head-to-heads with split bars (only pairs met ≥5), and a trophy case of per-game records with holders. Matches prototype; no crash on a fresh/empty dataset.
- [ ] **Step 7: Commit** `git add client/src/screens/Hall.jsx client/src/viewmodels/hall.js client/src/viewmodels/hall.test.js && git commit -m "client: hall of fame"`

---

### Task 17: Play History + edit/delete + Pick & Picker sheets

**Files:**
- Create: `client/src/screens/History.jsx`, `client/src/viewmodels/history.js`, `client/src/sheets/DeleteConfirm.jsx`, `client/src/sheets/Pick.jsx`, `client/src/sheets/Picker.jsx`
- Test: `client/src/viewmodels/history.test.js`

**Interfaces:**
- Produces: `buildHistory(data, now)` (port `historyDays` 1321–1333 — reverse-chron grouped by night; per game row: icon, name, 🥇 winner · 🔻 loser · winning score; edit + delete handlers). `DeleteConfirm` (confirmation sheet → `actions.removePlay`). `Pick` sheet (port `computePick` UI 1202–1211/1527+: current candidate, "Not here" marks `ui.absent` & re-cascades, "Reset" clears). `Picker` sheet (port `rollPicker` 1416–1423 — checklist regulars pre-selected, roll random ≠ previous, animated dice → result + confetti).

- [ ] **Step 1: Write `history.test.js`** on the Task 8 fixture (two plays, same? no — different days): assert two day-groups in reverse-chron, each with one game row carrying `winner`/`loser`/score string.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Implement** `History.jsx` (template 372–455 region), `DeleteConfirm`, `Pick`, `Picker`. Tapping a history row opens `LogPlay` in edit mode (`editPlayId`); ✏️/🗑️ actions per row.
- [ ] **Step 6: Acceptance criteria** — history grouped by night (date header + "{n} games · {relative}"); each row shows winner/loser/score; tap edit → pre-filled Log flow with ↑ reorder; delete → confirm → recompute (record self-heals); Pick sheet shows whose pick with "Not here"/"Reset" cascade; Picker rolls a random starter never repeating the previous, with dice animation + confetti. Matches prototype.
- [ ] **Step 7: Commit** `git add client/src/screens/History.jsx client/src/viewmodels/history.js client/src/sheets/DeleteConfirm.jsx client/src/sheets/Pick.jsx client/src/sheets/Picker.jsx && git commit -m "client: history + edit/delete + pick + picker"`

---

### Task 18: Full client test run + production build

**Files:** none new.

- [ ] **Step 1:** Run all client tests: `cd /home/trevor/game_night/client && npm test` → all PASS.
- [ ] **Step 2:** Run all server tests: `cd /home/trevor/game_night/server && node --test` → all PASS.
- [ ] **Step 3:** Production build: `cd /home/trevor/game_night/client && npm run build` → `client/dist/` created with `manifest.webmanifest` + service worker.
- [ ] **Step 4:** Serve built client via the server and smoke-test: `cd /home/trevor/game_night/server && DB_PATH=:memory: PORT=3999 CLIENT_DIR=../client/dist node src/index.js & sleep 1 && curl -s localhost:3999/ | grep -q '<div id="root">' && echo OK && kill %1`
Expected: `OK`.
- [ ] **Step 5: Commit** (lockfiles if changed) `git add -A && git commit -m "client: full build verified end-to-end" || echo "nothing to commit"`

---

## Phase E — Deploy & cutover

### Task 19: Dockerfile + compose entry + deploy.sh

**Files:**
- Create: `Dockerfile`, `deploy.sh`, `.dockerignore`
- Modify: `/home/trevor/docker/docker-compose.yml` (append `game-night` service)

- [ ] **Step 1: Create `Dockerfile`** (multi-stage: build client, run server):
```dockerfile
# --- build client ---
FROM node:20-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- server runtime ---
FROM node:20-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
ENV PORT=3000 DB_PATH=/data/gamenight.db CLIENT_DIR=/app/client/dist
EXPOSE 3000
CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Create `.dockerignore`**:
```
**/node_modules
client/dist
server/data
*.db
.git
```

- [ ] **Step 3: Append the service to `/home/trevor/docker/docker-compose.yml`** (confirm `5557` is free with `ss -tlnp | grep 5557` first; pick another if taken):
```yaml
  game-night:
    build: /home/trevor/game_night
    container_name: game-night
    ports:
      - "127.0.0.1:5557:3000"
    volumes:
      - /home/trevor/docker/game-night/data:/data
    environment:
      - TZ=America/Denver
    restart: unless-stopped
```

- [ ] **Step 4: Create `deploy.sh`** (and `chmod +x`):
```sh
#!/usr/bin/env bash
set -euo pipefail
cd /home/trevor/game_night && git pull
docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night
```

- [ ] **Step 5: Build + run the container, smoke-test through the published port**

Run: `mkdir -p /home/trevor/docker/game-night/data && docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night && sleep 3 && curl -s localhost:5557/api/state`
Expected: returns JSON state (empty arrays if the migrated db isn't copied yet).

- [ ] **Step 6: Commit** `git add Dockerfile .dockerignore deploy.sh && git commit -m "deploy: Dockerfile + deploy.sh (compose entry added on box)"`

---

### Task 20: Caddy + DNS + data cutover + remove Firebase + README

**Files:**
- Modify: `/home/trevor/docker/caddy/Caddyfile`
- Delete: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `public/`, `.github/workflows/firebase-hosting.yml`
- Modify: `README.md`

- [ ] **Step 1: Append the Caddy block** to `/home/trevor/docker/caddy/Caddyfile` (NO `encode gzip` — SSE-safe, see spec §8/§13):
```
gamenight.trevorwithdata.com {
    reverse_proxy 127.0.0.1:5557
}
```
- [ ] **Step 2: Reload Caddy:** `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`
- [ ] **Step 3 (operator):** Add DNS A record `gamenight.trevorwithdata.com → <box public IP>`; wait for it to resolve (`dig +short gamenight.trevorwithdata.com`).
- [ ] **Step 4 (operator): Run the migration** (Task 6 note) to produce `gamenight.db`, copy to `/home/trevor/docker/game-night/data/gamenight.db`, and restart: `docker compose -f /home/trevor/docker/docker-compose.yml restart game-night`. Verify `https://gamenight.trevorwithdata.com/api/state` returns the migrated data.
- [ ] **Step 5: Verify the live PWA** at `https://gamenight.trevorwithdata.com` — loads, installable, leaderboard shows migrated data, logging a play updates instantly and appears on a second device within ~1s (SSE).
- [ ] **Step 6: Remove Firebase artifacts and rewrite README** for the new stack/architecture/deploy:
```bash
git rm -r firebase.json firestore.rules firestore.indexes.json database.rules.json public .github/workflows/firebase-hosting.yml
# edit README.md to describe client/ + server/, local dev, migration, and deploy.sh
git add README.md
git commit -m "cutover: Caddy block, remove Firebase, update README"
```
- [ ] **Step 7: Finish the branch** — use the `superpowers:finishing-a-development-branch` skill to merge `redesign` → `main` (which triggers nothing automatically now; deploys are manual via `deploy.sh`).

---

## Self-Review (completed by plan author)

- **Spec coverage:** §1 goals → all phases; §2 decisions → Tasks 2–7,10,19,20; §3 layout → File Structure + tasks; §4 data model → Task 2; §5 API → Tasks 4–5; §6 frontend/screens/PWA → Tasks 7,11–17; §7 migration → Task 6; §8 deploy → Tasks 19–20; §9 testing → Tasks 2–6,8,12,14–17,18; §11 perf (fetch-once) → Task 10 store; §12 instant updates (optimistic) → Tasks 10,13; §13 live sync (SSE) → Tasks 3,4,5,10,20. No gaps.
- **Placeholder scan:** logic tasks carry full code; UI tasks carry exact prototype line refs + acceptance criteria (a deliberate, faithful-port pattern, not a "TODO"). No "implement later" left.
- **Type consistency:** API uses `{g,d,parts}` for plays and boolean `regular` (Tasks 4,5,10); stats.js consumes that exact shape (Task 8); view-models consume stats.js outputs (Tasks 12,14–17). `medalBg/medalTx`, `tierBg/tierTx`, `NEWPAL`/`nextColor` names consistent across tasks 9–17.
