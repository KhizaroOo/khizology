import { useId, useState } from 'react';
import Insight from '../shared/Insight';
import { trackToolResult } from '../../../utils/analytics';
import { analyzeTrace, traceExamples, TRACE_LIMITS } from './otelTraceModel';
import './newTools.css';
export default function OpenTelemetryTraceDoctor() {
    const id = useId();
    const [raw, setRaw] = useState('');
    const [sample, setSample] = useState<keyof typeof traceExamples>('Healthy Web Trace');
    const [result, setResult] = useState<ReturnType<typeof analyzeTrace>>();
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('All');
    const [message, setMessage] = useState('');
    const clear = () => { setResult(undefined); setError(''); setFilter('All'); setMessage(''); };
    function analyze() { try {
        setResult(analyzeTrace(raw));
        setMessage('');
        setError('');
        setFilter('All');
        trackToolResult();
    }
    catch (e) {
        setResult(undefined);
        setError(e instanceof Error ? e.message : 'Unable to analyze this sample.');
    } }
    return <div className="tool-workbench">
 <p>Is your trace connected, useful and safe to collect? Paste a static JSON sample, inspect the main issue, then fix the instrumentation. No collector is contacted.</p>
 <label htmlFor={id}>Trace JSON</label><textarea id={id} rows={10} value={raw} maxLength={TRACE_LIMITS.bytes + 1} spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} onChange={e => { setRaw(e.target.value); clear(); }}/>
 <small id={`${id}-help`}>200,000 UTF-8 bytes · 200 spans · 24 levels · 100 attributes per span · 2,000 total attributes · 1,000 events · 150 findings. Paste stays visible in this editor and in page memory only. Findings omit attribute values; operation/service labels are filtered, not guaranteed anonymization. Redact real data before pasting.</small>
 <div className="tool-actions"><button type="button" className="k-button k-button--primary" onClick={analyze}>Analyze trace</button><button type="button" onClick={() => { setRaw(''); clear(); setMessage('Trace and results cleared.'); }}>Reset</button></div>
 <details><summary>Try a synthetic sample</summary><label>Sample<select value={sample} onChange={e => setSample(e.target.value as keyof typeof traceExamples)}>{Object.keys(traceExamples).map(k => <option key={k}>{k}</option>)}</select></label><button type="button" onClick={() => { setRaw(JSON.stringify(traceExamples[sample], null, 2)); clear(); setMessage('Synthetic sample loaded. Select Analyze trace.'); }}>Load sample</button></details>
 <span role="status">{message}</span>{error && <p role="alert" id={`${id}-error`}>{error}</p>}
 {result && <>
 <Insight what={`${result.fail ? 'Needs repair' : result.warn ? 'Review needed' : 'No supported issues detected'} · ${result.fail} FAIL · ${result.warn} WARN`} why={result.fixFirst[0]?.why ?? 'Supported static checks found no warning; runtime correctness remains unverified.'} tip={result.fixFirst[0]?.fix ?? 'Confirm instrumentation with complete runtime traces.'}/>
 <p>{result.spanCount} spans · {result.serviceCount} named services. Privacy: {result.findings.some(f => f.category === 'Privacy') ? 'sensitive-data signals found; inspect Privacy findings' : 'no supported signal detected; absence is not proof of safety'}.</p>
 {!!result.fixFirst.length && <section className="tool-box"><h2 style={{ fontSize: '1.1rem' }}>Fix first</h2><ol>{result.fixFirst.map((f, i) => <li key={i}><strong>{f.path}: {f.evidence}.</strong> {f.fix}</li>)}</ol></section>}
 <section className="tool-box"><h2 style={{ fontSize: '1.1rem' }}>Trace relationships</h2><p>Each row names its supplied parent. External parents may be absent from a partial sample. Labels are bounded; IDs and attribute values are withheld.</p><ul style={{ paddingLeft: '1.25rem', overflowWrap: 'anywhere' }}>{result.tree.map(v => <li key={v.path}><strong>{v.path} · {v.name}</strong><br />{v.parent} → {v.path} · {v.service} · {v.duration === null ? 'duration unknown' : `${v.duration} ms`} · {v.status}</li>)}</ul></section>
 <label>Findings filter<select value={filter} onChange={e => setFilter(e.target.value)}>{['All', 'FAIL', 'WARN', 'Privacy', 'Structure', 'GenAI'].map(k => <option key={k}>{k}</option>)}</select></label>
 <p>{result.omitted ? `${result.omitted} findings omitted at safety cap. Use a smaller sample.` : 'All findings within the display cap are shown.'}</p>
 {result.findings.filter(f => filter === 'All' || f.level === filter || f.category === filter).map((f, i) => <details key={i} className="tool-box" open={f.level === 'FAIL'}><summary><strong>{f.level} · {f.category}</strong> — {f.evidence}</summary><p>{f.path}</p><dl><dt>Why</dt><dd>{f.why}</dd><dt>Fix</dt><dd>{f.fix}</dd><dt>Confidence / context</dt><dd>{f.context}</dd></dl></details>)}
 {!result.findings.some(f => filter === 'All' || f.level === filter || f.category === filter) && <p>No findings match this filter.</p>}
 </>}
 <details><summary>Formats, assumptions and limits</summary><p>Supports OTLP resourceSpans/scopeSpans (including instrumentationLibrarySpans), span arrays, a spans wrapper, and single spans. Simplified examples accept resource attribute objects and trace_id/span_id aliases. Use decimal-string Unix nanoseconds, explicit Unix milliseconds, or offset ISO startTime/endTime. Ambiguous numeric timestamps are not guessed. IDs use nonzero hex, not base64.</p><p>Structure failures are distinct from partial-sample gaps. Multiple roots do not automatically fail. Resource identity, naming, privacy, uniqueness and long-duration checks are diagnostic guidance, not certification. Service namespace, instance and version are optional. Selected convention type checks do not validate every protocol or vendor. GenAI content is never required. No full prompts, raw bodies or stack traces are needed. Nothing is copied, exported, stored or included in shared links by this tool.</p></details>
 <p><a href="https://opentelemetry.io/docs/specs/otlp/">OTLP JSON specification</a> · <a href="https://opentelemetry.io/docs/specs/semconv/resource/service/">Service identity</a> · <a href="https://opentelemetry.io/docs/specs/semconv/http/http-spans/">HTTP conventions</a> · <a href="https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md">GenAI conventions and content disclosure</a></p>
 </div>;
}
