# Game Night data export — feed an AI without a connector

Can't add MCP connectors (locked-down work laptop)? One URL gives any LLM
everything it needs:

    https://gamenight.trevorwithdata.com/export

It's a markdown digest of **last month** by default: monthly leaderboard,
play-by-play log, records broken that month, all-time leaderboard + records,
and current win streaks — computed with the app's own stat code, so the
numbers always match. For any other month add `?month=YYYY-MM`.

## Starter newsletter prompt

> Fetch https://gamenight.trevorwithdata.com/export and write a punchy monthly
> Game Night newsletter from it: standings, highlights, records broken, a
> "rivalry corner" from the play log, and one gentle roast of whoever finished
> last. Verify every number against the fetched page — never estimate stats.

Full raw dataset (JSON, all history): https://gamenight.trevorwithdata.com/api/state
