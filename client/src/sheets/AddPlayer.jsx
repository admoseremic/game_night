// AddPlayer.jsx — Bottom sheet for adding a new player.
// Ported from prototype openAddPlayer/savePlayer (lines 1190-1194) and template (~862-883).
//
// Fields:
//   name    — text input, required
//   regular — boolean toggle for "Regular attendee" status (pre-selected in picker rolls)
//
// Save disabled until name is non-empty.
// On save: calls actions.addPlayer(name, regular) then closes the sheet.
// Color pair is auto-assigned by the store's nextColor helper.

import { useState } from 'react';
import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

export default function AddPlayer() {
  const { ui, setUi, actions } = useStore();
  const [name,    setName]    = useState('');
  const [regular, setRegular] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    actions.addPlayer(name.trim(), regular);
    setUi({ addPlayerOpen: false });
    // Reset for next open
    setName(''); setRegular(false);
  };

  const handleClose = () => {
    setUi({ addPlayerOpen: false });
    setName(''); setRegular(false);
  };

  return (
    <BottomSheet open={ui.addPlayerOpen} onClose={handleClose} title="New player">

      {/* Name */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', marginBottom: 7 }}>
        Name
      </div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Who's joining the crew?"
        autoFocus
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
          color: '#F4EEF8', fontSize: 16, fontFamily: 'inherit', outline: 'none',
          marginBottom: 16, boxSizing: 'border-box',
        }}
      />

      {/* Regular attendee toggle */}
      <div
        onClick={() => setRegular(r => !r)}
        style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
          borderRadius: 14, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
        }}
      >
        {/* Toggle track + thumb */}
        <div style={{
          width: 46, height: 28, borderRadius: 14, flexShrink: 0, position: 'relative',
          background: regular ? 'linear-gradient(135deg,#FF8A3D,#FF5E62)' : 'rgba(255,255,255,0.14)',
          transition: 'background 0.18s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: regular ? 21 : 3,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            transition: 'left 0.18s',
          }} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Regular attendee</div>
          <div style={{ fontSize: 11.5, color: '#9D90B5', lineHeight: 1.3 }}>
            Core crew — pre-selected when rolling for first player.
          </div>
        </div>
      </div>

      {/* Save button — disabled until name is non-empty */}
      <div
        onClick={handleSave}
        style={{
          marginTop: 18, textAlign: 'center', padding: 15, borderRadius: 16,
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff',
          background: canSave ? 'linear-gradient(135deg,#FF8A3D,#FF5E62)' : 'rgba(255,255,255,0.08)',
          opacity: canSave ? 1 : 0.5,
          cursor: canSave ? 'pointer' : 'default',
        }}
      >Save player</div>

    </BottomSheet>
  );
}
