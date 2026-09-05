import { useState, type CSSProperties } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { planPagination, type PaginationInputs } from './paginationPlannerModel';

const orange = '#F7933C';
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: '1rem' };
const box: CSSProperties = { padding: '1rem', background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '.8rem', minWidth: 0 };
const control: CSSProperties = { width: '100%', padding: '.65rem', background: 'var(--k-bg)', color: 'var(--k-text)', border: '1px solid var(--k-border)', borderRadius: '.5rem', marginTop: '.4rem' };
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
function bytes(n: number) { return n >= 1024 ** 3 ? `${num(n / 1024 ** 3)} GiB` : n >= 1024 ** 2 ? `${num(n / 1024 ** 2)} MiB` : n >= 1024 ? `${num(n / 1024)} KiB` : `${num(n)} B`; }
const base: PaginationInputs = { records: 100000, recordBytes: 2048, pageSize: 50, requestsPerMinute: 120, deepPagePercent: 90, deepRequestPercent: 10, pattern: 'admin', updates: 'rare', stableOrder: true, jumping: true, sequential: false, cursorBacking: 'keyset' };
const presets = [
  { label: 'Admin table', values: base },
  { label: 'Live activity feed', values: { ...base, records: 1000000, pattern: 'feed' as const, updates: 'continuous' as const, jumping: false, sequential: true } },
  { label: 'Large export', values: { ...base, records: 10000000, pageSize: 500, pattern: 'export' as const, jumping: false, sequential: true } },
];

export default function ApiPaginationPlanner() {
  const [input, setInput] = useState(base);
  const [records, setRecords] = useState(String(base.records));
  const [recordBytes, setRecordBytes] = useState(String(base.recordBytes));
  const [requests, setRequests] = useState(String(base.requestsPerMinute));
  const [active, setActive] = useState<string | null>('Admin table');
  const update = <K extends keyof PaginationInputs>(key: K, value: PaginationInputs[K]) => { setInput(prev => ({ ...prev, [key]: value })); setActive(null); };
  const load = (value: PaginationInputs, label: string) => { setInput({ ...value }); setRecords(String(value.records)); setRecordBytes(String(value.recordBytes)); setRequests(String(value.requestsPerMinute)); setActive(label); };
  const errors = [[records, 1, 1000000000, 'Total records'], [recordBytes, 1, 10000000, 'Average record bytes'], [requests, 0, 10000000, 'Requests per minute']].flatMap(([raw, min, max, label]) => !String(raw).trim() || !Number.isInteger(Number(raw)) || Number(raw) < Number(min) || Number(raw) > Number(max) ? [`${label}: enter a whole number from ${num(Number(min))} to ${num(Number(max))}.`] : []);
  const values = { ...input, records: Number(records), recordBytes: Number(recordBytes), requestsPerMinute: Number(requests) };
  const plan = errors.length ? null : planPagination(values);
  const keysetCursor = input.cursorBacking === 'keyset';
  const recommendationWhy = !input.stableOrder
    ? 'All three approaches need a deterministic order. Add a unique tie-breaker; keyset additionally needs a suitable index and comparable boundary fields.'
    : input.jumping
      ? `Direct page jumps favor offset. ${input.updates !== 'rare' ? 'Your changing dataset can shift page boundaries between requests, so decide whether a stable snapshot is needed.' : 'Profile deep pages before committing to this choice.'}`
      : input.pattern === 'feed' || input.updates !== 'rare'
        ? 'Sequential token navigation fits this flow. A keyset backing query avoids positional skips; the cursor is an opaque API boundary, not a database performance feature by itself.'
        : input.pattern === 'export' || input.sequential
          ? 'An indexed seek can progress from the last seen boundary without revisiting every preceding row. Design restart and reverse-navigation behavior explicitly.'
          : 'For this relatively static table without a sequential-browsing requirement, offset is a simple starting point. Profile shallow and deep pages before deciding whether seek-based navigation is worth the extra implementation work.';
  const matrix = [
    ['Implementation', '✓ Simple limit + offset query', keysetCursor ? '~ Token encoding + keyset query' : '~ Token encoding + offset query', '~ Seek predicate + matching index'],
    ['Deep pages', '! Skipped rows still require work', keysetCursor ? '✓ Seek after a boundary' : '! Hidden offset still skips rows', '✓ Seek after a boundary'],
    ['Changing data', '! Inserts/deletes before the offset shift results', keysetCursor ? '~ Avoids positional shifts; sort-key edits still matter' : '! Same positional shifts as offset', '~ Avoids positional shifts; sort-key edits still matter'],
    ['Jump to page N', '✓ Direct offset from page size', '! Usually sequential token navigation', '! Needs a saved boundary or separate lookup'],
    ['Deterministic ordering', '! Unique tie-breaker required', '! Backing query needs a unique tie-breaker', '! Unique composite seek boundary required'],
    ['Previous page', '✓ Decrease the offset', '~ Reverse cursor/query or keep prior tokens', '~ Reverse comparator and sort direction'],
  ];
  return <div style={{ display: 'grid', gap: '1.25rem', color: 'var(--k-text)' }}>
    <PresetBar presets={presets} activeLabel={active} onSelect={load} />
    <button type="button" onClick={() => load(base, 'Admin table')} style={{ ...control, width: 'fit-content', cursor: 'pointer' }}>Reset</button>
    <div style={grid}>
      <InputField label="Total records" min="1" step="1" value={records} onChange={v => { setRecords(v); setActive(null); }} />
      <InputField label="Average record bytes" min="1" step="1" value={recordBytes} onChange={v => { setRecordBytes(v); setActive(null); }} />
      <label>Navigation pattern<select style={control} value={input.pattern} onChange={e => { const pattern = e.target.value as PaginationInputs['pattern']; setInput(prev => ({ ...prev, pattern, jumping: pattern === 'admin', sequential: pattern !== 'admin' })); setActive(null); }}><option value="admin">Admin / searchable table</option><option value="feed">Feed / load more</option><option value="export">Sequential export / batch scan</option></select></label>
      <label>Dataset updates<select style={control} value={input.updates} onChange={e => update('updates', e.target.value as PaginationInputs['updates'])}><option value="rare">Rare or effectively static</option><option value="frequent">Frequent inserts / deletes</option><option value="continuous">Continuous / real-time changes</option></select></label>
    </div>
    <RangeControl label="Page size" min={1} max={1000} value={input.pageSize} onChange={v => update('pageSize', v)} formatValue={v => `${v} records`} />
    <AdvancedDisclosure summary="Navigation requirements & query assumptions">
      <InputField label="Requests per minute" min="0" step="1" value={requests} onChange={v => { setRequests(v); setActive(null); }} />
      <RangeControl label="Inspect page position" min={1} max={100} value={input.deepPagePercent} onChange={v => update('deepPagePercent', v)} formatValue={v => `${v}% through dataset`} />
      <RangeControl label="Requests reaching this deep page" min={0} max={100} value={input.deepRequestPercent} onChange={v => update('deepRequestPercent', v)} formatValue={v => `${v}%`} />
      <label>Cursor backing query<select style={control} value={input.cursorBacking} onChange={e => update('cursorBacking', e.target.value as PaginationInputs['cursorBacking'])}><option value="keyset">Keyset seek (matching index)</option><option value="offset">Offset encoded in token</option></select></label>
      <label><input type="checkbox" checked={input.stableOrder} onChange={e => update('stableOrder', e.target.checked)} style={{ accentColor: orange }} /> Deterministic ordering with a unique tie-breaker</label>
      <label><input type="checkbox" checked={input.jumping} onChange={e => update('jumping', e.target.checked)} style={{ accentColor: orange }} /> Arbitrary jump to page N is required</label>
      <label><input type="checkbox" checked={input.sequential} onChange={e => update('sequential', e.target.checked)} style={{ accentColor: orange }} /> Primarily sequential browsing</label>
    </AdvancedDisclosure>
    {errors.length > 0 ? <div role="alert" style={box}><strong>Check the inputs to continue</strong><ul>{errors.map(e => <li key={e}>{e}</li>)}</ul></div> : plan && <>
      <div style={grid}><Metric label="Payload / full page" value={bytes(plan.payload)} sublabel="Record data only, before compression" /><Metric label="Pages in this snapshot" value={num(plan.pages)} sublabel="A count, not a cursor page-number guarantee" /><Metric label="Response data / minute" value={bytes(plan.perMinuteBytes)} sublabel={`${num(values.requestsPerMinute)} equally full responses`} /></div>
      <Insight what={plan.recommendation} why={recommendationWhy} tip={values.recordBytes > plan.payloadBudget ? `Even one ${bytes(values.recordBytes)} record exceeds this scenario’s ${bytes(plan.payloadBudget)} record-data budget. Consider selecting fewer fields or separate detail requests before choosing a page size.` : `Start testing ${plan.low}–${plan.high} records per page, then measure actual latency, response size, client rendering and memory with representative data.`} />
      <section style={box} aria-label="Pagination strategy comparison"><h3 style={{ marginTop: 0 }}>Compare the behavior</h3><p style={{ fontSize: '.85rem' }}>Cursor here means an opaque continuation-token API backed by <strong>{keysetCursor ? 'keyset queries' : 'offset queries'}</strong>. Keyset is the query strategy; you can expose it through that same cursor API.</p>
        <div role="region" aria-label="Strategy matrix, scroll horizontally" tabIndex={0} style={{ overflowX: 'auto' }}><table style={{ minWidth: 640, width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.8rem' }}><caption style={{ textAlign: 'left', padding: '.5rem 0' }}>✓ supported advantage · ~ implementation work · ! limitation to plan for</caption><thead><tr>{['Priority', 'Offset', 'Cursor API', 'Keyset query'].map(h => <th key={h} scope="col" style={{ padding: '.7rem', borderBottom: '2px solid var(--k-border)' }}>{h}</th>)}</tr></thead><tbody>{matrix.map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row" style={{ padding: '.7rem', borderBottom: '1px solid var(--k-border)' }}>{cell}</th> : <td key={i} style={{ padding: '.7rem', borderBottom: '1px solid var(--k-border)', verticalAlign: 'top' }}>{cell}</td>)}</tr>)}</tbody></table></div>
      </section>
      <section style={box} aria-label="Deep-page query work"><h3 style={{ marginTop: 0 }}>At page {num(plan.deepPage)} of this snapshot</h3><p>Returning {num(plan.returned)} records after {num(plan.skipped)} preceding records.</p>
        {[['Offset', plan.offsetRows, '#F7933C'], [keysetCursor ? 'Cursor backed by keyset' : 'Cursor backed by offset', keysetCursor ? plan.keysetRows : plan.offsetRows, '#6CA6FF'], ['Indexed keyset', plan.keysetRows, '#22c55e']].map(([label, count, color]) => <div key={String(label)} style={{ marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap', fontSize: '.82rem' }}><strong>{label}</strong><span>{num(Number(count))} rows {String(label).includes('Offset') || (!keysetCursor && String(label).includes('Cursor')) ? 'traversed / returned' : 'returned after seek'}</span></div><div style={{ height: 12, background: 'var(--k-bg)', marginTop: '.4rem' }}><div style={{ height: '100%', width: `${Number(count) / Math.max(1, plan.offsetRows) * 100}%`, minWidth: 2, background: String(color) }} /></div></div>)}
        <p style={{ fontSize: '.85rem' }}>If {input.deepRequestPercent}% of requests reach this page and the rest fetch page 1, offset traverses about {num(plan.averageOffsetRows)} rows per request on average. This two-point workload sketch makes deep-page frequency visible; measure the actual distribution.</p>
        <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)' }}>Simplified row-work comparison, not a latency benchmark. Keyset bars exclude index-seek cost; joins, filters, sorting, cache state and index design can dominate. OFFSET still needs to compute skipped rows.</p>
      </section>
      <section style={box} aria-label="Page size tradeoff"><h3 style={{ marginTop: 0 }}>Smaller payloads or fewer requests?</h3><div style={grid}>{[20, 100, 500].map(size => { const actual = Math.min(size, values.records); return <div key={size}><strong>{size} records / page</strong><p style={{ margin: '.4rem 0' }}>{bytes(actual * values.recordBytes)} per full page<br />{num(Math.ceil(values.records / size))} requests for a full scan</p><div aria-hidden="true" style={{ height: 8, background: 'var(--k-bg)' }}><div style={{ width: `${actual / Math.min(500, values.records) * 100}%`, height: '100%', background: orange }} /></div></div>; })}</div><p style={{ fontSize: '.8rem' }}>Full-scan record bytes remain about {bytes(values.records * values.recordBytes)}. More pages add request overhead; fewer, larger pages can increase latency and memory use.</p></section>
      <details style={box}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Implementation checklist & assumptions</summary><ol><li>Define sort columns and a unique tie-breaker. Index the actual filtering and ordering path.</li><li>Decide whether results may change between requests. Keyset alone does not create a snapshot; edits to sort keys can repeat or omit records.</li><li>For cursors, specify token validation, filter/sort binding, expiry and next/previous behavior. An opaque token is not authorization.</li><li>Set a server-side page-size cap and measure representative shallow and deep requests.</li><li>Define empty, last-page and concurrent-deletion behavior; decide whether exact total counts are worth their query cost.</li></ol>
        <p>Starting ranges are configurable-design heuristics: feed 20–50, admin 25–100, export 100–1,000; capped by this snapshot and a {bytes(plan.payloadBudget)} record-data budget. They are not service limits. If one record exceeds the budget, even a one-record page is too large; consider selecting fewer fields or separate detail requests.</p><p>Byte estimates assume equal records, no JSON envelope, no compression and full pages. Records and requests are bounded for responsive browser calculations. No database is queried.</p><p>References: <a href="https://www.postgresql.org/docs/17/queries-limit.html" target="_blank" rel="noopener noreferrer">PostgreSQL LIMIT/OFFSET</a> · <a href="https://graphql.org/learn/pagination/" target="_blank" rel="noopener noreferrer">GraphQL pagination and opaque cursors</a>.</p></details>
    </>}
  </div>;
}
