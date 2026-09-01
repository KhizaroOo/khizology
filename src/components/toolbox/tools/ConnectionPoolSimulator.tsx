import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const TICKS = 20;
const BUSY_COLOR = '#F7933C';
const FREE_COLOR = '#22c55e';
const WAIT_COLOR = '#ef4444';

interface TickResult {
  busy: number;
  free: number;
  waiting: number;
}

interface SimResult {
  ticks: TickResult[];
  totalThroughput: number;
  throughputPerConn: number;
  maxWaiting: number;
  utilizationPct: number;
  exhaustionEvents: number;
}

function simulate(poolSize: number, requestRate: number, holdTimeMs: number): SimResult {
  const throughputPerConn = 1000 / holdTimeMs; // requests/sec one connection can churn through
  const totalThroughput = poolSize * throughputPerConn;

  let waitingQueue = 0;
  const ticks: TickResult[] = [];

  for (let t = 0; t < TICKS; t++) {
    const arrivals = requestRate;
    const served = Math.min(waitingQueue + arrivals, totalThroughput);
    waitingQueue = Math.max(0, waitingQueue + arrivals - totalThroughput);
    const busy = Math.min(poolSize, Math.ceil(served / throughputPerConn));
    const free = poolSize - busy;
    ticks.push({ busy, free, waiting: waitingQueue });
  }

  const maxWaiting = Math.max(...ticks.map((t) => t.waiting), 0);
  const utilizationPct = (ticks.reduce((sum, t) => sum + t.busy / poolSize, 0) / TICKS) * 100;
  const exhaustionEvents = ticks.filter((t) => t.busy === poolSize).length;

  return { ticks, totalThroughput, throughputPerConn, maxWaiting, utilizationPct, exhaustionEvents };
}

export default function ConnectionPoolSimulator() {
  const [poolSize, setPoolSize] = useState(10);
  const [requestRate, setRequestRate] = useState(25);
  const [holdTimeMs, setHoldTimeMs] = useState(100);

  const sim = useMemo(() => simulate(poolSize, requestRate, holdTimeMs), [poolSize, requestRate, holdTimeMs]);

  const chartW = 640;
  const chartH = 180;
  const topPad = 46;
  const bottomPad = 22;
  const gap = 3;
  const barW = (chartW - gap * (TICKS - 1)) / TICKS;
  const unit = chartH / poolSize;
  const waitingScale = sim.maxWaiting > 0 ? 34 / sim.maxWaiting : 0;
  const peakIndex = sim.ticks.reduce((best, t, i) => (t.waiting > sim.ticks[best].waiting ? i : best), 0);
  const baselineY = topPad + chartH;
  const poolTopY = topPad;
  const isQueuing = sim.maxWaiting > 0.01;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Pool size (max connections)" value={poolSize} onChange={setPoolSize} min={2} max={50} accent="#F7933C" />
        <RangeControl label="Incoming request rate" value={requestRate} onChange={setRequestRate} min={1} max={100} formatValue={(v) => `${v}/s`} accent="#F7933C" />
        <RangeControl label="Avg. connection hold time" value={holdTimeMs} onChange={setHoldTimeMs} min={10} max={1000} step={10} formatValue={(v) => `${v}ms`} accent="#F7933C" />
      </div>

      <VisualizationContainer minHeight={260}>
        <svg
          viewBox={`0 0 ${chartW} ${topPad + chartH + bottomPad}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label="Busy, free and waiting connections per second across a 20-second simulation"
        >
          {sim.ticks.map((tick, i) => {
            const x = i * (barW + gap);
            const busyH = tick.busy * unit;
            const freeH = tick.free * unit;
            const waitH = Math.min(tick.waiting * waitingScale, 40);
            return (
              <g key={i}>
                {waitH > 0 && (
                  <rect x={x} y={poolTopY - waitH} width={barW} height={waitH} fill={WAIT_COLOR} opacity={0.85} rx={1} />
                )}
                <rect x={x} y={poolTopY} width={barW} height={freeH} fill={FREE_COLOR} />
                <rect x={x} y={baselineY - busyH} width={barW} height={busyH} fill={BUSY_COLOR} />
                <title>{`t=${i + 1}s — busy ${tick.busy}, free ${tick.free}, waiting ${Math.ceil(tick.waiting)}`}</title>
              </g>
            );
          })}

          {sim.maxWaiting > 0.01 && (
            <text
              x={peakIndex * (barW + gap) + barW / 2}
              y={Math.max(9, poolTopY - Math.min(sim.ticks[peakIndex].waiting * waitingScale, 40) - 6)}
              fontSize={9}
              fontWeight={700}
              fill={WAIT_COLOR}
              textAnchor="middle"
              fontFamily="'Poppins', sans-serif"
            >
              {Math.ceil(sim.maxWaiting)} waiting
            </text>
          )}

          <line x1={0} x2={chartW} y1={poolTopY} y2={poolTopY} stroke="var(--k-border)" strokeWidth={1} />

          {[0, 4, 9, 14, 19].map((i) => (
            <text
              key={i}
              x={i * (barW + gap) + barW / 2}
              y={baselineY + 14}
              fontSize={9}
              fill="var(--k-text-muted)"
              textAnchor="middle"
            >
              {i + 1}s
            </text>
          ))}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: BUSY_COLOR, borderRadius: '2px', marginRight: '.375rem' }} />Busy connections</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: FREE_COLOR, borderRadius: '2px', marginRight: '.375rem' }} />Free connections</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: WAIT_COLOR, borderRadius: '2px', marginRight: '.375rem' }} />Requests queued (waiting for a connection)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric
          label="Max connections waiting"
          value={sim.maxWaiting > 0.01 ? String(Math.ceil(sim.maxWaiting)) : '0'}
          color={sim.maxWaiting > 0.01 ? WAIT_COLOR : 'var(--k-text)'}
        />
        <Metric label="Pool utilization" value={`${sim.utilizationPct.toFixed(0)}%`} sublabel={`${sim.totalThroughput.toFixed(1)} req/s max throughput`} />
        <Metric
          label="Exhaustion events"
          value={`${sim.exhaustionEvents} / ${TICKS} ticks`}
          color={sim.exhaustionEvents > 0 ? BUSY_COLOR : 'var(--k-text)'}
          sublabel="ticks where every connection was busy"
        />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {isQueuing ? (
          <Warning level="danger" title="Requests are queuing for a connection — consider a bigger pool or shorter-lived connections">
            At peak, {Math.ceil(sim.maxWaiting)} request{Math.ceil(sim.maxWaiting) === 1 ? '' : 's'} sat waiting because all {poolSize} connections were checked out. Every incoming request holds a connection for ~{holdTimeMs}ms, so this pool can only push {sim.totalThroughput.toFixed(1)} req/s through — less than the {requestRate}/s arriving.
          </Warning>
        ) : (
          <Warning level="good" title="No queuing — this pool comfortably keeps up with the load">
            {poolSize} connections at ~{holdTimeMs}ms each can push {sim.totalThroughput.toFixed(1)} req/s, which covers the {requestRate}/s arriving with room to spare.
          </Warning>
        )}
      </div>
    </div>
  );
}
