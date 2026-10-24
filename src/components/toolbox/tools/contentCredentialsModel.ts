// Dated standards snapshot. This module reviews declared plans, never media or signatures.
export const c2pa = {
  version:'2.4', checked:'2026-10-24',
  sources:[
    {label:'C2PA current specifications',url:'https://spec.c2pa.org/specifications/specifications/2.4/index.html'},
    {label:'Technical specification',url:'https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html'},
    {label:'July 2026 synthetic/non-synthetic guidance',url:'https://c2pa.org/wp-content/uploads/sites/33/2026/07/Use-of-Content-Credentials-to-Identify-Synthetic-and-Non-Synthetic-Content.pdf'},
    {label:'Implementation guidance',url:'https://spec.c2pa.org/specifications/specifications/2.2/guidance/Guidance.html'},
    {label:'User experience guidance',url:'https://spec.c2pa.org/specifications/specifications/2.2/ux/UX_Recommendations.html'},
    {label:'IPTC digital source types',url:'https://cv.iptc.org/newscodes/digitalsourcetype/'},
  ],
  truth:'Content Credentials help people understand where content came from and how it changed. They do not prove that the content itself is true.',
  assertions:{actions:'c2pa.actions.v2',ingredient:'c2pa.ingredient.v3',ai:'c2pa.ai-disclosure',cloud:'c2pa.cloud-data',external:'c2pa.external-reference',soft:'c2pa.soft-binding'},
  sourceBase:'http://cv.iptc.org/newscodes/digitalsourcetype/',
  sourceTypes:['digitalCapture','digitalCreation','trainedAlgorithmicMedia','compositeWithTrainedAlgorithmicMedia','algorithmicallyEnhanced','humanEdits','composite','compositeCapture','screenCapture'],
  actions:['c2pa.created','c2pa.opened','c2pa.edited','c2pa.converted','c2pa.resized','c2pa.cropped','c2pa.redacted','c2pa.transcoded','c2pa.placed','c2pa.published','c2pa.watermarked.bound','c2pa.watermarked.unbound'],
  oversight:['fully_autonomous','prompt_guided','human_validated'],
  validation:['assertions','ingredients','timestamp','revocation','signature','binding'] as const,
  algorithms:['ES256','ES384','ES512','PS256','PS384','PS512','EdDSA (Ed25519 only)'],
  notes:[
    'A claim references assertions; its signed manifest records provenance. The claim generator creates claims; the signer supplies the signing credential. Created and gathered assertions have different origins.',
    'Well-Formed, Valid and Trusted are different manifest states. A trusted manifest is valid; validity alone does not establish a relying party’s trust or factual truth.',
    'Signing uses X.509 credentials and an appropriate ecosystem trust policy. Web browser certificate roots are not a substitute for a C2PA trust decision.',
    'Hard binding ties provenance to specific content. Soft binding can help rediscover provenance; it does not replace cryptographic content binding or guarantee recovery.',
    'External manifests differ from remotely stored assertion data. Cloud Data references static JUMBF assertions; External Reference can describe other external data. Optional remote data is not a prerequisite for standard validation; fetch only under an appropriate privacy policy.',
    'Specification capabilities include live BMFF/CMAF video (not MPEG Transport Streams), unstructured text and supported document/media embeddings. Actual generators, viewers, renditions and platforms must be tested individually.',
    'Current specVersion belongs in claim_generator_info; the older claim-level field is deprecated. Ingredient validation can declare specification and trust-list version used.',
    'Actions should declare allActionsIncluded honestly. False or omitted permits unrecorded actions; true is a completeness claim, not evidence of truth.',
    'AI Disclosure complements digitalSourceType and per-action AI signals. modelType is required within an AI model disclosure entry; optional model provenance, scientificDomain and humanOversightLevel must follow the schema. Not every workflow must publish every field.',
    'Regions of Interest can localize spatial, temporal or textual changes. inputTo ingredients can describe generation inputs; a prompt without its own manifest has unknown provenance, not automatic validation failure.',
    'Use a presence indicator, concise summary and detailed history (L1–L3); specialized L4 forensic detail can live in a dedicated tool.',
    'Watermarks are media signals that may complement Content Credentials. Neither provenance nor watermarking is a deepfake detector.',
  ],
  limits:{stages:12,ingredients:12,actions:12,text:160,findings:128},
};
export type Answer='yes'|'no'|'unknown';
export type Status='PASS'|'WARN'|'FAIL'|'UNKNOWN';
export const origins={capture:'Camera / device capture',human:'Human-created digital content',generated:'Generative AI',assisted:'AI-assisted creation / editing',imported:'Imported existing media',composed:'Composed from multiple sources',unknown:'Unknown / external source'};
export const transformations={store:'Store original unchanged',edit:'Human edit',ai:'AI-assisted edit',crop:'Crop',resize:'Resize / thumbnail',transcode:'Transcode / recompress',convert:'Format conversion',screenshot:'Screenshot / print and re-capture',strip:'Strip credential data',unknown:'Unknown processing'};
export interface CredentialStage {name:string;kind:'edit'|'export'|'publish'|'retrieve';transform:keyof typeof transformations;preserves:Answer;reads:Answer;newManifest:Answer;actions:Answer;signs:Answer;validate:Answer}
export interface CredentialIngredient {name:string;relationship:'parentOf'|'componentOf'|'inputTo';provenance:Answer;preserved:Answer}
export interface CredentialPlan {
  media:'Image'|'Video'|'Audio'|'Document'|'Live video / stream'|'Text'|'Mixed/composed media';origin:keyof typeof origins;sourceType:string;initial:Answer;
  aiUse:'none'|'generated'|'modified'|'unknown';disclosure:Answer;model:Answer;oversight:string;domain:Answer;roi:'whole'|'region'|'time'|'text';localized:Answer;
  prompt:'omit'|'summary'|'full';promptSensitive:Answer;inputs:string[];
  ingredients:CredentialIngredient[];stages:CredentialStage[];actions:string[];allActions:'full'|'partial'|'unknown';
  signer:string;generator:Answer;certificate:Answer;trust:'c2pa'|'ecosystem'|'private'|'unknown';identity:'organization'|'creator'|'pseudonym'|'anonymous'|'platform'|'unknown';audience:string;rotation:Answer;timestamp:Answer;revocation:Answer;highAssurance:boolean;
  location:'embedded'|'remote'|'external'|'mixed';availability:Answer;softBinding:boolean;incoming:Answer;validation:Record<typeof c2pa.validation[number],boolean>;observed:'untested'|'valid'|'untrusted'|'missing'|'failed';
  indicator:Answer;summary:Answer;history:Answer;explainsStates:Answer;privacy:string[];
}
export const privacyOptions=['Legal name','Exact location','Device identifier','Internal account / employee ID','Source files / model inputs','Customer content','Private project / internal URL','Precise timestamp','Secret / API key'];
export const inputOptions=['Reference image','Source document','Seed / parameters','Model identifier','External ingredient','User-provided input'];
export const signerOptions=['Capture device','Editing application','Publisher','Organization','Creator','Platform','Multiple stages','Unknown'];
export const audienceOptions=['Internal organization','Social media users','News audience','Customers','Regulators','Public web','Partner ecosystem'];
export const credentialPresets=['Camera → Newsroom → Publisher','AI Image → Human Edit → Social','Photographer → Edit → Website','AI Video Pipeline','Document Workflow','Composed Marketing Asset','Social Platform Resize Risk','High-Privacy Creator','Bad Workflow'];
export function credentialStage(name='New stage',kind:CredentialStage['kind']='edit'):CredentialStage{return {name,kind,transform:'store',preserves:'unknown',reads:'unknown',newManifest:'unknown',actions:'unknown',signs:'unknown',validate:'unknown'};}
export function credentialPreset(name=credentialPresets[0]):CredentialPlan{
  const good=(label:string,kind:CredentialStage['kind'],transform:CredentialStage['transform']='store'):CredentialStage=>({...credentialStage(label,kind),transform,preserves:'yes',reads:'yes',newManifest:transform==='store'?'no':'yes',actions:'yes',signs:'yes',validate:'yes'});
  const p:CredentialPlan={media:'Image',origin:'capture',sourceType:'digitalCapture',initial:'yes',aiUse:'none',disclosure:'yes',model:'unknown',oversight:'human_validated',domain:'unknown',roi:'whole',localized:'unknown',prompt:'omit',promptSensitive:'unknown',inputs:[],ingredients:[],stages:[good('Newsroom editor','edit','crop'),good('Editorial export','export','convert'),good('Publisher original','publish'),good('Consumer download','retrieve')],actions:['c2pa.created','c2pa.opened','c2pa.cropped','c2pa.converted','c2pa.published'],allActions:'full',signer:'Multiple stages',generator:'yes',certificate:'yes',trust:'ecosystem',identity:'organization',audience:'News audience',rotation:'yes',timestamp:'yes',revocation:'yes',highAssurance:false,location:'embedded',availability:'unknown',softBinding:false,incoming:'yes',validation:{assertions:true,ingredients:true,timestamp:true,revocation:true,signature:true,binding:true},observed:'untested',indicator:'yes',summary:'yes',history:'yes',explainsStates:'yes',privacy:[]};
  if(name.includes('AI')||name==='Composed Marketing Asset'){p.origin='generated';p.aiUse='generated';p.sourceType='trainedAlgorithmicMedia';p.model='yes';p.oversight='prompt_guided';p.inputs=['Model identifier'];p.stages=[good('Human editor','edit','edit'),good('Final export','export','convert'),good('Publishing rendition','publish','resize'),good('Consumer retrieval','retrieve')];p.actions=['c2pa.created','c2pa.opened','c2pa.edited','c2pa.converted','c2pa.resized'];}
  if(name==='AI Image → Human Edit → Social'||name==='Social Platform Resize Risk'){p.stages[p.stages.length-2]={...good('Social thumbnail','publish','resize'),preserves:'no',newManifest:'no',signs:'no',actions:'no'};}
  if(name==='Photographer → Edit → Website')p.stages=[good('Photo editor','edit','crop'),good('Web export','export','resize'),good('Own website','publish'),good('Served image','retrieve')];
  if(name==='AI Video Pipeline'){p.media='Video';p.stages[1].transform='transcode';p.actions.push('c2pa.transcoded');p.ingredients=[{name:'Audio track',relationship:'componentOf',provenance:'unknown',preserved:'unknown'}];}
  if(name==='Document Workflow'){p.media='Document';p.origin='human';p.sourceType='digitalCreation';p.stages[0].transform='edit';p.actions=['c2pa.created','c2pa.opened','c2pa.edited','c2pa.converted'];}
  if(name==='Composed Marketing Asset'){p.media='Mixed/composed media';p.origin='composed';p.sourceType='composite';p.ingredients=[{name:'Source photograph',relationship:'componentOf',provenance:'yes',preserved:'yes'},{name:'Reference image',relationship:'inputTo',provenance:'unknown',preserved:'unknown'},{name:'Logo',relationship:'componentOf',provenance:'unknown',preserved:'unknown'}];p.actions.push('c2pa.placed');}
  if(name==='High-Privacy Creator'){p.identity='pseudonym';p.signer='Creator';p.trust='private';p.audience='Partner ecosystem';}
  if(name==='Bad Workflow'){p.stages[1]={...good('Export strips provenance','export','strip'),preserves:'no',newManifest:'no',actions:'no',signs:'no'};p.stages[2].transform='unknown';p.stages[2].preserves='unknown';p.incoming='no';p.trust='unknown';p.indicator='no';}
  return p;
}
export function moveCredentialStage<T>(rows:T[],i:number,d:number){const next=[...rows],j=i+d;if(j>=0&&j<rows.length)[next[i],next[j]]=[next[j],next[i]];return next;}
// Bounded obvious-pattern defense; not a comprehensive credential scanner. Free text is only stage/ingredient labels.
const secretPattern=/(?:-----BEGIN [\w ]*PRIVATE KEY-----|\b(?:sk[-_](?:live[-_]|test[-_])?[\w-]{12,}|gh[pousr]_[\w]{12,}|github_pat_[\w]{12,}|AKIA[A-Z0-9]{16})\b|\bBearer\s+[\w.\/-]{12,}|\beyJ[\w-]{8,}\.[\w-]+\.[\w-]+|\b(?:api[-_ ]?key|password|secret|token)\s*[:=]\s*\S+)/i;
export function hasCredentialSecret(text:string){return text.includes('[Sensitive label removed]')||secretPattern.test(text);}
export function safeCredentialLabel(text:string){return hasCredentialSecret(text)?'[Sensitive label removed]':text.replace(/[\r\n\t\x00-\x1f|]/g,' ').trim()||'Unnamed stage';}
export function normalizeCredentialPlan(input:CredentialPlan):CredentialPlan{
  if(input.stages.length>c2pa.limits.stages||input.ingredients.length>c2pa.limits.ingredients||input.actions.length>c2pa.limits.actions||input.privacy.length>privacyOptions.length||input.inputs.length>inputOptions.length)throw new Error('Workflow exceeds the displayed planning limits.');
  const p:CredentialPlan=JSON.parse(JSON.stringify(input));
  for(const row of [...p.stages,...p.ingredients]){if(row.name.length>c2pa.limits.text)throw new Error('Keep stage and ingredient names within 160 characters.');row.name=safeCredentialLabel(row.name);}
  p.actions=[...new Set(p.actions)];p.privacy=[...new Set(p.privacy)];p.inputs=[...new Set(p.inputs)];return p;
}
export interface CredentialFinding {status:Status;dimension:string;stage:string;why:string;action:string}
export function diagnoseCredentials(input:CredentialPlan){
  const secret=[...input.stages,...input.ingredients].some(s=>hasCredentialSecret(s.name)),p=normalizeCredentialPlan(input),findings:CredentialFinding[]=[],pipeline:{name:string;status:Status;why:string;action:string}[]=[];
  const add=(status:Status,dimension:string,stage:string,why:string,action:string)=>findings.push({status,dimension,stage,why,action});
  const plan=(answer:Answer,dimension:string,stage:string,why:string,action:string)=>{if(answer!=='yes')add(answer==='unknown'?'UNKNOWN':'WARN',dimension,stage,why,action);};
  if(secret||p.privacy.includes('Secret / API key'))add('FAIL','Privacy','Metadata','Potential secret exposure in the plan. Sensitive labels are masked in all output.','Remove credentials from provenance; revoke any exposed secret. Export contains no secret values.');
  if(p.origin==='unknown'||p.origin==='imported')add('UNKNOWN','Origin disclosure','Source','The source history needs independent review.','Identify the available origin evidence; do not invent missing history.');
  if(!p.sourceType)add('WARN','Origin disclosure','Source','No digital source type strategy.','Choose an accurate IPTC digitalSourceType; implementation support varies by media.');
  if(p.sourceType&&!c2pa.sourceTypes.includes(p.sourceType))add('WARN','Origin disclosure','Source','Source type is outside this supported planning vocabulary.','Review the current IPTC vocabulary.');
  if(p.origin==='capture'&&p.sourceType&&p.sourceType!=='digitalCapture')add('WARN','Origin disclosure','Source','The declared source type differs from straightforward device capture.','Confirm computational, composited or modified capture semantics against IPTC.');
  if(p.origin==='generated'&&p.aiUse!=='generated')add('WARN','AI disclosure','Source','Origin says fully AI-generated, but the AI plan says otherwise.','Represent whole-asset generation explicitly.');
  const ai=p.aiUse==='generated'||p.aiUse==='modified'||p.origin==='generated'||p.origin==='assisted'||p.stages.some(s=>s.transform==='ai');
  if(ai){
    plan(p.disclosure,'AI disclosure','Source','AI involvement lacks a clear disclosure strategy.','Plan accurate source type, per-action AI signals and appropriate AI Disclosure metadata.');
    const expected=p.aiUse==='generated'&&p.origin!=='composed'?'trainedAlgorithmicMedia':'compositeWithTrainedAlgorithmicMedia';
    if(p.origin!=='composed'&&p.sourceType!==expected&&!(p.sourceType==='algorithmicallyEnhanced'&&p.aiUse==='modified'))add('WARN','AI disclosure','Source','AI involvement and digital source type do not align.','Distinguish full generation, generative modification and non-generative enhancement.');
    plan(p.model,'AI disclosure','Source','Model provenance is not planned or known.','Identify model/system where appropriate without exposing private inputs; this is guidance, not a universal mandatory field.');
    if(p.oversight==='unknown')add('WARN','AI disclosure','Source','Human oversight is unspecified.','Record the actual degree of human involvement where supported.');
    if(p.roi!=='whole'&&p.localized!=='yes')add('WARN','AI disclosure','Source','Only part of the asset is modified, but localized disclosure is not planned.','Use spatial, temporal or textual Regions of Interest where supported; do not label all regions equally modified.');
    if((p.roi==='region'&&['Audio','Text','Live video / stream'].includes(p.media))||(p.roi==='time'&&['Image','Text','Document'].includes(p.media))||(p.roi==='text'&&['Image','Audio'].includes(p.media)))add('WARN','AI disclosure','Source','Modification scope needs review for this media type.','Use a supported spatial, temporal or textual range that describes the actual changed content.');
    if(!p.actions.includes('c2pa.created')&&p.aiUse==='generated')add('WARN','Action history','Source','Whole-asset generation has no creation action.','Plan the standard creation action with accurate digital source type.');
  }
  if(p.aiUse==='unknown')add('UNKNOWN','AI disclosure','Source','AI involvement is unknown.','Review upstream provenance; absence of AI metadata does not prove no AI use.');
  if(p.prompt==='full'&&p.promptSensitive!=='no')add('WARN','Privacy','Generation inputs','A full prompt may expose confidential input data.','Minimize, summarize or omit sensitive prompts; obtain appropriate consent before disclosure.');
  for(const field of p.privacy.filter(x=>x!=='Secret / API key'))add('WARN','Privacy','Metadata',`${field} is planned for public provenance.`,'Disclose only what the trust purpose requires; consider pseudonymity, minimization and consent.');
  if(p.inputs.length&&!p.ingredients.some(i=>i.relationship==='inputTo'))add('WARN','Ingredient preservation','Generation inputs','Generation inputs are declared without inputTo relationships.','Plan appropriate input ingredients; recording a recipe does not require exposing confidential values.');
  if(p.origin==='composed'&&!p.ingredients.length)add('WARN','Ingredient preservation','Composition','A composition has no ingredient plan.','Identify source assets and represent appropriate componentOf/inputTo relationships.');
  for(const i of p.ingredients){if(i.provenance!=='yes')add(i.provenance==='unknown'?'UNKNOWN':'WARN','Ingredient preservation',i.name,'Ingredient provenance is missing or unknown; this is not proof of deception.','Inspect available manifests. Inputs such as prompts may legitimately have no manifest.');if(i.provenance==='yes'&&i.preserved!=='yes')add('WARN','Ingredient preservation',i.name,'Known ingredient provenance is not preserved in the plan.','Preserve the ingredient manifest/reference and validate it.');}
  if(p.ingredients.some(i=>i.relationship==='componentOf')&&!p.actions.includes('c2pa.placed'))add('WARN','Action history','Ingredients','Compositional ingredients lack a placement action plan.','Use the appropriate standardized placement action.');
  if(p.ingredients.some(i=>i.relationship==='parentOf')&&!p.actions.includes('c2pa.opened'))add('WARN','Action history','Ingredients','A parent relationship lacks an opening action plan.','Record the source opened for editing and retain its provenance.');
  let continuity=p.initial==='yes',firstBreak:string|undefined;
  pipeline.push({name:'Source / initial credential',status:p.initial==='yes'?'PASS':p.initial==='no'?'WARN':'UNKNOWN',why:p.initial==='yes'?'Initial signed provenance planned, not verified.':'No confirmed initial credential strategy.',action:'Create or document initial provenance and test it.'});
  if(p.initial!=='yes')add(p.initial==='no'?'WARN':'UNKNOWN','Credential preservation','Initial credential','Initial signed provenance is missing or unknown.','Configure initial credential creation; missing credentials do not imply fake content.');
  for(const s of p.stages){
    const changed=s.transform!=='store'&&s.transform!=='unknown',fresh=s.newManifest==='yes'&&s.signs==='yes'&&s.actions==='yes'&&s.reads==='yes'&&s.preserves==='yes';
    let status:Status='PASS',why='Declared original preservation; verify actual served bytes.',action='Validate this stage’s output, including any separately served renditions.';
    if(changed&&fresh)why='Updated signed derivative provenance and retained source history are planned, not verified.';
    if(s.transform==='strip'||s.transform==='screenshot'){status='FAIL';why=s.transform==='strip'?'This stage removes credential data.':'A screenshot or re-capture does not automatically retain original embedded provenance.';action='Avoid this handoff or create new provenance linked to recoverable source evidence. Recovery is not guaranteed.';}
    else if(changed&&!fresh){status=s.newManifest==='no'||s.signs==='no'||s.preserves==='no'?'FAIL':'WARN';why='Changed content needs appropriately updated, signed provenance and retained source history.';action='Preserve prior provenance as an ingredient and create/sign appropriate provenance for the derivative; the old signature does not describe new bits unchanged.';}
    else if(s.preserves==='no'){status='FAIL';why='Credential continuity is explicitly lost at this stage.';action='Preserve provenance in the output or plan appropriate regenerated derivative provenance.';}
    else if(s.transform==='unknown'||s.preserves==='unknown'){status='UNKNOWN';why='Processing or preservation is unknown.';action='Test the exact tool/platform and served rendition; do not assume compatibility.';}
    if(status==='FAIL'&&!firstBreak)firstBreak=s.name;
    if(status!=='PASS')add(status,'Credential preservation',s.name,why,action);
    if(!continuity&&status==='PASS'){status='WARN';why='This stage is configured, but upstream provenance is unresolved. Re-signing cannot recreate missing history.';}
    if(status!=='PASS')continuity=false;
    pipeline.push({name:s.name,status,why,action});
    if(changed&&s.actions!=='yes')add('WARN','Action history',s.name,'State-changing work has no confirmed action history.','Record standardized actions for actual changes and AI use.');
    if(changed&&s.reads!=='yes')add('WARN','Ingredient preservation',s.name,'The editor does not confirm reading prior provenance.','Preserve upstream manifests and their appropriate ingredient relationships.');
    if(s.validate!=='yes')add(s.validate==='unknown'?'UNKNOWN':'WARN','Verification',s.name,'Output validation at this handoff is unconfirmed.','Run the selected validator on the stage output and record evidence.');
  }
  if(!p.stages.some(s=>s.kind==='publish'))add('WARN','Credential preservation','Publishing','No publishing stage has been modeled.','Add the publishing destination and its actual transformations.');
  if(!p.stages.some(s=>s.kind==='retrieve'))add('WARN','Verification','Consumer retrieval','No consumer retrieval stage is modeled.','Test the downloaded/served original and every rendition consumers receive.');
  if(p.stages.some(s=>s.transform!=='store')&&!p.actions.length)add('WARN','Action history','History','Edits have no overall action plan.','Record creation and editing actions accurately.');
  if(p.allActions==='full'&&(p.stages.some(s=>s.transform==='unknown'||s.actions!=='yes')||p.origin==='unknown'||p.origin==='imported'))add('WARN','Action history','History','Full action history is claimed despite unknown or unrecorded work.','Do not assert allActionsIncluded=true without evidence for completeness in its scope.');
  if(p.allActions!=='full')add('WARN','Action history','History','History is partial or unspecified.','Use allActionsIncluded=false or omit it when actions may be unrecorded; do not present this as a full history.');
  if(p.actions.some(a=>!c2pa.actions.includes(a)))add('WARN','Action history','History','An action is outside this supported standard subset.','Review the official vocabulary or an appropriate namespaced extension.');
  plan(p.generator,'Signer/trust plan','Claim generation','Claim generator is unspecified.','Identify the system creating claims separately from its signing credential.');
  if(p.signer==='Unknown')add('WARN','Signer/trust plan','Signer','Signer responsibility is unassigned.','Assign capture, editor or publisher signing boundaries; never put keys into this tool.');
  plan(p.certificate,'Signer/trust plan','Signer','X.509 signing-credential availability is unconfirmed.','Use an appropriate external signing service/credential; no certificate or key is requested here.');
  if(p.trust==='unknown')add('WARN','Signer/trust plan','Relying party','No trust ecosystem is selected.','Choose the audience’s C2PA, ecosystem-specific or private trust policy; validity is not universal trust.');
  if(p.identity==='unknown')add('WARN','Signer/trust plan','Identity','Signer identity presentation is unclear.','Choose a meaningful organization, creator or privacy-preserving identity; a legal name is not required.');
  if(p.highAssurance)for(const k of ['timestamp','revocation','rotation'] as const)plan(p[k],'Signer/trust plan','Assurance',`${k} strategy is unconfirmed.`,'Review time-stamping, credential status, rotation and signing service boundaries with your implementer.');
  if(p.location!=='embedded'&&p.availability!=='yes')add('WARN','Credential preservation','Remote references','Remote/external availability and retrieval policy are unconfirmed.','Plan durable references and privacy-safe retrieval; external manifests and optional external assertions are different. No remote data is fetched here.');
  if(p.softBinding)add('WARN','Credential preservation','Recovery','Soft binding is a discovery/recovery aid, not hard-binding validation.','Test recovery separately; do not promise successful or cryptographically equivalent recovery.');
  plan(p.incoming,'Verification','Publisher intake','Incoming provenance is not confirmed as validated.','Validate incoming claims before relying on them.');
  for(const k of c2pa.validation)if(!p.validation[k])add(k==='signature'||k==='binding'?'FAIL':'WARN','Verification','Consumer validation',`${k} validation is not planned.`,k==='ingredients'?'Inspect ingredient provenance recursively with a suitable validator; do not blindly trust nested claims.':`Include appropriate ${k} checks in your external validator plan.`);
  const observed={untested:'Not tested — all findings describe declared plans, not observed media.',valid:'A reported valid credential still needs the relying party’s trust decision; it does not prove factual truth.',untrusted:'Reported valid but untrusted — check the intended trust policy, not the truth of the content.',missing:'No verifiable Content Credentials were found. Absence is not proof of deception.',failed:'Credential could not be validated / provenance integrity check failed. This does not automatically make content false.'};
  if(p.observed!=='untested'&&p.observed!=='valid')add(p.observed==='failed'?'FAIL':'WARN','Verification','Reported observation',observed[p.observed],'Investigate the actual validator’s evidence and reason; this tool has not inspected the asset.');
  plan(p.indicator,'User display','Consumer','No clear provenance indicator is planned.','Show a simple presence/status indicator without a truth badge.');
  plan(p.summary,'User display','Consumer','No concise provenance summary is planned.','Offer L2 summary before detailed history; avoid manifest-only UX.');
  plan(p.history,'User display','Consumer','Detailed history is not planned.','Make L3 provenance history accessible; reserve L4 forensic detail for specialized tools.');
  plan(p.explainsStates,'User display','Consumer','Missing/failed credential explanations are unconfirmed.','Distinguish generated/modified/captured/mixed/unknown and explain missing or invalid credentials without labeling media fake.');
  const dimensions=['Origin disclosure','AI disclosure','Ingredient preservation','Action history','Credential preservation','Signer/trust plan','Verification','User display','Privacy'];
  const rank:Record<Status,number>={FAIL:3,WARN:2,UNKNOWN:1,PASS:0};
  const scorecard=dimensions.map(d=>({dimension:d,status:findings.filter(f=>f.dimension===d).reduce<Status>((s,f)=>rank[f.status]>rank[s]?f.status:s,'PASS')}));
  for(const [name,dimension] of [['Consumer validation','Verification'],['Provenance display','User display']])pipeline.push({name,status:scorecard.find(s=>s.dimension===dimension)!.status,why:'Planning status only; verify the actual consumer experience.',action:'Test the selected external validator and audience-facing display with real outputs.'});
  const ordered=[...findings].sort((a,b)=>rank[b.status]-rank[a.status]);
  const fix=ordered[0],status=fix?.status==='FAIL'?'NOT READY':findings.length?'NEEDS REVIEW':'PLAN COMPLETE — TEST NEXT';
  const nextTest='Run one credentialed sample through the actual pipeline. Download and validate the served original and each thumbnail/rendition, then record the first continuity break.';
  const matrix=p.stages.map(s=>({stage:s.name,input:'Check actual incoming credential',transformation:transformations[s.transform],expected:s.transform==='store'?'Original provenance preserved':s.transform==='strip'||s.transform==='screenshot'?'Continuity break; recovery/new provenance requires testing':'Appropriate derivative provenance + retained source history',validate:s.validate==='yes'?'Planned — evidence still required':'Add validation'}));
  const checklist=['Create one credentialed sample with minimized public metadata.',...p.stages.map(s=>`Pass the sample through ${s.name}; ${transformations[s.transform].toLowerCase()}. Download its output and validate signature, content binding, assertions and relevant ingredients.`),'Retrieve the consumer-served original AND each thumbnail/rendition; validate independently.','Review signer trust, timestamp/revocation evidence and user-facing missing/failed states.','Record the first failed/unknown handoff; fix and repeat.'];
  const aiLabel=p.origin==='composed'?'Mixed/composed':p.aiUse==='generated'||p.origin==='generated'?'AI-generated':ai?'Modified using AI':p.aiUse==='unknown'?'AI involvement unknown':'No AI declared — not independently verified';
  const report=[`# Content Credentials Workflow Review`,`C2PA ${c2pa.version}; guidance checked ${c2pa.checked}. Declared planning only.`,c2pa.truth,`## ${status}`,`Fix first: ${fix?`${fix.stage}: ${fix.action}`:nextTest}`,`First known provenance break: ${firstBreak||'None declared — unknown stages still need testing.'}`,`Origin: ${origins[p.origin]} · ${p.media}`,`AI: ${aiLabel}`,`Source type: ${p.sourceType?c2pa.sourceBase+p.sourceType:'Unspecified'}`,observed[p.observed],'## Workflow dimensions',...scorecard.map(s=>`${s.dimension}: ${s.status}`),'## Pipeline',...pipeline.map(s=>`${s.status} — ${s.name}: ${s.why} ${s.action}`),'## Ingredients',...p.ingredients.map(i=>`${i.name} → ${i.relationship} → final asset; provenance ${i.provenance}, preserved ${i.preserved}`),'## Findings',...ordered.map(f=>`${f.status} — ${f.dimension} / ${f.stage}: ${f.why} Action: ${f.action}`),'## Platform test matrix','| Stage | Incoming | Transformation | Expected output | Validation |','|---|---|---|---|---|',...matrix.map(m=>`| ${m.stage} | ${m.input} | ${m.transformation} | ${m.expected} | ${m.validate} |`),'## Test plan',...checklist.map((s,i)=>`${i+1}. ${s}`),'## Next test',nextTest,'No media uploaded, signing performed or cryptographic validation executed. No truth/deepfake determination.'].join('\n\n');
  return {plan:p,findings:ordered.slice(0,c2pa.limits.findings),scorecard,pipeline,firstBreak,status,fix,nextTest,matrix,checklist,aiLabel,observation:observed[p.observed],report,secret};
}
