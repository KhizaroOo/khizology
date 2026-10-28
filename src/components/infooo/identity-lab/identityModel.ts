export type AgentId = 'research' | 'deploy' | 'report';
export type Architecture = 'shared' | 'dedicated';
export type Scope = 'repo.read' | 'repo.write' | 'staging.deploy' | 'production.deploy' | 'reports.read' | 'reports.write' | 'reports.send' | 'reports.delete' | 'calendar.read' | 'email.send' | 'expense.draft' | 'expense.approve' | 'bank.change';
export const resources: Record<Scope, string> = {
  'repo.read': 'Project repository', 'repo.write': 'Project repository', 'staging.deploy': 'Deployment service', 'production.deploy': 'Deployment service',
  'reports.read': 'Report store', 'reports.write': 'Report store', 'reports.send': 'Report store', 'reports.delete': 'Report store',
  'calendar.read': 'Calendar', 'email.send': 'Mail service', 'expense.draft': 'Expense service', 'expense.approve': 'Expense service', 'bank.change': 'Expense service',
};
export const agents = [
  { id: 'research', name: 'Research Agent', identity: 'agent-research-01', owner: 'Knowledge Team', purpose: 'Read approved technical sources', task: 'repo.read' },
  { id: 'deploy', name: 'Deploy Agent', identity: 'agent-deploy-02', owner: 'Platform Team', purpose: 'Deploy approved application releases', task: 'staging.deploy' },
  { id: 'report', name: 'Report Agent', identity: 'agent-report-03', owner: 'Insights Team', purpose: 'Generate reports', task: 'reports.write' },
] as const;
export interface Identity { id: AgentId; owner: string; purpose: string; scopes: Scope[]; status: 'active' | 'suspended' | 'revoked' | 'retired'; reviewed: boolean; projectActive: boolean; }
export interface Credential { subject: AgentId | 'shared'; audience: string; scopes: Scope[]; expires: number | null; revoked: boolean; }
export interface Audit { when: string; actor: string; identity: string; behalf: string; action: Scope; resource: string; result: string; authority: string; }
export interface Lab { architecture: Architecture; identities: Identity[]; credentials: Credential[]; now: number; audit: Audit[]; history: string[]; approval: boolean; }
export function initial(architecture: Architecture = 'shared'): Lab {
  const identities: Identity[] = agents.map(a => ({ id: a.id, owner: a.owner, purpose: a.purpose, scopes: [a.task, ...(a.id === 'deploy' ? ['production.deploy' as const] : [])], status: 'active', reviewed: true, projectActive: true }));
  const scopes = identities.flatMap(a => a.scopes);
  return { architecture, identities, credentials: architecture === 'shared' ? [{ subject: 'shared', audience: 'All three lab systems', scopes, expires: null, revoked: false }] : identities.map(a => ({ subject: a.id, audience: resources[agents.find(x => x.id === a.id)!.task], scopes: [...a.scopes], expires: null, revoked: false })), now: 0, audit: [], history: [], approval: false };
}
export function credentialFor(lab: Lab, id: AgentId) { return lab.credentials.find(c => c.subject === (lab.architecture === 'shared' ? 'shared' : id))!; }
export function authenticate(lab: Lab, id: AgentId) {
  const identity = lab.identities.find(a => a.id === id)!;
  const c = credentialFor(lab, id);
  return (lab.architecture === 'shared' || identity.status === 'active') && !c.revoked && (c.expires === null || lab.now < c.expires);
}
export function authorize(lab: Lab, id: AgentId, action: Scope, resource = resources[action]) {
  const c = credentialFor(lab, id);
  const identity = lab.identities.find(a => a.id === id)!;
  if (!authenticate(lab, id)) return { allowed: false, reason: 'Authentication blocked: identity suspended/revoked, credential revoked or expired.' };
  if (resource !== resources[action] || (lab.architecture === 'dedicated' && c.audience !== resource)) return { allowed: false, reason: 'Resource / audience mismatch.' };
  if (!c.scopes.includes(action) || (lab.architecture === 'dedicated' && !identity.scopes.includes(action))) return { allowed: false, reason: 'Authenticated, but this action is outside granted authority.' };
  if (lab.approval && action === 'production.deploy') return { allowed: false, reason: 'Production request held for independent workflow approval.' };
  return { allowed: true, reason: 'Current credential and resource policy permit this action.' };
}
export function attributeAction(lab: Lab, id: AgentId) { return lab.architecture === 'shared' ? { actor: 'shared-service-account', identity: 'shared-service-account' } : { actor: agents.find(a => a.id === id)!.name, identity: agents.find(a => a.id === id)!.identity }; }
export function act(lab: Lab, id: AgentId, action: Scope, behalf = 'Agent as itself'): Lab {
  const decision = authorize(lab, id, action);
  const event: Audit = { when: `14:${String(2 + lab.now + lab.audit.length).padStart(2, '0')}`, ...attributeAction(lab, id), behalf, action, resource: resources[action], result: decision.allowed ? 'ALLOWED · simulated success' : 'BLOCKED', authority: decision.reason };
  return { ...lab, audit: [...lab.audit, event] };
}
export function normalWork(lab: Lab) { return agents.reduce((next, a) => act(next, a.id, a.task), lab); }
export function revoke(lab: Lab, target: 'credential' | 'identity' | 'scope' | 'owner', id: AgentId = 'deploy'): Lab {
  if (lab.architecture === 'shared' && target === 'identity') return revoke(lab, 'credential', id);
  const owner = lab.identities.find(a => a.id === id)!.owner;
  const affected = target === 'owner' ? lab.identities.filter(a => a.owner === owner).map(a => a.id) : [id];
  return { ...lab,
    identities: lab.identities.map(a => target === 'identity' && a.id === id || target === 'owner' && affected.includes(a.id) ? { ...a, status: 'revoked' } : target === 'scope' && a.id === id ? { ...a, scopes: a.scopes.filter(s => s !== 'production.deploy') } : a),
    credentials: lab.credentials.map(c => target === 'credential' && c.subject === (lab.architecture === 'shared' ? 'shared' : id) || target === 'owner' && (c.subject === 'shared' || affected.includes(c.subject as AgentId)) ? { ...c, revoked: true } : target === 'scope' && (c.subject === id || c.subject === 'shared') ? { ...c, scopes: c.scopes.filter(s => s !== 'production.deploy') } : c),
    history: [...lab.history, `${target.toUpperCase()} revocation recorded; existing audit history retained.`],
  };
}
export function updateIdentity(lab: Lab, id: AgentId, patch: Partial<Identity>): Lab { return { ...lab, identities: lab.identities.map(a => a.id === id ? { ...a, ...patch, id } : a) }; }
export function narrowScope(lab: Lab, id: AgentId): Lab {
  const task = agents.find(a => a.id === id)!.task;
  const next = updateIdentity(lab, id, { scopes: [task] });
  return { ...next, credentials: next.credentials.map(c => c.subject === id ? { ...c, scopes: [task] } : c.subject === 'shared' ? { ...c, scopes: agents.map(a => a.task) } : c) };
}
export function issueCredential(lab: Lab, id: AgentId, shortLived = true): Lab {
  const identity = lab.identities.find(a => a.id === id)!;
  // Reissuing proof never silently reactivates a disabled identity.
  return { ...lab, credentials: lab.credentials.map(c => c.subject === (lab.architecture === 'shared' ? 'shared' : id) ? { ...c, revoked: false, expires: shortLived ? lab.now + 15 : null, scopes: lab.architecture === 'shared' ? lab.identities.flatMap(a => a.scopes) : [...identity.scopes] } : c) };
}
export function review(lab: Lab, id: AgentId) {
  const a = lab.identities.find(x => x.id === id)!;
  return !a.owner || !a.reviewed || !a.projectActive || a.purpose !== agents.find(agent => agent.id === id)!.purpose ? 'REVIEW REQUIRED' : a.status.toUpperCase();
}
export interface Delegation { from: string; to: string; scopes: Scope[]; expires: number; }
export function canDelegate(parent: Scope[], child: Scope[]) { return child.length > 0 && child.every(scope => parent.includes(scope)); }
export function delegateAuthority(parent: Delegation, to: string, scopes: Scope[], expires: number, now = 0): Delegation | null {
  return now < parent.expires && expires > now && expires <= parent.expires && canDelegate(parent.scopes, scopes) ? { from: parent.to, to, scopes: [...scopes], expires } : null;
}
export const delegationRoot: Delegation = { from: 'Example User', to: 'Orchestrator', scopes: ['reports.read'], expires: 15 };
export function traceDelegation(child: Delegation | null) { return child ? ['Example User', 'Orchestrator', child.to, 'Report store'] : ['Example User', 'Orchestrator', 'BLOCKED · authority cannot grow or outlive its parent']; }
export function delegatedAction(action: Scope, now: number, emailApproved: boolean | null, actingFor: boolean, approvedUntil = 10) {
  const scopes: Scope[] = actingFor ? ['calendar.read', ...(emailApproved ? ['email.send' as const] : [])] : ['reports.read'];
  const expires = actingFor ? (action === 'email.send' ? approvedUntil : 15) : null;
  const allowed = scopes.includes(action) && (expires === null || now < expires);
  return { actor: actingFor ? 'Travel Assistant' : 'Nightly Monitoring Agent', principal: actingFor ? 'Example User' : 'Workload itself', action, resource: resources[action], expires, allowed };
}
export const incidents = [
  { id: 'shared', title: 'Shared credential incident', why: 'The resource recorded one shared account, not which agent used it.', fix: 'Dedicated identity' },
  { id: 'revoke', title: 'Selective revocation failure', why: 'Revoking the shared credential stops all three dependent agents.', fix: 'Dedicated identity' },
  { id: 'broad', title: 'Over-broad agent', why: 'The identity is valid, but production authority exceeds the staging task.', fix: 'Narrow scope' },
  { id: 'expired', title: 'Expired authority', why: 'Fifteen simulated minutes passed; new actions now fail authentication.', fix: 'Re-authorize' },
  { id: 'orphan', title: 'Orphaned agent', why: 'The project retired; its valid credential and active identity did not retire automatically.', fix: 'Disable and revoke' },
  { id: 'escalation', title: 'Delegation escalation', why: 'Read authority cannot be expanded into delete authority by a child.', fix: 'Delegate read only' },
] as const;
export function incidentState(index: number): Lab {
  let lab = initial(index < 2 ? 'shared' : 'dedicated');
  if (index === 0) lab = act(lab, 'deploy', 'production.deploy');
  if (index === 1) lab = normalWork(revoke(lab, 'credential'));
  if (index === 2) lab = act(lab, 'deploy', 'production.deploy');
  if (index === 3) lab = act({ ...issueCredential(lab, 'deploy'), now: 15 }, 'deploy', 'staging.deploy');
  if (index === 4) lab = updateIdentity(lab, 'report', { owner: '', reviewed: false, projectActive: false });
  return lab;
}
export const layers = [
  ['Principal / human', 'The original person or workload whose authority is used.', 'Resource owner / organization', 'The actor and principal are confused.', 'Preserve actor and on-behalf-of context.'],
  ['Delegation', 'A bounded grant to act for another principal.', 'Delegator plus resource policy', 'A child requests more than its parent received.', 'Intersect scope, resource and lifetime at every hop.'],
  ['Agent identity', 'The attributable actor and its governance metadata.', 'Accountable organization / owner', 'Shared attribution or abandoned ownership.', 'Dedicated attribution, ownership and review.'],
  ['Credential', 'Proof presented for an identity, not the identity itself.', 'Issuer and credential holder', 'Stale, leaked or revoked proof is reused.', 'Bound audience, lifetime and revocation checks.'],
  ['Authorization', 'Whether this actor may do this action on this resource.', 'Resource policy', 'Known identity is mistaken for unlimited access.', 'Check precise action and resource.'],
  ['Policy', 'Rules enforced independently of the agent’s request.', 'System / resource administrator', 'Broad grants permit an unwanted action.', 'Least privilege and explicit approvals.'],
  ['Resource', 'The specific repository, deployment service or report store.', 'Resource owner', 'A grant for one service is accepted elsewhere.', 'Audience and resource binding.'],
  ['Audit', 'Who acted, for whom, where, when and with what result.', 'Application / security team', 'Shared logs cannot distinguish agents.', 'Record verified actor, principal, action and decision.'],
  ['Revocation', 'Stopping future accepted use of selected authority.', 'Authorized lifecycle operator', 'Coarse revocation stops unrelated actors.', 'Choose token, identity, scope or owner boundary.'],
] as const;
export const challenges = [
  { question: 'Three agents share one credential. Which identity problem does an incident expose?', options: ['Model too small', 'Attribution is ambiguous', 'Network too slow'], answer: 1, why: 'The resource sees the credential’s shared subject, not a unique agent.' },
  { question: 'Deploy Agent only needs staging. Which grant fits?', options: ['Full cloud admin', 'staging.deploy', 'All environments'], answer: 1, why: 'Grant the action and resource required for this task.' },
  { question: 'A retired project still has an active agent. What next?', options: ['Leave it active', 'Review, disable and revoke', 'Grant more scope'], answer: 1, why: 'Lifecycle review must remove unneeded authority and retain audit evidence.' },
  { question: 'Can a delegated reader give its child delete access?', options: ['Yes automatically', 'No — keep child authority within the parent grant', 'Only if a prompt says so'], answer: 1, why: 'This security model blocks authority the delegator does not possess.' },
] as const;
