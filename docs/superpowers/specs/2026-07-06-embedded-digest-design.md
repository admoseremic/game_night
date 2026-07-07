# Embedded Digest in the App Shell — Design Spec (2026-07-06)

## Problem

The `/export` digest works, but an AI has to either know that path or follow
the hidden breadcrumb with a second fetch. The user wants ONE fetch of the URL
everyone already knows — `gamenight.trevorwithdata.com` — to return the data.

## Decision

The server injects the **previous month's digest** (the same `renderDigest`
output `/export` serves by default — always prevMonth, never `?month`
variants) into the HTML it serves for `/`, inside a hidden, HTML-escaped
`<div>`. Invisible to humans; the complete data for any non-JS fetcher.

## Behavior

- `GET /` (and the SPA deep-link fallback for non-file, non-API paths) serve
  `dist/index.html` with `<div class="ai-readable">` + escaped digest +
  `</div>` inserted immediately before `</body>`.
  `Cache-Control: no-store` (already the rule for served HTML).
- **Hiding is via a CSS class (`.ai-readable{display:none}` in the shell's
  `<style>`), NOT inline style or `aria-hidden`** — amended 2026-07-06 after
  live testing: readability-style extractors (claude.ai's consumer web fetch,
  Mozilla Readability's `isProbablyVisible`) strip inline-hidden and
  aria-hidden nodes but never apply stylesheets. Class-hiding is invisible in
  real browsers yet survives extraction. This applies to the static breadcrumb
  div too.
- Digest is rendered fresh per request from `readState(db)` — same source,
  same numbers as the app and `/export`.
- HTML-escape `& < >` in the digest text so player/game names can never break
  the page or smuggle markup. The text is inert content.
- **Fail-open:** if digest rendering throws, serve the plain shell unchanged —
  the app must never break because of the embedded digest.
- **UA content negotiation (amended 2026-07-06 after live testing):** requests
  to `/` whose User-Agent matches known AI fetchers
  (`/claude|anthropic|gptbot|chatgpt|oai-search|openai|perplexity/i` — covers
  Claude-User, claude-code, ClaudeBot, Claude-SearchBot per Anthropic's
  published bot docs) get the digest as plain `text/markdown` instead of the
  HTML shell. Rationale: consumer AI fetch pipelines run extraction heuristics
  over HTML (and cache results), which proved flaky even with class-hidden
  text; a markdown body needs no extraction. Human browser UAs never contain
  these tokens. The embedded class-hidden div remains for unknown fetchers.
  Same fail-open rule applies (error → plain shell path).
- The existing static breadcrumb div in `client/index.html` stays (fallback if
  injection is ever bypassed) and gains one line: the current digest is
  embedded further down this page; for OTHER months fetch
  `/export?month=YYYY-MM` (also `/llms.txt`, `/api/state`).
- PWA untouched: the service worker keeps serving its precached plain shell to
  installed apps (navigations never reach the server), which is fine — the
  div is invisible either way. No workbox changes.

## Code layout

- `server/src/export-digest.js` — add pure `digestHtmlFragment(data, { now })`
  → the hidden-div string (escaping inside). Reuses `renderDigest` with no
  month arg (prevMonth default).
- `server/src/index.js` — static plugin gets `index: false` so `/` is ours;
  read `CLIENT_DIR/index.html` once at boot; new `GET /` handler and the
  existing `setNotFoundHandler` fallback both serve
  `html.replace('</body>', fragment + '</body>')` (with the try/catch
  fail-open). Boot fails loudly if `index.html` is missing (same as today's
  behavior when the client build is absent).
- `client/index.html` — one added line in the static breadcrumb div.

## Testing

- Pure tests (`export-digest.test.js`): fragment is wrapped in the hidden div;
  `& < >` in a game/player name arrive escaped; fragment contains the digest
  heading for the previous month relative to a fixed `now`.
- Boot wiring is exercised by deploy verification (curl `/` → digest heading
  present in HTML, `#root` div still present, `/players` deep link also
  carries it), since `index.js` is the untested production boot file by
  existing convention.
- Live check with Claude's real fetcher on the bare domain: one fetch returns
  the data.

## Out of scope

- No `?month` variants on `/` (always previous month; other months via
  `/export?month=`).
- No user-agent sniffing, no visible UI changes, no SW changes.

## SUPERSEDED (2026-07-07)

Removed by user decision — all AI export now happens at /export paths (see
2026-07-07-year-summary-design.md). The UA content negotiation and the
server-injected hidden digest at '/' are gone; index.js reverted to plain
static serving. Root cause of the flakiness that motivated these layers was
the consumer fetcher's stale per-URL cache of the pre-fix page, not our
serving. The static class-hidden breadcrumb div in client/index.html (and the
.ai-readable CSS-class hiding technique it documents) remains.
