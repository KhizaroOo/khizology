import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initial, cases, sourceIds, evidenceFor, availableEvidence, reveal, preserve, discardSession, attribution, findings, timeline, blastRadius, canContinue, contain, unrelatedAgents, subsequentAction, verifyAuthority, verifyState, restore, monitor, recovered, recommendedContainment, replayIncident, controlNames, applyControl, type Room, type Controls } from '../src/components/infooo/incident-room/incidentModel.ts';

function investigate(s: Room) { return sourceIds.reduce((next, id) => reveal(next, id), s); }
for (let i = 0; i < cases.length; i++) {
 const base = initial(i), s = investigate(base), before = JSON.stringify(s);
 assert.equal(evidenceFor(i).length, 6); assert.equal(new Set(evidenceFor(i).map(e => e.id)).size, 6);
 assert.ok(blastRadius(base).every(r => r.status === 'UNKNOWN'));
 assert.equal(blastRadius(s).find(r => r.name === cases[i].target)!.status, 'TOUCHED');
 assert.equal(blastRadius(s).find(r => r.name === 'Email')!.status, 'UNKNOWN');
 assert.equal(blastRadius(s).find(r => r.name === 'Repository')!.status, 'NOT REACHED');
 assert.ok(timeline(s).every(e => e.known));
 assert.ok(findings(s).some(f => f.truth === 'UNKNOWN'));
 const stopped = contain(preserve(s), recommendedContainment(s));
 assert.equal(canContinue(stopped), false); assert.equal(subsequentAction(stopped).effects, stopped.effects);
 assert.equal(stopped.saved?.length, 6); assert.deepEqual(stopped.saved?.map(e => e.result), evidenceFor(i).map(e => e.result));
 assert.equal(recovered(restore(stopped)), false, 'restart/restore alone is not recovery');
 const scoped = contain(stopped, 'Remove high-risk scope'), verified = verifyState(verifyAuthority(scoped));
 assert.equal(verified.verified.authority, true); assert.equal(verified.verified.state, true);
 const restored = restore(verified); assert.equal(recovered(restored), false, 'must monitor a next action');
 const done = monitor(restored); assert.equal(recovered(done), true);
 assert.equal(done.effects, base.effects, 'recovery preserves historical effects');
 assert.deepEqual(done.saved, stopped.saved, 'recovery cannot rewrite the preserved bundle');
 assert.equal(JSON.stringify(s), before, 'functions cannot mutate the original incident');
 const noBundle = restore(verifyState(verifyAuthority(contain(contain(s, recommendedContainment(s)), 'Remove high-risk scope'))));
 assert.equal(noBundle.verified.restored, false, 'restoration requires evidence preservation in this teaching model');
}
const investigated = investigate(initial());
assert.equal(attribution(initial()).truth, 'UNKNOWN'); assert.equal(attribution(investigated).truth, 'OBSERVED');
assert.ok(attribution(investigated).text.includes('verified run/request binding'));
const shared = investigate(initial(2)); assert.equal(attribution(shared).truth, 'UNKNOWN');
assert.ok(unrelatedAgents(contain(shared, 'Revoke credential')).includes('BLOCKED'));
assert.ok(unrelatedAgents(contain(shared, 'Remove high-risk scope')).includes('operational'), 'removing one shared high-risk scope need not revoke unrelated grants');
assert.ok(unrelatedAgents(contain(investigated, 'Revoke dedicated identity')).includes('operational'));
assert.equal(canContinue(contain(shared, 'Revoke dedicated identity')), true, 'cannot revoke a nonexistent dedicated identity');
const misuse = investigate(initial(1));
assert.equal(attribution(misuse).truth, 'OBSERVED'); assert.ok(attribution(misuse).text.includes('operator UNKNOWN'));
for (const action of ['Pause agent', 'Block tool', 'Isolate session', 'Require approval'] as const) assert.equal(canContinue(contain(misuse, action)), true, 'agent-local control cannot stop direct accepted proof reuse');
assert.equal(canContinue(contain(misuse, 'Revoke credential')), false);
const reach = blastRadius(reveal(initial(), 'identity'));
assert.equal(reach.find(r => r.name === 'Report store')!.status, 'REACHABLE');assert.ok(!reach.some(r => r.status === 'TOUCHED'), 'a grant alone is not access evidence');
const injection = investigate(initial(3)); assert.ok(findings(injection).some(f => f.truth === 'INFERRED' && f.text.includes('may have influenced')));
assert.ok(!findings(injection).some(f => f.truth === 'OBSERVED' && /caused|influenced/.test(f.text)));
const lost = discardSession(initial()); assert.ok(!availableEvidence(lost).some(e => e.id === 'trace'));
assert.ok(!availableEvidence(preserve(lost)).some(e => e.id === 'trace'), 'late capture cannot resurrect a lost trace');
assert.ok(availableEvidence(discardSession(preserve(initial()))).some(e => e.id === 'trace'));
const moreEffects = subsequentAction(initial());assert.equal(moreEffects.effects, 2);assert.ok(preserve(moreEffects).saved!.find(e => e.id === 'state')!.detail.includes('preservation: 2'));
const staleCheck = subsequentAction(verifyState(initial()));assert.equal(staleCheck.verified.state, false, 'new effect invalidates old verification');
assert.ok(evidenceFor(4).find(e => e.id === 'tool')!.detail.includes('v2.0')); assert.ok(evidenceFor(4).find(e => e.id === 'tool')!.detail.includes('v1.0'));
assert.equal(initial(5).effects, 2); assert.ok(evidenceFor(5).find(e => e.id === 'audit')!.detail.includes('rollout-1 and rollout-2'));
const weak = initial().controls;
assert.equal(replayIncident(5, { ...weak, idempotency: true }).effects, 1); assert.equal(replayIncident(4, { ...weak, pinning: true }).effects, 0);
assert.equal(replayIncident(3, { ...weak, policy: true }).effects, 0);assert.equal(replayIncident(0, { ...weak, approval: true }).effects, 0);
assert.equal(replayIncident(1, { ...weak, approval: true }).effects, 1, 'local approval cannot prevent direct resource proof misuse');
assert.equal(replayIncident(2, { ...weak, dedicated: true }).effects, 1, 'attribution does not prevent an allowed unwanted action');
for (const key of ['tracing', 'verification', 'sandbox'] as const) assert.equal(replayIncident(0, { ...weak, [key]: true }).effects, 1, 'diagnostic/isolating controls are not fabricated prevention');
let combinations = 0;
const keys = Object.keys(controlNames) as (keyof Controls)[];
for (let mask = 0; mask < 2 ** keys.length; mask++) {
 const controls: Controls = { ...weak }; keys.forEach((key, n) => { controls[key] = !!(mask & 1 << n); });
 for (let i = 0; i < cases.length; i++) { const result = replayIncident(i, controls);assert.ok(Number.isFinite(result.effects));assert.ok(result.effects >= 0 && result.effects <= 2);combinations++; }
}
assert.equal(combinations, 3072);assert.deepEqual(initial(), initial());assert.equal(applyControl(initial(), 'policy').replay!.effects, 0);
const source = fs.readFileSync('src/components/infooo/incident-room/AgentIncidentRoom.tsx', 'utf8');assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if (process.argv.includes('--built')) {
 const route='https://khizooology.com/infooo/agent-incident-response-room/',html=fs.readFileSync('dist/infooo/agent-incident-response-room/index.html','utf8');
 assert.ok(html.includes(`rel="canonical" href="${route}"`));assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!html.includes('noindex'));
 for(const key of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image'])assert.ok(html.includes(key),key);
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.url===route));assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));
 const maps=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join('');assert.equal(maps.split(`<loc>${route}</loc>`).length-1,1);
 assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route));assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes('agent-incident-response-room/'));
}
console.log(`Incident model PASS: six investigations, truth labels, bounded access evidence, attribution, precise/coarse containment, direct proof misuse, preserved/lost evidence, duplicate receipts, skill versions, verified recovery and ${combinations} replay combinations.`);
