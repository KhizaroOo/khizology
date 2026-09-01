import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

interface AskItem {
  label: string;
  hours: number;
}

const PRESET_ASKS: AskItem[] = [
  { label: '"Just one more revision round"', hours: 2 },
  { label: '"Can you also make it mobile responsive?"', hours: 4 },
  { label: '"Quick logo tweak"', hours: 1 },
  { label: '"Add a contact form"', hours: 3 },
  { label: '"Small copy change"', hours: 0.5 },
  { label: '"One more color scheme option"', hours: 2 },
  { label: '"Can we add analytics?"', hours: 1.5 },
  { label: '"Minor animation polish"', hours: 2.5 },
  { label: '"Extra stakeholder review round"', hours: 3 },
  { label: '"Quick accessibility pass"', hours: 2 },
  { label: '"Add a loading state"', hours: 1 },
  { label: '"One more round of feedback"', hours: 2 },
];

const MAX_ASKS = PRESET_ASKS.length;

type Severity = 'good' | 'warn' | 'danger';

function severityFor(rateLostPct: number): Severity {
  if (rateLostPct >= 30) return 'danger';
  if (rateLostPct >= 10) return 'warn';
  return 'good';
}

const SEVERITY_COLOR: Record<Severity, string> = {
  good: '#22c55e',
  warn: '#F7933C',
  danger: '#ef4444',
};

export default function ScopeCreepVisualizer() {
  const [quotedPrice, setQuotedPrice] = useState('3000');
  const [originalHours, setOriginalHours] = useState('40');
  const [asksCount, setAsksCount] = useState(0);

  const price = Math.max(0, parseFloat(quotedPrice) || 0);
  const origHours = Math.max(0.5, parseFloat(originalHours) || 0.5);

  // cumulativeHours[k] = total extra hours added by the first k presets asks
  const cumulativeHours = useMemo(() => {
    const arr: number[] = [0];
    for (let i = 0; i < PRESET_ASKS.length; i++) {
      arr.push(arr[i] + PRESET_ASKS[i].hours);
    }
    return arr;
  }, []);

  // effective rate at every possible ask count, 0..MAX_ASKS
  const curve = useMemo(
    () => cumulativeHours.map((added) => price / (origHours + added)),
    [cumulativeHours, price, origHours]
  );

  const addedAsks = PRESET_ASKS.slice(0, asksCount);
  const addedHours = cumulativeHours[asksCount];
  const totalHours = origHours + addedHours;
  const originalRate = price / origHours;
  const effectiveRate = price / totalHours;
  const rateLostPct = originalRate > 0 ? Math.max(0, ((originalRate - effectiveRate) / originalRate) * 100) : 0;
  const sev = severityFor(rateLostPct);
  const color = SEVERITY_COLOR[sev];

  const chartW = 560;
  const chartH = 180;
  const maxRate = curve[0] || 1;
  const yFor = (r: number) => chartH - Math.min(1, r / maxRate) * chartH;
  const xFor = (k: number) => (k / MAX_ASKS) * chartW;

  const linePoints = curve.map((r, k) => `${xFor(k)},${yFor(r)}`).join(' ');
  const curX = xFor(asksCount);
  const curY = yFor(effectiveRate);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Quoted project price" value={quotedPrice} onChange={setQuotedPrice} suffix="$" />
        <InputField label="Original estimated hours" value={originalHours} onChange={setOriginalHours} suffix="hrs" />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <RangeControl
          label='Extra "small" asks added'
          value={asksCount}
          onChange={setAsksCount}
          min={0}
          max={MAX_ASKS}
          formatValue={(v) => (v === 1 ? '1 ask' : `${v} asks`)}
          accent="#F7933C"
        />
      </div>

      <VisualizationContainer minHeight={220}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 24}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label="Effective hourly rate declining as more small asks pile onto the project"
        >
          <line x1={0} y1={yFor(curve[0])} x2={chartW} y2={yFor(curve[0])} stroke="var(--k-border)" strokeWidth={1} strokeDasharray="4 4" />
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} />
          <circle cx={curX} cy={curY} r={6} fill={color} stroke="var(--k-bg)" strokeWidth={2} />
          <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">${originalRate.toFixed(0)}/hr quoted</text>
          <text x={4} y={chartH + 18} fontSize="9" fill="var(--k-text-muted)">0 asks</text>
          <text x={chartW - 46} y={chartH + 18} fontSize="9" fill="var(--k-text-muted)">{MAX_ASKS} asks</text>
        </svg>
      </VisualizationContainer>

      <div style={{ marginTop: '1.25rem' }}>
        <div
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            fontFamily: "'Poppins', sans-serif",
            marginBottom: '.5rem',
          }}
        >
          What you've quietly said yes to
        </div>
        {addedAsks.length === 0 ? (
          <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', margin: 0 }}>
            Nothing yet — drag the slider above to start adding "just one small thing" requests.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {addedAsks.map((ask, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '.75rem',
                  fontSize: '.85rem',
                  color: 'var(--k-text)',
                  background: 'var(--k-bg)',
                  border: '1px solid var(--k-border)',
                  borderRadius: '.5rem',
                  padding: '.5rem .75rem',
                }}
              >
                <span>{ask.label}</span>
                <span style={{ color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif", fontWeight: 700, flexShrink: 0 }}>
                  +{ask.hours}h
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Original rate" value={`$${originalRate.toFixed(0)}/hr`} sublabel={`${origHours}h estimated`} />
        <Metric label="Effective rate now" value={`$${effectiveRate.toFixed(0)}/hr`} color={color} sublabel={`${totalHours.toFixed(1)}h actual`} />
        <Metric label="Rate lost" value={`${rateLostPct.toFixed(0)}%`} color={color} sublabel="vs. what you quoted" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {asksCount === 0 ? (
          <Warning level="good" title="Still on scope — charging exactly what you quoted">
            Every "quick" ask below costs real hours nobody paid for. Drag the slider up to watch your rate quietly shrink.
          </Warning>
        ) : (
          <Warning level={sev} title={`You're now effectively working for ${rateLostPct.toFixed(0)}% less than you quoted`}>
            {sev === 'danger' &&
              `${addedHours}h of "small" extras turned a $${originalRate.toFixed(0)}/hr job into a $${effectiveRate.toFixed(0)}/hr one. None of these asks were unreasonable on their own — that's exactly how scope creep works. Worth pricing the next one as its own line item.`}
            {sev === 'warn' &&
              `That's real money walking out the door for free. A quick "happy to do this — here's the extra cost" message now is cheaper than staying quiet.`}
            {sev === 'good' &&
              `Small so far, but it adds up fast. This is the moment to start saying "sure, that's a $X add-on" instead of just nodding along.`}
          </Warning>
        )}
      </div>
    </div>
  );
}
