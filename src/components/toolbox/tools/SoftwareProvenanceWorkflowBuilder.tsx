import {useId,useState} from 'react';
import Insight from '../shared/Insight';
import {copyText,downloadMarkdown,downloadText} from '../shared/exportHelpers';
import {trackShareAction,trackToolResult} from '../../../utils/analytics';
import {url} from '../../../utils/url';
import {buildProvenance,provenanceArtifactNotes,provenanceChoices,provenanceDefaults,provenanceEnvironmentNotes,provenanceMetadata,provenancePreset,provenancePresets,type ProvenanceConfig,type ProvenancePreset} from './provenanceModel';
import './newTools.css';
import './provenance.css';

export default function SoftwareProvenanceWorkflowBuilder({toolSlug}:{toolSlug:string}) {
  const [config,setConfig]=useState<ProvenanceConfig>({...provenanceDefaults}), [result,setResult]=useState<ReturnType<typeof buildProvenance>>();
  const [preset,setPreset]=useState(''),[selected,setSelected]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
  const id=useId(), container=config.artifactType==='container',github=config.platform==='github',existing=config.reusable==='existing';
  const update=(patch:Partial<ProvenanceConfig>)=>{setConfig(c=>({...c,...patch}));setResult(undefined);setSelected('');setError('');setMessage('');};
  const choice=(key:keyof typeof provenanceChoices,label:string)=><label htmlFor={`${id}-${key}`}>{label}<select id={`${id}-${key}`} value={config[key]} onChange={e=>update({[key]:e.target.value})}>{Object.entries(provenanceChoices[key]).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>;
  const field=(key:keyof ProvenanceConfig,label:string,placeholder:string,multiline=false)=><label htmlFor={`${id}-${key}`}>{label}{multiline?<textarea id={`${id}-${key}`} value={config[key]} spellCheck={false} maxLength={6000} placeholder={placeholder} onChange={e=>update({[key]:e.target.value})}/>:<input id={`${id}-${key}`} value={config[key]} maxLength={300} spellCheck={false} autoComplete="off" placeholder={placeholder} onChange={e=>update({[key]:e.target.value})}/>}</label>;
  const generate=()=>{try{const next=buildProvenance(config);setResult(next);setSelected(next.files[0].name);setMessage('');setError('');trackToolResult();}catch{setError('Review the configuration: choose supported options, remove control characters and keep fields within their limits.');setResult(undefined);}};
  const active=result?.files.find(f=>f.name===selected)||result?.files[0];
  const copy=async()=>{if(!active)return;const ok=await copyText(active.text);setMessage(ok?'The displayed file was copied exactly. Review private details before sharing it.':'Clipboard unavailable. Use Download file.');if(ok)trackShareAction({monster:'toolooo',content_type:'tool',slug:toolSlug,action:'copy_result'});};
  return <div className="tool-workbench provenance-builder">
    <p><strong>Build → attest → publish → verify → enforce.</strong> Plan a pipeline that consumers can verify. Provenance improves integrity and traceability; it does not prove software is free of vulnerabilities or malicious code.</p>
    <label htmlFor={`${id}-preset`}>Workflow starting point<select id={`${id}-preset`} value={preset} onChange={e=>{setConfig(provenancePreset(e.target.value as ProvenancePreset));setPreset(e.target.value);setResult(undefined);setMessage('Starting point loaded. Supply your own paths and commands; no repository was inspected.');setError('');}}><option value="" disabled>Choose a starting point or configure below</option>{Object.keys(provenancePresets).map(name=><option key={name}>{name}</option>)}</select></label>
    <small>Starting points replace the configuration. Commands and artifact identities are intentionally blank; placeholders are examples only.</small>
    <div className="provenance-workspace"><section className="tool-box" aria-labelledby={`${id}-configure`}>
      <h2 id={`${id}-configure`}>1. Define your pipeline</h2>
      <div className="tool-grid">{choice('platform','Build platform')}{choice('artifactType','Artifact type')}{choice('release','Release model')}{choice('verification','Verification stage')}</div>
      {container?field('imageName',github?'GHCR image name — no tag or digest':'Image identity — architecture reference',github?'ghcr.io/owner/image':'registry.example/project/image'):field('artifactPath','Final artifact file path','dist/app.tar.gz')}
      <p>{provenanceArtifactNotes[config.artifactType]}</p>
      {github&&<>{field('repository','Expected artifact repository','owner/repository')}
        {!existing&&field('buildCommand',container?'Actual build commands — produce $IMAGE_NAME:$GITHUB_SHA':'Actual build commands','Enter the commands your project already uses',true)}
        {container&&<p>GHCR is the supported generated registry. Your build must tag the final local image as <code>$IMAGE_NAME:$GITHUB_SHA</code>. The pipeline pushes it, captures its digest and then attaches attestations. Consumer examples require a trusted release digest.</p>}
        {!container&&choice('publish','Publish destination')}
        {!container&&config.publish==='external'&&field('publishCommand','Actual publish commands — preserve the final bytes','Your existing publish operation',true)}
      </>}
      {!github&&<p>Generic CI produces a provider-independent architecture and policy guide only. No GitHub YAML or invented signing/verification commands.</p>}
      {['main','custom'].includes(config.release)&&field('branch','Release branch','main')}
      <details><summary>SBOM — separate component evidence</summary>
        <div className="tool-grid">{choice('sbom','SBOM source')}{config.sbom!=='none'&&choice('sbomFormat','Expected SBOM format')}</div>
        {config.sbom!=='none'&&<>{field('sbomPath','JSON SBOM path','sbom.cdx.json')}{['generate','external'].includes(config.sbom)&&!existing&&field('sbomCommand','Actual SBOM generation / retrieval commands','Use your established generator; no installation is inferred',true)}<p>The SBOM must describe the final artifact. Its signature does not verify component completeness. <a href={url('/toolbox/browser-sbom-generator/')}>Browser SBOM Generator</a> can help inspect supported npm lockfiles; validate coverage of the distributed output.</p></>}
      </details>
      <details><summary>Trust policy, reusable builds &amp; deployment</summary>
        <div className="tool-grid">{choice('visibility','Repository visibility')}{choice('goal','Security goal')}{choice('reusable','Reusable build')}{choice('environment','Deployment environment')}</div>
        <p>{provenanceEnvironmentNotes[config.environment]}</p>
        {existing&&field('reusableRef','Vetted reusable workflow at an immutable commit','owner/builders/.github/workflows/build.yml@40-character-commit-SHA')}
        {config.reusable==='create'&&<p>Exports a fixed-command builder and a same-repository caller, without arbitrary command inputs or inherited secrets. This template does not establish isolation or a SLSA level. Harden and review the builder before use.</p>}
        {field('owner','Trusted organization — optional','owner')}{field('signerRepo','Trusted signer repository — optional','owner/builders')}{field('signerWorkflow','Trusted signer workflow — optional','owner/builders/.github/workflows/build.yml')}{field('sourceRef','Required source ref — optional','refs/tags/v1.0.0')}
        <p>Empty signer fields derive from your generated workflow or the pinned existing builder. Existing reusable workflows receive no caller inputs; confirm their contract independently.</p>
        {['deployment','multiple'].includes(config.verification)&&<>{field('deployCommand','Actual deployment commands — optional','Use $ARTIFACT_PATH, or deploy the container $VERIFIED_IMAGE unchanged',true)}<p>Verification precedes deployment. No environment credentials, admission controller or deployment permissions are invented. Use protected environments and deploy the exact verified identity.</p></>}
        <div className="tool-grid">{choice('permissions','Existing workflow permissions')}{choice('subjectStage','Artifact path identifies')}</div>
      </details>
      <div className="tool-actions"><button type="button" className="k-button k-button--primary" onClick={generate}>Generate workflow plan</button><button type="button" onClick={()=>{setConfig({...provenanceDefaults});setPreset('');setResult(undefined);setSelected('');setMessage('Configuration cleared. Nothing was saved.');setError('');}}>Reset</button></div>
      {error&&<p role="alert">{error}</p>}<p role="status" aria-live="polite">{message}</p>
    </section>
    <section className="provenance-output" aria-labelledby={`${id}-plan`}>
      <h2 id={`${id}-plan`}>2. Review the plan</h2>
      <Insight what={result?.summary||'Enter your real artifact identity and build commands, then generate a plan.'} why="A signed claim needs an expected signer, matching artifact bytes and an enforced verification policy to be useful." tip={result?.findings.some(f=>f.status==='FAIL')?'Resolve FAIL findings, regenerate, then review the exact files before using them.':config.platform==='generic'?'Map the plan to your provider’s official signing and verification mechanisms.':'Review permissions and identity restrictions, test the workflow yourself, and make verification fail closed before use.'}/>
      <ol className="provenance-flow">{(result?.steps||['Source','Build final artifact','Attest provenance','Publish','Verify identity + digest','Enforce before use']).map((step,i)=><li key={i}>{step}</li>)}</ol>
      {result&&<>
        <section className="tool-box"><h3>Security review</h3><ul className="provenance-findings">{result.findings.map((f,i)=><li key={i}><strong>{f.status} — {f.title}</strong><p>{f.action}</p></li>)}</ul></section>
        <details className="tool-box"><summary>SLSA readiness &amp; acceptance policy</summary><p>{result.readiness}</p><p>{result.nextLevel}</p><p>No achieved level is verified by Toolooo.</p><ul>{result.policy.map(p=><li key={p}>{p}</li>)}</ul><dl>{provenanceMetadata.levels.map(([level,meaning])=><div key={level}><dt>{level}</dt><dd>{meaning}</dd></div>)}</dl></details>
        <section className="tool-box"><h3>Generated files</h3><label htmlFor={`${id}-file`}>File preview<select id={`${id}-file`} value={active?.name} onChange={e=>{setSelected(e.target.value);setMessage('');}}>{result.files.map(f=><option key={f.name}>{f.name}</option>)}</select></label>
          <p>{active?.kind==='yaml'?'Save this reviewed file inside .github/workflows/. This is exported text, never executed here.':'Local architecture, verification and policy guide. Executable commands are omitted until blocking findings are resolved.'}</p>
          <pre tabIndex={0} aria-label="Generated provenance file"><code>{active?.text}</code></pre>
          <div className="tool-actions"><button type="button" onClick={copy}>Copy displayed file</button><button type="button" onClick={()=>{if(!active)return;if(active.kind==='markdown')downloadMarkdown(active.text,active.name);else downloadText(active.text,active.name);setMessage('Displayed file downloaded exactly. No workflow was installed or executed.');}}>Download file</button></div>
        </section>
      </>}
    </section></div>
    <details className="tool-box"><summary>What this plan establishes, privacy &amp; official sources</summary>
      <p>Provenance records where/how software was built. An attestation signs a claim about an artifact; an SBOM lists components. Verification checks the artifact and expected identity/predicate; policy decides whether to use it. None proves the software is safe.</p>
      <p>{provenanceMetadata.availability}</p><p>{provenanceMetadata.transparency}</p>
      <p>Attest releases people will verify. Consider immutable releases to reduce artifact/tag mutation risk. Retain attestations for supported artifacts; deleting them can break consumer verification. No deletion automation is generated.</p>
      <p>All configuration remains in page memory. No repository access, GitHub requests, hashing, signing, upload, storage or CI execution occurs here. Analytics receive generic public tool actions only. Copy/download deliberately includes your supplied configuration; review private information before sharing files. Page sharing contains only the canonical tool URL.</p>
      <p>Official guidance reviewed {provenanceMetadata.verifiedAt}: {Object.entries(provenanceMetadata.sources).map(([name,url],i)=><span key={name}>{i?' · ':''}<a href={url} target="_blank" rel="noopener noreferrer">{name}</a></span>)}</p>
    </details>
  </div>;
}
