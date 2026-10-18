import type { ReactNode } from 'react';

interface AdvancedDisclosureProps {
  children: ReactNode;
  summary?: string;
}

/** Hides advanced/rarely-needed controls behind a toggle so the default view stays simple. */
export default function AdvancedDisclosure({ children, summary = 'Advanced options' }: AdvancedDisclosureProps) {
  return (
    <details style={{ marginBottom: '1.25rem' }}>
      <summary
        style={{
          cursor: 'pointer',
          minHeight: 44,
          boxSizing: 'border-box',
          padding: '.65rem 0',
          fontSize: '.8rem',
          fontWeight: 700,
          color: 'var(--k-text-muted)',
          fontFamily: "'Poppins', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          userSelect: 'none',
        }}
      >
        {summary}
      </summary>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
        {children}
      </div>
    </details>
  );
}
