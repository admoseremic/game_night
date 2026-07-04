// In-memory set of connected SSE clients + broadcast. See spec §13.
// Heartbeat: Cloudflare (and some proxies) sever idle connections after ~100s,
// so while at least one client is connected we write a `: ping` comment every
// 30s. The timer is stopped (and unref'd) whenever the room empties so an idle
// server — or the test runner — is never kept alive by a dangling interval.
export function makeHub({ heartbeatMs = 30_000 } = {}) {
  const clients = new Set();
  let beat = null;
  const stopIfEmpty = () => {
    if (beat && clients.size === 0) { clearInterval(beat); beat = null; }
  };
  const startBeat = () => {
    if (beat) return;
    beat = setInterval(() => {
      for (const reply of clients) {
        try { reply.raw.write(': ping\n\n'); } catch { clients.delete(reply); }
      }
      stopIfEmpty();
    }, heartbeatMs);
    beat.unref?.();
  };
  return {
    add(reply) {
      reply.raw.write(': connected\n\n'); // SSE preamble / keep-alive comment
      clients.add(reply);
      startBeat();
      reply.raw.on('close', () => { clients.delete(reply); stopIfEmpty(); });
    },
    broadcast(eventName) {
      const payload = `event: ${eventName}\ndata: {"type":"${eventName}"}\n\n`;
      for (const reply of clients) {
        try { reply.raw.write(payload); } catch { clients.delete(reply); }
      }
      stopIfEmpty();
    },
    count() { return clients.size; },
  };
}
