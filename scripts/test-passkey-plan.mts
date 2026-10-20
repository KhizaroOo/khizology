import assert from 'node:assert/strict';
import fs from 'node:fs';
import { passkeyDefaults, passkeyPresets, clonePasskey, planPasskeys, passkeyEvidence, type EvidenceKey } from '../src/components/toolbox/tools/passkeyPlanModel.ts';
const consumer = planPasskeys(passkeyDefaults);
assert.equal(consumer.readiness, 'Not Ready');
assert.ok(consumer.policy.includes('KEEP'));
assert.equal(consumer.phases.length, 7);
const mature = clonePasskey(passkeyPresets['Mature Passkey Deployment']);
assert.equal(planPasskeys(mature).policy, 'CANDIDATE FOR PASSWORD REMOVAL');
assert.ok(planPasskeys(mature).readiness.startsWith('Mature'));
for (const key of (Object.keys(passkeyEvidence) as EvidenceKey[]).filter(k => k !== 'shared')) {
    const altered = clonePasskey(mature);
    altered.evidence[key] = false;
    assert.notEqual(planPasskeys(altered).policy, 'CANDIDATE FOR PASSWORD REMOVAL', key);
}
for (const recovery of ['password', 'email', 'sms', 'unknown']) {
    const weak = clonePasskey(mature);
    weak.answers.recovery = recovery;
    assert.equal(planPasskeys(weak).readiness, 'Not Ready');
}
const enterprise = planPasskeys(passkeyPresets['Enterprise Workforce']);
assert.equal(enterprise.readiness, 'Pilot Ready');
assert.ok(enterprise.recoveryPaths.some(s => s.includes('Employee replacement')));
const shared = planPasskeys(passkeyPresets['Shared Workstations']);
assert.equal(shared.readiness, 'Not Ready');
assert.equal(shared.suggested, 'hardware');
assert.ok(shared.warnings.some(s => s.includes('Shared devices')));
const testedShared = clonePasskey(passkeyPresets['Shared Workstations']);
testedShared.evidence.shared = true;
assert.equal(planPasskeys(testedShared).readiness, 'Pilot Ready');
const admin = planPasskeys(passkeyPresets['Privileged Admins']);
assert.equal(admin.suggested, 'hardware');
assert.ok(admin.warnings.some(s => s.includes('Preserve existing FIDO')));
assert.equal(admin.fallbacks.find(f => f.id === 'password')?.inPlan, false);
assert.ok(consumer.fallbacks.find(f => f.id === 'password')?.inPlan);
assert.ok(consumer.fallbacks.find(f => f.id === 'sms')?.inPlan);
assert.equal(planPasskeys(mature).fallbacks.find(f => f.id === 'fido')?.inPlan, false);
assert.ok(planPasskeys(mature).fallbacks.find(f => f.id === 'backup')?.inPlan);
assert.ok(consumer.recoveryPaths.some(s => s.includes('Lost device')));
assert.ok(consumer.recoveryPaths.some(s => s.includes('platform switch')));
assert.ok(consumer.recoveryPaths.some(s => s.includes('locked provider')));
assert.ok(consumer.recoveryPaths.some(s => s.includes('Compromised')));
const early = clonePasskey(mature);
early.answers.stage = 'none';
early.answers.rollout = 'aggressive';
assert.notEqual(planPasskeys(early).policy, 'CANDIDATE FOR PASSWORD REMOVAL');
assert.ok(planPasskeys(early).warnings.some(s => s.includes('premature')));
const keep = clonePasskey(mature);
keep.answers.goal = 'keep';
assert.notEqual(planPasskeys(keep).policy, 'CANDIDATE FOR PASSWORD REMOVAL');
assert.ok(planPasskeys(keep).warnings.some(s => s.includes('Permanent')));
const rollout = clonePasskey(mature);
rollout.answers.stage = 'available';
assert.equal(planPasskeys(rollout).readiness, 'Rollout Ready');
assert.notEqual(planPasskeys(rollout).policy, 'CANDIDATE FOR PASSWORD REMOVAL');
const reduce = clonePasskey(mature);
reduce.answers.goal = 'reduce';
assert.equal(planPasskeys(reduce).policy, 'RESTRICT PASSWORD FALLBACK');
for (const p of Object.values(passkeyPresets)) {
    const before = JSON.stringify(p);
    const plan = planPasskeys(p);
    assert.deepEqual(planPasskeys(p), plan);
    assert.equal(JSON.stringify(p), before);
    for (const phase of plan.phases) {
        for (const key of ['title', 'objective', 'users', 'prerequisite', 'gate', 'rollback', 'concern', 'status'] as const)
            assert.ok(phase[key]);
        assert.ok(phase.actions.length >= 3);
    }
    for (const row of plan.fallbacks)
        assert.ok(row.level && row.phishing && row.usability && row.recovery && row.weakness);
}
const cloned = clonePasskey(passkeyDefaults);
cloned.evidence.compatibility = true;
assert.equal(passkeyDefaults.evidence.compatibility, false);
const invalid = clonePasskey(mature);
invalid.answers.risk = 'secret-private-input';
assert.throws(() => planPasskeys(invalid), /supported authentication/);
for (const value of ['101', '-1', 'NaN', '1e2', 'private-input']) {
    const bad = clonePasskey(mature);
    bad.targets.login = value;
    assert.throws(() => planPasskeys(bad), /percentage targets/);
}
const targets = clonePasskey(mature);
targets.targets = { login: '99.5', recovery: '98', fallback: '0' };
assert.equal(planPasskeys(targets).targets.login, '99.5');
const badLegacy = clonePasskey(mature);
badLegacy.legacy = ['constructor' as any];
assert.throws(() => planPasskeys(badLegacy), /legacy constraints/);
const source = fs.readFileSync('src/components/toolbox/tools/PasskeyMigrationPlanner.tsx', 'utf8') + fs.readFileSync('src/components/toolbox/tools/passkeyPlanModel.ts', 'utf8');
assert.ok(!/fetch\(|navigator\.credentials|PublicKeyCredential|localStorage|sessionStorage|URLSearchParams|sendBeacon|setInterval/.test(source));
assert.equal((source.match(/trackToolResult\(\)/g) ?? []).length, 1);
console.log('Passkey planner PASS: six presets, seven complete phases, every removal gate, weak recovery, FIDO preservation, shared devices, loss/provider recovery, rollout states, targets, repeatability and local-only privacy.');
