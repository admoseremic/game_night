# Game Night MCP Server — Design

**Date:** 2026-07-04
**Status:** Approved (Trevor, in-session)

## Problem

Trevor's friend wants his own Claude (Claude Desktop / Claude Code) to access Game
Night data — for a monthly "newsletter" and for conversational poking ("who's hot
lately?", "my record vs Trevor?"). The raw data is already public at `/api/state`,
but a blob fetch makes Claude re-derive stats and risks numbers that disagree with
the app. Structured tools + the app's own stat math fix both.

## Solution

A remote MCP endpoint at `POST https://gamenight.trevorwithdata.com/mcp` inside the
existing Fastify server: Streamable HTTP transport, stateless mode, six read-only
tools that compute with the client's own `stats.js`.

## Design

### 1. Endpoint & transport
- `@modelcontextprotocol/sdk` (+ `zod`) added to `server/`.
- New route file `server/src/routes/mcp.js`: `POST /mcp` creates a fresh
  `McpServer` + `StreamableHTTPServerTransport` per request (stateless:
  `sessionIdGenerator: undefined`, `enableJsonResponse: true` — plain JSON
  responses, no SSE framing to worry proxies). `GET`/`DELETE /mcp` → JSON-RPC
  "method not allowed" (405), per the stateless pattern.
- **Invariant: this endpoint only ever gets read-only tools.** No auth (the same
  data is already public at `/api/state`); Cloudflare fronts it like the rest of
  the app.

### 2. Tools (six, all read-only)
All tools read fresh state per call via a shared `readState(db)` helper (extracted
from the `/api/state` route so both use identical shaping) and return JSON text
content. Player/game arguments accept id or case-insensitive name; unknown names
return an error listing valid ones.

1. `get_overview` — players (id/name/regular), games (id/name/tier/dir/icon),
   total plays, first/last play dates.
2. `get_plays` — filters `since`/`until` (YYYY-MM-DD), `game`, `player`,
   `limit` (default 50, max 200), newest first; results carry resolved names:
   `{date, game, results:[{player, rank, score}]}`.
3. `get_leaderboard` — `period`: `month|prevMonth|ytd|lastYear|all` (default
   `all`), `sort`: `wins|wwins|winPct|plays|losses|beatPer` (default `wins`).
   Calls `periodPlays` + `leaderboard` from client `stats.js`; strips UI-only
   fields (colors, initials).
4. `get_records` — per-game best score + holder + date via `recordFor`,
   honoring each game's `dir`; games with no scored plays omitted.
5. `get_player_stats` — plays, wins, winPct, weighted wins, `currentStreak`,
   per-game plays/wins/personal-best, last 5 results.
6. `get_head_to_head` — `playerA`, `playerB`, optional `period` (same values as
   leaderboard): meetings, wins each, verdict, last meeting, per-game tallies.
   Core rule re-implemented server-side (shared play, lower rank wins) because
   the `headToHead.js` viewmodel is UI-flavored (colors, `format.js`) —
   semantics match it, presentation doesn't come along.

### 3. Stat math reuse
- `server/src/mcp-tools.js` holds pure functions `(data, args) → result` and
  imports `weight/periodPlays/leaderboard/recordFor/currentStreak` from
  `../../client/src/lib/stats.js` (pure ESM, no DOM).
- **Dockerfile change (one line):** runtime image adds
  `COPY client/src/lib/stats.js /app/client/src/lib/stats.js` so the relative
  import resolves in the container exactly as in the repo.

### 4. Testing
- `server/src/mcp-tools.test.js`: unit tests per tool over an in-memory fixture,
  including a **parity test** — `get_leaderboard` output equals calling client
  `stats.js` directly on the same fixture.
- `server/src/mcp.integration.test.js`: real MCP `Client` +
  `StreamableHTTPClientTransport` against the app on an ephemeral port —
  handshake, `tools/list`, one `tools/call`.
- Post-deploy: same handshake through the Cloudflare edge.

### 5. Onboarding (docs/mcp.md)
- Claude Code: `claude mcp add --transport http gamenight https://gamenight.trevorwithdata.com/mcp`
- Claude Desktop: Settings → Connectors → Add custom connector → same URL.
- A starter monthly-newsletter prompt.

## Alternatives considered
- **Plain URL fetch of `/api/state`** — zero build, but Claude re-derives stats
  (tier weights, rank direction) with drift risk, and 300KB of JSON per question.
- **Standalone MCP service/subdomain** — isolation without benefit at this scale;
  new compose/Caddy/DNS ceremony.
- **Local stdio MCP distributed to the friend** — no server changes but a
  distribution/update chore (private repo) and scattered correctness ownership.
