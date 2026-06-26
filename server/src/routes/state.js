// GET /api/state — the whole dataset in one shot (client computes everything). Spec §5/§11.
export async function stateRoutes(app) {
  app.get('/api/state', async () => {
    const players = app.db.prepare('SELECT id,name,regular,c1,c2 FROM players ORDER BY name')
      .all().map(p => ({ ...p, regular: !!p.regular }));
    const games = app.db.prepare('SELECT id,name,tier,dir,icon FROM games').all();
    const plays = app.db.prepare('SELECT id,game_id,played_at,parts FROM plays ORDER BY played_at')
      .all().map(r => ({ id: r.id, g: r.game_id, d: r.played_at, parts: JSON.parse(r.parts) }));
    return { players, games, plays };
  });
}
