import type { ReactNode } from 'react';

type WarnLevel = 'info' | 'warn' | 'danger' | 'good';

interface WarningProps {
  level: WarnLevel;
  title: string;
  children?: ReactNode;
}

const COLORS: Record<WarnLevel, string> = { info: '#6CA6FF', warn: '#F7933C', danger: '#ef4444', good: '#22c55e' };
const ICONS: Record<WarnLevel, string> = { info: 'ℹ', warn: '⚠', danger: '✕', good: '✓' };

export default function Warning({ level, title, children }: WarningProps) {
  const c = COLORS[level];
  return (
    <div
      style={{
        display: 'flex',
        gap: '.75rem',
        alignItems: 'flex-start',
        background: `color-mix(in srgb, ${c} 8%, var(--k-bg-card))`,
        border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
        borderRadius: '.75rem',
        padding: '.875rem 1rem',
      }}
    >
      <span
        style={{
          fontSize: '.8rem',
          fontWeight: 800,
          flexShrink: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: c,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ICONS[level]}
      </span>
      <div>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: '.85rem',
            color: 'var(--k-text)',
            marginBottom: children ? '.25rem' : 0,
          }}
        >
          {title}
        </div>
        {children && (
          <div style={{ fontSize: '.8rem', color: 'var(--k-text-muted)', lineHeight: 1.5 }}>{children}</div>
        )}
      </div>
    </div>
  );
}
