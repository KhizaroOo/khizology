import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyControl,assembleContext,choices,contextSummary,createHandoff,detectConflict,evaluateOutcome,everything,focused,poor,scenarioContext,scenarios,sourceNames,workflowState,type Context,type Source} from '../src/components/infooo/context-lab/contextModel.ts';
assert.equal(contextSummary(focused()).count,6); assert.equal(contextSummary(everything()).count,42);
assert.equal(contextSummary(focused()).toolCount,4); assert.equal(contextSummary(everything()).toolCount,200);
assert.equal(contextSummary(focused()).quality,'FOCUSED'); assert.equal(evaluateOutcome(focused()).pass,true); assert.equal(evaluateOutcome(poor()).pass,false);
for(const scenario of scenarios){const bad=scenarioContext(scenario.id);assert.equal(evaluateOutcome(bad).pass,false,scenario.id);const repaired=applyControl(bad,scenario.fix);assert.equal(evaluateOutcome(repaired).pass,true,scenario.id);}
const stale=scenarioContext('file');assert.equal(assembleContext(stale).find(i=>i.id==='button')?.freshness,'STALE');
assert.equal(evaluateOutcome(applyControl(stale,'Check freshness')).pass,false,'checking freshness is not a magical file refresh');
assert.equal(assembleContext(stale).find(i=>i.id==='button')?.freshness,'STALE','evaluation cannot mutate source provenance');
const remembered=scenarioContext('memory');assert.ok(assembleContext(remembered).some(i=>i.source==='memory'&&i.active));
const current=applyControl(remembered,'Check freshness');assert.equal(evaluateOutcome(current).pass,true);assert.equal(assembleContext(current).find(i=>i.source==='memory')?.active,false);assert.equal(assembleContext(current).find(i=>i.source==='memory')?.freshness,'STALE');
assert.equal(assembleContext(focused()).some(i=>i.source==='memory'),false,'stored records need not be active context');
const retrieved=applyControl(scenarioContext('retrieval'),'Retrieve current source');assert.equal(retrieved.sources.retrieval,'current');assert.equal(evaluateOutcome(retrieved).pass,true);
assert.equal(assembleContext({...retrieved,sources:{...retrieved.sources,retrieval:'excluded'}}).some(i=>i.source==='retrieval'),false);
const flood=scenarioContext('flood'),pruned=applyControl(flood,'Prune noise');assert.ok(contextSummary(pruned).noise<contextSummary(flood).noise);
assert.ok(assembleContext(pruned).find(i=>i.id==='diagnostic')!.origin.includes('test-run-018:L9821'));
assert.ok(assembleContext(pruned).find(i=>i.id==='diagnostic')!.evidence.includes('import missing'));
const long={...focused(),history:20,sources:{...focused().sources,outputs:'noisy' as const}};
const compact=applyControl(long,'Compact context');assert.ok(contextSummary(compact).size<contextSummary(long).size);assert.equal(evaluateOutcome(compact).pass,true);assert.equal(createHandoff(compact).constraints,workflowState.constraints);
assert.ok(createHandoff(applyControl(scenarioContext('instruction'),'Compact context')).constraints?.includes('NOT AVAILABLE'),'compaction must not invent a missing constraint');
assert.equal(evaluateOutcome(applyControl(scenarioContext('instruction'),'Compact context')).pass,false);
const lossy={...long,transfer:'lossy' as const};assert.equal(evaluateOutcome(lossy).checks.api,false);assert.equal(createHandoff(lossy).constraints,'OMITTED IN THIS SIMULATION');
const handoff=applyControl(scenarioContext('handoff'),'Structured handoff');assert.equal(evaluateOutcome(handoff).pass,true);
for(const field of ['goal','completed','current','decisions','blockers','next','constraints'])assert.ok(field in createHandoff(handoff));
assert.deepEqual(createHandoff(scenarioContext('handoff')),{goal:'Continue the work.'});
const conflicted={...focused(),sources:{...focused().sources,retrieval:'stale' as const},preferCurrent:false};assert.equal(detectConflict(conflicted),true);assert.equal(contextSummary(conflicted).quality,'CONFLICTED');assert.equal(evaluateOutcome(conflicted).pass,false);
assert.equal(evaluateOutcome(applyControl(conflicted,'Check freshness')).pass,true);
const drift={...focused(),drift:true,goalPinned:false};assert.equal(evaluateOutcome(drift).checks.scope,false);assert.equal(evaluateOutcome(applyControl(drift,'Pin goal')).pass,true);
const noisyCurrent={...focused(),history:20,sources:{...focused().sources,files:'noisy' as const,tools:'noisy' as const}};
assert.equal(evaluateOutcome(noisyCurrent).pass,true,'size/noise alone does not force a failure');assert.equal(contextSummary(noisyCurrent).quality,'NOISY');
assert.equal(evaluateOutcome({...focused(),sources:{...focused().sources,tools:'excluded'}}).pass,false);
assert.equal(evaluateOutcome(applyControl({...focused(),sources:{...focused().sources,tools:'excluded'}},'Load tool on demand')).pass,true);
assert.equal(evaluateOutcome(applyControl(everything(),'Prune noise')).pass,false,'pruning alone does not resolve contradictory stale guidance');
assert.deepEqual(focused(),focused());
let combinations=0;const ids=Object.keys(sourceNames) as Source[];
function walk(index:number,c:Context){if(index===ids.length){combinations++;const summary=contextSummary(c),outcome=evaluateOutcome(c);assert.ok(Number.isFinite(summary.size));assert.ok(summary.count>=0);assert.equal(new Set(summary.all.map(i=>i.id)).size,summary.all.length);assert.equal(outcome.pass,Object.values(outcome.checks).every(Boolean));if(outcome.pass){assert.equal(c.sources.instructions,'current');assert.ok(['current','noisy'].includes(c.sources.files));assert.equal(c.sources.outputs,'current');}return;}const id=ids[index];for(const value of choices[id])walk(index+1,{...c,sources:{...c.sources,[id]:value}});}
walk(0,focused());assert.equal(combinations,7776);
const source=fs.readFileSync('src/components/infooo/context-lab/ContextEngineeringLab.tsx','utf8');assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if(process.argv.includes('--built')){
 const route='https://khizooology.com/infooo/context-engineering-lab/',html=fs.readFileSync('dist/infooo/context-engineering-lab/index.html','utf8');
 assert.ok(html.includes(`rel="canonical" href="${route}"`));assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!html.includes('noindex'));
 for(const key of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image'])assert.ok(html.includes(key),key);
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.url===route));assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));
 assert.ok(html.includes('The model stays the same. The context changes.'));
 const maps=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join('');assert.equal(maps.split(`<loc>${route}</loc>`).length-1,1);
 assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route));assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes('context-engineering-lab/'));
}
console.log(`Context model PASS: happy path, six failure/repair pairs, 6 vs 42 items, stale provenance, retrieval, diagnostics, compaction, lossy/structured handoff, conflict, drift, memory selection, tool loading and privacy; ${combinations} source combinations.`);
