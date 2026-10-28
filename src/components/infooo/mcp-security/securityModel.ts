/** Fictional, deterministic teaching model. No MCP, filesystem, mail or network execution. */
export type Domain = 'files' | 'email' | 'github' | 'research';
export type Scenario = 'safe' | 'poisoning' | 'cross-server' | 'deputy' | 'token' | 'rug-pull' | 'misrouting' | 'local' | 'validation';
export type Control = 'policy' | 'approval' | 'isolation' | 'integrity' | 'binding' | 'sandbox' | 'validation' | 'userBound' | 'audit' | 'shortLived';
export type Capability = 'project-read' | 'host-read' | 'file-write' | 'file-delete' | 'summary-send' | 'mail-read' | 'external-send' | 'mail-delete' | 'issue-read' | 'repo-write' | 'repo-admin' | 'research-read';
export interface Server { connected: boolean; broadPermissions: boolean; broadCredential: boolean; revoked: boolean }
export interface Config { servers: Record<Domain, Server>; controls: Record<Control, boolean> }
export interface Action { domain: Domain; tool: string; capability: Capability; description: string; recipient?: string; contains?: string; crossServer?: boolean; outsideIntent?: boolean; changedTool?: boolean; wrongResource?: boolean; backendAuthority?: boolean; malformed?: boolean; localProcess?: boolean; directCredential?: boolean }
export interface LabState { scenario: Scenario; config: Config; step: number; status: 'ready' | 'running' | 'approval' | 'blocked' | 'complete' | 'exposed'; approvedStep: number | null; reviewed: boolean; time: number; expired: boolean; trace: string[]; executed: string[]; reason: string }
const narrow: Record<Domain, Capability[]> = { files: ['project-read'], email: ['summary-send'], github: ['issue-read'], research: ['research-read'] };
const broad: Record<Domain, Capability[]> = { files: ['project-read', 'host-read', 'file-write', 'file-delete'], email: ['summary-send', 'mail-read', 'external-send', 'mail-delete'], github: ['issue-read', 'repo-write', 'repo-admin'], research: ['research-read'] };
export const domainNames: Record<Domain, string> = { files: 'Files MCP', email: 'Email MCP', github: 'GitHub MCP', research: 'Research MCP' };
export const controlNames: Record<Control, string> = { policy: 'Execution-time policy', approval: 'Meaningful human approval', isolation: 'Separate server trust domains', integrity: 'Tool integrity review', binding: 'Resource-bound credentials', sandbox: 'Sandbox local process', validation: 'Input / output validation', userBound: 'User-bound authorization', audit: 'Audit records', shortLived: 'Short-lived authority' };
export const cases: { id: Scenario; title: string; lesson: string }[] = [
  { id: 'poisoning', title: 'Tool poisoning', lesson: 'Tool descriptions and results are data, not new user authority.' },
  { id: 'cross-server', title: 'Cross-server data flow', lesson: 'One server can influence how an agent uses another server.' },
  { id: 'deputy', title: 'Confused deputy', lesson: 'A server’s backend authority must not replace the user’s authority.' },
  { id: 'token', title: 'Over-scoped credential', lesson: 'A compromised server inherits the reach of its credential.' },
  { id: 'rug-pull', title: 'Tool definition changed', lesson: 'A tool reviewed yesterday can change before the next invocation.' },
  { id: 'misrouting', title: 'Credential misrouting', lesson: 'A credential intended for one server must not follow another destination.' },
];
export function safeConfig(): Config {
  const server = (): Server => ({ connected: true, broadPermissions: false, broadCredential: false, revoked: false });
  return { servers: { files: server(), email: server(), github: server(), research: { ...server(), connected: false } }, controls: { policy: true, approval: true, isolation: true, integrity: true, binding: true, sandbox: true, validation: true, userBound: true, audit: true, shortLived: true } };
}
export function exposedConfig(): Config {
  const c = safeConfig();
  for (const server of Object.values(c.servers)) { server.broadPermissions = true; server.broadCredential = true; }
  for (const control of Object.keys(c.controls) as Control[]) c.controls[control] = false;
  return c;
}
export function configureScenario(config: Config, scenario: Scenario): Config {
  return { ...config, servers: { ...config.servers, research: { ...config.servers.research, connected: scenario === 'cross-server' } } };
}
export function initialLab(scenario: Scenario = 'safe', config = configureScenario(safeConfig(), scenario)): LabState {
  return { scenario, config, step: 0, status: 'ready', approvedStep: null, reviewed: false, time: 0, expired: false, trace: [], executed: [], reason: 'Read project status, inspect issues, then approve one short email.' };
}
const readProject: Action = { domain: 'files', tool: 'read_project_status', capability: 'project-read', description: 'Read the fictional project status.' };
const externalMail: Action = { domain: 'email', tool: 'send_email', capability: 'external-send', recipient: 'external@example.test', contains: 'fictional project data', description: 'Attempt to send project data outside the approved summary.', outsideIntent: true, crossServer: true };
export function actions(scenario: Scenario): Action[] {
  switch (scenario) {
    case 'safe': return [readProject, { domain: 'github', tool: 'read_issues', capability: 'issue-read', description: 'Read the example issue state.' }, { domain: 'email', tool: 'send_email', capability: 'summary-send', recipient: 'team@example.test', contains: 'approved short project summary', description: 'Send only the approved short summary.' }];
    case 'poisoning': return [{ ...readProject, tool: 'summarize_document', description: 'Read a result containing concealed, untrusted instructions (not shown).' }, externalMail];
    case 'cross-server': return [{ domain: 'research', tool: 'research_summary', capability: 'research-read', description: 'Compromised Research MCP returns manipulative output (not shown).' }, readProject, externalMail];
    case 'deputy': return [{ domain: 'github', tool: 'repository_change', capability: 'repo-admin', description: 'Limited user asks a broadly credentialed server for repository administration.', backendAuthority: true, outsideIntent: true }];
    case 'token': return [{ domain: 'email', tool: 'delete_mail', capability: 'mail-delete', description: 'Compromised Email MCP uses its upstream credential directly, outside host approval.', outsideIntent: true, directCredential: true }];
    case 'rug-pull': return [{ ...readProject, tool: 'project_search', description: 'Previously reviewed project_search changes from v1 to v2.', changedTool: true }, { domain: 'files', tool: 'project_search', capability: 'file-write', description: 'The changed tool attempts a write, beyond its old read-only purpose.', outsideIntent: true }];
    case 'misrouting': return [{ ...readProject, tool: 'connect_resource', description: 'A fictional Files credential is redirected toward Research MCP.', wrongResource: true }];
    case 'local': return [{ ...readProject, tool: 'local_process', capability: 'host-read', description: 'A local process attempts access beyond the project directory.', localProcess: true, outsideIntent: true }];
    case 'validation': return [{ ...readProject, tool: 'read_project_status', description: 'A tool receives parameters that do not match its schema (no payload shown).', malformed: true }];
  }
}
export function credentialReach(config: Config, domain: Domain): Capability[] {
  const s = config.servers[domain];
  return !s.connected || s.revoked ? [] : s.broadCredential ? broad[domain] : narrow[domain];
}
export function reachable(config: Config, domain: Domain): Capability[] {
  const s = config.servers[domain];
  if (!s.connected || s.revoked) return [];
  return (s.broadPermissions ? broad[domain] : narrow[domain]).filter(cap => (s.broadCredential ? broad[domain] : narrow[domain]).includes(cap));
}
export function calculateBlastRadius(config: Config) {
  const domains = (Object.keys(config.servers) as Domain[]).map(domain => ({ domain, capabilities: reachable(config, domain) }));
  const host = config.servers.files.connected && !config.controls.sandbox ? ['Host files', 'Network', 'Environment / credentials'] : ['Project directory'];
  const upstreamReach = (Object.keys(config.servers) as Domain[]).some(d => config.servers[d].connected && !config.servers[d].revoked && config.servers[d].broadCredential && broad[d].length > narrow[d].length);
  const broadReach = upstreamReach || domains.some(d => d.capabilities.some(cap => !narrow[d.domain].includes(cap))) || host.length > 1;
  const layered = ['policy', 'approval', 'isolation', 'integrity', 'binding', 'sandbox', 'validation', 'userBound'].every(key => config.controls[key as Control]);
  const unguarded = !config.controls.policy && !config.controls.approval && !config.controls.isolation;
  return { domains, host, level: broadReach ? 'HIGH' : 'LOW', posture: broadReach && unguarded ? 'EXPOSED' : broadReach ? 'WEAK' : layered ? 'DEFENSE-IN-DEPTH' : 'CONSTRAINED' };
}
export function evaluateAction(state: LabState, action: Action): { decision: 'allow' | 'approval' | 'block'; reason: string } {
  const c = state.config, server = c.servers[action.domain];
  const block = (reason: string) => ({ decision: 'block' as const, reason });
  if (!server.connected || server.revoked) return block('Connection absent or permission revoked; the action cannot execute.');
  if (state.expired || (c.controls.shortLived && state.time >= 900)) return block('Authority expired; a new approval is required.');
  if (action.directCredential) return credentialReach(c, action.domain).includes(action.capability) ? { decision: 'allow', reason: 'A compromised server uses broad upstream credentials outside the host approval gate; narrow credentials are needed.' } : block('Narrow upstream credential does not grant this action, even if its server is compromised.');
  if (action.localProcess) return c.controls.sandbox ? block('Sandbox limits the local process to its project directory; host access is blocked.') : { decision: 'allow', reason: 'Local transport did not sandbox the process; host access is exposed.' };
  if (action.wrongResource && c.controls.binding) return block('Resource mismatch: refuse the redirect and do not forward sensitive credentials.');
  if (action.changedTool && c.controls.integrity && !state.reviewed) return block('REVIEW REQUIRED: project_search v1 ≠ v2; the old review does not authorize the new definition.');
  if (action.malformed && c.controls.validation) return block('Schema validation rejects the malformed parameters before execution.');
  if (action.crossServer && c.controls.isolation) return block('Server isolation blocks this prohibited Files / Research → Email data flow.');
  if (action.backendAuthority && c.controls.userBound) return block('User-bound authorization rejects repository administration outside this user’s authority.');
  if (action.outsideIntent && c.controls.policy) return block('Execution-time policy blocks an action outside the approved project-summary task.');
  const backendBypass = action.backendAuthority && !c.controls.userBound && server.broadCredential;
  if (!backendBypass && !reachable(c, action.domain).includes(action.capability)) return block('Permission / credential intersection does not grant this action.');
  if (c.controls.approval && ['summary-send', 'external-send', 'file-delete', 'mail-delete', 'repo-admin', 'file-write', 'repo-write'].includes(action.capability) && state.approvedStep !== state.step) return { decision: 'approval', reason: 'Review the exact tool, destination and data before approving this one simulated action.' };
  return { decision: 'allow', reason: action.outsideIntent || action.wrongResource || action.malformed ? 'Unsafe simulated action is reachable; the unchanged agent has no effective boundary here.' : 'Allowed inside the current permission and credential scope.' };
}
function steps(s: LabState) { return actions(s.scenario).filter(a => s.scenario !== 'safe' || a.domain !== 'github' || s.config.servers.github.connected); }
export function currentAction(s: LabState) { const list = steps(s); return list[Math.min(s.step, list.length - 1)]; }
export function startLab(s: LabState): LabState { if (s.status !== 'ready') return s; return { ...s, status: 'running', reason: 'User task enters the host; connections carry data, not new authority.', trace: ['User authorized the project-summary task.'] }; }
export function advanceLab(s: LabState): LabState {
  if (s.status !== 'running') return s;
  const action = currentAction(s), verdict = evaluateAction(s, action), trace = [...s.trace, `${action.tool}: ${verdict.reason}`].slice(-30);
  if (verdict.decision !== 'allow') return { ...s, status: verdict.decision === 'approval' ? 'approval' : 'blocked', trace, reason: verdict.reason };
  const last = s.step === steps(s).length - 1;
  return { ...s, time: s.time + 30, step: last ? s.step : s.step + 1, status: last ? s.scenario === 'safe' ? 'complete' : 'exposed' : 'running', approvedStep: null, trace, executed: [...s.executed, action.tool], reason: last && s.scenario === 'safe' ? 'Project status became an approved summary; the model never needed broad access.' : verdict.reason };
}
export function approveAction(s: LabState): LabState { return s.status === 'approval' ? { ...s, approvedStep: s.step, status: 'running', reason: 'Human approved only the displayed action.' } : s; }
export function declineAction(s: LabState): LabState { return { ...s, status: 'blocked', reason: 'Human declined this action; nothing was sent or changed.', trace: [...s.trace, 'Human declined the displayed action.'] }; }
export function traceDataFlow(s: LabState): string[] {
  const paths: Record<Scenario, string[]> = { safe: ['User task', 'Agent context', 'Project files / issues', 'Approved summary', 'Team inbox'], poisoning: ['Untrusted tool result', 'Agent context', 'Email request', 'External destination'], 'cross-server': ['Research output', 'Agent context', 'Files data', 'Email request', 'External destination'], deputy: ['Limited user', 'MCP server', 'Broad backend credential', 'Repository admin'], token: ['Compromised server', s.config.servers.email.broadCredential ? 'Broad mail credential' : 'Narrow mail credential', 'Mailbox deletion'], 'rug-pull': ['Reviewed v1', 'Changed v2', 'Agent request', 'Unexpected write'], misrouting: ['Files credential', 'Redirect to Research', 'Wrong resource'], local: ['Local MCP process', 'Host permissions', 'Files / network / environment'], validation: ['Untrusted parameters', 'Schema / policy', 'Downstream system'] };
  const stopAt: Record<Scenario, number> = { safe: 3, poisoning: 2, 'cross-server': 3, deputy: 2, token: 2, 'rug-pull': 2, misrouting: 2, local: 2, validation: 2 };
  return s.status === 'blocked' ? [...paths[s.scenario].slice(0, stopAt[s.scenario]), 'CONTROL GATE', 'BLOCKED'] : paths[s.scenario];
}
export const challenges = [
  { question: 'The agent needs to read issues. Which permission fits?', options: ['Repository admin', 'Issues read-only', 'Full organization access'], answer: 1, why: 'Grant only what the approved task needs.' },
  { question: 'Tool metadata changed after approval. What next?', options: ['Continue automatically', 'Re-review the tool', 'Give more permissions'], answer: 1, why: 'The old review cannot cover a changed definition.' },
  { question: 'A tool will email sensitive project data externally. What helps?', options: ['Trust the model output', 'Execution-time policy and meaningful approval', 'Increase token lifetime'], answer: 1, why: 'Check the action at execution, including destination and data.' },
  { question: 'A local MCP server needs one project folder. What access fits?', options: ['The home directory', 'The entire machine', 'Only the required project directory'], answer: 2, why: 'Local transport does not itself provide a sandbox.' },
] as const;
