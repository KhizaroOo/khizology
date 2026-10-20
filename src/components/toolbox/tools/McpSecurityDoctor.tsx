import { useId, useState } from 'react';
import Insight from '../shared/Insight';
import Warning from '../shared/Warning';
import { trackToolResult } from '../../../utils/analytics';
import { analyzeMcpSecurity, mcpCategories, mcpExamples, MCP_LIMITS } from './mcpSecurityModel';
import './newTools.css';

export default function McpSecurityDoctor() {
  const id = useId();
  const [raw, setRaw] = useState('');
  const [example, setExample] = useState<keyof typeof mcpExamples>('read');
  const [result, setResult] = useState<ReturnType<typeof analyzeMcpSecurity>>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const clear = () => { setResult(undefined); setError(''); setMessage(''); };
  function analyze() {
    try { const next = analyzeMcpSecurity(raw); setResult(next); setError(''); setMessage(''); trackToolResult(); }
    catch (failure) { setResult(undefined); setError((failure as Error).message); }
  }
  return <div className="tool-workbench">
    <p>Is this MCP definition granting more power than its task needs? Paste JSON, review the signals, then verify the real safeguards. Nothing is executed or connected.</p>
    <label htmlFor={`${id}-input`}>MCP tool or server JSON</label>
    <textarea id={`${id}-input`} value={raw} maxLength={MCP_LIMITS.bytes + 1} onChange={event => { setRaw(event.target.value); clear(); }} rows={10} spellCheck={false} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} placeholder={'{"tools": [{"name": "read_status", "inputSchema": {"type": "object"}}]}'} />
    <small id={`${id}-help`}>100,000 UTF-8 bytes · 5,000 values · 24 levels · 100 tools. Inputs stay in page memory. Results hide values and unknown property names; your pasted editor remains visible.</small>
    <div className="tool-actions">
      <button className="k-button k-button--primary" type="button" onClick={analyze}>Analyze MCP JSON</button>
      <button type="button" onClick={() => { setRaw(''); clear(); setMessage('Input and findings cleared.'); }}>Reset</button>
    </div>
    <details><summary>Try a fictional example</summary><div className="tool-grid">
      <label>Example<select value={example} onChange={event => setExample(event.target.value as keyof typeof mcpExamples)}><option value="read">Constrained read tool</option><option value="write">Broad destructive tool</option><option value="network">Arbitrary network request</option></select></label>
      <button type="button" onClick={() => { setRaw(JSON.stringify(mcpExamples[example], null, 2)); clear(); setMessage('Fictional example loaded. Analyze it to see the findings.'); }}>Load example</button>
    </div></details>
    {error && <div id={`${id}-error`} role="alert"><Warning level="danger" title={error} /></div>}
    <span role="status">{message}</span>
    {result ? <>
      <Insight what={`${result.posture} · ${result.counts.FAIL} FAIL, ${result.counts.WARN} WARN`} why={`Main review area: ${result.mainRisk}. Findings describe supplied declarations, not observed server behavior.`} tip={result.firstAction} />
      <p>{result.toolCount} tool definitions · {result.counts.PASS} narrow PASS checks · {result.counts.INFO} context notes. FAIL means a stronger declared risk signal; WARN needs review; INFO records a limit or unknown. No numeric security score.</p>
      <p>{result.note}</p>
      {result.omitted > 0 && <Warning level="warn" title={`${result.omitted} additional findings not displayed`}>Review a smaller sample to inspect every location. Results are capped to keep the interface usable.</Warning>}
      {mcpCategories.map(category => {
        const matches = result.findings.filter(finding => finding.category === category);
        if (!matches.length) return null;
        return <section key={category} aria-label={category}>
          <h3>{category} · {matches.length}</h3>
          {matches.map((finding, index) => <details key={`${finding.path}-${index}`} open={finding.level === 'FAIL'} className="tool-box">
            <summary><strong>{finding.level}</strong> — {finding.evidence}</summary>
            <p><strong>Location:</strong> <code>{finding.path}</code></p>
            <dl><dt>Why it matters</dt><dd>{finding.why}</dd><dt>Likely risk</dt><dd>{finding.risk}</dd><dt>Safer direction</dt><dd>{finding.direction}</dd><dt>Confidence / context</dt><dd>{finding.context}</dd></dl>
          </details>)}
        </section>;
      })}
    </> : <p>Accepts one tool, a tool array, a tools/list response, mcpServers configuration or generic tool JSON. It recognizes common fields, not every client format. Results appear only after analysis.</p>}
    <details><summary>What this review cannot establish</summary><p>This is not malware detection, penetration testing, runtime scanning or a security certification. It does not resolve schema references, inspect server code or prove that an approval, read-only hint, allowlist or output schema is enforced. No result copy/export is offered: findings and configurations stay off shared links and analytics.</p></details>
    <p><a href="https://modelcontextprotocol.io/specification/2026-07-28/server/tools" target="_blank" rel="noreferrer">MCP tool definitions and trust boundaries</a> · <a href="https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices" target="_blank" rel="noreferrer">MCP security best practices</a></p>
  </div>;
}
