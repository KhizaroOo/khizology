import { useId, useState } from 'react';
import Insight from '../shared/Insight';
import Warning from '../shared/Warning';
import { trackToolResult } from '../../../utils/analytics';
import { PROMPT_LIMITS, promptCategories, promptContexts, promptSamples, scanPromptInjection, type PromptContext, type PromptLevel } from './promptInjectionModel';
import './newTools.css';

export default function PromptInjectionScanner() {
  const id = useId();
  const [raw, setRaw] = useState('');
  const [context, setContext] = useState<PromptContext>('Retrieved Document');
  const [sample, setSample] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof scanPromptInjection>>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'All' | PromptLevel>('All');
  const clear = () => { setResult(undefined); setError(''); setMessage(''); setFilter('All'); };
  function scan() {
    try {
      const next = scanPromptInjection(raw, context);
      setResult(next); setError(''); setFilter('All');
      setMessage('');
      trackToolResult(); // Existing helper receives no input, evidence, findings or result parameters.
    } catch (failure) { setResult(undefined); setMessage(''); setError((failure as Error).message); }
  }
  const biggest = result?.findings.find(f => f.level === 'FAIL' || f.level === 'WARN');
  return <div className="tool-workbench">
    <p>Is supplied text trying to control an AI agent? Paste it, scan locally, then review the signals before use. Nothing is executed or sent to an agent.</p>
    <p><strong>Detection is heuristic. A PASS does not prove content is safe.</strong></p>
    <label htmlFor={`${id}-context`}>Where will this content come from?<select id={`${id}-context`} value={context} onChange={event => { setContext(event.target.value as PromptContext); clear(); }}>{promptContexts.map(item => <option key={item}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-input`}>Untrusted text to review</label>
    <textarea id={`${id}-input`} rows={9} value={raw} maxLength={PROMPT_LIMITS.bytes + 1} onChange={event => { setRaw(event.target.value); clear(); }} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} placeholder="Paste a document, prompt, email or tool response. It is treated only as data." />
    <small id={`${id}-help`}>60,000 UTF-8 bytes · 1,000 lines · 4,000 characters per line · at most 80 displayed findings. No decoding or execution. Input stays in page memory; the editor remains visible. Result evidence is short and masks recognized credentials and URLs, not every possible secret.</small>
    <div className="tool-actions"><button className="k-button k-button--primary" type="button" onClick={scan}>Scan text</button><button type="button" onClick={() => { setRaw(''); setContext('Retrieved Document'); setSample(0); clear(); setMessage('Input and findings cleared.'); }}>Reset</button></div>
    <details><summary>Try a fictional sample</summary><div className="tool-grid"><label htmlFor={`${id}-sample`}>Sample<select id={`${id}-sample`} value={sample} onChange={event => setSample(Number(event.target.value))}>{promptSamples.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label><button type="button" onClick={() => { const item = promptSamples[sample]; setRaw(item.text); setContext(item.context); clear(); setMessage('Fictional sample loaded. Scan it to review the signals.'); }}>Load sample</button></div></details>
    {error && <div id={`${id}-error`} role="alert"><Warning level="danger" title={error} /></div>}
    <span role="status" aria-live="polite" aria-atomic="true">{message}</span>
    {result && <>
      <section aria-label="Prompt Injection Risk">
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Prompt Injection Risk</h2>
        <Insight what={result.risk} why={biggest ? `Biggest signal: ${biggest.category}. ${biggest.why}` : 'No strong supported pattern was found. Unfamiliar, multilingual, split or disguised instructions can be missed.'} tip={result.firstAction} />
        <p>{result.total} findings · {result.counts.FAIL} high-risk findings · {result.lines} lines reviewed. FAIL means a stronger heuristic signal, not proven malicious intent. INFO records discussion or uncertainty.</p>
        <details><summary>Signal counts and trust boundary</summary>
          <dl><dt>Indirect-injection signals</dt><dd>{result.signals['Indirect injection']}</dd><dt>Data-exfiltration signals</dt><dd>{result.signals['Data exfiltration']}</dd><dt>Tool-misuse signals</dt><dd>{result.signals['Tool misuse']}</dd><dt>Memory-poisoning signals</dt><dd>{result.signals['Memory poisoning']}</dd></dl>
          <p><strong>Review path:</strong> Untrusted content → local scanner → human review</p>
          <p><strong>Potential boundary crossing:</strong> {context} → attempts to direct an agent → {result.signals['Memory poisoning'] ? 'memory / ' : ''}{result.signals['Tool misuse'] ? 'connected tools / ' : ''}data. {biggest ? 'Review the relevant findings below.' : 'No strong crossing signal detected.'}</p>
          <p>This diagram describes a possible consuming system. The scanner does not send content onward, authorize actions or protect a running agent.</p>
          <ul>{promptCategories.map(category => <li key={category}>{category}: {result.signals[category]} active signals</li>)}</ul>
        </details>
      </section>
      <section aria-label="Prioritized safer handling"><h3>Possible impact</h3><p>{biggest?.impact || 'A missed instruction could still manipulate a consumer. No runtime safety conclusion is possible.'}</p><h3>Fix first</h3><p>{result.firstAction}</p><h3>Agent-side protection</h3><p>Keep retrieved content untrusted, minimize agent privileges, validate outgoing actions and require explicit approval for sensitive effects. Sanitization alone does not solve prompt injection.</p>{result.signals['Memory poisoning'] > 0 && <><h3>Memory protection</h3><p>Disable automatic persistence from untrusted sources. Review and authorize each memory write separately.</p></>}</section>
      <label htmlFor={`${id}-filter`}>Finding severity<select id={`${id}-filter`} value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>{['All', 'FAIL', 'WARN', 'INFO'].map(item => <option key={item}>{item}</option>)}</select></label>
      {result.omitted > 0 && <Warning level="warn" title={`${result.omitted} findings omitted from this display`}>Counts include all supported matches. The strongest signals are shown first. Scan a smaller sample to inspect every finding.</Warning>}
      {result.findings.filter(f => filter === 'All' || f.level === filter).map((finding, index) => <details key={`${finding.category}-${finding.line}-${index}`} className="tool-box"><summary><strong>{finding.level}</strong> — {finding.category} · line {finding.line}</summary><p><strong>Short evidence:</strong> <code>{finding.evidence}</code></p><dl><dt>Why it matters</dt><dd>{finding.why}</dd><dt>Possible impact</dt><dd>{finding.impact}</dd><dt>Safer handling</dt><dd>{finding.action}</dd><dt>Confidence / context</dt><dd>{finding.context}</dd></dl></details>)}
      {!result.findings.some(f => filter === 'All' || f.level === filter) && <p>{filter === 'All' ? 'PASS for supported patterns only. No findings to display; content is not certified safe.' : 'No displayed findings at this severity.'}</p>}
    </>}
    <details><summary>What this scan can and cannot tell you</summary><p>Prompt injection is untrusted content trying to change AI behavior. Direct attempts arrive as user input; indirect attempts arrive through documents, webpages, email, tools or other agents. If a consumer has data or tool access, following these instructions can have consequences beyond an answer.</p><p>This is a bounded, primarily English pattern review, not an LLM judge, malware detector, firewall, penetration test or security certification. It does not establish malicious intent, inspect a running agent, parse document formats, resolve URLs, decode payloads or detect every evasion. Quoted educational text may still need review. Unrecognized languages, paraphrases and instructions split across lines can be missed. No result copy/export is offered; share the canonical page link only.</p><p><a href="https://genai.owasp.org/llmrisk/llm01-prompt-injection/" target="_blank" rel="noreferrer">OWASP prompt injection overview</a> · <a href="https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html" target="_blank" rel="noreferrer">OWASP prevention guidance</a></p></details>
  </div>;
}
