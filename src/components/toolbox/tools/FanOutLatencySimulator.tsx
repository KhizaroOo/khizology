import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

function seededRandom(i: number): number {
  const x = Math.sin(i * 31.415) * 78901.234;
  return x - Math.floor(x);
}

function simulate(n: number, baseLatency: number, variancePct: number, parallel: boolean) {
  const latencies = Array.from({ length: n }, (_, i) => {
    const jitter = 1 + (seededRandom(i) * 2 - 1) * (variancePct / 100);
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

export default function FanOutLatencySimulator() {
  const [n, setN] = useState(5);
  const [baseLatency, setBaseLatency] = useState(120);
  const [variance, setVariance] = useState(40);
  const [parallel, setParallel] = useState(true);

  const sim = useMemo(() => simulate(n, baseLatency, variance, parallel), [n, baseLatency, variance, parallel]);
  const serialTotal = useMemo(() => sim.latencies.reduce((a, b) => a + b, 0), [sim.latencies]);

  const chartW = 560;
  const rowH = 22;
  const chartH = n * rowH;
  const scale = chartW / Math.max(sim.total, 1);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Downstream services" value={n} onChange={setN} min={1} max={10} accent="#6CA6FF" />
        <RangeControl label="Base latency" value={baseLatency} onChange={setBaseLatency} min={20} max={500} step={10} formatValue={(v) => `${v}ms`} accent="#6CA6FF" />
        <RangeControl label="Latency variance" value={variance} onChange={setVariance} min={0} max={100} step={5} formatValue={(v) => `±${v}%`} accent="#6CA6FF" />
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

      <VisualizationContainer minHeight={Math.max(chartH + 30, 140)}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Each downstream service's latency, showing when the overall request completes">
          {sim.latencies.map((l, i) => {
            const x = sim.starts[i] * scale;
            const w = l * scale;
            const y = i * rowH + 3;
            const isBottleneck = i === sim.bottleneck;
            return (
              <g key={i}>
                <rect x={x} y={y} width={Math.max(w, 2)} height={rowH - 6} rx={3} fill={isBottleneck ? '#ef4444' : '#6CA6FF'} opacity={isBottleneck ? 1 : 0.75} />
                <text x={x + 4} y={y + (rowH - 6) / 2 + 3} fontSize="9" fill="#fff" fontWeight="700">{l}ms</text>
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

      <div style={{ marginTop: '1.25rem' }}>
        {parallel ? (
          <Warning level="info" title="Your total time is just the slowest branch">
            Adding more parallel calls doesn't slow you down on average — but every extra branch is another chance for a slow outlier to become your new bottleneck.
          </Warning>
        ) : (
          <Warning level="warn" title="Serial calls add up — literally">
            Every service's latency stacks on top of the last. This is why fan-out is usually done in parallel when the calls don't depend on each other.
          </Warning>
        )}
      </div>
    </div>
  );
}
