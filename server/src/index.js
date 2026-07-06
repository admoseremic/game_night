// Production boot: DB + SSE hub + API routes + static client + compression.
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { openDb } from './db.js';
import { makeHub } from './events.js';
import { buildApp } from './app.js';
import { readState } from './read-state.js';
import { digestHtmlFragment } from './export-digest.js';

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

await app.register(fastifyStatic, {
  root: CLIENT_DIR,
  wildcard: false,
  index: false, // '/' is served below with the embedded digest
  // Never cache HTML so iOS standalone always fetches a fresh index.html
  // (which references the latest hashed JS/CSS bundles).
  setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-store'); },
});

// App shell with the PREVIOUS MONTH's digest embedded as a hidden div before
// </body>: one fetch of the main URL hands any AI the data (spec:
// docs/superpowers/specs/2026-07-06-embedded-digest-design.md). Fail-open —
// a digest error must never break the app, so we fall back to the plain shell.
const shellHtml = readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf8');
const sendShell = (reply) => {
  let html = shellHtml;
  try {
    html = shellHtml.replace('</body>', digestHtmlFragment(readState(db)) + '\n</body>');
  } catch (e) {
    console.error('digest embed failed, serving plain shell:', e);
  }
  // Ensure the SPA shell is never cached by iOS or any proxy.
  return reply.header('Cache-Control', 'no-store').type('text/html; charset=utf-8').send(html);
};

app.get('/', async (_req, reply) => sendShell(reply));

// SPA fallback: anything not /api and not a real file -> the same shell.
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
  return sendShell(reply);
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => console.log(`game-night server on :${PORT}, client=${CLIENT_DIR}`))
  .catch((e) => { console.error(e); process.exit(1); });
