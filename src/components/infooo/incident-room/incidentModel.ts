/** Fictional investigation fixtures; no security, telemetry or credential integrations. */
export type Source = 'trace' | 'identity' | 'tool' | 'policy' | 'audit' | 'state';
export type Truth = 'OBSERVED' | 'INFERRED' | 'UNKNOWN';
export const sourceNames: Record<Source, string> = { trace: 'Agent trace', identity: 'Identity / auth', tool: 'Tool call', policy: 'Policy decision', audit: 'Resource audit', state: 'System state' };
export const sourceIds = Object.keys(sourceNames) as Source[];
export const cases = [
  { id: 'unauthorized', title: 'Unauthorized action', task: 'Prepare staging deployment information.', action: 'production.deploy', target: 'Production', trigger: 'The recorded proposal selected production rather than preparing staging information.', finding: 'Broad production authority and a missing intent gate allowed an action outside the task.' },
  { id: 'credential', title: 'Misused credential', task: 'Prepare staging deployment information.', action: 'reports.read', target: 'Report store', trigger: 'A credential issued to Release Assistant was presented directly to the report store.', finding: 'A broadly accepted credential reached an unrelated resource; its holder’s identity is not established.' },
  { id: 'shared', title: 'Shared identity ambiguity', task: 'Prepare staging deployment information.', action: 'production.deploy', target: 'Production', trigger: 'The production request carried a subject used by three separate agents.', finding: 'Shared attribution and shared revocation coupled unrelated workloads; broad permission allowed the action.' },
  { id: 'injection', title: 'Prompt-injection path', task: 'Prepare staging deployment information.', action: 'production.deploy', target: 'Production', trigger: 'An abstract untrusted instruction marker appeared before the production proposal.', finding: 'Influence is an inference; broad authority, missing external policy and missing approval enabled the observed impact.' },
  { id: 'skill', title: 'Risky skill update', task: 'Prepare staging deployment information.', action: 'production.deploy', target: 'Production', trigger: 'Release Helper changed from reviewed v1.0 to unreviewed v2.0, adding a production action.', finding: 'Unreviewed adoption and broad runtime authority allowed new behavior; a matching release name was not review.' },
  { id: 'retry', title: 'Retry side effect', task: 'Deploy one approved staging release.', action: 'staging.deploy', target: 'Staging', trigger: 'A timed-out response concealed a committed rollout; the retry committed a second rollout.', finding: 'An unknown outcome was treated as failure, without reconciliation or idempotent execution.' },
] as const;
export interface Evidence { id: Source; time: string; source: string; actor: string; action: string; resource: string; result: string; trust: string; detail: string; }
export interface Controls { dedicated: boolean; leastPrivilege: boolean; policy: boolean; approval: boolean; sandbox: boolean; pinning: boolean; tracing: boolean; verification: boolean; idempotency: boolean; }
export const controlNames: Record<keyof Controls, string> = { dedicated: 'Dedicated identity', leastPrivilege: 'Least privilege', policy: 'Policy outside agent', approval: 'Approval gate', sandbox: 'Session isolation', pinning: 'Reviewed version pin', tracing: 'Correlated tracing', verification: 'Result verification', idempotency: 'Reconcile + idempotency' };
export type Containment = 'Pause agent' | 'Revoke credential' | 'Revoke dedicated identity' | 'Remove high-risk scope' | 'Block tool' | 'Isolate session' | 'Require approval';
export const containmentActions: Containment[] = ['Pause agent', 'Revoke credential', 'Revoke dedicated identity', 'Remove high-risk scope', 'Block tool', 'Isolate session', 'Require approval'];
export interface Room {
  caseIndex: number; opened: Source[]; selected: Source; saved: Evidence[] | null; volatileLost: boolean;
  paused: boolean; credentialRevoked: boolean; identityRevoked: boolean; scopeRemoved: boolean; toolBlocked: boolean; isolated: boolean; approvalRequired: boolean;
  verified: { authority: boolean; state: boolean; restored: boolean; monitored: boolean };
  effects: number; controls: Controls; replay: ReturnType<typeof replayIncident> | null; journal: string[];
}
export function initial(caseIndex = 0): Room {
  return { caseIndex, opened: [], selected: 'trace', saved: null, volatileLost: false, paused: false, credentialRevoked: false, identityRevoked: false, scopeRemoved: false, toolBlocked: false, isolated: false, approvalRequired: false, verified: { authority: false, state: false, restored: false, monitored: false }, effects: caseIndex === 5 ? 2 : 1,
    controls: { dedicated: false, leastPrivilege: false, policy: false, approval: false, sandbox: false, pinning: false, tracing: false, verification: false, idempotency: false }, replay: null, journal: [] };
}
export function evidenceFor(index: number): Evidence[] {
  const c = cases[index], subject = index === 2 ? 'shared-release-account' : 'agent-release-014';
  return [
    { id: 'trace', time: '14:00–14:02', source: 'Agent trace · run-014', actor: index === 2 ? 'Shared runner (agent binding absent)' : 'Release Assistant', action: 'Task → observable proposal', resource: 'Staging brief', result: index === 5 ? 'Final answer claims one rollout' : 'Final answer claims task completed', trust: 'Recorded observations; not independent proof of external effects', detail: `User task: ${c.task} Agent start: 14:01. ${c.trigger} No private reasoning is recorded. ${index === 2 ? 'This trace has no trustworthy binding to the resource call.' : 'A verified run reference binds this trace to the request, except the direct credential-use case.'}` },
    { id: 'identity', time: '14:02:10', source: 'Auth issuer / configuration snapshot', actor: subject, action: 'Credential accepted', resource: c.target, result: 'Valid proof; broad grants', trust: 'Subject and grant evidence, not proof of the person/process holding proof', detail: `Scope snapshot: staging.deploy, production.deploy, reports.read. No mail authority snapshot. ${index === 2 ? 'Research, Release and Report agents share this subject.' : index === 1 ? 'Credential issued to Release Assistant; actual operator UNKNOWN.' : 'Dedicated subject and verified run binding identify Release Assistant.'} Credential bytes are omitted.` },
    { id: 'tool', time: index === 5 ? '14:02:20 / 14:02:50' : '14:02:20', source: index === 1 ? 'Downstream request log' : 'Tool gateway · request-014', actor: subject, action: c.action, resource: c.target, result: index === 5 ? 'Attempt 1 TIMEOUT; attempt 2 SUCCESS' : 'Request accepted', trust: 'Invocation/response evidence; response alone does not prove resulting state', detail: index === 5 ? 'Same logical staging release requested twice. The first commit completed before its response timed out; no stable deduplication receipt was used.' : index === 1 ? 'Direct resource request; no matching agent-tool invocation. Possession of accepted proof does not establish the operator.' : `Requested action: ${c.action}. ${index === 4 ? 'Loaded skill version v2.0; last reviewed v1.0. Abstract diff: adds production action.' : 'No exploit payload or real request body is present.'}` },
    { id: 'policy', time: '14:02:21', source: 'Resource policy decision', actor: subject, action: 'Authorize exact action', resource: c.target, result: 'ALLOW · broad resource policy', trust: 'Recorded enforcement decision; technical permission is not user intent', detail: `${c.action} was permitted by the credential/resource policy. No separate task-intent gate or approval was enforced. ${index === 5 ? 'Staging deployment was intended; duplicate effects were not.' : 'This does not establish approval for the requested user task.'}` },
    { id: 'audit', time: index === 5 ? '14:02:22 / 14:02:51' : '14:03:00', source: 'Resource audit · incident window', actor: subject, action: c.action, resource: c.target, result: index === 5 ? 'Two committed rollout receipts' : index === 1 ? 'Report read recorded' : 'Production v2 activation recorded', trust: 'Direct resource event evidence; bounded to the listed resources and time window', detail: `${index === 5 ? 'Receipts rollout-1 and rollout-2 both refer to the same logical release.' : index === 1 ? 'Read of a fictional report is confirmed; later use or disclosure is UNKNOWN.' : 'Deployment receipt confirms production changed from v1 to v2.'} Repository audit is complete for this window and records no access. ${[1, 5].includes(index) ? 'Production audit is also complete and records no access in this window.' : ''} Report-store and mail coverage are absent except the report-read case.` },
    { id: 'state', time: '14:03:10', source: 'Independent resource-state snapshot', actor: 'State verifier', action: 'Read resulting state', resource: c.target, result: index === 5 ? '2 staging rollouts; expected 1' : index === 1 ? 'Report-read counter = 1' : 'Production version = v2', trust: 'Authoritative snapshot of the modeled resource at capture time; not universal forensic proof', detail: `${index === 5 ? 'The agent’s one-rollout answer conflicts with two committed effects.' : index === 1 ? 'A read counter proves access, not what happened to the data afterward.' : 'The final answer did not disclose the production change.'} Alert at 14:03 flagged unusual activity; it prompted investigation, not proof of every suspected consequence.` },
  ];
}
export function availableEvidence(s: Room) { return evidenceFor(s.caseIndex).filter(e => !s.volatileLost || e.id !== 'trace' || s.saved?.some(saved => saved.id === 'trace')); }
export function reveal(s: Room, id: Source): Room { return availableEvidence(s).some(e => e.id === id) ? { ...s, selected: id, opened: [...new Set([...s.opened, id])] } : s; }
export function preserve(s: Room): Room { return s.saved ? s : { ...s, saved: availableEvidence(s).map(e => ({ ...e, detail: e.id === 'state' ? `${e.detail} Current historical effect count at preservation: ${s.effects}.` : e.detail })), journal: [...s.journal, 'Available trace, audit events, original state, current effect count and relevant configuration captured locally.'] }; }
export function discardSession(s: Room): Room { return { ...s, volatileLost: true, opened: s.saved ? s.opened : s.opened.filter(id => id !== 'trace'), journal: [...s.journal, s.saved ? 'Session cleared; preserved trace copy remains available.' : 'Volatile trace lost. Later capture cannot recreate it; external audit/state records remain.'] }; }
export function attribution(s: Room) {
  if (!s.opened.includes('identity')) return { truth: 'UNKNOWN' as Truth, text: 'Which subject—and which operator—acted is not established yet.' };
  if (s.caseIndex === 2) return { truth: 'UNKNOWN' as Truth, text: 'Shared subject known; the three agents cannot be uniquely attributed from these records.' };
  if (s.caseIndex === 1) return { truth: 'OBSERVED' as Truth, text: 'agent-release-014 presented. Actual operator UNKNOWN: valid proof does not prove which process held it.' };
  return { truth: 'OBSERVED' as Truth, text: 'Release Assistant · agent-release-014 · verified run/request binding.' };
}
export function findings(s: Room): { truth: Truth; text: string }[] {
  const result: { truth: Truth; text: string }[] = [{ truth: 'OBSERVED', text: 'An unusual resource-action alert was recorded at 14:03.' }, attribution(s)];
  if (s.opened.includes('audit')) result.push({ truth: 'OBSERVED', text: evidenceFor(s.caseIndex).find(e => e.id === 'audit')!.result });
  if (s.opened.includes('trace') && s.opened.includes('tool')) result.push({ truth: 'INFERRED', text: s.caseIndex === 3 ? 'The preceding untrusted content may have influenced the proposal; chronology alone does not prove causation.' : s.caseIndex === 4 ? 'The changed skill may explain the new production proposal; version order alone does not prove sole cause.' : cases[s.caseIndex].finding });
  result.push({ truth: 'UNKNOWN', text: s.caseIndex === 2 ? 'Which individual agent originated the shared request.' : s.caseIndex === 1 ? 'Who held the credential and whether report data was subsequently disclosed.' : 'Whether another external instruction or actor contributed outside this captured window.' });
  return result;
}
export function timeline(s: Room) {
  const rows: { label: string; source: Source; time: string }[] = [
    { label: 'User task', source: 'trace', time: '14:00' }, { label: 'Agent starts', source: 'trace', time: '14:01' },
    { label: s.caseIndex === 4 ? 'Skill v2 loaded / proposal' : s.caseIndex === 3 ? 'Untrusted input precedes proposal' : s.caseIndex === 5 ? 'Approved release proposed' : 'Action proposal / input boundary', source: 'trace', time: '14:02' },
    { label: s.caseIndex === 5 ? 'Tool request + retry' : 'Resource / tool request', source: 'tool', time: '14:02:20' },
    { label: 'Authority presented', source: 'identity', time: '14:02:10' }, { label: 'Policy allows', source: 'policy', time: '14:02:21' },
    { label: s.caseIndex === 5 ? 'Two committed rollouts' : `${cases[s.caseIndex].target} action`, source: 'audit', time: s.caseIndex === 5 ? '14:02:51' : '14:03:00' },
  ];
  return [...rows.sort((a, b) => a.time.localeCompare(b.time)).map(r => ({ ...r, known: s.opened.includes(r.source) })), { label: 'Alert detected', source: 'state' as Source, time: '14:03:05', known: true }];
}
export function blastRadius(s: Room) {
  const actionKnown = s.opened.includes('audit') || s.opened.includes('state'), grantsKnown = s.opened.includes('identity');
  return ['Staging', 'Production', 'Repository', 'Report store', 'Email'].map(name => {
    const touched = actionKnown && name === cases[s.caseIndex].target;
    const absent = s.opened.includes('audit') && (name === 'Repository' || name === 'Production' && [1, 5].includes(s.caseIndex));
    const reachable = grantsKnown && ['Staging', 'Production', 'Report store'].includes(name);
    const status = touched ? 'TOUCHED' : absent ? 'NOT REACHED' : reachable ? 'REACHABLE' : 'UNKNOWN';
    return { name, status, why: touched ? 'Direct audit/state evidence of an effect; not a blanket compromise claim.' : absent ? 'Complete fixture audit for this resource/window records no access.' : reachable ? 'Grant permits access; actual access remains unconfirmed.' : 'No sufficient grant/access evidence in the captured sources.' };
  });
}
export function canContinue(s: Room) {
  if (s.identityRevoked || s.credentialRevoked || s.scopeRemoved) return false;
  // Direct misuse of proof can bypass agent-local pause/tool/session controls.
  if (s.caseIndex === 1) return true;
  return !(s.paused || s.toolBlocked || s.isolated || s.approvalRequired);
}
export function contain(s: Room, action: Containment): Room {
  let next = { ...s, verified: { authority: false, state: false, restored: false, monitored: false } };
  if (action === 'Pause agent') next.paused = true;
  if (action === 'Revoke credential') next.credentialRevoked = true;
  if (action === 'Revoke dedicated identity') { if (s.caseIndex !== 2) next.identityRevoked = true; else return { ...s, journal: [...s.journal, 'No dedicated identity exists in this incident; shared credential revocation has collateral impact.'] }; }
  if (action === 'Remove high-risk scope') next.scopeRemoved = true;
  if (action === 'Block tool') next.toolBlocked = true;
  if (action === 'Isolate session') next.isolated = true;
  if (action === 'Require approval') next.approvalRequired = true;
  return { ...next, journal: [...s.journal, `${action}: ${canContinue(next) ? 'direct credential use remains possible' : 'subsequent affected-path actions blocked'}. Past effects remain ${s.effects}.`] };
}
export function unrelatedAgents(s: Room) { return s.caseIndex === 2 && s.credentialRevoked ? 'Research + Report BLOCKED · shared credential collateral' : 'Research + Report operational'; }
export function subsequentAction(s: Room): Room { return { ...s, effects: s.effects + (canContinue(s) ? 1 : 0), verified: canContinue(s) ? { authority: false, state: false, restored: false, monitored: false } : s.verified, journal: [...s.journal, canContinue(s) ? 'Probe ALLOWED: another fictional effect was committed.' : 'Probe BLOCKED: no new effect; prior evidence retained.'] }; }
export function verifyAuthority(s: Room): Room { return { ...s, verified: { ...s.verified, authority: !canContinue(s) && (s.credentialRevoked || s.identityRevoked) && s.scopeRemoved }, journal: [...s.journal, !canContinue(s) && (s.credentialRevoked || s.identityRevoked) && s.scopeRemoved ? 'Revocation and unsafe-scope removal independently checked.' : 'Verification incomplete: require revoked proof/identity AND unsafe authority removed.'] }; }
export function verifyState(s: Room): Room { return { ...s, verified: { ...s.verified, state: true }, journal: [...s.journal, `Independent read confirms ${s.effects} historical effect(s). Revocation did not undo them; resource-owner remediation is still required.`] }; }
export function restore(s: Room): Room {
  if (!s.saved || !s.verified.authority || !s.verified.state || canContinue(s)) return { ...s, journal: [...s.journal, 'Recovery held: preserve evidence, verify containment and inspect resource state first.'] };
  return { ...s, verified: { ...s.verified, restored: true }, journal: [...s.journal, 'Resource owner approves remediation; a separate narrow staging workflow is restored. Historical evidence and effect counts remain preserved.'] };
}
export function monitor(s: Room): Room { return { ...s, verified: { ...s.verified, monitored: s.verified.restored && s.verified.authority && s.verified.state && !canContinue(s) }, journal: [...s.journal, s.verified.restored ? 'New narrow workflow: staging information read ALLOWED; old affected authority probe BLOCKED.' : 'Monitoring alone cannot establish recovery before restoration and verification.'] }; }
export function recovered(s: Room) { return Object.values(s.verified).every(Boolean) && !!s.saved && !canContinue(s); }
export function recommendedContainment(s: Room): Containment { return s.caseIndex === 1 || s.caseIndex === 2 ? 'Revoke credential' : 'Revoke dedicated identity'; }
export function replayIncident(index: number, c: Controls) {
  if (index === 4 && c.pinning) return { outcome: 'BLOCKED · unreviewed v2 not adopted', effects: 0, gate: 'Reviewed version pin', proposal: 'Same offered v2; adoption differs', lesson: 'A reviewed top-level pin constrains this fixture update, not every transitive dependency.' };
  if (c.leastPrivilege && index !== 5) return { outcome: 'BLOCKED · outside task authority', effects: 0, gate: 'Least privilege', proposal: 'Same unwanted request', lesson: 'The resource rejects the same request; the simulated model has not become safer.' };
  if (c.policy && index !== 5) return { outcome: 'BLOCKED · independent policy', effects: 0, gate: 'Policy outside agent', proposal: 'Same unwanted request', lesson: 'Task/resource policy rejects the proposal before execution.' };
  if (c.approval && index !== 1 && index !== 5) return { outcome: 'HELD · approval required', effects: 0, gate: 'Approval gate', proposal: 'Same unwanted request', lesson: 'No approval is granted in this replay; held is not proof a human would always decide correctly.' };
  if (c.idempotency && index === 5) return { outcome: 'ONE EFFECT · duplicate suppressed', effects: 1, gate: 'Reconcile + idempotency', proposal: 'Same timeout + retry', lesson: 'A resource-side operation receipt returns the first committed rollout instead of creating another.' };
  return { outcome: index === 5 ? 'TWO EFFECTS · duplicate remains' : 'ACTION ALLOWED · impact remains', effects: index === 5 ? 2 : 1, gate: 'No preventive gate on this path', proposal: index === 5 ? 'Same timeout + retry' : 'Same unwanted request', lesson: 'Identity/tracing improve attribution; verification detects discrepancies. Neither alone prevents this side effect. Session isolation does not revoke direct resource authority.' };
}
export function applyControl(s: Room, id: keyof Controls): Room { const controls = { ...s.controls, [id]: !s.controls[id] }; return { ...s, controls, replay: replayIncident(s.caseIndex, controls) }; }
export const controlFindings: Record<keyof Controls, string> = { dedicated: 'Shared actor → attributable subject; precise revocation, not automatic prevention.', leastPrivilege: 'Excess authority → narrow grants accepted by the resource.', policy: 'Task/action mismatch → external execution-time policy.', approval: 'Unapproved high-impact action → explicit independent approval.', sandbox: 'Weak session boundary → restrict session execution; not a cure for accepted external proof.', pinning: 'Changed unreviewed skill → keep the reviewed version; dependencies need separate review.', tracing: 'Fragmented records → correlated observable events; logs do not prevent actions.', verification: 'Final-answer mismatch → independent resulting-state checks; detection is not prevention.', idempotency: 'Unknown timeout outcome → reconcile state and deduplicate one logical operation.' };
export const xray = [
  ['User', 'Recorded staging task.', 'The captured requested outcome.', 'Intent outside this record.', 'Bind actions to explicit task authority.'],
  ['Agent', 'Observable proposals and final answer.', 'What this trace reports.', 'Private reasoning and unrecorded behavior.', 'Trace externally visible actions; verify effects.'],
  ['Context', 'Untrusted marker / selected skill version.', 'What entered the captured run.', 'Whether it caused the decision.', 'Separate untrusted data from authority; review updates.'],
  ['Identity', 'Subject plus run/request binding.', 'Dedicated attribution where binding exists.', 'Individual operator of shared or misused proof.', 'Dedicated subjects and trusted correlations.'],
  ['Credential', 'Issuer, accepted subject and grant snapshot.', 'Proof was accepted for this resource.', 'Unobserved holders or later reuse.', 'Revoke and verify at the resource; omit proof bytes.'],
  ['Tool', 'Invocation, attempt and response.', 'What was requested and returned.', 'Whether success text equals a commit.', 'Bound capabilities and reconcile unknown outcomes.'],
  ['Policy', 'ALLOW decision and policy snapshot.', 'What the resource permitted.', 'Policies outside the captured path.', 'Independent action/resource authorization and approval.'],
  ['Resource', 'Commit receipts and state snapshot.', 'Recorded effects at capture time.', 'Resources without telemetry.', 'Inspect resulting state; owner-approved remediation.'],
  ['Audit', 'Time, subject, request correlation and result.', 'Events inside coverage boundaries.', 'Unlogged activity outside coverage.', 'Preserve relevant records with provenance and privacy limits.'],
] as const;
export const challenges = [
  { question: 'A report store was reachable, but no access evidence exists. What can you conclude?', options: ['It was compromised', 'Reachable does not mean confirmed accessed', 'Nothing can ever be learned'], answer: 1, why: 'Capability reach and observed access are different claims.' },
  { question: 'The agent claims success; resource evidence shows no expected change. What next?', options: ['Trust the final answer', 'Inspect resulting state and investigate the discrepancy', 'Declare recovery complete'], answer: 1, why: 'Evaluate independent resource evidence and its coverage, rather than treating output text as proof.' },
  { question: 'Three agents share one resource-visible subject. Which agent acted?', options: ['Always the release agent', 'These records may not uniquely attribute it', 'The fastest agent'], answer: 1, why: 'A shared subject alone does not identify the individual actor.' },
  { question: 'Deleting untrusted input stopped the symptom. Is the investigation finished?', options: ['Yes, always', 'No — address the architectural contributing conditions', 'Only the wording matters'], answer: 1, why: 'Broad permissions, weak gates and missing verification can permit the next trigger.' },
] as const;
