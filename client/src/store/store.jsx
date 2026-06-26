// store.jsx — global React context store for Game Night.
// Loads /api/state on mount, subscribes to SSE /api/events (refetches on 'changed'),
// and also refetches on window focus. Actions perform optimistic local updates,
// fire the API, then refetch; on error they rollback to previous state.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as api from '../lib/api.js';
import { nextColor } from '../lib/colors.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [data, setData] = useState({ players: [], games: [], plays: [] });
  const [ui, setUiState] = useState({ screen: 'board', period: 'month', sorts: ['wins'],
    gameId: null, playerId: null, custom: { start: '2026-01-01', end: '2026-06-25' }, absent: {} });
  const now = useRef(new Date()).current;
  const setUi = useCallback((patch) => setUiState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  const refetch = useCallback(async () => { try { setData(await api.getState()); } catch (e) { console.error(e); } }, []);

  useEffect(() => {
    refetch();
    // SSE: listen for server-push 'changed' events and refetch state
    const es = new EventSource('/api/events');
    es.addEventListener('changed', refetch);
    // Also refetch when the window regains focus (keeps tabs in sync)
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => { es.close(); window.removeEventListener('focus', onFocus); };
  }, [refetch]);

  // Optimistic helper: apply local mutation, fire API, rollback+refetch on error.
  const optimistic = useCallback(async (mutate, call) => {
    const prev = data;
    setData(d => mutate(d));
    try { await call(); await refetch(); }
    catch (e) { console.error(e); setData(prev); refetch(); }
  }, [data, refetch]);

  const actions = {
    addPlay: (play) => optimistic(
      d => ({ ...d, plays: [...d.plays, { ...play, id: 'tmp-' + crypto.randomUUID() }] }),
      () => api.createPlay(play)),
    editPlay: (id, play) => optimistic(
      d => ({ ...d, plays: d.plays.map(p => p.id === id ? { ...p, ...play } : p) }),
      () => api.updatePlay(id, play)),
    removePlay: (id) => optimistic(
      d => ({ ...d, plays: d.plays.filter(p => p.id !== id) }),
      () => api.deletePlay(id)),
    addPlayer: (name, regular) => { const [c1, c2] = nextColor(data.players.length);
      return optimistic(d => ({ ...d, players: [...d.players, { id: 'tmp-' + crypto.randomUUID(), name, regular, c1, c2 }] }),
        () => api.createPlayer({ name, regular, c1, c2 })); },
    addGame: (g) => optimistic(d => ({ ...d, games: [...d.games, { ...g, id: 'tmp-' + crypto.randomUUID() }] }), () => api.createGame(g)),
  };

  return <Ctx.Provider value={{ data, ui, setUi, now, refetch, actions }}>{children}</Ctx.Provider>;
}
