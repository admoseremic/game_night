# Game Night — Redesign Design Spec

**Date:** 2026-06-26
**Status:** Approved for planning
**Author:** Trevor (PM) + Claude

---

## 1. Overview

Rebuild the existing "Game Night Stats" PWA against the new high-fidelity design in
`new_game_night_design/` (`Game Night.dc.html` prototype + `README.md` spec), and move off
the Firebase/Google stack to a self-hosted, owned-data stack.

Game Night is a lightweight, installable mobile web app for a recurring board-game group to log
**who played what, who won, and how everyone scored**, then explore leaderboards, per-game
deep-dives, player profiles, a hall of fame, and play history. Single shared dataset, **no
accounts / no login** — anyone with the link sees and edits everything. It is used **at the table**
for fast logging and **between sessions** for bragging rights.

The redesign README (`new_game_night_design/README.md`) is the authoritative UI/UX and
metrics spec. The prototype's `class Component` is the authoritative source for stat algorithms.
This document covers the **engineering architecture, data, migration, and deployment** decisions.

### Goals
- Faithfully reproduce the new design (colors, typography, spacing, interactions are final).
- Reproduce the prototype's stat math **exactly**.
- Get off Firebase/Firestore and Firebase Hosting; **own the data**.
- Keep it simple and minimal — this is a fun app for one friend group, not a production service.
- Preserve **all existing live data** via a one-time migration.

### Non-goals
- Accounts, login, or real authentication (the app is intentionally wide-open).
- Multi-tenant / multi-group support.
- Big-data scale. Expect tens of players/games and low thousands of plays.

---

## 2. Decisions (locked)

| Area | Decision |
|---|---|
| **Frontend** | React + Vite PWA (`vite-plugin-pwa`). |
| **Backend** | One combined Node (Fastify) server using `better-sqlite3`; serves the built PWA, a small JSON API (`/api/*`), **and an SSE live-update stream (`/api/events`)** from the same origin. |
| **Database** | SQLite (single file on a bind-mounted volume). |
| **Stat computation** | Entirely client-side, ported exactly from the prototype. |
| **Access control** | Wide open — no auth, matching today's Firestore (`allow write: if true`). |
| **Realtime** | **Core feature.** Live cross-device sync via Server-Sent Events (SSE) — matches Firebase's "live for everyone." Every mutation broadcasts a change ping; all phones reconcile to the single SQLite source of truth. Focus/reconnect refetch as backstop. |
| **Hosting** | Docker container on Trevor's box, bound to `127.0.0.1` only, behind existing Caddy with auto-HTTPS. |
| **Domain** | `gamenight.trevorwithdata.com` (new Caddy block + one DNS A record). |
| **Deploy** | Simple `deploy.sh` on the box (`git pull && docker compose up -d --build game-night`). GitHub-Action-over-SSH is a possible later upgrade. |
| **Data** | Migrate **all** existing Firestore data once into SQLite, then retire Firebase. |

---

## 3. Repository layout

```
game_night/
├── client/                 # React + Vite PWA
│   ├── src/
│   │   ├── lib/
│   │   │   ├── stats.js     # PURE stat math, ported exactly from the prototype
│   │   │   ├── stats.test.js
│   │   │   └── api.js       # thin fetch wrapper over /api/*
│   │   ├── store/           # data store (players/games/plays) + UI/session state
│   │   ├── screens/         # Leaderboard, Games, GameDetail, Players, PlayerProfile, Hall, History
│   │   ├── flows/           # LogPlay flow (pick game -> finish order/scores)
│   │   ├── sheets/          # bottom sheets: AddGame, AddPlayer, Pick, Picker, Period, Sort, metric explainer, delete-confirm
│   │   ├── components/      # shared UI (Avatar, MedalChip, TierBadge, Pill, BottomSheet, Celebration)
│   │   ├── theme.css        # design tokens as CSS variables
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── server/                 # Node (Fastify) + better-sqlite3
│   ├── src/
│   │   ├── index.js        # boots Fastify (+ @fastify/compress, skips text/event-stream), serves static client + /api
│   │   ├── db.js           # SQLite connection + schema init/migrations
│   │   ├── events.js       # SSE: connected-client set + broadcast('changed') after mutations
│   │   └── routes/         # players, games, plays, events (/api/events SSE stream)
│   └── package.json
├── scripts/
│   └── migrate-firestore-to-sqlite.mjs   # one-time migration
├── Dockerfile              # multi-stage: build client -> run server
├── deploy.sh               # git pull && docker compose up -d --build game-night
├── docs/superpowers/specs/ # this spec
└── README.md               # updated for the new stack
```

`new_game_night_design/` is kept as a design reference (not shipped).

---

## 4. Data model (SQLite)

Three tables mirroring the prototype's model (`Player`, `Game`, `Play`).

```sql
CREATE TABLE players (
  id      TEXT PRIMARY KEY,         -- stable id (reuse Firestore doc id on migration)
  name    TEXT NOT NULL,
  regular INTEGER NOT NULL DEFAULT 1, -- "Regular attendee" flag (0/1)
  c1      TEXT NOT NULL,            -- avatar gradient color 1 (hex)
  c2      TEXT NOT NULL             -- avatar gradient color 2 (hex)
);

CREATE TABLE games (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Medium',  -- 'Light' | 'Medium' | 'Heavy'
  dir  TEXT NOT NULL DEFAULT 'high',    -- 'high' (high score wins) | 'low'
  icon TEXT NOT NULL DEFAULT '🎲'       -- emoji
);

CREATE TABLE plays (
  id        TEXT PRIMARY KEY,
  game_id   TEXT NOT NULL REFERENCES games(id),
  played_at TEXT NOT NULL,           -- ISO 8601 datetime
  parts     TEXT NOT NULL            -- JSON: [[playerId, rank, scoreOrNull], ...]
);
CREATE INDEX idx_plays_played_at ON plays(played_at);
CREATE INDEX idx_plays_game_id   ON plays(game_id);
```

**Why `parts` as JSON:** the client fetches the whole dataset and computes every stat in memory,
so participants never need to be queried server-side. JSON maps 1:1 to the prototype's in-memory
shape and avoids a join table. This is a **reversible** choice — if queryable participants are ever
needed, swap to a normalized `play_participants(play_id, player_id, rank, score)` table.

**Derived, never stored:** records/best scores, players-beaten, weighted wins, streaks, leaderboards,
rivalries, current-pick. All recomputed on read so they self-heal on edit/delete.

### Business rules to preserve (from the design brief)
- **Lower rank number = better.** Rank 1 wins; one winner per play.
- **Scores optional, ranks required.** `score` may be `null`.
- **No duplicate player** within a single play.
- **Record direction depends on the game** (`high` vs `low`) — never assume higher is better.
- Records **self-heal** — recompute from remaining plays on edit/delete.

---

## 5. API (same origin, wide open)

Minimal REST. No auth. All endpoints return JSON.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/state` | `{ players, games, plays }` — full dataset in one shot. |
| `GET` | `/api/events` | **SSE stream.** Server pushes a `changed` event after every mutation so all connected phones re-sync. Auto-reconnects (native EventSource). |
| `POST` | `/api/players` | create player (server generates id, assigns avatar colors). |
| `PATCH` | `/api/players/:id` | update (name, regular). |
| `DELETE` | `/api/players/:id` | delete. |
| `POST` | `/api/games` | create game. |
| `PATCH` | `/api/games/:id` | update. |
| `DELETE` | `/api/games/:id` | delete. |
| `POST` | `/api/plays` | create play (`game_id, played_at, parts`). |
| `PATCH` | `/api/plays/:id` | update play in place (used by History edit). |
| `DELETE` | `/api/plays/:id` | delete play. |

- The server validates shape lightly (required fields, no duplicate player in `parts`) but enforces
  no permissions. Anything not matching `/api/*` serves the SPA (`index.html` fallback).
- `players_beaten` is **not** persisted on plays (it is derived client-side).
- **Broadcast:** every successful `POST/PATCH/DELETE` writes to SQLite, then pushes a `changed` event
  to all clients connected to `/api/events`. The server keeps the connected SSE streams in an in-memory
  set. Payload is a lightweight ping (e.g. `{type:"changed", at: <iso>}`); clients respond by
  refetching `/api/state` — always converging to the single source of truth (see §13).

---

## 6. Frontend

### State
- **Persistent (from API):** `players[]`, `games[]`, `plays[]`. Everything else derived.
- **UI/session state:** active `screen`, selected `gameId`/`playerId`; `period` (+ `customStart`/`customEnd`);
  `sort`; log-flow draft (`logGameId`, `logOrder[]`, `logScores{}`, `logDate`, `editPlayId`); picker state;
  current-pick `absent{}` set; open sheet flags; `celebrate` payload.
- A small store (React Context or Zustand). Mutations: **optimistic** local update for instant feedback
  on the logging device, then persist via API in the background (roll back on failure).
- **Live sync:** the client opens an `EventSource` to `/api/events`; on a `changed` ping it refetches
  `/api/state` so every phone converges to the server's truth. Backstops: refetch on `window` focus and
  on SSE reconnect (covers missed pings / sleeping phones).

### Stat module (`lib/stats.js`) — ported exactly
Pure functions of `(plays, period, …)`, reproducing the prototype's algorithms:
- **Win** = rank === 1. **Plays** = participations. **Win %** = `round(wins/plays*100)`.
- **Players Beaten** = per play, count of participants with a worse (higher) rank than you; summed.
- **Weighted Wins** = sum of `weight(tier)` over wins, where Light=0.5, Medium=1.0, Heavy=1.5; 1 decimal.
- **Best/Record (per game)** = direction-aware best score (`max` for `high`, `min` for `low`), with holder; recomputed from plays.
- **Current streak** = consecutive most-recent wins (date desc), stop at first non-win.
- **Leaderboard** = aggregate per player over the active period; hide players with 0 plays in period; default sort Wins; sortable by Wins / Win % / Plays / Beaten / W.Wins; medals for rank 1/2/3.
- **Current Pick** = player who lost the most recent play picks next; cascade to next-worst finisher; "Not here" marks absent and re-cascades (session-local set).
- **Time periods** = This Month, Last Month, Year to Date, Last Year, All Time, Custom range — recompute every table.
- **Hall of Fame** = G.O.A.T, records & milestones, rivalries (head-to-head, pairs need ≥5 shared games), trophy case.

These are the critical-correctness surface and are **unit tested** against known fixtures.

### Screens & flows (per `new_game_night_design/README.md`)
Bottom tab bar (Board · Games · ➕ · Players · Hall), default landing = Leaderboard. Log-a-Play
center flow with celebration overlay. Game deep-dive, player profile, play history (grouped by night,
edit/delete), random first-player picker, add-game/add-player sheets. Match tokens (colors, radii,
Bricolage Grotesque + Plus Jakarta Sans), bottom-sheet motion, and reduced-motion handling.

### PWA
`vite-plugin-pwa` generates the manifest + service worker (installable, offline app shell, app icon,
theme color `#130E1B`). Standalone display, portrait, mobile-first.

---

## 7. Data migration (one-time)

`scripts/migrate-firestore-to-sqlite.mjs` reads the existing Firestore project
(`game-night-trevorwithdata`) and writes a fresh `gamenight.db`.

**Mapping:**
- **players:** keep Firestore doc id as `id`; `name` as-is; `regular` defaults to `1`
  (existing roster are the core crew); assign `c1/c2` from the design palette by stable index.
- **games:** keep id; `name`; `tier` from existing tier field or default `Medium`;
  `dir = hi_score_wins ? 'high' : 'low'`; `icon` default `🎲` if absent.
- **plays:** keep id; `game_id = game`; `played_at = dateTime.toDate().toISOString()`;
  `parts = players.map(p => [p.player, p.rank, p.score ?? null])`; **drop** stored `players_beaten`.

**Process:** run locally once → verify row counts + spot-check a few plays/records against the live
app → copy `gamenight.db` to the box volume → cut over → retire Firebase.

**Prerequisite (user):** read access to the current Firestore — a service-account key for
`game-night-trevorwithdata`, or a `firebase firestore:export`. Resolved at implementation time.

---

## 8. Deployment (box + Caddy)

### Container
Multi-stage `Dockerfile`: stage 1 builds the client (`vite build`); stage 2 runs the Fastify server
serving `client/dist` + `/api`, with the SQLite file on a mounted volume.

### docker-compose (append to `/home/trevor/docker/docker-compose.yml`)
```yaml
  game-night:
    build: /home/trevor/game_night
    container_name: game-night
    ports:
      - "127.0.0.1:5557:3000"   # localhost only; public path is via Caddy/HTTPS
    volumes:
      - /home/trevor/docker/game-night/data:/data   # gamenight.db lives here
    environment:
      - TZ=America/Denver
      - DB_PATH=/data/gamenight.db
    restart: unless-stopped
```
(Port `5557` is a placeholder — confirmed unused at deploy time; current box uses 5000/5500/5501/5555/5556/8000/8123/9000/18080/18081.)

### Caddy (append to `/home/trevor/docker/caddy/Caddyfile`)
```
gamenight.trevorwithdata.com {
    reverse_proxy 127.0.0.1:5557
}
```
**No `encode gzip` here — on purpose.** Caddy's gzip encoder buffers `text/event-stream`, which would
collapse the SSE live-sync stream (the exact issue already documented for the alethiom SSE blocks in
this Caddyfile). Compression is instead done inside the Node server via `@fastify/compress`, which
gzips JSON responses but skips `text/event-stream`. This keeps the `/api/state` payload compressed
*and* the live stream working. Then reload Caddy (`docker exec caddy caddy reload --config /etc/caddy/Caddyfile`).

### DNS (user)
Add an A record: `gamenight.trevorwithdata.com → <box public IP>` (matching the existing subdomains).

### deploy.sh
```sh
#!/usr/bin/env bash
set -euo pipefail
cd /home/trevor/game_night && git pull
docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night
```

### Removed artifacts
`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `public/`
(old app), `.github/workflows/firebase-hosting.yml`. README updated for the new stack.

---

## 9. Testing
- **`stats.js` unit tests** — the math the group argues over; cover win %, players-beaten, weighted
  wins, direction-aware records, streaks, leaderboard sort/hide, current-pick cascade, rivalry threshold,
  and each time period. This is the priority test surface.
- **Migration sanity check** — row counts match Firestore; spot-check several plays, a high-win and a
  low-win game record, and date conversion.
- **API smoke tests** — CRUD round-trips against a temp SQLite file; SPA fallback serves `index.html`.
- **Live-sync smoke test** — a mutation triggers a `changed` broadcast to a connected `/api/events`
  client; a second client converges after refetch.

---

## 10. Open prerequisites (resolved at implementation time)
1. **Firestore read access** for migration (service-account key or CLI export).
2. **DNS A record** for `gamenight.trevorwithdata.com` (user action).
3. **Confirm an unused host port** on the box for the container (placeholder `5557`).

---

## 11. Performance & data-loading rationale (decision record)

**Concern:** the current app is slow on wide date ranges, and "download all data to the client"
sounds like it might inherit that.

**Diagnosis of today's slowness:** it is a *Firestore document-fetching* problem, not a computation
problem. A wide range makes the current app pull thousands of play **documents** one at a time, with
per-document latency and read cost. That mechanism does not exist in the new design.

**New design (chosen): client-side compute, fetch once per session.**
- `GET /api/state` returns the whole dataset as **one gzipped JSON response** from SQLite
  (`SELECT *` over a few thousand rows = sub-millisecond; ~100 KB gzipped at current scale).
- Fetched **once on load**, then again only on **window focus** and **after a mutation** — never per
  filter/sort change. So every period/sort change (incl. the widest range) is computed from memory and
  is **instant**. The scenario that is slow today becomes the fastest case.

| Plays | Raw JSON | Gzipped download | Leaderboard compute |
|---|---|---|---|
| 3,000 (~current) | ~640 KB | ~100 KB | <1 ms |
| 10,000 (~15–20 yrs out at ~500/yr) | ~2 MB | ~350 KB | ~2 ms |

**Escape hatch:** because the store is real SQL, if play count ever grew huge we can move heavy math
into server-side queries (`GET /api/leaderboard?period=…` returning only rows) — a clean, isolated
change. Not needed at current/foreseeable scale.

**Validation:** after migration, measure and report the real payload size and load time.

---

## 12. Instant stat updates (decision record)

**Requirement:** adding a play must reflect in all stats **with zero lag** on the device logging it.

**Why this is structurally guaranteed:** no stat is ever stored. Leaderboards, records, streaks,
players-beaten, weighted wins, rivalries, current-pick — all are **pure functions of the in-memory
play list**. There is no stats table to update and no cache to invalidate; the stats *are* a live view
of the plays.

**Flow on save (optimistic update — chosen):**
1. New play is added to the in-memory store **immediately**.
2. Every screen derives its numbers from that store, so React re-renders them in the **same frame** —
   no round-trip, no refetch.
3. The play is `POST`ed to the box in the **background** to persist; on failure, roll back + show error.

This is also what the **celebration overlay** (winner / new-record detection) depends on — it reads the
freshly-updated store at save time.

See §13 for how *other* devices stay in sync.

---

## 13. Live cross-device sync (decision record)

**Requirement:** like Firebase today, a play logged on one phone must appear on **everyone's** phones
live — and no one should see a different leaderboard than anyone else, even briefly/rarely. This is a
**core feature**, not an optional upgrade.

**Mechanism — Server-Sent Events (SSE):**
- Each phone opens a long-lived `EventSource` connection to `GET /api/events`.
- After any successful mutation, the server writes to SQLite, then **broadcasts a `changed` ping** to
  all connected phones. Each phone refetches `/api/state` and recomputes.
- Native `EventSource` **auto-reconnects**; on (re)connect the client refetches once, so a phone that
  slept or dropped network re-syncs automatically. `window` focus refetch is an additional backstop.

**Why divergence is structurally prevented:** every phone always reconciles to the **single SQLite
source of truth**. The logging device shows its change instantly (optimistic, §12); the broadcast then
pulls *every* phone — including the logger — to the same canonical state. Even in a rare simultaneous
double-entry, all phones converge to the state containing both plays within ~1s. There is no
per-device stored stat that can drift.

**Infra note:** SSE requires the Caddy block to **not** gzip (`text/event-stream` buffering) —
compression is handled in Fastify instead, skipping the event stream. See §8.

**Scale:** a handful of phones, infrequent mutations; each `changed` ping triggers one ~100 KB refetch.
Trivial. (If clients ever grew large, the ping could carry the changed record so clients patch in place
instead of refetching — not needed now.)
