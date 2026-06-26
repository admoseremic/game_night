// App.jsx — Root component: wraps everything in StoreProvider, renders the Shell.
// Shell renders the currently active screen from ui.screen (switches on nav tap)
// and the floating BottomNav. Screens are registered as they are built in Tasks 12-17.

import { StoreProvider, useStore } from './store/store.jsx';
import BottomNav from './components/BottomNav.jsx';
import Board from './screens/Board.jsx';

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

  // Task 12+ register real screens here: { board: Board, games: Games, ... }
  const screens = { board: Board };
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
      <div style={{ height: '100%', overflowY: 'auto', padding: '54px 18px 104px' }}>
        {Screen ? <Screen /> : <Placeholder name={ui.screen || 'board'} />}
      </div>

      {/* Floating bottom nav — absolutely positioned so it overlays content */}
      <BottomNav
        screen={ui.screen}
        onNav={(s) => setUi({ screen: s })}
        onLog={() => setUi({ logOpen: true })}
      />
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
