export async function gameRoutes(app) {
  app.post('/api/games', async (req, reply) => {
    const { name, tier = 'Medium', dir = 'high', icon = '🎲' } = req.body || {};
    if (!name) return reply.code(400).send({ error: 'name required' });
    const id = app.newId('ng');
    app.db.prepare('INSERT INTO games(id,name,tier,dir,icon) VALUES(?,?,?,?,?)').run(id, name, tier, dir, icon);
    app.hub.broadcast('changed');
    return { id, name, tier, dir, icon };
  });
  app.patch('/api/games/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const g = { name: req.body?.name ?? cur.name, tier: req.body?.tier ?? cur.tier,
      dir: req.body?.dir ?? cur.dir, icon: req.body?.icon ?? cur.icon };
    app.db.prepare('UPDATE games SET name=?, tier=?, dir=?, icon=? WHERE id=?')
      .run(g.name, g.tier, g.dir, g.icon, req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, ...g };
  });
  app.delete('/api/games/:id', async (req) => {
    app.db.prepare('DELETE FROM games WHERE id=?').run(req.params.id);
    app.hub.broadcast('changed');
    return { ok: true };
  });
}
