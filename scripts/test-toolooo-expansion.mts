import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
const additions=[['date-time-contract-doctor','check','DateTimeContractDoctor','dateTimeModel'],['replica-lag-simulator','simulate','ReplicaLagSimulator','replicaLagModel'],['async-messaging-decision-lab','decide','AsyncMessagingDecisionLab','messagingDecisionModel'],['zero-downtime-schema-change-planner','plan','ZeroDowntimeSchemaChangePlanner','schemaChangeModel'],['api-chaos-payload-builder','create','ApiChaosPayloadBuilder','chaosPayloadModel']];
assert.ok(tools.length>=45);assert.equal(new Set(tools.map(t=>t.slug)).size,tools.length);assert.equal(new Set(tools.map(t=>t.id)).size,tools.length);
const sitemap=fs.readFileSync('dist/sitemap-0.xml','utf8'),llms=fs.readFileSync('dist/llms.txt','utf8');
for(const [slug,family,component,model] of additions){
 const tool=tools.find(t=>t.slug===slug)!;assert.equal(tool.family,family);assert.equal(tool.status,'active');
 const html=fs.readFileSync(`dist/toolbox/${slug}/index.html`,'utf8');assert.ok(html.includes('data-tool-knowledge-next'));assert.ok(sitemap.includes(`https://khizooology.com/toolbox/${slug}/`));assert.ok(llms.includes(`/toolbox/${slug}/`));
 const related=getRelatedTools(tool,3),next=getTryNextTools(tool,2+related.length).filter(t=>!related.some(r=>r.id===t.id)).slice(0,2);assert.ok(next.length>0);assert.ok(next.every(t=>fs.existsSync(`dist/toolbox/${t.slug}/index.html`)));
 for(const file of [`${component}.tsx`,`${model}.ts`]){const source=fs.readFileSync(`src/components/toolbox/tools/${file}`,'utf8');assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|console\.(?:log|info|debug)|URLSearchParams|sendBeacon/.test(source),`${slug}: raw input must stay local`);}
}
const chaos=tools.find(t=>t.slug==='api-chaos-payload-builder')!;assert.ok(getRelatedTools(chaos,3).some(t=>t.id==='api-payload-doctor'));
assert.ok(!fs.existsSync('src/pages/infooo/infrastructure-x-ray.astro'));assert.ok(!sitemap.includes('infrastructure-x-ray'));assert.ok(!llms.includes('infrastructure-x-ray'));
console.log(`Expansion audit passed: 40 → ${tools.length}; ${JSON.stringify(Object.fromEntries(['check','simulate','decide','plan','create'].map(f=>[f,tools.filter(t=>t.family===f).length])))}; routes, sitemap, llms, Next, related doctor and local-only input sources.`);
