import { useId, useMemo, useState } from 'react';
import Insight from '../shared/Insight';
import Warning from '../shared/Warning';
import { trackToolResult } from '../../../utils/analytics';
import { contextBounds, contextDefaults, contextGroups, contextPresets, contextStrategies, simulateContext, type ContextConfig, type ContextNumber, type ContextStrategy } from './contextEngineeringModel';
import './newTools.css';

const format = (value: number) => Math.round(value).toLocaleString('en-US');
const percent = (value: number | null) => value === null ? 'Not applicable' : `${(value * 100).toFixed(1)}%`;
function NumericField({ field, config, change }: { field: ContextNumber; config: ContextConfig; change: (key: ContextNumber, value: number) => void }) {
  const id = useId(), bound = contextBounds[field];
  return <label htmlFor={id}>{bound.label}<input id={id} type="number" min={bound.min} max={bound.max} step={1} value={config[field]} onChange={event => change(field, Number(event.target.value))} /></label>;
}
function BudgetBar({ label, total, signal, window, reserve, scale }: { label: string; total: number; signal: number; window: number; reserve: number; scale: number }) {
  return <div className="tool-box">
    <strong>{label}: {format(total)} input tokens</strong>
    <div aria-hidden="true" style={{ position: 'relative', display: 'flex', height: 24, margin: '.65rem 0', background: 'var(--k-bg-card)', border: '1px solid var(--k-text-muted)', borderRadius: 5, overflow: 'hidden' }}>
      <span style={{ width: `${signal / scale * 100}%`, background: '#F7933C' }} />
      <span style={{ width: `${Math.max(0, total - signal) / scale * 100}%`, background: 'var(--k-border)' }} />
      <span style={{ width: `${reserve / scale * 100}%`, background: 'var(--k-text-muted)' }} />
      <span style={{ position: 'absolute', left: `calc(${window / scale * 100}% - 2px)`, top: 0, bottom: 0, borderLeft: '2px dashed var(--k-text)' }} />
    </div>
    <small>Nonduplicate relevant estimate: {format(signal)} · other input: {format(total - signal)} · output reserve: {format(reserve)}. {total + reserve > window ? `OVERFLOW: ${format(total + reserve - window)} tokens beyond the window.` : `Free: ${format(window - total - reserve)} tokens.`}</small>
  </div>;
}
const strategyHelp: Record<ContextStrategy, string> = {
  none: 'Everything enters the window. No automatic truncation hides an overflow.',
  topK: 'Keep the highest-ranked synthetic retrieval bands. A small K can remove relevant evidence; ranking is assumed, not measured.',
  threshold: 'Remove nonprotected relevance bands below the threshold. Whole bands may disappear, including useful supporting context.',
  dedup: 'Remove assumed duplicates. Relevant duplicate copies shrink, while the nonduplicate relevant estimate is preserved.',
  recency: 'Remove assumed stale portions only from sources marked freshness-sensitive. Historical evidence may still be useful.',
  compression: 'Shrink history with an assumed loss and a token-capacity ceiling. No summarization occurs and compression is not lossless.',
  memory: 'Filter memory by relevance and remove its stale portion only when marked freshness-sensitive. This does not resolve conflicting facts.',
  tools: 'Retain the assumed relevant share of tool definitions. This assumes good tool selection; it does not prove tool correctness or permissions.',
  combined: 'Apply Top-K → relevance threshold → deduplication → memory selection → history compression → tool pruning, sequentially. Savings are not added twice.',
};

export default function ContextEngineeringSimulator() {
  const id = useId();
  const [config, setConfig] = useState<ContextConfig>({ ...contextDefaults });
  const [strategy, setStrategy] = useState<ContextStrategy>('none');
  const [preset, setPreset] = useState('Production Agent');
  const [message, setMessage] = useState('');
  const review = useMemo(() => {
    try { return { result: simulateContext(config, strategy), error: '' }; }
    catch (failure) { return { result: undefined, error: (failure as Error).message }; }
  }, [config, strategy]);
  function change(key: ContextNumber, value: number) {
    setConfig(previous => ({ ...previous, [key]: value, ...(key === 'toolRelevance' ? { unusedTools: Math.min(previous.unusedTools, Math.max(0, 100 - value)) } : {}) }));
    setPreset('Custom'); setMessage('');
  }
  const r = review.result;
  const parameters: ContextNumber[] = [
    ...(['topK', 'combined'].includes(strategy) ? ['topK' as const] : []),
    ...(['threshold', 'memory', 'combined'].includes(strategy) ? ['threshold' as const] : []),
    ...(['compression', 'combined'].includes(strategy) ? ['historyRetained' as const, 'compressionLoss' as const] : []),
  ];
  const metrics: Array<[string, number | string, number | string]> = r ? [
    ['Input tokens', format(r.before.total), format(r.after.total)],
    ['Relevant tokens (assumed)', format(r.before.relevant), format(r.after.relevant)],
    ['Relevance density', percent(r.before.density), percent(r.after.density)],
    ['Duplicate tokens', format(r.before.duplicate), format(r.after.duplicate)],
    ['Stale tokens', format(r.before.stale), format(r.after.stale)],
    ['Conflict-affected token estimate', format(r.before.conflicts), format(r.after.conflicts)],
    ['Irrelevant tool-definition overhead', format(r.before.toolOverhead), format(r.after.toolOverhead)],
    ['Assumed unused tool tokens', format(r.before.unusedToolTokens), format(r.after.unusedToolTokens)],
    ['Nonduplicate relevant estimate', format(r.before.uniqueRelevant), format(r.after.uniqueRelevant)],
  ] : [];
  return <div className="tool-workbench">
    <p><strong>More context is not automatically better.</strong> Compare what enters a window and what each strategy removes. Numeric assumptions only—no private prompts, model calls or accuracy predictions.</p>
    <div className="tool-grid">
      <label htmlFor={`${id}-preset`}>Scenario<select id={`${id}-preset`} value={preset} onChange={event => { const item = contextPresets.find(p => p.name === event.target.value); if (item) { setConfig({ ...item.config }); setPreset(item.name); setMessage(''); trackToolResult(); } }}>{preset === 'Custom' && <option value="Custom" disabled>Custom settings</option>}{contextPresets.map(item => <option key={item.name}>{item.name}</option>)}</select></label>
      <label htmlFor={`${id}-strategy`}>Compare strategy<select id={`${id}-strategy`} value={strategy} onChange={event => { setStrategy(event.target.value as ContextStrategy); setMessage(''); if (review.result) trackToolResult(); }}>{Object.entries(contextStrategies).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <div className="tool-grid"><NumericField field="window" config={config} change={change} /><NumericField field="reserve" config={config} change={change} /></div>
    <p>{strategyHelp[strategy]}</p>
    {parameters.length > 0 && <div className="tool-grid">{parameters.map(field => <NumericField key={field} field={field} config={config} change={change} />)}</div>}
    <div className="tool-actions"><button type="button" onClick={() => { setConfig({ ...contextDefaults }); setStrategy('none'); setPreset('Production Agent'); setMessage('Production Agent defaults restored.'); }}>Reset</button></div>
    <span role="status">{message}</span>
    {review.error && <div role="alert"><Warning level="danger" title={review.error} /></div>}
    {r && <>
      <section aria-label="Context comparison">
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Context health — planning signals</h2>
        <Insight what={`Engineered: ${r.health}${r.after.overflow ? ' · OVERFLOW' : ''} · ${format(r.after.total)} / ${format(r.available)} available input tokens · ${r.after.pressure} pressure`} why={`Naive context: ${r.biggestProblem}`} tip={r.best ? `Best first candidate: ${contextStrategies[r.best.strategy]}. Saves ${format(r.best.saved)} tokens. ${r.best.preserved === null ? 'No assumed relevant-token baseline is available.' : `Retains ${percent(r.best.preserved)} of the nonduplicate relevant-token estimate.`} ${r.best.preserved !== null && r.best.preserved < .85 ? 'High-loss candidate: review the missing evidence before use.' : 'Validate selection against the actual task.'}` : 'No modeled strategy saves tokens here. Keep the needed task evidence rather than optimizing for an empty window.'} />
        <p>Selected strategy saves <strong>{format(r.saved)} tokens</strong>. Signal preserved: <strong>{percent(r.preserved)}</strong> of the nonduplicate relevant-token estimate, not recall or answer quality. Available input = {format(config.window)} window − {format(config.reserve)} reserved output.</p>
      </section>
      <div className="tool-grid"><BudgetBar label="Naive" total={r.before.total} signal={r.before.uniqueRelevant} window={config.window} reserve={config.reserve} scale={Math.max(config.window, r.before.total + config.reserve)} /><BudgetBar label="Engineered" total={r.after.total} signal={r.after.uniqueRelevant} window={config.window} reserve={config.reserve} scale={Math.max(config.window, r.before.total + config.reserve)} /></div>
      <small>Orange: nonduplicate relevant estimate · border shade: other input · muted: output reserve · dashed marker: window limit. Both bars use the same scale: the larger of the window or naive input plus reserve. Space beyond the marker represents overflow, not available capacity.</small>
      {r.conflictUnresolved && <Warning level="warn" title="CONFLICT — source verification still required">The initial memory/retrieval assumptions include conflicts. Fictional example: memory says “API v1 required”; a retrieved document says “API v2 required.” Filtering may remove conflict-affected tokens; it does not decide which fact is correct. Preserve provenance, verify trusted/current sources and surface disagreement.</Warning>}
      <div className="tool-table" role="region" aria-label="Before and after metrics" tabIndex={0}><table><caption>Naive versus engineered — overlapping diagnostic estimates, not additive token buckets</caption><thead><tr><th scope="col">Metric</th><th scope="col">Naive</th><th scope="col">Engineered</th></tr></thead><tbody>{metrics.map(([label, before, after]) => <tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{after}</td></tr>)}</tbody></table></div>
      <section aria-label="Optimization trade-offs"><h3>Biggest improvement</h3><p>{r.largestSaving.saved > 0 ? `${r.largestSaving.name}: ${format(r.largestSaving.saved)} tokens removed.` : 'No input removed by the selected strategy.'}</p><h3>Main trade-off</h3><p>{r.uniqueRelevantRemoved > 0 ? `${format(r.uniqueRelevantRemoved)} nonduplicate relevant tokens are removed in this model. Useful evidence may be lost.` : 'No nonduplicate relevant-token loss under these assumptions. Real ranking, deduplication and selection can still discard needed evidence.'}{['compression', 'combined'].includes(strategy) && ' Compression uses an assumed loss and a capacity cap; no real summary is produced.'}</p></section>
      <details><summary>Source budget and assembly priority</summary><p>Eight sources, each represented by two aggregate relevance bands—never individual tokens. Priority orders this planning view only. It is not a universal LLM instruction hierarchy. System instructions, the current task and required constraints are never removed by these strategies.</p>
        {r.before.rows.map(row => { const after = r.after.rows.find(item => item.id === row.id)!; return <div className="tool-box" key={row.id}><strong>{row.priority}. {row.name}{row.protected ? ' · protected' : ''}</strong><p>{format(row.tokens)} → {format(after.tokens)} tokens</p><div aria-hidden="true" style={{ height: 10, background: 'var(--k-border)', borderRadius: 5, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, after.tokens / r.available * 100)}%`, background: '#F7933C' }} /></div><small>Engineered share of available budget: {percent(after.tokens / r.available)}. Nonduplicate relevant estimate: {format(after.signal)} tokens.</small></div>; })}
        <p>Output reserve: {format(config.reserve)} tokens. It is not included in input totals.</p>
      </details>
      <details><summary>Compare all strategies and candidate stack</summary><p>Best-first selection favors the largest saving retaining at least 85% of the assumed nonduplicate relevant volume; this is an editorial planning threshold, not an adequacy guarantee. If none qualifies, the largest saving is labeled high-loss.</p>
        <div className="tool-table" role="region" aria-label="Strategy comparison" tabIndex={0}><table><caption>Each strategy starts from the same naive context</caption><thead><tr><th scope="col">Strategy</th><th scope="col">Tokens removed</th><th scope="col">Signal estimate retained</th></tr></thead><tbody>{r.ranking.map(item => <tr key={item.strategy}><th scope="row">{contextStrategies[item.strategy]}</th><td>{format(item.saved)}</td><td>{percent(item.preserved)}</td></tr>)}</tbody></table></div>
        <h3>Candidate combined stack</h3><p>{r.recommendedStack.length ? r.recommendedStack.join(' + ') : 'No combined step removes tokens.'}</p><p>Combined signal estimate retained: {percent(r.combinedPreserved)}. {r.combinedPreserved !== null && r.combinedPreserved < .85 ? 'This stack has significant modeled loss; use the best-first candidate or inspect evidence before adopting it.' : 'Validate every selection against real task evidence before adopting this stack.'}</p>
      </details>
    </>}
    <details><summary>Adjust source assumptions</summary><p>All values are hypothetical aggregate estimates. Relevance, duplicates, staleness and conflicts can overlap. Unused tools are a subset of nonrelevant tools, so unused % + relevant % must not exceed 100. Changing relevant % reduces unused % if necessary.</p>
      {contextGroups.map(group => <fieldset key={group.id} className="tool-box"><legend>{group.name}</legend><div className="tool-grid">{group.fields.map(field => <NumericField key={field} field={field} config={config} change={change} />)}</div>{group.freshness && <label className="tool-check"><input type="checkbox" checked={config[group.freshness]} onChange={event => { const key = group.freshness!; setConfig(previous => ({ ...previous, [key]: event.target.checked })); setPreset('Custom'); }} />Freshness-sensitive: allow stale portions to be filtered</label>}</fieldset>)}
    </details>
    <details><summary>How the model stays honest</summary><p>Each source is split equally into two synthetic bands at its entered relevance ± up to 25 percentage points, bounded by 0–100. Top-K takes the higher band first; thresholds remove bands. This assumes useful ranking, not measured retrieval quality.</p><p>Relevant tokens = size × relevance. Nonduplicate relevant estimate = size × relevance × (1 − duplicate share). Duplicate, stale and conflict diagnostics overlap and must not be summed. Filters assume these diagnostic shares are uniform within each band. Deduplication preserves the nonduplicate relevant estimate; compression reduces size and assumes signal loss, capped by the remaining token capacity. These are transparent simplifications, not tokenizer output or empirical model behavior.</p><p>Pressure uses input / available input: Low ≤50%, Moderate ≤75%, High ≤100%, Critical &gt;100%. OVERLOADED means overflow. NOISY flags density &lt;50%, duplicate share &gt;25%, stale share &gt;30%, conflict share &gt;10% or irrelevant tool overhead &gt;25%. HEALTHY requires nonempty input, utilization ≤75%, density ≥70%, duplicate/stale shares ≤10%, conflicts ≤2% and tool overhead ≤10%; other cases need REVIEW. Any original conflict prevents an overall HEALTHY classification after filtering.</p><p>Bounds: 200 retrieved chunks, 200 tools, 16 aggregate bands and eight alternative strategy rows. No actual documents, memory, retrieval, summarization, tool execution, pricing, accuracy, hallucination or recall prediction. Settings are kept in page memory and are not copied into share links or analytics.</p><p><a href="https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" target="_blank" rel="noreferrer">Context-engineering concepts</a> · <a href="https://www.anthropic.com/engineering/writing-tools-for-agents" target="_blank" rel="noreferrer">Tool context and selection</a>. Sources motivate the concepts; the numerical heuristics are this tool’s own planning assumptions.</p></details>
  </div>;
}
