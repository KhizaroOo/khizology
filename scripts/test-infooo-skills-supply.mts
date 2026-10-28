import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advance, approveAction, baseline, broad, candidate, compareVersions, controlNames, fingerprint, finish, gate, initial, integrity, knownPublisher, reachability, reviewUpdate, scenarios, start, type Control } from '../src/components/infooo/skills-supply/skillsSupplyModel.ts';

const safe = finish(start(initial(),'install'));
assert.equal(safe.status,'done'); assert.equal(safe.report,true); assert.equal(safe.outbound,false);
assert.deepEqual(safe.installed,baseline());
assert.ok(reachability({...safe,controls:broad(),network:true}).length>reachability(safe).length,'environment reach depends on granted access, not a skill’s modest permission request');
const pinned = finish(start(safe,'update'));
assert.equal(pinned.status,'blocked'); assert.deepEqual(pinned.installed,safe.installed);
const exposed = {...initial(true),controls:broad(),network:true};
const updated = finish(start(exposed,'update'));
assert.equal(updated.installed?.version,'2.0.0'); assert.equal(updated.outbound,true);
assert.ok(reachability(updated).length>reachability(safe).length);
for(const scenario of scenarios){
  const weak = finish(start({...exposed,scenario:scenario.id},'update'));
  assert.equal(weak.status,'done',scenario.id); assert.equal(weak.outbound,true,scenario.id);
  const protectedRun = finish(start({...initial(true),scenario:scenario.id},'update'));
  assert.equal(protectedRun.status,'blocked',scenario.id); assert.deepEqual(protectedRun.installed,baseline());
  const denied = finish(start({...exposed,scenario:scenario.id,controls:{...broad(),denyNetwork:true}},'update'));
  assert.equal(denied.outbound,false); assert.equal(denied.report,true);
  const sandbox = finish(start({...exposed,scenario:scenario.id,controls:{...broad(),sandbox:true}},'update'));
  assert.equal(sandbox.outbound,false); assert.ok(reachability(sandbox).length<reachability(weak).length);
}
const review = finish(start({...exposed,controls:{...broad(),review:true}},'update'));
assert.equal(review.status,'review'); assert.deepEqual(review.installed,baseline());
assert.equal(reviewUpdate(review,false).status,'denied');
assert.deepEqual(reviewUpdate(review,false).installed,baseline());
const accepted = finish(reviewUpdate(review,true)); assert.equal(accepted.outbound,true,'review can mistakenly approve risky content');
assert.equal(accepted.installed?.reviewed,true);
const dep = {...exposed,scenario:'dependency' as const,controls:{...broad(),pin:true}};
assert.equal(candidate(dep).digest,dep.installed!.digest);
assert.equal(candidate(dep).version,dep.installed!.version);
const depChanged = finish(start(dep,'update'));
assert.equal(depChanged.installed?.helper,'2.0 (floating resolution)'); assert.equal(depChanged.outbound,true,'top-level pin alone cannot pin a floating dependency');
assert.equal(finish(start({...dep,controls:{...dep.controls,integrity:true}},'update')).status,'blocked');
assert.equal(finish(start({...dep,controls:{...dep.controls,review:true}},'update')).status,'review');
assert.equal(compareVersions(baseline(),candidate(dep))[0].after.includes('UNCHANGED'),true);
const wrong = candidate({...exposed,scenario:'lookalike'});
assert.equal(knownPublisher(wrong),false); assert.equal(wrong.reviewed,false);
assert.equal(finish(start({...exposed,scenario:'lookalike',controls:{...broad(),publisher:true}},'update')).status,'blocked');
assert.equal(finish(start({...exposed,scenario:'lookalike',intended:true},'update')).outbound,false);
assert.equal(integrity(candidate({...exposed,scenario:'publisher'})),true,'integrity can match a malicious release');
assert.equal(finish(start({...exposed,scenario:'publisher',controls:{...broad(),publisher:true,integrity:true}},'update')).outbound,true,'identity and matching content are not a safety proof');
assert.equal(integrity(candidate({...exposed,scenario:'script'})),false);
assert.equal(finish(start({...exposed,scenario:'script',controls:{...broad(),integrity:true}},'update')).status,'blocked');
for(const authorization of [{revoked:true},{approvedForUse:false}]){
  const s = finish(start({...updated,...authorization},'run'));
  assert.equal(s.status,'blocked'); assert.equal(s.report,false); assert.equal(s.outbound,false);
  assert.deepEqual(s.installed,updated.installed);
}
const awaiting = finish(start({...exposed,controls:{...broad(),approval:true}},'update'));
assert.equal(awaiting.status,'approval'); assert.equal(awaiting.report,true); assert.equal(awaiting.outbound,false);
assert.equal(approveAction(awaiting,false).outbound,false);
assert.equal(approveAction(awaiting,true).outbound,true);
assert.equal(approveAction({...awaiting,revoked:true},true).outbound,false,'revocation rechecked before action');
assert.equal(approveAction({...awaiting,network:false},true).outbound,false,'network policy rechecked after approval');
const a = finish(start({...updated,controls:broad(),network:true},'run'));
const b = finish(start({...updated,controls:{...broad(),sandbox:true,files:true,shell:true,denyNetwork:true,approval:true},network:false},'run'));
assert.deepEqual(a.installed,b.installed); assert.equal(a.outbound,true); assert.equal(b.outbound,false);
assert.equal(finish(start({...exposed,controls:{...broad(),files:true,shell:true}},'update')).outbound,true,'file/shell scope alone is not a network control');
assert.equal(finish(start({...exposed,controls:{...broad(),audit:true}},'update')).outbound,true,'audit is observation, not prevention');
let combinations = 0; const keys=Object.keys(controlNames) as Control[];
for(let mask=0;mask<2**keys.length;mask++) for(const scenario of scenarios){
  const controls=broad();keys.forEach((k,i)=>controls[k]=!!(mask&(1<<i)));
  const s=finish(start({...exposed,scenario:scenario.id,controls},'update'));combinations++;
  assert.ok(s.step<=6); assert.equal(exposed.installed!.version,'1.0.0');
  if(['blocked','review'].includes(s.status)&&s.step===4)assert.deepEqual(s.installed,baseline(),'failed adoption retains prior snapshot');
  if(controls.denyNetwork||controls.sandbox)assert.equal(s.outbound,false);
  if(s.outbound){assert.equal(s.status,'done');assert.equal(controls.approval,false);assert.equal(s.report,true);}
  if(controls.pin&&candidate({...exposed,scenario:scenario.id}).version!=='1.0.0')assert.equal(s.installed?.version,'1.0.0');
}
assert.deepEqual(initial(),initial()); assert.deepEqual(advance(safe),safe);
assert.equal(gate({...exposed,revoked:true},baseline()).includes('revoked'),true);
assert.equal(fingerprint(baseline()),fingerprint(baseline()));
const source=fs.readFileSync('src/components/infooo/skills-supply/SkillsSupplyLab.tsx','utf8');
assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if(process.argv.includes('--built')){
  const route='https://khizooology.com/infooo/agent-skills-supply-chain/';
  const html=fs.readFileSync('dist/infooo/agent-skills-supply-chain/index.html','utf8');
  assert.ok(html.includes(`rel="canonical" href="${route}"`)); assert.equal((html.match(/<h1\b/g)||[]).length,1); assert.ok(!html.includes('noindex'));
  for(const key of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image'])assert.ok(html.includes(key),key);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
  assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.url===route)); assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));
  assert.ok(html.includes('A skill can bring more than instructions.'));
  const maps=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join(''); assert.equal(maps.split(`<loc>${route}</loc>`).length-1,1);
  assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route)); assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes('agent-skills-supply-chain/'));
}
console.log(`Skills supply PASS: safe install/run, six scenarios, exact review, pin/dependency distinction, atomic updates, revocation, provenance/integrity distinction, scoped execution, informed approval, same-version comparison, reset/privacy; ${combinations} control/scenario combinations.`);
