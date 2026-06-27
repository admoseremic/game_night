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
    const c1 = req.body?.c1 ?? cur.c1;
    const c2 = req.body?.c2 ?? cur.c2;
    app.db.prepare('UPDATE players SET name=?, regular=?, c1=?, c2=? WHERE id=?').run(name, regular ? 1 : 0, c1, c2, req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, name, regular: !!regular, c1, c2 };
  });
  app.delete('/api/players/:id', async (req, reply) => {
    // Refuse to delete a player who is referenced in any play's parts JSON array.
    const plays = app.db.prepare('SELECT parts FROM plays').all();
    const referenced = plays.some(p => JSON.parse(p.parts).some(part => part[0] === req.params.id));
    if (referenced) return reply.code(409).send({ error: 'player is referenced by plays; delete those plays first' });
    // Only broadcast if a row was actually deleted (avoid spurious no-op broadcasts)
    const info = app.db.prepare('DELETE FROM players WHERE id=?').run(req.params.id);
    if (info.changes > 0) app.hub.broadcast('changed');
    return { ok: true };
  });
}
