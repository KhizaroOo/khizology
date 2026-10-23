import assert from 'node:assert/strict';
import fs from 'node:fs';
import { memoryActions, memoryCandidates, memoryDefaults, memoryPresets, memoryProhibitions, memoryQuestions, planAgentMemory, type MemoryOverrides } from '../src/components/toolbox/tools/agentMemoryModel.ts';
import { activeTools, getRelatedTools, getTryNextTools } from '../src/data/tools.ts';
const snapshot = JSON.stringify(memoryPresets);
const personal = planAgentMemory(memoryPresets[0].answers);
assert.ok(personal.scope.includes('Authenticated user'));
assert.equal(personal.rows.find(r => r.id === 'preferences')!.action, 'Remember');
assert.ok(personal.types.find(t => t.name === 'Semantic')!.guidance.includes('preferences'));
const coding = planAgentMemory(memoryPresets[1].answers);
assert.ok(coding.scope.includes('project') && coding.storage.some(s => s.includes('files')));
const support = planAgentMemory(memoryPresets[2].answers);
assert.ok(support.scope.includes('tenant + customer/user'));
assert.ok(support.types.find(t => t.name === 'Shared / organizational')!.guidance.includes('non-customer'));
assert.ok(support.warnings.some(w => w.includes('tenant AND customer')));
const research = planAgentMemory(memoryPresets[3].answers);
assert.ok(research.semanticIndex && research.storage.some(s => s.includes('not the source of truth')));
assert.ok(research.rows.every(r => r.action !== 'Remember'));
assert.ok(research.warnings.some(w => w.includes('Quarantine')));
const multi = planAgentMemory(memoryPresets[4].answers);
assert.ok(multi.scope.includes('agent/task') && multi.shared);
assert.ok(multi.warnings.some(w => w.includes('private per-agent/task')));
const regulated = planAgentMemory(memoryPresets[5].answers);
assert.ok(regulated.warnings.some(w => w.includes('retention/deletion')));
assert.ok(regulated.controls.some(c => c.includes('Accountable confirmation')));
assert.ok(regulated.conflict.includes('confirmation') && regulated.conflict.includes('Supersede only after approval'));
const stateless = planAgentMemory(memoryPresets[6].answers);
assert.equal(stateless.hasDurable, false); assert.equal(stateless.complexity, 'Low');
assert.deepEqual(stateless.storage, ['In-memory session state only']);
assert.ok(stateless.rows.every(r => ['Temporary', 'Do not remember'].includes(r.action)));
assert.ok(stateless.retention.startsWith('Session'));
for (const q of memoryQuestions) for (const o of q.options) {
  const a = { ...memoryDefaults, [q.id]: o.value };
  const result = planAgentMemory(a);
  assert.deepEqual(result, planAgentMemory(a));
  assert.equal(result.rows.length, memoryCandidates.length);
  assert.equal(result.lifecycle.length, 8);
  assert.ok(result.entryFields.some(f => f.includes('scope')));
  assert.ok(result.controls.some(c => c.includes('Write gating')));
  assert.ok(result.controls.some(c => c.includes('never higher-priority instructions')));
  assert.throws(() => planAgentMemory({ ...a, [q.id]: 'not-an-option' }));
}
for (const candidate of memoryCandidates) for (const action of memoryActions) {
  const override = { [candidate.id]: action } as MemoryOverrides;
  const r = planAgentMemory(memoryDefaults, override);
  assert.deepEqual(r, planAgentMemory(memoryDefaults, override));
  const noMemory = planAgentMemory({ ...memoryDefaults, crossSession: 'no' }, override);
  assert.ok(!noMemory.hasDurable && !noMemory.semanticIndex && !noMemory.shared);
  assert.ok(noMemory.rows.every(row => !['Remember', 'Context required'].includes(row.action)));
  if (action === 'Remember') assert.ok(noMemory.warnings.some(w => w.includes('durable capture was requested')));
}
const none = Object.fromEntries(memoryCandidates.map(c => [c.id, 'Do not remember'])) as MemoryOverrides;
const noCandidates = planAgentMemory(memoryDefaults, none);
assert.equal(noCandidates.hasDurable, false); assert.equal(noCandidates.shared, false); assert.ok(noCandidates.retention.startsWith('Session'));
assert.equal(planAgentMemory({ ...memoryDefaults, retention: 'session' }).hasDurable, false);
for (const sensitivity of ['personal', 'confidential', 'high']) {
  const r = planAgentMemory({ ...memoryDefaults, sensitivity, retention: 'indefinite' });
  assert.ok(r.retention.startsWith('Bounded expiry'));
  assert.ok(r.warnings.some(w => w.includes('Indefinite')));
}
const changing = planAgentMemory({ ...memoryDefaults, changeRate: 'frequent', retention: 'indefinite', risk: 'low' });
assert.ok(changing.retention.startsWith('Bounded expiry'));
assert.ok(changing.conflict.includes('recency alone is not truth'));
assert.ok(changing.decay.includes('Do not decay legal/system-of-record'));
assert.ok(changing.decay.includes('indexes/caches') && changing.decay.includes('backup'));
assert.ok(memoryProhibitions.find(([s]) => s.includes('API keys'))?.[1] === 'Do not remember');
assert.ok(memoryProhibitions.find(([s]) => s.includes('Raw external'))?.[1] === 'Do not remember');
assert.throws(() => planAgentMemory(memoryDefaults, { secrets: 'Remember' } as MemoryOverrides));
assert.throws(() => planAgentMemory(memoryDefaults, { preferences: 'invalid' } as unknown as MemoryOverrides));
assert.equal(JSON.stringify(memoryPresets), snapshot);
for (const file of ['agentMemoryModel.ts', 'AgentMemoryPlanner.tsx']) {
  const source = fs.readFileSync(`src/components/toolbox/tools/${file}`, 'utf8');
  assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|setInterval|dangerouslySetInnerHTML/.test(source), file);
}
const ui = fs.readFileSync('src/components/toolbox/tools/AgentMemoryPlanner.tsx', 'utf8');
assert.equal((ui.match(/trackToolResult\(\)/g) ?? []).length, 1);
const tool = activeTools.find(t => t.id === 'agent-memory-architecture-planner')!;
assert.ok(tool && tool.family === 'plan' && tool.privacySensitive);
assert.ok(getRelatedTools(tool).length && getTryNextTools(tool).length);
for (const target of [...tool.relatedToolIds!, ...tool.nextToolIds!]) assert.ok(activeTools.some(t => t.id === target));
assert.equal(new Set(activeTools.map(t => t.slug)).size, activeTools.length);
console.log(`Agent memory PASS: seven presets, all input options, 36 capture overrides, no-persistence gates, tenant/agent scope, provenance, poisoning, conflict, retention, deletion and deterministic planning. ${activeTools.length} active; ${activeTools.filter(t => t.family === 'plan').length} Plan.`);
