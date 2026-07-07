# Game Night data export — feed an AI without a connector

Can't add MCP connectors (locked-down work laptop)? One URL gives any LLM
everything it needs:

    https://gamenight.trevorwithdata.com/export

It's a markdown digest of **last month** by default: monthly leaderboard,
play-by-play log, records broken that month, the year-to-date leaderboard
through that month, and current win streaks — computed with the app's own
stat code, so the numbers always match.

Three URL forms (always paths — some AI fetch tools silently drop `?query`
strings, so never use query params with an AI):

- `/export` — last month's digest
- `/export/YYYY-MM` — a specific month (e.g. `/export/2026-05`)
- `/export/YYYY` — a whole-year summary (e.g. `/export/2026`): year
  leaderboard, monthly champions, most-played games, records broken that
  year, current streaks

## Starter newsletter prompt

> Fetch https://gamenight.trevorwithdata.com/export and write a punchy monthly
> Game Night newsletter from it: standings, highlights, records broken, a
> "rivalry corner" from the play log, and one gentle roast of whoever finished
> last. Verify every number against the fetched data — never estimate stats.

That gets last month automatically. For a specific month, swap the URL for
`https://gamenight.trevorwithdata.com/export/YYYY-MM` (e.g. `/export/2026-06`);
for a year-in-review issue, use `https://gamenight.trevorwithdata.com/export/YYYY`.

Full raw dataset (JSON, all history): https://gamenight.trevorwithdata.com/api/state
