import type { ReactNode } from 'react';

interface VisualizationContainerProps {
  children: ReactNode;
  minHeight?: number;
}

export default function VisualizationContainer({ children, minHeight = 220 }: VisualizationContainerProps) {
  return (
    <div
      style={{
        background: 'var(--k-bg)',
        border: '1px solid var(--k-border)',
        borderRadius: '.875rem',
        padding: '1.25rem',
        minHeight: `${minHeight}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'auto',
      }}
    >
      {children}
    </div>
  );
}
