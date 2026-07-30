// readState(db) — the whole dataset in the exact shape the client gets from
// GET /api/state ({players, games, plays}). Shared by the state route and the
// MCP tools (server/src/mcp-tools.js) so both are always identically shaped.
export function readState(db) {
  const players = db.prepare('SELECT id,name,regular,c1,c2 FROM players ORDER BY name')
    .all().map(p => ({ ...p, regular: !!p.regular }));
  const games = db.prepare('SELECT id,name,tier,dir,icon FROM games').all();
  // played_at has minute resolution and back-to-back logged plays often share a minute,
  // so ties break by rowid (insertion order = the order the games were actually logged).
  // seq is the play's chronological position; clients use it to tiebreak date sorts.
  const plays = db.prepare('SELECT id,game_id,played_at,parts FROM plays ORDER BY played_at, rowid')
    .all().map((r, i) => ({ id: r.id, g: r.game_id, d: r.played_at, seq: i, parts: JSON.parse(r.parts) }));
  return { players, games, plays };
}
