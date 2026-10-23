import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {ragDefaults,ragPresets,ragStrategies,simulateRag as run,compareRag,RAG_LIMITS,type RagConfig} from '../src/components/toolbox/tools/ragChunkingModel.ts';
import {activeTools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const base={...ragDefaults,document:1000,size:256,overlap:0,topK:4};
let r=run(base);assert.equal(r.count,4);assert.equal(r.last,232);assert.equal(r.indexed,1000);assert.equal(r.inflation,1);assert.equal(r.uniqueMin,1000);assert.equal(r.raw,1000);
r=run({...base,overlap:64});assert.equal(r.count,5);assert.equal(r.last,232);assert.equal(r.indexed,1256);assert.equal(r.duplicate,256);assert.equal(r.raw,1024);assert.equal(r.uniqueMin,832);assert.equal(r.duplicateMax,192);close(r.overlapPercent,25);
r=run({...base,size:100,overlap:10});assert.equal(r.count,11);assert.equal(r.duplicate,100);assert.equal(r.indexed,1100);assert.equal(r.overlapPercent,10);
r=run({...base,overlap:64,topK:1,topology:'unknown'});assert.equal(r.rawMin,232);assert.equal(r.raw,256);assert.equal(r.duplicateMin,0);assert.equal(r.duplicateMax,0);
for(const overlap of [0,25,64,128,255]){const c={...base,overlap};const result=run(c);let sum=0,end=0,n=0;while(end<c.document){const start=n*(c.size-c.overlap);end=Math.min(c.document,start+c.size);sum+=end-start;n++;}assert.equal(result.count,n);assert.equal(result.indexed,sum);assert.equal(result.duplicate,sum-c.document);}
r=run({...base,document:10,topK:20,metadata:30});assert.equal(r.count,1);assert.equal(r.k,1);assert.equal(r.raw,10);assert.equal(r.metadata,30);assert.equal(r.duplicateMax,0);
assert.ok(run({...base,size:32}).count>run(base).count);assert.equal(run({...base,size:32}).boundaryRisk,'High');
const overflow=run({...base,document:100000,size:8192,overlap:256,topK:20,context:8192,reserve:1024,metadata:20});assert.equal(overflow.pressure,'Overflow');assert.ok(overflow.remaining<0);close(overflow.used,overflow.raw+overflow.metadata+1024);
assert.ok(run({...base,topK:2}).raw<run({...base,topK:4}).raw);
const source='# First section\n'+('A sentence with useful context. '.repeat(12))+'\n\n# Second section\n'+('Another attributed statement. '.repeat(12))+'\n\nLast paragraph.\n\n';
for(const strategy of Object.keys(ragStrategies) as RagConfig['strategy'][]){
 const c={...base,size:128,overlap:16,strategy};r=run(c,'text',source);assert.equal(r.ranges[0].start,0);assert.equal(r.ranges.at(-1)!.end,source.length);close(r.unique,source.length/4);close(r.indexed,r.ranges.reduce((n,v)=>n+v.end-v.start,0)/4);close(r.duplicate,r.indexed-r.unique);
 for(let i=0;i<r.ranges.length;i++){assert.ok(r.ranges[i].end>r.ranges[i].start);if(i)assert.ok(r.ranges[i].start<=r.ranges[i-1].end&&r.ranges[i].end>r.ranges[i-1].end);}
 assert.deepEqual(r,run(c,'text',source));
 if(strategy==='heading')assert.ok(r.ranges.some(v=>v.boundary==='Heading / section'));
 if(strategy==='paragraph')assert.ok(r.ranges.some(v=>v.boundary==='paragraph'));
}
const unicode=('😀'.repeat(70)+' A sentence.\n\n').repeat(8);r=run({...base,size:33,overlap:1},'text',unicode);for(const span of r.ranges){assert.ok(!/[\uDC00-\uDFFF]/.test(unicode[span.start]));assert.ok(span.end===unicode.length||!/[\uDC00-\uDFFF]/.test(unicode[span.end]));}
const snapshot=JSON.stringify(ragPresets),start=performance.now();
for(const preset of ragPresets)for(const strategy of Object.keys(ragStrategies) as RagConfig['strategy'][]){const c={...preset.config,strategy};for(const topology of ['adjacent','unknown'] as const){const x=run({...c,topology});for(const value of Object.values(x))if(typeof value==='number')assert.ok(Number.isFinite(value));assert.ok(x.uniqueMin<=x.uniqueMax&&x.uniqueMax<=x.unique);assert.ok(x.rawMin<=x.raw&&x.duplicateMin<=x.duplicateMax);assert.deepEqual(x,run({...c,topology}));}}
assert.equal(snapshot,JSON.stringify(ragPresets));assert.ok(performance.now()-start<5000);
for(const bad of [{overlap:256},{overlap:-1},{size:0},{topK:0},{document:Infinity},{metadata:NaN},{size:2.5},{reserve:16384}])assert.throws(()=>run({...base,...bad}));
assert.throws(()=>run(base,'text',''));assert.throws(()=>run(base,'text','x'.repeat(RAG_LIMITS.text+1)));assert.throws(()=>run({...base,document:10000000,size:32,overlap:31,strategy:'paragraph'}));
const maxFixed=run({...base,document:10000000,size:32,overlap:31});assert.ok(maxFixed.count>1000000&&maxFixed.ranges.length<=20);
for(const topology of ['unknown','adjacent'] as const){r=run({...base,document:10,topology});assert.equal(r.duplicateMin,0);assert.equal(r.duplicateMax,0);}
const comparisons=compareRag([base,{...base,size:512},{...base,size:1024}]);assert.deepEqual(comparisons[0],run(base));assert.throws(()=>compareRag([base]));
for(const file of ['ragChunkingModel.ts','RagChunkingSimulator.tsx'])assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|dangerouslySetInnerHTML/.test(fs.readFileSync('src/components/toolbox/tools/'+file,'utf8')));
const tool=activeTools.find(t=>t.id==='rag-chunking-simulator')!;assert.ok(tool&&tool.family==='simulate'&&getRelatedTools(tool).length&&getTryNextTools(tool).length);for(const id of [...tool.relatedToolIds!,...tool.nextToolIds!])assert.ok(activeTools.some(t=>t.id===id));assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
console.log(`RAG PASS: exact accounting, partial chunks, Unicode ranges, all five strategies × seven presets × two topologies, context/metadata, bounds, deterministic comparisons and privacy. ${activeTools.length} active; ${activeTools.filter(t=>t.family==='simulate').length} Simulate.`);
