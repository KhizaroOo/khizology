import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
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
}

interface QueueBatch {
  amount: number;
  waitTicks: number;
}

/**
 * A simplified, fluid capacity model: connections are a shared, interchangeable pool
 * (not individually scheduled), and the request queue is tracked as batches of
 * "amount waiting this many ticks" rather than one clock per request.
 */
function simulate(
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

  return { ticks, totalThroughput, throughputPerConn, maxWaiting, maxTimedOut, totalTimedOut, utilizationPct, exhaustionEvents };
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

  const creationTimeMsNum = clamp(safeNumber(creationTimeMs, 0), 0, 5000);

  const sim = useMemo(
    () => simulate(poolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate),
    [poolSize, requestRate, holdTimeMs, timeoutMs, creationTimeMsNum, burstDuration, burstRequestRate]
  );

  const recommendedPoolSize = useMemo(() => findRecommendedPoolSize(requestRate, holdTimeMs), [requestRate, holdTimeMs]);

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

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
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
      </AdvancedDisclosure>

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

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '1rem 0 0', lineHeight: 1.5 }}>
        Simplified capacity model: connections are treated as one interchangeable, shared pool rather than scheduled individually, so treat these numbers as directional, not exact.
      </p>

      <div style={{ marginTop: '1.25rem' }}>
        {isAtRisk ? (
          <Warning level="danger" title="Requests are queuing for a connection — consider a bigger pool or shorter-lived connections">
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
    </div>
  );
}
