# UX Change Summary — Games Tab

*Scope: only the changes made to the **Games** tab. Hand this to engineering alongside the full handoff. Reference implementation lives in `Game Night.dc.html` (`gamesSummary()`, `gamesList()`, and the Games‑tab template block).*

---

## What changed, in one line
The Games tab gained a **period‑scoped "Summary" view** (now the default) alongside the existing full catalog ("All Games"), switched via a segmented control at the top.

---

## 1. Segmented toggle (new)
A two‑segment control sits directly under the tab header ("Games" / "+ Add"):

```
[  Summary  |  All Games  ]
```

- **Summary is on the left and is the DEFAULT view** when the user opens the Games tab.
- Active segment: gold fill (`#FFC24B`), dark text (`#150F1F`). Inactive: transparent, muted text (`#9D90B5`).
- State: `gamesMode` = `'summary' | 'all'`, defaulting to `'summary'`.

---

## 2. Summary view (new) — the §4.3 "game summary table"
A **period‑scoped activity report**: for the selected time window, which games were played, how often, and who won them.

### Period control
- A **Period pill** at the top of the Summary view opens the same period sheet used on the Leaderboard.
- **It reads/writes the same global `period` state as the Leaderboard** — so the window is consistent across the app (This Month, Last Month, Year to Date, Last Year, All Time, Custom range). Changing it anywhere updates everywhere.

### What shows
- **Only games played in the selected period** appear. Games with zero plays in the window are hidden (that's the point — it's an activity report, not the catalog).
- Sorted by **most‑played in the period**, descending.

### Each game card
- **Icon + name + tier badge** (Light/Medium/Heavy, color‑coded).
- **Plays count is the prominent element** — large orange number (`#FF8A3D`) with a "plays"/"play" label on the right of the card. This is the headline number for the view.
- Sub‑line: `🏅 {record} best · last {relativeTime}` — the record score **in that period** (or "no scores" if none were entered), plus when it was last played.
- **"Won by" row** (below a hairline divider): **every** winner in the period as a chip — avatar + name + `×{winCount}`. (No "+N more" truncation; the full list is shown.)
- Tapping a card opens that game's **deep‑dive** (unchanged screen).

### Empty state
If no games were played in the selected period: a 📭 "No games played this period" message suggesting a wider window or logging a night.

### Calculations
Full algorithms and data shapes are in **§Implementation** below.

---

## 3. All Games view (the existing "shelf") — unchanged behavior, now behind a toggle
Reached via the **All Games** segment. This is the full catalog and the management surface:
- **Search bar** filters the list live by name; "No games match" empty state.
- Shows **every game, including never‑played ones**, sorted by most‑played **all‑time**.
- Row: icon, name, tier badge, `{plays} plays · last {relativeTime}`, all‑time record score, chevron → deep‑dive.
- **"+ Add"** game (name, tier, scoring direction, icon) lives in the header and applies to both views.

---

## Why two views instead of one
They serve different jobs and shouldn't be merged:
- **Summary** = "what have we been playing lately, and who's winning it" — time‑scoped, played‑games‑only, stats‑forward. (Default, because it's the more frequent question.)
- **All Games** = the complete owned catalog — browse/search/add, including games never played. The entry point to deep‑dives.

---

## Engineering notes
- Both views are pure functions of `plays` + `games` (+ the global `period` for Summary). Nothing derived is stored.
- Summary and Leaderboard **share one `period` state** by design — don't fork a second period for the Games tab.
- Default `gamesMode` must be `'summary'`; the segment order is Summary (left), All Games (right).

---

## Implementation (self-contained)

> The team does not have the prototype. Everything needed to build the Games tab is below. Data model recap: a **play** is `{ id, g: gameId, d: ISODateTime, parts: [[playerId, rank, score|null], …] }` — `rank` 1 = winner (lower is better), `score` may be `null` (scores are optional). A **game** is `{ id, name, tier: 'Light'|'Medium'|'Heavy', dir: 'high'|'low', icon }`.

### Period filter (shared with Leaderboard)
`NOW` = current datetime. A play is in the active period by its date `d`:

```
inPeriod(play, period):
  d = play.d
  'all'       → true
  'month'     → d.year == NOW.year AND d.month == NOW.month        // This Month
  'prevMonth' → d is in the calendar month before NOW              // Last Month
  'ytd'       → d.year == NOW.year                                 // Year to Date
  'lastYear'  → d.year == NOW.year - 1                             // Last Year
  'custom'    → customStart 00:00:00 <= d <= customEnd 23:59:59    // inclusive both ends

periodPlays() = plays.filter(p => inPeriod(p, period))
```
`period` is one shared value across Leaderboard + Games Summary. Custom range is two date inputs (`customStart`, `customEnd`, ISO `YYYY-MM-DD`); selecting it sets `period='custom'`.

### Summary list
```
gamesSummary():
  ps = periodPlays()
  rows = []
  for each game g:
    gp = ps.filter(p => p.g == g.id)
    if gp is empty: skip          // played-in-period games only
    // win counts
    winCount = {}                 // playerId -> number of 1st-place finishes
    for each play in gp:
      winner = play.parts.find(rank == 1)
      if winner: winCount[winner.playerId] += 1
    winners = entries(winCount)
               .sortByDesc(count)
               .map(pid,count => { name, initials, c1, c2, wins: count })
    record = recordFromPlays(g.id, gp)        // see below; may be null
    last   = max(gp.map(p => p.d))            // most recent play date
    rows.push({
      id, name, icon, tier,
      plays: gp.length,
      playsLabel: gp.length == 1 ? 'play' : 'plays',
      lastRel: relativeTime(last),            // "3 days ago", "2w ago", …
      winners,                                // ALL winners, no truncation
      recScore: record ? record.score : null,
      recLabel: record ? (record.score + ' best') : 'no scores'
    })
  return rows.sortByDesc(plays)               // most-played in period first
```

### Period-aware, direction-aware record
```
recordFromPlays(gameId, plays):
  g = game(gameId); best = null
  for each play of those plays for gameId:
    for each [playerId, rank, score] in play.parts:
      if score == null: continue
      better = (g.dir == 'high') ? (score > best.score) : (score < best.score)
      if best == null OR better: best = { playerId, score, date: play.d }
  return best        // null if no scores were entered in the window
```
`dir: 'high'` → highest score is the record; `dir: 'low'` → lowest. **Do not assume higher is better.**

### Data shape consumed by the card
```
{
  id, name, icon, tier,                 // tier drives the colored badge
  plays: number, playsLabel: string,    // big orange number + label
  lastRel: string,                      // "last {lastRel}"
  recScore: number|null, recLabel: string,  // sub-line: 🏅 {recLabel}
  winners: [ { name, initials, c1, c2, wins } ]  // "Won by" chips, all of them
}
```
`c1`/`c2` are the player's two avatar-gradient hex stops; `initials` is the first letter of the name.

### Edge cases & rules to pin down
- **No games in the window** → show the 📤 "No games played this period" empty state (don't render an empty list).
- **Game played but no scores entered** → still appears; record shows `no scores` (not hidden, not `0`).
- **Winner tie in "Won by"** (two players with equal win counts): the reference sort is **not** a deliberate tiebreak — it falls back to data order. **Recommendation:** make it deterministic, e.g. break ties alphabetically by name, or by most-recent win. Pick one and apply consistently.
- **A play with no rank-1** shouldn't occur (every play has a winner), but guard defensively — such a play contributes to `plays` but no winner chip.
- **All Games view** is independent of period: it lists every game (including never-played) sorted by all-time play count, and its record/`{n} plays` are **all-time**, not period-scoped.
- **"+ Add"** game writes to the shared `games` list and surfaces in both views immediately.
