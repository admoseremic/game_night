function validateParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return 'parts required';
  const ids = new Set();
  for (const p of parts) {
    if (!Array.isArray(p) || p.length !== 3) return 'each part is [playerId,rank,score]';
    if (typeof p[1] !== 'number') return 'rank must be a number';
    if (ids.has(p[0])) return 'duplicate player in play';
    ids.add(p[0]);
  }
  return null;
}
export async function playRoutes(app) {
  app.post('/api/plays', async (req, reply) => {
    const { g, d, parts } = req.body || {};
    if (!g || !d) return reply.code(400).send({ error: 'g and d required' });
    const err = validateParts(parts);
    if (err) return reply.code(400).send({ error: err });
    const id = app.newId('pl');
    app.db.prepare('INSERT INTO plays(id,game_id,played_at,parts) VALUES(?,?,?,?)')
      .run(id, g, d, JSON.stringify(parts));
    app.hub.broadcast('changed');
    return { id, g, d, parts };
  });
  app.patch('/api/plays/:id', async (req, reply) => {
    const cur = app.db.prepare('SELECT * FROM plays WHERE id=?').get(req.params.id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const g = req.body?.g ?? cur.game_id;
    const d = req.body?.d ?? cur.played_at;
    const parts = req.body?.parts ?? JSON.parse(cur.parts);
    const err = validateParts(parts);
    if (err) return reply.code(400).send({ error: err });
    app.db.prepare('UPDATE plays SET game_id=?, played_at=?, parts=? WHERE id=?')
      .run(g, d, JSON.stringify(parts), req.params.id);
    app.hub.broadcast('changed');
    return { id: req.params.id, g, d, parts };
  });
  app.delete('/api/plays/:id', async (req) => {
    // Only broadcast if a row was actually deleted (avoid spurious no-op broadcasts)
    const info = app.db.prepare('DELETE FROM plays WHERE id=?').run(req.params.id);
    if (info.changes > 0) app.hub.broadcast('changed');
    return { ok: true };
  });
}
