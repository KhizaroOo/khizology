import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewWebActions as review,webActionPreset as preset,webPresetNames,webReadinessMetadata} from '../src/components/toolbox/tools/webReadinessModel.ts';
import {activeTools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
const has=(r:ReturnType<typeof review>,category:string,severity?:string)=>r.findings.some(f=>f.category===category&&(!severity||f.severity===severity));
let a=preset('Product Search'),r=review([a]);assert.equal(r.status,'PASS');assert.equal(r.missing,0);assert.ok(!has(r,'Human confirmation'));
a.name='get_production_status';assert.equal(review([a]).high,0);a.name='get_permissions';assert.equal(review([a]).missing,0);
a.name='manage';r=review([a]);assert.ok(has(r,'Ambiguous action')&&has(r,'Intent scope'));a.name='search-products.v1';assert.ok(!has(review([a]),'Tool name'));a.name='search products';assert.ok(has(review([a]),'Tool name','FAIL'));
a=preset('Product Search');assert.ok(has(review([a,{...a,name:'find_products'}]),'Overlapping agent actions'));assert.ok(has(review([a,a]),'Duplicate tool name','FAIL'));
for(const name of ['Checkout','Delete Account','Contact Form']){a=preset(name);r=review([a]);assert.ok(has(r,'Human confirmation','FAIL'));assert.equal(r.high,1);a.confirm=true;a.summary=true;a.cancel=true;r=review([a]);assert.equal(r.missing,0);assert.ok(!has(r,'Human confirmation'));assert.ok(has(r,'High-impact action','INFO'));}
a=preset('Contact Form');a.retry='None planned';assert.ok(has(review([a]),'Retry / duplicate effects'));a.retry='Automatic unsafe retry';assert.ok(has(review([a]),'Retry / duplicate effects','FAIL'));
a=preset('Profile Update');r=review([a]);assert.ok(has(r,'Authorization scope','FAIL'));a.authorized=true;a.errors=['Validation','Unavailable','Authentication required','Permission denied'];r=review([a]);assert.ok(!has(r,'Authorization scope'));assert.ok(!has(r,'Error behavior'));
a=preset('Product Search');a.type='Submit';a.effects='Irreversible application filing';assert.ok(has(review([a]),'Human confirmation','FAIL'));
a=preset('Checkout');a.effects='None; read-only.';assert.ok(has(review([a]),'Side effects'));
a=preset('Product Search');a.fields[0].constraints='';a.fields[0].description='x';r=review([a]);assert.ok(has(r,'Input validation')&&has(r,'Input/schema clarity'));
a=preset('Product Search');a.fields[0].name='passport_number';r=review([a]);assert.ok(has(r,'Sensitive data')&&has(r,'Data minimization'));assert.ok(!JSON.stringify(r).includes('passport_number'));
a=preset('Suspicious Tool Description');r=review([a]);assert.ok(has(r,'Security signal'));assert.ok(!JSON.stringify(r).includes('Ignore previous'));
a=preset('Product Search');a.fields[0].constraints='secret sk-PRIVATE9827SECRET9876';r=review([a]);assert.ok(has(r,'Sensitive data'));assert.ok(!JSON.stringify(r).includes('PRIVATE9827'));
a=preset('Bad Mega Tool');assert.ok(has(review([a]),'Intent scope'));
a=preset('Product Search');a.human=false;assert.ok(has(review([a]),'Human / agent parity'));
assert.throws(()=>review([]));assert.throws(()=>review(Array.from({length:11},()=>preset('Product Search'))));a=preset('Product Search');a.fields=Array.from({length:21},()=>({...a.fields[0]}));assert.throws(()=>review([a]));a=preset('Product Search');a.description='x'.repeat(2001);assert.throws(()=>review([a]));a=preset('Product Search');a.intents=NaN;assert.throws(()=>review([a]));
for(const name of webPresetNames){a=preset(name);assert.deepEqual(review([a]),review([a]));for(const f of review([a]).findings)assert.ok(f.evidence&&f.why&&f.fix);}
a=preset('Bad Mega Tool');a.fields=Array.from({length:20},()=>({name:'password',type:'string' as const,description:'x',constraints:'',required:true}));r=review(Array.from({length:10},()=>({...a})));assert.ok(r.findings.length<=200&&r.omitted>0);assert.ok(r.counts.FAIL>0);
assert.equal(webReadinessMetadata.verified,'2026-10-23');assert.match(webReadinessMetadata.status,/Emerging/);
for(const f of ['webReadinessModel.ts','WebMcpReadinessDoctor.tsx'])assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|dangerouslySetInnerHTML/.test(fs.readFileSync('src/components/toolbox/tools/'+f,'utf8')));
const tool=activeTools.find(t=>t.slug==='webmcp-readiness-doctor')!;assert.ok(tool&&getRelatedTools(tool).length&&getTryNextTools(tool).length);for(const id of [...tool.relatedToolIds!,...tool.nextToolIds!])assert.ok(activeTools.some(t=>t.id===id));assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
console.log(`PASS: eight presets, names/descriptions, schemas, overlap, confirmation, auth/retry, sensitive/injection signals, limits, repeatability and privacy. ${activeTools.length} active; ${activeTools.filter(t=>t.family==='check').length} Check.`);
