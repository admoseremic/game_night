// GET /api/state — the whole dataset in one shot (client computes everything). Spec §5/§11.
import { readState } from '../read-state.js';
export async function stateRoutes(app) {
  app.get('/api/state', async () => readState(app.db));
}
