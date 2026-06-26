// Production boot: DB + SSE hub + API routes + static client + compression.
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { makeHub } from './events.js';
import { buildApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to absolute because @fastify/static requires an absolute root
const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || path.resolve(__dirname, '../../client/dist'));
const PORT = Number(process.env.PORT || 3000);

const db = openDb();
const hub = makeHub();
const app = buildApp({ db, hub });

// Compress JSON etc., but NEVER text/event-stream (would buffer SSE). Spec §8/§13.
await app.register(fastifyCompress, {
  global: true,
  customTypes: /^(?!text\/event-stream)(application\/json|text\/|application\/javascript)/,
});

await app.register(fastifyStatic, { root: CLIENT_DIR, wildcard: false });

// SPA fallback: anything not /api and not a real file -> index.html
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
  return reply.sendFile('index.html');
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => console.log(`game-night server on :${PORT}, client=${CLIENT_DIR}`))
  .catch((e) => { console.error(e); process.exit(1); });
