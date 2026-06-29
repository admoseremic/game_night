# Game Night — Project Guide for Claude

Self-hosted PWA for board-game-night leaderboards, records, player stats, and a Hall of Fame. Replaced the original Firebase/vanilla-JS app (archived on the `legacy-firebase-app` branch). Live at https://gamenight.trevorwithdata.com.

## Architecture
- One repo, two packages: `client/` (React 18 + Vite 5 PWA — all UI **and** all stat math) and `server/` (Node 20 + Fastify 4 + better-sqlite3 — serves the built client + a JSON API + an SSE stream).
- Client fetches the whole dataset once (`GET /api/state`) and computes every stat in-memory; **optimistic** UI updates; **SSE** (`GET /api/events`, named `changed` event) broadcasts on every mutation so all devices refetch and converge on the single SQLite source of truth.
- Nothing derived is stored — records/streaks/leaderboards/rivalries all recompute on read.

## Critical: stat math
- `client/src/lib/stats.js` is the correctness-critical core: PURE functions ported verbatim from the prototype `designs/design_handoff_game_night/Game Night.dc.html` (`class Component`). Changes here must match the prototype exactly. `client/src/viewmodels/*` compose these; `client/src/screens/*` are presentation only.
- Invariants: lower rank = better (rank 1 wins); tier weights Light 0.5 / Medium 1.0 / Heavy 1.5; record direction per-game (`dir:'high'`=max wins, `'low'`=min); scores optional (null allowed), ranks required; no duplicate player in a play.
- Data model: `players(id,name,regular,c1,c2)`, `games(id,name,tier,dir,icon)`, `plays(id,game_id,played_at,parts)` where `parts` is JSON `[[playerId,rank,scoreOrNull],…]`. API returns plays as `{id,g,d,parts}` and `regular` as a boolean. **Player model has NO `initials` field — derive `name[0].toUpperCase()`.**

## Commands
- Client: `cd client && npm run dev` (Vite :5173, proxies `/api`→:3000) · `npm test` (vitest) · `npm run build`.
- Server: `cd server && npm start` (:3000) · `node --test`.
- Design prototype `designs/design_handoff_game_night/Game Night.dc.html` is the visual + algorithm source of truth (its README describes screens & design tokens).

## Deploy (manual — nothing auto-deploys)
- Runs as the `game-night` Docker container on the box, built from this repo's `Dockerfile` (multi-stage: build client → run server). Bound to `127.0.0.1:5557`; Caddy reverse-proxies the domain to it.
- Deploy: `./deploy.sh` (git pull + `docker compose -f /home/trevor/docker/docker-compose.yml up -d --build game-night`).
- **Infra lives OUTSIDE this repo** in `/home/trevor/docker/`: the compose `game-night` service, the Caddy block (`/home/trevor/docker/caddy/Caddyfile`), and the backup script (`/home/trevor/docker/game-night/backup-gamenight.sh`). SQLite DB is on a bind-mounted volume at `/home/trevor/docker/game-night/data/gamenight.db`.
- Backups: weekly cron (Mon 3am) → consistent `VACUUM INTO` snapshot → Google Drive (`/mnt/gdrive/Trevor's Stuff/game_night_app/`), keeps last 12.

## Gotchas (hard-won — don't relearn these)
- **iOS standalone full-height:** use `height: 100dvh`, never `height: 100%` (it silently breaks `viewport-fit=cover` → dark bar at the screen bottom). html/body are stretched `calc(100dvh + env(safe-area-inset-top))` to force the full viewport; `#root` is `100dvh`; the bottom nav is `position: absolute` inside that container (not `fixed`).
- **SSE must not be buffered:** the gamenight Caddy block has **no `encode gzip`** (gzip buffers the SSE stream); Fastify's compress plugin skips `text/event-stream`.
- **App-shell caching:** the server sends `Cache-Control: no-store` for `index.html` so the installed iOS PWA always gets fresh code (`max-age=0` isn't enough on iOS).
- **Caddy config edits:** the Caddyfile is a single-file Docker bind mount — editing it changes the inode, so the running container keeps loading the old file. `caddy reload` is NOT enough; run `docker compose up -d --force-recreate caddy` (certs persist in the data volume; other sites stay up).
- Bottom sheets: the nav is hidden while any sheet/overlay is open (`overlayOpen` in `App.jsx`) so options don't sit under it; sheets pad with `env(safe-area-inset-bottom)`.
- `better-sqlite3` is a native module (prebuilt binary on install; needs python3/make/g++ only if a prebuilt isn't available).

## Branches
- `main` — the live app. `legacy-firebase-app` — the original Firebase app, archived (do not delete).
- Migration from Firestore was one-time via `scripts/migrate-firestore-to-sqlite.mjs`; manual edits (game emojis, player `regular`/color) live only in SQLite, so don't blindly re-run a full migration (it would clobber them).
