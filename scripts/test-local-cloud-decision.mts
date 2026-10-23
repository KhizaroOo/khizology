import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decideDeployment, deploymentDefaults, deploymentPresets, deploymentQuestions, type DeploymentAnswers } from '../src/components/toolbox/tools/localCloudDecisionModel.ts';
import { activeTools, getRelatedTools, getTryNextTools } from '../src/data/tools.ts';
const fit = (a: DeploymentAnswers, name: string) => decideDeployment(a).ranked.find(r => r.name === name)!.score;
const snapshot = JSON.stringify(deploymentPresets);
const expected = ['Local', 'Cloud', 'Local', 'Hybrid', 'Cloud', 'Hybrid', 'Cloud'];
deploymentPresets.forEach((p, i) => assert.equal(decideDeployment(p.answers).winner?.name, expected[i], p.name));
for (const q of deploymentQuestions) for (const o of q.options) {
  const a = { ...deploymentDefaults, [q.id]: o.value };
  const r = decideDeployment(a);
  assert.deepEqual(r, decideDeployment(a));
  assert.equal(r.ranked.length, 3);
  for (const row of r.ranked) {
    assert.equal(row.raw, row.signals.reduce((n, s) => n + s.points, 0));
    assert.equal(row.score, Math.max(5, Math.min(95, Math.round(50 + row.raw / 2))));
    assert.ok(Number.isFinite(row.score) && row.score >= 0 && row.score <= 100);
    assert.equal(row.signals.length, deploymentQuestions.length + (a.cost === 'high' ? 1 : 0));
  }
  assert.ok(!r.winner?.blocked.length);
  assert.throws(() => decideDeployment({ ...deploymentDefaults, [q.id]: 'invalid' }));
}
assert.equal(JSON.stringify(deploymentPresets), snapshot);
const offline = deploymentPresets[2].answers;
assert.equal(decideDeployment(offline).winner?.name, 'Local');
assert.ok(decideDeployment(offline).ranked.find(r => r.name === 'Hybrid')!.blocked.length);
assert.equal(decideDeployment({ ...offline, fallback: 'yes' }).ranked.find(r => r.name === 'Hybrid')!.blocked.length, 0);
assert.ok(decideDeployment({ ...offline, fallback: 'yes' }).useCloud.startsWith('None'));
for (const hardware of ['cpu', 'integrated', 'gpu', 'workstation', 'server', 'unknown']) for (const capability of ['simple', 'moderate', 'strong', 'frontier']) for (const fallback of ['no', 'yes']) {
  const r = decideDeployment({ ...offline, hardware, capability, fallback });
  assert.notEqual(r.winner?.name, 'Cloud');
  if (r.winner?.name === 'Hybrid') { assert.equal(fallback, 'yes'); assert.ok(r.useCloud.includes('Optional online')); }
  const restricted = decideDeployment({ ...deploymentDefaults, hardware, capability, fallback, residency: 'onprem' });
  assert.ok(!restricted.winner || restricted.winner.name === 'Local');
  assert.ok(restricted.ranked.filter(x => x.name !== 'Local').every(x => x.blocked.length));
}
const conflict = decideDeployment({ ...offline, hardware: 'cpu', capability: 'frontier' });
assert.equal(conflict.winner, undefined); assert.ok(conflict.conflict); assert.ok(conflict.warnings.some(w => w.includes('Requirements conflict')));
const base = { ...deploymentDefaults, hardware: 'gpu', maintenance: 'moderate', capability: 'moderate', scale: 'team' };
assert.ok(fit({ ...base, hardware: 'cpu' }, 'Local') < fit(base, 'Local'));
assert.ok(fit({ ...base, capability: 'frontier' }, 'Cloud') > fit(base, 'Cloud'));
assert.ok(fit({ ...base, sensitivity: 'sensitive' }, 'Local') > fit(base, 'Local'));
assert.ok(fit({ ...base, sensitivity: 'sensitive' }, 'Hybrid') > fit(base, 'Hybrid'));
assert.ok(fit({ ...base, frequency: 'high', cost: 'high' }, 'Local') > fit({ ...base, frequency: 'occasional', cost: 'high' }, 'Local'));
assert.ok(fit({ ...base, maintenance: 'minimal' }, 'Cloud') > fit(base, 'Cloud'));
assert.ok(fit({ ...base, maintenance: 'minimal' }, 'Hybrid') < fit(base, 'Hybrid'));
const hybrid = decideDeployment(deploymentPresets[5].answers);
assert.equal(hybrid.winner?.name, 'Hybrid');
assert.ok(hybrid.keepLocal.includes('documents') && hybrid.useCloud.includes('never automatic sensitive-data'));
assert.ok(hybrid.warnings.some(w => w.includes('region')));
for (const file of ['localCloudDecisionModel.ts', 'LocalCloudDecisionLab.tsx']) {
  const source = fs.readFileSync(`src/components/toolbox/tools/${file}`, 'utf8');
  assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|setInterval|dangerouslySetInnerHTML/.test(source), file);
}
const ui = fs.readFileSync('src/components/toolbox/tools/LocalCloudDecisionLab.tsx', 'utf8');
assert.equal((ui.match(/trackToolResult\(\)/g) ?? []).length, 1);
const tool = activeTools.find(t => t.id === 'local-ai-vs-cloud-ai-decision-lab')!;
assert.ok(tool && tool.family === 'decide' && tool.privacySensitive);
assert.ok(getRelatedTools(tool).length && getTryNextTools(tool).length);
for (const target of [...tool.relatedToolIds!, ...tool.nextToolIds!]) assert.ok(activeTools.some(t => t.id === target));
assert.equal(new Set(activeTools.map(t => t.slug)).size, activeTools.length);
console.log(`Local/cloud PASS: seven presets, every input option, 48 offline/residency combinations, scoring direction, contradictions, deterministic weights, routing and privacy. ${activeTools.length} active; ${activeTools.filter(t => t.family === 'decide').length} Decide.`);
