import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import Insight from '../shared/Insight';
import ShareResultFoundation from '../ShareResultFoundation';
import { clamp } from '../shared/mathHelpers';

export interface FanoutBranch { latency: number; start: number; end: number; required: boolean; }

function seededRandom(index: number): number {
  const x = Math.sin(index * 31.415) * 78901.234;
  return x - Math.floor(x);
}

/** Deterministic teaching model: parallel response time is the latest required branch. */
export function simulateFanout(
  count: number, baseLatency: number, variancePct: number, parallel: boolean,
  slowBranchIndex = -1, slowBranchLatency = 0, optionalBranchIndex = -1, trialIndex = 0,
) {
  const n = clamp(Math.round(count), 1, 20);
  const latencies = Array.from({ length: n }, (_, i) => {
    const jitter = 1 + (seededRandom(i + trialIndex * 1000) * 2 - 1) * (variancePct / 100);
    const sampled = Math.max(5, Math.round(baseLatency * jitter));
    return i === slowBranchIndex && slowBranchLatency > 0 ? slowBranchLatency : sampled;
  });
  let cursor = 0;
  const branches: FanoutBranch[] = latencies.map((latency, i) => {
    const start = parallel ? 0 : cursor;
    if (!parallel) cursor += latency;
    return { latency, start, end: start + latency, required: i !== optionalBranchIndex };
  });
  const required = branches.filter((branch) => branch.required);
  const responseLatency = Math.max(...required.map((branch) => branch.end));
  const criticalIndex = branches.findIndex((branch) => branch.required && branch.end === responseLatency);
  return { branches, responseLatency, criticalIndex, serialTotal: branches.reduce((sum, branch) => sum + branch.latency, 0), requiredCount: required.length, optionalCount: branches.length - required.length };
}

/** Probability that at least one independent required branch has a slow-tail event. */
export function independentTailRisk(perServiceTailRate: number, requiredBranches: number): number {
  const rate = clamp(perServiceTailRate, 0, 100) / 100;
  return 1 - Math.pow(1 - rate, Math.max(0, requiredBranches));
}

const PERCENTILE_TRIALS = 200;

interface ScenarioValues { count: number; baseLatency: number; variance: number; deadline: number; tailRate: number; slowBranchIndex: number; slowBranchLatency: number; optionalSlowBranch: boolean; }
const SCENARIOS: { label: string; values: ScenarioValues }[] = [
  { label: 'Small fan-out', values: { count: 2, baseLatency: 90, variance: 10, deadline: 300, tailRate: 1, slowBranchIndex: -1, slowBranchLatency: 0, optionalSlowBranch: false } },
  { label: 'Large fan-out', values: { count: 10, baseLatency: 100, variance: 25, deadline: 400, tailRate: 1, slowBranchIndex: -1, slowBranchLatency: 0, optionalSlowBranch: false } },
  { label: 'One slow dependency', values: { count: 8, baseLatency: 110, variance: 10, deadline: 400, tailRate: 1, slowBranchIndex: 7, slowBranchLatency: 600, optionalSlowBranch: false } },
  { label: 'Tail spike', values: { count: 8, baseLatency: 120, variance: 90, deadline: 500, tailRate: 5, slowBranchIndex: -1, slowBranchLatency: 0, optionalSlowBranch: false } },
  { label: 'Tight deadline', values: { count: 5, baseLatency: 160, variance: 30, deadline: 220, tailRate: 2, slowBranchIndex: -1, slowBranchLatency: 0, optionalSlowBranch: false } },
  { label: 'Optional dependency', values: { count: 8, baseLatency: 110, variance: 10, deadline: 400, tailRate: 1, slowBranchIndex: 7, slowBranchLatency: 600, optionalSlowBranch: true } },
];

export default function FanOutLatencySimulator() {
  const [n, setN] = useState(5);
  const [baseLatency, setBaseLatency] = useState(120);
  const [variance, setVariance] = useState(40);
  const [parallel, setParallel] = useState(true);
  const [deadline, setDeadline] = useState(300);
  const [tailRate, setTailRate] = useState(1);
  const [slowBranchIndex, setSlowBranchIndex] = useState(-1);
  const [slowBranchLatency, setSlowBranchLatency] = useState(600);
  const [optionalSlowBranch, setOptionalSlowBranch] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const optionalIndex = optionalSlowBranch && slowBranchIndex >= 0 ? slowBranchIndex : -1;
  const clearPreset = () => setActivePreset(null);

  const applyScenario = (values: ScenarioValues, label: string) => {
    setN(values.count); setBaseLatency(values.baseLatency); setVariance(values.variance); setDeadline(values.deadline);
    setTailRate(values.tailRate); setSlowBranchIndex(values.slowBranchIndex); setSlowBranchLatency(values.slowBranchLatency || 600);
    setOptionalSlowBranch(values.optionalSlowBranch); setParallel(true); setActivePreset(label);
  };

  const sim = useMemo(() => {
    const draw = simulateFanout(n, baseLatency, variance, parallel, slowBranchIndex, slowBranchLatency, optionalIndex);
    const totals: number[] = [];
    for (let t = 0; t < PERCENTILE_TRIALS; t++) {
      totals.push(simulateFanout(n, baseLatency, variance, parallel, slowBranchIndex, slowBranchLatency, optionalIndex, t).responseLatency);
    }
    totals.sort((a, b) => a - b);
    const percentileOf = (p: number) => {
      const idx = clamp(Math.round((p / 100) * (totals.length - 1)), 0, totals.length - 1);
      return totals[idx];
    };

    return {
      ...draw,
      p50: percentileOf(50),
      p95: percentileOf(95),
      p99: percentileOf(99),
      headroom: deadline - draw.responseLatency,
      deadlineMiss: draw.responseLatency > deadline,
      tailRisk: independentTailRisk(tailRate, draw.requiredCount),
    };
  }, [n, baseLatency, variance, parallel, slowBranchIndex, slowBranchLatency, optionalIndex, deadline, tailRate]);

  const chartW = 560;
  const rowH = 22;
  const chartH = n * rowH + 24;
  const maxEnd = Math.max(...sim.branches.map((branch) => branch.end), deadline, 1);
  const scale = (chartW - 96) / maxEnd;
  const deadlineX = 74 + deadline * scale;
  const responseX = 74 + sim.responseLatency * scale;
  const statusColor = sim.deadlineMiss ? '#ef4444' : sim.headroom < 50 ? '#F7933C' : '#22c55e';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>TAIL LATENCY LAB</div>
      <div style={{ font: '700 .8rem Poppins, sans-serif', color: 'var(--k-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Try a scenario</div>
      <PresetBar presets={SCENARIOS} activeLabel={activePreset} onSelect={applyScenario} accent="#6CA6FF" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <RangeControl label="Downstream branches" value={n} onChange={(value) => { setN(value); if (slowBranchIndex >= value) { setSlowBranchIndex(-1); setOptionalSlowBranch(false); } clearPreset(); }} min={1} max={20} accent="#6CA6FF" />
        <RangeControl label="Base latency" value={baseLatency} onChange={(value) => { setBaseLatency(value); clearPreset(); }} min={20} max={500} step={10} formatValue={(value) => `${value}ms`} accent="#6CA6FF" />
        <RangeControl label="Latency variance" value={variance} onChange={(value) => { setVariance(value); clearPreset(); }} min={0} max={100} step={5} formatValue={(value) => `±${value}%`} accent="#F7933C" />
        <RangeControl label="Response deadline" value={deadline} onChange={(value) => { setDeadline(value); clearPreset(); }} min={50} max={1500} step={10} formatValue={(value) => `${value}ms`} accent="#ef4444" />
        <RangeControl label="Slow-tail chance / required dependency" value={tailRate} onChange={(value) => { setTailRate(value); clearPreset(); }} min={0} max={20} step={1} formatValue={(value) => `${value}%`} accent="#DF78A0" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', marginBottom: '.75rem' }}>
        {[{ value: true, label: 'Parallel fan-out' }, { value: false, label: 'Serial calls' }].map(({ value, label }) => (
          <button key={label} type="button" aria-pressed={parallel === value} onClick={() => { setParallel(value); clearPreset(); }} style={{ background: parallel === value ? '#6CA6FF' : 'transparent', color: parallel === value ? '#fff' : 'var(--k-text-muted)', border: '1px solid ' + (parallel === value ? '#6CA6FF' : 'var(--k-border)'), padding: '.5rem .85rem', borderRadius: '.5rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>{label}</button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--k-text-muted)' }}><input type="checkbox" checked={optionalSlowBranch} disabled={slowBranchIndex < 0} onChange={(event) => { setOptionalSlowBranch(event.target.checked); clearPreset(); }} /> Slow branch is optional</label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Forced slow branch" value={slowBranchIndex + 1} onChange={(value) => { setSlowBranchIndex(value === 0 ? -1 : value - 1); clearPreset(); }} min={0} max={n} formatValue={(value) => value === 0 ? 'off' : `#${value}`} accent="#DF78A0" />
        {slowBranchIndex >= 0 && <RangeControl label="Forced branch latency" value={slowBranchLatency} onChange={(value) => { setSlowBranchLatency(value); clearPreset(); }} min={100} max={1500} step={10} formatValue={(value) => `${value}ms`} accent="#DF78A0" />}
      </div>
      <VisualizationContainer minHeight={chartH}>
        <div style={{ fontSize: '.73rem', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>REQUEST → {parallel ? 'FAN-OUT' : 'SERIAL'} → DOWNSTREAM LATENCIES → SLOWEST REQUIRED BRANCH → RESPONSE</div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label={`Completion timeline with ${sim.requiredCount} required and ${sim.optionalCount} optional branches. Response completes at ${sim.responseLatency} milliseconds; the ${deadline} millisecond deadline is ${sim.deadlineMiss ? 'missed' : 'met'}.`}>
          <line x1={74} x2={chartW - 12} y1={18} y2={18} stroke="var(--k-border)" /><text x={74} y={11} fontSize="9" fill="var(--k-text-muted)">0ms</text>
          <line x1={deadlineX} x2={deadlineX} y1={18} y2={chartH - 8} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} /><text x={Math.min(deadlineX + 4, chartW - 90)} y={11} fontSize="9" fill="#ef4444" fontWeight="700">deadline {deadline}ms</text>
          <line x1={responseX} x2={responseX} y1={18} y2={chartH - 8} stroke={statusColor} strokeDasharray="3 3" strokeWidth={1.5} />
          {sim.branches.map((branch, index) => { const y = 28 + index * rowH; const x = 74 + branch.start * scale; const critical = index === sim.criticalIndex; const fill = !branch.required ? '#94a3b8' : critical ? '#ef4444' : '#6CA6FF'; return <g key={index}><text x={68} y={y + 13} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">#{index + 1} {branch.required ? 'required' : 'optional'}</text><rect x={x} y={y} width={Math.max(2, branch.latency * scale)} height={18} rx={4} fill={fill} opacity={branch.required ? .92 : .55} /><text x={x + 4} y={y + 12} fontSize="9" fill="#fff" fontWeight="700">{branch.latency}ms{critical ? ' · critical' : ''}</text></g>; })}
        </svg>
      </VisualizationContainer>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.75rem', marginTop: '1.25rem' }}>
        <Metric label="Critical path" value={`#${sim.criticalIndex + 1} · ${sim.responseLatency}ms`} color={statusColor} sublabel="slowest required branch" />
        <Metric label="Deadline headroom" value={sim.deadlineMiss ? `${Math.abs(sim.headroom)}ms over` : `${sim.headroom}ms left`} color={statusColor} sublabel={`${sim.deadlineMiss ? 'deadline miss' : 'deadline met'} · not a dependency failure`} />
        <Metric label="Required / optional" value={`${sim.requiredCount} / ${sim.optionalCount}`} sublabel="only required branches gate this response" />
        <Metric label="If fully serial" value={`${sim.serialTotal}ms`} sublabel={parallel ? `${(sim.serialTotal / sim.responseLatency).toFixed(1)}× this response` : 'includes optional work too'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.75rem', marginTop: '.75rem' }}>
        <Metric label="P50 response" value={`${sim.p50}ms`} color="#6CA6FF" sublabel={`${PERCENTILE_TRIALS} deterministic trials`} /><Metric label="P95 response" value={`${sim.p95}ms`} color="#F7933C" sublabel="model estimate" /><Metric label="P99 response" value={`${sim.p99}ms`} color="#ef4444" sublabel="model estimate, not production telemetry" /><Metric label="P(≥1 slow-tail event)" value={`${(sim.tailRisk * 100).toFixed(1)}%`} color={sim.tailRisk >= .25 ? '#ef4444' : sim.tailRisk >= .08 ? '#F7933C' : '#22c55e'} sublabel={`${tailRate}% × ${sim.requiredCount} independent branches`} />
      </div>
      <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', margin: '.65rem 0 0', lineHeight: 1.55 }}>Tail amplification uses <strong>1 − (1 − f)<sup>n</sup></strong> only under an independence assumption. Real services can share hosts, networks, queues, or deploys, so correlation can make observed tail risk higher or lower. Per-service P99 values do not produce an exact end-to-end P99.</p>
      <div style={{ marginTop: '1.1rem' }}><Warning level={sim.deadlineMiss ? 'danger' : sim.headroom < 50 ? 'warn' : 'info'} title={sim.deadlineMiss ? 'The required critical path misses this response deadline' : sim.optionalCount > 0 ? 'Optional work returns after the caller response here' : 'Parallel latency is the slowest required branch, not their sum'}>{sim.deadlineMiss ? `The response waits for required branch #${sim.criticalIndex + 1} until ${sim.responseLatency}ms, exceeding the ${deadline}ms deadline by ${Math.abs(sim.headroom)}ms. The model does not call this a dependency failure: a deadline miss and a failed dependency are different events.` : sim.optionalCount > 0 ? 'This model assumes a partial response can return without the optional branch. That branch is still work with cost, freshness, and error-handling consequences; optional does not automatically mean safe to ignore.' : 'Adding parallel dependencies does not universally make a request slower: the current response is gated by the slowest required branch. More branches do increase the chance that a tail outlier becomes that critical branch.'}</Warning></div>
      <div style={{ marginTop: '1rem' }}><Insight what={sim.deadlineMiss ? `The current critical path is ${sim.responseLatency}ms, so this scenario misses the ${deadline}ms deadline.` : `The required response completes in ${sim.responseLatency}ms with ${sim.headroom}ms of deadline headroom.`} why="Parallel fan-out uses the maximum required completion time; serial calls add work sequentially. The percentile figures are deterministic samples of this simplified latency model, not a measurement of your system." tip={sim.deadlineMiss ? 'Set explicit downstream time budgets, then check the timeout chain before adding retries. A retry can consume the remaining deadline.' : sim.tailRisk > .1 ? 'Investigate the highest-tail required dependency, its shared failure domains, and whether the response contract can be decomposed.' : 'Keep the contract explicit: mark a dependency optional only when the caller can safely receive a partial response.'} /></div>
      <ShareResultFoundation monster="toolooo" contentType="tool" slug="fan-out-latency-simulator" title="Fan-Out Latency Simulator" result={{ summary: `Educational fan-out model: ${sim.requiredCount} required and ${sim.optionalCount} optional branches; ${parallel ? 'parallel' : 'serial'} response ${sim.responseLatency}ms; ${sim.deadlineMiss ? `${Math.abs(sim.headroom)}ms over` : `${sim.headroom}ms headroom under`} a ${deadline}ms deadline. Tail-risk figure assumes independent branches.` }} />
    </div>
  );
}
