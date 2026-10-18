import type { ReactNode } from 'react';

interface VisualizationContainerProps {
  children: ReactNode;
  minHeight?: number;
  /** Preserve dense chart labels at their designed width; scroll locally on small screens. */
  minContentWidth?: number;
}

export default function VisualizationContainer({ children, minHeight = 220, minContentWidth }: VisualizationContainerProps) {
  return (
    <div
      tabIndex={minContentWidth ? 0 : undefined}
      role={minContentWidth ? 'region' : undefined}
      aria-label={minContentWidth ? 'Chart; scroll sideways to explore on narrow screens' : undefined}
      style={{
        background: 'var(--k-bg)',
        border: '1px solid var(--k-border)',
        borderRadius: '.875rem',
        padding: '1.25rem',
        minHeight: `${minHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: minContentWidth ? 'flex-start' : 'center',
        justifyContent: 'center',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto',
      }}
    >
      {minContentWidth ? (
        <div style={{ width: '100%', minWidth: minContentWidth, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>
      ) : children}
    </div>
  );
}
