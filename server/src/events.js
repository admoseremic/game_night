// In-memory set of connected SSE clients + broadcast. See spec §13.
export function makeHub() {
  const clients = new Set();
  return {
    add(reply) {
      reply.raw.write(': connected\n\n'); // SSE preamble / keep-alive comment
      clients.add(reply);
      reply.raw.on('close', () => clients.delete(reply));
    },
    broadcast(eventName) {
      const payload = `event: ${eventName}\ndata: {"type":"${eventName}"}\n\n`;
      for (const reply of clients) {
        try { reply.raw.write(payload); } catch { clients.delete(reply); }
      }
    },
    count() { return clients.size; },
  };
}
