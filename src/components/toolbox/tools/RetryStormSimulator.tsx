import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

const TICKS = 20;
const OUTAGE_TICKS = 5; // the backend fails for the first 5 ticks, then recovers

interface TickData {
  tick: number;
  original: number;
  retries: number;
  total: number;
}

interface RetryScenario {
  originalRps: number;
  failureRatePct: number;
  maxRetries: number;
  useBackoff: boolean;
  useJitter: boolean;
}

const PRESETS: { label: string; values: RetryScenario }[] = [
  { label: 'Healthy API', values: { originalRps: 120, failureRatePct: 5, maxRetries: 3, useBackoff: true, useJitter: true } },
  { label: 'Partial outage', values: { originalRps: 150, failureRatePct: 40, maxRetries: 3, useBackoff: false, useJitter: false } },
  { label: 'Major dependency outage', values: { originalRps: 300, failureRatePct: 85, maxRetries: 4, useBackoff: false, useJitter: false } },
  { label: 'Slow recovery', values: { originalRps: 180, failureRatePct: 60, maxRetries: 3, useBackoff: true, useJitter: true } },
];

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
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (values: RetryScenario, label: string) => {
    setOriginalRps(values.originalRps);
    setFailureRate(values.failureRatePct);
    setMaxRetries(values.maxRetries);
    setUseBackoff(values.useBackoff);
    setUseJitter(values.useJitter);
    setActivePreset(label);
  };

  const data = useMemo(
    () => simulate(originalRps, failureRate, maxRetries, useBackoff, useJitter),
    [originalRps, failureRate, maxRetries, useBackoff, useJitter]
  );

  // What peak load would look like with the opposite backoff strategy, same traffic
  // and failure rate — flipping to "backoff on" pairs it with jitter, since that's the
  // realistic recommended combo; flipping to "backoff off" ignores jitter entirely,
  // same as the live simulation does.
  const compareUseBackoff = !useBackoff;
  const compareUseJitter = compareUseBackoff;
  const compareData = useMemo(
    () => simulate(originalRps, failureRate, maxRetries, compareUseBackoff, compareUseJitter),
    [originalRps, failureRate, maxRetries, compareUseBackoff, compareUseJitter]
  );

  const peak = Math.max(...data.map((d) => d.total));
  const comparePeak = Math.max(...compareData.map((d) => d.total));
  const amplification = safeDiv(peak, originalRps, 0);
  const permanentlyFailed = Math.round(originalRps * (failureRate / 100) ** (maxRetries + 1));
  const outageEnd = Math.min(OUTAGE_TICKS, TICKS);

  // Rough estimates, not exact accounting: requests during the outage window that
  // eventually get through vs. retry traffic generated by requests that never do.
  const successfulRequests = Math.round(clamp(originalRps - permanentlyFailed, 0, originalRps));
  const wastedRetryAttempts = Math.round(permanentlyFailed * outageEnd * maxRetries);

  const chartHeight = 200;
  const chartWidth = 640;
  const barGap = 6;
  const barWidth = (chartWidth - barGap * (TICKS - 1)) / TICKS;
  const maxForScale = Math.max(peak, originalRps * 1.2, 1);

  const level = amplification >= 4 ? 'danger' : amplification >= 2 ? 'warn' : 'good';
  const levelColor = level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e';

  const currentLabel = useBackoff ? (useJitter ? 'Backoff + jitter (current)' : 'Backoff only (current)') : 'No backoff (current)';
  const otherLabel = compareUseBackoff ? 'With backoff + jitter' : 'Without backoff';

  const backoffPeak = useBackoff ? peak : comparePeak;
  const noBackoffPeak = useBackoff ? comparePeak : peak;
  const backoffReduction = safeDiv(noBackoffPeak, backoffPeak, 1);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent="#F7933C" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl
          label="Original traffic"
          value={originalRps}
          onChange={(v) => { setOriginalRps(v); setActivePreset(null); }}
          min={10} max={1000} step={10}
          formatValue={(v) => `${v} req/s`}
          accent="#F7933C"
        />
        <RangeControl
          label="Failure rate"
          value={failureRate}
          onChange={(v) => { setFailureRate(v); setActivePreset(null); }}
          min={0} max={90} step={5}
          formatValue={(v) => `${v}%`}
          accent="#F7933C"
        />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
          <input
            type="checkbox"
            checked={useBackoff}
            onChange={(e) => { setUseBackoff(e.target.checked); setActivePreset(null); }}
            style={{ accentColor: '#F7933C', width: '16px', height: '16px' }}
          />
          Exponential backoff
        </label>
      </div>

      <AdvancedDisclosure summary="Advanced: max retries & jitter">
        <RangeControl
          label="Max retries"
          value={maxRetries}
          onChange={(v) => { setMaxRetries(v); setActivePreset(null); }}
          min={0} max={5} step={1}
          formatValue={(v) => `${v}`}
          accent="#F7933C"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: useBackoff ? 'var(--k-text)' : 'var(--k-text-muted)', cursor: useBackoff ? 'pointer' : 'not-allowed', fontFamily: "'Poppins', sans-serif" }}>
          <input
            type="checkbox"
            checked={useJitter}
            disabled={!useBackoff}
            onChange={(e) => { setUseJitter(e.target.checked); setActivePreset(null); }}
            style={{ accentColor: '#F7933C', width: '16px', height: '16px' }}
          />
          Jitter
        </label>
      </AdvancedDisclosure>

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

      <div style={{ background: 'var(--k-bg)', border: '1px solid var(--k-border)', borderRadius: '.875rem', padding: '1rem', marginTop: '1.25rem' }}>
        <div style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.75rem', fontFamily: "'Poppins', sans-serif" }}>
          Same traffic & failure rate — with vs. without backoff
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem' }}>
          <Metric label={currentLabel} value={`${formatNumber(peak)} req/s`} sublabel="peak load, live chart above" color={levelColor} />
          <Metric label={otherLabel} value={`${formatNumber(comparePeak)} req/s`} sublabel="peak load, same inputs" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.25rem' }}>
        <Metric label="Peak load on server" value={`${formatNumber(peak)} req/s`} color={levelColor} />
        <Metric label="Amplification" value={`${formatNumber(amplification, 1)}×`} sublabel="vs. original traffic" color={levelColor} />
        <Metric label="Successful requests" value={`~${formatNumber(successfulRequests)} req/s`} sublabel={`of ~${originalRps} req/s during the outage`} color="#22c55e" />
        <Metric label="Never succeed" value={`~${formatNumber(permanentlyFailed)} req/s`} sublabel={`still failing after ${maxRetries} retries`} color="#ef4444" />
        <Metric label="Wasted retry attempts" value={`~${formatNumber(wastedRetryAttempts)}`} sublabel="retries from requests that never succeeded" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <Insight
          what={
            level === 'danger'
              ? `Peak load hits ${formatNumber(peak)} req/s — ${formatNumber(amplification, 1)}× the normal ${originalRps} req/s.`
              : level === 'warn'
              ? `Peak load reaches ${formatNumber(peak)} req/s, ${formatNumber(amplification, 1)}× normal — noticeable but survivable.`
              : `Peak load stays close to normal at ${formatNumber(peak)} req/s (${formatNumber(amplification, 1)}× baseline).`
          }
          why={
            level === 'good'
              ? (useBackoff
                  ? 'Backoff is spreading retries out over time instead of piling them on immediately, so the extra load never compounds into a storm.'
                  : "At this failure rate, retries aren't compounding into a storm yet — but raise the failure rate and immediate retries stack on top of each other fast.")
              : 'Immediate retries during an outage arrive in bunches and stack on top of each other and the still-recovering original traffic — the retries themselves become the load that keeps the server down. This is a simplified model of retry cascades, not a precise capacity forecast.'
          }
          tip={
            backoffReduction > 1.05
              ? `With backoff + jitter, peak load would be about ${formatNumber(backoffPeak)} req/s instead of ${formatNumber(noBackoffPeak)} req/s — roughly ${formatNumber(backoffReduction, 1)}× lower. ${useBackoff ? 'You already have it on.' : 'Turn on exponential backoff above to see it.'}`
              : `Backoff makes little difference at these settings (${formatNumber(backoffPeak)} vs ${formatNumber(noBackoffPeak)} req/s) — try a higher failure rate or more max retries to see it matter.`
          }
        />
      </div>
    </div>
  );
}
