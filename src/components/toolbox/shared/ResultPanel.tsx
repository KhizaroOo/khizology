import type { ReactNode } from 'react';

interface ResultPanelProps {
  title?: string;
  children: ReactNode;
}

export default function ResultPanel({ title, children }: ResultPanelProps) {
  return (
    <div style={{ background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem', marginTop: '1.5rem' }}>
      {title && (
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1rem' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
