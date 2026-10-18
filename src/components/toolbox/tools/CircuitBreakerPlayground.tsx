import { useMemo, useState } from 'react';
import './capacity-ux.css';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import PresetBar from '../shared/PresetBar';
import Insight from '../shared/Insight';
import ShareResultFoundation from '../ShareResultFoundation';
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

interface CircuitScenario { failureRate: number; threshold: number; resetTimeout: number; probeCount: number; recoverAt: number; }
interface CircuitPolicy { threshold: number; resetTimeout: number; probeCount: number; }
const SCENARIOS: { label: string; values: CircuitScenario }[] = [
  { label: 'Healthy dependency', values: { failureRate: 5, threshold: 3, resetTimeout: 5, probeCount: 1, recoverAt: 0 } },
  { label: 'Intermittent failures', values: { failureRate: 35, threshold: 4, resetTimeout: 5, probeCount: 1, recoverAt: 0 } },
  { label: 'Full outage', values: { failureRate: 100, threshold: 3, resetTimeout: 6, probeCount: 1, recoverAt: 0 } },
  { label: 'Slow dependency', values: { failureRate: 65, threshold: 5, resetTimeout: 8, probeCount: 2, recoverAt: 0 } },
  { label: 'Recovering dependency', values: { failureRate: 100, threshold: 3, resetTimeout: 5, probeCount: 1, recoverAt: 24 } },
];
const POLICIES: { label: string; values: CircuitPolicy }[] = [
  { label: 'Current policy', values: { threshold: 3, resetTimeout: 5, probeCount: 1 } },
  { label: 'Protects quickly', values: { threshold: 2, resetTimeout: 4, probeCount: 1 } },
  { label: 'Tolerates more failures', values: { threshold: 6, resetTimeout: 8, probeCount: 2 } },
];

export function simulate(
  failureRatePct: number,
  threshold: number,
  resetTimeout: number,
  probeCount: number,
  recoverAt: number,
  breakerEnabled = true
) {
  const results: RequestResult[] = [];
  let state: CircuitState = 'closed';
  let consecutiveFailures = 0;
  let halfOpenSuccesses = 0;
  let openedAt = -1;
  let firstOpenedAt: number | null = null;
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
      if (breakerEnabled && consecutiveFailures >= threshold) {
        state = 'open';
        openedAt = i;
        if (firstOpenedAt === null) firstOpenedAt = i;
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
  const probeRequests = results.filter((r) => r.state === 'half-open').length;
  const openRequests = results.filter((r) => r.state === 'open').length;

  return {
    results,
    rejected,
    failed,
    succeeded,
    transitions,
    finalState: state,
    recoveryDetectedAt,
    firstOpenedAt,
    probeRequests,
    openRequests,
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
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [activePolicy, setActivePolicy] = useState<string | null>('Current policy');
  const [retriesEnabled, setRetriesEnabled] = useState(false);

  const applyScenario = (values: CircuitScenario, label: string) => {
    setFailureRate(values.failureRate); setThreshold(values.threshold); setResetTimeout(values.resetTimeout); setProbeCount(values.probeCount); setRecoverAt(values.recoverAt); setActiveScenario(label); setActivePolicy(null);
  };
  const applyPolicy = (values: CircuitPolicy, label: string) => {
    setThreshold(values.threshold); setResetTimeout(values.resetTimeout); setProbeCount(values.probeCount); setActivePolicy(label); setActiveScenario(null);
  };

  const sim = useMemo(
    () => simulate(failureRate, threshold, resetTimeout, probeCount, recoverAt),
    [failureRate, threshold, resetTimeout, probeCount, recoverAt]
  );
  const withoutBreaker = useMemo(() => simulate(failureRate, threshold, resetTimeout, probeCount, recoverAt, false), [failureRate, threshold, resetTimeout, probeCount, recoverAt]);
  const retryPressure = retriesEnabled ? sim.failed : 0;

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
  const chartH = 52;
  const recoveryLineX = recoveryActive ? safeRecoverAt * (cellW + cellGap) - cellGap / 2 : 0;

  return (
    <div className="capacity-workspace">
      <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>FAILURE CONTAINMENT LAB</div>
      <p className="capacity-purpose">Repeated failures open the circuit to protect the caller. A limited half-open probe tests whether requests can flow again.</p>
      <PresetBar presets={SCENARIOS} activeLabel={activeScenario} onSelect={applyScenario} accent="#ef4444" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Dependency failure rate" value={failureRate} onChange={(value) => { setFailureRate(value); setActiveScenario(null); setActivePolicy(null); }} min={0} max={100} step={5} formatValue={(v) => `${v}%`} accent="#ef4444" />
        <RangeControl label="Trip threshold" value={threshold} onChange={(value) => { setThreshold(value); setActiveScenario(null); setActivePolicy(null); }} min={1} max={10} formatValue={(v) => `${v} in a row`} accent="#ef4444" />
        <RangeControl label="Reset timeout" value={resetTimeout} onChange={(value) => { setResetTimeout(value); setActiveScenario(null); setActivePolicy(null); }} min={1} max={15} formatValue={(v) => `${v} req`} accent="#ef4444" />
      </div>

      <div className="capacity-result"><Insight
        what={`Current state after 60 requests: ${sim.finalState === 'closed' ? 'Closed — requests allowed' : sim.finalState === 'open' ? 'Open — requests blocked' : 'Half-open — limited probes allowed'}.`}
        why={sim.finalState === 'open' ? `Repeated failures or a failed probe opened the circuit. It waits ${resetTimeout} request opportunities before probing again. ${sim.rejected} calls were blocked across the run.` : sim.finalState === 'half-open' ? `The open wait ended; the circuit is testing recovery. It needs ${safeProbeCount} consecutive healthy probe(s), and one failed probe reopens it.` : sim.firstOpenedAt === null ? 'The selected failure pattern never reached the trip threshold; requests kept flowing.' : `The breaker opened during the run, then successful probes closed it again. ${sim.rejected} historical blocked calls do not mean it is open now.`}
        tip={sim.finalState === 'open' ? 'Investigate the dependency; opening protects your service but does not repair it. Use Recovering dependency to see a successful probe.' : sim.finalState === 'half-open' ? 'Keep probes limited until recovery is confirmed. A failed probe should stop normal traffic again.' : sim.firstOpenedAt === null ? 'Try Full outage to see protection, then Recovering dependency. Choose thresholds for realistic failure bursts.' : 'Watch for renewed failures and compare policy trade-offs before changing thresholds.'}
      /></div>
      <ol className="capacity-states" aria-label="Circuit transition policy">
        {(['closed', 'open', 'half-open'] as const).map((state) => <li key={state} aria-current={sim.finalState === state ? 'step' : undefined}><strong>{state === 'closed' ? 'Closed →' : state === 'open' ? 'Open →' : 'Half-open →'}</strong><span>{state === 'closed' ? 'Allow calls; failures trip' : state === 'open' ? 'Block calls; wait to probe' : 'Probe passes: close. Fails: open.'}</span>{sim.finalState === state && <b>Current at end</b>}</li>)}
      </ol>
      <p className="capacity-note">Timeline: 60 request opportunities, not wall-clock seconds. Outcome cells show history; the current state above is the state after the last request.</p>
      <VisualizationContainer minHeight={100} minContentWidth={600}>
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
              <rect x={i * (cellW + cellGap)} y={41} width={cellW} height={7} rx={1} fill={STATE_COLORS[r.state]} />
            </g>
          ))}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.success, borderRadius: '2px', marginRight: '.375rem' }} />Success</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.failure, borderRadius: '2px', marginRight: '.375rem' }} />Failure</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: OUTCOME_COLORS.rejected, opacity: 0.5, borderRadius: '2px', marginRight: '.375rem' }} />Fast-rejected (circuit open)</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '4px', background: '#F7933C', borderRadius: '1px', marginRight: '.375rem', verticalAlign: 'middle' }} />Half-open probe</span>
        <span>State strip: Closed / Open / Half-Open</span>
        {recoveryActive && (
          <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1.5px dashed #6CA6FF', marginRight: '.375rem', verticalAlign: 'middle' }} />Dependency recovers</span>
        )}
      </div>

      <AdvancedDisclosure summary="Advanced: half-open probes & timed recovery">
        <RangeControl
          label="Half-open probe count"
          value={probeCount}
          onChange={(value) => { setProbeCount(value); setActiveScenario(null); setActivePolicy(null); }}
          min={1}
          max={5}
          formatValue={(v) => (v === 1 ? '1 probe' : `${v} probes`)}
          accent="#F7933C"
        />
        <RangeControl
          label="Dependency recovers at request #"
          value={recoverAt}
          onChange={(value) => { setRecoverAt(value); setActiveScenario(null); setActivePolicy(null); }}
          min={0}
          max={REQUEST_COUNT}
          formatValue={(v) => (v === 0 ? 'Off (random)' : `#${v}`)}
          accent="#6CA6FF"
        />


      <div className="capacity-wide" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', fontSize: '.82rem', color: 'var(--k-text)' }}>
        <label><input type="checkbox" checked={retriesEnabled} onChange={(e) => setRetriesEnabled(e.target.checked)} /> Retries enabled (conceptual)</label>
      </div>

      <div className="capacity-wide" style={{ font: '800 .7rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>POLICY COMPARISON</div>
      <div className="capacity-wide"><PresetBar presets={POLICIES} activeLabel={activePolicy} onSelect={applyPolicy} accent="#F7933C" /></div>
      </AdvancedDisclosure>
      <AdvancedDisclosure summary="Run metrics & model limits"><div className="capacity-wide">      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Current state" value={sim.finalState === 'half-open' ? 'Half-Open' : sim.finalState[0].toUpperCase() + sim.finalState.slice(1)} color={STATE_COLORS[sim.finalState]} />
        <Metric label="Requests fast-rejected" value={String(sim.rejected)} sublabel="never touched the dependency" />
        <Metric label="Recovery detection lag" value={recoveryGap === null ? 'Not detected / not configured' : `${recoveryGap} request opportunities`} sublabel="after the configured dependency recovery" />
        <Metric label="State transitions" value={String(sim.transitions)} />
        <Metric label="Trip trigger" value={sim.firstOpenedAt === null ? 'Not reached' : `${threshold} consecutive failures`} sublabel={sim.firstOpenedAt === null ? 'selected pattern stayed below threshold' : `opened after request #${sim.firstOpenedAt + 1}`} />
        <Metric label="Dependency calls avoided" value={String(sim.rejected)} sublabel="fast-rejected by breaker" />
        <Metric label="Without breaker" value={`${withoutBreaker.failed} failed calls`} sublabel={`vs ${sim.failed} dependency failures with breaker`} />
        <Metric label="Open wait / probes" value={`${sim.openRequests} / ${sim.probeRequests}`} sublabel="request opportunities open / half-open probes" />
        <Metric label="Retry interaction" value={retriesEnabled ? `+${retryPressure} conceptual calls` : 'Off'} sublabel="Retry policy belongs in Retry Storm" />
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

<p className="capacity-note">A breaker does not repair a dependency. Thresholds are policy choices; real libraries may use rolling failure windows. Slow dependency models failure pressure, not latency. Retry counts are conceptual, not additional simulated requests.</p></div></AdvancedDisclosure>
      <ShareResultFoundation monster="toolooo" contentType="tool" slug="circuit-breaker-playground" title="Circuit Breaker Playground" result={{ summary: `Educational breaker model: threshold ${threshold}, open wait ${resetTimeout} requests, ${sim.failed} dependency failures and ${sim.rejected} calls blocked before the dependency.` }} />
    </div>
  );
}
