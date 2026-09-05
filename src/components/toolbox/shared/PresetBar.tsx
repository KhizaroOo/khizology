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
            key={p.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(p.values, p.label)}
            style={{
              padding: '.4rem .875rem',
              borderRadius: '999px',
              border: `1.5px solid ${active ? accent : 'var(--k-border)'}`,
              background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'var(--k-bg)',
              color: active ? accent : 'var(--k-text-muted)',
              fontSize: '.78rem',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              cursor: 'pointer',
              transition: 'border-color .15s, color .15s, background .15s',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
