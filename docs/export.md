# Game Night data export — feed an AI without a connector

Can't add MCP connectors (locked-down work laptop)? One URL gives any LLM
everything it needs:

    https://gamenight.trevorwithdata.com/export

It's a markdown digest of **last month** by default: monthly leaderboard,
play-by-play log, records broken that month, the year-to-date leaderboard
through that month, and current win streaks — computed with the app's own
stat code, so the numbers always match. For any other month use the path form
`/export/YYYY-MM` (e.g. `/export/2026-05`) — some AI fetch tools silently drop
`?query` strings, so don't use `?month=` with an AI.

Use the /export URL directly — it's the reliable path. (The main page also
serves the digest to known AI fetchers and embeds it as hidden text, but some
consumer AI web-fetch pipelines cache the bare URL unpredictably, so don't
depend on it.)

## Starter newsletter prompt

> Fetch https://gamenight.trevorwithdata.com/export and write a punchy monthly
> Game Night newsletter from it: standings, highlights, records broken, a
> "rivalry corner" from the play log, and one gentle roast of whoever finished
> last. Verify every number against the fetched data — never estimate stats.

That gets last month automatically. For a specific month, swap the URL for
`https://gamenight.trevorwithdata.com/export/YYYY-MM` (e.g. `/export/2026-06`).

Full raw dataset (JSON, all history): https://gamenight.trevorwithdata.com/api/state
