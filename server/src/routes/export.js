// GET /export — monthly markdown digest for LLMs that can't use the /mcp
// connector (fetch the URL instead). GET /llms.txt — AI-discovery index.
// Both READ-ONLY and unauthenticated by design (data is public via /api/state);
// never add mutating handlers here. Top-level paths (not /api/...) so the URL
// is easy to paste into a chat; registered routes beat the SPA fallback.
// Spec: docs/superpowers/specs/2026-07-06-export-digest-design.md
import { readState } from '../read-state.js';
import { renderDigest, MONTH_RE } from '../export-digest.js';

const LLMS_TXT = `# Game Night (gamenight.trevorwithdata.com)

Self-hosted board-game-night leaderboard app for a private group of friends.

Data for AI agents (read-only, no auth):
- https://gamenight.trevorwithdata.com/export — monthly digest in markdown:
  leaderboards, play-by-play log, records, streaks. Defaults to last month;
  for any other month use /export/YYYY-MM (e.g. /export/2026-05). Start here.
- https://gamenight.trevorwithdata.com/api/state — full raw dataset (JSON).
- POST https://gamenight.trevorwithdata.com/mcp — MCP endpoint (Streamable
  HTTP) with query tools, if your client supports connectors.
`;

export async function exportRoutes(app) {
  // Month can arrive as a PATH segment (/export/2026-05) or a query param
  // (/export?month=2026-05). The path form is the documented one: consumer AI
  // web-fetch tools (claude.ai) have been seen dropping query strings, which
  // silently returned the default month — a path segment can't be stripped.
  const sendDigest = (reply, month) => {
    if (month !== undefined && !MONTH_RE.test(month)) {
      return reply.code(400).type('text/plain; charset=utf-8')
        .send('Invalid month. Use /export/YYYY-MM, e.g. /export/2026-06.\n');
    }
    return reply.type('text/markdown; charset=utf-8')
      .header('cache-control', 'no-store')
      .send(renderDigest(readState(app.db), { month }));
  };
  app.get('/export', async (req, reply) => sendDigest(reply, req.query.month));
  app.get('/export/:month', async (req, reply) => sendDigest(reply, req.params.month));
  app.get('/llms.txt', async (_req, reply) =>
    reply.type('text/plain; charset=utf-8').send(LLMS_TXT));
}
