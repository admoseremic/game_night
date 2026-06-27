// BottomNav.jsx — Floating pill bottom navigation bar.
// 5 slots: Home (📊), Games (🎯), center ➕ Log button, Players (👥), Hall (🏆).
// Active tab uses full-color icon + orange label; inactive tabs are dimmed.
// Usage: <BottomNav screen={ui.screen} onNav={(s) => setUi({ screen: s })} onLog={() => setUi({ logOpen: true })} />

export default function BottomNav({ screen, onNav, onLog }) {
  // Active-state helpers
  const isHome    = screen === 'board';
  const isGames   = screen === 'games' || screen === 'gameDetail';
  const isPlayers = screen === 'players' || screen === 'playerDetail';
  const isHall    = screen === 'hall';

  // Shared active/inactive style values
  const activeColor   = '#FF8A3D';
  const inactiveColor = '#6E6483';
  const activeFilter  = 'none';
  const inactiveFilter = 'grayscale(0.6) opacity(0.55)';

  // Tab slot style — each regular nav item
  const tabStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '6px 0',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div style={{
      position: 'fixed',
      left: 14,
      right: 14,
      bottom: 'max(calc(env(safe-area-inset-bottom, 0px) - 16px), 10px)',
      height: 64,
      borderRadius: 24,
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      background: 'rgba(28,21,40,0.82)',
      backdropFilter: 'blur(18px) saturate(160%)',
      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
      zIndex: 40,
    }}>

      {/* Home — 📊 */}
      <div style={tabStyle} onClick={() => onNav('board')}>
        <span style={{ fontSize: 20, filter: isHome ? activeFilter : inactiveFilter }}>📊</span>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: isHome ? activeColor : inactiveColor }}>Home</span>
      </div>

      {/* Games — 🎯 */}
      <div style={tabStyle} onClick={() => onNav('games')}>
        <span style={{ fontSize: 20, filter: isGames ? activeFilter : inactiveFilter }}>🎯</span>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: isGames ? activeColor : inactiveColor }}>Games</span>
      </div>

      {/* Center ➕ Log button — raised orange/red pill */}
      <div
        onClick={onLog}
        style={{
          flex: '0 0 58px',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 54,
          height: 54,
          marginTop: -22,
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#FF8A3D,#FF5E62)',
          boxShadow: '0 10px 22px rgba(255,94,98,0.5)',
          border: '3px solid #1C1528',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Players — 👥 */}
      <div style={tabStyle} onClick={() => onNav('players')}>
        <span style={{ fontSize: 20, filter: isPlayers ? activeFilter : inactiveFilter }}>👥</span>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: isPlayers ? activeColor : inactiveColor }}>Players</span>
      </div>

      {/* Hall — 🏆 */}
      <div style={tabStyle} onClick={() => onNav('hall')}>
        <span style={{ fontSize: 20, filter: isHall ? activeFilter : inactiveFilter }}>🏆</span>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: isHall ? activeColor : inactiveColor }}>Hall</span>
      </div>

    </div>
  );
}
