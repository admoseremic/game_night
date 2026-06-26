// Builds a Fastify instance with all /api routes. No .listen() here so tests can inject().
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { stateRoutes } from './routes/state.js';
import { playerRoutes } from './routes/players.js';
import { gameRoutes } from './routes/games.js';
import { playRoutes } from './routes/plays.js';
import { eventRoutes } from './routes/events.js';

export function buildApp({ db, hub }) {
  const app = Fastify({ logger: false });
  app.decorate('db', db);
  app.decorate('hub', hub);
  app.decorate('newId', (prefix) => prefix + randomUUID().slice(0, 8));
  app.register(stateRoutes);
  app.register(playerRoutes);
  app.register(gameRoutes);
  app.register(playRoutes);
  app.register(eventRoutes);
  return app;
}
