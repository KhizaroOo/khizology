import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import PresetBar from '../shared/PresetBar';
import Insight from '../shared/Insight';
import ShareResultFoundation from '../ShareResultFoundation';
import { safeNumber, clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

const TICKS = 20;
const BUSY_COLOR = '#F7933C';
const FREE_COLOR = '#22c55e';
const WAIT_COLOR = '#ef4444';
const TIMEOUT_COLOR = '#b91c1c'; // same danger-red family as WAIT_COLOR, deliberately a darker shade + hatch fill
const GOOD_COLOR = '#22c55e';

const MAX_POOL_SEARCH = 500;
const TARGET_UTILIZATION_PCT = 70;

interface TickResult {
  busy: number;
  free: number;
  waiting: number;
  timedOut: number;
}

interface SimResult {
  ticks: TickResult[];
  totalThroughput: number;
  throughputPerConn: number;
  maxWaiting: number;
  maxTimedOut: number;
  totalTimedOut: number;
  utilizationPct: number;
  exhaustionEvents: number;
  totalServed: number;
  peakBusy: number;
}

interface PoolScenario {
  poolSize: number;
  requestRate: number;
  holdTimeMs: number;
  timeoutMs: number;
  burstDuration: number;
  burstRequestRate: number;
  instances: number;
  databaseMaxConnections: number;
  databaseHeadroom: number;
}

const SCENARIOS: { label: string; values: PoolScenario }[] = [
  { label: 'Normal load', values: { poolSize: 12, requestRate: 25, holdTimeMs: 100, timeoutMs: 3000, burstDuration: 0, burstRequestRate: 60, instances: 1, databaseMaxConnections: 100, databaseHeadroom: 20 } },
  { label: 'Traffic burst', values: { poolSize: 10, requestRate: 25, holdTimeMs: 100, timeoutMs: 1000, burstDuration: 7, burstRequestRate: 150, instances: 1, databaseMaxConnections: 100, databaseHeadroom: 20 } },
  { label: 'Slow queries', values: { poolSize: 10, requestRate: 25, holdTimeMs: 500, timeoutMs: 1500, burstDuration: 0, burstRequestRate: 60, instances: 1, databaseMaxConnections: 100, databaseHeadroom: 20 } },
  { label: 'Long-held connections', values: { poolSize: 10, requestRate: 18, holdTimeMs: 900, timeoutMs: 1200, burstDuration: 0, burstRequestRate: 60, instances: 1, databaseMaxConnections: 100, databaseHeadroom: 20 } },
  { label: 'Scale-out', values: { poolSize: 20, requestRate: 30, holdTimeMs: 150, timeoutMs: 3000, burstDuration: 0, burstRequestRate: 60, instances: 10, databaseMaxConnections: 180, databaseHeadroom: 30 } },
];

interface QueueBatch {
  amount: number;
  waitTicks: number;
}

/**
 * A simplified, fluid capacity model: connections are a shared, interchangeable pool
 * (not individually scheduled), and the request queue is tracked as batches of
 * "amount waiting this many ticks" rather than one clock per request.
 */
export function simulate(
  poolSizeRaw: number,
  requestRateRaw: number,
  holdTimeMsRaw: number,
  timeoutMsRaw: number,
  creationTimeMsRaw: number,
  burstDurationRaw: number,
  burstRequestRateRaw: number
): SimResult {
  const poolSize = Math.max(1, Math.round(safeNumber(poolSizeRaw, 1)));
  const requestRate = Math.max(0, safeNumber(requestRateRaw, 0));
  const holdTimeMs = Math.max(1, safeNumber(holdTimeMsRaw, 100));
  const timeoutMs = Math.max(1, safeNumber(timeoutMsRaw, 3000));
  const creationTimeMs = clamp(safeNumber(creationTimeMsRaw, 0), 0, 5000);
  const burstDuration = clamp(Math.round(safeNumber(burstDurationRaw, 0)), 0, TICKS);
  const burstRequestRate = Math.max(0, safeNumber(burstRequestRateRaw, requestRate));

  const throughputPerConn = safeDiv(1000, holdTimeMs, 0); // requests/sec one warmed-up connection can churn through
  const totalThroughput = poolSize * throughputPerConn;
  // Fraction of a 1-second tick a brand-new connection loses to spin-up before it can serve.
  const overheadFraction = clamp(safeDiv(creationTimeMs, 1000, 0), 0, 1);

  let queue: QueueBatch[] = [];
  let maxBusySoFar = 0;
  let totalTimedOut = 0;
  let totalServed = 0;
  const ticks: TickResult[] = [];

  for (let t = 0; t < TICKS; t++) {
    const arrivals = t < burstDuration ? burstRequestRate : requestRate;
    queue.push({ amount: arrivals, waitTicks: 0 });

    // Estimate this tick's demand to see how many connections beyond what's already
    // open would need to spin up — those pay the creation-time overhead.
    const queueDemand = queue.reduce((sum, b) => sum + b.amount, 0);
    const provisionalServed = Math.min(queueDemand, totalThroughput);
    const provisionalBusy = Math.min(poolSize, Math.ceil(safeDiv(provisionalServed, throughputPerConn, 0)));
    const newlyOpened = Math.max(0, provisionalBusy - maxBusySoFar);
    const lostThroughput = newlyOpened * throughputPerConn * overheadFraction;
    const adjustedThroughput = Math.max(0, totalThroughput - lostThroughput);

    let budget = adjustedThroughput;
    let served = 0;
    for (const batch of queue) {
      if (budget <= 0) break;
      const take = Math.min(batch.amount, budget);
      batch.amount -= take;
      budget -= take;
      served += take;
    }

    // Age what's left by one tick, dropping anything that's now waited past the timeout.
    const nextQueue: QueueBatch[] = [];
    let timedOutThisTick = 0;
    for (const batch of queue) {
      if (batch.amount <= 1e-9) continue;
      const agedWait = batch.waitTicks + 1;
      if (agedWait * 1000 >= timeoutMs) {
        timedOutThisTick += batch.amount;
      } else {
        nextQueue.push({ amount: batch.amount, waitTicks: agedWait });
      }
    }
    queue = nextQueue;
    totalTimedOut += timedOutThisTick;
    totalServed += served;

    const busy = Math.min(poolSize, Math.ceil(safeDiv(served, throughputPerConn, 0)));
    maxBusySoFar = Math.max(maxBusySoFar, busy);
    const free = poolSize - busy;
    const waiting = queue.reduce((sum, b) => sum + b.amount, 0);

    ticks.push({ busy, free, waiting, timedOut: timedOutThisTick });
  }

  const maxWaiting = Math.max(...ticks.map((t) => t.waiting), 0);
  const maxTimedOut = Math.max(...ticks.map((t) => t.timedOut), 0);
  const utilizationPct = (ticks.reduce((sum, t) => sum + safeDiv(t.busy, poolSize, 0), 0) / TICKS) * 100;
  const exhaustionEvents = ticks.filter((t) => t.busy === poolSize).length;

  return { ticks, totalThroughput, throughputPerConn, maxWaiting, maxTimedOut, totalTimedOut, utilizationPct, exhaustionEvents, totalServed, peakBusy: maxBusySoFar };
}

export function calculateConnectionBudget(instancesRaw: number, poolSizeRaw: number, maxConnectionsRaw: number, headroomRaw: number) {
  const instances = Math.max(1, Math.round(safeNumber(instancesRaw, 1)));
  const poolSize = Math.max(1, Math.round(safeNumber(poolSizeRaw, 1)));
  const maxConnections = Math.max(1, Math.round(safeNumber(maxConnectionsRaw, 1)));
  const headroom = clamp(Math.round(safeNumber(headroomRaw, 0)), 0, maxConnections);
  const potentialAppConnections = instances * poolSize;
  const availableBudget = Math.max(0, maxConnections - headroom);
  return { instances, poolSize, maxConnections, headroom, potentialAppConnections, availableBudget, remainingBudget: availableBudget - potentialAppConnections, exceedsBudget: potentialAppConnections > availableBudget };
}

/** Smallest pool size that keeps steady-state utilization at or below the target, given only rate + hold time. */
function findRecommendedPoolSize(requestRate: number, holdTimeMs: number): number {
  const throughputPerConn = safeDiv(1000, Math.max(1, holdTimeMs), 0);
  if (throughputPerConn <= 0) return MAX_POOL_SEARCH;
  for (let n = 1; n <= MAX_POOL_SEARCH; n++) {
    const utilizationPct = safeDiv(requestRate, n * throughputPerConn, 0) * 100;
    if (utilizationPct <= TARGET_UTILIZATION_PCT) return n;
  }
  return MAX_POOL_SEARCH;
}

export default function ConnectionPoolSimulator() {
  const [poolSize, setPoolSize] = useState(10);
  const [requestRate, setRequestRate] = useState(25);
  const [holdTimeMs, setHoldTimeMs] = useState(100);
  const [timeoutMs, setTimeoutMs] = useState(3000);
  const [creationTimeMs, setCreationTimeMs] = useState('0');
  const [burstDuration, setBurstDuration] = useState(0);
  const [burstRequestRate, setBurstRequestRate] = useState(60);
  const [instances, setInstances] = useState(1);
  const [databaseMaxConnections, setDatabaseMaxConnections] = useState(100);
  const [databaseHeadroom, setDatabaseHeadroom] = useState(20);
  const [alternativePoolSize, setAlternativePoolSize] = useState(20);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const creationTimeMsNum = clamp(safeNumber(creationTimeMs, 0), 0, 5000);

  const sim = useMemo(
    () => simulate(poolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate),
    [poolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate]
  );

  const recommendedPoolSize = useMemo(() => findRecommendedPoolSize(requestRate, holdTimeMs), [requestRate, holdTimeMs]);
  const alternativeSim = useMemo(
    () => simulate(alternativePoolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate),
    [alternativePoolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate]
  );
  const budget = useMemo(() => calculateConnectionBudget(instances, poolSize, databaseMaxConnections, databaseHeadroom), [instances, poolSize, databaseMaxConnections, databaseHeadroom]);
  const alternativeBudget = useMemo(() => calculateConnectionBudget(instances, alternativePoolSize, databaseMaxConnections, databaseHeadroom), [instances, alternativePoolSize, databaseMaxConnections, databaseHeadroom]);
  const applyScenario = (values: PoolScenario, label: string) => {
    setPoolSize(values.poolSize); setRequestRate(values.requestRate); setHoldTimeMs(values.holdTimeMs); setTimeoutMs(values.timeoutMs);
    setBurstDuration(values.burstDuration); setBurstRequestRate(values.burstRequestRate); setInstances(values.instances);
    setDatabaseMaxConnections(values.databaseMaxConnections); setDatabaseHeadroom(values.databaseHeadroom); setAlternativePoolSize(Math.min(50, values.poolSize * 2)); setActiveScenario(label);
  };

  // chart geometry — the original busy/free/waiting bars and their scale are unchanged;
  // topPad just grows to make room for a second lane (timed-out) stacked above waiting.
  const chartW = 640;
  const chartH = 180;
  const WAIT_LANE_CAP = 40;
  const TIMEOUT_LANE_CAP = 34;
  const LANE_GAP = 10;
  const topPad = 28 + TIMEOUT_LANE_CAP + LANE_GAP + WAIT_LANE_CAP; // = 112
  const bottomPad = 22;
  const gap = 3;
  const barW = (chartW - gap * (TICKS - 1)) / TICKS;
  const unit = chartH / poolSize;
  const waitingScale = sim.maxWaiting > 0 ? 34 / sim.maxWaiting : 0;
  const timedOutScale = sim.maxTimedOut > 0 ? 28 / sim.maxTimedOut : 0;
  const peakIndex = sim.ticks.reduce((best, t, i) => (t.waiting > sim.ticks[best].waiting ? i : best), 0);
  const peakTimedOutIndex = sim.ticks.reduce((best, t, i) => (t.timedOut > sim.ticks[best].timedOut ? i : best), 0);
  const baselineY = topPad + chartH;
  const poolTopY = topPad;
  const waitLaneCeilingY = poolTopY - WAIT_LANE_CAP; // top edge of the waiting lane
  const timeoutLaneBaseY = waitLaneCeilingY - LANE_GAP; // bottom edge of the timed-out lane, sits just above waiting
  const isQueuing = sim.maxWaiting > 0.01;
  const hasTimeouts = sim.totalTimedOut > 0.01;
  const isAtRisk = isQueuing || hasTimeouts;
  const peakTick = sim.ticks.reduce((peak, tick) => tick.busy > peak.busy ? tick : peak, sim.ticks[0]);
  const displayedSlots = Math.min(poolSize, 24);
  const likelyCause = instances > 1 && budget.exceedsBudget ? 'Scale-out pressure' : holdTimeMs >= 500 ? 'Long hold time' : burstDuration > 0 ? 'Traffic pressure' : isAtRisk ? 'Pool limit for this simplified workload' : 'No simulated pressure';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>POOL PRESSURE LAB</div>
      <PresetBar presets={SCENARIOS} activeLabel={activeScenario} onSelect={applyScenario} accent="#F7933C" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Pool size (max connections)" value={poolSize} onChange={setPoolSize} min={2} max={50} accent="#F7933C" />
        <RangeControl label="Incoming request rate" value={requestRate} onChange={setRequestRate} min={1} max={100} formatValue={(v) => `${v}/s`} accent="#F7933C" />
        <RangeControl label="Avg. connection hold time" value={holdTimeMs} onChange={setHoldTimeMs} min={10} max={1000} step={10} formatValue={(v) => `${v}ms`} accent="#F7933C" />
      </div>

      <AdvancedDisclosure summary="Timeouts, connection warm-up & burst traffic">
        <RangeControl
          label="Connection timeout"
          value={timeoutMs}
          onChange={setTimeoutMs}
          min={100}
          max={5000}
          step={100}
          formatValue={(v) => `${v}ms`}
          accent={TIMEOUT_COLOR}
        />
        <InputField
          label="Connection creation time"
          type="number"
          step="10"
          min="0"
          suffix="ms"
          value={creationTimeMs}
          onChange={setCreationTimeMs}
          placeholder="0 = instant"
        />
        <RangeControl
          label="Burst duration"
          value={burstDuration}
          onChange={setBurstDuration}
          min={0}
          max={TICKS}
          formatValue={(v) => (v === 0 ? 'off' : `${v} ticks`)}
          accent="#6CA6FF"
        />
        <RangeControl
          label="Burst request rate"
          value={burstRequestRate}
          onChange={setBurstRequestRate}
          min={1}
          max={300}
          formatValue={(v) => `${v}/s`}
          accent="#6CA6FF"
        />
        <RangeControl label="App instances" value={instances} onChange={setInstances} min={1} max={20} formatValue={(v) => `${v} instance${v === 1 ? '' : 's'}`} accent="#DF78A0" />
        <RangeControl label="Database max connections" value={databaseMaxConnections} onChange={setDatabaseMaxConnections} min={20} max={500} step={10} accent="#DF78A0" />
        <RangeControl label="Database headroom" value={databaseHeadroom} onChange={setDatabaseHeadroom} min={0} max={Math.max(0, databaseMaxConnections - 1)} step={5} accent="#DF78A0" />
        <RangeControl label="Alternative pool size" value={alternativePoolSize} onChange={setAlternativePoolSize} min={2} max={50} accent="#6CA6FF" />
      </AdvancedDisclosure>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(160px, .65fr)', gap: '1rem', alignItems: 'center', margin: '1.1rem 0', padding: '1rem', background: 'var(--k-bg-elevated)', borderRadius: '.75rem', border: '1px solid var(--k-border)' }}>
        <div>
          <div style={{ font: '800 .7rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.55rem' }}>PEAK POOL STATE · BUSY EXECUTES; WAITING DOES NOT</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }} aria-label={`${peakTick.busy} busy and ${peakTick.free} idle connections at the busiest modeled moment`}>
            {Array.from({ length: displayedSlots }, (_, index) => <span key={index} style={{ minWidth: '32px', padding: '.25rem .35rem', textAlign: 'center', borderRadius: '.35rem', fontSize: '.62rem', fontWeight: 800, background: index < peakTick.busy ? BUSY_COLOR : FREE_COLOR, color: '#111827' }}>{index < peakTick.busy ? 'BUSY' : 'IDLE'}</span>)}
            {poolSize > displayedSlots && <span style={{ fontSize: '.75rem', color: 'var(--k-text-muted)', alignSelf: 'center' }}>+{poolSize - displayedSlots} slots</span>}
          </div>
        </div>
        <div aria-label={`${Math.ceil(sim.maxWaiting)} waiting requests and ${Math.ceil(sim.totalTimedOut)} pool acquisition timeouts`}>
          <div style={{ font: '800 .7rem Poppins, sans-serif', color: WAIT_COLOR }}>WAITING ○ {Math.ceil(sim.maxWaiting)}</div>
          <div style={{ font: '800 .7rem Poppins, sans-serif', color: TIMEOUT_COLOR, marginTop: '.35rem' }}>POOL ACQUISITION TIMEOUT × {Math.ceil(sim.totalTimedOut)}</div>
        </div>
      </div>

      <VisualizationContainer minHeight={300}>
        <svg
          viewBox={`0 0 ${chartW} ${topPad + chartH + bottomPad}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label={`Busy, free, waiting and timed-out connections per second across a 20-second simulation${
            burstDuration > 0 ? `, with a burst for the first ${burstDuration} seconds` : ''
          }`}
        >
          <defs>
            <pattern id="poolTimeoutHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={TIMEOUT_COLOR} />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2" opacity={0.35} />
            </pattern>
          </defs>

          {sim.ticks.map((tick, i) => {
            const x = i * (barW + gap);
            const busyH = tick.busy * unit;
            const freeH = tick.free * unit;
            const waitH = Math.min(tick.waiting * waitingScale, WAIT_LANE_CAP);
            const toH = Math.min(tick.timedOut * timedOutScale, TIMEOUT_LANE_CAP);
            return (
              <g key={i}>
                {toH > 0 && (
                  <rect x={x} y={timeoutLaneBaseY - toH} width={barW} height={toH} fill="url(#poolTimeoutHatch)" rx={1} />
                )}
                {waitH > 0 && (
                  <rect x={x} y={poolTopY - waitH} width={barW} height={waitH} fill={WAIT_COLOR} opacity={0.85} rx={1} />
                )}
                <rect x={x} y={poolTopY} width={barW} height={freeH} fill={FREE_COLOR} />
                <rect x={x} y={baselineY - busyH} width={barW} height={busyH} fill={BUSY_COLOR} />
                <title>{`t=${i + 1}s — busy ${tick.busy}, free ${tick.free}, waiting ${Math.ceil(tick.waiting)}, timed out ${Math.ceil(tick.timedOut)}`}</title>
              </g>
            );
          })}

          {sim.maxWaiting > 0.01 && (
            <text
              x={peakIndex * (barW + gap) + barW / 2}
              y={Math.max(timeoutLaneBaseY + 12, poolTopY - Math.min(sim.ticks[peakIndex].waiting * waitingScale, WAIT_LANE_CAP) - 6)}
              fontSize={9}
              fontWeight={700}
              fill={WAIT_COLOR}
              textAnchor="middle"
              fontFamily="'Poppins', sans-serif"
            >
              {Math.ceil(sim.maxWaiting)} waiting
            </text>
          )}

          {sim.maxTimedOut > 0.01 && (
            <text
              x={peakTimedOutIndex * (barW + gap) + barW / 2}
              y={Math.max(12, timeoutLaneBaseY - Math.min(sim.ticks[peakTimedOutIndex].timedOut * timedOutScale, TIMEOUT_LANE_CAP) - 6)}
              fontSize={9}
              fontWeight={700}
              fill={TIMEOUT_COLOR}
              textAnchor="middle"
              fontFamily="'Poppins', sans-serif"
            >
              {Math.ceil(sim.maxTimedOut)} timed out
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
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: TIMEOUT_COLOR, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 2px, transparent 2px 4px)', borderRadius: '2px', marginRight: '.375rem' }} />Requests timed out (waited too long, dropped)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric
          label="Max connections waiting"
          value={sim.maxWaiting > 0.01 ? String(Math.ceil(sim.maxWaiting)) : '0'}
          color={sim.maxWaiting > 0.01 ? WAIT_COLOR : 'var(--k-text)'}
        />
        <Metric
          label="Requests timed out"
          value={hasTimeouts ? formatNumber(Math.ceil(sim.totalTimedOut)) : '0'}
          color={hasTimeouts ? TIMEOUT_COLOR : 'var(--k-text)'}
          sublabel="dropped after exceeding the timeout, total over 20s"
        />
        <Metric
          label="Pool utilization"
          value={`${sim.utilizationPct.toFixed(0)}%`}
          sublabel={`${sim.totalThroughput.toFixed(1)} req/s max throughput`}
        />
        <Metric label="Peak busy connections" value={`${sim.peakBusy} / ${poolSize}`} sublabel="at the busiest modeled moment" />
        <Metric label="Requests served" value={formatNumber(Math.floor(sim.totalServed))} sublabel="within the bounded 20-second model" />
        <Metric
          label="Recommended pool size"
          value={String(recommendedPoolSize)}
          color={poolSize < recommendedPoolSize ? BUSY_COLOR : GOOD_COLOR}
          sublabel={`to hold utilization ≤${TARGET_UTILIZATION_PCT}% at ${requestRate}/s & ${holdTimeMs}ms`}
        />
        <Metric
          label="Exhaustion events"
          value={`${sim.exhaustionEvents} / ${TICKS} ticks`}
          color={sim.exhaustionEvents > 0 ? BUSY_COLOR : 'var(--k-text)'}
          sublabel="ticks where every connection was busy"
        />
      </div>

      <div style={{ marginTop: '1.25rem', padding: '1rem', border: `1.5px solid ${budget.exceedsBudget ? TIMEOUT_COLOR : 'var(--k-border)'}`, borderRadius: '.75rem', background: 'var(--k-bg-elevated)' }} aria-label={`Database connection budget: ${budget.potentialAppConnections} potential application connections, ${budget.headroom} reserved headroom, and ${budget.availableBudget} available connection budget`}>
        <div style={{ font: '800 .72rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)' }}>DATABASE CONNECTION BUDGET</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.75rem', marginTop: '.75rem' }}>
          <Metric label="Potential app connections" value={`${budget.instances} × ${budget.poolSize} = ${budget.potentialAppConnections}`} sublabel="potential capacity, not actual open connections" />
          <Metric label="Database budget" value={`${budget.availableBudget} available`} sublabel={`${budget.maxConnections} max − ${budget.headroom} reserved headroom`} />
          <Metric label="Budget remaining" value={String(budget.remainingBudget)} color={budget.exceedsBudget ? TIMEOUT_COLOR : GOOD_COLOR} sublabel={budget.exceedsBudget ? 'potential pool exposure exceeds the selected budget' : 'before the selected app-pool potential reaches budget'} />
        </div>
        <div style={{ display: 'flex', height: '14px', marginTop: '.85rem', overflow: 'hidden', borderRadius: '999px', background: 'var(--k-bg-card)' }} aria-hidden="true">
          <span style={{ width: `${Math.min(100, safeDiv(budget.potentialAppConnections, budget.maxConnections, 0) * 100)}%`, background: budget.exceedsBudget ? TIMEOUT_COLOR : BUSY_COLOR }} />
          <span style={{ width: `${Math.min(100, safeDiv(budget.headroom, budget.maxConnections, 0) * 100)}%`, background: '#6CA6FF' }} />
        </div>
        <p style={{ margin: '.65rem 0 0', fontSize: '.78rem', color: 'var(--k-text-muted)', lineHeight: 1.5 }}>More pool connections increase possible concurrent database work. Whether that helps or hurts depends on the database workload; this simulator does not model database CPU or query execution capacity.</p>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--k-border)', borderRadius: '.75rem' }}>
        <div style={{ font: '800 .72rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)' }}>CURRENT POOL VS ALTERNATIVE</div>
        <p style={{ margin: '.45rem 0 0', fontSize: '.85rem', color: 'var(--k-text)' }}><strong>{poolSize} slots:</strong> {Math.ceil(sim.maxWaiting)} peak waiters / {Math.ceil(sim.totalTimedOut)} acquisition timeouts. <strong>{alternativePoolSize} slots:</strong> {Math.ceil(alternativeSim.maxWaiting)} peak waiters / {Math.ceil(alternativeSim.totalTimedOut)} timeouts.</p>
        <p style={{ margin: '.35rem 0 0', fontSize: '.78rem', color: alternativeBudget.exceedsBudget ? TIMEOUT_COLOR : 'var(--k-text-muted)' }}>Alternative exposure: {alternativeBudget.potentialAppConnections} potential app connections against {alternativeBudget.availableBudget} available database connections.</p>
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '1rem 0 0', lineHeight: 1.5 }}>
        Simplified capacity model: connections are treated as one interchangeable, shared pool rather than scheduled individually, so treat these numbers as directional, not exact.
      </p>

      <div style={{ marginTop: '1.25rem' }}>
        {isAtRisk ? (
          <Warning level="danger" title="Requests are queuing for a pooled connection">
            At peak, {Math.ceil(sim.maxWaiting)} request{Math.ceil(sim.maxWaiting) === 1 ? '' : 's'} sat waiting because all {poolSize} connections were checked out. Every incoming request holds a connection for ~{holdTimeMs}ms, so this pool can only push {sim.totalThroughput.toFixed(1)} req/s through — less than the {requestRate}/s arriving
            {burstDuration > 0 ? ` (${burstRequestRate}/s during the burst)` : ''}.
            {hasTimeouts && (
              <> {formatNumber(Math.ceil(sim.totalTimedOut))} of those requests waited past the {timeoutMs}ms timeout and were dropped rather than served.</>
            )}
          </Warning>
        ) : (
          <Warning level="good" title="No queuing — this pool comfortably keeps up with the load">
            {poolSize} connections at ~{holdTimeMs}ms each can push {sim.totalThroughput.toFixed(1)} req/s, which covers the {requestRate}/s arriving with room to spare.
          </Warning>
        )}
      </div>
      <div style={{ marginTop: '1rem' }}><Insight what={isAtRisk ? `The pool saturated for ${sim.exhaustionEvents} of ${TICKS} ticks. ${Math.ceil(sim.maxWaiting)} callers waited for a connection and ${Math.ceil(sim.totalTimedOut)} reached the pool acquisition timeout.` : 'The selected pool stayed below saturation for this bounded workload, so callers did not queue for a connection.'} why={`${likelyCause} is the simulated pressure lens. A waiting caller has not started database work, and a pool acquisition timeout is distinct from a query timeout.`} tip={budget.exceedsBudget ? `Scaling ${budget.instances} instances with ${poolSize} slots creates ${budget.potentialAppConnections} potential application connections, above the ${budget.availableBudget} selected database budget. Review the budget before increasing the pool.` : holdTimeMs >= 500 ? 'Reduce query or transaction hold time and check disposal before increasing pool size. A long-held connection does not itself prove a leak.' : isAtRisk ? 'Test whether a modest pool increase removes burst waiting without consuming database headroom; do not treat a larger pool as a universal fix.' : 'Keep headroom for operations and other workloads. Test bursts and scale-out before changing a pool setting.'} /></div>
      <ShareResultFoundation monster="toolooo" contentType="tool" slug="connection-pool-simulator" title="Connection Pool Simulator" result={{ summary: `Educational pool model: ${poolSize} slots, ${sim.utilizationPct.toFixed(0)}% utilization, ${Math.ceil(sim.maxWaiting)} peak waiters, ${Math.ceil(sim.totalTimedOut)} pool acquisition timeouts, ${budget.instances} instance(s), and ${budget.potentialAppConnections} potential database connections.` }} />
    </div>
  );
}
