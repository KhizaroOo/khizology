import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advanceWorkflow, applySideEffect, cleanReference, escalateWorkflow, evaluateMission, fragileControls, initialWorkflow, recoverPartial, reliableControls, repairMismatch, resumeFromCheckpoint, scenarios, startWorkflow, verifyState, type Control, type Workflow } from '../src/components/infooo/reliability/reliabilityModel.ts';
function drive(state:Workflow,replayPartial=false,repair=true){
  let s=startWorkflow(state);
  for(let i=0;i<60;i++){
    if(s.status==='partial')s=recoverPartial(s,replayPartial);
    else if(s.status==='mismatch'&&repair)s=repairMismatch(s);
    else if(s.status!=='running')return s;
    else s=advanceWorkflow(s);
    assert.ok(Number.isSafeInteger(s.clock)&&s.clock>=0);
    assert.ok(Number.isSafeInteger(s.attempt)&&s.attempt>=0&&s.attempt<=6);
    if(s.status==='verified')assert.equal(verifyState(s).complete,true,'verified completion requires actual state');
  }
  assert.fail('Workflow did not terminate');
}
const happy=drive(initialWorkflow());
assert.equal(happy.status,'verified');assert.equal(happy.actual.replacements.length,1);assert.equal(happy.actual.notifications.length,1);assert.equal(evaluateMission(happy).pass,true);
assert.deepEqual(cleanReference(),happy);
let unknown=startWorkflow(initialWorkflow('timeout',fragileControls()));
while(unknown.response!=='UNKNOWN')unknown=advanceWorkflow(unknown);
assert.equal(unknown.actual.replacements.length,1);assert.equal(unknown.observed.replacementId,null);assert.equal(unknown.response,'UNKNOWN');
const duplicate=drive(unknown);
assert.equal(duplicate.actual.replacements.length,2);assert.equal(duplicate.answer,'DONE');assert.equal(duplicate.status,'claimed');assert.equal(evaluateMission(duplicate).pass,false);
const idempotent=drive(initialWorkflow('timeout',{...fragileControls(),idempotency:true}));
assert.equal(idempotent.actual.replacements.length,1);assert.equal(idempotent.attempt,2);assert.equal(idempotent.actual.notifications.length,1);
assert.ok(idempotent.trace.some(t=>t.returned.includes('same operation receipt')));
assert.equal(applySideEffect({...duplicate,controls:reliableControls()}).actual.replacements.length,2,'enabling a key does not undo old duplicates');
const reconciled=drive(initialWorkflow('timeout',{...fragileControls(),timeoutPolicy:true}));
assert.equal(reconciled.actual.replacements.length,1);assert.equal(reconciled.attempt,1);
assert.ok(reconciled.trace.some(t=>t.tool==='operation_status'));
const bounded=drive(initialWorkflow('retry-loop'));
assert.equal(bounded.attempt,3);assert.equal(bounded.status,'escalated');assert.equal(bounded.actual.replacements.length,0);
assert.deepEqual(bounded.trace.filter(t=>t.tool==='retry').map(t=>t.duration),[500,1000]);
assert.ok(bounded.trace.filter(t=>t.tool==='create_replacement').every(t=>t.status==='FAILED'));
const unbounded=drive(initialWorkflow('retry-loop',fragileControls()));
assert.equal(unbounded.attempt,6);assert.equal(unbounded.status,'review');
assert.equal(advanceWorkflow(unbounded).attempt,6);
assert.equal(escalateWorkflow(unbounded).status,'escalated');
assert.equal(evaluateMission(escalateWorkflow(unbounded)).pass,false,'a manual stop cannot erase the unbounded retry trace');
assert.equal(advanceWorkflow(escalateWorkflow(unbounded)).attempt,6);
const partial=drive(initialWorkflow('partial'));
assert.equal(partial.actual.replacements.length,1);assert.equal(partial.notifyAttempt,2);assert.equal(partial.actual.notifications.length,1);assert.equal(partial.status,'verified');
const badPartial=drive(initialWorkflow('partial',fragileControls()),true);
assert.equal(badPartial.actual.replacements.length,2);assert.equal(evaluateMission(badPartial).pass,false);
const fake=drive(initialWorkflow('false-success',fragileControls()));
assert.equal(fake.actual.replacements.length,0);assert.equal(fake.answer,'DONE');assert.equal(evaluateMission(fake).pass,false);
const mismatch=drive(initialWorkflow('false-success'),false,false);
assert.equal(mismatch.status,'mismatch');assert.equal(mismatch.actual.notifications.length,0);
const repaired=drive(repairMismatch(mismatch));
assert.equal(repaired.status,'verified');assert.equal(repaired.actual.replacements.length,1);assert.equal(repaired.actual.notifications.length,1);
const checkpointNotProof=drive(initialWorkflow('false-success',{...fragileControls(),checkpoints:true}));
assert.ok(checkpointNotProof.checkpoint);assert.equal(checkpointNotProof.actual.replacements.length,0);assert.equal(checkpointNotProof.status,'claimed');
const stale=drive(initialWorkflow('stale'));
assert.equal(stale.status,'stopped');assert.equal(stale.observed.eligible,true);assert.equal(stale.actual.order,'cancelled');assert.equal(stale.actual.replacements.length,0);assert.equal(evaluateMission(stale).safeStop,true);
const badStale=drive(initialWorkflow('stale',fragileControls()));
assert.equal(badStale.actual.replacements.length,1);assert.equal(badStale.policyViolation,true);assert.equal(evaluateMission(badStale).pass,false);
const handoffBad=drive(initialWorkflow('handoff',fragileControls()));assert.equal(handoffBad.actual.replacements.length,2);
for(const control of ['checkpoints','structuredHandoff','idempotency','preconditions'] as Control[]){
  const recovered=drive(initialWorkflow('handoff',{...fragileControls(),[control]:true}));
  assert.equal(recovered.actual.replacements.length,1,control);assert.equal(recovered.actual.notifications.length,1,control);
}
let interrupted=startWorkflow(initialWorkflow('handoff',{...fragileControls(),checkpoints:true}));
while(interrupted.phase!=='handoff')interrupted=advanceWorkflow(interrupted);
const resumed=resumeFromCheckpoint({...interrupted,observed:{...interrupted.observed,replacementId:null}});
assert.equal(resumed.phase,'notify');assert.equal(resumed.observed.replacementId,interrupted.checkpoint!.replacementId);
let rejected=startWorkflow(initialWorkflow());rejected=advanceWorkflow(advanceWorkflow(rejected));
const retried=drive({...rejected,phase:'retry',attempt:1,response:'FAILED'});
assert.equal(retried.actual.replacements.length,1,'a definitely rejected operation can be retried without a prior side effect');
assert.equal(retried.attempt,2);
const controls=Object.keys(reliableControls()).filter(k=>!['trace','traceEval'].includes(k)) as Control[];
for(let mask=0;mask<2**controls.length;mask++)for(const scenario of ['happy',...scenarios.map(s=>s.id)] as const){
  const config=reliableControls();controls.forEach((c,i)=>config[c]=!!(mask&(1<<i)));
  const s=drive(initialWorkflow(scenario,config));
  assert.ok(s.actual.replacements.length<=2);assert.equal(new Set(s.actual.replacements).size,s.actual.replacements.length);
  if(config.boundedRetries)assert.ok(s.attempt<=3);
  if(s.status==='verified')assert.equal(verifyState(s).complete,true);
  if(evaluateMission(s).pass)assert.ok(verifyState(s).complete||evaluateMission(s).safeStop);
}
assert.deepEqual(initialWorkflow(),initialWorkflow());assert.deepEqual(advanceWorkflow(happy),happy);
const source=fs.readFileSync('src/components/infooo/reliability/AgentReliabilityLab.tsx','utf8');
assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if(process.argv.includes('--built')){
  const route='https://khizooology.com/infooo/agent-reliability-lab/';
  const html=fs.readFileSync('dist/infooo/agent-reliability-lab/index.html','utf8');
  assert.ok(html.includes(`rel="canonical" href="${route}"`));assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!/noindex/.test(html));
  for(const key of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image'])assert.ok(html.includes(key),key);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
  assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.url===route));assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));
  assert.ok(html.includes('Successful calls are not the same as successful outcomes.'));
  const maps=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join('');assert.equal(maps.split(`<loc>${route}</loc>`).length-1,1);
  assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route));assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes('agent-reliability-lab/'));
}
console.log('Agent Reliability PASS: happy path, unknown vs rejected outcomes, duplicate/idempotent/reconciled retries, bounded backoff/escalation, partial recovery, false success/repair, stale preconditions, checkpoints/handoffs, trace grading, reset, privacy and 1,792 scenario/control combinations.');
