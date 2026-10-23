export const ragStrategies = { fixed:'Fixed size',sentence:'Sentence-aware',paragraph:'Paragraph-aware',heading:'Heading / section-aware',recursive:'Recursive structure preference' } as const;
export type RagStrategy = keyof typeof ragStrategies;
export const ragKinds=['Independent answers','Prose','Structured documentation','Policy','Source documentation','Research'] as const;
export interface RagConfig { document:number; size:number; overlap:number; topK:number; context:number; reserve:number; metadata:number; sentence:number; paragraph:number; section:number; strategy:RagStrategy; kind:typeof ragKinds[number]; topology:'adjacent'|'unknown' }
export const ragBounds={document:{label:'Document tokens',min:1,max:10_000_000},size:{label:'Chunk target tokens',min:32,max:8192},overlap:{label:'Overlap tokens',min:0,max:8191},topK:{label:'Top-K',min:1,max:20},context:{label:'Context window tokens',min:1024,max:2_000_000},reserve:{label:'Reserved non-RAG + output tokens',min:0,max:1_999_999},metadata:{label:'Metadata tokens per retrieved chunk',min:0,max:1000},sentence:{label:'Assumed sentence tokens',min:1,max:16384},paragraph:{label:'Assumed paragraph tokens',min:1,max:16384},section:{label:'Assumed section tokens',min:1,max:16384}} as const;
export type RagNumber=keyof typeof ragBounds;
export const RAG_LIMITS={text:80_000,chunks:20_000,display:5} as const;
export const ragDefaults:RagConfig={document:12000,size:512,overlap:64,topK:5,context:16384,reserve:2048,metadata:24,sentence:32,paragraph:160,section:768,strategy:'fixed',kind:'Structured documentation',topology:'adjacent'};
export const ragPresets:{name:string;config:RagConfig;sample:string}[]=[
 {name:'FAQ / Short Answers',config:{...ragDefaults,document:4000,size:256,overlap:16,strategy:'heading',kind:'Independent answers',section:96},sample:'# Shipping\nOrders are prepared on weekdays. Delivery timing depends on the destination.\n\n# Returns\nAn unused item can be returned under the published policy. Keep the order reference for support.\n\n# Support\nDescribe the issue and the steps already tried. Never include a password.'},
 {name:'Product Documentation',config:{...ragDefaults,strategy:'recursive'},sample:'# Workspace setup\nCreate a workspace before inviting a teammate. Workspace permissions control which projects are visible.\n\n## Access\nEach member receives an explicit role. Removing access must also invalidate existing sessions.\n\n## Recovery\nAn owner reviews recovery requests. A successful sign-in does not automatically grant project administration.'},
 {name:'Long Technical Guide',config:{...ragDefaults,document:80000,size:1024,overlap:128,strategy:'recursive',kind:'Prose',section:1536},sample:'# Processing pipeline\nA request is validated before it enters the work queue. The queue separates acceptance from execution.\n\n## Failure handling\nA worker records a bounded retry count. Retrying a side effect requires an idempotency key. An expired deadline stops further attempts.\n\n## Verification\nMeasure expected outcomes and test failure paths. A passing example is not proof that all edge cases work.'},
 {name:'Legal / Policy Document',config:{...ragDefaults,document:50000,size:768,overlap:192,strategy:'paragraph',kind:'Policy',paragraph:320},sample:'# Fictional service policy\nThis fictional example illustrates boundaries, not legal advice. Access is permitted only for an approved purpose, subject to the conditions in the next paragraph.\n\nAn exception requires documented approval. Approval for one request does not create general permission for later requests.\n\nRecords are reviewed under the applicable retention policy. Cross-references and exceptions must be evaluated together.'},
 {name:'Support Knowledge Base',config:{...ragDefaults,document:120000,size:384,overlap:32,strategy:'heading',kind:'Independent answers',section:256},sample:'# Reset a display preference\nOpen settings and choose a supported display option. This changes presentation only.\n\n# Recover a draft\nA draft may be unavailable after local data is cleared. Do not promise recovery without evidence.\n\n# Report a problem\nInclude the visible error and reproduction steps. Remove private content from screenshots.'},
 {name:'Source Code Documentation',config:{...ragDefaults,document:32000,size:512,overlap:64,strategy:'recursive',kind:'Source documentation'},sample:'# validateRequest\nChecks the request shape before processing. It does not authenticate the caller.\n\n## authorizeAction\nChecks the authenticated actor and resource scope. Validation success is not authorization.\n\n## commitChange\nWrites a validated and authorized change. Failure recovery must preserve the previous consistent state.'},
 {name:'Large Research Corpus',config:{...ragDefaults,document:1000000,size:1536,overlap:256,topK:12,context:16384,reserve:4096,metadata:48,strategy:'fixed',kind:'Research'},sample:'# Observation\nA reported association does not establish a causal relationship. Record the source and study conditions.\n\n# Methods\nDifferent sampling choices can change the observed population. A comparison needs compatible measurements.\n\n# Limitations\nConflicting evidence should remain attributed. Retrieval proximity is not evidence quality.'},
];
export interface RagRange {start:number;end:number;boundary:string}
function lastBoundary(values:number[],limit:number) {let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>>1;if(values[mid]<=limit)lo=mid+1;else hi=mid;}return lo?values[lo-1]:-1;}
function textBoundaries(text:string){const sentence:number[]=[],paragraph:number[]=[],heading:number[]=[];for(const m of text.matchAll(/[.!?]["'”’)\]]*[ \t\r\n]+/g))sentence.push(m.index!+m[0].length);for(const m of text.matchAll(/\r?\n[ \t]*\r?\n/g))paragraph.push(m.index!+m[0].length);for(const m of text.matchAll(/^ {0,3}#{1,6}[ \t]+/gm))if(m.index)heading.push(m.index);return {sentence,paragraph,heading};}
export function simulateRag(c:RagConfig, mode:'structure'|'text'='structure',text=''){
  if(mode!=='structure'&&mode!=='text')throw new Error('Choose structure simulation or text visualizer.');
  if(typeof text!=='string'||text.length>RAG_LIMITS.text)throw new Error('Text exceeds 80,000 UTF-16 units.');
  if(mode==='text'&&!text.trim())throw new Error('Paste text or load a fictional sample.');
  for(const [key,b] of Object.entries(ragBounds)){if(key==='document'&&mode==='text')continue;const value=c[key as RagNumber];if(!Number.isFinite(value)||!Number.isInteger(value)||value<b.min||value>b.max)throw new Error(`${b.label} must be an integer from ${b.min} to ${b.max}.`);}
  if(!Object.hasOwn(ragStrategies,c.strategy)||!ragKinds.includes(c.kind)||!['adjacent','unknown'].includes(c.topology))throw new Error('Choose supported strategy, document shape and retrieval topology.');
  if(c.overlap>=c.size)throw new Error('Overlap must be smaller than the chunk target.');
  if(c.reserve>=c.context)throw new Error('Reserved non-RAG + output tokens must be smaller than the context window.');
  const scale=mode==='text'?4:1,document=mode==='text'?text.length:c.document,target=c.size*scale,overlap=c.overlap*scale;
  const ranges:RagRange[]=[];let count=0,indexed=0,last=0,forced=0;
  const symbolic=mode==='structure'&&c.strategy==='fixed';
  const boundaryKinds=c.strategy==='recursive'?['heading','paragraph','sentence'] as const:c.strategy==='fixed'?[]:[c.strategy] as ('heading'|'paragraph'|'sentence')[];
  if(symbolic){count=document<=target?1:1+Math.ceil((document-target)/(target-overlap));last=document-(count-1)*(target-overlap);indexed=document+(count-1)*overlap;for(let i=0;i<Math.min(count,20);i++){const start=i*(target-overlap);ranges.push({start,end:Math.min(document,start+target),boundary:i===count-1?'Document end':'Fixed target'});}}
  else{
    const boundaries=mode==='text'?textBoundaries(text):undefined;
    let start=0;
    while(start<document){
      if(ranges.length>=RAG_LIMITS.chunks)throw new Error('Structural/text simulation exceeds 20,000 chunks. Increase the target, reduce overlap or shorten the input.');
      const limit=Math.min(document,start+target);let end=limit,boundary=limit===document?'Document end':'Fixed fallback';
      if(limit<document)for(const kind of boundaryKinds){const point=boundaries?lastBoundary(boundaries[kind],limit):Math.floor(limit/c[kind==='heading'?'section':kind])*c[kind==='heading'?'section':kind];if(point>start+overlap){end=point;boundary=kind==='heading'?'Heading / section':kind;break;}}
      if(mode==='text'&&end<document&&/[\uDC00-\uDFFF]/.test(text[end])&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;
      if(end<=start)throw new Error('Could not advance chunk boundary safely.');
      if(boundary==='Fixed fallback'&&c.strategy!=='fixed')forced++;
      ranges.push({start,end,boundary});indexed+=end-start;last=end-start;if(end===document)break;
      let next=Math.max(start+1,end-overlap);
      if(mode==='text'&&/[\uDC00-\uDFFF]/.test(text[next])&&/[\uD800-\uDBFF]/.test(text[next-1]))next++;
      start=next;
    }
    count=ranges.length;
  }
  const k=Math.min(c.topK,count),unique=document/scale,indexedTokens=indexed/scale,duplicate=indexedTokens-unique;
  let raw=0,rawMin=0,uniqueMin=0,uniqueMax=0;
  if(c.topology==='adjacent'){
    if(symbolic){raw=(Math.min(k,count-1)*target+(k===count?last:0))/scale;uniqueMin=uniqueMax=Math.min(document,(k-1)*(target-overlap)+target)/scale;}
    else{raw=ranges.slice(0,k).reduce((n,r)=>n+r.end-r.start,0)/scale;uniqueMin=uniqueMax=ranges[k-1].end/scale;}
    rawMin=raw;
  }else{
    if(symbolic){raw=(Math.min(k,count-1)*target+(k===count?last:0))/scale;rawMin=(last+(k-1)*target)/scale;uniqueMin=(k===1?last:target)/scale;}
    else{const sizes=ranges.map(r=>(r.end-r.start)/scale).sort((a,b)=>a-b);rawMin=sizes.slice(0,k).reduce((a,b)=>a+b,0);raw=sizes.slice(-k).reduce((a,b)=>a+b,0);uniqueMin=sizes[k-1];}
    uniqueMax=Math.min(unique,raw);if(k===count)uniqueMin=uniqueMax=unique;
  }
  const metadata=k*c.metadata,used=raw+metadata+c.reserve,remaining=c.context-used,ratio=used/c.context;
  const pressure=ratio>1?'Overflow':ratio>=.8?'High':ratio>=.5?'Moderate':'Low';
  const riskScore=(c.size<256?2:0)+(c.overlap===0?1:0)+(c.strategy==='fixed'?1:0)+(['Policy','Prose','Research'].includes(c.kind)?1:0)+(c.kind.includes('documentation')&&c.strategy==='fixed'?1:0)+(forced>count/2?1:0);
  const boundaryRisk=riskScore>=4?'High':riskScore>=2?'Moderate':'Low',inflation=indexedTokens/unique;
  const health=pressure==='Overflow'?'CONTEXT OVERFLOW':inflation>1.5?'DUPLICATION HEAVY':boundaryRisk==='High'?'BOUNDARY CAUTION':pressure==='High'?'CONTEXT TIGHT':'BALANCED — worth testing';
  const action=pressure==='Overflow'?'Compare a smaller target or lower Top-K; review metadata and reserved context before using this configuration.':inflation>1.5?'Compare less overlap while checking whether neighboring evidence still has enough continuity.':boundaryRisk==='High'?'Test a larger target or structural boundaries with representative queries; inspect cross-boundary facts.':pressure==='High'?'Test smaller retrieval payloads or a different context budget, preserving required non-RAG context.':c.overlap===0&&c.strategy==='fixed'?'Compare modest overlap or structure-aware splitting; verify whether continuity improves on representative questions.':'Compare the three configurations, then evaluate retrieval and answers with representative questions; no setting here is a universal optimum.';
  return {count,unique,indexed:indexedTokens,duplicate,inflation,step:c.size-c.overlap,overlapPercent:100*c.overlap/c.size,last:last/scale,finalPartial:last<target,k,raw,rawMin,metadata,used,remaining,ratio,pressure,uniqueMin,uniqueMax,duplicateMin:c.topology==='adjacent'||k===count?Math.max(0,raw-uniqueMax):0,duplicateMax:k===1?0:Math.max(0,raw-uniqueMin),boundaryRisk,riskScore,forced,health,action,ranges,scale,mode,topology:c.topology};
}
export function compareRag(configs:RagConfig[],mode:'structure'|'text'='structure',text=''){
  if(configs.length!==3)throw new Error('Compare exactly three bounded configurations.');
  return configs.map((c,i)=>{try{return simulateRag(c,mode,text);}catch(e){throw new Error(`Configuration ${['A','B','C'][i]}: ${e instanceof Error?e.message:'Review settings.'}`);}});
}
