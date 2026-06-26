// Custom.jsx — Bottom sheet for selecting a custom date range.
// Ported from prototype lines 988–1013 and presets 1455–1462.
// Opens via ui.customOpen; sets ui.period = 'custom' and updates ui.custom.start/end.

import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

// Helper: format a Date to YYYY-MM-DD (ISO date string) for input[type=date]
function toISO(dt) {
  const x = new Date(dt);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}

export default function Custom() {
  const { ui, setUi, now } = useStore();

  // Compute relative date presets from now (ported from prototype agoDays, line 1456)
  const agoDays = (days) => {
    const x = new Date(now);
    x.setDate(x.getDate() - days);
    return toISO(x);
  };
  const today = toISO(now);

  // Preset ranges (ported from prototype customPresets, lines 1457–1462)
  const PRESETS = [
    { label: 'Last 30 days', s: agoDays(30), e: today },
    { label: 'Last 90 days', s: agoDays(90), e: today },
    { label: 'This year',    s: '2026-01-01', e: today },
    { label: '2025',         s: '2025-01-01', e: '2025-12-31' },
  ];

  const applyPreset = (s, e) => {
    setUi({ custom: { start: s, end: e }, period: 'custom', customOpen: false });
  };

  // Input change handlers — update custom range and switch period to 'custom'
  const onStart = (e) =>
    setUi({ custom: { ...ui.custom, start: e.target.value }, period: 'custom' });
  const onEnd = (e) =>
    setUi({ custom: { ...ui.custom, end: e.target.value }, period: 'custom' });

  // Shared date input style (ported from prototype line 998)
  const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#F4EEF8',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    colorScheme: 'dark',  // makes the native date picker dark on supported browsers
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6E6483',
    marginBottom: 7,
  };

  return (
    <BottomSheet
      open={ui.customOpen}
      onClose={() => setUi({ customOpen: false })}
      title="Custom date range"
    >
      {/* Subtitle */}
      <div style={{ fontSize: 12.5, color: '#9D90B5', marginBottom: 18, marginTop: -8 }}>
        Scope every stat to any window you like.
      </div>

      {/* Date range inputs (ported from prototype lines 995–1003) */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>From</div>
          <input
            type="date"
            value={ui.custom.start}
            onChange={onStart}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>To</div>
          <input
            type="date"
            value={ui.custom.end}
            onChange={onEnd}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Preset buttons (ported from prototype lines 1005–1009) */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0 4px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <div
            key={p.label}
            onClick={() => applyPreset(p.s, p.e)}
            style={{
              padding: '8px 13px',
              borderRadius: 11,
              fontSize: 12,
              fontWeight: 700,
              color: '#C9B8E8',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {p.label}
          </div>
        ))}
      </div>

      {/* Apply range button (ported from prototype line 1010) */}
      {/* Also commits period:'custom' so the board switches even if no date was changed */}
      <div
        onClick={() => setUi({ customOpen: false, period: 'custom' })}
        style={{
          marginTop: 18,
          textAlign: 'center',
          padding: '15px',
          borderRadius: 16,
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 15,
          color: '#150F1F',
          background: 'linear-gradient(135deg,#FFD66B,#F0A92E)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        Apply range
      </div>
    </BottomSheet>
  );
}
