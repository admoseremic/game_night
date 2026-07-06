# Export Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A monthly markdown digest at `GET /export` that any LLM can web-fetch to write the Game Night newsletter, plus AI-discovery breadcrumbs (`/llms.txt`, hidden note in the app shell) pointing agents at it.

**Architecture:** One pure renderer (`server/src/export-digest.js`) formats markdown from the already-tested `mcp-tools.js` / client `stats.js` functions — it computes NO math of its own, so digest numbers always match the app. A thin Fastify route serves it. Client changes are static: two breadcrumbs in `index.html` and a service-worker denylist in `vite.config.js`.

**Tech Stack:** Node 20 ESM, Fastify 4, `node:test` + `app.inject()`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-export-digest-design.md`

## Global Constraints

- **Read-only forever:** `/export` and `/llms.txt` must never mutate anything (same invariant as `/mcp` — endpoints are intentionally unauthenticated).
- **No new stat math:** all numbers come from `client/src/lib/stats.js` (via `server/src/mcp-tools.js` or direct calls). The renderer only formats.
- Month param format: `?month=YYYY-MM`, validated by `/^\d{4}-(0[1-9]|1[0-2])$/`; invalid → `400` plain text naming the expected format.
- Default window: previous calendar month relative to server time.
- Responses: `/export` → `text/markdown; charset=utf-8` + `Cache-Control: no-store`; `/llms.txt` → `text/plain; charset=utf-8`.
- Public site URL is hardcoded as `https://gamenight.trevorwithdata.com` (single known deployment).
- Comment style: file-top comments say what the file is for and point at the spec (project convention for future LLMs).
- Server tests: `cd server && node --test` (must stay green, 29 existing tests). Client build: `cd client && npm run build`.

---

### Task 1: Pure digest renderer `export-digest.js`

**Files:**
- Create: `server/src/export-digest.js`
- Test: `server/src/export-digest.test.js`

**Interfaces:**
- Consumes: `leaderboard(data, plays, sort)`, `currentStreak(plays, pid)` from `client/src/lib/stats.js`; `getPlays(data, {since, until, limit})`, `getRecords(data, {})` from `server/src/mcp-tools.js`; `data` is the `readState(db)` shape `{players, games, plays}` where plays are `{id, g, d, parts}`.
- Produces: `renderDigest(data, { month?, now? }) → string` (markdown), `prevMonthOf(now: Date) → 'YYYY-MM'`, `MONTH_RE` (regex). Task 2's route imports all three.

- [ ] **Step 1: Write the failing tests**

Create `server/src/export-digest.test.js` (fixture copied from `mcp-tools.test.js` — same data, so expected numbers are already proven there):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDigest, prevMonthOf, MONTH_RE } from './export-digest.js';

// Same fixture as mcp-tools.test.js: 3 players, 3 games (incl. dir:'low'), plays over two months.
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

test('prevMonthOf handles mid-year and January', () => {
  assert.equal(prevMonthOf(new Date('2026-07-06T12:00:00')), '2026-06');
  assert.equal(prevMonthOf(new Date('2027-01-15T12:00:00')), '2026-12');
});

test('MONTH_RE accepts YYYY-MM only', () => {
  assert.ok(MONTH_RE.test('2026-06'));
  assert.ok(!MONTH_RE.test('2026-13'));
  assert.ok(!MONTH_RE.test('2026-6'));
  assert.ok(!MONTH_RE.test('2026-06-01'));
  assert.ok(!MONTH_RE.test('junk'));
});

test('defaults to the previous calendar month', () => {
  const md = renderDigest(data, { now: new Date('2026-07-06T12:00:00') });
  assert.match(md, /Monthly Digest: June 2026/);
});

test('month play log is chronological and omits null scores', () => {
  const md = renderDigest(data, { month: '2026-06' });
  const brass = md.indexOf('2026-06-02 — Brass');
  const golf = md.indexOf('2026-06-20 — Golf');
  const wing = md.indexOf('2026-06-28 — Wingspan');
  assert.ok(brass > -1 && brass < golf && golf < wing, 'oldest → newest');
  assert.match(md, /1\. Trevor \(95\) · 2\. Jo\n/); // Jo's null score → no parens
});

test('month leaderboard matches stats.js weighted wins', () => {
  const md = renderDigest(data, { month: '2026-06' });
  // June: Trevor plays x2/x3/x4, wins Golf (0.5) + Wingspan (1.0) → 1.5 wwins, 67%
  assert.match(md, /\| 1 \| Trevor \| 3 \| 2 \| 1\.5 \| 67% \| 0 \|/);
});

test('records broken in the month are flagged NEW, absent otherwise', () => {
  const june = renderDigest(data, { month: '2026-06' });
  assert.match(june, /🆕 \*\*Wingspan\*\*: 95 by Trevor on 2026-06-28/);
  assert.match(june, /🆕 \*\*Golf\*\*: 12 by Trevor on 2026-06-20/);
  const may = renderDigest(data, { month: '2026-05' });
  assert.match(may, /## All-time records broken in May 2026\n\nNone\./);
});

test('empty month renders placeholder but keeps all-time sections', () => {
  const md = renderDigest(data, { month: '2026-04' });
  assert.match(md, /No plays recorded in April 2026\./);
  assert.match(md, /## All-time leaderboard/);
  assert.match(md, /\*\*Golf\*\* \(Light, lowest score wins\): 12 — Trevor, 2026-06-20/);
});

test('current win streaks lists only streaks of 2+', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /- Trevor: 2 wins in a row/); // won x3+x4 after losing x2
  assert.ok(!/- Sam:/.test(md)); // Sam last played x3 with rank 2 → streak 0
});

test('footer documents ?month and /api/state for the LLM', () => {
  const md = renderDigest(data, { month: '2026-06' });
  assert.match(md, /\/export\?month=YYYY-MM/);
  assert.match(md, /\/api\/state/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/trevor/game_night/server && node --test src/export-digest.test.js`
Expected: FAIL — `Cannot find module ... export-digest.js`

- [ ] **Step 3: Write the renderer**

Create `server/src/export-digest.js`:

```js
// Pure markdown renderer for GET /export — the monthly digest an LLM web-fetches
// to write the Game Night newsletter (for Claudes that can't use MCP connectors,
// e.g. locked-down work laptops). ALL stat math comes from mcp-tools.js and the
// client's stats.js — this file only formats, so digest numbers always match the
// app. Spec: docs/superpowers/specs/2026-07-06-export-digest-design.md
import { leaderboard, currentStreak } from '../../client/src/lib/stats.js';
import { getPlays, getRecords } from './mcp-tools.js';

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const SITE = 'https://gamenight.trevorwithdata.com';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// 'YYYY-MM' of the calendar month before `now` — the default digest window
// (the newsletter is written just after month end).
export function prevMonthOf(now) {
  const y = now.getFullYear(), m = now.getMonth(); // m is 0-based
  return m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`;
}

const label = (month) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

// One play as a log line: "- 2026-06-02 — Brass: 1. Sam (120) · 2. Trevor (100)"
const playLine = (p) => `- ${p.date.slice(0, 10)} — ${p.game}: ` +
  p.results.map(r => `${r.rank}. ${r.player}${r.score == null ? '' : ` (${r.score})`}`).join(' · ');

// Leaderboard rows (client stats.js shape) as a markdown table.
function table(rows) {
  const out = ['| # | Player | Plays | Wins | Weighted wins | Win % | Last places |',
    '|---|--------|-------|------|---------------|-------|-------------|'];
  for (const r of rows) out.push(`| ${r.rank} | ${r.name} | ${r.plays} | ${r.wins} | ${r.wwinsStr} | ${r.winPct}% | ${r.losses} |`);
  return out.join('\n');
}

export function renderDigest(data, { month, now = new Date() } = {}) {
  const m = month || prevMonthOf(now);
  const monthPlays = data.plays.filter(p => p.d.slice(0, 7) === m);
  const records = getRecords(data, {}).records;
  // "Broken this month" = the CURRENT all-time record was set inside the month.
  // (A record set and then re-broken later won't show in the earlier month.)
  const newRecords = records.filter(r => r.date.slice(0, 7) === m);
  const streaks = data.players
    .map(p => ({ name: p.name, streak: currentStreak(data.plays, p.id) }))
    .filter(s => s.streak >= 2).sort((a, b) => b.streak - a.streak);
  const none = `No plays recorded in ${label(m)}.`;

  // getPlays returns newest-first; a newsletter log reads oldest-first.
  const monthLog = getPlays(data, { since: `${m}-01`, until: `${m}-31`, limit: 200 });
  const chrono = [...monthLog.plays].reverse();

  return `# Game Night — Monthly Digest: ${label(m)}

Generated ${now.toISOString().slice(0, 10)} from live data at ${SITE}.

How to read this data:

- Each play lists players in finishing order; **rank 1 is the winner**.
- **Weighted wins**: a win counts its game's tier weight — Light 0.5, Medium 1.0, Heavy 1.5.
- Each game has a score direction: some count highest score as best, some lowest.
- Scores are optional — plays without scores still count for wins; they just can't set records.

## ${label(m)} leaderboard

${monthPlays.length ? table(leaderboard(data, monthPlays, 'wins')) : none}

## ${label(m)} play log (${monthPlays.length} plays)

${chrono.length ? chrono.map(playLine).join('\n') : none}

## All-time records broken in ${label(m)}

${newRecords.length
    ? newRecords.map(r => `- 🆕 **${r.game}**: ${r.score} by ${r.holder} on ${r.date.slice(0, 10)}`).join('\n')
    : 'None.'}

## All-time leaderboard

${table(leaderboard(data, data.plays, 'wins'))}

## All-time records (best score per game)

${records.map(r => `- **${r.game}** (${r.tier}, ${r.direction === 'low' ? 'lowest' : 'highest'} score wins): ${r.score} — ${r.holder}, ${r.date.slice(0, 10)}`).join('\n') || 'None yet.'}

## Current win streaks

${streaks.length ? streaks.map(s => `- ${s.name}: ${s.streak} wins in a row`).join('\n') : 'No active streaks of 2+ wins.'}

---

For a different month: ${SITE}/export?month=YYYY-MM (e.g. ?month=2026-05).
Full raw dataset as JSON: ${SITE}/api/state
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/trevor/game_night/server && node --test src/export-digest.test.js`
Expected: PASS — 9 tests.

- [ ] **Step 5: Run the whole server suite, then commit**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: all pass (29 existing + 9 new).

```bash
cd /home/trevor/game_night
git add server/src/export-digest.js server/src/export-digest.test.js
git commit -m "feat(export): pure markdown renderer for the monthly digest"
```

---

### Task 2: Routes `GET /export` and `GET /llms.txt`

**Files:**
- Create: `server/src/routes/export.js`
- Modify: `server/src/app.js` (register the routes; currently registers `mcpRoutes` last)
- Test: `server/src/routes/export.test.js`

**Interfaces:**
- Consumes: `renderDigest(data, {month})`, `MONTH_RE` from `../export-digest.js`; `readState(db)` from `../read-state.js`; `app.db` decorated by `buildApp`.
- Produces: `exportRoutes(app)` Fastify plugin serving `GET /export` and `GET /llms.txt`. Task 5 verifies these live.

- [ ] **Step 1: Write the failing tests**

Create `server/src/routes/export.test.js` (same `freshApp` pattern as `routes.test.js`):

```js
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

test('GET /llms.txt is plain text pointing at /export', async () => {
  const app = freshApp();
  const res = await app.inject({ method: 'GET', url: '/llms.txt' });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/plain/);
  assert.match(res.body, /gamenight\.trevorwithdata\.com\/export/);
  assert.match(res.body, /api\/state/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/trevor/game_night/server && node --test src/routes/export.test.js`
Expected: FAIL — `Cannot find module ... routes/export.js` (app.js imports it after Step 3's edit; before the route file exists the import in the test file's `buildApp` chain fails, or 404s if run before editing app.js — either is a valid red).

- [ ] **Step 3: Write the routes and register them**

Create `server/src/routes/export.js`:

```js
// GET /export — monthly markdown digest for LLMs that can't use the /mcp
// connector (fetch the URL instead). GET /llms.txt — AI-discovery index.
// Both READ-ONLY and unauthenticated by design (data is public via /api/state);
// never add mutating handlers here. Top-level paths (not /api/...) so the URL
// is easy to paste into a chat; registered routes beat the SPA fallback.
// Spec: docs/superpowers/specs/2026-07-06-export-digest-design.md
import { readState } from '../read-state.js';
import { renderDigest, MONTH_RE } from '../export-digest.js';

const LLMS_TXT = `# Game Night (gamenight.trevorwithdata.com)

Self-hosted board-game-night leaderboard app for a private group of friends.

Data for AI agents (read-only, no auth):
- https://gamenight.trevorwithdata.com/export — monthly digest in markdown:
  leaderboards, play-by-play log, records, streaks. Defaults to last month;
  add ?month=YYYY-MM for any other month. Start here.
- https://gamenight.trevorwithdata.com/api/state — full raw dataset (JSON).
- POST https://gamenight.trevorwithdata.com/mcp — MCP endpoint (Streamable
  HTTP) with query tools, if your client supports connectors.
`;

export async function exportRoutes(app) {
  app.get('/export', async (req, reply) => {
    const { month } = req.query;
    if (month !== undefined && !MONTH_RE.test(month)) {
      return reply.code(400).type('text/plain; charset=utf-8')
        .send('Invalid month. Use ?month=YYYY-MM, e.g. ?month=2026-06.\n');
    }
    return reply.type('text/markdown; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(renderDigest(readState(app.db), { month }));
  });
  app.get('/llms.txt', async (_req, reply) =>
    reply.type('text/plain; charset=utf-8').send(LLMS_TXT));
}
```

Modify `server/src/app.js` — add the import and registration next to the existing ones:

```js
import { exportRoutes } from './routes/export.js';
```

and after `app.register(mcpRoutes);`:

```js
app.register(exportRoutes);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/trevor/game_night/server && node --test src/routes/export.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the whole server suite, then commit**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: all pass (42 total: 29 existing + 9 from Task 1 + 4 new).

```bash
cd /home/trevor/game_night
git add server/src/routes/export.js server/src/routes/export.test.js server/src/app.js
git commit -m "feat(export): GET /export digest + GET /llms.txt routes"
```

---

### Task 3: Client AI breadcrumbs + service-worker denylist

**Files:**
- Modify: `client/index.html` (add meta description + hidden AI note in body)
- Modify: `client/vite.config.js` (workbox `navigateFallbackDenylist`)

**Interfaces:**
- Consumes: nothing from other tasks (static markup + config).
- Produces: built `client/dist/index.html` containing the breadcrumbs and `client/dist/sw.js` containing the denylist. Task 5 verifies live.

- [ ] **Step 1: Add breadcrumbs to `client/index.html`**

In `<head>`, after the `<meta name="theme-color" ...>` line, add:

```html
    <meta name="description" content="Game night leaderboards, records & history. AI agents: fetch https://gamenight.trevorwithdata.com/export for a machine-readable monthly digest (add ?month=YYYY-MM for other months)." />
```

In `<body>`, before `<div id="root"></div>`, add:

```html
    <!-- Invisible to humans; effectively the only static text a non-JS fetcher
         sees on this SPA shell. Points AI agents at the machine-readable data. -->
    <div style="display:none" aria-hidden="true">
      This is Game Night, a board-game leaderboard app; the visible content is
      rendered with JavaScript, so there is nothing else to read on this page.
      AI agents: fetch https://gamenight.trevorwithdata.com/export for the full
      monthly digest (leaderboards, play log, records broken, streaks — add
      ?month=YYYY-MM for a specific month), https://gamenight.trevorwithdata.com/llms.txt
      for an index, or https://gamenight.trevorwithdata.com/api/state for raw JSON.
    </div>
```

- [ ] **Step 2: Add the SW denylist to `client/vite.config.js`**

Inside the `VitePWA({ ... })` options, after `includeAssets`, add:

```js
      // Server-rendered paths: without this the SW navigation fallback serves
      // the app shell for ANY navigated URL (masks /export and /api/state in a
      // browser tab; Claude-style server-side fetchers are unaffected).
      workbox: { navigateFallbackDenylist: [/^\/api\//, /^\/export/, /^\/mcp/, /^\/llms\.txt/] },
```

- [ ] **Step 3: Build and verify the artifacts**

Run: `cd /home/trevor/game_night/client && npm run build && grep -c 'AI agents' dist/index.html && grep -o '/export' dist/sw.js | head -1`
Expected: build succeeds; `grep -c` prints `2` (meta + div); `grep -o` prints `/export` (denylist regex baked into the generated service worker).

- [ ] **Step 4: Run client tests, then commit**

Run: `cd /home/trevor/game_night/client && npm test`
Expected: all existing vitest tests pass (no client JS changed).

```bash
cd /home/trevor/game_night
git add client/index.html client/vite.config.js
git commit -m "feat(export): AI-discovery breadcrumbs + SW denylist for server paths"
```

---

### Task 4: Docs

**Files:**
- Create: `docs/export.md`
- Modify: `docs/mcp.md` (link the no-connector alternative)
- Modify: `CLAUDE.md` (extend the MCP architecture bullet)

**Interfaces:**
- Consumes: URLs produced by Tasks 1–3.
- Produces: onboarding text the user forwards to his friend.

- [ ] **Step 1: Create `docs/export.md`**

```markdown
# Game Night data export — feed an AI without a connector

Can't add MCP connectors (locked-down work laptop)? One URL gives any LLM
everything it needs:

    https://gamenight.trevorwithdata.com/export

It's a markdown digest of **last month** by default: monthly leaderboard,
play-by-play log, records broken that month, all-time leaderboard + records,
and current win streaks — computed with the app's own stat code, so the
numbers always match. For any other month add `?month=YYYY-MM`.

## Starter newsletter prompt

> Fetch https://gamenight.trevorwithdata.com/export and write a punchy monthly
> Game Night newsletter from it: standings, highlights, records broken, a
> "rivalry corner" from the play log, and one gentle roast of whoever finished
> last. Verify every number against the fetched page — never estimate stats.

Full raw dataset (JSON, all history): https://gamenight.trevorwithdata.com/api/state
```

- [ ] **Step 2: Link it from `docs/mcp.md`**

Append at the end of `docs/mcp.md`:

```markdown
## No connectors allowed?

If your Claude can't add MCP connectors (e.g. a managed work device), use the
fetchable digest instead: see [export.md](export.md).
```

- [ ] **Step 3: Extend `CLAUDE.md`**

In the Architecture section, directly after the existing MCP bullet, add:

```markdown
- Export digest: `GET /export` is a monthly markdown digest for LLMs that can't use MCP (fetch the URL instead; `?month=YYYY-MM`). `server/src/export-digest.js` renders, `routes/export.js` serves it plus `/llms.txt`; hidden breadcrumbs in `client/index.html` point AIs at it. Same read-only invariant as `/mcp`. See `docs/export.md`.
```

- [ ] **Step 4: Commit**

```bash
cd /home/trevor/game_night
git add docs/export.md docs/mcp.md CLAUDE.md
git commit -m "docs(export): onboarding for the fetchable digest"
```

---

### Task 5: Deploy and live verification

**Files:** none (operational). Deploy is MANUAL for this project: push, then `./deploy.sh` on this box (git pull + docker compose rebuild).

**Interfaces:**
- Consumes: everything above, merged on `main`.
- Produces: the live URL the user hands to his friend.

- [ ] **Step 1: Push and deploy**

```bash
cd /home/trevor/game_night && git push
./deploy.sh
```

Expected: compose rebuilds and restarts the `game-night` container without errors.

- [ ] **Step 2: Verify the digest through the Cloudflare edge**

```bash
curl -s https://gamenight.trevorwithdata.com/export | head -40
```

Expected: `# Game Night — Monthly Digest: June 2026` with a populated leaderboard table (real data, 12 players active).

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'https://gamenight.trevorwithdata.com/export?month=2026-13'
curl -s 'https://gamenight.trevorwithdata.com/export?month=2026-05' | head -5
curl -s https://gamenight.trevorwithdata.com/llms.txt
curl -s https://gamenight.trevorwithdata.com/ | grep -c 'AI agents'
```

Expected: `400`; `Monthly Digest: May 2026` header; llms.txt content; `2`.

- [ ] **Step 3: Report to the user**

Hand over the friend-facing URL + starter prompt from `docs/export.md`, note the digest defaults to last month, and remind that installed PWAs may need a full reopen to pick up the new service worker.
