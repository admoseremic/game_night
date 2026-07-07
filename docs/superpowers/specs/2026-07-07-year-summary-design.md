# Year Summary at /export/YYYY + Bare-Domain Export Removal — Design Spec (2026-07-07)

## Problem

There's no way to get a whole-year view for an AI newsletter (e.g. a year in
review each January) — only monthly digests. Separately, the bare-domain AI
layers (UA-negotiated markdown at `/`, hidden digest embedded in the shell)
proved unreliable with consumer AI fetchers (stale per-URL caches) and are now
redundant: the user's decision is that ALL AI export happens at `/export`
paths.

## Decision

- `GET /export` — unchanged: previous-month digest (the monthly-newsletter
  default).
- `GET /export/YYYY-MM` — unchanged: that month's digest (`?month=` query
  form also still works, undocumented fallback).
- `GET /export/YYYY` — NEW: year summary for that calendar year.
- The bare domain serves ONLY the app again: no UA sniffing, no embedded
  digest. The static hidden breadcrumb in `client/index.html` stays (it's the
  signpost pointing any AI that lands on `/` at `/export`), minus the sentence
  claiming a digest is embedded in the page.

## Routing

One param route `GET /export/:period` dispatches by shape:
`MONTH_RE` (`YYYY-MM`) → monthly digest; `YEAR_RE` (`^\d{4}$`) → year
summary; anything else → 400 naming both forms. Registered routes beat the
SPA fallback, same as today. All responses `text/markdown; charset=utf-8`
+ `Cache-Control: no-store` (400s are `text/plain`).

## Year summary content (renderYearSummary)

Aggregates + most-played — NO full-year play log (~250+ plays would dwarf the
digest; monthly URLs carry the logs). Sections, all computed with the same
client `stats.js` / `mcp-tools.js` code and the same LOCAL-time bucketing
(`localYM`) as the monthly digest:

1. Header `# Game Night — Year Summary: YYYY` + generated date + the same
   "how to read" legend as the monthly digest.
2. **YYYY leaderboard** — `leaderboard()` over every play whose local year
   matches; same table format as the digest.
3. **Monthly champions** — one row per month WITH plays: month name, champion
   (all rank-1 names from that month's leaderboard, ties joined with " & "),
   play count. Doubles as an index to `/export/YYYY-MM`.
4. **Most-played games** — top 10 games by play count that year (name +
   plays). Ties broken by name for deterministic output.
5. **All-time records broken in YYYY** — current all-time records whose date
   falls inside the year (same definition/caveat as the monthly digest: a
   record set then re-broken later shows only under the later date).
6. **Current win streaks** — identical logic to the monthly digest (which
   already reports CURRENT streaks even on historical months — consistent).
7. Footer: monthly detail at `/export/YYYY-MM`, other years at
   `/export/YYYY`, raw JSON at `/api/state`.

Empty year → placeholder lines, same style as empty months.

## Bare-domain removal

- `server/src/index.js` reverts to the pre-embed version (commit dc11002~1):
  fastifyStatic serves `index.html` (no `index: false`), SPA fallback via
  `setNotFoundHandler` + `sendFile`, no `GET /` handler, no `AI_UA` regex, no
  shell read at boot.
- `digestHtmlFragment` + `escapeHtml` deleted from `export-digest.js`; their
  tests deleted.
- `client/index.html`: breadcrumb keeps pointing at `/export` (+ llms.txt,
  api/state) but drops the "embedded further down this page" sentence; the
  `.ai-readable` CSS class + comment stay (still hides the breadcrumb).
- Supersedes `2026-07-06-embedded-digest-design.md` (closing amendment added
  there); docs/export.md, /llms.txt text, digest footer, and CLAUDE.md updated
  to document the three /export forms.

## Read-only invariant

Unchanged and non-negotiable: `/export*`, `/llms.txt`, `/mcp` stay read-only
and unauthenticated; never add mutating handlers.

## Testing (TDD)

- Renderer tests (`export-digest.test.js`): year filter uses LOCAL time —
  fixture gains a play stored `2026-01-01T05:30:00.000Z` (= Dec 31 2025
  23:30 Denver), which must count in 2025, not 2026 (the existing May-31
  boundary play can't prove this: it's 2026 in both UTC and local). The Dec
  2025 play excluded from 2026; champions table rows + tie join; most-played
  ordering; records-in-year; empty-year placeholders; footer URLs.
- Route tests (`routes/export.test.js`): `/export/2026` → year summary 200
  markdown no-store; `/export` still previous-month digest; `/export/junk`
  400 mentions both YYYY and YYYY-MM; `?month=` regression kept.
- Removal regression: `GET /` response contains `<div id="root">` but NOT
  `Monthly Digest` (boot-level check via deploy verification, since index.js
  is the untested production boot file by convention).
- Deploy + edge verification: `/export/2026`, `/export/2025`, `/export`,
  `/export/2026-06`, 400 case, and `curl -A Claude-User /` returning plain
  HTML shell (no markdown, no embedded digest).
