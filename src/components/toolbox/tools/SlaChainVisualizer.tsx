import { useMemo, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import Insight from '../shared/Insight';
import ShareResultFoundation from '../ShareResultFoundation';
import { clamp } from '../shared/mathHelpers';

export interface ReliabilityDependency { id: string; name: string; availabilityPct: number; required: boolean; }
export interface ReliabilityPlan { targetPct: number; dependencies: ReliabilityDependency[]; }
const COLORS = ['#F7933C', '#6CA6FF', '#DF78A0', '#93B96A', '#f2c14e', '#8b7fd6'];
const MIN_DEPENDENCIES = 1;
const MAX_DEPENDENCIES = 6;
const WINDOWS = [{ label: '24 hours', minutes: 1440 }, { label: '7 days', minutes: 10080 }, { label: '30 days', minutes: 43200 }, { label: '365 days', minutes: 525600 }];

export function formatAvailability(value: number): string { return clamp(value, 0, 100).toFixed(3) + '%'; }
export function formatDuration(minutes: number): string {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return minutes.toFixed(1) + 'm';
  if (minutes < 1440) return (minutes / 60).toFixed(1) + 'h';
  return (minutes / 1440).toFixed(1) + 'd';
}
/** Required-path availability model. It assumes sufficiently independent binary availability events. */
export function evaluateReliabilityPlan(plan: ReliabilityPlan) {
  const required = plan.dependencies.filter((dependency) => dependency.required);
  const modeledPct = required.reduce((product, dependency) => product * (clamp(dependency.availabilityPct, 0, 100) / 100), 1) * 100;
  const targetPct = clamp(plan.targetPct, 0, 100);
  const targetUnavailability = 100 - targetPct;
  const modeledUnavailability = 100 - modeledPct;
  const contributor = required.length ? required.reduce((lowest, dependency) => clamp(dependency.availabilityPct, 0, 100) < clamp(lowest.availabilityPct, 0, 100) ? dependency : lowest) : null;
  const alternativePct = contributor && required.length > 1 ? required.filter((dependency) => dependency.id !== contributor.id).reduce((product, dependency) => product * (clamp(dependency.availabilityPct, 0, 100) / 100), 1) * 100 : null;
  return { required, optional: plan.dependencies.filter((dependency) => !dependency.required), modeledPct, targetPct, targetUnavailability, modeledUnavailability, gapPp: modeledPct - targetPct, meetsTarget: modeledPct >= targetPct, contributor, alternativePct };
}

const DEFAULT_DEPS: ReliabilityDependency[] = [
  { id: 'd0', name: 'API', availabilityPct: 99.95, required: true },
  { id: 'd1', name: 'Service A', availabilityPct: 99.99, required: true },
  { id: 'd2', name: 'Database', availabilityPct: 99.9, required: true },
];
interface Scenario { targetPct: number; deps: ReliabilityDependency[]; sharedRisk: boolean; }
const SCENARIOS: { label: string; values: Scenario }[] = [
  { label: 'Simple chain', values: { targetPct: 99.8, deps: DEFAULT_DEPS, sharedRisk: false } },
  { label: 'Many required dependencies', values: { targetPct: 99.9, deps: [...DEFAULT_DEPS, { id: 'd3', name: 'Identity', availabilityPct: 99.95, required: true }, { id: 'd4', name: 'Payments', availabilityPct: 99.99, required: true }], sharedRisk: false } },
  { label: 'One weaker dependency', values: { targetPct: 99.9, deps: [{ id: 'd0', name: 'API', availabilityPct: 99.99, required: true }, { id: 'd1', name: 'Search', availabilityPct: 99.5, required: true }, { id: 'd2', name: 'Database', availabilityPct: 99.99, required: true }], sharedRisk: false } },
  { label: 'Optional dependency', values: { targetPct: 99.9, deps: [{ id: 'd0', name: 'API', availabilityPct: 99.99, required: true }, { id: 'd1', name: 'Recommendations', availabilityPct: 99.5, required: false }, { id: 'd2', name: 'Database', availabilityPct: 99.99, required: true }], sharedRisk: false } },
  { label: 'High objective', values: { targetPct: 99.99, deps: DEFAULT_DEPS, sharedRisk: false } },
  { label: 'Shared-failure risk', values: { targetPct: 99.9, deps: DEFAULT_DEPS, sharedRisk: true } },
];

export default function SLAChainVisualizer() {
  const [targetPct, setTargetPct] = useState(99.9);
  const [dependencies, setDependencies] = useState<ReliabilityDependency[]>(DEFAULT_DEPS);
  const [windowMinutes, setWindowMinutes] = useState(43200);
  const [sharedRisk, setSharedRisk] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const nextId = useRef(3);
  const clearPreset = () => setActivePreset(null);
  const updateDependency = (index: number, change: Partial<ReliabilityDependency>) => { setDependencies((current) => current.map((dependency, i) => i === index ? { ...dependency, ...change } : dependency)); clearPreset(); };
  const addDependency = () => setDependencies((current) => current.length >= MAX_DEPENDENCIES ? current : [...current, { id: 'd' + nextId.current++, name: 'Dependency ' + (current.length + 1), availabilityPct: 99.9, required: true }]);
  const removeDependency = (index: number) => { setDependencies((current) => current.length <= MIN_DEPENDENCIES ? current : current.filter((_, i) => i !== index)); clearPreset(); };
  const applyScenario = (scenario: Scenario, label: string) => { setTargetPct(scenario.targetPct); setDependencies(scenario.deps.map((dependency) => ({ ...dependency }))); setSharedRisk(scenario.sharedRisk); setActivePreset(label); };
  const result = useMemo(() => evaluateReliabilityPlan({ targetPct, dependencies }), [targetPct, dependencies]);
  const window = WINDOWS.find((candidate) => candidate.minutes === windowMinutes) || WINDOWS[2];
  const targetBudgetMinutes = (result.targetUnavailability / 100) * windowMinutes;
  const modeledUnavailableMinutes = (result.modeledUnavailability / 100) * windowMinutes;
  const budgetDifferenceMinutes = targetBudgetMinutes - modeledUnavailableMinutes;
  const color = result.meetsTarget ? '#22c55e' : '#ef4444';
  const W = 650, H = Math.max(150, 76 + dependencies.length * 40), PAD = 140;
  const barW = W - PAD - 24;
  const alternativeAssumption = result.alternativePct !== null ? `If ${result.contributor?.name} can genuinely be optional, modeled availability becomes ${formatAvailability(result.alternativePct)}. This is a comparison, not a recommendation to remove it.` : 'Add another required dependency before making an optional-path comparison.';

  return <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
    <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>RELIABILITY BUDGET LAB</div>
    <div style={{ font: '700 .8rem Poppins, sans-serif', color: 'var(--k-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Try a scenario</div>
    <PresetBar presets={SCENARIOS} activeLabel={activePreset} onSelect={applyScenario} accent="#93B96A" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '.8rem' }}>
      <RangeControl label="Service objective" value={targetPct} onChange={(value) => { setTargetPct(value); clearPreset(); }} min={95} max={99.99} step={0.01} formatValue={(value) => `${value.toFixed(2)}%`} accent="#93B96A" />
      <div><div style={{ font: '700 .72rem Poppins, sans-serif', color: 'var(--k-text-muted)', textTransform: 'uppercase', marginBottom: '.35rem' }}>Measurement window</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>{WINDOWS.map((candidate) => <button key={candidate.minutes} type="button" aria-pressed={windowMinutes === candidate.minutes} onClick={() => setWindowMinutes(candidate.minutes)} style={{ padding: '.4rem .55rem', borderRadius: '.45rem', border: '1px solid ' + (windowMinutes === candidate.minutes ? '#93B96A' : 'var(--k-border)'), background: windowMinutes === candidate.minutes ? 'color-mix(in srgb, #93B96A 14%, transparent)' : 'transparent', color: windowMinutes === candidate.minutes ? '#93B96A' : 'var(--k-text-muted)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}>{candidate.label}</button>)}</div></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.8rem', color: 'var(--k-text-muted)', marginTop: '1.35rem' }}><input type="checkbox" checked={sharedRisk} onChange={(event) => { setSharedRisk(event.target.checked); clearPreset(); }} /> Shared-failure risk exists</label>
    </div>
    <p style={{ margin: '.2rem 0 1rem', fontSize: '.76rem', color: 'var(--k-text-muted)' }}>SLI is what is measured. SLO is the selected target. SLA is a formal commitment with defined terms. This tool displays a simplified modeled reliability, never a contractual SLA.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: '.85rem' }}>{dependencies.map((dependency, index) => <div key={dependency.id} style={{ background: 'var(--k-bg)', border: '1px solid var(--k-border)', borderRadius: '.75rem', padding: '.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.6rem' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[index % COLORS.length] }} /><strong style={{ fontSize: '.75rem', textTransform: 'uppercase' }}>Dependency {index + 1}</strong>{dependencies.length > MIN_DEPENDENCIES && <button type="button" onClick={() => removeDependency(index)} aria-label={`Remove ${dependency.name}`} style={{ border: 0, background: 'transparent', color: 'var(--k-text-muted)', marginLeft: 'auto', cursor: 'pointer', fontSize: '1.15rem' }}>×</button>}</div>
      <InputField label="Name" type="text" value={dependency.name} onChange={(value) => updateDependency(index, { name: value })} />
      <RangeControl label="Availability assumption" value={dependency.availabilityPct} onChange={(value) => updateDependency(index, { availabilityPct: value })} min={90} max={99.99} step={0.01} formatValue={(value) => `${value.toFixed(2)}%`} accent={COLORS[index % COLORS.length]} />
      <button type="button" aria-pressed={dependency.required} onClick={() => updateDependency(index, { required: !dependency.required })} style={{ border: '1px solid ' + (dependency.required ? COLORS[index % COLORS.length] : 'var(--k-border)'), background: dependency.required ? 'color-mix(in srgb, #6CA6FF 12%, transparent)' : 'transparent', color: dependency.required ? COLORS[index % COLORS.length] : 'var(--k-text-muted)', borderRadius: '.45rem', padding: '.4rem .55rem', fontWeight: 700, fontSize: '.72rem', cursor: 'pointer' }}>{dependency.required ? 'Required path' : 'Optional · degraded response accepted'}</button>
    </div>)}</div>
    <button type="button" onClick={addDependency} disabled={dependencies.length >= MAX_DEPENDENCIES} style={{ marginTop: '.85rem', padding: '.45rem .8rem', borderRadius: '.5rem', border: '1px dashed var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text-muted)', cursor: dependencies.length >= MAX_DEPENDENCIES ? 'not-allowed' : 'pointer' }}>+ Add dependency ({dependencies.length}/{MAX_DEPENDENCIES})</button>
    <VisualizationContainer minHeight={H}><div style={{ fontSize: '.73rem', color: 'var(--k-text-muted)', marginBottom: '.4rem' }}>USER OBJECTIVE → REQUIRED DEPENDENCIES → MODELED END-TO-END AVAILABILITY → ERROR BUDGET</div><svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: `${W}px`, height: 'auto' }} role="img" aria-label={`${result.required.length} required dependencies model ${formatAvailability(result.modeledPct)} end-to-end availability against a ${formatAvailability(result.targetPct)} objective.`}>
      <text x={PAD} y={16} fontSize="10" fill="var(--k-text-muted)">required-path availability</text><line x1={PAD} x2={PAD + barW} y1={23} y2={23} stroke="var(--k-border)" />
      {dependencies.map((dependency, index) => { const y = 40 + index * 40; const fill = dependency.required ? COLORS[index % COLORS.length] : '#94a3b8'; const width = clamp(dependency.availabilityPct, 0, 100) / 100 * barW; return <g key={dependency.id}><text x={PAD - 9} y={y + 12} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">{dependency.name}</text><rect x={PAD} y={y} width={barW} height={18} rx={4} fill="var(--k-border)" /><rect x={PAD} y={y} width={width} height={18} rx={4} fill={fill} opacity={dependency.required ? .9 : .5} /><text x={PAD + 5} y={y + 12} fontSize="9" fill="#1a1a1a" fontWeight="700">{dependency.availabilityPct.toFixed(2)}% · {dependency.required ? 'required' : 'optional'}</text></g>; })}
      <rect x={PAD} y={H - 34} width={barW} height={22} rx={5} fill="var(--k-border)" /><rect x={PAD} y={H - 34} width={result.modeledPct / 100 * barW} height={22} rx={5} fill={color} /><text x={PAD + 6} y={H - 19} fontSize="10" fill="#1a1a1a" fontWeight="800">MODELED END-TO-END {formatAvailability(result.modeledPct)}</text><text x={W - 12} y={H - 19} textAnchor="end" fontSize="10" fill={color} fontWeight="800">target {formatAvailability(result.targetPct)}</text>
    </svg></VisualizationContainer>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1rem' }}>
      <Metric label="Modeled availability" value={formatAvailability(result.modeledPct)} color={color} sublabel={`${result.required.length} required dependencies`} /><Metric label={result.meetsTarget ? 'Reliability headroom' : 'Gap to target'} value={`${Math.abs(result.gapPp).toFixed(3)} percentage points`} color={color} sublabel={result.meetsTarget ? 'under the selected assumptions' : 'simplified model misses target'} /><Metric label="Target error budget" value={formatDuration(targetBudgetMinutes)} sublabel={`${formatAvailability(result.targetPct)} over ${window.label}`} /><Metric label="Modeled unavailable time" value={formatDuration(modeledUnavailableMinutes)} color={color} sublabel={budgetDifferenceMinutes >= 0 ? `${formatDuration(budgetDifferenceMinutes)} budget headroom` : `${formatDuration(Math.abs(budgetDifferenceMinutes))} over budget`} /><Metric label="Largest reliability contributor" value={result.contributor?.name || 'None'} sublabel={result.contributor ? `${formatAvailability(result.contributor.availabilityPct)} lowest required assumption` : 'no required dependencies'} />
    </div>
    <div style={{ marginTop: '.85rem', padding: '.8rem', border: '1px solid var(--k-border)', borderRadius: '.7rem', fontSize: '.78rem' }}><strong>Reliability translator · {window.label}:</strong> 99% = {formatDuration(.01 * windowMinutes)}, 99.9% = {formatDuration(.001 * windowMinutes)}, 99.99% = {formatDuration(.0001 * windowMinutes)}, 99.999% = {formatDuration(.00001 * windowMinutes)} modeled unavailable time. These are availability budgets for the selected window, not claims about latency or planned downtime.</div>
    <div style={{ marginTop: '.85rem', padding: '.8rem', border: '1px solid var(--k-border)', borderRadius: '.7rem', fontSize: '.78rem', color: 'var(--k-text-muted)' }}><strong style={{ color: 'var(--k-text)' }}>Current vs degraded-response comparison:</strong> {alternativeAssumption}</div>
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
      {!result.meetsTarget && <Warning level="danger" title="This simplified model does not meet the selected target">The modeled path is {formatAvailability(result.modeledPct)} against a {formatAvailability(result.targetPct)} objective. {result.contributor?.name} is the lowest-availability required assumption, not a proven production root cause.</Warning>}
      {result.optional.length > 0 && <Warning level="info" title="Optional means degraded response accepted in this model">Optional dependencies are excluded only from the hard availability path. Their loss can still remove functionality or harm user experience.</Warning>}
      {sharedRisk && <Warning level="warn" title="Shared-failure risk makes the multiplication model optimistic">Required dependencies can share a region, network, database, identity provider, or deployment path. This model does not invent a correlation coefficient or double-count a shared dependency.</Warning>}
      <Warning level="info" title="Independence and measurement assumptions">Required availability values are multiplied as a simplified binary model. Vendor terms, measurement windows, exclusions, fallback behavior, and correlation mean this is not a guaranteed customer SLA.</Warning>
    </div>
    <div style={{ marginTop: '1rem' }}><Insight what={`The selected objective is ${formatAvailability(result.targetPct)} over ${window.label}; the required path models ${formatAvailability(result.modeledPct)}.`} why="Availability and latency are separate dimensions. A timeout is an operational limit, while an SLO is a target and an SLA is a defined commitment. Neither is derived automatically from the other." tip={sharedRisk ? 'Map shared infrastructure and common failure modes before interpreting this independent-path calculation as comfortable.' : !result.meetsTarget ? `Inspect ${result.contributor?.name || 'the lowest availability dependency'} and the product contract before changing architecture. Higher availability can add cost and operational complexity.` : 'Use Fan-Out to inspect latency critical paths and Timeout Chain Planner to test deadline budgets; those are different from reliability objectives.'} /></div>
    <ShareResultFoundation monster="toolooo" contentType="tool" slug="sla-chain-visualizer" title="SLA Chain Visualizer" result={{ summary: `Educational reliability model: ${result.required.length} required dependencies, ${formatAvailability(result.modeledPct)} modeled availability against a ${formatAvailability(result.targetPct)} objective over ${window.label}; ${result.meetsTarget ? `${result.gapPp.toFixed(3)} percentage-point headroom` : `${Math.abs(result.gapPp).toFixed(3)} percentage-point gap`}. Independence is an assumption.` }} />
  </div>;
}
