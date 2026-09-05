import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import Metric from '../shared/Metric';
import PresetBar from '../shared/PresetBar';
import ResultPanel from '../shared/ResultPanel';
import VisualizationContainer from '../shared/VisualizationContainer';
import Warning from '../shared/Warning';
import {
  analyzeSchemaDrift,
  DEFAULT_SCHEMA_OPTIONS,
  SCHEMA_LIMITS,
  schemaPresenceLabel,
  schemaTypeLabel,
} from './schemaDriftModel';
import type { SchemaCompareOptions, SchemaComparison, SchemaInputFormat, SchemaRow } from './schemaDriftModel';

const ACCENT = '#F7933C';
const STATUS = { added: '#22c55e', removed: '#ef4444', changed: '#F7933C', unknown: '#6CA6FF' };
const PAGE_SIZE = 24;
type Side = 'before' | 'after';
type Filter = 'all' | 'breaking' | 'added' | 'removed' | 'changed' | 'unverified';

interface SampleInput {
  raw: string;
  format: SchemaInputFormat;
  fileName: string | null;
}

interface SamplePreset {
  before: string;
  after: string;
  format: SchemaInputFormat;
  required?: string;
  ignored?: string;
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const PRESETS: { label: string; values: SamplePreset }[] = [
  {
    label: 'API release drift',
    values: {
      format: 'json',
      before: pretty({
        customer_id: 1042,
        customer_email: 'sam@example.com',
        total: 68.5,
        customer: { name: 'Sam', phone: '555-0140' },
        items: [{ sku: 'ART-01', quantity: 2, price: 24.5 }, { sku: 'ART-02', quantity: 1, price: 19.5 }],
        meta: { version: 1, generated_at: '2026-09-01T10:00:00Z' },
      }),
      after: pretty({
        customer_ref: 'CUS-1042',
        email_address: 'sam@example.com',
        total: '68.50',
        customer: { name: 'Sam', phone: null },
        items: [{ sku: 'ART-01', quantity: 2, price: '24.50' }, { sku: 'ART-02', price: '19.50' }],
        tags: ['returning'],
        meta: { version: 2, generated_at: '2026-09-03T10:00:00Z' },
      }),
      required: '$.customer_id\n$.items[].quantity',
      ignored: '$.meta.generated_at',
    },
  },
  {
    label: 'Additive release',
    values: {
      format: 'json',
      before: pretty({ customer: { id: 1042, name: 'Sam' }, status: 'active' }),
      after: pretty({ customer: { id: 1042, name: 'Sam', timezone: 'Asia/Karachi' }, status: 'active', links: { profile: '/customers/1042' } }),
    },
  },
  {
    label: 'Array → object',
    values: {
      format: 'json',
      before: pretty({ order_id: 'ORD-204', items: [{ sku: 'PRINT-01', quantity: 2 }] }),
      after: pretty({ order_id: 'ORD-204', items: { 'PRINT-01': { quantity: 2 } } }),
    },
  },
  {
    label: 'CSV export drift',
    values: {
      format: 'csv',
      before: 'customer_id,email,active,total\r\n001,sam@example.com,true,68.50\r\n002,lee@example.com,false,25.00',
      after: 'customer_id,email_address,active,total,campaign\r\n001,sam@example.com,yes,68.50,Autumn\r\n002,lee@example.com,no,,Autumn',
      required: '$[].customer_id',
    },
  },
];

const INITIAL = PRESETS[0].values;
const labelStyle: CSSProperties = {
  display: 'block', fontSize: '.76rem', fontWeight: 700, color: 'var(--k-text-muted)',
  marginBottom: '.4rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.05em',
};
const textStyle: CSSProperties = {
  width: '100%', minWidth: 0, padding: '.7rem .8rem', borderRadius: '.6rem',
  border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)',
  fontSize: '.8rem', fontFamily: "'Courier New', monospace", resize: 'vertical', boxSizing: 'border-box',
};
const selectStyle: CSSProperties = {
  ...textStyle, fontFamily: "'Mulish', sans-serif", fontSize: '.85rem', resize: undefined,
};
const buttonStyle: CSSProperties = {
  border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)',
  padding: '.45rem .85rem', borderRadius: '.5rem', fontFamily: "'Poppins', sans-serif",
  fontSize: '.76rem', fontWeight: 700, cursor: 'pointer',
};
const smallText: CSSProperties = { fontSize: '.76rem', color: 'var(--k-text-muted)', lineHeight: 1.5 };

function rowStyle(row: SchemaRow): { color: string; symbol: string; label: string } {
  if (row.changes.some((change) => change.kind === 'removed')) return { color: STATUS.removed, symbol: '−', label: 'Removed' };
  if (row.changes.some((change) => change.potentiallyBreaking)) return { color: STATUS.changed, symbol: '!', label: 'Review change' };
  if (row.changes.some((change) => change.kind === 'added')) return { color: STATUS.added, symbol: '+', label: 'Added' };
  if (row.changes.length) return { color: STATUS.changed, symbol: '~', label: 'Changed' };
  if (row.unverifiedReason) return { color: STATUS.unknown, symbol: '?', label: 'Need samples' };
  return { color: 'var(--k-text-muted)', symbol: '=', label: 'Same shape' };
}

function SchemaPathCard({ row, result }: { row: SchemaRow; result: SchemaComparison }) {
  const status = rowStyle(row);
  const beforePresence = schemaPresenceLabel(row.before, result.before);
  const afterPresence = schemaPresenceLabel(row.after, result.after);
  return (
    <details style={{
      border: '1px solid var(--k-border)', borderLeft: `4px solid ${status.color}`, borderRadius: '.625rem',
      background: 'var(--k-bg-card)', marginLeft: `${Math.min(row.depth, 4) * .35}rem`, minWidth: 0,
    }}>
      <summary style={{ padding: '.75rem', cursor: 'pointer', listStyle: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', minWidth: 0 }}>
          <span aria-hidden="true" style={{
            display: 'inline-flex', width: '1.45rem', height: '1.45rem', flexShrink: 0, justifyContent: 'center', alignItems: 'center',
            borderRadius: '.35rem', color: status.color, background: `color-mix(in srgb, ${status.color} 12%, transparent)`, fontWeight: 900,
          }}>{status.symbol}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', flexWrap: 'wrap' }}>
              <code style={{ color: 'var(--k-text)', fontSize: '.81rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{row.path}</code>
              {row.required && <span style={{ fontSize: '.64rem', fontWeight: 800, color: ACCENT, fontFamily: "'Poppins', sans-serif" }}>REQUIRED</span>}
            </div>
            <div style={{ ...smallText, marginTop: '.2rem', color: status.color, fontWeight: 700 }}>
              {row.changes.length ? row.changes.map((change) => change.label).join(' · ') : status.label}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '.65rem', marginTop: '.65rem' }}>
          {(['Before', 'After'] as const).map((label) => {
            const node = label === 'Before' ? row.before : row.after;
            const presence = label === 'Before' ? beforePresence : afterPresence;
            return (
              <div key={label} style={{ minWidth: 0, padding: '.55rem .6rem', borderRadius: '.4rem', background: 'var(--k-bg)' }}>
                <span style={{ ...smallText, fontSize: '.64rem', textTransform: 'uppercase', fontWeight: 800 }}>{label}</span>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '.78rem', fontWeight: 700, color: 'var(--k-text)', overflowWrap: 'anywhere' }}>{schemaTypeLabel(node)}</div>
                {presence && <div style={{ ...smallText, fontSize: '.66rem', marginTop: '.2rem' }}>{presence}</div>}
                {node?.types.has('array') && <div style={{ ...smallText, fontSize: '.66rem', marginTop: '.2rem' }}>{node.sampledItems} of {node.arrayItems} items inspected</div>}
              </div>
            );
          })}
        </div>
        <div style={{ ...smallText, fontSize: '.68rem', marginTop: '.5rem', fontWeight: 700 }}>Why &amp; next check <span aria-hidden="true">↓</span></div>
      </summary>
      <div style={{ display: 'grid', gap: '.8rem', borderTop: '1px solid var(--k-border)', padding: '.85rem', minWidth: 0 }}>
        {row.changes.map((change) => (
          <div key={change.id}>
            <div style={{ color: 'var(--k-text)', fontSize: '.78rem', fontWeight: 800, marginBottom: '.25rem' }}>
              {change.label} · {change.potentiallyBreaking ? 'Potentially breaking' : 'Usually non-breaking'}
            </div>
            <p style={{ ...smallText, margin: '0 0 .35rem' }}>{change.why}</p>
            <p style={{ ...smallText, color: 'var(--k-text)', margin: 0 }}><strong>Next check:</strong> {change.action}</p>
          </div>
        ))}
        {row.unverifiedReason && <p style={{ ...smallText, margin: 0 }}><strong>Need more evidence:</strong> {row.unverifiedReason} Add representative non-null objects or array records to compare this path.</p>}
        {!row.changes.length && !row.unverifiedReason && <p style={{ ...smallText, margin: 0 }}>The observed types, null presence and field-presence pattern match. Value changes are intentionally excluded. This does not validate a complete contract.</p>}
      </div>
    </details>
  );
}

export default function SchemaDriftDoctor() {
  const [before, setBefore] = useState<SampleInput>({ raw: INITIAL.before, format: INITIAL.format, fileName: null });
  const [after, setAfter] = useState<SampleInput>({ raw: INITIAL.after, format: INITIAL.format, fileName: null });
  const [options, setOptions] = useState<SchemaCompareOptions>({ ...DEFAULT_SCHEMA_OPTIONS, requiredPaths: INITIAL.required ?? '', ignoredPaths: INITIAL.ignored ?? '' });
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[0].label);
  const [inputErrors, setInputErrors] = useState<Record<Side, string | null>>({ before: null, after: null });
  const [reading, setReading] = useState<Record<Side, boolean>>({ before: false, after: false });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [page, setPage] = useState(0);
  const fileRequests = useRef<Record<Side, number>>({ before: 0, after: 0 });
  const mounted = useRef(true);
  const deferredBefore = useDeferredValue(before.raw);
  const deferredAfter = useDeferredValue(after.raw);
  const analysis = useMemo(() => analyzeSchemaDrift(deferredBefore, before.format, deferredAfter, after.format, options), [deferredBefore, before.format, deferredAfter, after.format, options]);
  const result = analysis.ok ? analysis.comparison : null;
  const updating = deferredBefore !== before.raw || deferredAfter !== after.raw;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; fileRequests.current.before += 1; fileRequests.current.after += 1; };
  }, []);

  const resetView = () => { setFilter('all'); setQuery(''); setShowUnchanged(false); setPage(0); };
  const loadPreset = (preset: SamplePreset, label: string) => {
    fileRequests.current.before += 1;
    fileRequests.current.after += 1;
    setBefore({ raw: preset.before, format: preset.format, fileName: null });
    setAfter({ raw: preset.after, format: preset.format, fileName: null });
    setOptions({ ...DEFAULT_SCHEMA_OPTIONS, requiredPaths: preset.required ?? '', ignoredPaths: preset.ignored ?? '' });
    setActivePreset(label);
    setInputErrors({ before: null, after: null });
    setReading({ before: false, after: false });
    resetView();
  };

  const changeInput = (side: Side, input: SampleInput) => {
    fileRequests.current[side] += 1;
    setReading((current) => ({ ...current, [side]: false }));
    if (input.raw.length > SCHEMA_LIMITS.inputBytes) {
      setInputErrors((current) => ({ ...current, [side]: 'This input is too large. Keep each sample under 500 KB; the previous sample was kept.' }));
      return;
    }
    (side === 'before' ? setBefore : setAfter)(input);
    setInputErrors((current) => ({ ...current, [side]: null }));
    setActivePreset(null);
    setPage(0);
  };

  const readFile = async (side: Side, file: File) => {
    const request = ++fileRequests.current[side];
    setInputErrors((current) => ({ ...current, [side]: null }));
    setReading((current) => ({ ...current, [side]: false }));
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'json' && extension !== 'csv') {
      setInputErrors((current) => ({ ...current, [side]: 'Choose a .json or .csv file. The previous sample was kept.' }));
      return;
    }
    if (file.size > SCHEMA_LIMITS.inputBytes) {
      setInputErrors((current) => ({ ...current, [side]: 'This file exceeds 500 KB. Choose a smaller representative sample; the previous sample was kept.' }));
      return;
    }
    setReading((current) => ({ ...current, [side]: true }));
    try {
      const raw = await file.text();
      if (!mounted.current || request !== fileRequests.current[side]) return;
      (side === 'before' ? setBefore : setAfter)({ raw, format: extension, fileName: file.name });
      setActivePreset(null);
      setPage(0);
    } catch {
      if (mounted.current && request === fileRequests.current[side]) setInputErrors((current) => ({ ...current, [side]: 'This file could not be read locally. Try pasting its contents. The previous sample was kept.' }));
    } finally {
      if (mounted.current && request === fileRequests.current[side]) setReading((current) => ({ ...current, [side]: false }));
    }
  };

  const updateOption = <K extends keyof SchemaCompareOptions>(key: K, value: SchemaCompareOptions[K]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
    setPage(0);
  };

  const filteredRows = useMemo(() => {
    if (!result) return [];
    const search = query.trim().toLowerCase();
    return result.rows.filter((row) => {
      if (search && !row.path.toLowerCase().includes(search)) return false;
      if (filter === 'breaking') return row.changes.some((change) => change.potentiallyBreaking);
      if (filter === 'unverified') return Boolean(row.unverifiedReason);
      if (filter === 'added' || filter === 'removed') return row.changes.some((change) => change.kind === filter);
      if (filter === 'changed') return row.changes.some((change) => change.kind !== 'added' && change.kind !== 'removed');
      return showUnchanged || row.changes.length > 0 || Boolean(row.unverifiedReason);
    });
  }, [result, filter, query, showUnchanged]);
  const maxPage = Math.max(0, Math.ceil(filteredRows.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  const pageRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstRisk = result?.changes.find((change) => change.required || change.kind === 'required') ?? result?.changes.find((change) => change.potentiallyBreaking) ?? result?.changes[0];
  const groupCounts = result ? [
    { label: 'Added', count: result.changes.filter((change) => change.kind === 'added').length, color: STATUS.added, symbol: '+' },
    { label: 'Removed', count: result.changes.filter((change) => change.kind === 'removed').length, color: STATUS.removed, symbol: '−' },
    { label: 'Changed / required', count: result.changes.filter((change) => change.kind !== 'added' && change.kind !== 'removed').length, color: STATUS.changed, symbol: '~' },
  ] : [];

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(1rem, 3vw, 1.5rem)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem', marginBottom: '.6rem' }}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', margin: 0 }}>How did the data contract change?</h2>
        <button type="button" onClick={() => loadPreset(INITIAL, PRESETS[0].label)} style={buttonStyle}>Reset</button>
      </div>
      <p style={{ ...smallText, margin: '0 0 1rem' }}>Compare sample shapes, not values. JSON and CSV stay in this page’s memory. The comparison updates as you edit.</p>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={loadPreset} accent={ACCENT} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {(['before', 'after'] as const).map((side) => {
          const input = side === 'before' ? before : after;
          const title = side === 'before' ? 'Before' : 'After';
          return (
            <section key={side} aria-labelledby={`schema-${side}-label`} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', marginBottom: '.5rem' }}>
                <label id={`schema-${side}-label`} htmlFor={`schema-${side}-input`} style={{ ...labelStyle, margin: 0, color: 'var(--k-text)' }}>{title} · {side === 'before' ? 'expected shape' : 'actual sample'}</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', ...smallText }}>
                  <span>Format</span>
                  <select aria-label={`${title} format`} value={input.format} onChange={(event) => changeInput(side, { ...input, format: event.target.value as SchemaInputFormat })} style={{ ...selectStyle, width: 'auto', padding: '.3rem .4rem' }}>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>
              </div>
              <textarea
                id={`schema-${side}-input`}
                value={input.raw}
                onChange={(event) => changeInput(side, { raw: event.target.value, format: input.format, fileName: null })}
                rows={15}
                spellCheck={false}
                autoComplete="off"
                placeholder={input.format === 'json' ? '{ "customer": { "id": 1042 } }' : 'customer_id,email\n001,sam@example.com'}
                aria-describedby={`schema-${side}-help`}
                style={{ ...textStyle, lineHeight: 1.55 }}
              />
              <div style={{ marginTop: '.6rem' }}>
                <label htmlFor={`schema-${side}-file`} style={{ ...smallText, display: 'block', fontWeight: 700, marginBottom: '.3rem' }}>Open a local .json or .csv file</label>
                <input id={`schema-${side}-file`} type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(side, file);
                  event.target.value = '';
                }} style={{ width: '100%', minWidth: 0, maxWidth: '100%', fontSize: '.75rem', color: 'var(--k-text)' }} />
                <div id={`schema-${side}-help`} style={{ ...smallText, fontSize: '.69rem', marginTop: '.4rem', overflowWrap: 'anywhere' }}>
                  {reading[side] ? 'Reading locally…' : input.fileName ? `Loaded ${input.fileName} · ` : ''}{!reading[side] && '500 KB maximum per sample.'}
                </div>
                {inputErrors[side] && <div role="alert" style={{ marginTop: '.5rem' }}><Warning level="warn" title={`${title} input`}>{inputErrors[side]}</Warning></div>}
              </div>
            </section>
          );
        })}
      </div>

      <AdvancedDisclosure summary="Field rules, array sampling & CSV inference">
        <div style={{ minWidth: 0 }}>
          <label htmlFor="schema-required" style={labelStyle}>Required paths</label>
          <textarea id="schema-required" value={options.requiredPaths} maxLength={SCHEMA_LIMITS.ruleCharacters} onChange={(event) => updateOption('requiredPaths', event.target.value)} rows={4} placeholder={'$.customer.id\n$.items[].sku'} style={textStyle} aria-describedby="schema-required-help" />
          <p id="schema-required-help" style={{ ...smallText, fontSize: '.7rem', margin: '.4rem 0 0' }}>One path per line. The full path must be available in sampled records. A null leaf counts as present; a missing parent does not.</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <label htmlFor="schema-ignored" style={labelStyle}>Ignored paths</label>
          <textarea id="schema-ignored" value={options.ignoredPaths} maxLength={SCHEMA_LIMITS.ruleCharacters} onChange={(event) => updateOption('ignoredPaths', event.target.value)} rows={4} placeholder="$.meta.generated_at" style={textStyle} aria-describedby="schema-ignored-help" />
          <p id="schema-ignored-help" style={{ ...smallText, fontSize: '.7rem', margin: '.4rem 0 0' }}>Ignores the named path and its descendants. Copy special-key paths from the view, for example $[&quot;a.b&quot;].</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <label htmlFor="schema-sampling" style={labelStyle}>Items per array</label>
          <select id="schema-sampling" value={options.arraySampleLimit} onChange={(event) => updateOption('arraySampleLimit', Number(event.target.value))} style={selectStyle}>
            <option value={10}>First 10 items</option>
            <option value={50}>First 50 items</option>
            <option value={200}>First 200 items</option>
          </select>
          <p style={{ ...smallText, fontSize: '.7rem', margin: '.4rem 0 .9rem' }}>Combines types across inspected items. Rare shapes outside the sample may be missed.</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', color: 'var(--k-text)', fontSize: '.78rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={options.caseSensitive} onChange={(event) => updateOption('caseSensitive', event.target.checked)} style={{ accentColor: ACCENT, marginTop: '.25rem' }} />
            Match field names case-sensitively
          </label>
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={labelStyle}>CSV interpretation</span>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', color: 'var(--k-text)', fontSize: '.78rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={options.csvInferTypes} onChange={(event) => updateOption('csvInferTypes', event.target.checked)} style={{ accentColor: ACCENT, marginTop: '.25rem' }} />
            Infer simple numbers, booleans and blanks
          </label>
          <p style={{ ...smallText, fontSize: '.7rem', margin: '.4rem 0 0' }}>When enabled, empty cells become null and true/false become booleans. Leading-zero IDs stay strings. Turn off to treat every CSV cell as text.</p>
          <p style={{ ...smallText, fontSize: '.7rem', margin: '.6rem 0 0' }}>CSV uses comma separators and the first row as headers. Compare CSV with a JSON array of records for matching paths.</p>
        </div>
      </AdvancedDisclosure>

      <div aria-live="polite" style={{ ...smallText, minHeight: '1.2rem' }}>{updating ? 'Updating comparison…' : 'Sample comparison · no values are included in the schema view'}</div>

      {!analysis.ok && (
        <div style={{ display: 'grid', gap: '.6rem', marginTop: '1rem' }}>
          {analysis.errors.map((error) => <Warning key={error.side} level={error.message.startsWith('Paste') ? 'info' : 'warn'} title={`${error.side} needs attention`}>{error.message}</Warning>)}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem', opacity: updating ? .65 : 1 }}>
          <Insight
            what={result.potentiallyBreaking > 0 ? `${result.potentiallyBreaking} potentially breaking change${result.potentiallyBreaking === 1 ? '' : 's'} to review` : result.changes.length > 0 ? `${result.changes.length} usually non-breaking change${result.changes.length === 1 ? '' : 's'} observed` : result.unverifiedPaths > 0 ? 'More samples are needed for part of this contract' : 'No structural drift observed in these samples'}
            why={firstRisk ? <><code style={{ overflowWrap: 'anywhere' }}>{firstRisk.path}</code>: {firstRisk.why}</> : result.unverifiedPaths > 0 ? 'Empty arrays or null parents do not reveal their child fields. Those paths are marked as unverified rather than counted as additions or removals.' : 'The inspected types, null presence and field-presence patterns match. Value-only edits are outside this comparison.'}
            tip={firstRisk?.action ?? (result.unverifiedPaths > 0 ? 'Add representative non-empty arrays and non-null parent objects, then review the newly visible fields.' : 'Check representative edge cases and your documented schema before relying on compatibility.')}
          />

          <ResultPanel title="Schema change summary">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '.65rem', marginBottom: '1rem' }}>
              <Metric label="Total changes" value={String(result.changes.length)} sublabel="Per path and change category" />
              <Metric label="Potentially breaking" value={String(result.potentiallyBreaking)} color={result.potentiallyBreaking ? STATUS.removed : 'var(--k-text)'} sublabel="Consumer checks needed" />
              <Metric label="Usually non-breaking" value={String(result.lowerRisk)} color={STATUS.added} sublabel="Assumes tolerant readers" />
              <Metric label="Affected paths" value={String(result.affectedPaths)} sublabel={`${result.unverifiedPaths} more need samples`} />
            </div>
            {result.changes.length > 0 && (
              <div>
                <div aria-hidden="true" style={{ display: 'flex', gap: '3px', height: '15px', borderRadius: '999px', overflow: 'hidden', background: 'var(--k-border)' }}>
                  {groupCounts.filter((group) => group.count > 0).map((group) => <div key={group.label} style={{ flex: group.count, background: group.color }} />)}
                </div>
                <div style={{ display: 'flex', gap: '.5rem 1rem', flexWrap: 'wrap', marginTop: '.65rem' }}>
                  {groupCounts.map((group) => <span key={group.label} style={{ ...smallText, fontWeight: 700 }}><span style={{ color: group.color, fontWeight: 900 }}>{group.symbol}</span> {group.label}: {group.count}</span>)}
                </div>
              </div>
            )}
            <p style={{ ...smallText, margin: '.8rem 0 0' }}>Risk assumes consumers built for Before will read After. This is sample-shape inference, not formal JSON Schema validation; observed nulls and presence do not prove declared constraints.</p>
          </ResultPanel>

          <div style={{ display: 'grid', gap: '.6rem', marginTop: '1.25rem' }}>
            {(result.before.skippedItems + result.after.skippedItems > 0) && <Warning level="warn" title="The array sample is partial">Before inspected {result.before.sampledItems} array items and skipped {result.before.skippedItems}; After inspected {result.after.sampledItems} and skipped {result.after.skippedItems}. This totals all arrays, including nested arrays. Increase the sample or use representative records to check rare shapes.</Warning>}
            {(result.before.emptyArrays + result.after.emptyArrays > 0) && <Warning level="info" title="Empty arrays do not reveal item shape">There {result.before.emptyArrays + result.after.emptyArrays === 1 ? 'is 1 empty array' : `are ${result.before.emptyArrays + result.after.emptyArrays} empty arrays`} across the inspected inputs. Matching array containers alone cannot establish matching item fields.</Warning>}
            {result.notes.map((note) => <Warning key={note} level="info" title="Comparison option">{note}</Warning>)}
          </div>

          {result.renames.length > 0 && (
            <ResultPanel title="Possible renames · confirm with the producer">
              <div style={{ display: 'grid', gap: '.7rem' }}>
                {result.renames.map((rename) => (
                  <div key={`${rename.before}:${rename.after}`} style={{ padding: '.75rem', borderRadius: '.6rem', border: '1px dashed var(--k-border)', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem .75rem', flexWrap: 'wrap', fontSize: '.82rem', fontWeight: 700, color: 'var(--k-text)' }}>
                      <code style={{ overflowWrap: 'anywhere' }}>{rename.before}</code><span aria-hidden="true" style={{ color: ACCENT }}>→</span><code style={{ overflowWrap: 'anywhere' }}>{rename.after}</code>
                    </div>
                    <p style={{ ...smallText, margin: '.4rem 0 0' }}>{rename.reason}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...smallText, margin: '.75rem 0 0' }}>These are name-based hints, not confirmed renames. Each pair remains one removal plus one addition in the summary; hints add no extra changes.</p>
            </ResultPanel>
          )}

          <ResultPanel title="Visual contract map">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '.75rem', marginBottom: '.75rem' }}>
              <div>
                <label htmlFor="schema-filter" style={labelStyle}>Show paths</label>
                <select id="schema-filter" value={filter} onChange={(event) => { setFilter(event.target.value as Filter); setPage(0); }} style={selectStyle}>
                  <option value="all">All changes &amp; unverified paths</option>
                  <option value="breaking">Potentially breaking</option>
                  <option value="added">Added / unexpected</option>
                  <option value="removed">Removed</option>
                  <option value="changed">Type, shape, null &amp; presence</option>
                  <option value="unverified">Need more samples</option>
                </select>
              </div>
              <div>
                <label htmlFor="schema-search" style={labelStyle}>Find a path</label>
                <input id="schema-search" type="search" value={query} maxLength={200} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="e.g. items" style={selectStyle} autoComplete="off" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', ...smallText, marginBottom: '.85rem', cursor: filter === 'all' ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={showUnchanged} disabled={filter !== 'all'} onChange={(event) => { setShowUnchanged(event.target.checked); setPage(0); }} style={{ accentColor: ACCENT }} />
              Include paths with the same observed shape
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem 1rem', ...smallText, fontSize: '.68rem', marginBottom: '.7rem' }}>
              <span><strong style={{ color: STATUS.added }}>+</strong> Added</span>
              <span><strong style={{ color: STATUS.removed }}>−</strong> Removed</span>
              <span><strong style={{ color: STATUS.changed }}>!</strong> Changed / review</span>
              <span><strong style={{ color: STATUS.unknown }}>?</strong> Need samples</span>
              <span>[] combines sampled array items</span>
            </div>
            <VisualizationContainer minHeight={0}>
              <div style={{ width: '100%', minWidth: 0, display: 'grid', gap: '.65rem' }}>
                {pageRows.map((row) => <SchemaPathCard key={row.key} row={row} result={result} />)}
                {pageRows.length === 0 && <p style={{ ...smallText, margin: '.5rem 0' }}>{query || filter !== 'all' ? 'No paths match this view. Clear the search or choose another filter.' : 'No changed paths to show. Include matching paths above to inspect the observed contract.'}</p>}
              </div>
            </VisualizationContainer>
            {filteredRows.length > PAGE_SIZE && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', marginTop: '.75rem' }}>
              <span style={smallText}>Paths {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</span>
              <div style={{ display: 'flex', gap: '.4rem' }}>
                <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} style={{ ...buttonStyle, opacity: currentPage === 0 ? .45 : 1, cursor: currentPage === 0 ? 'default' : 'pointer' }}>Previous</button>
                <button type="button" disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)} style={{ ...buttonStyle, opacity: currentPage === maxPage ? .45 : 1, cursor: currentPage === maxPage ? 'default' : 'pointer' }}>Next</button>
              </div>
            </div>}
            <p style={{ ...smallText, fontSize: '.69rem', margin: '.75rem 0 0' }}>Before: {result.before.nodes.size} observed paths · After: {result.after.nodes.size} · {result.ignoredCount} excluded by ignore rules. Counts include root and array-item paths. Expand a path for its explanation and next check.</p>
          </ResultPanel>
        </div>
      )}
    </div>
  );
}
