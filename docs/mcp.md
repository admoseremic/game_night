# Game Night MCP — connect your Claude

Read-only MCP endpoint over the live leaderboard data (same math as the app).

## Claude Code

    claude mcp add --transport http gamenight https://gamenight.trevorwithdata.com/mcp

## Claude Desktop

Settings → Connectors → Add custom connector → `https://gamenight.trevorwithdata.com/mcp` (no auth).

## Tools

`get_overview` · `get_plays` · `get_leaderboard` · `get_records` · `get_player_stats` · `get_head_to_head`

## Starter newsletter prompt

> Using the gamenight tools: pull last month's plays (`get_plays` with since/until),
> the month's leaderboard (`get_leaderboard` period "prevMonth"), all-time records
> (`get_records`), and head-to-heads for the most active pair. Write a punchy
> monthly Game Night newsletter: standings, highlights, records broken, a "rivalry
> corner", and one gentle roast of whoever finished last. Verify every number
> against the tool output — never estimate stats.
