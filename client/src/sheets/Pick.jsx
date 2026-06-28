// Pick.jsx — "Current pick" bottom sheet (Task 17).
// Ported from prototype pick sheet (lines 914–944).
// Shows whose turn it is to pick the next game (worst finisher from last play).
// "Not here" marks them absent (ui.absent) and cascades to next-worst finisher.
// "Reset" clears the absent map to restart the cascade.

import BottomSheet from '../components/BottomSheet.jsx';
import Avatar from '../components/Avatar.jsx';
import { useStore } from '../store/store.jsx';
import { computePick } from '../lib/stats.js';
import { fmtDate } from '../lib/format.js';

export default function Pick() {
  const { data, ui, setUi } = useStore();

  // Close handler
  const onClose = () => setUi({ pickSheetOpen: false });

  // Compute the current pick using all plays + the absent map from ui state
  const pick = computePick(data, data.plays, ui.absent || {});

  // Whether anyone has been passed up (absent map has at least one entry)
  const hasAbsent = Object.keys(ui.absent || {}).length > 0;

  // Look up player by id
  const playerById = (id) => data.players.find(p => p.id === id);

  // Build the passed-up names string from ordered parts that are in absent
  const passedNames = pick && pick.ordered
    ? pick.ordered
        .filter(part => (ui.absent || {})[part[0]])
        .map(part => playerById(part[0])?.name)
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <BottomSheet open={ui.pickSheetOpen} onClose={onClose}>
      {/* Kicker label */}
      <div style={{
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        color: '#B49BFF',
        marginBottom: 14,
      }}>
        🎯 Current pick goes to
      </div>

      {/* No plays at all */}
      {!pick && (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#9D90B5', padding: '8px 0' }}>
          No games logged yet — log a night first!
        </div>
      )}

      {/* Pick exists and someone holds it */}
      {pick && pick.pickPart && (() => {
        const holder = playerById(pick.pickPart[0]);
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar player={holder} size={54} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 24,
                  lineHeight: 1,
                }}>
                  {holder.name}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#C9B8E8', marginTop: 5 }}>
                  lost {pick.game.icon} {pick.game.name} · {fmtDate(pick.date)}
                </div>
              </div>
            </div>

            {/* Pass button — marks this player absent and cascades to next */}
            <div
              onClick={() => setUi({ absent: { ...(ui.absent || {}), [pick.pickPart[0]]: true } })}
              style={{
                marginTop: 18,
                textAlign: 'center',
                padding: 14,
                borderRadius: 15,
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 14,
                color: '#C9B8E8',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {holder.name} isn't here — pass to next
            </div>
          </>
        );
      })()}

      {/* Pick exists but everyone from every recent game is absent */}
      {pick && !pick.pickPart && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '4px 0' }}>
          <span style={{ fontSize: 34 }}>🎲</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F4EEF8', lineHeight: 1.3 }}>
            Nobody from recent games is here — anyone can pick!
          </span>
        </div>
      )}

      {/* Passed-up section — shown when at least one player has been skipped */}
      {hasAbsent && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 13,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: '#9D90B5',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            Passed up: {passedNames}
          </span>
          <span
            onClick={() => setUi({ absent: {} })}
            style={{
              flexShrink: 0,
              marginLeft: 10,
              fontSize: 12,
              fontWeight: 800,
              color: '#B49BFF',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            ↺ Reset
          </span>
        </div>
      )}

      {/* Footer hint */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6E6483',
        marginTop: 16,
        lineHeight: 1.4,
      }}>
        Whoever lost the last game picks the next one. Not here? Pass it down to the next-worst finisher — and if nobody from that game is around, back to the previous game's loser.
      </div>
    </BottomSheet>
  );
}
