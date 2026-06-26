// api.js — thin fetch wrapper over /api/* endpoints.
// All methods return parsed JSON or throw on non-OK response.
// Used by store.jsx for all server communication.

async function j(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
  return res.json();
}
export const getState = () => j('GET', '/api/state');
export const createPlayer = (b) => j('POST', '/api/players', b);
export const updatePlayer = (id, b) => j('PATCH', `/api/players/${id}`, b);
export const deletePlayer = (id) => j('DELETE', `/api/players/${id}`);
export const createGame = (b) => j('POST', '/api/games', b);
export const updateGame = (id, b) => j('PATCH', `/api/games/${id}`, b);
export const deleteGame = (id) => j('DELETE', `/api/games/${id}`);
export const createPlay = (b) => j('POST', '/api/plays', b);
export const updatePlay = (id, b) => j('PATCH', `/api/plays/${id}`, b);
export const deletePlay = (id) => j('DELETE', `/api/plays/${id}`);
