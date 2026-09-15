import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import ShareResultFoundation from '../ShareResultFoundation';
import { clamp, formatNumber } from '../shared/mathHelpers';

const MAX_PARENTS = 500;
const PER_ITEM = '#ef4444';
const JOIN = '#22c55e';
const BATCH = '#6CA6FF';
const SPLIT = '#F7933C';

type Strategy = 'per-item' | 'join-eager' | 'batched' | 'split';

interface Scenario { parents: number; childrenPerParent: number; roundTripMs: number; requestRate: number; queryBudget: number; strategy: Strategy; }
const SCENARIOS: { label: string; values: Scenario }[] = [
  { label: 'Small list', values: { parents: 5, childrenPerParent: 3, roundTripMs: 5, requestRate: 10, queryBudget: 10, strategy: 'per-item' } },
  { label: 'N+1 at scale', values: { parents: 100, childrenPerParent: 4, roundTripMs: 12, requestRate: 20, queryBudget: 10, strategy: 'per-item' } },
  { label: 'Eager JOIN', values: { parents: 100, childrenPerParent: 4, roundTripMs: 12, requestRate: 20, queryBudget: 10, strategy: 'join-eager' } },
  { label: 'Batched related load', values: { parents: 100, childrenPerParent: 4, roundTripMs: 12, requestRate: 20, queryBudget: 10, strategy: 'batched' } },
  { label: 'High latency', values: { parents: 50, childrenPerParent: 4, roundTripMs: 35, requestRate: 20, queryBudget: 10, strategy: 'per-item' } },
];
const STRATEGIES: { label: string; values: Strategy }[] = [
  { label: 'Per-item load', values: 'per-item' },
  { label: 'JOIN / eager', values: 'join-eager' },
  { label: 'Batched related load', values: 'batched' },
  { label: 'Split query', values: 'split' },
];

export function modelQueryStrategy(strategy: Strategy, parentsRaw: number, childrenRaw: number, roundTripMsRaw: number, requestRateRaw: number, queryBudgetRaw: number) {
  const parents = clamp(Math.round(Number.isFinite(parentsRaw) ? parentsRaw : 1), 1, MAX_PARENTS);
  const childrenPerParent = clamp(Math.round(Number.isFinite(childrenRaw) ? childrenRaw : 1), 1, 50);
  const roundTripMs = clamp(Number.isFinite(roundTripMsRaw) ? roundTripMsRaw : 1, 1, 100);
  const requestRate = clamp(Number.isFinite(requestRateRaw) ? requestRateRaw : 1, 1, 500);
  const queryBudget = clamp(Math.round(Number.isFinite(queryBudgetRaw) ? queryBudgetRaw : 1), 1, 500);
  const queryCount = strategy === 'per-item' ? 1 + parents : strategy === 'join-eager' ? 1 : 2;
  const simulatedRoundTrips = queryCount;
  const sequentialLatencyMs = simulatedRoundTrips * roundTripMs;
  const joinedRows = parents * childrenPerParent;
  return {
    parents, childrenPerParent, roundTripMs, requestRate, queryBudget, strategy, queryCount, simulatedRoundTrips, sequentialLatencyMs,
    queryMultiplier: queryCount,
    potentialQueryRate: queryCount * requestRate,
    joinedRows,
    exceedsBudget: queryCount > queryBudget,
  };
}

const strategyColor: Record<Strategy, string> = { 'per-item': PER_ITEM, 'join-eager': JOIN, batched: BATCH, split: SPLIT };
const strategyTitle: Record<Strategy, string> = { 'per-item': 'Per-item related load', 'join-eager': 'JOIN / eager load', batched: 'Batched related load', split: 'Split query' };

export default function NPlusOneQueryVisualizer() {
  const [parents, setParents] = useState(12);
  const [childrenPerParent, setChildrenPerParent] = useState(4);
  const [roundTripMs, setRoundTripMs] = useState(5);
  const [requestRate, setRequestRate] = useState(20);
  const [queryBudget, setQueryBudget] = useState(10);
  const [strategy, setStrategy] = useState<Strategy>('per-item');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const model = useMemo(() => modelQueryStrategy(strategy, parents, childrenPerParent, roundTripMs, requestRate, queryBudget), [strategy, parents, childrenPerParent, roundTripMs, requestRate, queryBudget]);
  const alternatives = useMemo(() => STRATEGIES.map(({ values }) => modelQueryStrategy(values, parents, childrenPerParent, roundTripMs, requestRate, queryBudget)), [parents, childrenPerParent, roundTripMs, requestRate, queryBudget]);
  const applyScenario = (values: Scenario, label: string) => { setParents(values.parents); setChildrenPerParent(values.childrenPerParent); setRoundTripMs(values.roundTripMs); setRequestRate(values.requestRate); setQueryBudget(values.queryBudget); setStrategy(values.strategy); setActiveScenario(label); };
  const applyStrategy = (next: Strategy) => { setStrategy(next); setActiveScenario(null); };
  const visibleRelated = Math.min(model.parents, 6);
  const aggregateRelated = model.parents - visibleRelated;
  const pressureLens = strategy === 'per-item' && model.parents >= 10 ? 'Too many round trips' : model.roundTripMs >= 20 ? 'High round-trip latency' : strategy === 'join-eager' && model.joinedRows >= 250 ? 'JOIN row expansion' : 'Measured strategy trade-off';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ font: '800 .76rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>QUERY MULTIPLICATION LAB</div>
      <PresetBar presets={SCENARIOS} activeLabel={activeScenario} onSelect={applyScenario} accent={PER_ITEM} />
      <div style={{ font: '800 .7rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)', marginBottom: '.45rem' }}>LOADING STRATEGY</div>
      <PresetBar presets={STRATEGIES} activeLabel={STRATEGIES.find((item) => item.values === strategy)?.label} onSelect={(value) => applyStrategy(value)} accent={strategyColor[strategy]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Parent rows" value={parents} onChange={setParents} min={1} max={MAX_PARENTS} step={1} formatValue={(value) => `${value} parents`} accent={PER_ITEM} />
        <RangeControl label="Related rows per parent" value={childrenPerParent} onChange={setChildrenPerParent} min={1} max={20} step={1} formatValue={(value) => `${value} children`} accent={BATCH} />
        <RangeControl label="Round-trip latency" value={roundTripMs} onChange={setRoundTripMs} min={1} max={100} step={1} formatValue={(value) => `${value}ms`} accent={BATCH} />
      </div>
      <AdvancedDisclosure summary="Request scale & query budget">
        <RangeControl label="Application requests" value={requestRate} onChange={setRequestRate} min={1} max={200} step={1} formatValue={(value) => `${value}/s`} accent="#DF78A0" />
        <RangeControl label="Your query budget" value={queryBudget} onChange={setQueryBudget} min={1} max={200} step={1} formatValue={(value) => `${value} queries/request`} accent="#DF78A0" />
      </AdvancedDisclosure>

      <VisualizationContainer minHeight={245}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .65fr) 28px minmax(0, 2fr)', gap: '.75rem', alignItems: 'center', padding: '.5rem' }}>
          <div style={{ padding: '.75rem', borderRadius: '.65rem', background: 'var(--k-bg-elevated)', fontWeight: 800, textAlign: 'center' }}>1 DATA REQUEST</div>
          <div aria-hidden="true" style={{ textAlign: 'center', color: 'var(--k-text-muted)' }}>→</div>
          <div>
            <div style={{ padding: '.55rem .7rem', borderRadius: '.45rem', background: BATCH, color: '#10203a', fontWeight: 800, fontSize: '.8rem' }}>Q1 · Load {model.parents} parent rows</div>
            <div style={{ display: 'grid', gap: '.35rem', marginTop: '.5rem' }} aria-label={`${strategyTitle[strategy]} produces ${model.queryCount} simulated queries and ${model.simulatedRoundTrips} simulated database round trips`}>
              {strategy === 'per-item' ? <>
                {Array.from({ length: visibleRelated }, (_, index) => <div key={index} style={{ padding: '.45rem .7rem', borderLeft: `4px solid ${PER_ITEM}`, background: 'var(--k-bg-elevated)', fontSize: '.78rem' }}>Q{index + 2} · Related data for parent {index + 1} · round trip {index + 2}</div>)}
                {aggregateRelated > 0 && <div style={{ padding: '.45rem .7rem', borderLeft: `4px dashed ${PER_ITEM}`, background: 'var(--k-bg-elevated)', fontSize: '.78rem', fontWeight: 700 }}>… +{aggregateRelated} related queries / round trips</div>}
              </> : <div style={{ padding: '.55rem .7rem', borderLeft: `4px solid ${strategyColor[strategy]}`, background: 'var(--k-bg-elevated)', fontSize: '.8rem' }}>{strategy === 'join-eager' ? 'One joined command loads the selected relationship.' : strategy === 'batched' ? 'Q2 · Load related rows for this parent set.' : 'Q2 · A simplified related-data command; exact split behavior depends on framework and query shape.'}</div>}
            </div>
          </div>
        </div>
      </VisualizationContainer>
      <div style={{ display: 'flex', gap: '.75rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><b style={{ color: BATCH }}>Q1</b> parent query</span><span><b style={{ color: PER_ITEM }}>Q2…</b> related-data commands</span><span>Each label includes its simulated round-trip order.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.25rem' }}>
        <Metric label="Total queries" value={String(model.queryCount)} color={strategyColor[strategy]} sublabel={strategy === 'per-item' ? `1 parent + ${model.parents} related queries` : `${strategyTitle[strategy]} model`} />
        <Metric label="Simulated round trips" value={String(model.simulatedRoundTrips)} sublabel="assumes sequential command execution" />
        <Metric label="Query multiplier" value={`${model.queryMultiplier}×`} sublabel="one application request → database commands" />
        <Metric label="Sequential estimate" value={`${formatNumber(model.sequentialLatencyMs, 0)}ms`} sublabel={`${model.simulatedRoundTrips} × ${model.roundTripMs}ms; not measured page latency`} />
        <Metric label="Potential query rate" value={`${formatNumber(model.potentialQueryRate)}/s`} sublabel={`${model.queryCount} queries/request × ${model.requestRate}/s`} />
        <Metric label="Query budget" value={model.exceedsBudget ? `${model.queryCount} / ${model.queryBudget}` : `${model.queryCount} ≤ ${model.queryBudget}`} color={model.exceedsBudget ? PER_ITEM : JOIN} sublabel="your educational budget, not a universal limit" />
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--k-border)', borderRadius: '.75rem', background: 'var(--k-bg-elevated)' }}>
        <div style={{ font: '800 .7rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)' }}>STRATEGY TRADE-OFFS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.65rem', marginTop: '.65rem' }}>
          {alternatives.map((alternative) => <div key={alternative.strategy} style={{ borderLeft: `4px solid ${strategyColor[alternative.strategy]}`, padding: '.45rem .6rem', background: 'var(--k-bg-card)', fontSize: '.78rem' }}><strong>{strategyTitle[alternative.strategy]}</strong><br />{alternative.queryCount} queries · {alternative.simulatedRoundTrips} simulated round trips<br /><span style={{ color: 'var(--k-text-muted)' }}>{alternative.strategy === 'per-item' ? 'Retrieves related data when accessed; repeated access can multiply round trips.' : alternative.strategy === 'join-eager' ? `Reduces round trips; simplified join expansion ≈ ${alternative.joinedRows} rows, not bytes.` : alternative.strategy === 'batched' ? 'Reduces per-item round trips; retrieves related data in a larger set.' : 'May avoid some JOIN expansion; extra commands and behavior vary by framework.'}</span></div>)}
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', border: '1.5px solid var(--k-border)', borderRadius: '.75rem' }} aria-label={`Connection pressure bridge: ${model.potentialQueryRate} potential query executions per second. This does not mean ${model.potentialQueryRate} connections.`}>
        <div style={{ font: '800 .7rem Poppins, sans-serif', letterSpacing: '.06em', color: 'var(--k-text-muted)' }}>CONNECTION PRESSURE BRIDGE</div>
        <p style={{ margin: '.45rem 0 0', fontSize: '.85rem', color: 'var(--k-text)' }}><strong>{formatNumber(model.potentialQueryRate)}/s potential query executions</strong> can keep pooled connections busy longer under this model. It does <strong>not</strong> mean {formatNumber(model.potentialQueryRate)} simultaneous connections: commands may reuse pooled connections sequentially.</p>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {model.exceedsBudget ? <Warning level="danger" title={`This scenario exceeds your ${model.queryBudget}-query budget`}><span>This scenario behaves like an N+1 pattern only when related data is accessed once per parent. It is a model, not source-code or SQL-log detection.</span></Warning> : <Warning level="good" title="This scenario stays within your chosen query budget"><span>Fewer queries are not automatically faster: data size, indexes, query plans, network latency, row duplication, and database load still matter.</span></Warning>}
      </div>
      <div style={{ marginTop: '1rem' }}><Insight what={`${strategyTitle[strategy]} creates ${model.queryCount} queries and ${model.simulatedRoundTrips} sequential simulated round trips for ${model.parents} parents.`} why={`${pressureLens} is the simulated pressure source. ${strategy === 'join-eager' ? `The JOIN estimate has about ${model.joinedRows} related rows; that is a row-shape illustration, not transferred bytes.` : 'Repeated database work can increase pool pressure, but does not create one connection per query.'}`} tip={strategy === 'per-item' && model.parents >= 10 ? 'Test batched or eager loading, then compare row expansion and the resulting query count before choosing a strategy.' : strategy === 'join-eager' && model.joinedRows >= 250 ? 'The JOIN removed round trips but expands the result shape. Compare batched or split loading before assuming one large JOIN is cheaper.' : model.roundTripMs >= 20 ? 'Round-trip latency dominates this sequential model. Reducing repeated commands may matter more than tuning one command.' : 'Query count is modest in this model. Measure real query shape and latency before optimizing solely for a count.'} /></div>
      <ShareResultFoundation monster="toolooo" contentType="tool" slug="n-plus-1-query-visualizer" title="N+1 Query Visualizer" result={{ summary: `Educational query model: ${strategyTitle[strategy]}, ${model.parents} parent rows, ${model.queryCount} queries, ${model.simulatedRoundTrips} simulated round trips, ${model.queryMultiplier}× multiplier, and ${model.potentialQueryRate}/s potential query executions.` }} />
    </div>
  );
}
