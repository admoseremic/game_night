export async function playerRoutes(app) {
  app.post('/api/players', async (req, reply) => {
    const { name, regular = true, c1, c2 } = req.body || {};
    if (!name || !c1 || !c2) return reply.code(400).send({ error: 'name, c1, c2 required' });
    const id = app.newId('np');
    app.db.prepare('INSERT INTO players(id,name,regular,c1,c2) VALUES(?,?,?,?,?)')
      .run(id, name, regular ? 1 : 0, c1, c2);
    app.hub.broadcast('changed');
    return { id, name, regular: !!regular, c1, c2 };
  });
  app.patch('/api/players/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM players WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const name = req.body?.name ?? cur.name;
    const regular = req.body?.regular ?? !!cur.regular;
    app.db.prepare('UPDATE players SET name=?, regular=? WHERE id=?').run(name, regular ? 1 : 0, req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, name, regular: !!regular, c1: cur.c1, c2: cur.c2 };
  });
  app.delete('/api/players/:id', async (req) => {
    app.db.prepare('DELETE FROM players WHERE id=?').run(req.params.id);
    app.hub.broadcast('changed');
    return { ok: true };
  });
}
