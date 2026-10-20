import assert from 'node:assert/strict';
import fs from 'node:fs';
import { architectureDefaults, architecturePresets, architectureQuestions, decideArchitecture } from '../src/components/toolbox/tools/workflowDecisionModel.ts';
const decide = decideArchitecture, score = (a: Record<string, string>, name: string) => decide(a).ranked.find(r => r.name === name)!;
assert.equal(decide(architecturePresets['Data Validation']).recommendation, 'Deterministic Code');
assert.equal(decide(architecturePresets['Invoice Approval']).recommendation, 'Workflow / DAG');
assert.equal(decide(architecturePresets['Research Assistant']).recommendation, 'Agent + Tools');
assert.equal(decide({ ...architecturePresets['Research Assistant'], tools: 'none' }).recommendation, 'Single Agent');
assert.equal(decide(architecturePresets['Coding Assistant']).recommendation, 'Agent + Tools');
assert.equal(decide(architecturePresets['Compliance Approval Process']).recommendation, 'Workflow + bounded agent step');
const due = architecturePresets['Multi-Discipline Due Diligence'];
assert.equal(decide(due).recommendation, 'Multi-Agent');
assert.ok(decide(due).pattern);
assert.ok(score(architecturePresets['Company Research Across 20 Firms'], 'Multi-Agent').score >= score(architecturePresets['Company Research Across 20 Firms'], 'Agent + Tools').score - 6);
for (const changes of ([{ scale: 'small' }, { state: 'heavy' }, { parallel: 'no' }, { specialization: 'no' }] as Record<string,string>[])) {
    const altered = { ...due, ...changes };
    assert.ok(score(altered, 'Multi-Agent').blocked.length);
    assert.notEqual(decide(altered).winner?.name, 'Multi-Agent');
    assert.ok(score(altered, 'Multi-Agent').score < score(due, 'Multi-Agent').score);
}
assert.ok(score({ ...due, cost: 'high' }, 'Multi-Agent').score < score(due, 'Multi-Agent').score);
assert.notEqual(decide({ ...due, cost: 'high' }).winner?.name, 'Multi-Agent');
assert.ok(score({ ...due, latency: 'high' }, 'Multi-Agent').score < score(due, 'Multi-Agent').score);
assert.equal(decide({ ...architectureDefaults, risk: 'critical', verification: 'none' }).recommendation, 'Deterministic Code');
const conflict = decide({ ...due, exact: 'yes' });
assert.equal(conflict.winner, undefined);
assert.ok(conflict.warnings.length);
const unverified = decide({ ...due, verification: 'none' });
assert.equal(unverified.winner, undefined);
assert.ok(unverified.warnings.some(w => w.includes('verification')));
for (const preset of Object.values(architecturePresets)) {
    assert.deepEqual(decide(preset), decide(preset));
    for (const r of decide(preset).ranked) {
        assert.ok(Number.isFinite(r.score) && r.score >= 0 && r.score <= 100);
        assert.equal(r.signals.length, architectureQuestions.length);
        assert.equal(r.score, Math.max(0, Math.min(100, Math.round(25 + r.raw / 2))));
    }
    const w = decide(preset).winner;
    if (w)
        assert.equal(w.blocked.length, 0);
}
assert.throws(() => decide({}), /supported answer/);
assert.throws(() => decide({ ...architectureDefaults, risk: 'private raw value' }), /supported answer/);
const raw = 'synthetic-private-task-marker';
assert.ok(!JSON.stringify(decide({ ...architectureDefaults, description: raw })).includes(raw));
const source = fs.readFileSync('src/components/toolbox/tools/WorkflowAgentDecisionLab.tsx', 'utf8') + fs.readFileSync('src/components/toolbox/tools/workflowDecisionModel.ts', 'utf8');
assert.ok(!/fetch\(|localStorage|sessionStorage|URLSearchParams|sendBeacon|setInterval/.test(source));
assert.equal((source.match(/trackToolResult\(\)/g) ?? []).length, 1);
console.log('Workflow decision PASS: seven presets, single agent, pure/hybrid workflow, exactness/risk conflicts, multi-agent penalties, cost sensitivity, repeatability, bounded scores and privacy.');
