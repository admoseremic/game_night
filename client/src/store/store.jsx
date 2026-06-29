// store.jsx — global React context store for Game Night.
// Loads /api/state on mount, subscribes to SSE /api/events (refetches on 'changed'),
// and also refetches on window focus. Actions perform optimistic local updates,
// fire the API, then refetch; on error they rollback to previous state.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as api from '../lib/api.js';
import { nextColor } from '../lib/colors.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

// Unique id for optimistic temp records. crypto.randomUUID() requires a secure context
// (HTTPS or localhost); fall back to a timestamp+random string so plain-HTTP LAN access works.
const tmpId = () =>
  'tmp-' + (globalThis.crypto && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

export function StoreProvider({ children }) {
  const [data, setData] = useState({ players: [], games: [], plays: [] });
  const [ui, setUiState] = useState({ screen: 'board', period: 'month', sorts: ['wins'],
    // Games tab view: 'summary' (period-scoped activity report, default) | 'all' (full catalog/shelf).
    gamesMode: 'summary',
    gameId: null, playerId: null, custom: { start: '2026-01-01', end: '2026-06-25' }, absent: {}, hallPeriod: 'thisYear',
    // Player Profile time-window filter (This Year / Last 2 Years / All Time). Session-only.
    profilePeriod: 'thisYear',
    // Head-to-Head picker (Hall): selected player ids + which slot the next roster tap fills. Session-only.
    h2hA: null, h2hB: null, h2hSlot: 'a' });
  const now = useRef(new Date()).current;
  const setUi = useCallback((patch) => setUiState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  // True until the FIRST /api/state fetch resolves, so the app can show a loading state instead of
  // flashing empty "no plays/no data" screens on cold start. Stays false through later refetches.
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try { setData(await api.getState()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

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
      d => ({ ...d, plays: [...d.plays, { ...play, id: tmpId() }] }),
      () => api.createPlay(play)),
    editPlay: (id, play) => optimistic(
      d => ({ ...d, plays: d.plays.map(p => p.id === id ? { ...p, ...play } : p) }),
      () => api.updatePlay(id, play)),
    removePlay: (id) => optimistic(
      d => ({ ...d, plays: d.plays.filter(p => p.id !== id) }),
      () => api.deletePlay(id)),
    addPlayer: (name, regular) => { const [c1, c2] = nextColor(data.players.length);
      return optimistic(d => ({ ...d, players: [...d.players, { id: tmpId(), name, regular, c1, c2 }] }),
        () => api.createPlayer({ name, regular, c1, c2 })); },
    addGame: (g) => optimistic(d => ({ ...d, games: [...d.games, { ...g, id: tmpId() }] }), () => api.createGame(g)),
    updatePlayer: (id, patch) => optimistic(
      d => ({ ...d, players: d.players.map(p => p.id === id ? { ...p, ...patch } : p) }),
      () => api.updatePlayer(id, patch)),
  };

  return <Ctx.Provider value={{ data, ui, setUi, now, refetch, actions, loading }}>{children}</Ctx.Provider>;
}
