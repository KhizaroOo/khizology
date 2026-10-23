import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as model from '../src/components/toolbox/tools/browserAiModel.ts';
import {activeTools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';

const {browserAiCapabilities:registry,browserAiProvider:provider,checkBrowserAi:check,defaultBrowserAiOptions:defaults,summarizeBrowserAi:summary}=model;
assert.equal(registry.length,8);assert.equal(new Set(registry.map(c=>c.id)).size,8);
for(const c of registry){assert.ok(c.source.startsWith('https://developer.chrome.com/'));assert.ok(c.status&&c.platform&&c.model&&c.notes);}
assert.equal(model.browserAiReviewedAt,'2026-10-23');
const noApis=await check(provider({}));assert.ok(noApis.every(r=>r.state==='NOT EXPOSED'&&r.exposed===false));assert.equal(summary(noApis).overall,'LIMITED');assert.equal(summary(noApis).total,7);
for(const [raw,state] of [['available','READY'],['downloadable','DOWNLOAD REQUIRED'],['downloading','DOWNLOADING'],['unavailable','UNAVAILABLE'],['new-state','UNKNOWN'],[false,'UNKNOWN'],[undefined,'UNKNOWN']]as const){
  let calls=0;const api={availability(){assert.equal(this,api);calls++;return Promise.resolve(raw);}};
  const result=await check(provider({LanguageModel:api}));assert.equal(result[0].state,state);assert.equal(calls,1);assert.equal(result[0].exposed,true);
}
for(const failure of [()=>{throw new Error('PRIVATE_SENTINEL');},()=>Promise.reject(new Error('PRIVATE_SENTINEL'))]){
  const result=await check(provider({LanguageModel:{availability:failure},Summarizer:{availability:()=> 'available'}}));assert.equal(result[0].state,'UNKNOWN');assert.equal(result[1].state,'READY');assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'));
}
const hung=await check(provider({LanguageModel:{availability:()=>new Promise(()=>{})},Summarizer:{availability:()=> 'available'}}),defaults,5);assert.equal(hung[0].state,'UNKNOWN');assert.match(hung[0].detail,/window/);assert.equal(hung[1].state,'READY');
let lateResolve:(value:string)=>void=()=>{};
const late=await check(provider({LanguageModel:{availability:()=>new Promise<string>(resolve=>{lateResolve=resolve;})}}),defaults,5);lateResolve('available');await Promise.resolve();assert.equal(late[0].state,'UNKNOWN');
assert.equal((await check(provider({LanguageModel:{}})))[0].state,'UNKNOWN');
assert.equal((await check(provider({LanguageModel:{availability:'available'}})))[0].state,'UNKNOWN');
assert.equal((await check(provider(Object.defineProperty({},'LanguageModel',{get(){throw new Error('PRIVATE_SENTINEL');}}))))[0].exposed,null);
assert.equal((await check(provider({LanguageModel:Object.defineProperty({},'availability',{get(){throw Error('PRIVATE_SENTINEL');}})})))[0].state,'UNKNOWN');

let forbidden=0;const never=()=>{forbidden++;throw new Error('Forbidden execution');};
const calls:Record<string,unknown[]>={};
const scope:Record<string,unknown>={fetch:never,localStorage:new Proxy({},{get:never}),navigator:{sendBeacon:never,modelContext:{registerTool:never,executeTool:never}},document:{modelContext:{registerTool:never,executeTool:never}}};
for(const c of registry.filter(c=>c.id!=='webmcp')){
  scope[c.paths[0]]={availability(...args:unknown[]){calls[c.id]=args;return 'available';},create:never,prompt:never,promptStreaming:never,summarize:never,translate:never,detect:never,write:never,rewrite:never,proofread:never};
}
const options={...defaults,promptLanguage:'ja' as const,modality:'image' as const,sourceLanguage:'fr',targetLanguage:'de'};
let results=await check(provider(scope),options);
assert.deepEqual(calls.prompt,[{expectedInputs:[{type:'text',languages:['ja']},{type:'image'}],expectedOutputs:[{type:'text',languages:['ja']}]}]);
assert.deepEqual(calls.translator,[{sourceLanguage:'fr',targetLanguage:'de'}]);assert.deepEqual(calls.proofreader,[{expectedInputLanguages:['en']}]);assert.deepEqual(calls.summarizer,[]);assert.deepEqual(calls.detector,[]);
assert.equal(summary(results).ready,7);assert.equal(summary(results).overall,'READY');assert.equal(summary(results).exposed,7);assert.equal(results[7].state,'EXPOSED');assert.equal(results[7].surface,'document.modelContext');assert.equal(forbidden,0);
assert.equal((await check(provider({navigator:{modelContext:{registerTool:never}}})))[7].surface,'navigator.modelContext');
const legacy={document:Object.defineProperty({},'modelContext',{get(){throw Error();}}),navigator:{modelContext:{registerTool:never}}};assert.equal((await check(provider(legacy)))[7].state,'EXPOSED');
const writerOnly=await check(provider({Writer:{availability:()=> 'available'}}));assert.equal(writerOnly[4].state,'READY');assert.equal(summary(writerOnly).overall,'EXPERIMENTAL');assert.equal(registry[4].experimental,true);
results=await check(provider({LanguageModel:{availability:()=> 'downloadable'},Summarizer:{availability:()=> 'available'},Translator:{availability:()=> 'unavailable'},LanguageDetector:{availability:()=> 'downloading'},Writer:{availability:()=> 'unrecognized'},document:{modelContext:{}}}));
assert.deepEqual(summary(results),{total:7,exposed:5,ready:1,download:1,downloading:1,unavailable:1,missing:2,unknown:1,overall:'PARTIAL'});
for(const c of registry){const snippet=model.browserAiSnippet(c);assert.ok(!/\.create\(|\.prompt\(|\.summarize\(|\.translate\(|\.write\(|\.rewrite\(|\.proofread\(|\.registerTool\(|\.executeTool\(|console\.|fetch\(/.test(snippet));}

// Component event boundaries with the real detector, React element tree and injectable browser scope.
const require=createRequire(import.meta.url), source=fs.readFileSync('src/components/toolbox/tools/BrowserAiCapabilityChecker.tsx','utf8');
const values:any[]=[];let cursor=0, events:any[]=[], copied='';
const hooks={useState:(initial:any)=>{const index=cursor++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return [values[index],(value:any)=>{values[index]=typeof value==='function'?value(values[index]):value;}];},useRef:(initial:any)=>{const index=cursor++;if(!(index in values))values[index]={current:initial};return values[index];},useId:()=> 'browser-ai-test',useEffect:()=>{}};
const exports:any={}, context=vm.createContext({exports,window:{...scope,isSecureContext:true},require:(name:string)=>name==='react'?hooks:name==='react/jsx-runtime'?require(name):name.endsWith('browserAiModel')?model:name.endsWith('/Insight')?(()=>null):name.endsWith('/exportHelpers')?{copyText:async(text:string)=>{copied=text;return true;}}:name.endsWith('/analytics')?{trackToolResult:(...args:unknown[])=>events.push(['result_generated',args]),trackShareAction:(...args:unknown[])=>events.push(['copy',args])}:{} });
vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const render=()=>{cursor=0;return exports.default({toolSlug:'browser-ai-capability-checker'});};
function nodes(value:any):any[]{return Array.isArray(value)?value.flatMap(nodes):value&&typeof value==='object'?[value,...nodes(value.props?.children)]:[];}
const button=(tree:any,label:string)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===label);
let tree=render();await button(tree,'Run Check').props.onClick();tree=render();assert.ok(button(tree,'Re-check browser'));assert.equal(events.length,1);assert.equal(JSON.stringify(events),'[["result_generated",[]]]');
const snippetButton=nodes(tree).find(n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('')==='Copy Prompt API example');await snippetButton.props.onClick();assert.equal(copied,model.browserAiSnippet(registry[0]));assert.equal(events.length,2);assert.ok(!JSON.stringify(events).includes('available'));assert.ok(!JSON.stringify(events).includes('sourceLanguage'));
button(tree,'Reset check').props.onClick();tree=render();assert.ok(button(tree,'Run Check'));assert.equal(events.length,2);
const from=nodes(tree).find(n=>n.type==='select'&&n.props.id.endsWith('-from'));from.props.onChange({target:{value:'ur'}});tree=render();await button(tree,'Run Check').props.onClick();tree=render();assert.deepEqual(calls.translator,[{sourceLanguage:'ur',targetLanguage:'es'}]);assert.equal(events.length,3);
// Reset invalidates pending work; a later browser response must not restore cleared results or emit an event.
let complete:(value:string)=>void=()=>{};(context.window as any).LanguageModel={availability:()=>new Promise<string>(resolve=>{complete=resolve;})};
const pending=button(tree,'Re-check browser').props.onClick();await Promise.resolve();tree=render();assert.equal(button(tree,'Checking locally…').props.disabled,true);button(tree,'Reset check').props.onClick();complete('available');await pending;tree=render();assert.ok(button(tree,'Run Check'));assert.equal(events.length,3);assert.equal(forbidden,0);

for(const file of ['browserAiModel.ts','BrowserAiCapabilityChecker.tsx']){
  const code=fs.readFileSync('src/components/toolbox/tools/'+file,'utf8');
  assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|sendBeacon|console\.|userAgent|deviceMemory|hardwareConcurrency|URLSearchParams|history\.|\.create\(|\.registerTool\(|\.executeTool\(|dangerouslySetInnerHTML/.test(code),file);
}
assert.equal((source.match(/trackToolResult\(\)/g)||[]).length,1);assert.ok(source.includes("slug:toolSlug,action:'copy_result'"));
const tool=activeTools.find(t=>t.id==='browser-ai-capability-checker')!;assert.ok(tool.privacySensitive&&tool.family==='check');for(const related of [...getRelatedTools(tool),...getTryNextTools(tool)])assert.ok(activeTools.some(t=>t.id===related.id));assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
console.log(`PASS: registry, all runtime states, each API, language/modality options, current/legacy WebMCP, missing/malformed/throwing/hung APIs, mixed summary, no creation/inference/network/storage, isolated analytics, exact safe copy, reset/recheck and stale-response guard. ${activeTools.length} tools; ${activeTools.filter(t=>t.family==='check').length} Check.`);
