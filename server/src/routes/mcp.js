// POST /mcp — remote MCP endpoint (Streamable HTTP, STATELESS: fresh server +
// transport per request, no sessions). Read-only tools over the same dataset as
// /api/state, computed with the client's own stats.js so numbers always match
// the app. INVARIANT: never register mutating tools here — the endpoint is
// intentionally unauthenticated (the data is already public via GET /api/state).
// Friend onboarding instructions: docs/mcp.md.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readState } from '../read-state.js';
import * as tools from '../mcp-tools.js';

const period = z.enum(['month', 'prevMonth', 'ytd', 'lastYear', 'all']).optional()
  .describe('Time window (default all)');

function buildMcpServer(db) {
  const server = new McpServer({ name: 'game-night', version: '1.0.0' });
  // Uniform wrapper: fresh state per call; ToolError → in-band MCP tool error.
  const run = (fn) => (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(fn(readState(db), args ?? {}), null, 1) }] };
    } catch (e) {
      if (e instanceof tools.ToolError) return { isError: true, content: [{ type: 'text', text: e.message }] };
      throw e;
    }
  };
  server.registerTool('get_overview', {
    description: 'Players, games (with tier/score-direction), total play count and date range. Call this first to orient.',
  }, run(tools.getOverview));
  server.registerTool('get_plays', {
    description: 'List plays, newest first, with player names, ranks (1 = winner) and scores. Filterable.',
    inputSchema: {
      since: z.string().optional().describe('YYYY-MM-DD inclusive'),
      until: z.string().optional().describe('YYYY-MM-DD inclusive'),
      game: z.string().optional().describe('Game name or id'),
      player: z.string().optional().describe('Player name or id'),
      limit: z.number().int().positive().optional().describe('Default 50, max 200'),
    },
  }, run(tools.getPlays));
  server.registerTool('get_leaderboard', {
    description: "The app's official weighted leaderboard (Light 0.5 / Medium 1.0 / Heavy 1.5).",
    inputSchema: { period, sort: z.enum(['wins', 'wwins', 'winPct', 'plays', 'losses', 'beat', 'beatPer']).optional() },
  }, run(tools.getLeaderboard));
  server.registerTool('get_records', {
    description: 'All-time best score per game with holder and date (per-game high/low direction respected).',
    inputSchema: { game: z.string().optional().describe('Game name or id (omit for all)') },
  }, run(tools.getRecords));
  server.registerTool('get_player_stats', {
    description: 'One player: wins, win %, weighted wins, current win streak, per-game breakdown, recent results.',
    inputSchema: { player: z.string().describe('Player name or id') },
  }, run(tools.getPlayerStats));
  server.registerTool('get_head_to_head', {
    description: 'Two players compared across shared plays: series score, verdict, last meeting, per-game tallies.',
    inputSchema: { playerA: z.string(), playerB: z.string(), period },
  }, run(tools.getHeadToHead));
  return server;
}

export async function mcpRoutes(app) {
  app.post('/mcp', async (req, reply) => {
    const server = buildMcpServer(app.db);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.hijack(); // SDK writes the raw response itself
    reply.raw.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });
  // Stateless mode: no SSE notification stream, no sessions to delete.
  const notAllowed = async (_req, reply) => reply.code(405)
    .send({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  app.get('/mcp', notAllowed);
  app.delete('/mcp', notAllowed);
}
