import {useEffect, useId, useRef, useState} from 'react';
import Insight from '../shared/Insight';
import {copyText} from '../shared/exportHelpers';
import {trackShareAction, trackToolResult} from '../../../utils/analytics';
import {browserAiActions, browserAiCapabilities, browserAiProvider, browserAiReviewedAt, browserAiSnippet, browserAiSources, checkBrowserAi, defaultBrowserAiOptions, promptLanguages, summarizeBrowserAi, translationLanguages, type BrowserAiOptions, type BrowserAiResult} from './browserAiModel';
import './newTools.css';
import './browserAi.css';

export default function BrowserAiCapabilityChecker({toolSlug}:{toolSlug:string}) {
  const [options,setOptions]=useState<BrowserAiOptions>({...defaultBrowserAiOptions});
  const [results,setResults]=useState<BrowserAiResult[]>();
  const [environment,setEnvironment]=useState<{secure:boolean;topLevel:boolean}>();
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const generation=useRef(0), id=useId();
  useEffect(()=>()=>{generation.current++;},[]);
  const change=(patch:Partial<BrowserAiOptions>)=>{setOptions(o=>({...o,...patch}));setResults(undefined);setEnvironment(undefined);setMessage('Options changed. Run a new check.');};
  const run=async()=>{
    const current=++generation.current;
    setBusy(true);setResults(undefined);setMessage('');
    setEnvironment({secure:window.isSecureContext,topLevel:window.self===window.top});
    const checked=await checkBrowserAi(browserAiProvider(window),options);
    if(current!==generation.current)return;
    setResults(checked);setBusy(false);
    trackToolResult(); // Public tool metadata only; no capability state or options.
  };
  const reset=()=>{generation.current++;setBusy(false);setResults(undefined);setEnvironment(undefined);setOptions({...defaultBrowserAiOptions});setMessage('Check cleared. No device results were saved.');};
  const copy=async(text:string)=>{
    const ok=await copyText(text);
    setMessage(ok?'Default detection example copied. No runtime results included.':'Clipboard unavailable. Select the example text to copy.');
    if(ok)trackShareAction({monster:'toolooo',content_type:'tool',slug:toolSlug,action:'copy_result'});
  };
  const summary=results? summarizeBrowserAi(results):undefined;
  return <div className="tool-workbench browser-ai">
    <p><strong>Check what this browser can offer, without running AI.</strong> Detect built-in APIs and ask their availability only. No model creation, inference or download initiated by Toolooo. Results stay in this page’s memory.</p>
    <div className="tool-grid">
      <label htmlFor={`${id}-from`}>Translation from<select id={`${id}-from`} value={options.sourceLanguage} disabled={busy} onChange={e=>change({sourceLanguage:e.target.value})}>{Object.entries(translationLanguages).map(([code,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></label>
      <label htmlFor={`${id}-to`}>Translation to<select id={`${id}-to`} value={options.targetLanguage} disabled={busy} onChange={e=>change({targetLanguage:e.target.value})}>{Object.entries(translationLanguages).map(([code,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></label>
    </div>
    <small>Example language choices, not a supported-pair list. The browser decides availability for this pair.</small>
    <details><summary>Prompt API options</summary><div className="tool-grid">
      <label htmlFor={`${id}-language`}>Text input / output language<select id={`${id}-language`} value={options.promptLanguage} disabled={busy} onChange={e=>change({promptLanguage:e.target.value as BrowserAiOptions['promptLanguage']})}>{Object.entries(promptLanguages).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
      <label htmlFor={`${id}-modality`}>Input modalities<select id={`${id}-modality`} value={options.modality} disabled={busy} onChange={e=>change({modality:e.target.value as BrowserAiOptions['modality']})}><option value="text">Text</option><option value="image">Text + image</option><option value="audio">Text + audio</option></select></label>
    </div><p>Text output only. This checks configuration support without requesting any text, image, microphone or file. Other task APIs use defaults; Proofreader checks English input.</p></details>
    <div className="tool-actions"><button type="button" className="k-button k-button--primary" disabled={busy} onClick={run}>{busy?'Checking locally…':results?'Re-check browser':'Run Check'}</button><button type="button" onClick={reset}>Reset check</button></div>
    <p role="status" aria-live="polite">{message|| (busy?'One availability check per API; up to 3 seconds.':'No model or agent is started by this checker.')}</p>
    <Insight what={summary?`${summary.overall} — ${summary.ready} of ${summary.total} model APIs ready for the checked options.`:'Run Check to inspect this page’s current browser context.'}
      why={summary?`${summary.exposed} of ${summary.total} model API surfaces exposed. ${summary.download} download required · ${summary.downloading} downloading · ${summary.unavailable} unavailable · ${summary.missing} not exposed · ${summary.unknown} unknown. WebMCP is separate and is not a model.`:'API exposure, model availability and documented maturity are different. A stable API can be unavailable; an experimental API can be ready locally.'}
      tip={summary?.ready?'Enable only the enhancements reported ready, handle later failures, and keep the standard non-AI experience. Experimental readiness is not a production-support guarantee.':'Keep the standard non-AI experience usable. Downloads need an informed user choice in your application; this checker never starts them.'}/>
    {environment&&<p className="browser-ai-context"><strong>Page context:</strong> {environment.secure?'Secure context':'Not a secure context'} · {environment.topLevel?'Top-level page':'Inside an iframe'}. {environment.secure?'':'Use HTTPS or a trustworthy local origin. '}No browser version or hardware profile collected.</p>}
    <section aria-busy={busy} aria-labelledby={`${id}-capabilities`}>
      <h2 id={`${id}-capabilities`}>Browser AI capabilities</h2>
      <p>Documentation reviewed {browserAiReviewedAt}. Runtime state applies to this page and the checked options, not every site or device.</p>
      <ul className="browser-ai-capabilities">{browserAiCapabilities.map(capability=>{
        const result=results?.find(r=>r.id===capability.id), snippet=browserAiSnippet(capability);
        return <li key={capability.id}>
          <div className="browser-ai-heading"><h3>{capability.name}</h3><strong className="browser-ai-state" data-state={result?.state}>{result?.state||'NOT CHECKED'}</strong></div>
          <small>{capability.category} · {capability.status}</small>
          <p>{capability.purpose}</p>
          <dl className="browser-ai-facts"><div><dt>API surface</dt><dd><code>{result?.surface||capability.paths[0]}</code></dd></div><div><dt>Runs locally?</dt><dd>{capability.id==='webmcp'?'Not a model; agent locality varies':'Chrome manages local models; not executed here'}</dd></div></dl>
          {result&&<p><strong>Next:</strong> {browserAiActions[result.state]}</p>}
          <details><summary>{capability.name} details &amp; safe code</summary>
            <p>{result?.detail||'Not checked yet. Run Check to inspect this page context.'}</p>
            <p><strong>Checked options:</strong> {capability.options?JSON.stringify(capability.options(options)):'API defaults only'}</p>
            <p><strong>Documented platform:</strong> {capability.platform}</p>
            <p><strong>Model:</strong> {capability.model}</p><p>{capability.notes}</p>
            <p><a href={capability.source} target="_blank" rel="noopener noreferrer">Official {capability.name} documentation</a>{capability.id==='proofreader'&&<> · <a href={browserAiSources.proofreaderIdl} target="_blank" rel="noopener noreferrer">Draft IDL</a></>}{capability.id==='webmcp'&&<> · <a href={browserAiSources.webmcpIdl} target="_blank" rel="noopener noreferrer">Current draft surface</a></>}</p>
            <p><strong>Detection example:</strong> fixed default options, not your runtime result. Add bounded error handling appropriate to your app.</p>
            <pre tabIndex={0} aria-label={`${capability.name} detection example`}><code>{snippet}</code></pre>
            <button type="button" onClick={()=>copy(snippet)}>Copy {capability.name} example</button>
          </details>
        </li>;
      })}</ul>
    </section>
    <section className="tool-box"><h2>Keep the website useful without AI</h2>
      <ol className="browser-ai-flow"><li>Detect the API</li><li>Ask availability</li><li>Ready → offer native enhancement</li><li>Download needed → explain and let the user choose</li><li>Unavailable / unknown → keep non-AI UX</li></ol>
      <p>Native-only enhancement with a non-AI baseline is the default recommendation. A cloud fallback transfers data to another service; choose it only with a separate privacy and product decision. A polyfill may have different model, download and data handling requirements. None is loaded here.</p>
      <p>Local AI still needs safe input handling, output validation, content safety and prompt-injection defenses. Any agent action also needs enforced authorization and appropriate human approval.</p>
    </section>
    <details className="tool-box"><summary>Environment, download &amp; privacy boundaries</summary>
      <p>Chrome foundation-model guidance currently lists eligible desktop operating systems, at least 22 GB free profile-volume storage, either GPU VRAM above 4 GB or CPU execution with at least 16 GB RAM and four cores, and an unmetered initial download connection. Audio input needs a GPU. Translator and Language Detector have separate model requirements.</p>
      <p>These are dated documentation facts, not measurements of your device. Toolooo does not inspect RAM, CPU, GPU, storage capacity, user agent or installed software. Unavailable can mean unsupported options, platform, hardware, browser policy or context; the API does not necessarily reveal which.</p>
      <p>Prompt access defaults to top-level and same-origin frames; cross-origin frames need Permissions Policy delegation. Prompt is not currently exposed in Web Workers. WebMCP has its own tools policy. Checks here describe this document only.</p>
      <p>Chrome documents local processing after model availability; that is not a universal vendor guarantee. This page never creates a model session, calls inference, registers tools or requests a download. Chrome may manage models independently of this page. Translator can intentionally mask language-pack installation state.</p>
      <p>Results and option choices are ephemeral. No capability vector is put into URLs, storage, analytics or share output. Page sharing uses the generic canonical tool link only. Copy buttons copy fixed detection examples, not your results. Consent-controlled analytics receive generic public tool actions only. Reset clears this check; a timed-out browser availability operation cannot be cancelled by an undocumented API.</p>
      <p><a href={browserAiSources.overview} target="_blank" rel="noopener noreferrer">Current Chrome API status</a> · <a href={browserAiSources.lifecycle} target="_blank" rel="noopener noreferrer">Availability, hardware and download lifecycle</a></p>
    </details>
  </div>;
}
