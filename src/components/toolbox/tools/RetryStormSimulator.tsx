import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const TICKS = 20;
const OUTAGE_TICKS = 5; // the backend fails for the first 5 ticks, then recovers

interface TickData {
  tick: number;
  original: number;
  retries: number;
  total: number;
}

function backoffDelay(attempt: number, useBackoff: boolean, useJitter: boolean, seed: number): number {
  if (!useBackoff) return 1;
  const base = Math.min(2 ** attempt, 8);
  if (!useJitter) return Math.round(base);
  // deterministic pseudo-jitter so re-renders with the same seed are stable
  const jitterFactor = 0.7 + (((seed * 9301 + 49297) % 233280) / 233280) * 0.6;
  return Math.max(1, Math.round(base * jitterFactor));
}

// Every tick during the outage window independently fails and retries. Each origin
// tick's failures cascade forward in time; how far apart those cascades land is exactly
// what backoff controls — immediate retry bunches every generation close together
// (they collide and stack), backoff spreads them out so they land on their own.
function simulate(originalRps: number, failureRatePct: number, maxRetries: number, useBackoff: boolean, useJitter: boolean): TickData[] {
  const ticks: TickData[] = Array.from({ length: TICKS }, (_, i) => ({ tick: i, original: 0, retries: 0, total: 0 }));
  const failureRate = failureRatePct / 100;
  const outageEnd = Math.min(OUTAGE_TICKS, TICKS);

  for (let t = 0; t < outageEnd; t++) {
    ticks[t].original = originalRps;
  }

  let seed = 1;
  for (let originTick = 0; originTick < outageEnd; originTick++) {
    let waveCount = originalRps;
    let cumulativeDelay = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const failed = waveCount * failureRate;
      if (failed < 0.5) break;
      const delay = backoffDelay(attempt, useBackoff, useJitter, seed++);
      cumulativeDelay += delay;
      const arrivesAt = originTick + Math.round(cumulativeDelay);
      if (arrivesAt < TICKS) {
        ticks[arrivesAt].retries += failed;
      }
      waveCount = failed;
    }
  }

  for (const row of ticks) {
    row.total = row.original + row.retries;
  }
  return ticks;
}

export default function RetryStormSimulator() {
  const [originalRps, setOriginalRps] = useState(100);
  const [failureRate, setFailureRate] = useState(30);
  const [maxRetries, setMaxRetries] = useState(3);
  const [useBackoff, setUseBackoff] = useState(false);
  const [useJitter, setUseJitter] = useState(false);

  const data = useMemo(
    () => simulate(originalRps, failureRate, maxRetries, useBackoff, useJitter),
    [originalRps, failureRate, maxRetries, useBackoff, useJitter]
  );

  const peak = Math.max(...data.map((d) => d.total));
  const amplification = peak / originalRps;
  const permanentlyFailed = Math.round(originalRps * (failureRate / 100) ** (maxRetries + 1));

  const chartHeight = 200;
  const chartWidth = 640;
  const barGap = 6;
  const barWidth = (chartWidth - barGap * (TICKS - 1)) / TICKS;
  const maxForScale = Math.max(peak, originalRps * 1.2);

  const level = amplification >= 4 ? 'danger' : amplification >= 2 ? 'warn' : 'good';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Original traffic" value={originalRps} onChange={setOriginalRps} min={10} max={1000} step={10} formatValue={(v) => `${v} req/s`} accent="#F7933C" />
        <RangeControl label="Failure rate" value={failureRate} onChange={setFailureRate} min={0} max={90} step={5} formatValue={(v) => `${v}%`} accent="#F7933C" />
        <RangeControl label="Max retries" value={maxRetries} onChange={setMaxRetries} min={0} max={5} step={1} formatValue={(v) => `${v}`} accent="#F7933C" />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
          <input type="checkbox" checked={useBackoff} onChange={(e) => setUseBackoff(e.target.checked)} style={{ accentColor: '#F7933C', width: '16px', height: '16px' }} />
          Exponential backoff
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: useBackoff ? 'var(--k-text)' : 'var(--k-text-muted)', cursor: useBackoff ? 'pointer' : 'not-allowed', fontFamily: "'Poppins', sans-serif" }}>
          <input type="checkbox" checked={useJitter} disabled={!useBackoff} onChange={(e) => setUseJitter(e.target.checked)} style={{ accentColor: '#F7933C', width: '16px', height: '16px' }} />
          Jitter
        </label>
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '0 0 .75rem', lineHeight: 1.5 }}>
        Simulating a {OUTAGE_TICKS}-second outage: the server fails every request for the first {OUTAGE_TICKS} seconds, then recovers. Watch what happens to already-failed requests still trying to retry.
      </p>

      <VisualizationContainer minHeight={260}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} style={{ width: '100%', maxWidth: `${chartWidth}px`, height: 'auto' }} role="img" aria-label="Requests per second hitting the server over time, original traffic vs retry amplification">
          {/* baseline (original traffic) reference line */}
          <line
            x1={0} x2={chartWidth}
            y1={chartHeight - (originalRps / maxForScale) * chartHeight}
            y2={chartHeight - (originalRps / maxForScale) * chartHeight}
            stroke="var(--k-border)" strokeDasharray="4 4" strokeWidth={1}
          />
          {data.map((d, i) => {
            const x = i * (barWidth + barGap);
            const origH = (d.original / maxForScale) * chartHeight;
            const retryH = (d.retries / maxForScale) * chartHeight;
            return (
              <g key={i}>
                <rect x={x} y={chartHeight - origH} width={barWidth} height={origH} fill="#F7933C" opacity={0.85} />
                <rect x={x} y={chartHeight - origH - retryH} width={barWidth} height={retryH} fill="#ef4444" opacity={0.85} />
                <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="8" fill="var(--k-text-muted)">
                  {i}s
                </text>
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#F7933C', borderRadius: '2px', marginRight: '.375rem' }} />Original traffic</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', marginRight: '.375rem' }} />Retry traffic</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1px dashed var(--k-text-muted)', marginRight: '.375rem', verticalAlign: 'middle' }} />Original rate baseline</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Peak load on server" value={`${Math.round(peak)} req/s`} color={level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e'} />
        <Metric label="Amplification" value={`${amplification.toFixed(1)}×`} sublabel="vs. original traffic" color={level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e'} />
        <Metric label="Never succeed" value={`~${permanentlyFailed} req/s`} sublabel={`still failing after ${maxRetries} retries`} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {level === 'danger' && (
          <Warning level="danger" title={`Your server sees ${amplification.toFixed(1)}× its normal load`}>
            Immediate retries during an outage make the outage worse — the retries themselves become the load that keeps the server down. Try turning on exponential backoff and jitter above.
          </Warning>
        )}
        {level === 'warn' && (
          <Warning level="warn" title={`${amplification.toFixed(1)}× amplification — noticeable but survivable`}>
            This is manageable for most services, but it's still extra load caused entirely by the retry policy, not real users.
          </Warning>
        )}
        {level === 'good' && (
          <Warning level="good" title="Retry load stays close to normal">
            {useBackoff ? 'Backoff is spreading retries out over time instead of piling them on immediately.' : 'At this failure rate, retries aren\'t compounding into a storm — but try raising the failure rate to see when they do.'}
          </Warning>
        )}
      </div>
    </div>
  );
}
