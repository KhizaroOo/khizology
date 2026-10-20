export const passkeyQuestions = [
    { id: 'auth', label: 'Current authentication', options: [['password', 'Password only'], ['sms', 'Password + SMS OTP'], ['email', 'Password + Email OTP'], ['totp', 'Password + TOTP'], ['push', 'Password + Push MFA'], ['fido', 'Existing FIDO/security key'], ['mixed', 'Mixed/custom']] },
    { id: 'audience', label: 'Audience', options: [['consumer', 'Consumer'], ['workforce', 'Workforce'], ['admin', 'Admin / privileged'], ['mixed', 'Mixed']] },
    { id: 'risk', label: 'Risk level', options: [['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High'], ['critical', 'Critical']] },
    { id: 'devices', label: 'Device environment', options: [['personal', 'Personal devices'], ['managed', 'Managed devices'], ['shared', 'Shared devices'], ['mixed', 'Mixed']] },
    { id: 'preference', label: 'Passkey type preference', options: [['undecided', 'Help me choose'], ['synced', 'Synced passkeys'], ['bound', 'Device-bound passkeys'], ['hardware', 'Hardware security keys'], ['mixed', 'Mixed']] },
    { id: 'recovery', label: 'Existing recovery', options: [['password', 'Password reset'], ['email', 'Email'], ['sms', 'SMS'], ['desk', 'Help desk'], ['backup', 'Backup authenticator'], ['codes', 'Recovery codes'], ['unknown', 'Unknown/custom']] },
    { id: 'stage', label: 'Current passkey stage', advanced: true, options: [['none', 'Not available yet'], ['pilot', 'Bounded pilot'], ['available', 'Available alongside legacy auth'], ['first', 'Passkey-first, adoption measured']] },
    { id: 'rollout', label: 'Rollout preference', advanced: true, options: [['cautious', 'Cautious'], ['balanced', 'Balanced'], ['aggressive', 'Aggressive — gates still apply']] },
    { id: 'goal', label: 'Password removal goal', advanced: true, options: [['undecided', 'Undecided'], ['keep', 'Keep as permanent fallback'], ['reduce', 'Reduce later'], ['remove', 'Eventually remove']] }
] as const;
export const passkeyEvidence = {
    compatibility: 'Browser, platform, RP/account model and identity-provider compatibility tested',
    recoveryAssurance: 'Recovery strength reviewed against the target authentication risk',
    recoveryTested: 'Lost-device, provider-lockout and compromised-account recovery tested',
    support: 'Support team, escalation and rollback procedures rehearsed',
    baseline: 'Enrollment, login, fallback, abandonment and support baselines recorded',
    fallback: 'Fallback routes reviewed; existing MFA is preserved until replacements are approved',
    legacy: 'Legacy applications and unsupported clients resolved, or absence documented',
    adoption: 'Enrollment, successful sign-in and fallback trends meet owner-defined targets',
    portability: 'New device, cross-platform and independent backup access tested',
    emergency: 'Emergency access and revocation/re-registration tested',
    policy: 'Assurance, user verification and applicable organization/regulatory policy reviewed',
    privileged: 'Privileged access independently reviewed, or non-applicability documented',
    shared: 'Separate users/profiles, session cleanup and shared-device authenticators tested'
} as const;
export const passkeyLegacy = { browsers: 'Old browsers/platforms', apps: 'Legacy applications', shared: 'Shared workstations', idp: 'External identity provider', mobile: 'Native mobile apps', regulated: 'Regulated environment' } as const;
export type EvidenceKey = keyof typeof passkeyEvidence;
export interface PasskeyInput {
    answers: Record<string, string>;
    evidence: Record<EvidenceKey, boolean>;
    legacy: (keyof typeof passkeyLegacy)[];
    targets: {
        login: string;
        recovery: string;
        fallback: string;
    };
}
const emptyEvidence = Object.fromEntries(Object.keys(passkeyEvidence).map(k => [k, false])) as Record<EvidenceKey, boolean>;
export const passkeyDefaults: PasskeyInput = { answers: { auth: 'sms', audience: 'consumer', risk: 'moderate', devices: 'personal', preference: 'undecided', recovery: 'sms', stage: 'none', rollout: 'cautious', goal: 'reduce' }, evidence: emptyEvidence, legacy: [], targets: { login: '', recovery: '', fallback: '' } };
const baseEvidence = { ...emptyEvidence, compatibility: true, recoveryAssurance: true, recoveryTested: true, support: true, baseline: true, fallback: true, legacy: true, policy: true };
export const passkeyPresets: Record<string, PasskeyInput> = {
    'Consumer App': passkeyDefaults,
    'SaaS Product': { ...passkeyDefaults, answers: { ...passkeyDefaults.answers, auth: 'totp', recovery: 'backup', rollout: 'balanced' } },
    'Enterprise Workforce': { ...passkeyDefaults, answers: { ...passkeyDefaults.answers, auth: 'push', audience: 'workforce', devices: 'managed', preference: 'mixed', recovery: 'desk', risk: 'high', stage: 'pilot' }, legacy: ['idp'], evidence: baseEvidence },
    'Shared Workstations': { ...passkeyDefaults, answers: { ...passkeyDefaults.answers, auth: 'password', audience: 'workforce', devices: 'shared', preference: 'undecided', recovery: 'desk', risk: 'high' }, legacy: ['shared'], evidence: { ...baseEvidence, shared: false } },
    'Privileged Admins': { ...passkeyDefaults, answers: { ...passkeyDefaults.answers, auth: 'fido', audience: 'admin', risk: 'critical', devices: 'managed', preference: 'hardware', recovery: 'backup', stage: 'pilot' }, evidence: { ...baseEvidence, privileged: true } },
    'Mature Passkey Deployment': { ...passkeyDefaults, answers: { ...passkeyDefaults.answers, auth: 'totp', recovery: 'backup', stage: 'first', goal: 'remove', rollout: 'balanced' }, evidence: Object.fromEntries(Object.keys(passkeyEvidence).map(k => [k, true])) as Record<EvidenceKey, boolean> }
};
export function clonePasskey(i: PasskeyInput): PasskeyInput { return { answers: { ...i.answers }, evidence: { ...i.evidence }, legacy: [...i.legacy], targets: { login: i.targets.login, recovery: i.targets.recovery, fallback: i.targets.fallback } }; }
export const fallbackReference = [
    { id: 'password', name: 'Password', level: 'Weak / Review', phishing: 'Not phishing-resistant', usability: 'Familiar, but requires secret management.', recovery: 'Can preserve legacy access; reset itself needs protection.', weakness: 'A phishable password path can bypass the benefit of passkey-first login. Assess the whole MFA sequence, not a password alone.' },
    { id: 'sms', name: 'SMS OTP', level: 'Weak / Review', phishing: 'Not phishing-resistant', usability: 'Broad reach, but delivery and phone-number loss matter.', recovery: 'Phone access can help users, but is not strong identity proof.', weakness: 'Phishing, SIM swap and phone-account takeover make sole recovery risky.' },
    { id: 'email', name: 'Email recovery / OTP', level: 'Weak / Review', phishing: 'Not inherently phishing-resistant', usability: 'Convenient where mailbox access remains available.', recovery: 'Mailbox access is not proof of the target account owner.', weakness: 'Compromised or same-provider mail can undermine otherwise strong login.' },
    { id: 'totp', name: 'TOTP', level: 'Moderate', phishing: 'Codes can be phished', usability: 'Requires an authenticator and backup plan.', recovery: 'A separately enrolled authenticator may provide continuity.', weakness: 'Lost-device and real-time phishing risks remain; never call TOTP equivalent to FIDO phishing resistance.' },
    { id: 'push', name: 'Push MFA', level: 'Moderate / Review', phishing: 'Implementation-dependent; not inherently phishing-resistant', usability: 'Familiar on enrolled phones.', recovery: 'Phone replacement requires a controlled re-enrollment route.', weakness: 'Prompt fatigue and account/device compromise require review; preserve safeguards such as number matching.' },
    { id: 'fido', name: 'FIDO security key / passkey backup', level: 'Strong — conditional', phishing: 'Phishing-resistant when correctly implemented and RP-bound', usability: 'Requires compatible clients, possession and appropriate user verification.', recovery: 'An independently enrolled spare may recover access.', weakness: 'Lost keys, unsupported clients and enrollment/recovery weaknesses remain. Verify actual authenticator properties and policy.' },
    { id: 'desk', name: 'Help desk / identity proofing', level: 'Weak / Review until assessed', phishing: 'Not inherently phishing-resistant', usability: 'Assisted but may be slow and operationally expensive.', recovery: 'Risk-based proofing and accountable approval can recover legitimate users.', weakness: 'Social engineering can bypass strong login; verify identity through approved evidence, not caller claims.' },
    { id: 'backup', name: 'Unspecified backup authenticator', level: 'Moderate / Review', phishing: 'Depends on the actual authenticator; not assumed phishing-resistant', usability: 'Must be independent of the failed device/provider.', recovery: 'Can preserve access if independently enrolled and available.', weakness: 'Identify whether this is FIDO, TOTP or another mechanism before assigning assurance; do not assume all backup authenticators are equally strong.' },
    { id: 'codes', name: 'Recovery codes', level: 'Moderate / Review', phishing: 'Bearer secrets can be phished or stolen', usability: 'Must be stored safely outside the lost device/provider.', recovery: 'Single-use codes can help when other access is unavailable.', weakness: 'Rate-limit, revoke after use and assess assurance; codes are not equivalent to phishing-resistant login.' }
] as const;
export interface PasskeyPhase {
    title: string;
    objective: string;
    actions: string[];
    users: string;
    prerequisite: string;
    gate: string;
    rollback: string;
    concern: string;
    status: string;
}
export function planPasskeys(i: PasskeyInput) {
    if (!i || !i.answers || !i.evidence || !i.targets || !Array.isArray(i.legacy))
        throw Error('Use a complete planner configuration.');
    for (const q of passkeyQuestions)
        if (!q.options.some(o => o[0] === i.answers[q.id]))
            throw Error('Choose supported authentication and migration answers.');
    for (const key of Object.keys(passkeyEvidence) as EvidenceKey[])
        if (typeof i.evidence[key] !== 'boolean')
            throw Error('Evidence gates must be explicitly checked or unchecked.');
    if (i.legacy.length > Object.keys(passkeyLegacy).length || new Set(i.legacy).size !== i.legacy.length || i.legacy.some(k => !Object.hasOwn(passkeyLegacy, k)))
        throw Error('Choose supported legacy constraints without duplicates.');
    for (const key of ['login', 'recovery', 'fallback'] as const) {
        const value = i.targets[key];
        if (typeof value !== 'string' || value.length > 6 || value !== '' && (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) < 0 || Number(value) > 100))
            throw Error('Optional percentage targets must be 0–100, or blank.');
    }
    const a = i.answers, e = i.evidence, high = a.risk === 'high' || a.risk === 'critical' || a.audience === 'admin' || a.audience === 'mixed', shared = a.devices === 'shared' || i.legacy.includes('shared');
    const weak = ['password', 'email', 'sms', 'unknown'].includes(a.recovery);
    const blockers: string[] = [];
    if (weak)
        blockers.push('Recovery is unknown or relies solely on a phishable reset/email/SMS route. Design and test risk-appropriate recovery before expansion.');
    const required: EvidenceKey[] = ['compatibility', 'recoveryAssurance', 'recoveryTested', 'support', 'baseline', 'fallback'];
    if (i.legacy.length)
        required.push('legacy');
    if (high || i.legacy.includes('regulated'))
        required.push('policy');
    if (shared)
        required.push('shared');
    if (a.audience === 'admin' || a.audience === 'mixed')
        required.push('privileged');
    for (const key of required)
        if (!e[key])
            blockers.push(passkeyEvidence[key] + ': evidence missing.');
    const pilotReady = blockers.length === 0;
    const adoptionReady = pilotReady && e.adoption && (a.stage === 'available' || a.stage === 'first');
    const reductionReady = adoptionReady && a.stage === 'first' && e.portability && e.emergency && (!high || e.policy) && (a.audience !== 'admin' && a.audience !== 'mixed' || e.privileged);
    const removalReady = reductionReady && e.legacy && e.policy && e.privileged;
    const readiness = !pilotReady ? 'Not Ready' : removalReady ? 'Mature / Password-Reduction Candidate' : adoptionReady ? 'Rollout Ready' : 'Pilot Ready';
    const legacyLabel = passkeyQuestions[0].options.find(o => o[0] === a.auth)![1];
    const policy = !pilotReady || !adoptionReady ? 'KEEP EXISTING AUTH FOR NOW' : a.goal === 'remove' && removalReady ? 'CANDIDATE FOR PASSWORD REMOVAL' : (a.goal === 'reduce' || a.goal === 'remove') && reductionReady ? 'RESTRICT PASSWORD FALLBACK' : 'PASSKEY-FIRST, CONTROLLED LEGACY FALLBACK';
    const warnings: string[] = [];
    if (a.devices === 'mixed')
        warnings.push('Inventory personal, managed and shared-device cohorts separately. Mark shared-workstation constraints where present and test the chosen access paths for every cohort.');
    if (shared)
        warnings.push('Shared devices need separate user identities/profiles and session cleanup. Do not enroll personal synced credentials into a shared profile or turn an individual passkey into a shared account credential. Consider hardware keys, cross-device sign-in or managed authenticators.');
    if (high)
        warnings.push('High-risk/privileged access needs an assurance review. Consider device-bound or hardware authenticators with appropriate user verification and independent backups; synced credentials are not a universal substitute for every high-assurance policy.');
    if (a.preference === 'synced')
        warnings.push('Review credential-provider account security, sync recovery and organization policy. Provider recovery and portability differ; do not assume universal export/import.');
    if (a.goal === 'remove' && !removalReady)
        warnings.push('Password removal is premature: adoption, recovery, portability, unsupported clients, privileged access, emergency access and policy gates must all be satisfied first.');
    if (a.goal === 'keep')
        warnings.push('Permanent password fallback retains a phishable route. Review restrictions, existing MFA and recovery rather than claiming the whole account is phishing-resistant.');
    if (a.rollout === 'aggressive')
        warnings.push('Aggressive means faster expansion only after gates pass. It never bypasses recovery, compatibility or support evidence.');
    if (a.auth === 'fido')
        warnings.push('Preserve existing FIDO/security-key access. Inventory whether passwords exist before planning their retirement; do not introduce passwords or SMS as a migration fallback.');
    if (a.auth === 'mixed')
        warnings.push('Inventory each custom authentication, federation and account-linking path; this planner cannot infer the weakest route from a mixed label.');
    const suggested = a.preference !== 'undecided' ? a.preference : shared || high ? 'hardware' : a.devices === 'personal' && a.audience === 'consumer' ? 'synced' : 'mixed';
    const typeAdvice = { synced: 'Consider synced passkeys for convenient multi-device use. Assess provider security, recovery and enterprise policy; loss of the provider account still needs an independent route.', bound: 'Consider device-bound credentials where policy fits. Device loss requires another enrolled authenticator or controlled recovery; replacing hardware does not automatically transfer the credential.', hardware: 'Consider individually issued hardware security keys, including an independently stored spare. Test client compatibility, user verification, loss/revocation and replacement.', mixed: 'Segment by audience: convenient synced credentials where appropriate, and managed/device-bound or hardware options for users whose policy or device environment requires them.' }[suggested as 'synced' | 'bound' | 'hardware' | 'mixed'];
    const recoveryPaths = [
        'Lost device or hardware key: use an independently enrolled backup or approved risk-based recovery; revoke the lost credential and review active sessions before re-registration.',
        'New device / platform switch: authenticate through an existing approved method, test cross-device sign-in where supported, then enroll the new authenticator. Do not assume credentials transfer between all providers.',
        'Lost sync access / locked provider account: use an independent authenticator or approved proofing route. Do not depend only on email hosted inside the same locked ecosystem.',
        'Compromised account: freeze suspicious recovery, apply accountable review, revoke affected credentials/sessions and re-enroll only after control is re-established.',
        a.audience === 'workforce' || a.devices === 'managed' ? 'Employee replacement: verify the employee through the approved enterprise process, issue managed replacement credentials, revoke old access and audit the lifecycle.' : 'Explain backup enrollment and safe recovery before users lose their only device.'
    ];
    const cohort = a.audience === 'admin' ? 'Named privileged-account pilot with independently reviewed spare credentials' : a.audience === 'workforce' ? 'Selected business unit / internal staff' : a.audience === 'mixed' ? 'Separate consumer and privileged/workforce pilot cohorts' : 'Opt-in users supported by a staffed recovery path';
    const pace = a.rollout === 'cautious' ? 'Keep cohorts bounded and observe a complete support/recovery cycle.' : a.rollout === 'balanced' ? 'Expand in measured cohorts only after the previous cohort meets its gates.' : 'Prepare faster cohort expansion, but use the same evidence gates and stop conditions.';
    const phases: PasskeyPhase[] = [
        { title: '1 · Prepare', objective: 'Establish the actual application/account and client scope.', actions: ['Inventory RP IDs, origins, federation/account linking, browser/native app support and user-verification requirements.', 'Record current authentication and recovery behavior; preserve existing MFA.', 'Baseline login, enrollment, fallback, support and fraud signals.', ...(i.legacy.map(k => 'Resolve and test: ' + passkeyLegacy[k] + '.'))], users: 'Owners, identity team, support and representative clients', prerequisite: 'Named migration owner and application inventory', gate: 'Compatibility, policy needs, support and metrics baseline reviewed', rollback: 'Pause enrollment if account mapping or compatibility can lock users out.', concern: 'Account linking or RP/origin mistakes can misbind access.', status: e.compatibility && e.baseline ? 'Reported evidence present' : 'Gate missing' },
        { title: '2 · Recovery design', objective: 'Prevent recovery or fallback from becoming the weakest route.', actions: recoveryPaths, users: 'All cohorts, including device-loss and privileged cases', prerequisite: 'Recovery inventory and assurance target agreed', gate: 'Recovery strength assessed and loss/provider-lockout/compromise drills pass', rollback: 'Pause expansion on failed drills, suspicious recovery or proofing bypasses.', concern: 'Support/email/SMS recovery must not silently bypass stronger authentication.', status: !weak && e.recoveryAssurance && e.recoveryTested ? 'Reported evidence present' : 'Gate missing' },
        { title: '3 · Bounded pilot', objective: 'Validate enrollment, sign-in and recovery with a supported cohort.', actions: [cohort, pace, 'Agree cohort-specific targets; track successful enrollment, sign-in, recovery, abandonment, fallback and support workload.'], users: cohort, prerequisite: 'Readiness and recovery gates passed', gate: 'Owner-defined targets met; no unresolved recovery or security incident', rollback: 'Stop expansion if login/recovery failures, abandonment, unsupported clients, support load or suspicious recovery rises beyond agreed limits.', concern: 'Do not measure adoption alone while excluding failed or unsupported users.', status: pilotReady ? 'Pilot prerequisites reported' : 'Blocked by readiness' },
        { title: '4 · Passkey enrollment', objective: 'Offer clear, recoverable enrollment alongside approved access.', actions: ['Prompt after an authenticated session with appropriate reauthentication; avoid coercive repeated prompts.', 'Let users recognize and manage named credentials and enroll an independent backup.', 'Explain local device unlock versus account sign-in, cross-device use, loss and removal.', shared ? 'Use separate profiles/identities and tested hardware/cross-device/managed routes on shared workstations.' : 'Validate supported device/provider combinations before widening enrollment.'], users: 'Pilot users, then eligible measured cohorts', prerequisite: 'Pilot gates and support capacity established', gate: 'Enrollment completes and users can sign in, add/revoke credentials and recover', rollback: 'Disable new enrollment on binding errors or lockouts; retain approved existing authentication.', concern: 'Protect enrollment and credential-management operations from session takeover.', status: a.stage === 'available' || a.stage === 'first' ? 'Already available — review evidence' : 'Gated next step' },
        { title: '5 · Passkey-first', objective: 'Make the proven route prominent without hiding recovery trade-offs.', actions: ['Prefer passkey sign-in where supported; clearly label controlled legacy access.', 'Preserve current MFA on legacy login and monitor its use.', 'Teach cross-device sign-in where supported; provide an accessible unsupported-client path.'], users: 'Eligible enrolled cohorts', prerequisite: 'Healthy adoption, tested recovery, client coverage and manageable support load', gate: 'Owner-defined login/recovery/fallback targets stable and exceptions handled', rollback: 'Revert presentation to the previously approved login route if success or recovery degrades; never silently enable a weaker route.', concern: 'A phishable fallback can undermine account-level phishing resistance.', status: adoptionReady ? 'Prerequisites reported' : 'Wait for adoption/recovery evidence' },
        { title: '6 · Reduce legacy dependency', objective: 'Restrict legacy reliance without stranding users.', actions: [a.goal === 'keep' ? 'Document the decision to retain fallback and review its restrictions/MFA.' : 'Reduce password/OTP prompts and retire unused flows cohort by cohort only after gates pass.', 'Test unsupported-client, emergency and independent-backup access before restricting fallback.', 'Use least-privilege, monitored exceptions rather than an invisible universal bypass.'], users: 'Proven cohorts; exceptions reviewed separately', prerequisite: 'Passkey-first, recovery, portability, emergency access and client coverage verified', gate: 'Reduction approved by owners; no unresolved lockout, fraud or support regressions', rollback: 'Pause restrictions and use approved recovery/exception access; do not auto-downgrade MFA.', concern: 'Removing an access path can be irreversible for some users; rehearse restoration before changes.', status: reductionReady ? 'Candidate for controlled restriction' : 'Do not restrict yet' },
        { title: '7 · Review password removal', objective: 'Decide from evidence, not a rollout deadline.', actions: ['Review adoption, recovery, provider portability, device/key loss and unsupported-client coverage.', 'Review privileged access, emergency controls, support readiness and policy obligations.', 'Retire passwords only where they exist, with explicit owner approval and a rehearsed access-restoration plan.'], users: 'Only cohorts whose removal gates pass', prerequisite: 'All removal gates and exception ownership satisfied', gate: 'Documented owner/security approval; evidence remains current', rollback: 'Stop if any access/recovery gate degrades. After retirement use approved recovery and re-enrollment, not assumed password restoration.', concern: 'Candidate status is not authorization or a compliance/security guarantee.', status: removalReady && a.goal === 'remove' ? 'Review candidate — approval still required' : 'Not a removal candidate yet' }
    ];
    const used = new Set<string>([a.auth, a.recovery]);
    if (!['fido', 'mixed'].includes(a.auth))
        used.add('password');
    return { readiness, policy, blockers, warnings, legacyLabel, suggested, typeAdvice, recoveryPaths, phases, cohort, pace, pilotReady, reductionReady, removalReady, firstFix: blockers[0] ?? (adoptionReady ? 'Review measured fallback/recovery and emergency access before reducing legacy dependency.' : 'Run the bounded pilot and record recovery, login and support evidence.'), biggestRisk: weak ? 'Weak or unknown recovery' : shared ? 'Shared-device identity and credential isolation' : !e.compatibility ? 'Untested client/account compatibility' : i.legacy.length && !e.legacy ? 'Unresolved legacy access' : !e.recoveryTested ? 'Unproven device/provider-loss recovery' : 'Fallback and recovery remain the account-level security boundary', fallbacks: fallbackReference.map(row => ({ ...row, inPlan: used.has(row.id) })), targets: { login: i.targets.login, recovery: i.targets.recovery, fallback: i.targets.fallback } };
}
