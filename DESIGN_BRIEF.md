# Game Night Stats — Design Brief

*A reference document for the redesign. This describes **what the app does and why** — the jobs people use it for and the rules behind the numbers — not how it currently looks. Treat the existing UI as disposable; treat the use cases and the data/metric definitions as the things to preserve.*

---

## 1. What this app is

A lightweight web app for a recurring board-game group to **log who played what, who won, and how everyone scored** — and then to see stats and leaderboards over time. It's the group's shared scorebook and trophy case.

It is installed as a **mobile app (PWA)** on phones and gets used **at the table, in the moment** — someone enters the results right after a game finishes — as well as **between sessions** for bragging rights and browsing history.

**Who uses it:** members of one game group (think: friends, a family, a club). Everyone shares the same data. There is **no login, no accounts, and no per-user view** — anyone with the link sees and edits everything. The "users" are not individually authenticated; "players" are just names in a roster.

**The emotional job:** make game night more fun and more competitive. The numbers exist to fuel friendly rivalry, celebrate wins, settle "who's actually the best" arguments, and give people a reason to come back.

---

## 2. Core concepts (the data model, in plain language)

Everything in the app is built from three things:

| Concept | What it is | Attributes |
|---|---|---|
| **Player** | A person in the group's roster | Name; "Regular attendee" flag (marks the core crew who usually show up) |
| **Game** | A board game the group owns/plays | Name; **Tier** (Light / Medium / Heavy — a complexity/weight rating); **Scoring direction** (does the *high* score win or the *low* score win?); the current record/best score on file |
| **Play** | One session of one game on one date | Which game; date & time; and a list of participants, each with their **finishing rank** (1st, 2nd, …) and an **optional score** |

A "play" is the central unit — most of the app is about creating plays and then summarizing them.

---

## 3. Key metrics & definitions (glossary)

The designer needs to know what every number *means*, because the redesign will present these — possibly in new ways.

- **Win** — finishing a game in **1st place (rank 1)**. A play can have one winner.
- **Plays** — how many sessions a player participated in (or how many times a game was played).
- **Win %** — wins ÷ plays, as a percentage.
- **Players Beaten ("Beat")** — for each play, how many opponents finished *below* you (worse rank). Summed across all plays. This rewards beating big tables, not just winning small ones. *Example: winning a 6-player game beats 5 people; winning a 2-player game beats 1.*
- **Weighted Wins** — a win counts more for heavier games: **Light = 0.5, Medium = 1.0, Heavy = 1.5**. Rewards people who win complex games, not just quick fillers.
- **Best / Record Score** — per game, the single best score ever recorded, attributed to the player who set it. "Best" respects the game's scoring direction (highest score for high-score-wins games; lowest for low-score-wins games). Updates automatically when a new record is logged, and recalculates if the record-setting play is later deleted.
- **Winner / Loser** — for a given play, the 1st-place finisher and the last-place finisher (the highest rank number).

---

## 4. Use cases (jobs to be done)

These are the things people come to the app to accomplish. **This is the heart of the brief** — the redesign should support all of these, but is free to reimagine *how*.

### 4.1 See who's winning (the leaderboard)
The primary screen. A ranked table of players showing **Wins, Plays, Win %, Players Beaten, and Weighted Wins**. Players who didn't play in the selected period are hidden. People sort by different columns to argue different definitions of "best."

### 4.2 Filter all stats by time period
Every stat can be scoped to a time window: **Current Month, Previous Month, Year-to-Date, Last Year, All Time, or a Custom date range.** This is central — the group thinks in terms of "this month's champion" vs. "all-time greats." Changing the period re-computes every table on the page.

### 4.3 See per-game stats (which games get played, and who's good at them)
A summary of each game: **how many times it's been played, the win distribution (which players have won it and how often), and the record score.** Sorted by most-played. Answers "what's our group's favorite game?" and "who owns this game?" *Today this is a single shallow row per game in one shared table — see §4.5 for the deeper, per-game reporting the group has asked for.*

### 4.4 Browse play history
A reverse-chronological log of individual sessions: **date, game, winner/loser, the winning score, and who played.** This is the receipt — the record of what actually happened on a given night.

### 4.5 Deep-dive into a single game  ⭐ *(explicitly requested by the group)*
The ability to **focus on one specific game and see its full story**, instead of one shallow row in a shared table. For a chosen game:
- **Best / record score — expanded.** Not just a single number, but ideally the *top scores* leaderboard, who holds them, and how scores have trended over time. ("What's the best score anyone's ever gotten at this game?")
- **Who wins this game most often.** A per-game win leaderboard — the "champion" / "king" of that specific game. ("Who always wins Wingspan?")
- **Activity facts:** total times played, when it was last played, typical number of players.
- **Each player's record *in this game*:** their wins, win %, and personal best score for that title.

This is a clear gap today — the only per-game info is the one-row summary in §4.3, with a single best-score value and no way to drill in.

### 4.6 Richer historical & "all-time" reporting  ⭐ *(explicitly requested by the group)*
Go **beyond "the same tables with an All-Time date filter."** The group wants a real way to explore their whole history and celebrate records:
- **All-time leaderboards and records** that feel like a hall of fame, not just another date preset.
- **Trends over time** — how a player's wins or a game's popularity has shifted across months and years.
- **Milestones & records** — biggest win (most players beaten), longest win streak, most-played game ever / this year, records that have stood the longest.
- **Period comparisons** — this month vs. last, this year vs. last.

Today "All Time" simply re-runs the standard monthly tables over a wider date range; there's no dedicated historical or records experience.

### 4.7 Record a new play *(the most important data-entry flow)*
The core action. The user:
1. Confirms the date/time (defaults to right now).
2. Picks the game (from a searchable list — the group may own dozens of games).
3. Adds each participant and their finishing rank; rank pre-fills as 1, 2, 3… as rows are added.
4. Optionally enters each player's score.
5. Saves.

On save, the app automatically computes "players beaten" for everyone and checks whether anyone set a new record score for that game. **This flow happens at the table, often on a phone, sometimes by a tired/distracted person — speed and low friction matter enormously.**

### 4.8 Add a game to the roster
Create a new game with its name, tier, and scoring direction (high-score-wins or low-score-wins). Done occasionally, when the group plays something new.

### 4.9 Add a player to the roster
Create a new player with a name and an optional "regular attendee" flag. Done when someone new joins.

### 4.10 Pick a random starting player
A fun utility for deciding who goes first. The user gets a checklist of players (regulars pre-selected), and the app **randomly picks one — never repeating the immediately previous pick** — and can keep re-rolling. Used live, at the table, before a game starts.

### 4.11 Fix mistakes (delete a play)
Entries get logged wrong (wrong winner, wrong game, duplicate). The user can delete a play, with a confirmation step. Deleting recalculates affected stats and the game's record score.

---

## 5. Business rules & edge cases to preserve

These are easy to lose in a redesign but matter for correctness:

- **Lower rank number = better.** Rank 1 is the winner. Ranks drive both "players beaten" and winner/loser.
- **Scores are optional; ranks are not.** A play is valid with ranks alone (many games have a clear winner but no meaningful score). Stats and leaderboards work entirely off ranks; scores only feed the per-game "record."
- **A player can't be entered twice in the same play.** The current flow prevents selecting the same person in two rows.
- **Record score direction depends on the game.** High-score-wins vs. low-score-wins flips what "best" means. Don't assume higher is always better.
- **Records self-heal.** Setting a record updates it; deleting the play that held the record recomputes it from remaining plays.
- **Weighting & "players beaten" are intentional fairness mechanics** — they exist so the leaderboard isn't just "whoever shows up most" or "whoever only plays 2-player games." Preserve the *intent*, even if presentation changes.
- **Empty/period states exist.** A period with no plays, a brand-new group with no games/players, a game never played — all are real states the redesign must handle gracefully.

---

## 6. Platform & context constraints

- **Mobile-first, installable PWA.** Primary device is a phone, used one-handed at a table. It installs to the home screen and runs full-screen (standalone). Brand/theme color today is a warm orange (`#ffa100`) — open to change.
- **Shared, single-group, no authentication.** Everyone sees the same data and can edit it. There's no notion of "my profile" or private data today (though see opportunities below).
- **Live data.** Tables reflect the latest data and refresh right after any add/delete. The group expects changes to show up immediately for whoever's looking.
- **Small data scale.** One group: tens of players, tens-to-hundreds of games, hundreds-to-thousands of plays over years. No need to design for massive scale — design for *glanceability* and *fast entry*.
- **Used both live and asynchronously.** Two modes: heads-down fast logging *during* game night, and relaxed browsing/bragging *between* nights. These can feel like different experiences.

---

## 7. Known pain points in the current experience

Context for *why* a redesign is wanted — things that are weak today:

- **Everything lives on one long scrolling page** of dense tables — no real navigation, no hierarchy, no sense of "home."
- **Data entry is a fiddly form** — adding players one row at a time, typing ranks/scores into tiny inputs on a phone.
- **No player identity** — players are just rows in a table; there's no profile, history, or personality.
- **The stats are functional but not celebratory** — winning doesn't *feel* like anything; there are no moments of delight.
- **Editing is limited** — you can delete a play but not edit one; you can't edit or remove players/games once created.
- **Lots of jargon on screen** ("W.Wins", "Beat") with no explanation of what the numbers mean.
- **Per-game reporting is shallow** — one shared table with a single "best score" per game; you can't focus on one game or see its top scores, score history, or its own win leaderboard *(see §4.5)*.
- **"All Time" is just a date filter** on the same monthly tables — there's no real historical, trends, or records/hall-of-fame experience *(see §4.6)*.

---

## 8. Opportunities for the redesign (optional, not prescriptive)

The goal is "more user-friendly **and** more fun." These are directions the data already supports — offered as inspiration, not requirements. Pick, drop, or invent freely.

**Friendlier:**
- A real home/dashboard with a clear "this month's champion" hero moment.
- A genuinely fast "log tonight's game" flow (e.g., tap players in finish order rather than typing ranks).
- Plain-language stats with optional explanations/tooltips.
- The ability to edit plays/players/games, not just delete plays.

**More fun:**
- **Player profiles** — a page per person: their record, favorite games, best wins, current form.
- **Rivalries / head-to-head** — "you vs. them" records; auto-detected "nemesis."
- **Achievements, badges, streaks** — win streaks, "first win at a Heavy game," "beat 5+ players," monthly title belts.
- **Game-night recaps** — a shareable summary of a night ("3 games, here's how it went").
- **Trophy case / hall of fame** — celebrate all-time records and champions.
- **Personality & delight** — celebratory animations on a win, fun empty states, the existing random-starting-player picker turned into a moment.
- **Photos / notes on a play** — capture the memory, not just the result.

---

## 9. Open questions for the designer / PM

Worth deciding before or during design:

1. **Identity:** stay fully open/shared, or introduce light player identity (pick "who am I" without full accounts) to unlock profiles and personalization?
2. **Entry model:** keep manual rank entry, or move to a tap-in-finish-order interaction? Should score entry get more prominence or less?
3. **Stat philosophy:** keep all the current metrics (Win %, Players Beaten, Weighted Wins) visible, or simplify the default view and tuck advanced stats deeper?
4. **Editing:** how much full CRUD do we want (edit plays, rename/retire games & players, merge duplicates)?
5. **Tone:** how playful? (e.g., trophies/animations/badges) vs. clean-and-statistical.

---

*Summary for the designer: the must-keeps are the **three entities** (players, games, plays), the **logging-a-play flow**, the **time-filtered leaderboard and per-game/history views**, the **metric definitions** in §3, and the **fairness rules** in §5. The group's two headline asks for the redesign are **deep per-game reporting (§4.5)** and **richer historical / all-time reporting (§4.6)** — design for these as first-class experiences, not date-filtered tables. Everything about layout, navigation, interaction, and visual style is open — and there's lots of room to make it more fun.*
