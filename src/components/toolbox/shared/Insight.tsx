import { useEffect, useState, type ReactNode } from 'react';

interface InsightProps {
  what: ReactNode;
  why: ReactNode;
  tip?: ReactNode;
}

/** Structures a calculated outcome as Result / Why it matters / Action. */
export default function Insight({ what, why, tip }: InsightProps) {
  const summary = typeof what === 'string' || typeof what === 'number' ? String(what) : '';
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    // Announce only the decision, after input settles; never read the metric wall.
    const timer = setTimeout(() => setAnnouncement(summary), 800);
    return () => clearTimeout(timer);
  }, [summary]);
  return (
    <section aria-label="Result and action" style={{ background: 'var(--k-bg-elevated)', border: '2px solid var(--k-border)', borderRadius: '.875rem', padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <span role="status" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>{announcement}</span>
      <div>
        <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Result
        </div>
        <div style={{ fontSize: '1.05rem', color: 'var(--k-text)', lineHeight: 1.6, fontWeight: 800 }}>{what}</div>
      </div>
      <div>
        <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Why it matters
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', lineHeight: 1.6 }}>{why}</div>
      </div>
      {tip && (
        <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: '.875rem' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Action
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--k-text)', lineHeight: 1.6 }}>{tip}</div>
        </div>
      )}
    </section>
  );
}
