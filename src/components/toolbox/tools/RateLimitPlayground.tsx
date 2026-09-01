import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const SECONDS = 20;
type Algo = 'fixed' | 'sliding' | 'token-bucket';

function seededRandom(i: number): number {
  const x = Math.sin(i * 45.164) * 12345.678;
  return x - Math.floor(x);
}

function arrivalsForSecond(sec: number, avgRate: number, bursty: boolean): number {
  if (!bursty) return avgRate;
  // Bursty: alternate quiet periods with 3x spikes every ~4 seconds
  const phase = sec % 4;
  const jitter = 0.85 + seededRandom(sec) * 0.3;
  return phase === 0 ? Math.round(avgRate * 3 * jitter) : Math.round(avgRate * 0.4 * jitter);
}

function simulate(avgRate: number, limit: number, algo: Algo, bursty: boolean) {
  const allowed: number[] = [];
  const throttled: number[] = [];
  let tokens = limit;
  const bucketCap = limit * 2;
  const window: number[] = [];

  for (let s = 0; s < SECONDS; s++) {
    const arrivals = arrivalsForSecond(s, avgRate, bursty);
    let secAllowed = 0;
    let secThrottled = 0;

    if (algo === 'fixed') {
      secAllowed = Math.min(arrivals, limit);
      secThrottled = arrivals - secAllowed;
    } else if (algo === 'sliding') {
      // weighted average of this + previous second's count against the limit
      const prev = window[s - 1] ?? 0;
      const prevWeight = 0.5;
      const effectiveCount = (r: number) => prev * prevWeight + r;
      let allowedCount = 0;
      for (let r = 1; r <= arrivals; r++) {
        if (effectiveCount(allowedCount + 1) <= limit) allowedCount++;
        else break;
      }
      secAllowed = allowedCount;
      secThrottled = arrivals - secAllowed;
      window.push(secAllowed);
    } else {
      tokens = Math.min(bucketCap, tokens + limit);
      secAllowed = Math.min(arrivals, tokens);
      tokens -= secAllowed;
      secThrottled = arrivals - secAllowed;
    }

    allowed.push(secAllowed);
    throttled.push(secThrottled);
  }

  const totalAllowed = allowed.reduce((a, b) => a + b, 0);
  const totalThrottled = throttled.reduce((a, b) => a + b, 0);
  return { allowed, throttled, totalAllowed, totalThrottled };
}

const ALGO_LABELS: Record<Algo, string> = { fixed: 'Fixed Window', sliding: 'Sliding Window', 'token-bucket': 'Token Bucket' };

export default function RateLimitPlayground() {
  const [avgRate, setAvgRate] = useState(15);
  const [limit, setLimit] = useState(10);
  const [algo, setAlgo] = useState<Algo>('fixed');
  const [bursty, setBursty] = useState(true);

  const sim = useMemo(() => simulate(avgRate, limit, algo, bursty), [avgRate, limit, algo, bursty]);
  const throttleRate = sim.totalAllowed + sim.totalThrottled > 0 ? (sim.totalThrottled / (sim.totalAllowed + sim.totalThrottled)) * 100 : 0;

  const chartW = 600;
  const chartH = 160;
  const maxVal = Math.max(...sim.allowed.map((a, i) => a + sim.throttled[i]), limit * 3, 1);
  const barW = (chartW - 4 * (SECONDS - 1)) / SECONDS;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.375rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Algorithm
        </label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {(['fixed', 'sliding', 'token-bucket'] as Algo[]).map((a) => (
            <button
              key={a}
              onClick={() => setAlgo(a)}
              style={{
                background: algo === a ? '#F7933C' : 'transparent',
                color: algo === a ? '#fff' : 'var(--k-text-muted)',
                border: '1px solid ' + (algo === a ? '#F7933C' : 'var(--k-border)'),
                padding: '.5rem 1rem', borderRadius: '.5rem', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
              }}
            >
              {ALGO_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Average incoming rate" value={avgRate} onChange={setAvgRate} min={1} max={50} formatValue={(v) => `${v}/s`} accent="#F7933C" />
        <RangeControl label="Rate limit" value={limit} onChange={setLimit} min={1} max={30} formatValue={(v) => `${v}/s`} accent="#F7933C" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: '1.5rem' }}>
        <input type="checkbox" checked={bursty} onChange={(e) => setBursty(e.target.checked)} style={{ accentColor: '#F7933C', width: '16px', height: '16px' }} />
        Bursty traffic (spikes every few seconds) — off means steady, even traffic
      </label>

      <VisualizationContainer minHeight={220}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 16}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Requests allowed vs throttled per second">
          <line x1={0} x2={chartW} y1={chartH - (limit / maxVal) * chartH} y2={chartH - (limit / maxVal) * chartH} stroke="var(--k-text-muted)" strokeDasharray="4 4" strokeWidth={1} />
          {sim.allowed.map((a, i) => {
            const x = i * (barW + 4);
            const allowedH = (a / maxVal) * chartH;
            const throttledH = (sim.throttled[i] / maxVal) * chartH;
            return (
              <g key={i}>
                <rect x={x} y={chartH - allowedH} width={barW} height={allowedH} fill="#22c55e" />
                <rect x={x} y={chartH - allowedH - throttledH} width={barW} height={throttledH} fill="#ef4444" />
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px', marginRight: '.375rem' }} />Allowed</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', marginRight: '.375rem' }} />Throttled</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1px dashed var(--k-text-muted)', marginRight: '.375rem', verticalAlign: 'middle' }} />Rate limit</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total allowed" value={String(sim.totalAllowed)} color="#22c55e" />
        <Metric label="Total throttled" value={String(sim.totalThrottled)} color={sim.totalThrottled > 0 ? '#ef4444' : 'var(--k-text)'} />
        <Metric label="Throttle rate" value={`${throttleRate.toFixed(0)}%`} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {algo === 'fixed' && bursty && (
          <Warning level="warn" title="Fixed window has a boundary problem">
            A burst right at the edge of one window and the start of the next can slip through as nearly 2× the limit in a short span — fixed window only counts within its own clock-aligned second.
          </Warning>
        )}
        {algo === 'token-bucket' && (
          <Warning level="good" title="Token bucket smooths bursts using saved-up capacity">
            Unused capacity accumulates as tokens (up to {limit * 2}), so short bursts get absorbed instead of instantly throttled.
          </Warning>
        )}
        {algo === 'sliding' && (
          <Warning level="info" title="Sliding window blends this second with the last">
            This avoids the fixed-window edge effect by weighting recent history, at the cost of being slightly more complex to implement.
          </Warning>
        )}
      </div>
    </div>
  );
}
