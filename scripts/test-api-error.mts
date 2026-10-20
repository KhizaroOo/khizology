import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildErrorContract,errorPreset,errorPresetNames,unsafeErrorText} from '../src/components/toolbox/tools/apiErrorModel.ts';
const build=(name:string)=>buildErrorContract([errorPreset(name)]);
for(const name of errorPresetNames){const r=build(name);assert.notEqual(r.quality,'FAIL',name);assert.equal(r.canExport,true);assert.doesNotThrow(()=>JSON.parse(JSON.stringify(r.catalog)));}
let e=errorPreset('Validation Error');
for(const status of [400,422]){const r=buildErrorContract([{...e,status}]);assert.equal(r.quality,'PASS');assert.equal(r.catalog[0].problem.errors?.[0].pointer,'/quantity');assert.equal(r.catalog[0].problem.status,status);}
assert.equal(build('Unauthorized').catalog[0].problem.status,401);assert.ok(build('Unauthorized').findings.some(f=>f.fix.includes('WWW-Authenticate')));
assert.equal(build('Forbidden').catalog[0].problem.status,403);
let r=build('Rate Limited');assert.equal(r.catalog[0].headers['Retry-After'],undefined);assert.ok(r.findings.some(f=>f.problem==='No Retry-After value defined'));
for(const retryAfter of ['120','Wed, 21 Oct 2026 07:28:00 GMT']){r=buildErrorContract([{...errorPreset('Rate Limited'),retryAfter}]);assert.equal(r.catalog[0].headers['Retry-After'],retryAfter);assert.notEqual(r.quality,'FAIL');}
for(const retryAfter of ['-1','soon','1.5','\r\nX-Injected: yes'])assert.equal(buildErrorContract([{...e,retryAfter}]).quality,'FAIL');
assert.ok(build('Conflict').findings.some(f=>f.fix.includes('Refresh state')));
assert.ok(build('Dependency Failure').findings.some(f=>f.fix.includes('cap attempts')));
assert.equal(build('Internal Error').quality,'PASS');
const sensitive=['{"password":"fictional-only"}','NullPointerException','Traceback (most recent call last)', 'password=fictional-only','Bearer fictional-token','SELECT value FROM customer','Error: implementation failure','C:\\private\\config','https://db.internal/query','person@example.test','api_key=fictional-key','https://example.com/?token=fictional','%70assword%3Dfictional','postgres://user:pass@internal/db'];
for(const detail of sensitive){assert.ok(unsafeErrorText(detail),detail);r=buildErrorContract([{...e,detail}]);assert.equal(r.quality,'FAIL');assert.equal(r.canExport,false);assert.ok(!JSON.stringify(r).includes(detail));assert.equal(r.catalog[0].problem.code,'WITHHELD');}
for(const key of ['name','title','type','instance','action','code'] as const){r=buildErrorContract([{...e,[key]:'password=fictional-only'}]);assert.equal(r.quality,'FAIL');assert.ok(!JSON.stringify(r).includes('fictional-only'));}
r=buildErrorContract([{...e,fields:[{id:1,pointer:'/x',detail:'password=fictional-only',code:''}]}]);assert.equal(r.quality,'FAIL');assert.ok(!JSON.stringify(r).includes('fictional-only'));
r=buildErrorContract([{...errorPreset('Dependency Failure'),operation:'non-idempotent'}]);assert.ok(r.findings.some(f=>f.problem.includes('Non-idempotent')));
r=buildErrorContract([e,{...e,id:2}]);assert.equal(r.quality,'FAIL');assert.ok(r.findings.some(f=>f.problem==='Duplicate public code'));
for(const status of [200,399,600,NaN,Infinity,422.5])assert.equal(buildErrorContract([{...e,status}]).quality,'FAIL');
assert.equal(buildErrorContract([{...e,status:500}]).quality,'WARN');
assert.equal(buildErrorContract([{...e,safeToExpose:false}]).canExport,false);
r=buildErrorContract([{...e,trace:true,instance:'/occurrences/example'}]);const p=r.catalog[0].problem;assert.deepEqual(Object.keys(p).sort(),['code','detail','errors','instance','status','title','traceId','type']);assert.equal(p.traceId,'example-opaque-correlation-id');assert.equal((p as unknown as Record<string,unknown>).retry,undefined);
for(const type of ['https://example.com/problems/input','/problems/input','urn:example:invalid-input','tag:example.com,2026:invalid'])assert.notEqual(buildErrorContract([{...e,type}]).quality,'FAIL');
for(const type of ['javascript:alert(1)','https://','bad uri','/bad%zz'])assert.equal(buildErrorContract([{...e,type}]).quality,'FAIL');
for(const pointer of ['/quantity','#/items/0/name','/a~1b/~0value'])assert.notEqual(buildErrorContract([{...e,fields:[{id:1,pointer,detail:'Required.',code:''}]}]).quality,'FAIL');
for(const pointer of ['quantity','/bad~2',''])assert.equal(buildErrorContract([{...e,fields:[{id:1,pointer,detail:'Required.',code:''}]}]).quality,'FAIL');
assert.throws(()=>buildErrorContract([]));assert.throws(()=>buildErrorContract(Array.from({length:13},()=>e)));assert.throws(()=>buildErrorContract([{...e,fields:Array.from({length:11},()=>e.fields[0])}]));assert.throws(()=>buildErrorContract([{...e,detail:'x'.repeat(1001)}]));
const many=Array.from({length:12},(_,i)=>({...e,id:i,code:`ERROR_${i}`,detail:'x'.repeat(1000),fields:Array.from({length:10},(_,j)=>({id:j,pointer:'/field',detail:'x'.repeat(1000),code:''}))}));assert.throws(()=>buildErrorContract(many),/60 KB/);
const component=fs.readFileSync('src/components/toolbox/tools/ApiErrorContractBuilder.tsx','utf8');assert.ok(component.includes('copyText(JSON.stringify(current.problem, null, 2))')||component.includes('copyText(JSON.stringify(current.problem,null,2))'));assert.ok(component.includes("downloadJSON(current.problem, 'api-problem-details')")||component.includes("downloadJSON(current.problem,'api-problem-details')"));
assert.ok(!/localStorage|sessionStorage|\bfetch\s*\(|console\.|URLSearchParams/.test(component));assert.ok(component.includes('trackToolResult()'));assert.ok(component.includes("setEntries([errorPreset('Validation Error')])"));
console.log('API error contract tests passed: nine presets, HTTP/RFC fields, custom extensions, retry/idempotency, masking, duplicate codes, bounds, export/reset wiring and local-only privacy.');
