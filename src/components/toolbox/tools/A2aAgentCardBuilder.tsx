import {useEffect, useId, useRef, useState} from 'react';
import Insight from '../shared/Insight';
import {copyText, downloadJSONText, downloadText} from '../shared/exportHelpers';
import {trackShareAction, trackToolResult} from '../../../utils/analytics';
import {agentCardMetadata as metadata, agentCardLimits, agentCardPreset, agentCardPresets, discoveryUrl, emptySigningPlan, legacyAgentCard, moveItem, newInterface, newOAuthFlow, newSecurityScheme, newSkill, object, parseAgentCard, reviewAgentCard, sensitiveText, signingPlanText, splitLines, splitList, type AgentCard, type AgentCardPreset, type JsonObject, type SecurityRequirement, type SigningPlan} from './agentCardModel';
import './newTools.css';
import './agentCard.css';

/** Preserve delimiters while typing; the card itself still updates on each keystroke. */
function CardField({label,value,onChange,multiline=false,hint}:{label:string;value:string;onChange:(value:string)=>void;multiline?:boolean;hint?:string}) {
  const id=useId(),[draft,setDraft]=useState(value),[editing,setEditing]=useState(false);
  useEffect(()=>{if(!editing)setDraft(value);},[value,editing]);
  const props={id,value:draft,maxLength:multiline?6000:2000,autoComplete:'off',spellCheck:false,onFocus:()=>setEditing(true),onBlur:()=>setEditing(false),onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{setDraft(e.target.value);onChange(e.target.value);}};
  return <label htmlFor={id}>{label}{multiline?<textarea {...props} rows={3}/>:<input {...props}/ >}{hint&&<small>{hint}</small>}</label>;
}

function Requirements({value,onChange,schemes,label}:{value:SecurityRequirement[]|undefined;onChange:(value:SecurityRequirement[]|undefined)=>void;schemes:JsonObject;label:string}) {
  const id=useId(), groups=value||[];
  const change=(index:number,next:SecurityRequirement)=>onChange(groups.map((g,i)=>i===index?next:g));
  return <fieldset className="agent-card-requirements"><legend>{label}</legend>
    <small>Alternatives are OR; selected schemes inside a group are AND. No requirements permits public access. A skill declaration overrides the card default.</small>
    {groups.map((group,index)=><div className="agent-card-requirement" key={index}><strong>Alternative {index+1}</strong>
      {Object.keys(schemes).map((name,i)=>{const selected=Object.hasOwn(group.schemes,name),oauth=!!(schemes[name]?.oauth2SecurityScheme||schemes[name]?.openIdConnectSecurityScheme);return <div key={name}><label className="agent-card-check" htmlFor={`${id}-${index}-${i}`}><input id={`${id}-${index}-${i}`} type="checkbox" checked={selected} onChange={e=>{const next={...group.schemes};if(e.target.checked)next[name]={list:[]};else delete next[name];change(index,{...group,schemes:next});}}/>{name}</label>{selected&&oauth&&<CardField label="Required scopes — comma separated" value={group.schemes[name].list.join(', ')} onChange={value=>change(index,{...group,schemes:{...group.schemes,[name]:{...group.schemes[name],list:splitList(value)}}})}/>}</div>;})}
      {!Object.keys(group.schemes).length&&<small>Empty group: anonymous access is an alternative.</small>}
      <button type="button" onClick={()=>onChange(groups.filter((_,i)=>i!==index))}>Remove alternative {index+1}</button>
    </div>)}
    <div className="tool-actions"><button type="button" disabled={!Object.keys(schemes).length||groups.length>=8} onClick={()=>onChange([...groups,{schemes:{[Object.keys(schemes)[0]]:{list:[]}}}])}>Add authentication alternative</button>{value!==undefined&&<button type="button" onClick={()=>onChange(undefined)}>Use inherited / public default</button>}</div>
    {!Object.keys(schemes).length&&<small>Define a named security scheme first.</small>}
  </fieldset>;
}

export default function A2aAgentCardBuilder({toolSlug}:{toolSlug:string}) {
  const id=useId();
  const reorderFocus=useRef<'interface'|'skill'|undefined>(undefined),interfaceList=useRef<HTMLOListElement>(null),skillSelect=useRef<HTMLSelectElement>(null);
  const [card,setCard]=useState<AgentCard>(()=>agentCardPreset('Minimal Public Agent'));
  const [preset,setPreset]=useState<AgentCardPreset>('Minimal Public Agent'),[interfaceIndex,setInterfaceIndex]=useState(0),[skillIndex,setSkillIndex]=useState(0),[schemeIndex,setSchemeIndex]=useState(0);
  const [importText,setImportText]=useState(''),[analysis,setAnalysis]=useState<ReturnType<typeof reviewAgentCard>>(),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [domain,setDomain]=useState(''),[sensitiveWork,setSensitiveWork]=useState(false),[plan,setPlan]=useState<SigningPlan>({...emptySigningPlan});
  useEffect(()=>{
    if(reorderFocus.current==='interface')interfaceList.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    if(reorderFocus.current==='skill')skillSelect.current?.focus();
    reorderFocus.current=undefined;
  },[interfaceIndex,skillIndex]);
  const review=analysis||reviewAgentCard(card,sensitiveWork),discovery=discoveryUrl(domain),schemes=card.securitySchemes||{},schemeNames=Object.keys(schemes),schemeName=schemeNames[schemeIndex]||schemeNames[0],definition=schemes[schemeName]||{},schemeKind=metadata.schemes.find(k=>Object.hasOwn(definition,k)),schemeBody=schemeKind?definition[schemeKind]:{};
  const currentInterface=card.supportedInterfaces[interfaceIndex],currentSkill=card.skills[skillIndex];
  const update=(next:AgentCard)=>{setCard(next);setMessage('');setError('');};
  const patch=(values:Partial<AgentCard>)=>update({...card,...values});
  const optional=(key:string,value:unknown)=>{const next={...card};if(value===undefined||value==='')delete next[key];else next[key]=value;update(next);};
  const interfacePatch=(values:JsonObject)=>patch({supportedInterfaces:card.supportedInterfaces.map((entry,i)=>i===interfaceIndex?{...entry,...values}:entry)});
  const skillPatch=(values:JsonObject)=>patch({skills:card.skills.map((entry,i)=>{if(i!==skillIndex)return entry;const next={...entry,...values};for(const [key,value] of Object.entries(values))if(value===undefined)delete next[key];return next;})});
  const schemePatch=(values:JsonObject)=>{if(!schemeKind)return;const body={...schemeBody,...values};for(const [key,value] of Object.entries(values))if(value===undefined||value==='')delete body[key];patch({securitySchemes:{...schemes,[schemeName]:{...definition,[schemeKind]:body}}});};
  const field=(label:string,value:string,onChange:(value:string)=>void,multiline=false,hint?:string)=><CardField key={label} {...{label,value,onChange,multiline,hint}}/>;
  const select=(label:string,value:string,choices:readonly string[],onChange:(value:string)=>void)=>{const key=`${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;return <label htmlFor={key}>{label}<select id={key} value={value} onChange={e=>onChange(e.target.value)}>{choices.map(choice=><option key={choice}>{choice}</option>)}</select></label>;};
  const checkbox=(label:string,checked:boolean,onChange:(checked:boolean)=>void)=>{const key=`${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;return <label htmlFor={key} className="agent-card-check"><input id={key} type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>{label}</label>;};
  const load=(name:AgentCardPreset)=>{setPreset(name);setInterfaceIndex(0);setSkillIndex(0);setSchemeIndex(0);setPlan({...emptySigningPlan});setSensitiveWork(false);setError('');setMessage('');setImportText('');setDomain('');if(name==='Legacy Agent Card')setAnalysis(reviewAgentCard(legacyAgentCard));else{setAnalysis(undefined);setCard(agentCardPreset(name));}};
  const copy=async(text:string,label:string)=>{if(review.blocked)return;const ok=await copyText(text);setMessage(ok?`${label} copied. Review your public metadata before distributing it.`:'Clipboard unavailable. Use the local download.');if(ok)trackShareAction({monster:'toolooo',content_type:'tool',slug:toolSlug,action:'copy_result'});};
  const analyze=()=>{const parsed=parseAgentCard(importText);setImportText('');setMessage('');if(parsed.error){setError(parsed.error);setAnalysis(undefined);return;}setError('');setAnalysis(reviewAgentCard(parsed.card,sensitiveWork));trackToolResult();};
  const editImported=(unsigned=false)=>{if(!analysis||analysis.blocked||!object(analysis.safe))return;const next={...analysis.safe} as AgentCard;if(unsigned)delete next.signatures;setCard(next);setInterfaceIndex(0);setSkillIndex(0);setSchemeIndex(0);setAnalysis(undefined);setMessage(unsigned?'An unsigned editable copy was created. Existing signatures were explicitly removed; sign the final card externally.':'Current card loaded. Unrecognized fields remain in the document.');};
  const renameScheme=(name:string)=>{
    if(!name.trim()||name===schemeName)return;
    if(['__proto__','constructor','prototype'].includes(name)||Object.hasOwn(schemes,name)){setError('Use a unique, non-reserved scheme name.');return;}
    const renamed=Object.fromEntries(Object.entries(schemes).map(([key,value])=>[key===schemeName?name:key,value]));
    const rename=(groups:SecurityRequirement[]|undefined)=>groups?.map(group=>({...group,schemes:Object.fromEntries(Object.entries(group.schemes).map(([key,value])=>[key===schemeName?name:key,value]))}));
    update({...card,securitySchemes:renamed,...(card.securityRequirements?{securityRequirements:rename(card.securityRequirements)}:{}),skills:card.skills.map(skill=>({...skill,...(skill.securityRequirements?{securityRequirements:rename(skill.securityRequirements)}:{})}))});
  };
  const renderExtensions=()=>{const extensions:JsonObject[]=card.capabilities.extensions||[];return <>
    <p>Extensions describe contracts. Required extensions restrict compatible clients. Parameter objects remain local and must contain only public metadata.</p>
    {extensions.map((ext,index)=><fieldset key={index}><legend>Extension {index+1}</legend>
      {field(`Extension ${index+1} URI`,ext.uri||'',value=>patch({capabilities:{...card.capabilities,extensions:extensions.map((e,i)=>i===index?{...e,uri:value}:e)}}))}
      {field(`Extension ${index+1} description`,ext.description||'',value=>patch({capabilities:{...card.capabilities,extensions:extensions.map((e,i)=>i===index?{...e,description:value}:e)}}))}
      {checkbox(`Extension ${index+1} required`,ext.required===true,value=>patch({capabilities:{...card.capabilities,extensions:extensions.map((e,i)=>i===index?{...e,required:value}:e)}}))}
      <label htmlFor={`${id}-params-${index}`}>Extension {index+1} params — JSON object<textarea key={JSON.stringify(ext.params)} id={`${id}-params-${index}`} defaultValue={JSON.stringify(ext.params||{},null,2)} rows={3} maxLength={8000} spellCheck={false} onBlur={e=>{const parsed=parseAgentCard(e.target.value);if(parsed.error||!object(parsed.card)){setError('Extension parameters must be a bounded JSON object. The previous parameters remain unchanged.');return;}patch({capabilities:{...card.capabilities,extensions:extensions.map((v,i)=>i===index?{...v,params:parsed.card}:v)}});}}/></label>
      <button type="button" onClick={()=>patch({capabilities:{...card.capabilities,extensions:extensions.filter((_,i)=>i!==index)}})}>Remove extension {index+1}</button>
    </fieldset>)}<button type="button" disabled={extensions.length>=8} onClick={()=>patch({capabilities:{...card.capabilities,extensions:[...extensions,{uri:'https://example.com/extensions/public-context',description:'Describe the public extension contract.'}]}})}>Add extension</button>
  </>;};
  return <div className="tool-workbench agent-card-builder">
    <p><strong>Describe an agent. Review its public contract. Export one card.</strong> Local metadata checks only: no server, discovery request, authentication, signing or A2A runtime is created.</p>
    <div className="agent-card-start">{select('Starting point',preset,agentCardPresets,name=>load(name as AgentCardPreset))}<button type="button" onClick={()=>load('Minimal Public Agent')}>Reset builder</button></div>
    <small>Starting points replace the current work. Example domains are placeholders; use your real public deployment details before publishing. Work is kept in memory only.</small>
    <details><summary>Import and analyze an existing card</summary>
      <label htmlFor={`${id}-import`}>Agent Card JSON — local only<textarea id={`${id}-import`} value={importText} rows={5} maxLength={agentCardLimits.chars} autoComplete="off" spellCheck={false} onChange={e=>setImportText(e.target.value)}/></label>
      <div className="tool-actions"><button type="button" className="k-button k-button--primary" disabled={!importText.trim()} onClick={analyze}>Analyze pasted JSON</button>{analysis&&<button type="button" onClick={()=>{setAnalysis(undefined);setError('');setMessage('Previous builder restored. Imported content was not applied.');}}>Return to builder</button>}</div>
      <small>Paste is cleared after analysis. Unknown fields are preserved and reported. Legacy cards are analyzed without automatic migration. No URLs or remote images are fetched.</small>
    </details>
    {error&&<p role="alert" className="agent-card-error">{error}</p>}
    {analysis&&<div className="tool-box"><h2>Imported card review</h2><p>{analysis.legacy?'Legacy format: review the migration findings. Start a current preset to build a modern card.':'Analysis is read-only. Review every finding before creating an editable copy.'}</p>{!analysis.blocked&&<button type="button" onClick={()=>editImported(!!(object(analysis.safe)&&analysis.safe.signatures))}>{object(analysis.safe)&&analysis.safe.signatures?'Create unsigned editable copy — remove existing signatures':'Edit current card — preserve unknown fields'}</button>}</div>}
    <div className={`agent-card-workspace${analysis?' agent-card-analysis':''}`}>
    {!analysis&&<section className="tool-box agent-card-editor" aria-labelledby={`${id}-edit`}>
      <h2 id={`${id}-edit`}>1. Describe the agent</h2>
      {field('Agent name',card.name,value=>patch({name:value}))}
      {field('Description',card.description,value=>patch({description:value}),true,'State the task, scope and result. This text will be public.')}
      {field('Agent version',card.version,value=>patch({version:value}),false,'Your agent release version; independent from the A2A wire version.')}
      <div className="tool-grid">{field('Default input modes',card.defaultInputModes.join(', '),value=>patch({defaultInputModes:splitList(value)}),false,'Comma separated media types, such as text/plain.')}{field('Default output modes',card.defaultOutputModes.join(', '),value=>patch({defaultOutputModes:splitList(value)}),false,'Skill-level modes may override these defaults.')}</div>
      <fieldset><legend>2. Supported interfaces</legend><p>The first interface is preferred. Add alternatives only when the server implements them.</p>
        <ol ref={interfaceList} className="agent-card-list">{card.supportedInterfaces.map((entry,index)=><li key={index}><button type="button" aria-pressed={index===interfaceIndex} onClick={()=>setInterfaceIndex(index)}>{index+1}. {entry.protocolBinding||'Binding missing'}{index===0?' · preferred':''}</button></li>)}</ol>
        {currentInterface&&<>
          {field('Interface endpoint',currentInterface.url,value=>interfacePatch({url:value}),false,currentInterface.protocolBinding==='GRPC'?'TLS gRPC address, such as grpc.example.com:443. Schema HTTPS endpoints are also accepted.':'Absolute production HTTPS URL; no credentials.')}
          <label htmlFor={`${id}-binding`}>Protocol binding<select id={`${id}-binding`} value={metadata.bindings.includes(currentInterface.protocolBinding as any)?currentInterface.protocolBinding:'custom'} onChange={e=>interfacePatch({protocolBinding:e.target.value==='custom'?'urn:example:binding':e.target.value})}>{metadata.bindings.map(binding=><option key={binding}>{binding}</option>)}<option value="custom">Custom URI binding</option></select></label>
          {!metadata.bindings.includes(currentInterface.protocolBinding as any)&&field('Custom binding URI',currentInterface.protocolBinding,value=>interfacePatch({protocolBinding:value}))}
          {field('Interface protocol version',currentInterface.protocolVersion,value=>interfacePatch({protocolVersion:value}),false,`Current wire version: ${metadata.protocolVersion}. The checked specification release is v${metadata.release}.`)}
          {field('Tenant — optional',currentInterface.tenant||'',value=>{const next={...currentInterface};if(value)next.tenant=value;else delete next.tenant;patch({supportedInterfaces:card.supportedInterfaces.map((e,i)=>i===interfaceIndex?next:e)});},false,'Opaque non-secret routing string; no tenant semantics are inferred.')}
          <div className="tool-actions"><button type="button" disabled={interfaceIndex===0} onClick={()=>{reorderFocus.current='interface';patch({supportedInterfaces:moveItem(card.supportedInterfaces,interfaceIndex,-1)});setInterfaceIndex(interfaceIndex-1);}}>Move interface up</button><button type="button" disabled={interfaceIndex===card.supportedInterfaces.length-1} onClick={()=>{reorderFocus.current='interface';patch({supportedInterfaces:moveItem(card.supportedInterfaces,interfaceIndex,1)});setInterfaceIndex(interfaceIndex+1);}}>Move interface down</button><button type="button" disabled={card.supportedInterfaces.length===1} onClick={()=>{patch({supportedInterfaces:card.supportedInterfaces.filter((_,i)=>i!==interfaceIndex)});setInterfaceIndex(0);}}>Remove interface</button></div>
        </>}
        <button type="button" disabled={card.supportedInterfaces.length>=agentCardLimits.interfaces} onClick={()=>{patch({supportedInterfaces:[...card.supportedInterfaces,newInterface()]});setInterfaceIndex(card.supportedInterfaces.length);}}>Add interface</button>
      </fieldset>
      <fieldset><legend>3. Focused skills</legend>
        <label htmlFor={`${id}-skill`}>Skill to edit<select ref={skillSelect} id={`${id}-skill`} value={skillIndex} onChange={e=>setSkillIndex(Number(e.target.value))}>{card.skills.map((skill,index)=><option key={index} value={index}>{index+1}. {skill.name||'Unnamed skill'}</option>)}</select></label>
        {currentSkill&&<>{field('Skill ID',currentSkill.id,value=>skillPatch({id:value}),false,'Unique in this card; no required snake_case convention.')}{field('Skill name',currentSkill.name,value=>skillPatch({name:value}))}{field('Skill description',currentSkill.description,value=>skillPatch({description:value}),true)}{field('Skill tags',currentSkill.tags.join(', '),value=>skillPatch({tags:splitList(value)}),false,'Comma separated; at least one tag.')}
          <details><summary>Skill examples, media overrides and security</summary>
            {field('Skill examples',currentSkill.examples?.join('\n')||'',value=>skillPatch({examples:value.trim()?splitLines(value):undefined}),true,'One representative public example per line. No private prompts.')}
            {field('Skill input modes — optional',currentSkill.inputModes?.join(', ')||'',value=>skillPatch({inputModes:value.trim()?splitList(value):undefined}))}
            {field('Skill output modes — optional',currentSkill.outputModes?.join(', ')||'',value=>skillPatch({outputModes:value.trim()?splitList(value):undefined}))}
            <Requirements label="Skill security requirements" value={currentSkill.securityRequirements} schemes={schemes} onChange={value=>skillPatch({securityRequirements:value})}/>
          </details>
          <div className="tool-actions"><button type="button" disabled={skillIndex===0} onClick={()=>{reorderFocus.current='skill';patch({skills:moveItem(card.skills,skillIndex,-1)});setSkillIndex(skillIndex-1);}}>Move skill up</button><button type="button" disabled={skillIndex===card.skills.length-1} onClick={()=>{reorderFocus.current='skill';patch({skills:moveItem(card.skills,skillIndex,1)});setSkillIndex(skillIndex+1);}}>Move skill down</button><button type="button" disabled={card.skills.length===1} onClick={()=>{patch({skills:card.skills.filter((_,i)=>i!==skillIndex)});setSkillIndex(0);}}>Remove skill</button></div>
        </>}
        <button type="button" disabled={card.skills.length>=32} onClick={()=>{let n=card.skills.length+1;while(card.skills.some(s=>s.id===`skill-${n}`))n++;patch({skills:[...card.skills,newSkill(n)]});setSkillIndex(card.skills.length);}}>Add skill</button>
      </fieldset>
      <details><summary>Provider, documentation and icon metadata</summary>
        {checkbox('Include provider',!!card.provider,checked=>optional('provider',checked?{organization:'',url:''}:undefined))}
        {card.provider&&<>{field('Provider organization',card.provider.organization,value=>optional('provider',{...card.provider,organization:value}))}{field('Provider URL',card.provider.url,value=>optional('provider',{...card.provider,url:value}))}</>}
        {field('Documentation URL — optional',card.documentationUrl||'',value=>optional('documentationUrl',value))}
        {field('Icon URL — optional',card.iconUrl||'',value=>optional('iconUrl',value),false,'Stored as text only. No image preview or remote request.')}
      </details>
      <details><summary>Capabilities and extensions</summary>
        <p>Declare only implemented behavior. These flags do not create streaming, notifications or an authenticated endpoint.</p>
        {(['streaming','pushNotifications','extendedAgentCard'] as const).map(key=><div key={key}>{checkbox(key==='streaming'?'Streaming':key==='pushNotifications'?'Push notifications':'Authenticated extended card',card.capabilities[key]===true,checked=>{const caps={...card.capabilities};if(checked)caps[key]=true;else delete caps[key];patch({capabilities:caps});})}</div>)}
        {renderExtensions()}
      </details>
      <details><summary>Authentication declarations — no credentials</summary>
        <p>Define authentication metadata only. Never paste tokens, passwords, client secrets or private keys. Your server must enforce authorization separately.</p>
        {schemeNames.length>0&&<>
          <label htmlFor={`${id}-scheme`}>Security scheme to edit<select id={`${id}-scheme`} value={schemeIndex} onChange={e=>setSchemeIndex(Number(e.target.value))}>{schemeNames.map((name,index)=><option key={name} value={index}>{name}</option>)}</select></label>
          {field('Scheme name',schemeName,renameScheme)}
          {select('Security scheme type',schemeKind||'httpAuthSecurityScheme',metadata.schemes,value=>patch({securitySchemes:{...schemes,[schemeName]:newSecurityScheme(value)}}))}
          {field('Scheme description — optional',schemeBody.description||'',value=>schemePatch({description:value||undefined}))}
          {schemeKind==='apiKeySecurityScheme'&&<>{select('API key location',schemeBody.location,['header','query','cookie'],value=>schemePatch({location:value}))}{field('API key parameter name',schemeBody.name,value=>schemePatch({name:value}),false,'Parameter/header name, never the key value.')}</>}
          {schemeKind==='httpAuthSecurityScheme'&&<>{field('HTTP auth scheme',schemeBody.scheme,value=>schemePatch({scheme:value}))}{field('Bearer format — optional',schemeBody.bearerFormat||'',value=>schemePatch({bearerFormat:value||undefined}),false,'For example JWT; never an actual JWT.')}</>}
          {schemeKind==='openIdConnectSecurityScheme'&&field('OpenID Connect URL',schemeBody.openIdConnectUrl,value=>schemePatch({openIdConnectUrl:value}))}
          {schemeKind==='oauth2SecurityScheme'&&(()=>{const flowKind=metadata.flows.find(k=>Object.hasOwn(schemeBody.flows,k))||'authorizationCode',flow=schemeBody.flows[flowKind];const flowPatch=(values:JsonObject)=>{const next={...flow,...values};for(const [k,v]of Object.entries(values))if(v===undefined||v==='')delete next[k];schemePatch({flows:{...schemeBody.flows,[flowKind]:next}});};return <>
            {select('OAuth flow',flowKind,metadata.flows,value=>schemePatch({flows:{[value]:newOAuthFlow(value)}}))}
            {['implicit','password'].includes(flowKind)&&<p>Deprecated in A2A v{metadata.release}. Prefer a suitable current flow.</p>}
            {['authorizationCode','implicit'].includes(flowKind)&&field('OAuth authorization URL',flow.authorizationUrl||'',value=>flowPatch({authorizationUrl:value}))}
            {flowKind!=='implicit'&&field('OAuth token URL',flow.tokenUrl||'',value=>flowPatch({tokenUrl:value}))}
            {flowKind==='deviceCode'&&field('OAuth device authorization URL',flow.deviceAuthorizationUrl||'',value=>flowPatch({deviceAuthorizationUrl:value}))}
            {field('OAuth refresh URL — optional',flow.refreshUrl||'',value=>flowPatch({refreshUrl:value||undefined}))}
            {field('OAuth scopes — name = description per line',Object.entries(flow.scopes||{}).map(([name,description])=>`${name} = ${description}`).join('\n'),value=>flowPatch({scopes:Object.fromEntries(splitLines(value).map(line=>{const split=line.indexOf('=');return split<0?[line.trim(),'']:[line.slice(0,split).trim(),line.slice(split+1).trim()];}))}),true)}
            {flowKind==='authorizationCode'&&checkbox('PKCE required',flow.pkceRequired===true,checked=>flowPatch({pkceRequired:checked}))}
            {field('OAuth metadata URL — optional',schemeBody.oauth2MetadataUrl||'',value=>schemePatch({oauth2MetadataUrl:value||undefined}))}
          </>;})()}
          <button type="button" onClick={()=>{const next={...schemes};delete next[schemeName];optional('securitySchemes',Object.keys(next).length?next:undefined);setSchemeIndex(0);}}>Remove security scheme</button><small>References are retained for review; unresolved references block export.</small>
        </>}
        <button type="button" disabled={schemeNames.length>=16} onClick={()=>{let n=schemeNames.length+1;while(Object.hasOwn(schemes,`auth${n}`))n++;patch({securitySchemes:{...schemes,[`auth${n}`]:newSecurityScheme('httpAuthSecurityScheme')}});setSchemeIndex(schemeNames.length);}}>Add security scheme</button>
        <Requirements label="Card security requirements" value={card.securityRequirements} schemes={schemes} onChange={value=>optional('securityRequirements',value)}/>
      </details>
      <details><summary>Public exposure review and signing plan</summary>
        {checkbox('Agent performs sensitive or write actions',sensitiveWork,setSensitiveWork)}<small>Review-only context; never added to agent-card.json.</small>
        <p>Public metadata should contain only intentional public names, URLs, skills and scopes. Tenant values and extended cards must not contain secrets. A declaration cannot enforce access.</p>
        {field('Signing algorithm plan',plan.algorithm,value=>setPlan({...plan,algorithm:value}),false,'Choose with your deployed verifier; no algorithm or signature is fabricated.')}
        {field('Key ID strategy',plan.keyId,value=>setPlan({...plan,keyId:value}))}
        {field('Public key / JWKS strategy',plan.publicKeys,value=>setPlan({...plan,publicKeys:value}),true,'Public-key publication and trust strategy only. Never paste a private key.')}
        {checkbox('Key rotation planned',plan.rotation,value=>setPlan({...plan,rotation:value}))}
        <p>A real signer must apply A2A ProtoJSON default-value handling, exclude signatures, canonicalize with RFC 8785 and produce RFC 7515 JWS. Existing signatures can be analyzed but are never verified here. Unsigned cards are allowed.</p>
        <button type="button" disabled={Object.values(plan).some(v=>typeof v==='string'&&sensitiveText(v))} onClick={()=>downloadText(signingPlanText(plan),'agent-card-signing-plan.txt')}>Download separate signing plan</button>
      </details>
    </section>}
    <section className="tool-box agent-card-output" aria-labelledby={`${id}-review`}>
      <h2 id={`${id}-review`}>Review the public card</h2>
      <Insight what={review.readiness} why={review.blocked?'Fix the blocking metadata or privacy findings before exporting.':'This is a structural and editorial review, not runtime compliance, security certification or verified identity.'} tip={review.next}/>
      <dl className="agent-card-summary"><div><dt>Agent</dt><dd>{object(review.safe)&&typeof review.safe.name==='string'?review.safe.name:'Name missing'}</dd></div><div><dt>Preferred interface</dt><dd>{review.preferred}</dd></div><div><dt>Skills</dt><dd>{review.skillCount} declared · clarity findings below</dd></div><div><dt>Authentication</dt><dd>{review.requiredSecurity}</dd></div><div><dt>Signing</dt><dd>{review.signing}</dd></div></dl>
      <p><strong>Fix first:</strong> {review.next}</p>
      <div className="tool-actions"><button type="button" className="k-button k-button--primary" disabled={review.blocked} onClick={()=>copy(review.json,'Agent Card')}>Copy agent-card.json</button><button type="button" disabled={review.blocked} onClick={()=>downloadJSONText(review.json,'agent-card.json')}>Download agent-card.json</button></div>
      <small>{review.blocked?'Export is blocked. Any detected credentials are redacted from the preview.':'Exports are the exact displayed JSON, formatted with two spaces. The unsigned default contains no signatures.'}</small>
      <pre tabIndex={0} aria-label="Agent Card JSON preview"><code>{review.json}</code></pre>
      <details open={review.blocked}><summary>Findings — {review.findings.filter(f=>f.severity==='FAIL').length} blocking · {review.findings.filter(f=>f.severity==='WARN').length} warnings</summary>
        <ol className="agent-card-findings">{review.findings.map((finding,index)=><li key={index} data-severity={finding.severity}><strong>{finding.severity}: {finding.issue}</strong><code>{finding.path}</code><p>{finding.why}</p><p><strong>Action:</strong> {finding.action}</p></li>)}</ol>
      </details>
      <details><summary>Discovery URL — no network check</summary>
        {field('Public HTTPS origin',domain,setDomain,false,'For example https://agent.example.com. No path, query or private state.')}
        {discovery.error?<p role="alert">{discovery.error}</p>:discovery.url?<><code className="agent-card-discovery">{discovery.url}</code><button type="button" disabled={review.blocked} onClick={()=>copy(discovery.url,'Discovery URL')}>Copy discovery URL</button></>:<p>Serve the reviewed card at <code>{metadata.discoveryPath}</code>. The older <code>/.well-known/agent.json</code> path is a migration warning.</p>}
        <p>Discovery URL → public Agent Card → supported interface → authenticated skill request → server result. This builder checks none of those endpoints and runs no agent.</p>
      </details>
      <details><summary>Current protocol, migration and limits</summary>
        <p>Checked {metadata.checked} against A2A release v{metadata.release}. Per-interface protocol negotiation uses {metadata.protocolVersion}. Cards use <code>supportedInterfaces</code>, modern wrapped security schemes and <code>securityRequirements[].schemes[name].list</code>.</p>
        <p>Legacy top-level url/protocolVersion, preferredTransport, additionalInterfaces, security and supportsAuthenticatedExtendedCard are reported for explicit migration. No destructive upgrade is offered.</p>
        <p>Local limits: 120,000 JSON characters, 16 levels, 6,000 nodes, 32 array entries, 12 interfaces. Unknown metadata is preserved, not certified. HTTPS checks are production policy; runtime reachability, certificates, authorization, signatures and trust require separate verification. Skill clarity checks are heuristics.</p>
        <ul>{metadata.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.label}</a></li>)}</ul>
      </details>
    </section></div>
    <p role="status" className="agent-card-message">{message}</p>
    <p><small>No card data, URLs, tenant values, scopes or pasted JSON enter storage, analytics or share links. Copy and download deliberately export your reviewed public metadata. The shared page Share action shares only this tool’s canonical URL.</small></p>
  </div>;
}
