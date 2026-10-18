import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advanceDeployment, startDeployment, deploymentStages, deploymentFailures, deploymentGuide, requestStages } from '../src/components/infooo/deployment/deploymentJourney.ts';
import { strategyFrames, rolloutStart, rolloutNext, rolloutBack, environments, environmentFields, trafficModel, telemetry, migrationFrames, cacheJourney, queueEvent, initialQueue, configResult, artifactVersions, challenges, replayChallenge, finaleFrames, type Strategy } from '../src/components/infooo/deployment/productionSystems.ts';

function release(scenario: Parameters<typeof startDeployment>[0]) {
  let state = startDeployment(scenario);
  for (let i = 0; i < deploymentStages.length && state.status === 'running'; i++) {
    state = advanceDeployment(state);
    if (state.status !== 'live') assert.equal(state.production, 1, 'candidate cannot receive production traffic before readiness');
  }
  return state;
}
assert.equal(release('none').status, 'live');
assert.equal(release('none').production, 2);
for (const failure of deploymentFailures) {
  const state = release(failure.id);
  assert.equal(state.status, 'failed', failure.id);
  assert.equal(deploymentStages[state.cursor].id, failure.at, failure.id);
  assert.equal(state.production, 1, `${failure.id}: previous release preserved`);
  assert.deepEqual(advanceDeployment(state), state, 'failed pipeline cannot progress');
}
assert.deepEqual(advanceDeployment(release('none')), release('none'), 'live deployment cannot run past the release');
assert.equal(deploymentFailures.length, 7);
assert.equal(new Set(deploymentStages.map(s => s.id)).size, deploymentStages.length);
for (const step of deploymentGuide.steps) {
  assert.ok(typeof step !== 'string' && deploymentStages.some(s => s.id === step.targetId));
}
assert.ok(deploymentStages.findIndex(s => s.id === 'environment') < deploymentStages.findIndex(s => s.id === 'runtime'), 'configure runtime before starting');
assert.ok(deploymentStages.findIndex(s => s.id === 'health') < deploymentStages.findIndex(s => s.id === 'live'), 'readiness before promotion');
assert.equal(requestStages[0], 'Browser');
assert.equal(requestStages.at(-1), 'Browser renders');
for (const strategy of Object.keys(strategyFrames) as Strategy[]) {
  let state = rolloutStart(strategy);
  while (state.status === 'running') state = rolloutNext(state);
  assert.equal(state.status, 'complete', strategy);
  assert.equal(strategyFrames[strategy][state.step].v2Traffic, 100);
  const failed = rolloutNext(rolloutStart(strategy), true);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(rolloutNext(failed), failed, 'fault blocks promotion');
  assert.equal(rolloutBack(failed).step, 0);
  assert.equal(strategyFrames[strategy][rolloutBack(failed).step].v2Traffic, 0);
}
assert.ok(strategyFrames.recreate.some(f => !f.available), 'recreate demonstrates downtime');
assert.equal(strategyFrames['blue-green'][1].v2Traffic, 0, 'prepare green before switching');
assert.equal(strategyFrames.canary[1].v2Traffic, 10);
assert.deepEqual(strategyFrames.rolling.map(f => f.instances.filter(v => v === 'v2').length), [0, 1, 2, 3]);
for (const values of Object.values(environments)) assert.equal(values.length, environmentFields.length);
assert.notDeepEqual(environments.Local, environments.Production);
const single = trafficModel(10000, false, false, false);
const unrouted = trafficModel(10000, false, true, true);
const balanced = trafficModel(10000, true, true, false);
const scaled = trafficModel(10000, true, true, true);
assert.equal(unrouted.active, 1, 'extra instances without traffic routing do not help');
assert.equal(unrouted.latency, single.latency);
assert.ok(balanced.latency < single.latency && scaled.latency < balanced.latency);
assert.equal(scaled.errors, 0);
assert.ok(scaled.active <= 8);
assert.ok(telemetry(true).latency > telemetry(false).latency);
assert.equal(telemetry(true).spans.find(s => s.label === 'Database')?.ms, 900);
assert.match(telemetry(true).health, /passes/, 'readiness can pass despite slow requests');
assert.ok(migrationFrames.safe.every(f => f.good));
assert.equal(migrationFrames.missing.at(-1)?.good, false);
assert.equal(migrationFrames.destructive.at(-1)?.good, false);
assert.ok(!cacheJourney('hit').labels.includes('Application'), 'hit bypasses origin');
for (const mode of ['off', 'miss', 'expired'] as const) assert.ok(cacheJourney(mode).labels.includes('Application'));
assert.ok(cacheJourney('expired').descriptions.some(d => /TTL expired/.test(d)));
let queue = queueEvent(initialQueue, 'crash');
for (let i = 0; i < 3; i++) queue = queueEvent(queue, 'upload');
assert.equal(queue.waiting, 3);
assert.deepEqual(queueEvent(queue, 'tick'), queue, 'unavailable worker cannot drain queue');
queue = queueEvent(queue, 'resume');
for (let i = 0; i < 3; i++) queue = queueEvent(queue, 'tick');
assert.equal(queue.waiting, 0); assert.equal(queue.done, 3);
assert.equal(configResult('none').good, true);
assert.equal(configResult('missing').good, false);
assert.equal(configResult('committed').good, false);
assert.notEqual(artifactVersions.v1.commit, artifactVersions.v2.commit);
assert.notEqual(artifactVersions.v1.digest as string, artifactVersions.v2.digest as string);
for (const [index, challenge] of challenges.entries()) {
  challenge.choices.forEach((_, answer) => assert.equal(replayChallenge(index, answer).good, answer === challenge.answer, challenge.id));
}
assert.equal(finaleFrames[2].v2, 10);
assert.equal(finaleFrames[3].slow, true);
assert.equal(finaleFrames.at(-1)?.v2, 0);
assert.equal(finaleFrames.at(-1)?.slow, false);
assert.equal(finaleFrames.at(-1)?.users, 10000, 'stabilization is not achieved by silently removing demand');
const html = fs.readFileSync(new URL('../dist/infooo/app-deployment-journey/index.html', import.meta.url), 'utf8');
assert.match(html, /<h1[^>]*>How does code become a live app\?<\/h1>/);
assert.match(html, /https:\/\/khizooology.com\/infooo\/app-deployment-journey\//);
assert.match(html, /deployment-social\.png/);
assert.match(html, /class="release-scene" role="img"/);
for (const label of ['Code', 'Build', 'Deploy', 'Serve', 'User']) assert.match(html, new RegExp(`<strong>${label}</strong>`));
assert.match(html, />Play<\/button>/);
assert.ok(!html.includes('id="deployment-depth"'), 'depth remains unavailable before completion');
assert.match(html, /WebApplication/);
assert.match(html, /BreadcrumbList/);
assert.ok(fs.readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8').includes('/infooo/app-deployment-journey/'));
assert.ok(fs.readFileSync(new URL('../dist/llms.txt', import.meta.url), 'utf8').includes('/infooo/app-deployment-journey/'));
const hub = fs.readFileSync(new URL('../dist/infooo/index.html', import.meta.url), 'utf8');
assert.match(hub, /href="[^\"]*\/infooo\/app-deployment-journey\/"[^>]*data-world-category="software-systems"/);
const component = fs.readFileSync(new URL('../src/components/infooo/deployment/AppDeploymentJourney.tsx', import.meta.url), 'utf8');
assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(component), 'simulation has no storage or infrastructure transport');
const lab = fs.readFileSync(new URL('../src/components/infooo/deployment/ProductionSystemsLab.tsx', import.meta.url), 'utf8');
assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(lab), 'Level 2 has no persistence or runtime APIs');
console.log('Deployment journey passed: original seven faults and gates; four strategies/rollback, four environments, telemetry, load routing/scaling, three migrations, cache hit/miss/TTL, queue recovery, secrets, provenance, all seven challenges and combined finale.');
