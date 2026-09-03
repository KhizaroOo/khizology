import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { safeNumber, clamp } from '../shared/mathHelpers';

function seededRandom(i: number): number {
  const x = Math.sin(i * 31.415) * 78901.234;
  return x - Math.floor(x);
}

// trialIndex selects an independent seeded draw. trialIndex 0 reduces to the
// original seededRandom(i) sequence, so the "current" chart is unchanged.
function simulate(n: number, baseLatency: number, variancePct: number, parallel: boolean, trialIndex = 0) {
  const latencies = Array.from({ length: n }, (_, i) => {
    const jitter = 1 + (seededRandom(i + trialIndex * 1000) * 2 - 1) * (variancePct / 100);
    return Math.max(5, Math.round(baseLatency * jitter));
  });

  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    starts.push(parallel ? 0 : cursor);
    cursor += parallel ? 0 : latencies[i];
  }
  const ends = latencies.map((l, i) => starts[i] + l);
  const total = Math.max(...ends);
  const bottleneck = ends.indexOf(total);

  return { latencies, starts, ends, total, bottleneck };
}

const PERCENTILE_TRIALS = 200;

export default function FanOutLatencySimulator() {
  const [n, setN] = useState(5);
  const [baseLatency, setBaseLatency] = useState(120);
  const [variance, setVariance] = useState(40);
  const [parallel, setParallel] = useState(true);
  const [failureRate, setFailureRate] = useState(0);
  const [timeoutInput, setTimeoutInput] = useState('300');

  const sim = useMemo(() => {
    const draw = simulate(n, baseLatency, variance, parallel, 0);

    // No timeout entered (or an unusable value) means "effectively no timeout".
    const timeoutMs = clamp(safeNumber(timeoutInput, 100000), 0, 100000);

    // Distinct offset (well past the index range jitter draws use) so this
    // sequence never collides with the latency jitter's seededRandom calls.
    const failed = draw.latencies.map((latency, i) => {
      const timedOut = latency > timeoutMs;
      const independentFail = seededRandom(i * 97 + 5000003) < failureRate / 100;
      return timedOut || independentFail;
    });

    // p50/p95/p99: re-run the same closed model across independent seeded
    // trials and read the total-response-time distribution off the sorted results.
    const totals: number[] = [];
    for (let t = 0; t < PERCENTILE_TRIALS; t++) {
      totals.push(simulate(n, baseLatency, variance, parallel, t).total);
    }
    totals.sort((a, b) => a - b);
    const percentileOf = (p: number) => {
      const idx = clamp(Math.round((p / 100) * (totals.length - 1)), 0, totals.length - 1);
      return totals[idx];
    };

    const failProb = 1 - Math.pow(1 - failureRate / 100, n);

    return {
      ...draw,
      failed,
      p50: percentileOf(50),
      p95: percentileOf(95),
      p99: percentileOf(99),
      failProb,
    };
  }, [n, baseLatency, variance, parallel, failureRate, timeoutInput]);

  const serialTotal = useMemo(() => sim.latencies.reduce((a, b) => a + b, 0), [sim.latencies]);

  const chartW = 560;
  const rowH = 22;
  const chartH = n * rowH;
  const scale = chartW / Math.max(sim.total, 1);

  const failProbColor = sim.failProb < 0.05 ? '#22c55e' : sim.failProb < 0.25 ? '#F7933C' : '#ef4444';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Downstream services" value={n} onChange={setN} min={1} max={10} accent="#6CA6FF" />
        <RangeControl label="Base latency" value={baseLatency} onChange={setBaseLatency} min={20} max={500} step={10} formatValue={(v) => `${v}ms`} accent="#6CA6FF" />
        <RangeControl label="Latency variance" value={variance} onChange={setVariance} min={0} max={100} step={5} formatValue={(v) => `±${v}%`} accent="#6CA6FF" />
        <RangeControl label="Failure rate per call" value={failureRate} onChange={setFailureRate} min={0} max={100} step={1} formatValue={(v) => `${v}%`} accent="#ef4444" />
      </div>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
        {[{ v: true, l: 'Parallel' }, { v: false, l: 'Serial' }].map(({ v, l }) => (
          <button
            key={l}
            onClick={() => setParallel(v)}
            style={{
              background: parallel === v ? '#6CA6FF' : 'transparent',
              color: parallel === v ? '#fff' : 'var(--k-text-muted)',
              border: '1px solid ' + (parallel === v ? '#6CA6FF' : 'var(--k-border)'),
              padding: '.5rem 1rem', borderRadius: '.5rem', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <AdvancedDisclosure summary="Advanced: timeout">
        <InputField label="Timeout" type="number" value={timeoutInput} onChange={setTimeoutInput} min="0" step="10" suffix="ms" />
      </AdvancedDisclosure>

      <VisualizationContainer minHeight={Math.max(chartH + 30, 140)}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Each downstream service's latency, showing when the overall request completes and which calls failed">
          {sim.latencies.map((l, i) => {
            const x = sim.starts[i] * scale;
            const w = l * scale;
            const y = i * rowH + 3;
            const isBottleneck = i === sim.bottleneck;
            const isFailed = sim.failed[i];
            const barFill = isBottleneck || isFailed ? '#ef4444' : '#6CA6FF';
            const barOpacity = isBottleneck ? 1 : isFailed ? 0.5 : 0.75;
            return (
              <g key={i}>
                <rect x={x} y={y} width={Math.max(w, 2)} height={rowH - 6} rx={3} fill={barFill} opacity={barOpacity} />
                <text x={x + 4} y={y + (rowH - 6) / 2 + 3} fontSize="9" fill="#fff" fontWeight="700">
                  {l}ms{isFailed ? ' ×' : ''}
                </text>
              </g>
            );
          })}
          <line x1={sim.total * scale} x2={sim.total * scale} y1={0} y2={chartH} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total response time" value={`${sim.total}ms`} color={parallel ? '#22c55e' : '#F7933C'} />
        <Metric label="Bottleneck service" value={`#${sim.bottleneck + 1}`} sublabel={`${sim.latencies[sim.bottleneck]}ms`} />
        <Metric label="If it were serial instead" value={`${serialTotal}ms`} sublabel={parallel ? `${(serialTotal / sim.total).toFixed(1)}× slower` : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '.75rem' }}>
        <Metric label="P(≥1 call fails)" value={`${(sim.failProb * 100).toFixed(1)}%`} color={failProbColor} sublabel={`at ${failureRate}% per call × ${n} calls`} />
        <Metric label="p50 total time" value={`${sim.p50}ms`} color="#6CA6FF" />
        <Metric label="p95 total time" value={`${sim.p95}ms`} color="#F7933C" />
        <Metric label="p99 total time" value={`${sim.p99}ms`} color="#ef4444" />
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.5rem', fontFamily: "'Mulish', sans-serif" }}>
        Percentiles are estimated from {PERCENTILE_TRIALS} independent seeded re-draws of this scenario, not a theoretical distribution.
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {parallel ? (
          <Warning level="info" title="Your total time is just the slowest branch">
            Adding more parallel calls doesn't slow you down on average — but every extra branch is another chance for a slow outlier, a timeout, or a random failure to become your new bottleneck.
          </Warning>
        ) : (
          <Warning level="warn" title="Serial calls add up — literally">
            Every service's latency stacks on top of the last, and a single failed or timed-out call blocks everything behind it. This is why fan-out is usually done in parallel when the calls don't depend on each other.
          </Warning>
        )}
      </div>
    </div>
  );
}
