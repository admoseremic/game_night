// DeleteConfirm.jsx — Confirmation bottom sheet for deleting a play (Task 17).
// Ported from prototype delete sheet (lines 841–858).
// Shown when ui.deletePlayId is set; calls actions.removePlay on confirm.

import BottomSheet from '../components/BottomSheet.jsx';
import { useStore } from '../store/store.jsx';

export default function DeleteConfirm() {
  const { ui, setUi, actions } = useStore();

  // Close handler — clears the deletePlayId flag
  const onClose = () => setUi({ deletePlayId: null });

  // Confirm delete: optimistic remove + close the sheet
  const onConfirm = () => {
    actions.removePlay(ui.deletePlayId);
    setUi({ deletePlayId: null });
  };

  return (
    <BottomSheet open={!!ui.deletePlayId} onClose={onClose} title="Delete this play?">
      {/* Warning text */}
      <div style={{
        fontSize: 12.5,
        color: '#9D90B5',
        lineHeight: 1.4,
        marginBottom: 20,
      }}>
        This recalculates the leaderboard and any record scores it set. It can't be undone.
      </div>

      {/* Action buttons side by side */}
      <div style={{ display: 'flex', gap: 10 }}>
        {/* Cancel */}
        <div
          onClick={onClose}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: 15,
            borderRadius: 16,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 15,
            color: '#C9B8E8',
            background: 'rgba(255,255,255,0.07)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Cancel
        </div>

        {/* Destructive Delete */}
        <div
          onClick={onConfirm}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: 15,
            borderRadius: 16,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 15,
            color: '#fff',
            background: 'linear-gradient(135deg,#FF4D6D,#E0334F)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Delete
        </div>
      </div>
    </BottomSheet>
  );
}
