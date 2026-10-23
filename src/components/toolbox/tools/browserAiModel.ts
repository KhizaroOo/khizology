// Official Chrome docs and draft IDL reviewed 2026-10-23. Runtime results take precedence.
export const browserAiReviewedAt = '2026-10-23';
export const browserAiSources = {
  overview: 'https://developer.chrome.com/docs/ai/built-in-apis',
  lifecycle: 'https://developer.chrome.com/docs/ai/get-started',
  webmcpIdl: 'https://webmachinelearning.github.io/webmcp/',
  proofreaderIdl: 'https://webmachinelearning.github.io/proofreader-api/',
};
export const promptLanguages = {en:'English', ja:'Japanese', es:'Spanish', de:'German', fr:'French'};
// Convenient examples, not a claim that every pair is supported.
export const translationLanguages = {...promptLanguages, ar:'Arabic', hi:'Hindi', ur:'Urdu', zh:'Chinese', pt:'Portuguese'};
export type BrowserAiOptions = {promptLanguage: keyof typeof promptLanguages; modality: 'text'|'image'|'audio'; sourceLanguage: string; targetLanguage: string};
export const defaultBrowserAiOptions: BrowserAiOptions = {promptLanguage:'en', modality:'text', sourceLanguage:'en', targetLanguage:'es'};
type CheckOptions = Record<string, unknown>;
type Capability = {
  id: string; name: string; paths: readonly string[]; category: string; purpose: string;
  status: string; experimental: boolean; platform: string; model: string; notes: string;
  source: string; options?: (options: BrowserAiOptions) => CheckOptions;
};
const foundationPlatform = 'Chrome desktop on eligible Windows, macOS, Linux and Chromebook Plus devices; not current Chrome mobile.';
const languagePlatform = 'Chrome desktop; current Chrome mobile is not supported. Foundation-model hardware requirements do not apply.';
export const browserAiCapabilities: readonly Capability[] = [
  {id:'prompt', name:'Prompt API', paths:['LanguageModel'], category:'Foundation model', purpose:'General local language-model prompting.', status:'Chrome 148 stable (web)', experimental:false, platform:foundationPlatform, model:'Gemini Nano in Chrome', source:'https://developer.chrome.com/docs/ai/prompt-api', notes:'Checks the selected text language and optional image/audio input, with text output. Other combinations and sampling features may differ. Audio requires a GPU in current Chrome.', options:o=>({expectedInputs:[{type:'text', languages:[o.promptLanguage]}, ...(o.modality==='text'?[]:[{type:o.modality}])], expectedOutputs:[{type:'text', languages:[o.promptLanguage]}]})},
  {id:'summarizer', name:'Summarizer API', paths:['Summarizer'], category:'Task AI', purpose:'Condense long text into summaries.', status:'Chrome 138 stable', experimental:false, platform:foundationPlatform, model:'Browser-managed summarization model', source:'https://developer.chrome.com/docs/ai/summarizer-api', notes:'Default availability check only. Custom language, summary type, length and format may have different constraints.'},
  {id:'translator', name:'Translator API', paths:['Translator'], category:'Language models', purpose:'Translate between a selected pair of languages.', status:'Chrome 138 stable', experimental:false, platform:languagePlatform, model:'Browser-managed translation language packs', source:'https://developer.chrome.com/docs/ai/translator-api', notes:'Chrome masks per-pair installation state: a pair can be reported downloadable until this site creates a translator. This checker never does so; DOWNLOAD REQUIRED may reflect that privacy protection.', options:o=>({sourceLanguage:o.sourceLanguage, targetLanguage:o.targetLanguage})},
  {id:'detector', name:'Language Detector API', paths:['LanguageDetector'], category:'Language models', purpose:'Identify the language of text.', status:'Chrome 138 stable', experimental:false, platform:languagePlatform, model:'Browser-managed language detection model', source:'https://developer.chrome.com/docs/ai/language-detection', notes:'Default availability only, not a guarantee of accurate detection for every language or short text.'},
  {id:'writer', name:'Writer API', paths:['Writer'], category:'Task AI', purpose:'Draft text for a writing task.', status:'Developer trial / experimental', experimental:true, platform:foundationPlatform, model:'Browser-managed foundation model', source:'https://developer.chrome.com/docs/ai/writer-api', notes:'Current Chrome catalog lists developer trial, not stable web support. Trial or flag access may be needed. This checks default options only.'},
  {id:'rewriter', name:'Rewriter API', paths:['Rewriter'], category:'Task AI', purpose:'Revise existing text.', status:'Developer trial / experimental', experimental:true, platform:foundationPlatform, model:'Browser-managed foundation model', source:'https://developer.chrome.com/docs/ai/rewriter-api', notes:'Current Chrome catalog lists developer trial. Exposure is not evidence of stable cross-browser support. This checks default options only.'},
  {id:'proofreader', name:'Proofreader API', paths:['Proofreader'], category:'Task AI', purpose:'Suggest spelling, grammar and punctuation corrections.', status:'Developer trial / experimental', experimental:true, platform:foundationPlatform, model:'Browser-managed foundation model', source:'https://developer.chrome.com/docs/ai/proofreader-api', notes:'Experimental. Safe optional availability syntax is checked against the draft IDL because the Chrome guide contains a malformed example. Checks English input only.', options:()=>({expectedInputLanguages:['en']})},
  {id:'webmcp', name:'WebMCP', paths:['document.modelContext','navigator.modelContext'], category:'Agentic web', purpose:'Expose structured website tools to browser agents; not an AI model.', status:'Origin trial from Chrome 149 / experimental', experimental:true, platform:'Chrome origin trial or local testing flag; evolving API surface.', model:'None — agent tool interface', source:'https://developer.chrome.com/docs/ai/webmcp', notes:'Presence only: current draft uses document.modelContext; older implementations use navigator.modelContext. Exposure does not prove an agent is connected, native implementation, permissions or usable tools. Nothing is registered or invoked.'},
];
export type BrowserAiState = 'READY'|'DOWNLOAD REQUIRED'|'DOWNLOADING'|'UNAVAILABLE'|'NOT EXPOSED'|'UNKNOWN'|'EXPOSED';
export type BrowserAiResult = {id:string; state:BrowserAiState; exposed:boolean|null; detail:string; surface?:string};
export type BrowserAiProvider = {read:(path:string)=>unknown};
/** Only paths in the canonical registry are read; no device/browser profiling. */
export function browserAiProvider(scope: object): BrowserAiProvider {
  return {read:path=>path.split('.').reduce<unknown>((value,key)=>value!=null&&(typeof value==='object'||typeof value==='function')?Reflect.get(value,key):undefined,scope)};
}
export const browserAiActions: Record<BrowserAiState,string> = {
  READY:'Progressively enable this enhancement for the checked options. Still handle session failure and validate output.',
  'DOWNLOAD REQUIRED':'Explain the browser-managed download in your app and ask for explicit user interaction before requesting model creation. Keep a non-AI path.',
  DOWNLOADING:'Keep the normal experience usable while the browser finishes. Re-check manually later; this page does not monitor or start downloads.',
  UNAVAILABLE:'Keep the non-AI experience. Check supported options, platform and browser policy; the checker cannot identify the exact cause.',
  'NOT EXPOSED':'Keep the normal experience. Consult the dated API documentation for browser, context and trial requirements.',
  UNKNOWN:'Keep the non-AI experience. Review the API documentation and retry; no support conclusion can be drawn.',
  EXPOSED:'Treat as experimental presence only. Review permissions and authorization separately before exposing real actions.',
};
export function normalizeBrowserAiState(state:unknown): BrowserAiState {
  switch(state){case 'available':return 'READY';case 'downloadable':return 'DOWNLOAD REQUIRED';case 'downloading':return 'DOWNLOADING';case 'unavailable':return 'UNAVAILABLE';default:return 'UNKNOWN';}
}
/** One bounded availability call per model API. Never creates a session or invokes a tool. */
export async function checkBrowserAi(provider:BrowserAiProvider, options:BrowserAiOptions=defaultBrowserAiOptions, timeoutMs=3000):Promise<BrowserAiResult[]> {
  return Promise.all(browserAiCapabilities.map(async capability=>{
    let exposed:boolean|null=null;
    try {
      let api:unknown, surface:string|undefined, readFailed=false;
      for(const path of capability.paths){
        try {const value=provider.read(path);if(value!=null){api=value;surface=path;break;}}
        catch {readFailed=true;}
      }
      if(api==null)return {id:capability.id, exposed:readFailed?null:false, state:readFailed?'UNKNOWN':'NOT EXPOSED', detail:readFailed?'The API surface could not be inspected safely.':'No API surface was found in this page context.'};
      exposed=true;
      if(capability.id==='webmcp')return {id:capability.id, exposed, state:'EXPOSED', surface, detail:'Structured agent interface exposed; no model readiness or agent connection tested.'};
      const availability=Reflect.get(Object(api),'availability');
      if(typeof availability!=='function')return {id:capability.id, exposed, state:'UNKNOWN', surface, detail:'Exposed without the documented availability method.'};
      let timer:ReturnType<typeof setTimeout>|undefined;
      const timeout=Symbol('timeout');
      let value:unknown;
      try {
        value=await Promise.race([
          Promise.resolve().then(()=>capability.options?availability.call(api,capability.options(options)):availability.call(api)),
          new Promise(resolve=>{timer=setTimeout(()=>resolve(timeout),timeoutMs);}),
        ]);
      } finally {clearTimeout(timer);}
      const state=normalizeBrowserAiState(value);
      return {id:capability.id, exposed, state, surface, detail:value===timeout?'Availability did not respond within the check window. No automatic retry.':state==='UNKNOWN'?'The API returned an unrecognized availability value; no support assumption made.':`Browser-reported state: ${value}. Applies only to the checked options.`};
    } catch {return {id:capability.id, exposed, state:'UNKNOWN', detail:'Availability was rejected or inspection failed. Context, policy or options may restrict access; no raw error details are retained.'};}
  }));
}
export function summarizeBrowserAi(results:BrowserAiResult[]) {
  const models=results.filter(r=>r.id!=='webmcp');
  const count=(state:BrowserAiState)=>models.filter(r=>r.state===state).length;
  const ready=count('READY'), experimentalOnly=ready>0&&models.filter(r=>r.state==='READY').every(r=>browserAiCapabilities.find(c=>c.id===r.id)?.experimental);
  return {total:models.length, exposed:models.filter(r=>r.exposed===true).length, ready, download:count('DOWNLOAD REQUIRED'), downloading:count('DOWNLOADING'), unavailable:count('UNAVAILABLE'), missing:count('NOT EXPOSED'), unknown:count('UNKNOWN'), overall:experimentalOnly?'EXPERIMENTAL':ready===models.length&&ready>0?'READY':ready>0?'PARTIAL':'LIMITED'};
}
/** Examples deliberately use defaults, never a user's runtime results or selected pair. */
export function browserAiSnippet(capability:Capability):string {
  if(capability.id==='webmcp')return `// Presence only; does not register or invoke tools.\nconst exposed = 'modelContext' in document ||\n  'modelContext' in navigator;\n// Experimental presence does not prove agent readiness.`;
  const api=capability.paths[0], options=capability.options?.(defaultBrowserAiOptions);
  return `// Detection only; default example options. No session creation.\nif ('${api}' in window &&\n    typeof ${api}.availability === 'function') {\n  try {\n    const state = await ${api}.availability(${options?JSON.stringify(options,null,2):''});\n    if (state === 'available') {\n      // Offer the optional native enhancement.\n    }\n    // Keep normal non-AI UX for every other state.\n  } catch {\n    // Keep normal non-AI UX if the check fails.\n  }\n}`;
}
