// GET /api/events — SSE stream. Spec §13.
export async function eventRoutes(app) {
  app.get('/api/events', (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    app.hub.add(reply);
    // keep the request open; do not return.
  });
}
