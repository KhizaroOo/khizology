import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const REQUEST_COUNT = 60;

function seededRandom(i: number): number {
  const x = Math.sin(i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Outcome = 'success' | 'failure' | 'rejected';
type CircuitState = 'closed' | 'open' | 'half-open';

interface RequestResult {
  outcome: Outcome;
  state: CircuitState;
}

function simulate(failureRatePct: number, threshold: number, resetTimeout: number) {
  const results: RequestResult[] = [];
  let state: CircuitState = 'closed';
  let consecutiveFailures = 0;
  let openedAt = -1;
  let transitions = 0;

  for (let i = 0; i < REQUEST_COUNT; i++) {
    if (state === 'open') {
      if (i - openedAt >= resetTimeout) {
        state = 'half-open';
        transitions++;
      } else {
        results.push({ outcome: 'rejected', state });
        continue;
      }
    }

    const willFail = seededRandom(i) < failureRatePct / 100;

    if (state === 'half-open') {
      if (willFail) {
        state = 'open';
        openedAt = i;
        consecutiveFailures = 0;
        transitions++;
        results.push({ outcome: 'failure', state: 'half-open' });
      } else {
        state = 'closed';
        consecutiveFailures = 0;
        transitions++;
        results.push({ outcome: 'success', state: 'half-open' });
      }
      continue;
    }

    // closed
    if (willFail) {
      consecutiveFailures++;
      results.push({ outcome: 'failure', state: 'closed' });
      if (consecutiveFailures >= threshold) {
        state = 'open';
        openedAt = i;
        transitions++;
      }
    } else {
      consecutiveFailures = 0;
      results.push({ outcome: 'success', state: 'closed' });
    }
  }

  const rejected = results.filter((r) => r.outcome === 'rejected').length;
  const failed = results.filter((r) => r.outcome === 'failure').length;
  const succeeded = results.filter((r) => r.outcome === 'success').length;

  return { results, rejected, failed, succeeded, transitions, finalState: state };
}

const STATE_COLORS: Record<CircuitState, string> = { closed: '#22c55e', open: '#ef4444', 'half-open': '#F7933C' };
const OUTCOME_COLORS: Record<Outcome, string> = { success: '#22c55e', failure: '#ef4444', rejected: '#9ca3af' };

export default function CircuitBreakerPlayground() {
  const [failureRate, setFailureRate] = useState(60);
  const [threshold, setThreshold] = useState(3);
  const [resetTimeout, setResetTimeout] = useState(5);

  const sim = useMemo(() => simulate(failureRate, threshold, resetTimeout), [failureRate, threshold, resetTimeout]);

  const cellW = 9;
  const cellGap = 2;
  const chartW = REQUEST_COUNT * (cellW + cellGap);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Dependency failure rate" value={failureRate} onChange={setFailureRate} min={0} max={100} step={5} formatValue={(v) => `${v}%`} accent="#ef4444" />
        <RangeControl label="Trip threshold" value={threshold} onChange={setThreshold} min={1} max={10} formatValue={(v) => `${v} in a row`} accent="#ef4444" />
        <RangeControl label="Reset timeout" value={resetTimeout} onChange={setResetTimeout} min={1} max={15} formatValue={(v) => `${v} req`} accent="#ef4444" />
      </div>

      <VisualizationContainer minHeight={140}>
        <svg viewBox={`0 0 ${chartW} 50`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Each request over time, colored by outcome: success, failure, or fast-rejected while the circuit is open">
          {sim.results.map((r, i) => (
            <rect
              key={i}
              x={i * (cellW + cellGap)}
              y={0}
              width={cellW}
              height={30}
              rx={2}
              fill={OUTCOME_COLORS[r.outcome]}
              opacity={r.outcome === 'rejected' ? 0.5 : 1}
            />
          ))}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.success, borderRadius: '2px', marginRight: '.375rem' }} />Success</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.failure, borderRadius: '2px', marginRight: '.375rem' }} />Failure</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.rejected, opacity: 0.5, borderRadius: '2px', marginRight: '.375rem' }} />Fast-rejected (circuit open)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Current state" value={sim.finalState === 'half-open' ? 'Half-Open' : sim.finalState[0].toUpperCase() + sim.finalState.slice(1)} color={STATE_COLORS[sim.finalState]} />
        <Metric label="Requests fast-rejected" value={String(sim.rejected)} sublabel="never touched the dependency" />
        <Metric label="State transitions" value={String(sim.transitions)} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {sim.rejected > 0 ? (
          <Warning level="good" title={`${sim.rejected} requests were saved from hitting a broken dependency`}>
            Once the circuit tripped open, those requests failed instantly instead of waiting on a dependency that was already failing — protecting your own service's latency and thread/connection pool.
          </Warning>
        ) : (
          <Warning level="info" title="The circuit never tripped at this failure rate and threshold">
            Try raising the failure rate or lowering the trip threshold to see it open.
          </Warning>
        )}
      </div>
    </div>
  );
}
