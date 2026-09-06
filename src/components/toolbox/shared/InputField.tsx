import { useId } from 'react';

interface InputFieldProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  suffix?: string;
}

export default function InputField({ label, type = 'number', value, onChange, placeholder, step, min, max, suffix }: InputFieldProps) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '.8rem',
          fontWeight: 700,
          color: 'var(--k-text-muted)',
          marginBottom: '.375rem',
          fontFamily: "'Poppins', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '.06em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: suffix ? '.6rem 2.5rem .6rem .875rem' : '.6rem .875rem',
            borderRadius: '.5rem',
            border: '1.5px solid var(--k-border)',
            background: 'var(--k-bg)',
            color: 'var(--k-text)',
            fontSize: '.9rem',
            fontFamily: "'Mulish', sans-serif",
            boxSizing: 'border-box',
          }}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              right: '.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '.8rem',
              color: 'var(--k-text-muted)',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
