import { useId } from 'react';

interface RangeControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  accent?: string;
}

export default function RangeControl({ label, value, onChange, min, max, step = 1, formatValue, accent = '#F7933C' }: RangeControlProps) {
  const id = useId();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '.25rem .5rem', marginBottom: '.375rem' }}>
        <label
          htmlFor={id}
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          {label}
        </label>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.85rem', color: accent }}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
      />
    </div>
  );
}
