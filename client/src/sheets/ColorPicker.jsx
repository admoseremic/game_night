// ColorPicker.jsx — Bottom sheet for choosing a player's avatar gradient color.
// Design ref: Game Night.dc.html lines 994–1010.
// Reads ui.colorSheetOpen / ui.playerId from the store; calls actions.updatePlayer on pick.

import { useStore } from '../store/store.jsx';
import { AVATAR_PALETTE } from '../lib/colors.js';
import BottomSheet from '../components/BottomSheet.jsx';

export default function ColorPicker() {
  const { data, ui, setUi, actions } = useStore();

  // Only render when the sheet is flagged open and a player is selected
  if (!ui.colorSheetOpen || !ui.playerId) return null;

  const player = data.players.find(p => p.id === ui.playerId);
  const close = () => setUi({ colorSheetOpen: false });

  // Pick a swatch: update the player's gradient then close
  const handlePick = (c1, c2) => {
    actions.updatePlayer(ui.playerId, { c1, c2 });
    close();
  };

  return (
    <BottomSheet open onClose={close} title="Pick a color">
      {/* Subtitle */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9D90B5', marginTop: -8, marginBottom: 20 }}>
        Tap a swatch to make it yours.
      </div>

      {/* 6-column swatch grid — circles matching design lines 1005–1012 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 13,
      }}>
        {AVATAR_PALETTE.map(([c1, c2], i) => {
          // Highlight the player's currently-active color with a white ring + checkmark
          const selected = player && player.c1 === c1 && player.c2 === c2;
          return (
            <div
              key={i}
              onClick={() => handlePick(c1, c2)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                boxShadow: selected
                  ? '0 0 0 3px rgba(244,238,248,0.95)'
                  : '0 2px 6px rgba(0,0,0,0.35)',
                cursor: 'pointer',
              }}
            >
              {/* Checkmark overlay for the active swatch */}
              {selected && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.55)',
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
