import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import { safeDiv } from '../shared/mathHelpers';

const SECONDS = 20;
type Algo = 'fixed' | 'sliding' | 'token-bucket' | 'leaky-bucket';

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
  const delayed: number[] = [];
  let tokens = limit;
  const bucketCap = limit * 2;
  const window: number[] = [];
  let queueLen = 0; // leaky bucket only: requests currently waiting to drain

  for (let s = 0; s < SECONDS; s++) {
    const arrivals = arrivalsForSecond(s, avgRate, bursty);
    let secAllowed = 0;
    let secThrottled = 0;
    let secDelayed = 0;

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
    } else if (algo === 'token-bucket') {
      tokens = Math.min(bucketCap, tokens + limit);
      secAllowed = Math.min(arrivals, tokens);
      tokens -= secAllowed;
      secThrottled = arrivals - secAllowed;
    } else {
      // Leaky bucket: incoming requests join a bounded queue (cap = limit * 2) and the
      // queue drains at exactly `limit` requests/sec. Anything arriving when the queue is
      // already full is rejected outright; everything else is served either this same
      // second (allowed) or a later second after waiting (delayed).
      const queueBefore = queueLen;
      const room = Math.max(0, bucketCap - queueBefore);
      const accepted = Math.min(arrivals, room);
      secThrottled = arrivals - accepted;
      queueLen = queueBefore + accepted;

      const served = Math.min(limit, queueLen);
      const servedFromBacklog = Math.min(served, queueBefore);
      secDelayed = servedFromBacklog;
      secAllowed = served - servedFromBacklog;
      queueLen -= served;
    }

    allowed.push(secAllowed);
    throttled.push(secThrottled);
    delayed.push(secDelayed);
  }

  const totalAllowed = allowed.reduce((a, b) => a + b, 0);
  const totalThrottled = throttled.reduce((a, b) => a + b, 0);
  const totalDelayed = delayed.reduce((a, b) => a + b, 0);
  return { allowed, throttled, delayed, totalAllowed, totalThrottled, totalDelayed };
}

const ALGO_LABELS: Record<Algo, string> = {
  fixed: 'Fixed Window',
  sliding: 'Sliding Window',
  'token-bucket': 'Token Bucket',
  'leaky-bucket': 'Leaky Bucket',
};

interface TrafficPreset {
  avgRate: number;
  limit: number;
  bursty: boolean;
}

const PRESETS: { label: string; values: TrafficPreset }[] = [
  { label: 'Normal', values: { avgRate: 9, limit: 10, bursty: false } },
  { label: 'Burst', values: { avgRate: 14, limit: 10, bursty: true } },
  { label: 'Viral spike', values: { avgRate: 45, limit: 10, bursty: true } },
  { label: 'Bot-like traffic', values: { avgRate: 32, limit: 10, bursty: false } },
];

const labelStyle = {
  display: 'block' as const,
  fontSize: '.8rem',
  fontWeight: 700,
  color: 'var(--k-text-muted)',
  marginBottom: '.375rem',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '.06em',
};

export default function RateLimitPlayground() {
  const [avgRate, setAvgRateState] = useState(15);
  const [limit, setLimitState] = useState(10);
  const [algo, setAlgo] = useState<Algo>('fixed');
  const [bursty, setBurstyState] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  function setAvgRate(v: number) {
    setAvgRateState(v);
    setActivePreset(null);
  }
  function setLimit(v: number) {
    setLimitState(v);
    setActivePreset(null);
  }
  function setBursty(v: boolean) {
    setBurstyState(v);
    setActivePreset(null);
  }
  function applyPreset(values: TrafficPreset, label: string) {
    setAvgRateState(values.avgRate);
    setLimitState(values.limit);
    setBurstyState(values.bursty);
    setActivePreset(label);
  }

  const sim = useMemo(() => simulate(avgRate, limit, algo, bursty), [avgRate, limit, algo, bursty]);
  const throttleRate = safeDiv(sim.totalThrottled, sim.totalAllowed + sim.totalThrottled + sim.totalDelayed, 0) * 100;
  const isLeaky = algo === 'leaky-bucket';

  const chartW = 600;
  const chartH = 160;
  const maxVal = Math.max(...sim.allowed.map((a, i) => a + sim.throttled[i] + sim.delayed[i]), limit * 3, 1);
  const barW = (chartW - 4 * (SECONDS - 1)) / SECONDS;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <label style={labelStyle}>Preset traffic scenarios</label>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent="#F7933C" />

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Algorithm</label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {(['fixed', 'sliding', 'token-bucket', 'leaky-bucket'] as Algo[]).map((a) => (
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
            const delayedH = isLeaky ? (sim.delayed[i] / maxVal) * chartH : 0;
            const throttledH = (sim.throttled[i] / maxVal) * chartH;
            return (
              <g key={i}>
                <rect x={x} y={chartH - allowedH} width={barW} height={allowedH} fill="#22c55e" />
                {isLeaky && (
                  <rect x={x} y={chartH - allowedH - delayedH} width={barW} height={delayedH} fill="#6CA6FF" />
                )}
                <rect x={x} y={chartH - allowedH - delayedH - throttledH} width={barW} height={throttledH} fill="#ef4444" />
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px', marginRight: '.375rem' }} />Allowed</span>
        {isLeaky && (
          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#6CA6FF', borderRadius: '2px', marginRight: '.375rem' }} />Delayed (queued)</span>
        )}
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', marginRight: '.375rem' }} />Throttled</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1px dashed var(--k-text-muted)', marginRight: '.375rem', verticalAlign: 'middle' }} />Rate limit</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total allowed" value={String(sim.totalAllowed)} color="#22c55e" />
        {isLeaky && (
          <Metric label="Total delayed" value={String(sim.totalDelayed)} color="#6CA6FF" sublabel="Queued, served later" />
        )}
        <Metric label="Total throttled" value={String(sim.totalThrottled)} color={sim.totalThrottled > 0 ? '#ef4444' : 'var(--k-text)'} sublabel={isLeaky ? 'Rejected, queue was full' : undefined} />
        <Metric label="Throttle rate" value={`${throttleRate.toFixed(0)}%`} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {algo === 'fixed' && bursty && (
          <Insight
            what={<>A burst right at the boundary between two windows can slip through as nearly 2× the limit — {sim.totalThrottled} of {sim.totalAllowed + sim.totalThrottled} requests were throttled this run.</>}
            why="Fixed window only counts requests within its own clock-aligned second; it resets to zero at each tick with no memory of what just happened a moment earlier."
            tip="Turn off bursty traffic and the throttling drops to near zero — fixed window only struggles at window edges, not with steady load."
          />
        )}
        {algo === 'fixed' && !bursty && (
          <Insight
            what={<>Steady traffic gives fixed window nothing to trip over — {sim.totalThrottled} of {sim.totalAllowed + sim.totalThrottled} requests were throttled this run.</>}
            why="With no bursts, arrivals never cluster at a window boundary, so the simple per-second cap behaves like any other limiter."
            tip="Turn bursty traffic back on to see fixed window's boundary weakness appear."
          />
        )}
        {algo === 'token-bucket' && (
          <Insight
            what={<>Token bucket absorbed the traffic smoothly — only {sim.totalThrottled} of {sim.totalAllowed + sim.totalThrottled} requests were throttled.</>}
            why={<>Unused capacity accumulates as saved-up tokens (up to {limit * 2}), so a short burst gets paid for out of that reserve instead of being throttled the instant it arrives.</>}
            tip="Raise the rate limit's headroom mentally: a bucket that's been idle absorbs a much bigger burst than one that's been running flat-out."
          />
        )}
        {algo === 'sliding' && (
          <Insight
            what={<>Sliding window blends this second's count with half of the last second's — {sim.totalThrottled} of {sim.totalAllowed + sim.totalThrottled} requests were throttled.</>}
            why="Weighting recent history avoids the fixed-window edge effect, at the cost of being slightly more complex to implement and reason about than a plain counter."
            tip="Compare this to Fixed Window with the same bursty traffic — sliding window throttles more evenly instead of letting a boundary burst straight through."
          />
        )}
        {isLeaky && (
          <Insight
            what={<>Leaky bucket queued {sim.totalDelayed} requests to serve a moment later instead of rejecting them, and only dropped {sim.totalThrottled} outright once the queue filled up.</>}
            why={<>Arrivals join a bounded queue (up to {limit * 2}) that drains at a steady {limit}/s no matter how lumpy the input is, so bursts get smoothed into a trickle — but a queue that's already full still has to reject new arrivals.</>}
            tip="Switch to Token Bucket with the same inputs — token bucket rejects instantly instead of making callers wait, which is faster to fail but doesn't smooth the output rate the way leaky bucket does."
          />
        )}
      </div>
    </div>
  );
}
