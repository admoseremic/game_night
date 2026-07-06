# Embedded Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One fetch of `gamenight.trevorwithdata.com` returns the previous month's digest, hidden in the served app shell — no `/export` knowledge or second hop needed.

**Architecture:** A pure function in `export-digest.js` wraps the prevMonth `renderDigest` output in an HTML-escaped hidden `<div>`; the production boot file (`server/src/index.js`) serves `GET /` and the SPA fallback with that fragment injected before `</body>`, fail-open to the plain shell.

**Tech Stack:** Node 20 ESM, Fastify 4, `@fastify/static` v7, `node:test`.

**Spec:** `docs/superpowers/specs/2026-07-06-embedded-digest-design.md`

## Global Constraints

- Always the **previous month** digest on `/` — never `?month` variants there (other months via `/export?month=YYYY-MM`, which the breadcrumb text documents).
- HTML-escape `& < >` in the injected digest; the fragment must be inert text.
- **Fail-open:** any digest-render error → serve the plain shell unchanged.
- Served HTML keeps `Cache-Control: no-store`.
- No new dependencies; no service-worker/workbox changes; no visible UI change.
- Server suite green: 44 existing tests + 1 new.

---

### Task 1: `digestHtmlFragment` + boot wiring + breadcrumb line

**Files:**
- Modify: `server/src/export-digest.js` (append one function at end of file)
- Modify: `server/src/index.js` (static `index: false`, `GET /` route, fallback reuse, fail-open)
- Modify: `client/index.html` (one sentence in the existing hidden breadcrumb div)
- Test: `server/src/export-digest.test.js` (one new test)

**Interfaces:**
- Consumes: `renderDigest(data, { now })` (same file — defaults to prevMonth when no `month`), `readState(db)` from `server/src/read-state.js`, `app.db` decorated by `buildApp`.
- Produces: `digestHtmlFragment(data, { now? }) → string` (a `<div style="display:none" aria-hidden="true">…escaped digest…</div>`), consumed by `index.js`.

- [ ] **Step 1: Write the failing test**

Append to `server/src/export-digest.test.js` (import `digestHtmlFragment` alongside the existing imports from `./export-digest.js`):

```js
test('digestHtmlFragment: hidden div, prevMonth content, HTML-escaped names', () => {
  // A game name with markup characters must arrive escaped and inert.
  const spiky = {
    ...data,
    games: data.games.map(g => (g.id === 'g2' ? { ...g, name: 'Brass <& Sons>' } : g)),
  };
  const frag = digestHtmlFragment(spiky, { now: new Date('2026-07-06T12:00:00') });
  assert.match(frag, /^<div style="display:none" aria-hidden="true">\n/);
  assert.match(frag, /\n<\/div>$/);
  assert.match(frag, /Monthly Digest: June 2026/); // prevMonth of the fixed now
  assert.ok(frag.includes('Brass &lt;&amp; Sons&gt;'), 'markup in names is escaped');
  // Nothing between the wrapper tags may contain raw angle brackets.
  const body = frag.replace(/^<div[^>]*>\n/, '').replace(/\n<\/div>$/, '');
  assert.ok(!/[<>]/.test(body), 'fragment body is inert text');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/trevor/game_night/server && node --test src/export-digest.test.js`
Expected: FAIL — `digestHtmlFragment` is not exported.

- [ ] **Step 3: Implement the fragment builder**

Append to `server/src/export-digest.js`:

```js
// The previous month's digest as an HTML-escaped hidden <div>, for embedding
// in the served app shell (GET / in server/src/index.js): ONE fetch of the
// main URL hands any AI the data without knowing /export. Escaping makes the
// text inert — player/game names can never break the page. Spec:
// docs/superpowers/specs/2026-07-06-embedded-digest-design.md
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function digestHtmlFragment(data, { now = new Date() } = {}) {
  return `<div style="display:none" aria-hidden="true">\n${escapeHtml(renderDigest(data, { now }))}\n</div>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/trevor/game_night/server && node --test src/export-digest.test.js`
Expected: PASS — 12 tests.

- [ ] **Step 5: Wire the boot file**

In `server/src/index.js`:

Add imports (after the existing ones):

```js
import { readFileSync } from 'node:fs';
import { readState } from './read-state.js';
import { digestHtmlFragment } from './export-digest.js';
```

Add `index: false` to the fastifyStatic options (so `/` is ours to serve; the
plugin keeps serving every real file, including `/index.html` itself):

```js
await app.register(fastifyStatic, {
  root: CLIENT_DIR,
  wildcard: false,
  index: false, // '/' is served below with the embedded digest
  // Never cache HTML so iOS standalone always fetches a fresh index.html
  // (which references the latest hashed JS/CSS bundles).
  setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-store'); },
});
```

Replace the current `setNotFoundHandler` block with:

```js
// App shell with the PREVIOUS MONTH's digest embedded as a hidden div before
// </body>: one fetch of the main URL hands any AI the data (spec:
// docs/superpowers/specs/2026-07-06-embedded-digest-design.md). Fail-open —
// a digest error must never break the app, so we fall back to the plain shell.
const shellHtml = readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf8');
const sendShell = (reply) => {
  let html = shellHtml;
  try {
    html = shellHtml.replace('</body>', digestHtmlFragment(readState(db)) + '\n</body>');
  } catch (e) {
    console.error('digest embed failed, serving plain shell:', e);
  }
  // Ensure the SPA shell is never cached by iOS or any proxy.
  return reply.header('Cache-Control', 'no-store').type('text/html; charset=utf-8').send(html);
};

app.get('/', async (_req, reply) => sendShell(reply));

// SPA fallback: anything not /api and not a real file -> the same shell.
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
  return sendShell(reply);
});
```

- [ ] **Step 6: Add the breadcrumb sentence**

In `client/index.html`, inside the existing hidden div, after the sentence
ending `…there is nothing else to read on this page.`, insert:

```
      The previous month's digest is embedded further down this same page
      (hidden div near the end); for any other month fetch
      https://gamenight.trevorwithdata.com/export?month=YYYY-MM.
```

- [ ] **Step 7: Full server suite + local boot smoke test**

Run: `cd /home/trevor/game_night/server && node --test`
Expected: 45/45 pass.

Boot the real server against the built client and a scratch DB (catches any
`@fastify/static` route conflict on `/` immediately):

```bash
cd /home/trevor/game_night/client && npm run build
cd /home/trevor/game_night/server && \
  PORT=3999 DB_PATH=/tmp/claude-1000/-home-trevor-game-night/59895a09-404a-489e-b541-72318c7a3f82/scratchpad/smoke.db \
  CLIENT_DIR=/home/trevor/game_night/client/dist node src/index.js & SMOKE_PID=$!
sleep 1
curl -s http://127.0.0.1:3999/ | grep -c 'Monthly Digest'     # expect 1
curl -s http://127.0.0.1:3999/ | grep -c 'id="root"'          # expect 1 (app intact)
curl -s http://127.0.0.1:3999/players | grep -c 'Monthly Digest'  # expect 1 (fallback too)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3999/manifest.webmanifest  # expect 200 (static intact)
kill $SMOKE_PID
```

(Scratch DB is empty → the digest renders with "No plays recorded" lines —
still counts as the embedded digest; fail-open is NOT what produced it.)

- [ ] **Step 8: Commit**

```bash
cd /home/trevor/game_night
git add server/src/export-digest.js server/src/export-digest.test.js server/src/index.js client/index.html
git commit -m "feat(export): embed prevMonth digest (hidden, escaped) in the served shell"
```

---

### Task 2: Deploy and live verification

**Files:** none (operational; manual deploy: `git push` then `./deploy.sh`).

**Interfaces:**
- Consumes: Task 1 on `main`.
- Produces: live one-fetch behavior on the bare domain.

- [ ] **Step 1: Push and deploy**

```bash
cd /home/trevor/game_night && git push && ./deploy.sh
```

Expected: container rebuilt and Up.

- [ ] **Step 2: Verify through the Cloudflare edge**

```bash
curl -s https://gamenight.trevorwithdata.com/ | grep -c 'Monthly Digest'   # 1
curl -s https://gamenight.trevorwithdata.com/ | grep 'Monthly Digest'      # June 2026 heading, escaped text around it
curl -s https://gamenight.trevorwithdata.com/ | grep -c 'id="root"'        # 1
curl -s https://gamenight.trevorwithdata.com/export | head -3              # /export unchanged
```

- [ ] **Step 3: Verify with a real AI fetcher**

Use Claude's own web fetcher (controller does this via WebFetch) on the BARE
domain and confirm the returned content includes the June leaderboard data in
one fetch — no follow-up request to /export needed.
