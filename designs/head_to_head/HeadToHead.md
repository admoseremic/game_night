# Handoff: Head‑to‑Head Comparison (Hall of Fame)

A small, self‑contained addition to the existing **Hall of Fame** screen. Read this alongside the main `README.md` — all data model, tokens, and stat conventions there apply unchanged. Reference implementation lives in `Game Night.dc.html` → `class Component` methods **`headToHead()`**, **`pickH2H()`**, **`setH2HSlot()`** (template: the "head to head" block at the top of the Hall screen).

---

## What it is
An interactive picker that lets the user choose **any two players** and instantly see their full matchup history. It sits **above the existing "Rivalries" section** in the Hall of Fame. Rivalries stays as‑is (it auto‑surfaces the most‑contested pairs); this new block lets the user drive the comparison themselves.

---

## Layout (top → bottom, inside one card)
1. **Section header** — "Head to head" + muted subtitle "pick any two".
2. **Two slots** side by side: `Player A` **VS** `Player B`. Each slot shows the selected player's avatar + name, or a dashed "?" placeholder when empty. The **active** slot has a solid gold ring (`#FFC24B`); inactive/empty slots a faint hairline border.
3. **Roster strip** — a horizontal‑scrolling row of every player's avatar (gradient tile + initial + name). Selected players get a gold ring + a small gold "A"/"B" badge; unselected sit at ~0.78 opacity.
4. **Result panel** (only when both slots filled and the pair has met) — see below.

## Interaction model
- State is three fields: **`h2hA`** (player id or null), **`h2hB`** (id or null), **`h2hSlot`** (`'a'` | `'b'` — which slot the next roster tap fills).
- **Tap a roster avatar** → fills the active slot with that player, then flips the active slot to the other one. So two taps from empty fills both. (`pickH2H(pid)`.)
- **Tap a slot** → makes that slot active (gold ring) so the next roster tap replaces it. (`setH2HSlot('a'|'b')`.)
- **No duplicates:** picking a player who's already in the *other* slot moves them out of it rather than letting the same person occupy both slots.
- **Default selection:** when both are null (first open), default to the **most‑contested pair** in the current Hall window — most shared games — so the panel opens with a live matchup instead of empty. Falls back to the first two players in the roster if nobody has met.

## Result panel
Shown when both players are selected **and** they share ≥ 1 game in the active window:
- **Headline:** `{A wins}  wins  {B wins}` — both win totals large, "wins" label between.
- **Split bar:** single horizontal bar, A's share tinted with A's gradient, B's with B's; widths = each player's win share.
- **Verdict line (gold):** `"{leader} leads the series"`, or `"All square right now"` when tied, + `· {n} meetings`.
- **Latest line (muted):** who won the most recent meeting, which game, and the date.
- **Per‑game breakdown:** one row per shared game — game icon, game name, and that game's `W–L` between the two. The winner's number is bright (`#F4EEF8`), the loser's dimmed (`#6E6483`), ties neutral (`#9D90B5`). Sorted by most meetings first.

## States
- **Both picked, never met in this window** → "These two haven't faced off in this window yet."
- **Fewer than two picked** → "Pick two players to see the matchup."

---

## Logic (reproduce exactly — see `headToHead()`)
- Uses the **same time filter as the rest of Hall of Fame** (`hallPeriod`: All Time / Last 2 Years / This Year). Changing the filter recomputes the matchup for the same two players.
- A **meeting** = any play where **both** selected players are in `parts`.
- **Winner of a meeting** = lower finishing `rank` (rank 1 = best). No player‑level ties.
- Aggregate over the filtered `plays`:
  - `meetings` — count of shared plays.
  - `aWins` / `bWins` — wins each across those meetings.
  - **per‑game** — for each shared game, a `{ meetings, aWins, bWins }` tally.
  - **latest** — the most recent shared play (by date): winner, game, date.
- `aPct = round(aWins / meetings * 100)`; B fills the remainder.
- Leader = whoever has more wins; equal ⇒ "Dead even / All square."

```
// pseudocode
plays = allPlays.filteredBy(hallPeriod)
meetings = 0; aWins = 0; bWins = 0; perGame = {}
for play in plays:
  pa = play.parts.find(p => p.id == A); pb = play.parts.find(p => p.id == B)
  if pa and pb:
    meetings++
    aWon = pa.rank < pb.rank
    aWon ? aWins++ : bWins++
    perGame[play.game].{meetings++, aWins/bWins++}
    track latest by play.date
```

## Edge cases to preserve
- A newly added player (zero shared games) → no‑meetings state, not a crash.
- Switching the Hall time filter recomputes against the new window with the **same two players** still selected.
- Selection persists while navigating within Hall; fine to reset on app reload (it's UI/session state, not persisted).
- Roster scrolls horizontally — must stay reachable with many players; keep 44px+ tap targets.

## State summary (add to the UI/session state in README → State Management)
| Field | Type | Notes |
|---|---|---|
| `h2hA` | player id \| null | left slot |
| `h2hB` | player id \| null | right slot |
| `h2hSlot` | `'a'` \| `'b'` | which slot the next roster tap fills |

Nothing here is persisted server‑side — like every other stat, the matchup is a **pure function of `plays` + the active period**. Recompute on read.

## Tokens used (all already in README)
Gold `#FFC24B` (active ring, badge, verdict), card surface `rgba(255,255,255,0.035)`, hairline `rgba(255,255,255,0.06–0.10)`, text primary `#F4EEF8` / muted `#9D90B5` / faint `#6E6483`, player avatar gradients per `c1`/`c2`. Display numbers in **Bricolage Grotesque** 800; everything else **Plus Jakarta Sans**.
