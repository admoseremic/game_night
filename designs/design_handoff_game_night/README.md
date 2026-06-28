# Handoff: Game Night Stats — Redesign

## Overview
Game Night is a lightweight, installable mobile web app (PWA) for a recurring board‑game group to log **who played what, who won, and how everyone scored**, then explore stats, leaderboards, per‑game deep‑dives, a hall of fame, and play history. It is the group's shared scorebook and trophy case — used **at the table** for fast logging and **between sessions** for bragging rights.

Single shared dataset, **no accounts / no login** — anyone with the link sees and edits everything. "Players" are just names in a roster.

This package documents a **high‑fidelity** redesign covering the full app.

---

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype that demonstrates the intended look, layout, and behavior. They are **not production code to copy directly.**

- `Game Night.dc.html` — the entire app prototype. It is authored in a small in‑house HTML component runtime ("DC") with an inline‑styled template plus a `class Component` holding all state and the stat algorithms. **Read it as a spec, not as shippable source.** All the business logic (leaderboard computation, weighted wins, players‑beaten, record direction, current‑pick cascade) lives in that class and is the source of truth for behavior.
- `ios-frame.jsx` — a presentational iPhone bezel used only to frame the prototype. **Not part of the product** — ignore it when building; the real app renders full‑screen as a PWA.

**Your task:** recreate these designs in the target codebase's environment using its established patterns (React/React Native, Vue, SwiftUI, native, etc.). If no environment exists yet, pick the most appropriate stack for an installable mobile‑first PWA. The prototype keeps all data in memory; the real app needs a persistence layer (see **Data & Persistence**).

## Fidelity
**High‑fidelity.** Colors, typography, spacing, radii, and interactions are final and intended to be matched closely. Exact tokens are in **Design Tokens** below. The prototype's stat math is intended to be reproduced exactly (see **Metrics & Algorithms**).

---

## Core Data Model

Three entities. (Field names below are suggested; match your backend conventions.)

### Player
| Field | Type | Notes |
|---|---|---|
| `id` | string | stable id |
| `name` | string | display name |
| `regular` | boolean | "Regular attendee" — the core crew; pre‑selected in the first‑player picker |
| (derived) avatar | — | 2‑color gradient + first initial; assign a color pair per player from the palette (see tokens). Prototype stores `c1`/`c2` hex per player. |

### Game
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `tier` | enum | `Light` \| `Medium` \| `Heavy` — complexity/weight |
| `dir` | enum | `high` (high score wins) \| `low` (low score wins) |
| `icon` | string | emoji icon chosen at creation |

The game's **record score is derived**, not stored (recompute from plays — see algorithms), so it self‑heals on delete/edit.

### Play (the central unit)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `g` | string | game id |
| `d` | ISO datetime | date & time of the session |
| `parts` | array | participants: each is `[playerId, rank, score]` |

- `rank`: 1 = winner. **Lower rank number = better.**
- `score`: number **or `null`** (scores are optional; ranks are not).
- A player may appear **at most once** per play.

---

## Metrics & Algorithms (reproduce exactly)

All stats are computed from the `plays` list, filterable by time period. Reference implementations are in `Game Night.dc.html` (`leaderboard()`, `recordFor()` / `recordFromPlays()`, `computePick()`, `currentStreak()`, `hallData()`, `gameDetail()`, `playerDetail()`).lData()`, `gameDetail()`, `playerDetail()`).

- **Win** — finishing rank === 1. One winner per play.
- **Plays** — count of plays a player participated in (or times a game was played).
- **Win %** — `round(wins / plays * 100)`.
- **Players Beaten ("Beat")** — for each play, number of opponents who finished **below** you (higher rank number). Summed across all plays. *Winning a 6‑player game beats 5; a 2‑player game beats 1.* Rewards beating big tables.
- **Weighted Wins (W.Wins)** — each win is weighted by the game's tier: **Light = 0.5, Medium = 1.0, Heavy = 1.5.** Sum across wins. Displayed to 1 decimal.
- **Best / Record Score (per game)** — the single best score on file, respecting `dir`: **max** score for `high` games, **min** for `low` games. Attributed to the player who set it. Recompute from remaining plays after any edit/delete (self‑healing).
- **Winner / Loser of a play** — rank 1 = winner; highest rank number = loser.
- **Current win streak** — consecutive most‑recent plays (by date desc) a player won, stopping at the first non‑win.

### Leaderboard
Aggregate per player over the active period:
```
for each play in period:
  tw = weight(game.tier)            // 0.5 / 1.0 / 1.5
  for each [pid, rank] in play.parts:
    plays++          (per player)
    beat += count of parts with rank > this rank
    if rank == 1: wins++; wwins += tw
winPct = round(wins/plays*100)
```
Players with **0 plays in the period are hidden.** Default sort: **Wins** (single‑select). Sortable by Wins, Win %, Plays, Beaten, W.Wins. Rank 1/2/3 get gold/silver/bronze medal chips (see tokens).

### Current Pick ("whose pick is it")  ⭐ group‑specific rule
The player who **lost the most recent game** picks the next game. If that player isn't present, cascade to the **next‑worst finisher**, and so on.
```
last = most recent play (by date)
ordered = last.parts sorted by rank DESC   // worst finisher first
pick = first player in `ordered` not marked absent
```
"Not here" marks the current candidate absent and re‑cascades (session‑local `absent` set; "Reset" clears it). If everyone from the last game is absent → "anyone can pick." Surfaced via a header **Pick** button → bottom sheet.

### Time Periods (filters every table)
`This Month`, `Last Month`, `Year to Date`, `Last Year`, `All Time`, `Custom range` (date pickers). Changing the period recomputes every table on the page. "All Time" / records also feed the Hall of Fame.

---

## Navigation & Screens

Bottom tab bar (5 slots): **Home/Board · Games · ➕(center, Add Play) · Players · Hall.** A floating center ➕ opens the Log‑a‑Play flow. The default landing screen is the **Leaderboard (Board)**.

### 1. Leaderboard (home / "Board")
- Header: kicker "STANDINGS" + title "Leaderboard"; right‑aligned icon buttons: **Pick** (avatar + "Pick", opens current‑pick sheet — only if there's a pick), 🕘 **History**, 🎲 **Picker**, **?** explainer.
- Two dropdown **pills**: **Period** and **Sort by** — each opens a bottom sheet.
- **Sort is single‑select.** Default sort **Wins**; options in order: Wins, Win %, Plays, Beaten, W.Wins. The active sort's value shows big on the right of each row.
- Ranked player rows: medal/rank chip, avatar, name, `{plays} plays · {winPct}% win`, active sort stat.
- Empty state when no plays in period ("No games this period").
- **?** opens a sheet explaining each metric in plain language.

### 2. Log a Play  ⭐ most important flow (center ➕)
Fast, two‑step, phone‑first:
1. **Pick the game** — searchable list of games (icon, name, tier badge).
2. **Finish order & scores** — editable **date/time**; then **tap players in finish order** (auto‑ranks 1,2,3…; medal chips). Each ordered row has an optional inline **score** field and a remove ✕. A "Tap to add" pool holds remaining players (regulars subtly highlighted). Footer "Save the game."
- On save: compute players‑beaten for all, detect a new record (direction‑aware), and show a **celebration** overlay — confetti + 🥇 "WINNER!" or 🏆 "NEW RECORD!", winner avatar, game, score, and players beaten. ("Keep playing" dismisses.)
- A `celebrations` flag can disable the overlay.

### 3. Games ("The Shelf")
- Header + **+ Add** (opens Add Game sheet). **Search bar** filters by name live; "No games match" empty state.
- Rows sorted by **most‑played**: icon, name, tier badge, `{plays} plays · last {relative}`, record score (🏅), chevron. Tap → Game deep‑dive.

### 4. Game Deep‑Dive  ⭐ headline ask
For one game:
- **Record hero**: big record score, holder avatar + date.
- Stat strip: **Times played · Avg players · Last played**.
- **King of {game}**: per‑game win leader (name + win count).
- **Winning scores over time**: simple bar chart of winner score per play (oldest→newest), height scaled to min/max.
- **Top scores**: top 5 scores (direction‑aware), gold/silver/bronze chips, holder, date, score.
- **Everyone's record here**: table — player, wins, win %, personal best in this game.
- Back to all games.

### 5. Players ("The Crew")
- Header + **+ Add** (Add Player sheet: name + "Regular attendee" toggle).
- Roster sorted by wins: avatar, name, "Regular" badge, `{wins} wins · {plays} plays · {winPct}% win`, and a 🔥 streak badge when current streak ≥ 2.
- Tap → Player profile. (Tapping a player on the leaderboard opens the **same** profile; only the back label differs.)

### 6. Player Profile
Per‑person page (reachable from roster AND leaderboard rows — same screen): record (wins / win % / beaten / w.wins), 🔥 current‑streak badge, favorite & specialty games, biggest win, **Nemesis** (who beats them most) + **Favorite victim** (who they beat most), records held, recent games. See `playerDetail()` for exact fields.
- **Manage row:** a **Regular** toggle (sets whether they're auto‑included/pre‑selected in the random first‑player picker) and a **Color** button opening a 12‑swatch palette sheet to change the player's avatar gradient. Both edit the player in place. (`toggleRegular()`, `setPlayerColor()`, palette in `AVATAR_PALETTE`.)

### 7. Hall of Fame  ⭐ headline ask
A celebratory records experience, **scoped by its own date filter** — three chips at top: **All Time · Last 2 Years · This Year** (`hallPeriod`). Every stat below recomputes for the window; graceful empty state when a window has no games. (`hallData()`.)
- **Two top prizes, side by side:**
  - **Most Wins** (gold) — player with the most 1st‑place finishes in the window. This is the headline "best player."
  - **Best Win %** (green) — highest wins÷plays among players with **≥ 3 plays** in the window (min‑plays gate so a 1‑for‑1 can't win); shows % and raw wins/plays.
- **Records & milestones:**
  - **Biggest blowout** — the single play with the largest **score margin between 1st and 2nd** (direction‑aware; only plays that have scores). "X won by N · game · s1 to s2."
  - **Longest win streak** — most consecutive wins by anyone in the window.
  - **Most‑played game** — most plays logged in the window.
  - **Longest‑standing record** — of current record scores, the one set furthest in the past that still stands (shows age in months).
- **Rivalries (head‑to‑head, "most‑contested"):** over every pair who've shared **≥ 5 games** (≥ 3 for the This‑Year window), pick the pairs with the **most meetings**, then the **closest** record. Card shows each player's wins vs the other, a split bar, total meetings, who leads. (On a player's own profile the same data becomes **Nemesis** / **Favorite victim**.) NOTE: this is intentionally "most meetings + closest," not "most lopsided."
  - *Min‑shared‑games threshold (`MINM`): 5 all‑time, 3 for This Year.*
- **Trophy case** — record score per game, as a **2‑column grid** sorted by most‑played game (most relevant first), capped at **6** with a **"Show all records"** expander. Each tile: game icon, record score, holder avatar + name.
- *Note: Weighted Wins is intentionally NOT a Hall prize (it would compete with "Most Wins" as a second "best player" definition). It still appears on the main leaderboard.*

### 8. Play History ("The Receipt")
Reverse‑chronological log **grouped by night** (date header + "{n} games · {relative}"). Each game row: icon, game, 🥇 winner · 🔻 loser · winning score. Two actions per row:
- **✏️ Edit** (tap row) — opens the Log flow pre‑filled (date/time, finish order with ↑ reorder to fix a wrong winner, scores). Saving updates the play in place and recomputes all downstream stats/records.
- **🗑️ Delete** — confirmation sheet; deleting recomputes affected stats and the game's record.

### Utilities
- **Random first‑player picker** (🎲): checklist of players (regulars pre‑selected), rolls a random starter, **never repeating the immediately previous pick**, re‑rollable. Animated dice → result with confetti.
- **Add Game** sheet: name, tier (Light/Medium/Heavy segmented), scoring direction (High/Low wins), emoji icon picker.
- **Add Player** sheet: name + Regular toggle.

---

## Business Rules & Edge Cases (must preserve)
- **Lower rank number = better.** Rank 1 wins. Ranks drive players‑beaten and winner/loser.
- **Scores optional, ranks required.** Stats/leaderboards work entirely off ranks; scores only feed per‑game records.
- **No duplicate player** in a single play.
- **Record direction depends on the game** (`high` vs `low`) — don't assume higher is better.
- **Records self‑heal** — recompute from remaining plays on edit/delete.
- **Weighting & players‑beaten are intentional fairness mechanics** — preserve the intent even if presentation changes.
- **Empty / new‑group states** must be handled (no plays this period, no games/players yet, a game never played).
- **Live data** — every table reflects the latest data and refreshes immediately after add/edit/delete.

---

## State Management
Prototype keeps everything in one component's state. For the real app, model:
- **Persistent (server/db):** `players[]`, `games[]`, `plays[]`. Everything else is derived.
- **UI/session state:** active `screen`, selected `gameId`/`playerId`; `period` (+ `customStart`/`customEnd`); `sort`; log‑flow draft (`logGameId`, `logOrder[]`, `logScores{}`, `logDate`, `editPlayId`); picker state (`pickerSel`, `pickerPrev`, result); current‑pick `absent{}` set; open sheet/modal flags; `celebrate` payload.
- All leaderboards, records, streaks, rivalries, and the current pick are **pure functions of `plays` + `period`** — recompute on read; never store derived values (keeps records self‑healing).

## Data & Persistence
- Single shared dataset, no auth. A simple hosted store (e.g. a small API + DB, or a realtime store like Firebase/Supabase) fits the "everyone sees the same data, updates show up immediately" requirement.
- Installable **PWA**: standalone display, home‑screen icon, theme color. Mobile‑first, one‑handed use at a table — fast logging is the priority.
- Scale is small (tens of players/games, hundreds–thousands of plays). Optimize for glanceability and fast entry, not big‑data.

---

## Design Tokens

### Color — surfaces & text
| Token | Hex | Use |
|---|---|---|
| App background | `#130E1B` | base; with radial aubergine glow `#36234D` top‑center + faint orange/pink corner glows |
| Card surface | `rgba(255,255,255,0.035)` | default rows/cards |
| Card surface 2 | gradients `#241B33`→`#181122`, `#2E2440`→`#201830` | sheets, icon tiles |
| Hairline border | `rgba(255,255,255,0.06–0.10)` | card/borders |
| Text primary | `#F4EEF8` | |
| Text secondary | `#C9B8E8` | |
| Text muted | `#9D90B5` | |
| Text faint / labels | `#6E6483` | uppercase kickers |

### Color — brand & accents
| Token | Hex | Use |
|---|---|---|
| Orange (primary) | `#FF8A3D` | primary accent, active states |
| Orange→Red gradient | `#FF8A3D` → `#FF5E62` | primary buttons, center ➕, log CTA |
| Gold | `#FFC24B` | champion/record numbers, active sort value, 1st place |
| Green | `#34D9A0` | W.Wins, "best", Light tier |
| Pink | `#FF6FA5` / `#FF4D8D` | beaten stat, Heavy tier |
| Purple | `#9B6CFF` / `#B49BFF` | picker, current‑pick, rivalries |
| Danger | `#FF4D6D` → `#E0334F` | delete |

### Tier badges
- Light → text `#34D9A0`, bg `rgba(52,217,160,0.16)`
- Medium → text `#FF8A3D`, bg `rgba(255,138,61,0.16)`
- Heavy → text `#FF6FA5`, bg `rgba(255,77,141,0.16)`

### Medals (rank 1/2/3)
- Gold gradient `#FFE08A`→`#F0A92E`, text `#3A2A08`
- Silver gradient `#E6ECF5`→`#AEB8C9`, text `#222833`
- Bronze gradient `#F3B27A`→`#D9824A`, text `#3A1E0C`

### Player avatar palette (2‑color gradients, assign per player)
`#FF8A3D/#FF5E62`, `#FF4D8D/#B14DFF`, `#34D9A0/#1FA8E0`, `#9B6CFF/#6C8BFF`, `#FFC24B/#FF8A3D`, `#2DD4BF/#34D399`, `#FB7185/#F472B6`, `#60A5FA/#818CF8` (plus extras in `NEWPAL` for new players). Avatar = gradient tile + first initial.

### Typography
- **Display:** `Bricolage Grotesque` (weights 700/800) — titles, big numbers, names. (variable opsz font)
- **Body/UI:** `Plus Jakarta Sans` (400–800) — everything else.
- Scale (px): page title 25 / hero number 30–46 / section heading 16 / row name 15 / body 13–14 / stat label 9–11 uppercase w/ ~0.5px tracking. Min interactive size 44px tall targets.

### Radius / shadow / spacing
- Radius: rows/cards 16–22, pills/inputs 11–14, icon tiles 11–16, hero cards 22–26, bottom sheets 28 (top corners).
- Page gutter 18px; card gap 8–10px; card padding 11–16px.
- Bottom nav: floating pill, `rgba(28,21,40,0.82)` + blur, ~64px tall, 14px inset, center ➕ raised 22px (54px, orange gradient, 3px `#1C1528` ring, SVG plus icon).
- Sheets: slide up (`translateY` + fade ~0.28s), grip handle, dimmed/blurred backdrop.

### Motion
- Celebration: confetti fall (~1.5–2.9s, staggered), pop/float on the hero, ~0.5s.
- Picker: dice float while rolling (~0.85s), result spins in.
- Streak flame, card shine sweep on champion hero. Keep tasteful; respect reduced‑motion.

### Iconography
Emoji throughout (🏆 🥇 🎯 🎲 🔥 ⚔️ ⚖️ 🏅 🗑️ ✏️ 👑 + per‑game icons). If your platform prefers a vector icon set, swap consistently; emoji are intentional for the playful tone.

---

## Assets
No external image assets — all visuals are CSS/gradients + emoji + the two Google Fonts (Bricolage Grotesque, Plus Jakarta Sans). The iPhone frame (`ios-frame.jsx`) is prototype‑only scaffolding; do not ship it. Provide a PWA app icon and splash in your build.

## Files
- `Game Night.dc.html` — full prototype + all stat algorithms (read `class Component`: `leaderboard`, `recordFor`/`recordFromPlays`, `computePick`, `currentStreak`, `gameDetail`, `playerDetail`, `hallData`, `toggleRegular`, `setPlayerColor`, `saveLog`/`openEditPlay`, `deletePlay`)., `deletePlay`).
- `ios-frame.jsx` — presentational device bezel (ignore for production).
- `README.md` — this document (self‑sufficient spec).
