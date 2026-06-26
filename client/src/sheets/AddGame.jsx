// AddGame.jsx — Bottom sheet for adding a new game to the library.
// Ported from prototype openAddGame/saveGame (lines 1195-1198) and template (~884-913).
//
// Fields:
//   name      — text input, required
//   tier      — segmented Light / Medium / Heavy selector, REQUIRED (none pre-selected)
//   dir       — High wins / Low wins toggle, defaults to 'high'
//   icon      — emoji picker (small curated set), defaults to 🎲
//
// Save disabled until name is non-empty AND a tier is chosen.
// On save: calls actions.addGame({ name, tier, dir, icon }) then closes the sheet.

import { useState } from 'react';
import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

// Curated emoji set matching the prototype's agIconChips
const ICONS = ['🎲','🃏','🏰','🚀','🐉','🌋','🦖','🧩','⚔️','🛸','🏭','🌲'];
const TIERS = ['Light', 'Medium', 'Heavy'];
const DIRS  = [['high', 'High wins'], ['low', 'Low wins']];

export default function AddGame() {
  const { ui, setUi, actions } = useStore();
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');      // empty string = none selected (required)
  const [dir,  setDir]  = useState('high');
  const [icon, setIcon] = useState('🎲');

  const canSave = name.trim().length > 0 && tier !== '';

  const handleSave = () => {
    if (!canSave) return;
    actions.addGame({ name: name.trim(), tier, dir, icon });
    setUi({ addGameOpen: false });
    // Reset form for next open
    setName(''); setTier(''); setDir('high'); setIcon('🎲');
  };

  const handleClose = () => {
    setUi({ addGameOpen: false });
    setName(''); setTier(''); setDir('high'); setIcon('🎲');
  };

  return (
    <BottomSheet open={ui.addGameOpen} onClose={handleClose} title="New game">

      {/* Name */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', marginBottom: 7 }}>
        Name
      </div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="What's the new title?"
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
          color: '#F4EEF8', fontSize: 16, fontFamily: 'inherit', outline: 'none',
          marginBottom: 18, boxSizing: 'border-box',
        }}
      />

      {/* Weight / Tier — none pre-selected, required for save */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', marginBottom: 8 }}>
        Weight
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {TIERS.map(t => (
          <div
            key={t}
            onClick={() => setTier(t)}
            style={{
              flex: 1, textAlign: 'center', padding: '11px 4px', borderRadius: 13,
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              color: tier === t ? '#150F1F' : '#C9B8E8',
              background: tier === t ? '#FFC24B' : 'rgba(255,255,255,0.05)',
            }}
          >{t}</div>
        ))}
      </div>

      {/* Scoring direction */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', marginBottom: 8 }}>
        Scoring
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {DIRS.map(([k, label]) => (
          <div
            key={k}
            onClick={() => setDir(k)}
            style={{
              flex: 1, textAlign: 'center', padding: '11px 4px', borderRadius: 13,
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              color: dir === k ? '#150F1F' : '#C9B8E8',
              background: dir === k ? '#34D9A0' : 'rgba(255,255,255,0.05)',
            }}
          >{label}</div>
        ))}
      </div>

      {/* Emoji icon picker */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: '#6E6483', marginBottom: 8 }}>
        Icon
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ICONS.map(ic => (
          <div
            key={ic}
            onClick={() => setIcon(ic)}
            style={{
              width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22, cursor: 'pointer',
              background: icon === ic ? 'rgba(255,138,61,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${icon === ic ? '#FF8A3D' : 'rgba(255,255,255,0.08)'}`,
            }}
          >{ic}</div>
        ))}
      </div>

      {/* Save button — disabled until name + tier filled */}
      <div
        onClick={handleSave}
        style={{
          marginTop: 20, textAlign: 'center', padding: 15, borderRadius: 16,
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff',
          background: canSave ? 'linear-gradient(135deg,#FF8A3D,#FF5E62)' : 'rgba(255,255,255,0.08)',
          opacity: canSave ? 1 : 0.5,
          cursor: canSave ? 'pointer' : 'default',
        }}
      >Save game</div>

    </BottomSheet>
  );
}
