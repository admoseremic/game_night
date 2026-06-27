// App.jsx — Root component: wraps everything in StoreProvider, renders the Shell.
// Shell renders the currently active screen from ui.screen (switches on nav tap)
// and the floating BottomNav. Screens are registered as they are built in Tasks 12-17.
//
// Overlays rendered at this level (outside the scroll container):
//   LogPlay    — full-screen two-step play-logging flow (ui.logOpen)
//   Celebration — full-screen win/record overlay (ui.celebrate)
//   AddGame    — bottom sheet for adding a game (ui.addGameOpen)
//   AddPlayer  — bottom sheet for adding a player (ui.addPlayerOpen)

import { useEffect, useRef } from 'react';
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

  // Hide the bottom nav whenever any sheet or overlay is open so it can't overlap sheet options
  const overlayOpen = ui.logOpen || ui.celebrate || ui.pickerOpen || ui.addGameOpen || ui.addPlayerOpen ||
    ui.deletePlayId || ui.pickSheetOpen || ui.periodSheetOpen || ui.sortSheetOpen || ui.explainOpen || ui.customOpen ||
    ui.colorSheetOpen;

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

      {/* Floating bottom nav — hidden while any sheet/overlay is open to prevent covering bottom options */}
      {!overlayOpen && <BottomNav
        screen={ui.screen}
        onNav={(s) => setUi({ screen: s })}
        onLog={() => setUi({ logOpen: true })}
      />}

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
    </StoreProvider>
  );
}
