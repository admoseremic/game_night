// App.jsx — Root component: wraps everything in StoreProvider, renders the Shell.
// Shell renders the currently active screen from ui.screen (switches on nav tap)
// and the floating BottomNav. Screens are registered as they are built in Tasks 12-17.
//
// Overlays rendered at this level (outside the scroll container):
//   LogPlay    — full-screen two-step play-logging flow (ui.logOpen)
//   Celebration — full-screen win/record overlay (ui.celebrate)
//   AddGame    — bottom sheet for adding a game (ui.addGameOpen)
//   AddPlayer  — bottom sheet for adding a player (ui.addPlayerOpen)

import { useState, useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './store/store.jsx';
import BottomNav from './components/BottomNav.jsx';
import Board from './screens/Board.jsx';
import Games from './screens/Games.jsx';
import GameDetail from './screens/GameDetail.jsx';
import Players from './screens/Players.jsx';
import PlayerProfile from './screens/PlayerProfile.jsx';
import History from './screens/History.jsx';
import LogPlay from './flows/LogPlay.jsx';
import Celebration from './components/Celebration.jsx';
import AddGame from './sheets/AddGame.jsx';
import AddPlayer from './sheets/AddPlayer.jsx';
import Hall from './screens/Hall.jsx';
import DeleteConfirm from './sheets/DeleteConfirm.jsx';
import Pick from './sheets/Pick.jsx';
import Picker from './sheets/Picker.jsx';

// TEMPORARY debug overlay — reads real device metrics + safe-area insets to diagnose iOS
// standalone bottom-nav positioning. Remove once the nav gap is resolved.
function DebugSafeArea() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom);';
    document.body.appendChild(probe);
    const sab = Math.round(probe.getBoundingClientRect().height);
    document.body.removeChild(probe);
    const probeT = document.createElement('div');
    probeT.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);';
    document.body.appendChild(probeT);
    const sat = Math.round(probeT.getBoundingClientRect().height);
    document.body.removeChild(probeT);
    const nav = [...document.querySelectorAll('div')].find(d => {
      const cs = getComputedStyle(d);
      return cs.position === 'fixed' && cs.backdropFilter !== 'none' && d.textContent.includes('Home') && d.textContent.includes('Hall');
    });
    const nb = nav ? Math.round(nav.getBoundingClientRect().bottom) : -1;
    setInfo({
      sat, sab,
      innerH: window.innerHeight,
      vvH: window.visualViewport ? Math.round(window.visualViewport.height) : -1,
      clientH: document.documentElement.clientHeight,
      screenH: window.screen.height,
      navPos: nav ? getComputedStyle(nav).position : 'NONE',
      navBottom: nb,
      gapBelowNav: nb >= 0 ? window.innerHeight - nb : -1,
      standalone: window.navigator.standalone === true,
    });
  }, []);
  if (!info) return null;
  return (
    <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 2px)', left: 4, right: 4, zIndex: 99999, background: 'rgba(200,0,0,0.92)', color: '#fff', font: '10px/1.35 monospace', padding: '4px 6px', borderRadius: 6, textAlign: 'left', pointerEvents: 'none' }}>
      DEBUG sat:{info.sat} sab:{info.sab} | innerH:{info.innerH} vvH:{info.vvH} clientH:{info.clientH} screenH:{info.screenH} | navPos:{info.navPos} navBottom:{info.navBottom} gapBelowNav:{info.gapBelowNav} | standalone:{String(info.standalone)}
    </div>
  );
}

// Screens are added in Tasks 12–17. Until a screen exists it renders a themed placeholder.
function Placeholder({ name }) {
  return (
    <div style={{
      padding: '40px 4px',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 22,
    }}>
      {name} — coming soon
    </div>
  );
}

function Shell() {
  const { ui, setUi } = useStore();

  // Scroll to top when screen or detail target (gameId/playerId) changes
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [ui.screen, ui.gameId, ui.playerId]);

  // Task 12+ register real screens here: { board: Board, games: Games, ... }
  const screens = { board: Board, games: Games, gameDetail: GameDetail, players: Players, playerDetail: PlayerProfile, hall: Hall, history: History };
  const Screen = screens[ui.screen];

  return (
    // Relative container so the absolutely-positioned BottomNav stays inside the 480px max-width column
    <div style={{
      position: 'relative',
      maxWidth: 480,
      margin: '0 auto',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Scrollable content area — bottom padding clears the floating nav (64px nav + 18px gap + buffer) */}
      <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 104px)' }}>
        {Screen ? <Screen /> : <Placeholder name={ui.screen || 'board'} />}
      </div>

      {/* Floating bottom nav — absolutely positioned so it overlays content */}
      <BottomNav
        screen={ui.screen}
        onNav={(s) => setUi({ screen: s })}
        onLog={() => setUi({ logOpen: true })}
      />

      {/* Full-screen overlays — rendered outside the scroll container */}
      {ui.logOpen && <LogPlay />}
      {ui.celebrate && <Celebration />}

      {/* Bottom sheet overlays — use fixed positioning via BottomSheet component */}
      {ui.addGameOpen && <AddGame />}
      {ui.addPlayerOpen && <AddPlayer />}
      {ui.deletePlayId && <DeleteConfirm />}
      {ui.pickSheetOpen && <Pick />}
      {ui.pickerOpen && <Picker />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
      {/* TEMP: debug overlay + lime reference line at true fixed bottom:0 — remove after iOS nav diagnosis */}
      <DebugSafeArea />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 3, background: 'lime', zIndex: 99999, pointerEvents: 'none' }} />
    </StoreProvider>
  );
}
