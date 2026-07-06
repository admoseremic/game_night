# Export Digest — Design Spec (2026-07-06)

## Problem

The friend's work laptop can't use the MCP endpoint (corporate restrictions on
connectors). He CAN paste a URL into his Claude chat and have it web-fetch the
page. We need one URL that hands any LLM everything it needs to write the
monthly Game Night newsletter — with numbers that exactly match the app.

## Decision

A server-rendered **monthly digest in markdown** at `GET /export`, computed by
the same tested tool functions the MCP server uses (`server/src/mcp-tools.js`,
which call the client's `stats.js`). Plus **AI-discovery breadcrumbs** on the
app shell so any AI pointed at `gamenight.trevorwithdata.com` finds `/export`
on its own.

Read-only, unauthenticated — same posture as `/mcp` and `GET /api/state` (the
data is already public). **Never anything mutating on this path.**

## Endpoint

- `GET /export` → `200`, `Content-Type: text/markdown; charset=utf-8`,
  `Cache-Control: no-store`. Top-level path (not `/api/...`) per user request —
  registered Fastify routes win over the SPA not-found fallback (same
  mechanism `/mcp` relies on).
- Default window: the **previous calendar month** relative to server time
  (newsletter is written just after month end).
- `?month=YYYY-MM` overrides (any month). Must match
  `/^\d{4}-(0[1-9]|1[0-2])$/`; anything else → `400` with a one-line plain-text
  error naming the expected format.
- A month with zero plays still renders the digest, with a "No plays recorded
  in <month>." line in the monthly sections.

## Digest content (in order)

All stats come from existing pure functions in `mcp-tools.js` — the renderer
only formats; it computes no math of its own.

1. **Header + legend** — what this page is, month covered, generated-on date,
   and how to read the data: rank 1 = winner; tier weights Light 0.5 /
   Medium 1.0 / Heavy 1.5; weighted wins = sum of tier weights of won plays;
   each game has a score direction (high or low is best); scores may be null.
2. **Month leaderboard** — the client `leaderboard()` over the month's plays
   (the exact call `getLeaderboard` makes internally after `periodPlays`;
   arbitrary `YYYY-MM` isn't one of its named periods, so the renderer filters
   plays by date prefix itself): plays, wins, weighted wins, win %. Players
   with ≥1 play that month.
3. **Month play log** — `getPlays(since, until, limit: 200)`: one entry per
   play with date, game (+ tier), full finishing order with ranks and scores.
   (200 is far above any real month — current record months are ~50 plays.)
4. **Records broken this month** — from `getRecords`: any all-time record
   whose date falls inside the month, flagged NEW. "None" line otherwise.
5. **Year-to-date leaderboard (through the digest month)** — replaced the
   all-time leaderboard post-launch (2026-07-06, user request): plays from
   Jan 1 of the digest month's year up to and including that month, so
   historical months render the standings as the year stood at the time.
6. ~~All-time records~~ — cut post-launch (2026-07-06): 161 games made the
   digest mostly a records dump; "records broken this month" covers the
   newsletter need.
7. **Current win streaks** — `currentStreak` per player, shown only when ≥ 2.
8. **Footer (self-describing API)** — "For a different month: `/export?month=YYYY-MM`.
   Full raw dataset (JSON): `/api/state`." This lets the LLM discover the
   month parameter without human help.

Expected size ~6–10 KB — far below web-fetch truncation limits.

## AI discovery breadcrumbs

- `client/index.html`: a `<div style="display:none" aria-hidden="true">` in
  `<body>` telling AI agents to fetch
  `https://gamenight.trevorwithdata.com/export` (mentioning `?month=`).
  Invisible to humans and screen readers, but present in the text extraction
  every non-JS fetcher does — and since the SPA shell has almost no other
  static text, it's effectively the only thing an AI sees there.
- `<meta name="description">` with the same pointer (fetchers surface it).
- `GET /llms.txt` → tiny plain-text file (emerging convention agents check):
  one paragraph describing the site + the `/export` and `/api/state` URLs.

## Service-worker fix

The PWA service worker's navigation fallback currently serves the app shell
for ANY navigated URL once the SW is registered (this already affects
`/api/state` in a browser tab). Add to `vite.config.js` VitePWA workbox
config: `navigateFallbackDenylist: [/^\/api\//, /^\/export/, /^\/mcp/, /^\/llms\.txt/]`.
Claude's server-side fetcher never runs the SW, so the friend's flow works
either way — this fix is for humans eyeballing the URL in a browser.

## Code layout

- `server/src/export-digest.js` — pure `renderDigest(data, { month, now })`
  → markdown string. Unit-tested with the same fixture style as
  `mcp-tools.test.js` (month with plays; empty month; record set inside the
  month flagged NEW; a `dir:'low'` game rendered correctly; null scores).
- `server/src/routes/export.js` — `GET /export` (validate `?month`, call
  `readState(db)` + renderer) and `GET /llms.txt` (static string). Route
  tests: 200 + content-type, month selection, 400 on bad month, llms.txt.
- `server/src/app.js` — register `exportRoutes`.
- `client/index.html` — hidden div + meta description.
- `client/vite.config.js` — `navigateFallbackDenylist`.
- `docs/export.md` — friend onboarding: the URL + a starter newsletter prompt
  ("fetch this URL, then write the newsletter; verify every number against
  the page"). Link it from `docs/mcp.md` as the no-connector alternative.
- `CLAUDE.md` — extend the MCP architecture bullet: `/export` digest exists,
  same read-only invariant.

## Out of scope

- No full all-time play-log dump (truncation risk; `/api/state` already
  serves raw data).
- No HTML rendering, no styling — markdown text only.
- No auth, no rate limiting (same exposure as existing public endpoints).
- MCP endpoint stays as-is (works for the user himself and any
  non-restricted Claude).
