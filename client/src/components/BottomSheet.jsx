// BottomSheet.jsx — Reusable slide-up bottom sheet with dimmed backdrop.
// Clicking the backdrop closes the sheet; clicking the panel does NOT (stopPropagation).
// Usage: <BottomSheet open={bool} onClose={fn} title="Sheet title">{children}</BottomSheet>

export default function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    // Backdrop — clicking it closes the sheet
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,5,14,0.6)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 60,
        // Fade in with the same duration as the panel slide
        animation: 'gnFadeIn 0.28s ease',
      }}
    >
      {/* Panel — stopPropagation so clicks don't bubble to backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'linear-gradient(180deg,#241B33,#181122)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 20px 30px',
          // Slide up animation — respects prefers-reduced-motion via the keyframe definition
          animation: 'gnRise 0.28s ease',
        }}
      >
        {/* Grip handle */}
        <div style={{
          width: 38,
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.18)',
          margin: '8px auto 16px',
        }} />

        {/* Optional title */}
        {title && (
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 20,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}>
            {title}
          </div>
        )}

        {children}
      </div>

      {/*
        gnRise keyframe is defined in the prototype's global CSS (animation:gnRise .28s ease).
        We inject a minimal fallback here in case it's missing from the page stylesheet.
        prefers-reduced-motion: the @media query disables the animation.
      */}
      <style>{`
        @keyframes gnRise {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes gnFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="gnRise"], [style*="gnFadeIn"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
