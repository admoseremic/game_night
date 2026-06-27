// Hall.jsx — Hall of Fame screen.
// Ported from prototype template lines 620–740 in Game Night.dc.html.
// Shows: period chips, Most Wins + Best Win% prize cards, milestone cards,
//        Rivalries (head-to-head split bars), Trophy case (grid + expander).
// Reads ui.hallPeriod ('all'|'last2'|'thisYear') and ui.recordsExpanded from store.

import { useStore } from '../store/store.jsx';
import { buildHall } from '../viewmodels/hall.js';
import Avatar from '../components/Avatar.jsx';

// --- Period chip bar ---
// Three filter chips; active chip gets gold background, others stay subtle.
const CHIPS = [
  { key: 'all',      label: 'All Time' },
  { key: 'last2',    label: 'Last 2 Years' },
  { key: 'thisYear', label: 'This Year' },
];

function PeriodChips({ active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {CHIPS.map(c => {
        const isActive = c.key === active;
        return (
          <div
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 4px',
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              color: isActive ? '#150F1F' : '#9D90B5',
              background: isActive ? '#FFC24B' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? '#FFC24B' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {c.label}
          </div>
        );
      })}
    </div>
  );
}

// --- Prize cards (Most Wins + Best Win%) side by side ---

function ChampCard({ champ }) {
  // Build a player-like object for Avatar
  const player = { name: champ.name, c1: champ.c1, c2: champ.c2 };
  return (
    <div style={{
      flex: '1.3',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      padding: '18px 16px',
      background: 'linear-gradient(155deg,#3A2A14 0%,#1B1228 70%)',
      border: '1px solid rgba(255,194,75,0.34)',
      boxShadow: '0 14px 32px rgba(0,0,0,0.45)',
    }}>
      {/* Watermark trophy */}
      <div style={{ position: 'absolute', top: -30, right: -18, fontSize: 110, opacity: 0.12, transform: 'rotate(12deg)', pointerEvents: 'none' }}>🏆</div>
      <div style={{ position: 'relative' }}>
        {/* Kicker */}
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#FFC24B', marginBottom: 12 }}>★ Most Wins</div>
        {/* Avatar */}
        <div style={{
          width: 54, height: 54, borderRadius: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, color: '#fff',
          background: `linear-gradient(135deg, ${champ.c1}, ${champ.c2})`,
          boxShadow: '0 8px 18px rgba(0,0,0,0.4)',
        }}>{champ.initials}</div>
        {/* Name */}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, lineHeight: 1, color: '#fff', marginTop: 12 }}>{champ.name}</div>
        {/* Stats */}
        <div style={{ marginTop: 7 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#FFC24B' }}>{champ.wins}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5', marginLeft: 5 }}>wins · {champ.plays} plays</span>
        </div>
      </div>
    </div>
  );
}

function WinPctCard({ wp }) {
  return (
    <div style={{
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      padding: '18px 16px',
      background: 'linear-gradient(155deg,#143A2A 0%,#12221B 70%)',
      border: '1px solid rgba(52,217,160,0.3)',
      boxShadow: '0 14px 32px rgba(0,0,0,0.45)',
    }}>
      {/* Watermark */}
      <div style={{ position: 'absolute', top: -28, right: -16, fontSize: 100, opacity: 0.12, transform: 'rotate(12deg)', pointerEvents: 'none' }}>🎯</div>
      <div style={{ position: 'relative' }}>
        {/* Kicker */}
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#34D9A0', marginBottom: 12 }}>⌖ Best Win %</div>
        {/* Avatar */}
        <div style={{
          width: 54, height: 54, borderRadius: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, color: '#fff',
          background: `linear-gradient(135deg, ${wp.c1}, ${wp.c2})`,
          boxShadow: '0 8px 18px rgba(0,0,0,0.4)',
        }}>{wp.initials}</div>
        {/* Name */}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, lineHeight: 1, color: '#fff', marginTop: 12 }}>{wp.name}</div>
        {/* Stats */}
        <div style={{ marginTop: 7 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#34D9A0' }}>{wp.winPct}%</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5', marginLeft: 5 }}>{wp.wins}/{wp.plays}</span>
        </div>
      </div>
    </div>
  );
}

// --- Single milestone card (icon box + tinted label + value + sub) ---
function MilestoneCard({ m }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Icon box */}
      <div style={{
        width: 46, height: 46, flexShrink: 0, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 23, background: 'rgba(255,255,255,0.05)',
      }}>{m.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: m.tint }}>{m.label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#F4EEF8', marginTop: 2, lineHeight: 1.1 }}>{m.value}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9D90B5', marginTop: 2 }}>{m.sub}</div>
      </div>
    </div>
  );
}

// --- Single rivalry card with split bar ---
function RivalryCard({ r }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* A vs B header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        {/* Player A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: '#fff',
            background: `linear-gradient(135deg, ${r.aC1}, ${r.aC2})`,
          }}>{r.aInit}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.aName}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#FFC24B' }}>{r.aWins} wins</div>
          </div>
        </div>
        {/* VS */}
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#6E6483' }}>VS</div>
        {/* Player B */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.bName}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#FFC24B' }}>{r.bWins} wins</div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: '#fff',
            background: `linear-gradient(135deg, ${r.bC1}, ${r.bC2})`,
          }}>{r.bInit}</div>
        </div>
      </div>
      {/* Split bar */}
      <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${r.aPct}%`, background: `linear-gradient(90deg, ${r.aC1}, ${r.aC2})` }} />
        <div style={{ flex: 1, background: `linear-gradient(90deg, ${r.bC2}, ${r.bC1})` }} />
      </div>
      {/* Lead summary */}
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9D90B5', marginTop: 9 }}>
        👑 {r.leadName} leads · {r.meetings} meetings
      </div>
    </div>
  );
}

// --- Single trophy case grid card (2-column grid) ---
function TrophyCard({ g }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: '12px 13px', borderRadius: 15,
      background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Icon + score row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontSize: 21 }}>{g.icon}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, color: '#FFC24B', lineHeight: 1 }}>{g.score}</span>
      </div>
      {/* Game name */}
      <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
      {/* Holder mini avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 9, color: '#fff',
          background: `linear-gradient(135deg, ${g.c1}, ${g.c2})`,
        }}>{g.initials}</div>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9D90B5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.holder}</span>
      </div>
    </div>
  );
}

// --- Main Hall screen ---

export default function Hall() {
  const { data, ui, setUi, now } = useStore();

  // Defaults: hallPeriod → 'all', recordsExpanded → false
  const period = ui.hallPeriod || 'all';
  const expanded = ui.recordsExpanded || false;

  const vm = buildHall(data, period, now, expanded);

  // Period chip label for the kicker text
  const periodLabel = period === 'thisYear' ? 'This Year' : period === 'last2' ? 'Last 2 Years' : 'All Time';

  return (
    <div style={{ padding: '0 18px' }}>
      {/* Header kicker + title */}
      <div style={{ margin: '4px 2px 14px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFC24B' }}>{periodLabel}</span>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, lineHeight: 1, marginTop: 1 }}>Hall of Fame</div>
      </div>

      {/* Period filter chips */}
      <PeriodChips
        active={period}
        onSelect={k => setUi({ hallPeriod: k, recordsExpanded: false })}
      />

      {/* Empty state when period has no plays */}
      {!vm.hasData ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9D90B5' }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#F4EEF8' }}>No records yet for this stretch</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a wider window, or log some games.</div>
        </div>
      ) : (
        <>
          {/* Prize cards: Most Wins + Best Win% */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <ChampCard champ={vm.champ} />
            {vm.hasWinPct && <WinPctCard wp={vm.winPct} />}
          </div>

          {/* Records & milestones */}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 2px 12px' }}>
            Records &amp; milestones
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {vm.milestones.map((m, i) => (
              <MilestoneCard key={i} m={m} />
            ))}
          </div>

          {/* Rivalries — only shown when vm.hasRivalries */}
          {vm.hasRivalries && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 12px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Rivalries</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5' }}>most-contested</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {vm.rivalries.map((r, i) => (
                  <RivalryCard key={i} r={r} />
                ))}
              </div>
            </>
          )}

          {/* Trophy case */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 12px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Trophy case</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9D90B5' }}>{vm.recordsTotal} records</span>
          </div>
          {vm.records.length === 0 ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9D90B5', padding: '10px 2px' }}>
              No scored records yet — add scores when logging plays.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {vm.records.map((g, i) => (
                <TrophyCard key={i} g={g} />
              ))}
            </div>
          )}

          {/* Expander toggle — only shown when records are capped */}
          {vm.recordsCapped && (
            <div
              onClick={() => setUi({ recordsExpanded: !expanded })}
              style={{
                marginTop: 12,
                textAlign: 'center',
                padding: '13px',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                color: '#FFC24B',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer',
              }}
            >
              {expanded ? 'Show less' : 'Show all records'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
