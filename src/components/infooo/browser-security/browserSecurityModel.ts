export const capabilities = { read: 'Read web', download: 'Download file', message: 'Send message', files: 'Access local files', purchase: 'Make purchase', account: 'Change account' } as const;
export type Capability = keyof typeof capabilities;
export const controlNames = { untrusted: 'Treat web as untrusted', intent: 'Intent binding', privilege: 'Least privilege', context: 'Minimum context', approval: 'Approval gate', destination: 'Destination policy', validation: 'Action validation', isolated: 'Isolated session', filter: 'Sensitive data filter', audit: 'Audit trail' } as const;
export type Control = keyof typeof controlNames;
export type Controls = Record<Control, boolean>;
export const weak = (): Controls => Object.fromEntries(Object.keys(controlNames).map(k => [k, false])) as Controls;
export const strong = (): Controls => Object.fromEntries(Object.keys(controlNames).map(k => [k, true])) as Controls;
export const broad = (): Record<Capability, boolean> => ({ read: true, download: true, message: true, files: true, purchase: true, account: true });
export const scenarios = [
  { id: 'webpage', label: 'Webpage injection', medium: 'DOM text', action: 'Send unrelated account summary', capability: 'message', destination: 'outside.example', price: 0, sensitive: true, why: 'A page instruction tries to turn reading hotel details into sending unrelated information.' },
  { id: 'hidden', label: 'Hidden instruction', medium: 'Agent-processed page content', action: 'Download unrelated file', capability: 'download', destination: 'outside.example', price: 0, sensitive: false, why: 'The agent processes an abstract instruction that the human-facing listing does not show.' },
  { id: 'image', label: 'Multimodal injection', medium: 'Image interpretation', action: 'Change unrelated account settings', capability: 'account', destination: 'account.example', price: 0, sensitive: false, why: 'Image-derived content remains untrusted even when a vision model interprets it.' },
  { id: 'cross-site', label: 'Cross-site action', medium: 'Comment on a hotel page', action: 'Send message through another service', capability: 'message', destination: 'mail.example', price: 0, sensitive: false, why: 'A hotel page has no authority to order actions on a separate messaging service.' },
  { id: 'data', label: 'Sensitive-data request', medium: 'Embedded document', action: 'Upload unrelated work document', capability: 'files', destination: 'outside.example', price: 0, sensitive: true, why: 'Broad context and file access make unrelated information reachable if manipulation succeeds.' },
  { id: 'purchase', label: 'Purchase manipulation', medium: 'Hotel advertisement', action: 'Purchase unrelated package', capability: 'purchase', destination: 'deals.example', price: 640, sensitive: false, why: 'The proposed recipient and $640 amount do not match the requested hotel or $200 limit.' },
] as const;
export type Scenario = typeof scenarios[number]['id'];
export interface Action { label: string; capability: Capability; destination: string; price: number; sensitive: boolean; source: 'user' | 'web'; matches: boolean; }
export interface Experiment { scenario: Scenario | 'safe'; controls: Controls; permissions: Record<Capability, boolean>; step: number; decision: 'ready' | 'running' | 'blocked' | 'approval' | 'executed' | 'denied'; approved: boolean; }
export const stages = ['User goal', 'Agent', 'Browser observation', 'Content classification', 'Action proposal', 'Policy', 'Permission', 'Approval', 'Execution'];
export function initial(scenario: Experiment['scenario'] = 'safe', controls = scenario === 'safe' ? strong() : weak()): Experiment { return { scenario, controls, permissions: broad(), step: 0, decision: 'ready', approved: false }; }
export function classifyContent(_medium: string) { return 'UNTRUSTED CONTENT' as const; }
export function proposal(s: Experiment): Action {
  if (s.scenario === 'safe') return { label: 'Book Harbor Example Hotel', capability: 'purchase', destination: 'hotel.example', price: 182, sensitive: false, source: 'user', matches: true };
  const a = scenarios.find(x => x.id === s.scenario)!;
  return { label: a.action, capability: a.capability, destination: a.destination, price: a.price, sensitive: a.sensitive, source: 'web', matches: false };
}
export function exposedContext(s: Experiment) { return s.controls.context ? ['Travel preferences'] : ['Travel preferences', 'Billing token placeholder', 'Private note (fictional)', 'Work document (fictional)']; }
export function effectivePermissions(s: Experiment) { return Object.fromEntries(Object.entries(s.permissions).map(([k,v]) => [k, v && (!s.controls.privilege || k === 'read' || (s.scenario === 'safe' && k === 'purchase'))])) as Record<Capability, boolean>; }
export function blastRadius(s: Experiment) {
  const p = effectivePermissions(s);
  return ['Browser session', ...(p.message ? ['Email / external services'] : []), ...(p.files ? ['Local files'] : []), ...(p.download ? ['Downloads'] : []), ...(p.purchase ? ['Payment'] : []), ...(p.account ? ['Account'] : [])];
}
export function checks(s: Experiment) {
  const a = proposal(s), attack = a.source === 'web';
  return [
    { layer: 'Policy', pass: !(attack && s.controls.untrusted), reason: 'Untrusted page instruction rejected; page content cannot authorize a new task.' },
    { layer: 'Policy', pass: !s.controls.intent || a.matches, reason: 'Action does not match the original user intent.' },
    { layer: 'Policy', pass: !s.controls.destination || a.destination === 'hotel.example', reason: 'Destination is outside the allowed hotel recipient.' },
    { layer: 'Policy', pass: !s.controls.validation || (a.matches && a.price <= 200), reason: 'Action, amount or recipient fails validation against the user request.' },
    { layer: 'Policy', pass: !s.controls.filter || !a.sensitive, reason: 'Sensitive-data filter stops this fictional disclosure.' },
    { layer: 'Permission', pass: effectivePermissions(s).read, reason: 'Reading the page is not permitted.' },
    { layer: 'Permission', pass: effectivePermissions(s)[a.capability], reason: 'Required capability is unavailable.' },
    { layer: 'Permission', pass: !a.sensitive || !s.controls.context, reason: 'Unrelated private context is unavailable.' },
    { layer: 'Permission', pass: !s.controls.isolated || a.destination === 'hotel.example', reason: 'Isolated hotel session cannot act on another service.' },
  ];
}
export function evaluate(s: Experiment) { const all = checks(s); return !effectivePermissions(s).read ? all.find(c => c.reason === 'Reading the page is not permitted.') : all.find(c => !c.pass); }
export function advance(s: Experiment): Experiment {
  if (!['ready', 'running'].includes(s.decision)) return s;
  const next = { ...s, step: Math.min(s.step + 1, 8), decision: 'running' as Experiment['decision'] };
  if (next.step >= 2 && !effectivePermissions(next).read) return { ...next, step: 2, decision: 'blocked' };
  const failure = evaluate(next);
  if (next.step >= 5 && failure?.layer === 'Policy') return { ...next, step: 5, decision: 'blocked' };
  if (next.step >= 6 && failure?.layer === 'Permission') return { ...next, step: 6, decision: 'blocked' };
  if (next.step >= 7 && next.controls.approval && !next.approved) return { ...next, step: 7, decision: 'approval' };
  if (next.step === 8) return { ...next, decision: 'executed' };
  return next;
}
export function approve(s: Experiment, allow: boolean): Experiment {
  if (s.decision !== 'approval') return s;
  // Approval is bound to this immutable proposal, not a reusable permission grant.
  if (!allow) return { ...s, decision: 'denied' };
  if (evaluate(s)) return { ...s, decision: 'blocked' };
  return { ...s, approved: true, decision: 'running' };
}
export function finish(s: Experiment) { for (let i = 0; i < 9 && ['ready','running'].includes(s.decision); i++) s = advance(s); return s; }
export function posture(s: Experiment) { const c = s.controls; return c.intent && c.privilege && c.context && c.approval && c.destination ? 'DEFENSE-IN-DEPTH' : c.privilege && c.context ? 'CONSTRAINED' : Object.values(c).some(Boolean) ? 'GUARDED' : 'EXPOSED'; }
export const challenges = [
  { question: 'A page asks the agent to send account history. Who authorized that?', options: ['User', 'Website', 'Nobody'], answer: 2, why: 'A page can request something; it cannot supply the user’s authorization.' },
  { question: 'The task is to compare products. What context belongs in the session?', options: ['Entire filesystem', 'Only relevant shopping context', 'All company documents'], answer: 1, why: 'Unneeded information increases potential exposure without helping the task.' },
  { question: 'A proposed purchase exceeds the user’s price limit. What next?', options: ['Proceed', 'Ask the webpage', 'Block / require new user authorization'], answer: 2, why: 'Approval must be specific to the recipient, amount and purpose.' },
  { question: 'The injection detector is imperfect. What else matters?', options: ['Nothing', 'Limit permissions and high-impact actions', 'Give admin access'], answer: 1, why: 'Independent action controls limit consequences even when content manipulation succeeds.' },
];
export const xray = [
  ['User goal', 'Defines the task and $200 limit.', 'The actual user request.', 'A vague scope permits drift.', 'Specific intent and limits.'],
  ['Agent', 'Interprets observations and proposes actions.', 'System rules and authorized user intent.', 'Can be manipulated by external content.', 'Separate interpretation from action authority.'],
  ['Browser observation', 'Collects page information.', 'No external content as authority.', 'Hidden or image-derived content may be processed.', 'Preserve provenance and isolate sessions.'],
  ['Content classification', 'Labels source and trust.', 'Provenance, not domain reputation alone.', 'A detector can miss manipulation.', 'Treat external content as data by default.'],
  ['Action proposal', 'Describes the requested effect.', 'Explicit action, recipient and amount.', 'A page request can become a harmful proposal.', 'Bind the action to the original goal.'],
  ['Policy', 'Checks intent, destination and values.', 'Application-owned rules.', 'A weak policy accepts unrelated work.', 'Independent validation and data filters.'],
  ['Permission', 'Limits available tools and data.', 'Explicitly granted capability scope.', 'Broad access expands consequences.', 'Least privilege and minimum context.'],
  ['Approval', 'Asks about a specific high-impact action.', 'Informed approval for this exact proposal.', 'A vague yes can hide a changed recipient.', 'Show action, source, amount and destination.'],
  ['Execution', 'Applies the permitted effect.', 'All required gates, not the page.', 'Observation alone cannot undo damage.', 'Bounded execution and audit evidence.'],
];
