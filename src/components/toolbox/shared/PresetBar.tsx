import type { CSSProperties } from 'react';

interface Preset<T> {
  label: string;
  values: T;
}

interface PresetBarProps<T> {
  presets: Preset<T>[];
  activeLabel?: string | null;
  onSelect: (values: T, label: string) => void;
  accent?: string;
}

/** A row of example-scenario buttons that populate a tool's inputs with realistic values. */
export default function PresetBar<T>({ presets, activeLabel, onSelect, accent = '#F7933C' }: PresetBarProps<T>) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.25rem' }}>
      {presets.map((p) => {
        const active = p.label === activeLabel;
        return (
          <button
            className="k-button k-button--secondary"
            key={p.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(p.values, p.label)}
            style={{ '--k-button-accent': accent, '--k-button-ink': 'var(--k-button-dark-ink)' } as CSSProperties}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
