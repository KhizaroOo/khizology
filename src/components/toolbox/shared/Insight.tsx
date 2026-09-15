import type { ReactNode } from 'react';

interface InsightProps {
  what: ReactNode;
  why: ReactNode;
  tip?: ReactNode;
}

/** Structures a calculated outcome as Result / Why it matters / Action. */
export default function Insight({ what, why, tip }: InsightProps) {
  return (
    <div style={{ background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '.875rem', padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div>
        <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Result
        </div>
        <div style={{ fontSize: '.9rem', color: 'var(--k-text)', lineHeight: 1.6, fontWeight: 700 }}>{what}</div>
      </div>
      <div>
        <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Why it matters
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', lineHeight: 1.6 }}>{why}</div>
      </div>
      {tip && (
        <div>
          <div style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
          Action
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--k-text)', lineHeight: 1.6 }}>{tip}</div>
        </div>
      )}
    </div>
  );
}
