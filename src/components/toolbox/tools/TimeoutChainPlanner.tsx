import { useMemo, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import ShareResultFoundation from '../ShareResultFoundation';
import { clamp } from '../shared/mathHelpers';

export interface DeadlineHop { id: string; name: string; expectedMs: number; timeoutMs: number; retries: number; backoffMs: number; }
export interface DeadlinePlan { deadlineMs: number; localWorkMs: number; propagate: boolean; hops: DeadlineHop[]; }
const COLORS = ['#F7933C', '#6CA6FF', '#DF78A0', '#93B96A', '#f2c14e', '#8b7fd6'];
const MIN_HOPS = 1;
const MAX_HOPS = 6;

/** Serial educational model: expected work and configured wait ceilings stay deliberately separate. */
export function evaluateDeadlineChain(plan: DeadlinePlan) {
  const deadlineMs = Math.max(1, plan.deadlineMs);
  let expectedElapsed = Math.max(0, plan.localWorkMs);
  const issues: string[] = [];
  const steps = plan.hops.map((hop, index) => {
    const expectedStart = expectedElapsed;
    const expectedMs = Math.max(0, hop.expectedMs);
    const timeoutMs = Math.max(1, hop.timeoutMs);
    const retries = clamp(Math.round(hop.retries), 0, 3);
    const backoffMs = Math.max(0, hop.backoffMs);
    const remainingBefore = Math.max(0, deadlineMs - expectedElapsed);
    const effectiveTimeout = plan.propagate ? Math.min(timeoutMs, remainingBefore) : timeoutMs;
    const retryExposure = timeoutMs * (retries + 1) + backoffMs * retries;
    const retryFits = retryExposure <= remainingBefore;
    const inversion = timeoutMs > remainingBefore;
    expectedElapsed += expectedMs;
    const remainingAfter = Math.max(0, deadlineMs - expectedElapsed);
    if (inversion) issues.push(`${hop.name} timeout exceeds the caller's remaining budget.`);
    return { ...hop, index, expectedMs, timeoutMs, retries, backoffMs, expectedStart, remainingBefore, effectiveTimeout, retryExposure, retryFits, inversion, remainingAfter, color: COLORS[index % COLORS.length] };
  });
  const expectedTotal = expectedElapsed;
  const configuredExposure = Math.max(0, plan.localWorkMs) + steps.reduce((sum, step) => sum + step.retryExposure, 0);
  const headroom = deadlineMs - expectedTotal;
  return { steps, expectedTotal, configuredExposure, headroom, deadlineMiss: expectedTotal > deadlineMs, overcommit: configuredExposure > deadlineMs, issues };
}

/** Presentation precedence only; expected latency and configured wait exposure stay separate. */
export function getDeadlineDecision(result: ReturnType<typeof evaluateDeadlineChain>, deadlineMs: number) {
  const inversion = result.steps.find(step => step.inversion);
  const retry = result.steps.find(step => step.retries > 0 && !step.retryFits);
  if (result.deadlineMiss) return {
    status: 'missed',
    what: `Deadline missed — expected serial work is ${result.expectedTotal}ms against ${deadlineMs}ms.`,
    why: `Expected work alone exceeds the deadline by ${Math.abs(result.headroom)}ms. This is a modeled deadline miss, not proof of a dependency failure.`,
    tip: 'Reduce serial work or change the operation design before adding retries. Inspect which downstream work consumes the budget.',
  };
  if (inversion) return {
    status: 'invalid',
    what: `Timeout budget conflict — ${inversion.name}'s configured timeout exceeds its remaining budget.`,
    why: `Expected serial work fits (${result.expectedTotal}ms), but ${inversion.name} has a ${inversion.timeoutMs}ms timeout with only ${inversion.remainingBefore}ms remaining. Expected latency is not a timeout ceiling.`,
    tip: `Cap ${inversion.name}'s effective wait to the remaining caller budget, then validate whether its expected latency can fit. Propagated cancellation must also be honored downstream.`,
  };
  if (result.overcommit || retry) return {
    status: 'risk',
    what: 'At risk — expected work fits, but configured waits or retries exceed the available budget.',
    why: retry ? `${retry.name}'s attempts and backoff expose ${retry.retryExposure}ms against ${retry.remainingBefore}ms remaining. Total configured exposure is ${result.configuredExposure}ms against a ${deadlineMs}ms deadline; this is not predicted latency.` : `Configured wait exposure totals ${result.configuredExposure}ms against a ${deadlineMs}ms deadline, even though expected serial work is ${result.expectedTotal}ms. This is exposure, not predicted latency.`,
    tip: 'Reduce timeout ceilings, retry attempts or backoff to fit the caller budget. Confirm idempotency and retryable errors before allowing another attempt.',
  };
  if (result.headroom < 100) return {
    status: 'tight',
    what: `Tight budget — expected work fits with only ${result.headroom}ms headroom.`,
    why: 'Expected work and configured exposure fit, but little modeled time remains for latency variation.',
    tip: 'Validate real tail latency and overhead before treating this configuration as comfortable.',
  };
  return {
    status: 'fits',
    what: `Within modeled budget — expected work and configured waits fit the ${deadlineMs}ms deadline.`,
    why: `Expected serial work is ${result.expectedTotal}ms with ${result.headroom}ms headroom; configured wait exposure is ${result.configuredExposure}ms. These describe different aspects of the plan, not a production guarantee.`,
    tip: 'Validate these assumptions against real latency and cancellation behavior, then compare the wider availability objective in SLA Chain Visualizer.',
  };
}

const DEFAULT_HOPS: DeadlineHop[] = [
  { id: 'h0', name: 'API', expectedMs: 140, timeoutMs: 300, retries: 0, backoffMs: 0 },
  { id: 'h1', name: 'Service A', expectedMs: 360, timeoutMs: 400, retries: 0, backoffMs: 0 },
  { id: 'h2', name: 'Database', expectedMs: 240, timeoutMs: 300, retries: 0, backoffMs: 0 },
];
interface Scenario { deadlineMs: number; localWorkMs: number; propagate: boolean; cancellation: 'yes' | 'no' | 'unknown'; hops: DeadlineHop[]; }
const PRESETS: { label: string; values: Scenario }[] = [
  { label: 'Balanced chain', values: { deadlineMs: 1200, localWorkMs: 100, propagate: true, cancellation: 'yes', hops: DEFAULT_HOPS } },
  { label: 'Downstream too long', values: { deadlineMs: 900, localWorkMs: 180, propagate: true, cancellation: 'unknown', hops: [{ id: 'h0', name: 'API', expectedMs: 140, timeoutMs: 300, retries: 0, backoffMs: 0 }, { id: 'h1', name: 'Service B', expectedMs: 420, timeoutMs: 1000, retries: 0, backoffMs: 0 }] } },
  { label: 'Tight deadline', values: { deadlineMs: 650, localWorkMs: 120, propagate: true, cancellation: 'yes', hops: DEFAULT_HOPS } },
  { label: 'Deep call chain', values: { deadlineMs: 1500, localWorkMs: 140, propagate: true, cancellation: 'unknown', hops: [...DEFAULT_HOPS, { id: 'h3', name: 'Cache', expectedMs: 130, timeoutMs: 250, retries: 0, backoffMs: 0 }, { id: 'h4', name: 'Profile', expectedMs: 280, timeoutMs: 400, retries: 0, backoffMs: 0 }] } },
  { label: 'Retry eats budget', values: { deadlineMs: 1000, localWorkMs: 100, propagate: true, cancellation: 'unknown', hops: [{ id: 'h0', name: 'API', expectedMs: 120, timeoutMs: 300, retries: 1, backoffMs: 100 }, { id: 'h1', name: 'Service B', expectedMs: 280, timeoutMs: 350, retries: 1, backoffMs: 100 }] } },
  { label: 'No propagation', values: { deadlineMs: 1000, localWorkMs: 350, propagate: false, cancellation: 'unknown', hops: [{ id: 'h0', name: 'Service A', expectedMs: 260, timeoutMs: 700, retries: 0, backoffMs: 0 }, { id: 'h1', name: 'Database', expectedMs: 300, timeoutMs: 700, retries: 0, backoffMs: 0 }] } },
];

export default function TimeoutChainPlanner() {
  const [deadlineMs, setDeadlineMs] = useState(1200);
  const [localWorkMs, setLocalWorkMs] = useState(100);
  const [propagate, setPropagate] = useState(true);
  const [cancellation, setCancellation] = useState<'yes' | 'no' | 'unknown'>('yes');
  const [hops, setHops] = useState<DeadlineHop[]>(DEFAULT_HOPS);
  const [alternativeCap, setAlternativeCap] = useState(350);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [revealRetries, setRevealRetries] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const nextId = useRef(3);
  const clearPreset = () => setActivePreset(null);
  const updateHop = (index: number, change: Partial<DeadlineHop>) => { setHops((current) => current.map((hop, i) => i === index ? { ...hop, ...change } : hop)); clearPreset(); };
  const addHop = () => { setHops((current) => current.length >= MAX_HOPS ? current : [...current, { id: 'custom-h' + nextId.current++, name: 'Hop ' + (current.length + 1), expectedMs: 150, timeoutMs: 300, retries: 0, backoffMs: 0 }]); clearPreset(); };
  const removeHop = (index: number) => { setHops((current) => current.length <= MIN_HOPS ? current : current.filter((_, i) => i !== index)); clearPreset(); };
  const applyScenario = (scenario: Scenario, label: string) => { setRevealRetries(scenario.hops.some(hop => hop.retries > 0)); setPolicyExpanded(false); setDeadlineMs(scenario.deadlineMs); setLocalWorkMs(scenario.localWorkMs); setPropagate(scenario.propagate); setCancellation(scenario.cancellation); setHops(scenario.hops.map((hop) => ({ ...hop }))); setActivePreset(label); };
  const result = useMemo(() => evaluateDeadlineChain({ deadlineMs, localWorkMs, propagate, hops }), [deadlineMs, localWorkMs, propagate, hops]);
  const alternativeExposure = useMemo(() => localWorkMs + result.steps.reduce((sum, step) => sum + Math.min(step.timeoutMs, alternativeCap) * (step.retries + 1) + step.backoffMs * step.retries, 0), [localWorkMs, result.steps, alternativeCap]);
  const maxTime = Math.max(deadlineMs, result.expectedTotal, 1);
  const W = 660, H = Math.max(150, 70 + result.steps.length * 36), PAD = 106, scale = (W - PAD - 18) / maxTime;
  const expectedColor = result.deadlineMiss ? '#ef4444' : result.headroom < 100 ? '#F7933C' : '#22c55e';
  const inversionStep = result.steps.find((step) => step.inversion);
  const retryConflict = result.steps.find((step) => step.retries > 0 && !step.retryFits);
  const decision = getDeadlineDecision(result, deadlineMs);
  const continuedWorkRisk = (inversionStep || result.overcommit) && cancellation !== 'yes';

  return <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
    <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>DEADLINE BUDGET LAB</div>
    <p style={{ color: 'var(--k-text)', lineHeight: 1.6, margin: '0 0 1rem' }}>Every serial operation consumes the same finite deadline. Try “Retry eats budget” to see why fast expected work can still have an overcommitted wait policy.</p>
    <div style={{ font: '700 .8rem Poppins, sans-serif', color: 'var(--k-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Try a scenario</div>
    <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyScenario} accent="#F7933C" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
      <RangeControl label="End-to-end deadline" value={deadlineMs} onChange={(value) => { setDeadlineMs(value); clearPreset(); }} min={200} max={5000} step={50} formatValue={(value) => `${value}ms`} accent="#ef4444" />
      <RangeControl label="Elapsed local work" value={localWorkMs} onChange={(value) => { setLocalWorkMs(value); clearPreset(); }} min={0} max={1000} step={10} formatValue={(value) => `${value}ms`} accent="#6CA6FF" />
    </div>
    <p style={{ fontSize: '.8rem', color: 'var(--k-text-muted)' }}>{hops.length} serial hops: {hops.map(hop => `${hop.name} (${hop.expectedMs}ms expected)`).join(' → ')}. Edit the hops below to test your plan.</p>
    <Insight what={decision.what} why={decision.why} tip={decision.tip} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.75rem', marginTop: '1rem' }}>
      <Metric label="Modeled serial work" value={`${result.expectedTotal}ms`} color={expectedColor} sublabel="expected latency, not timeout ceilings" /><Metric label="Deadline headroom" value={result.deadlineMiss ? `${Math.abs(result.headroom)}ms over` : `${result.headroom}ms left`} color={expectedColor} sublabel={result.deadlineMiss ? 'deadline miss, not dependency failure' : 'after modeled expected work'} /><Metric label="Configured wait exposure" value={`${result.configuredExposure}ms`} color={result.overcommit ? '#ef4444' : '#F7933C'} sublabel="timeouts + retries + backoff; not expected latency" /><Metric label="Alternative capped exposure" value={`${alternativeExposure}ms`} sublabel={`${alternativeCap}ms cap per attempt; compare, do not blindly apply`} />
    </div>
    <h2 style={{ fontSize: '1rem', margin: '1.25rem 0 .75rem' }}>Downstream hops</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '.85rem' }}>
      {hops.map((hop, index) => <div key={hop.id} role="group" aria-label={`Hop ${index + 1}: ${hop.name}`} style={{ background: 'var(--k-bg)', border: '1px solid var(--k-border)', borderRadius: '.75rem', padding: '.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.65rem' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[index % COLORS.length] }} /><strong style={{ fontSize: '.76rem', textTransform: 'uppercase' }}>Hop {index + 1}</strong>{hops.length > MIN_HOPS && <button type="button" onClick={() => removeHop(index)} aria-label={`Remove ${hop.name}`} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--k-text-muted)', cursor: 'pointer', fontSize: '1.15rem' }}>×</button>}</div>
        <InputField label="Name" type="text" value={hop.name} onChange={(value) => updateHop(index, { name: value })} />
        <RangeControl label="Expected latency" value={hop.expectedMs} onChange={(value) => updateHop(index, { expectedMs: value })} min={10} max={1500} step={10} formatValue={(value) => `${value}ms`} accent={COLORS[index % COLORS.length]} />
        <RangeControl label="Per-attempt timeout" value={hop.timeoutMs} onChange={(value) => updateHop(index, { timeoutMs: value })} min={50} max={3000} step={50} formatValue={(value) => `${value}ms`} accent={COLORS[index % COLORS.length]} />
        <details open={revealRetries} style={{ marginTop: '.75rem' }}>
          <summary style={{ cursor: 'pointer', minHeight: 44, paddingBlock: '.65rem', boxSizing: 'border-box', fontSize: '.8rem', fontWeight: 700 }}>Retries & backoff ({hop.retries} {hop.retries === 1 ? 'retry' : 'retries'})</summary>
        <RangeControl label="Retries" value={hop.retries} onChange={(value) => updateHop(index, { retries: value })} min={0} max={3} step={1} formatValue={(value) => `${value}×`} accent={COLORS[index % COLORS.length]} />
        {hop.retries > 0 && <RangeControl label="Retry backoff" value={hop.backoffMs} onChange={(value) => updateHop(index, { backoffMs: value })} min={0} max={1000} step={25} formatValue={(value) => `${value}ms`} accent={COLORS[index % COLORS.length]} />}
        </details>
      </div>)}
    </div>
    <button type="button" onClick={addHop} disabled={hops.length >= MAX_HOPS} style={{ marginTop: '.85rem', padding: '.45rem .8rem', borderRadius: '.5rem', border: '1px dashed var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text-muted)', cursor: hops.length >= MAX_HOPS ? 'not-allowed' : 'pointer' }}>+ Add serial hop ({hops.length}/{MAX_HOPS})</button>

    <details open={policyExpanded || Boolean(inversionStep || result.overcommit || retryConflict || !propagate)} onToggle={event => { if (event.currentTarget.open) setPolicyExpanded(true); }} style={{ margin: '1rem 0' }}>
      <summary style={{ cursor: 'pointer', minHeight: 44, paddingBlock: '.65rem', boxSizing: 'border-box', fontSize: '.8rem', fontWeight: 700 }}>Advanced: propagation, cancellation & comparison</summary>
      <div style={{ marginTop: '1rem' }}>
      <RangeControl label="Alternative timeout cap" value={alternativeCap} onChange={setAlternativeCap} min={50} max={1500} step={50} formatValue={(value) => `${value}ms`} accent="#93B96A" />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem', alignItems: 'center' }}>
      <button type="button" aria-pressed={propagate} onClick={() => { setPropagate(!propagate); clearPreset(); }} style={{ border: '1px solid ' + (propagate ? '#F7933C' : 'var(--k-border)'), background: propagate ? 'color-mix(in srgb, #F7933C 14%, transparent)' : 'transparent', color: propagate ? '#F7933C' : 'var(--k-text-muted)', borderRadius: '.5rem', padding: '.5rem .75rem', fontWeight: 700, cursor: 'pointer' }}>Propagate remaining deadline: {propagate ? 'On' : 'Off'}</button>
      <span style={{ fontSize: '.78rem', color: 'var(--k-text-muted)' }}>Cancellation propagation:</span>
      {(['yes', 'no', 'unknown'] as const).map((value) => <button key={value} type="button" aria-pressed={cancellation === value} onClick={() => { setCancellation(value); clearPreset(); }} style={{ border: '1px solid ' + (cancellation === value ? '#6CA6FF' : 'var(--k-border)'), background: cancellation === value ? 'color-mix(in srgb, #6CA6FF 14%, transparent)' : 'transparent', color: cancellation === value ? '#6CA6FF' : 'var(--k-text-muted)', borderRadius: '.5rem', padding: '.4rem .65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{value}</button>)}
    </div>
    <p style={{ margin: '-.25rem 0 1rem', fontSize: '.76rem', color: 'var(--k-text-muted)' }}>A deadline is the end-to-end finish point; a timeout is a maximum wait for one operation. Propagation is protocol and application dependent, not universal.</p>

      </div>
    </details>
      <div style={{ fontSize: '.73rem', color: 'var(--k-text-muted)', marginBottom: '.4rem' }}>END-TO-END DEADLINE → ELAPSED WORK → REMAINING BUDGET → DOWNSTREAM CALLS</div>
    <VisualizationContainer minHeight={H} minContentWidth={W}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: `${W}px`, height: 'auto' }} role="img" aria-label={`Deadline waterfall: ${deadlineMs} milliseconds total deadline, ${result.expectedTotal} milliseconds modeled expected serial work, and ${result.deadlineMiss ? 'a deadline miss' : result.headroom + ' milliseconds headroom'}.`}>
        <line x1={PAD} x2={W - 12} y1={18} y2={18} stroke="var(--k-border)" /><line x1={PAD + deadlineMs * scale} x2={PAD + deadlineMs * scale} y1={18} y2={H - 8} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} /><text x={Math.min(PAD + deadlineMs * scale + 3, W - 100)} y={12} fontSize="9" fill="#ef4444">deadline {deadlineMs}ms</text>
        <text x={PAD - 8} y={43} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">local work</text><rect x={PAD} y={31} width={Math.max(2, localWorkMs * scale)} height={18} rx={3} fill="#6CA6FF" /><text x={PAD + 4} y={44} fontSize="9" fill="#fff">{localWorkMs}ms</text>
        {result.steps.map((step) => { const y = 64 + step.index * 36; const x = PAD + step.expectedStart * scale; return <g key={step.id}><text x={PAD - 8} y={y + 13} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">{step.name}</text><rect x={x} y={y} width={Math.max(2, step.expectedMs * scale)} height={18} rx={3} fill={step.color} /><text x={x + 4} y={y + 12} fontSize="9" fill="#1a1a1a" fontWeight="700">{step.expectedMs}ms</text><text x={W - 10} y={y + 13} textAnchor="end" fontSize="9" fill={step.remainingAfter === 0 ? '#ef4444' : 'var(--k-text-muted)'}>{step.remainingAfter}ms left</text></g>; })}
      </svg>
    </VisualizationContainer>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.65rem', marginTop: '.8rem' }}>{result.steps.map((step) => <div key={step.id} style={{ padding: '.65rem', border: '1px solid var(--k-border)', borderRadius: '.6rem', fontSize: '.75rem' }}><strong>{step.name}</strong><br /><span style={{ color: 'var(--k-text-muted)' }}>starts with {step.remainingBefore}ms; configured {step.timeoutMs}ms{propagate ? `; effective cap ${step.effectiveTimeout}ms` : ''}</span><br />{step.retries > 0 && <span style={{ color: step.retryFits ? '#22c55e' : '#ef4444' }}>retry exposure {step.retryExposure}ms: {step.retryFits ? 'fits deadline' : 'does not fit deadline'}</span>}</div>)}</div>
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
      {!propagate && <Warning level="warn" title="Each child still has its configured timeout">Without modeled propagation, children can be configured as if the original deadline remains. That does not create new end-to-end time for the caller.</Warning>}
      {inversionStep && <Warning level="danger" title="Timeout inversion / impossible budget">{inversionStep.name} is configured for {inversionStep.timeoutMs}ms but only {inversionStep.remainingBefore}ms remains when it begins. The caller may give up before that timeout expires.</Warning>}
      {result.overcommit && <Warning level="danger" title="Maximum configured wait exposure exceeds the end-to-end budget">The configured ceilings add to {result.configuredExposure}ms against a {deadlineMs}ms deadline. This is a maximum wait exposure, not predicted request latency.</Warning>}
      {retryConflict && <Warning level="warn" title="Retry budget does not fit the remaining deadline">{retryConflict.name}'s attempts and backoff can consume {retryConflict.retryExposure}ms from only {retryConflict.remainingBefore}ms remaining. A retry never resets the original deadline, and whether it is appropriate depends on idempotency and error type.</Warning>}
      {continuedWorkRisk && <Warning level="warn" title="Potential wasted downstream work">The caller can stop waiting while a downstream operation may still be working. With cancellation {cancellation}, this model does not assume work stops; protocol, framework, cancellation propagation, and application handling decide that.</Warning>}
      {cancellation === 'yes' && (inversionStep || result.overcommit) && <Warning level="info" title="Cancellation signal modeled as propagated">A propagated cancellation signal still needs the downstream service and any application-spawned work to honor it; it does not guarantee termination.</Warning>}
    </div>
    <ShareResultFoundation monster="toolooo" contentType="tool" slug="timeout-chain-planner" title="Timeout Chain Planner" result={{ summary: `Educational deadline plan: ${deadlineMs}ms end-to-end deadline, ${result.expectedTotal}ms modeled serial work, ${result.deadlineMiss ? `${Math.abs(result.headroom)}ms over` : `${result.headroom}ms headroom`}, ${propagate ? 'remaining deadline propagation on' : 'propagation off'}, and ${result.overcommit ? 'configured wait exposure over budget' : 'configured wait exposure within budget'}.` }} />
  </div>;
}
