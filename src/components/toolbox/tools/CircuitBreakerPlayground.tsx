import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

const REQUEST_COUNT = 60;
// "Recovered" isn't literally 0% in the real world -- a healthy dependency still has a
// small baseline error rate, which is also why a fully-closed circuit can still see the
// odd single failure and briefly reopen even after the outage is over.
const RECOVERED_FAILURE_RATE_PCT = 2;

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

function simulate(
  failureRatePct: number,
  threshold: number,
  resetTimeout: number,
  probeCount: number,
  recoverAt: number
) {
  const results: RequestResult[] = [];
  let state: CircuitState = 'closed';
  let consecutiveFailures = 0;
  let halfOpenSuccesses = 0;
  let openedAt = -1;
  let transitions = 0;
  // First request index (at or after recoverAt) where the breaker actually finished
  // trusting the dependency again -- lets the UI show detection lag, not just the outcome.
  let recoveryDetectedAt: number | null = null;

  const safeProbeCount = clamp(Math.round(probeCount), 1, 5);
  const safeRecoverAt = clamp(Math.round(recoverAt), 0, REQUEST_COUNT);
  const recoveryActive = safeRecoverAt > 0;

  for (let i = 0; i < REQUEST_COUNT; i++) {
    if (state === 'open') {
      if (i - openedAt >= resetTimeout) {
        state = 'half-open';
        halfOpenSuccesses = 0;
        transitions++;
      } else {
        results.push({ outcome: 'rejected', state });
        continue;
      }
    }

    const effectiveFailureRatePct = recoveryActive && i >= safeRecoverAt ? RECOVERED_FAILURE_RATE_PCT : failureRatePct;
    const willFail = seededRandom(i) < effectiveFailureRatePct / 100;

    if (state === 'half-open') {
      if (willFail) {
        // Any single failed probe reopens the circuit immediately, no matter how many
        // consecutive successes it had already collected.
        state = 'open';
        openedAt = i;
        consecutiveFailures = 0;
        halfOpenSuccesses = 0;
        transitions++;
        results.push({ outcome: 'failure', state: 'half-open' });
      } else {
        halfOpenSuccesses++;
        results.push({ outcome: 'success', state: 'half-open' });
        if (halfOpenSuccesses >= safeProbeCount) {
          state = 'closed';
          consecutiveFailures = 0;
          halfOpenSuccesses = 0;
          transitions++;
          if (recoveryActive && recoveryDetectedAt === null && i >= safeRecoverAt) {
            recoveryDetectedAt = i;
          }
        }
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

  return {
    results,
    rejected,
    failed,
    succeeded,
    transitions,
    finalState: state,
    recoveryDetectedAt,
    safeProbeCount,
    safeRecoverAt,
  };
}

const STATE_COLORS: Record<CircuitState, string> = { closed: '#22c55e', open: '#ef4444', 'half-open': '#F7933C' };
const OUTCOME_COLORS: Record<Outcome, string> = { success: '#22c55e', failure: '#ef4444', rejected: '#9ca3af' };

export default function CircuitBreakerPlayground() {
  const [failureRate, setFailureRate] = useState(60);
  const [threshold, setThreshold] = useState(3);
  const [resetTimeout, setResetTimeout] = useState(5);
  const [probeCount, setProbeCount] = useState(1);
  const [recoverAt, setRecoverAt] = useState(0);

  const sim = useMemo(
    () => simulate(failureRate, threshold, resetTimeout, probeCount, recoverAt),
    [failureRate, threshold, resetTimeout, probeCount, recoverAt]
  );

  const { safeProbeCount, safeRecoverAt } = sim;
  const recoveryActive = safeRecoverAt > 0 && safeRecoverAt < REQUEST_COUNT;

  // Split the run at the recovery point so the effect (when set) is legible in the
  // numbers, not just visible in the strip chart.
  const outageResults = recoveryActive ? sim.results.slice(0, safeRecoverAt) : sim.results;
  const recoveryResults = recoveryActive ? sim.results.slice(safeRecoverAt) : [];
  const outageSuccessPct = safeDiv(outageResults.filter((r) => r.outcome === 'success').length, outageResults.length, 0) * 100;
  const recoverySuccessPct = safeDiv(recoveryResults.filter((r) => r.outcome === 'success').length, recoveryResults.length, 0) * 100;
  const recoveryGap = sim.recoveryDetectedAt !== null ? sim.recoveryDetectedAt - safeRecoverAt : null;

  const cellW = 9;
  const cellGap = 2;
  const chartW = REQUEST_COUNT * (cellW + cellGap);
  const barH = 30;
  const probeStripY = 33;
  const probeStripH = 5;
  const chartH = 40;
  const recoveryLineX = recoveryActive ? safeRecoverAt * (cellW + cellGap) - cellGap / 2 : 0;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Dependency failure rate" value={failureRate} onChange={setFailureRate} min={0} max={100} step={5} formatValue={(v) => `${v}%`} accent="#ef4444" />
        <RangeControl label="Trip threshold" value={threshold} onChange={setThreshold} min={1} max={10} formatValue={(v) => `${v} in a row`} accent="#ef4444" />
        <RangeControl label="Reset timeout" value={resetTimeout} onChange={setResetTimeout} min={1} max={15} formatValue={(v) => `${v} req`} accent="#ef4444" />
      </div>

      <AdvancedDisclosure summary="Advanced: half-open probes & timed recovery">
        <RangeControl
          label="Half-open probe count"
          value={probeCount}
          onChange={setProbeCount}
          min={1}
          max={5}
          formatValue={(v) => (v === 1 ? '1 probe' : `${v} probes`)}
          accent="#F7933C"
        />
        <RangeControl
          label="Dependency recovers at request #"
          value={recoverAt}
          onChange={setRecoverAt}
          min={0}
          max={REQUEST_COUNT}
          formatValue={(v) => (v === 0 ? 'Off (random)' : `#${v}`)}
          accent="#6CA6FF"
        />
      </AdvancedDisclosure>

      <VisualizationContainer minHeight={140}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label={`Each request over time, colored by outcome: success, failure, or fast-rejected while the circuit is open. A small mark under a cell means that request was a half-open probe.${recoveryActive ? ` A dashed line marks request #${safeRecoverAt}, where the dependency becomes healthy.` : ''}`}
        >
          {recoveryActive && (
            <line x1={recoveryLineX} x2={recoveryLineX} y1={0} y2={chartH} stroke="#6CA6FF" strokeDasharray="3 3" strokeWidth={1.5} />
          )}
          {sim.results.map((r, i) => (
            <g key={i}>
              <rect
                x={i * (cellW + cellGap)}
                y={0}
                width={cellW}
                height={barH}
                rx={2}
                fill={OUTCOME_COLORS[r.outcome]}
                opacity={r.outcome === 'rejected' ? 0.5 : 1}
              />
              {r.state === 'half-open' && (
                <rect x={i * (cellW + cellGap)} y={probeStripY} width={cellW} height={probeStripH} rx={1} fill="#F7933C" />
              )}
            </g>
          ))}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.success, borderRadius: '2px', marginRight: '.375rem' }} />Success</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.failure, borderRadius: '2px', marginRight: '.375rem' }} />Failure</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.rejected, opacity: 0.5, borderRadius: '2px', marginRight: '.375rem' }} />Fast-rejected (circuit open)</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '4px', background: '#F7933C', borderRadius: '1px', marginRight: '.375rem', verticalAlign: 'middle' }} />Half-open probe</span>
        {recoveryActive && (
          <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1.5px dashed #6CA6FF', marginRight: '.375rem', verticalAlign: 'middle' }} />Dependency recovers</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Current state" value={sim.finalState === 'half-open' ? 'Half-Open' : sim.finalState[0].toUpperCase() + sim.finalState.slice(1)} color={STATE_COLORS[sim.finalState]} />
        <Metric label="Requests fast-rejected" value={String(sim.rejected)} sublabel="never touched the dependency" />
        <Metric label="State transitions" value={String(sim.transitions)} />
        {recoveryActive && (
          <Metric
            label="Success rate: outage → recovery"
            value={`${formatNumber(outageSuccessPct)}% → ${formatNumber(recoverySuccessPct)}%`}
            sublabel={`before vs. after request #${safeRecoverAt}`}
            color={recoverySuccessPct > outageSuccessPct ? '#22c55e' : undefined}
          />
        )}
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '1rem 0 0', lineHeight: 1.5 }}>
        A simplified model: {safeProbeCount === 1 ? 'one healthy probe closes the circuit again' : `${safeProbeCount} consecutive healthy probes are required to close the circuit again`}, and any single failed probe reopens it instantly.
      </p>

      <div style={{ marginTop: '1.25rem' }}>
        {sim.rejected > 0 ? (
          <Warning level="good" title={`${sim.rejected} requests were saved from hitting a broken dependency`}>
            Once the circuit tripped open, those requests failed instantly instead of waiting on a dependency that was already failing — protecting your own service's latency and thread/connection pool.
            {recoveryActive && recoveryGap !== null && recoveryGap > 0 && (
              <> The circuit fully closed again {recoveryGap} request{recoveryGap === 1 ? '' : 's'} after the dependency actually recovered at #{safeRecoverAt} — that lag is the reset timeout plus the {safeProbeCount} healthy probe{safeProbeCount === 1 ? '' : 's'} it required before trusting the dependency again.</>
            )}
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
