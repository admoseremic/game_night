# Game Night data export — feed an AI without a connector

Can't add MCP connectors (locked-down work laptop)? One URL gives any LLM
everything it needs:

    https://gamenight.trevorwithdata.com/export

It's a markdown digest of **last month** by default: monthly leaderboard,
play-by-play log, records broken that month, the year-to-date leaderboard
through that month, and current win streaks — computed with the app's own
stat code, so the numbers always match. For any other month add `?month=YYYY-MM`.

You don't even need to remember that path: the main page
(https://gamenight.trevorwithdata.com) carries hidden instructions that point
any AI at the digest, so "fetch gamenight.trevorwithdata.com and follow the
AI-agent instructions there" also works.

## Starter newsletter prompt

> Fetch https://gamenight.trevorwithdata.com and follow its AI-agent
> instructions to get the monthly digest. Then write a punchy monthly
> Game Night newsletter from it: standings, highlights, records broken, a
> "rivalry corner" from the play log, and one gentle roast of whoever finished
> last. Verify every number against the fetched data — never estimate stats.

Full raw dataset (JSON, all history): https://gamenight.trevorwithdata.com/api/state
