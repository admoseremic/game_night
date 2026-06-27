# Game Night

A self-hosted Progressive Web App for tracking board-game-night leaderboards, records,
player stats, and a Hall of Fame. Replaced the original Firebase/vanilla-JS app (archived
on the `legacy-firebase-app` branch) with a React + Fastify + SQLite stack.

---

## Architecture

One repo, two packages:

| Package | Stack | Role |
|---------|-------|------|
| `client/` | React 18 + Vite 5 PWA | All UI; all stat math in `src/lib/stats.js` (pure functions) |
| `server/` | Node 20 + Fastify 4 + better-sqlite3 | Serves built client + JSON API + SSE stream |

**Database:** SQLite single-file DB. Nothing derived is stored — all stats recompute on read
from raw `plays` rows.

**Live sync:** On every mutation the server broadcasts the updated state over a Server-Sent
Events stream (`/api/events`). Clients apply optimistic updates immediately, then reconcile
on the next SSE message. This keeps multiple devices in sync without polling.

---

## Data Model

```sql
-- Players
players(id, name, regular, c1, c2)

-- Games
games(id, name, tier, dir, icon)
--   tier: 'light' | 'medium' | 'heavy'   (weights: 0.5 / 1.0 / 1.5 for weighted wins)
--   dir:  'high' | 'low'                 (which extreme score wins the per-game record)

-- Play sessions
plays(id, game_id, played_at, parts)
--   parts: JSON  [[playerId, rank, scoreOrNull], ...]
--   rank 1 = winner; lower rank = better finish
```

All player stats (wins, win %, weighted wins, players beaten, Hall of Fame entries, etc.)
are derived at read time from these three tables by pure functions in `client/src/lib/stats.js`.
The client fetches the full state once from `/api/state` on load, then streams updates via SSE.

---

## Local Development

### Server (API on :3000)
```bash
cd server
npm install
npm start
```

### Client (Vite dev server on :5173, proxies /api → :3000)
```bash
cd client
npm install
npm run dev
```

### Tests
```bash
# Client unit tests (vitest) — expect 31 passing
cd client && npm test

# Server tests (Node built-in test runner)
cd server && node --test
```

---

## Production Deploy

The app runs as a Docker container on a self-hosted box, reverse-proxied by Caddy at
`https://gamenight.trevorwithdata.com`.

**Compose service** binds `127.0.0.1:5557:3000`.  
**Caddy note:** NO gzip on the game-night block — gzip would buffer the SSE stream and break live sync.

**SQLite volume** is bind-mounted at `/home/trevor/docker/game-night/data/`.

### Deploy steps (manual — no auto-deploy)
```bash
# On the server:
./deploy.sh
# Equivalent to: git pull + docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night
```

---

## Backups

A weekly cron job runs every Monday at 3am and backs up the database to Google Drive:

```
/home/trevor/docker/game-night/backup-gamenight.sh
```

Uses SQLite `VACUUM INTO` for a consistent snapshot. Keeps the last 12 backups.

---

## Data Migration (Historical Note)

The original Firestore data was migrated once to SQLite via:

```
scripts/migrate-firestore-to-sqlite.mjs
```

Used the Firestore Admin SDK, preserved all historical scores and records, and derived the
`dir` (high/low record direction) from the legacy `hi_score_wins` boolean. No need to run
this again — the migration is complete and the Firestore project is retired.

---

## Repo Structure

```
game_night/
├── client/             # React 18 + Vite 5 PWA
│   └── src/
│       └── lib/
│           └── stats.js    # All stat computations (pure functions)
├── server/             # Node 20 + Fastify 4 + better-sqlite3
├── scripts/            # One-off migration scripts (kept for reference)
├── docs/               # Additional documentation
├── deploy.sh           # Production deploy helper
├── Dockerfile          # Container image definition
└── README.md           # This file
```

---

## Legacy / Archive

The original Firebase Hosting app (HTML/CSS/JS + Firestore) is preserved on the
`legacy-firebase-app` branch. Firebase config files (`firebase.json`, `firestore.rules`,
etc.) and the Firebase Hosting CI workflow have been removed from `main`/`redesign`
since they no longer apply.
