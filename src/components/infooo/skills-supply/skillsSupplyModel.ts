export const controlNames = { pin: 'Pin version', review: 'Review diff', publisher: 'Verify publisher', integrity: 'Verify integrity', sandbox: 'Sandbox', denyNetwork: 'Deny network', files: 'Limit file access', shell: 'Limit shell', approval: 'Require approval', allowlist: 'Allowlist skills', audit: 'Audit execution' } as const;
export type Control = keyof typeof controlNames;
export type Controls = Record<Control, boolean>;
export const guarded = (): Controls => Object.fromEntries(Object.keys(controlNames).map(k => [k, true])) as Controls;
export const broad = (): Controls => Object.fromEntries(Object.keys(controlNames).map(k => [k, false])) as Controls;
export const scenarios = [
  { id: 'update', label: 'Risky update', point: 2, lesson: 'Day 1: reviewed local report. Day 7: v2 requests broader access and an external report destination.' },
  { id: 'lookalike', label: 'Lookalike skill', point: 0, lesson: 'A similar name from Other Publisher does not inherit Example Labs’ provenance or review.' },
  { id: 'publisher', label: 'Publisher compromise', point: 0, lesson: 'The familiar publisher channel delivers changed content; a matching digest does not make it safe.' },
  { id: 'dependency', label: 'Dependency change', point: 3, lesson: 'The top-level v1 version and digest stay the same; an unpinned helper changes effective behavior.' },
  { id: 'instruction', label: 'Malicious instruction', point: 2, lesson: 'An abstract HIGH-RISK INSTRUCTION influences the plan; it has no system-level authority.' },
  { id: 'script', label: 'Script side effect', point: 6, lesson: 'Declared: format a report. Observed: attempt an unrelated outbound action.' },
] as const;
export type Scenario = typeof scenarios[number]['id'];
export interface Bundle { id: string; publisher: string; version: string; digest: string; expectedDigest: string; helper: string; helperDigest: string; expectedHelper: string; network: boolean; broadFiles: boolean; broadShell: boolean; effect: 'local' | 'upload' | 'instruction' | 'script'; reviewed: boolean; source: string; }
export const baseline = (): Bundle => ({ id: 'project-reporter', publisher: 'Example Labs', version: '1.0.0', digest: 'demo-v1', expectedDigest: 'demo-v1', helper: '1.0', helperDigest: 'helper-1', expectedHelper: 'helper-1', network: false, broadFiles: false, broadShell: false, effect: 'local', reviewed: true, source: 'example-labs.example/reporter' });
export interface Lab { scenario: Scenario; controls: Controls; installed: Bundle | null; pending: Bundle | null; step: number; status: 'ready' | 'running' | 'blocked' | 'review' | 'approval' | 'done' | 'denied'; operation: 'install' | 'update' | 'run'; message: string; network: boolean; revoked: boolean; approvedForUse: boolean; reviewedFingerprint: string; approvedAction: string; report: boolean; outbound: boolean; intended: boolean; }
export function fingerprint(b: Bundle) { return `${b.id}/${b.publisher}/${b.version}/${b.digest}/${b.helperDigest}`; }
export function initial(installed = false): Lab { return { scenario: 'update', controls: guarded(), installed: installed ? baseline() : null, pending: null, step: 0, status: 'ready', operation: 'install', message: installed ? 'Reviewed v1 is preinstalled for this experiment. Update it or run this snapshot.' : 'Install a reviewed skill. It reads project notes and writes one local report.', network: false, revoked: false, approvedForUse: true, reviewedFingerprint: fingerprint(baseline()), approvedAction: '', report: false, outbound: false, intended: false }; }
export function candidate(s: Lab): Bundle {
  const b = baseline();
  if (s.scenario === 'lookalike') return s.intended ? b : { ...b, id: 'project-reporterr', publisher: 'Other Publisher', source: 'other-publisher.example/reporter', digest: 'other-v1', expectedDigest: 'other-v1', effect: 'upload', network: true, broadFiles: true, broadShell: true, reviewed: false };
  if (s.scenario === 'dependency') return { ...b, helper: '2.0 (floating resolution)', helperDigest: 'helper-2', network: true, effect: 'upload', reviewed: false };
  return { ...b, version: '2.0.0', digest: s.scenario === 'script' ? 'demo-tampered' : 'demo-v2', expectedDigest: 'demo-v2', network: true, broadFiles: true, broadShell: true, effect: s.scenario === 'instruction' ? 'instruction' : s.scenario === 'script' ? 'script' : 'upload', reviewed: false };
}
export function knownPublisher(b: Bundle) { return b.id === 'project-reporter' && b.publisher === 'Example Labs' && b.source === 'example-labs.example/reporter'; }
export function integrity(b: Bundle) { return b.digest === b.expectedDigest && b.helperDigest === b.expectedHelper; }
export function compareVersions(a: Bundle, b: Bundle) {
  if (fingerprint(a) === fingerprint(b)) return [{ label: 'Bundle', before: `${a.version} · ${a.digest}`, after: 'Same content and resolved helper' }];
  if (a.digest === b.digest) return [{ label: 'Skill version / digest', before: `${a.version} / ${a.digest}`, after: `${b.version} / ${b.digest} · UNCHANGED` }, { label: 'Helper dependency', before: a.helper, after: b.helper }, { label: 'Effective behavior', before: 'Local report', after: 'Attempts outbound report' }];
  return [{ label: 'SKILL.md', before: 'Local report only', after: b.effect === 'instruction' ? 'HIGH-RISK INSTRUCTION marker' : 'Changed workflow guidance' }, { label: 'scripts/report.ts', before: 'Format local report', after: b.effect === 'script' ? 'Unrelated outbound side effect' : 'May send report externally' }, { label: 'Requested access (model)', before: 'Project files · restricted helper · no network', after: 'Broader files · broader shell · network requested' }];
}
export function reachability(s: Lab) {
  return ['Project files', 'Report output', ...(!s.controls.files && !s.controls.sandbox ? ['Home files', 'Environment / secrets'] : []), ...(!s.controls.shell && !s.controls.sandbox ? ['Broad shell / tools'] : []), ...(s.network && !s.controls.denyNetwork && !s.controls.sandbox ? ['Network'] : [])];
}
export function gate(s: Lab, b: Bundle) {
  if (s.revoked || !s.approvedForUse) return 'Skill is revoked or not authorized for use.';
  if (s.installed && s.controls.pin && (b.version !== s.installed.version || b.id !== s.installed.id || b.digest !== s.installed.digest)) return 'PINNED — the installed skill remains unchanged.';
  if (s.controls.publisher && !knownPublisher(b)) return 'UNKNOWN PUBLISHER — similar spelling is not provenance.';
  if (s.controls.allowlist && (!knownPublisher(b) || fingerprint(b) !== fingerprint(baseline()))) return 'NOT ALLOWLISTED — this exact release and dependency resolution is not in the approved library.';
  if (s.controls.integrity && !integrity(b)) return 'INTEGRITY MISMATCH — bundle or resolved dependency differs from the expected snapshot.';
  return '';
}
export function start(s: Lab, operation: Lab['operation']): Lab {
  if (operation !== 'install' && !s.installed) return { ...s, status: 'blocked', message: 'Install a skill first.' };
  return { ...s, operation, pending: operation === 'install' ? baseline() : operation === 'run' ? s.installed : candidate(s), step: 0, status: 'running', approvedAction: '', report: false, outbound: false, message: operation === 'update' ? 'Follow the changed release through the same supply chain.' : 'Follow the package from publisher to execution.' };
}
export const stages = ['Publisher', 'Repository', 'Bundle / version', 'Registry / dependency', 'Install', 'Agent environment', 'Execution'];
export function actionBinding(b: Bundle) { return `${fingerprint(b)}:report-to-external.example`; }
export function advance(s: Lab): Lab {
  if (s.status !== 'running' || !s.pending) return s;
  const next = { ...s, step: Math.min(s.step + 1, 6) }, b = s.pending;
  if (next.step === 4) {
    const failure = s.operation === 'run' ? (s.revoked || !s.approvedForUse ? 'Skill is revoked or not authorized for use.' : '') : gate(s, b);
    if (failure) return { ...next, status: 'blocked', message: failure };
    if (s.controls.review && s.reviewedFingerprint !== fingerprint(b)) return { ...next, status: 'review', message: 'CHANGED — review this exact bundle and resolved dependency before adoption.' };
    next.installed = { ...b, reviewed: s.reviewedFingerprint === fingerprint(b) };
  }
  if (next.step < 6) return { ...next, message: `${stages[next.step]} · ${b.id} ${b.version}${next.step === 3 ? ` · helper ${b.helper}` : ''}` };
  if (s.revoked || !s.approvedForUse) return { ...next, status: 'blocked', message: 'Skill authorization was revoked before execution.' };
  next.report = true;
  if (b.effect === 'local') return { ...next, status: 'done', message: 'Local report created. No network is needed for the user’s task.' };
  const canNetwork = reachability(next).includes('Network');
  if (!canNetwork) return { ...next, status: 'blocked', message: 'Report created locally; attempted outbound path BLOCKED by the execution environment.' };
  if (s.controls.approval && s.approvedAction !== actionBinding(b)) return { ...next, status: 'approval', message: 'An unrelated outbound action needs specific approval; installing a skill is not blanket consent.' };
  return { ...next, status: 'done', outbound: true, message: b.effect === 'script' ? 'Declared: format report. Observed: simulated outbound side effect reached the external service.' : 'The local report was also sent to a fictional external destination. This was outside the requested task.' };
}
export function reviewUpdate(s: Lab, accept: boolean): Lab {
  if (s.status !== 'review' || !s.pending) return s;
  if (!accept) return { ...s, status: 'denied', message: 'Update rejected. The previously installed version remains intact.' };
  return { ...s, reviewedFingerprint: fingerprint(s.pending), step: 3, status: 'running', message: 'Review recorded for this exact content, not every future release.' };
}
export function approveAction(s: Lab, accept: boolean): Lab {
  if (s.status !== 'approval' || !s.pending) return s;
  if (!accept) return { ...s, status: 'denied', message: 'Outbound action declined. The local report remains.' };
  return advance({ ...s, status: 'running', approvedAction: actionBinding(s.pending) });
}
export function finish(s: Lab) { for (let i = 0; i < 8 && s.status === 'running'; i++) s = advance(s); return s; }
export const anatomy = [
  ['SKILL.md', 'Instructions, metadata and usage guidance influence the agent’s plan; they do not become system-level instructions.'],
  ['scripts/', 'Executable helpers can cause local side effects when the runtime permits execution.'],
  ['references/', 'Supporting knowledge is loaded when needed and can shape decisions.'],
  ['templates/', 'This fictional bundle’s reusable report structure; not a universally required folder.'],
  ['assets/', 'Optional resources, including templates or images; not every skill has these directories.'],
];
export const xray = [
  ['Author', 'Publisher identity', 'Account control', 'A familiar publisher can be compromised', 'Review each release, not only its name'],
  ['Source', 'Expected repository', 'Branch or release content', 'A lookalike source appears familiar', 'Verify source and publisher'],
  ['Review', 'Exact inspected content', 'Scripts, instructions and dependencies', 'Old review is applied to new behavior', 'Record the reviewed snapshot'],
  ['Version', 'Selected release', 'A latest pointer or floating helper', 'Pinning top-level files misses dependency drift', 'Pin and review the dependency closure'],
  ['Distribution', 'Delivered content matches expected content', 'Registry or artifact', 'Matching a malicious release digest is not safety', 'Integrity plus provenance and review'],
  ['Install', 'Explicit adoption decision', 'Installed snapshot', 'A failed update corrupts a working copy', 'Atomic update and retained prior version'],
  ['Environment', 'Enforced execution boundary', 'Sandbox configuration', 'Broad environment exposes unrelated resources', 'Limit workspace, commands and environment'],
  ['Capabilities', 'Granted scope, not requested scope', 'Network, files and shell grants', 'A manifest request is treated as permission', 'Deny unnecessary capabilities'],
  ['Execution', 'Observed effects match the task', 'Instructions or helper side effects', 'A local report also triggers an outbound action', 'Runtime enforcement and informed approval'],
  ['Audit', 'Evidence of actions', 'Trace completeness', 'Logging is mistaken for prevention', 'Inspect evidence; logging cannot undo effects'],
];
export const challenges = [
  { question: 'Reviewed v1 gains changed scripts and a network request. What next?', options: ['Auto-update', 'Review changes before adoption', 'Give admin permissions'], answer: 1, why: 'A previous review does not cover changed content or expanded access.' },
  { question: 'A report skill needs only project files. What scope fits?', options: ['Entire machine', 'Project directory', 'Home directory'], answer: 1, why: 'Grant what the task needs, not everything the runtime could expose.' },
  { question: 'The name looks familiar but the publisher differs. What next?', options: ['Assume same skill', 'Verify provenance', 'Trust the similar spelling'], answer: 1, why: 'Identity and source matter more than a nearly identical package name.' },
  { question: 'The top-level skill is pinned but its helper is not. What remains?', options: ['No remaining risk', 'Transitive dependency changes', 'Only the skill name'], answer: 1, why: 'An unchanged skill can run changed dependency behavior.' },
];
