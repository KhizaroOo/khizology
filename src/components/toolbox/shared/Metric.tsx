interface MetricProps {
  label: string;
  value: string;
  color?: string;
  sublabel?: string;
}

export default function Metric({ label, value, color, sublabel }: MetricProps) {
  return (
    <div style={{ background: 'var(--k-bg-card)', borderRadius: '.625rem', padding: '.875rem' }}>
      <div
        style={{
          fontSize: '.72rem',
          fontWeight: 700,
          color: 'var(--k-text-muted)',
          fontFamily: "'Poppins', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: '.3rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: color || 'var(--k-text)' }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.2rem' }}>{sublabel}</div>
      )}
    </div>
  );
}
