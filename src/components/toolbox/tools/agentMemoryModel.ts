const choices = (...pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
export const memoryQuestions = [
  { id: 'agent', label: 'Agent type', options: choices(['personal', 'Personal Assistant'], ['coding', 'Coding Agent'], ['research', 'Research Agent'], ['support', 'Support Agent'], ['sales', 'Sales Agent'], ['operations', 'Operations Agent'], ['multi', 'Multi-Agent System'], ['custom', 'Custom']) },
  { id: 'scope', label: 'User scope', options: choices(['user', 'One user'], ['team', 'Team'], ['organization', 'Organization'], ['customers', 'Many customers'], ['public', 'Public / shared']) },
  { id: 'duration', label: 'Task duration', options: choices(['session', 'One session'], ['recurring', 'Recurring'], ['long', 'Long-running'], ['service', 'Permanent service']) },
  { id: 'crossSession', label: 'Cross-session need', options: choices(['no', 'No'], ['some', 'Some memory'], ['yes', 'Yes']) },
  { id: 'sensitivity', label: 'Sensitive data', options: choices(['none', 'None'], ['internal', 'Internal'], ['personal', 'Personal'], ['confidential', 'Confidential'], ['high', 'Highly sensitive']) },
  { id: 'sharing', label: 'Permitted sharing boundary', options: choices(['none', 'None'], ['user', 'Same user'], ['project', 'Same project'], ['team', 'Team'], ['organization', 'Organization'], ['agents', 'Agents']) },
  { id: 'personalization', label: 'Personalization need', advanced: true, options: choices(['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']) },
  { id: 'workflow', label: 'Remember successful procedures?', advanced: true, options: choices(['no', 'No'], ['maybe', 'Maybe'], ['yes', 'Yes']) },
  { id: 'changeRate', label: 'Memory change rate', advanced: true, options: choices(['stable', 'Mostly stable'], ['periodic', 'Periodically changing'], ['frequent', 'Frequently changing']) },
  { id: 'risk', label: 'Risk level', advanced: true, options: choices(['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High'], ['critical', 'Critical']) },
  { id: 'retention', label: 'Proposed retention window', advanced: true, options: choices(['session', 'Session / task only'], ['hours', 'Hours'], ['days', 'Days'], ['months', 'Months'], ['indefinite', 'Indefinite requested'], ['review', 'Custom review before expiry']) },
  { id: 'source', label: 'Candidate source', advanced: true, options: choices(['confirmed', 'Owner-confirmed information'], ['mixed', 'Mixed internal and external sources'], ['external', 'Unverified external content']) },
  { id: 'collection', label: 'Expected curated collection', advanced: true, options: choices(['small', 'Small / directly addressable'], ['large', 'Large / semantic lookup useful']) },
] as const;
export type MemoryAnswers = Record<typeof memoryQuestions[number]['id'], string>;
export const memoryDefaults: MemoryAnswers = { agent: 'coding', scope: 'user', duration: 'recurring', crossSession: 'some', sensitivity: 'internal', sharing: 'project', personalization: 'low', workflow: 'maybe', changeRate: 'periodic', risk: 'moderate', retention: 'review', source: 'mixed', collection: 'small' };
export const memoryPresets: { name: string; answers: MemoryAnswers }[] = [
  { name: 'Personal Assistant', answers: { ...memoryDefaults, agent: 'personal', sharing: 'user', sensitivity: 'personal', personalization: 'high', source: 'confirmed', workflow: 'no' } },
  { name: 'Coding Agent', answers: { ...memoryDefaults, workflow: 'yes', source: 'confirmed' } },
  { name: 'Customer Support', answers: { ...memoryDefaults, agent: 'support', scope: 'customers', duration: 'service', sensitivity: 'personal', sharing: 'team', personalization: 'medium', workflow: 'yes', risk: 'high', source: 'mixed' } },
  { name: 'Research Agent', answers: { ...memoryDefaults, agent: 'research', source: 'external', collection: 'large', sharing: 'project', personalization: 'none', changeRate: 'frequent' } },
  { name: 'Multi-Agent Team', answers: { ...memoryDefaults, agent: 'multi', scope: 'team', sharing: 'agents', workflow: 'yes', risk: 'high' } },
  { name: 'Regulated Enterprise Agent', answers: { ...memoryDefaults, agent: 'operations', scope: 'organization', duration: 'service', sensitivity: 'high', risk: 'critical', sharing: 'organization', retention: 'review', workflow: 'yes' } },
  { name: 'Stateless Tool', answers: { ...memoryDefaults, agent: 'custom', scope: 'user', duration: 'session', crossSession: 'no', sensitivity: 'none', sharing: 'none', personalization: 'none', workflow: 'no', risk: 'low', retention: 'session', source: 'confirmed' } },
];
export const memoryCandidates = [
  { id: 'preferences', label: 'User preferences', type: 'Semantic' },
  { id: 'decisions', label: 'Decisions', type: 'Episodic' },
  { id: 'projectFacts', label: 'Project facts', type: 'Semantic' },
  { id: 'results', label: 'Task results', type: 'Episodic' },
  { id: 'procedures', label: 'Procedures', type: 'Procedural' },
  { id: 'corrections', label: 'Corrections', type: 'Semantic' },
  { id: 'entities', label: 'Entity facts', type: 'Semantic' },
  { id: 'constraints', label: 'Constraints', type: 'Semantic' },
  { id: 'workflows', label: 'Successful workflows', type: 'Procedural' },
] as const;
export type MemoryCandidate = typeof memoryCandidates[number]['id'];
export type MemoryAction = 'Remember' | 'Temporary' | 'Do not remember' | 'Context required';
export const memoryActions: MemoryAction[] = ['Remember', 'Temporary', 'Do not remember', 'Context required'];
export type MemoryOverrides = Partial<Record<MemoryCandidate, MemoryAction>>;
export const memoryProhibitions = [
  ['Passwords, API keys, secrets, authentication tokens and one-time codes', 'Do not remember', 'Never put credentials in agent memory; use a separate authorized secret mechanism.'],
  ['Raw private payloads and unnecessary personal data', 'Do not remember', 'Minimize or omit; a useful distilled fact still needs purpose, scope and approval.'],
  ['Raw external pages, attacker instructions and unverified agent claims', 'Do not remember', 'Keep untrusted reference material separate; verify a distilled candidate before any promotion.'],
  ['Full raw conversations and noisy intermediate reasoning', 'Do not remember', 'Prefer minimal curated facts; do not accumulate transcripts as memory.'],
  ['Current errors, temporary plans and tool state', 'Temporary', 'Use for the active task only; retain a reviewed lesson separately if genuinely useful.'],
] as const;

export function planAgentMemory(a: MemoryAnswers, overrides: MemoryOverrides = {}) {
  for (const q of memoryQuestions) if (!q.options.some(o => o.value === a[q.id])) throw new Error(`Choose a valid answer for ${q.label}.`);
  for (const [id, action] of Object.entries(overrides)) if (!memoryCandidates.some(c => c.id === id) || !memoryActions.includes(action)) throw new Error('Choose a supported memory candidate and action.');
  const durable = a.crossSession !== 'no' && a.retention !== 'session';
  const sensitive = ['personal', 'confidential', 'high'].includes(a.sensitivity);
  const highRisk = ['high', 'critical'].includes(a.risk);
  const tenant = ['customers', 'public'].includes(a.scope);
  const multi = a.agent === 'multi';
  const shared = durable && !['none', 'user'].includes(a.sharing);
  const warnings: string[] = [];
  if (a.duration === 'session' && durable) warnings.push('Only one session is expected. Justify each proposed cross-session record; otherwise choose session-only retention.');
  if (!durable && (a.crossSession !== 'no' || a.retention !== 'session' || !['none', 'user'].includes(a.sharing))) warnings.push('Cross-session and retention choices do not permit durable storage together. This plan stays session-only; shared durable memory is disabled.');
  if (sensitive) warnings.push('Minimize personal/confidential content, confirm a legitimate purpose and user expectations, and approve an exact retention/deletion policy before writes. This is not a compliance determination.');
  if (a.retention === 'indefinite') warnings.push('Indefinite is not a default license to keep data forever. Use a documented purpose, accountable owner and scheduled review; sensitive or frequently changing memory needs a bounded expiry.');
  if (tenant) warnings.push('Isolate tenant AND customer/user memory at every read, write, index and cache. Public access to the service does not make private memory public. Share only separately approved, non-customer reference knowledge.');
  if (shared) warnings.push('Sharing permission is a proposed boundary, not authorization. Filter by authenticated owner/tenant/project and explicit ACLs; never let a prompt choose another user’s namespace.');
  if (a.source !== 'confirmed') warnings.push('Unverified external or agent-generated content must not become trusted memory. Quarantine candidates separately, preserve provenance and require verification before promotion.');
  if (multi) warnings.push('Keep private per-agent/task scratchpads separate. Shared poisoned memory can affect every agent; transfer only explicitly approved, attributed records within the same authorized boundary.');
  const owner = tenant ? 'Authenticated tenant + customer/user' : a.agent === 'coding' ? 'Authenticated owner + project' : a.scope === 'user' ? 'Authenticated user' : 'Authenticated organization/team + owner';
  const scope = `${owner}${multi ? ' + agent/task for private working state' : ''}`;
  const retention = !durable ? 'Session / task; clear at completion' : a.retention === 'indefinite' && (sensitive || a.changeRate === 'frequent') ? 'Bounded expiry required; exact window awaits owner approval' : a.retention === 'indefinite' ? 'Owner-approved ongoing purpose with scheduled review; explicit deletion still required' : a.retention === 'review' ? 'Custom review and exact expiry to be approved by the owner' : `${a.retention[0].toUpperCase()}${a.retention.slice(1)}; owner must set the exact expiry`;
  const rows = memoryCandidates.map(c => {
    let action: MemoryAction = 'Remember';
    let why = 'Keep only a useful, verified, distilled record with an accountable owner.';
    if (c.id === 'preferences' && a.personalization === 'none') { action = 'Do not remember'; why = 'No personalization need was declared.'; }
    if (['procedures', 'workflows'].includes(c.id)) {
      action = a.workflow === 'no' ? 'Do not remember' : a.workflow === 'maybe' ? 'Context required' : 'Remember';
      why = a.workflow === 'no' ? 'Procedure learning is not needed.' : 'Keep only tested procedures; observed success alone is not authority to change operating instructions.';
    }
    if (['entities', 'corrections'].includes(c.id)) { action = 'Context required'; why = 'Verify the claim, scope and effective date; a correction must not silently replace an authoritative fact.'; }
    const requested = overrides[c.id];
    if (requested) { action = requested; why = 'Owner-selected planning choice; validation, minimization and scope controls still apply.'; }
    if (action === 'Remember' && (a.source !== 'confirmed' || highRisk || a.sensitivity === 'high')) { action = 'Context required'; why = 'Verify provenance, resolve conflicts and obtain accountable approval before a durable write.'; }
    if (!durable && (action === 'Remember' || action === 'Context required')) {
      if (requested === 'Remember') warnings.push(`${c.label}: durable capture was requested but cross-session/retention policy allows temporary use only.`);
      action = 'Temporary'; why = 'Use only while this task needs it; cross-session/retention policy does not permit durable memory.';
    }
    const lifetime = action === 'Do not remember' ? 'None' : action === 'Temporary' ? 'Session / task' : `${action === 'Context required' ? 'No durable write until approved. ' : ''}${c.type === 'Episodic' ? 'Selective event record; ' : c.type === 'Procedural' ? 'Versioned procedure; ' : ''}${retention}${a.changeRate === 'frequent' ? '; revalidate before use' : ''}`;
    return { ...c, action, lifetime, why, scope };
  });
  const durableRows = rows.filter(r => ['Remember', 'Context required'].includes(r.action));
  const hasDurable = durable && durableRows.length > 0;
  const semanticIndex = hasDurable && a.collection === 'large';
  const fileBased = hasDurable && a.scope === 'user' && !sensitive && !highRisk && !semanticIndex;
  const storage = !hasDurable ? ['In-memory session state only'] : ['In-memory session state', fileBased ? 'Owner/project-scoped inspectable files' : 'Structured durable records with owner/tenant ACLs', ...(semanticIndex ? ['Optional semantic index over approved records; not the source of truth'] : [])];
  const strategy = !hasDurable ? 'Session-only working memory' : semanticIndex ? 'Structured memory + optional semantic retrieval index' : fileBased ? 'Session state + scoped file-based durable memory' : 'Session state + structured durable memory';
  const retrieval = !hasDurable ? ['Current task', 'Session scope', 'Validated working state', 'Minimum context'] : ['Authenticated scope / ACL filter', 'Trust + verification + expiry filter', semanticIndex ? 'Relevance candidates within authorized records' : 'On-demand exact / metadata lookup', a.changeRate === 'frequent' ? 'Freshness / current-version check' : 'Relevance + freshness + trust ranking', 'Bounded memories with citations'];
  const types = [
    { name: 'Working', guidance: a.duration === 'service' ? 'Request/task-scoped state, not one ever-growing service transcript; clear each completed task.' : a.duration === 'long' ? 'Bounded task state with cleanup and freshness checks; recovery checkpoints need a separate approved retention policy.' : 'Current task, recent messages, temporary plan and tool state; clear at task/session end.' },
    { name: 'Semantic', guidance: hasDurable && durableRows.some(r => r.type === 'Semantic') ? 'Selected preferences, facts and constraints; verify owner, source and effective version before writing.' : 'No durable semantic memory proposed.' },
    { name: 'Episodic', guidance: hasDurable && durableRows.some(r => r.type === 'Episodic') ? 'Selective decisions and useful outcomes, not full transcripts; give each event an expiry and provenance.' : 'No durable event history proposed.' },
    { name: 'Procedural', guidance: hasDurable && durableRows.some(r => r.type === 'Procedural') ? 'Candidate tested workflows; version changes and require approval before promoting them into behavior.' : 'No persistent procedure learning proposed.' },
    { name: 'Shared / organizational', guidance: hasDurable && shared ? `${tenant ? 'Only separately approved non-customer reference records' : 'Approved records only'} within the declared ${a.sharing} boundary; keep private state separate.` : 'No cross-owner shared durable store proposed.' },
  ];
  const conflict = highRisk ? 'Require accountable confirmation; version both claims with provenance until resolved. Supersede only after approval; never use unresolved claims for consequential actions.' : a.changeRate === 'frequent' ? 'Version and supersede verified old facts using effective timestamps. Keep unresolved claims separate; recency alone is not truth.' : 'Confirm changed preferences, then replace/supersede the old version with a minimal change record. Keep both only when contexts differ or the conflict is unresolved.';
  const decay = !hasDurable ? 'Clear task state at completion; do not create a cross-session archive.' : 'Review old, unused records; reduce retrieval priority or expire them under the approved policy. Frequent use may justify review, never automatic trust or an unlimited TTL extension. Do not decay legal/system-of-record facts blindly; follow their authoritative retention policy. Delete or invalidate derived indexes/caches and define backup expiry, holds and restoration safeguards.';
  const entryFields = !hasDurable ? ['Task/session identifier', 'Owner/scope', 'Minimum working content', 'Task expiry / cleanup rule'] : ['Memory ID and type', 'Owner/tenant/project scope and ACL', 'Distilled content + sensitivity', 'Source, supplier and provenance', 'Created/updated/effective times and version', 'Verification / user-confirmation status', 'Expiry / review date + deletion status', ...(semanticIndex ? ['Source-record ID for index invalidation'] : [])];
  const controls = ['Allowlisted capture rules; no automatic transcript accumulation.', 'Write gating: classify source, minimize content, verify purpose/scope and resolve conflicting facts.', `${highRisk || sensitive ? 'Accountable confirmation for sensitive/high-impact writes' : 'Owner confirmation for changed preferences and consequential corrections'}; quarantine low-trust candidates with expiry.`, 'Treat retrieved memory as data, never higher-priority instructions; recheck permissions at use time.', 'Audit record identifiers, decisions and access without secret/raw-content logging. Controls reduce risk; they do not eliminate poisoning.'];
  const userControls = !hasDurable ? ['Explain that no cross-session memory is captured', 'Allow clearing current task state', 'Verify cleanup after completion, cancellation and error'] : a.scope === 'user' ? ['View and correct approved memory', 'Delete individual records or clear optional memory', 'Disable capture and see why a memory was used'] : ['Authorized user/customer request path for access, correction and deletion', 'Owner/admin policy controls and auditable review', 'Explain record use where appropriate; do not expose another customer’s records or promise unrestricted end-user admin access'];
  const complexity = !hasDurable ? 'Low' : tenant || multi || highRisk || semanticIndex || shared ? 'High' : 'Medium';
  const risk = tenant ? 'Cross-tenant/customer contamination through writes, retrieval, indexes or caches.' : multi ? 'Private agent state or poisoned shared records crossing an agent/task boundary.' : sensitive ? 'Sensitive facts outliving their purpose or leaking through retrieval, logs and backups.' : a.source !== 'confirmed' ? 'An unverified claim or injected instruction becoming durable trusted memory.' : 'Stale or conflicting records being reused as if they were current, verified facts.';
  const firstDecision = !hasDurable ? 'Keep the tool stateless across sessions; identify the exact task cleanup boundary.' : `Define ${scope.toLowerCase()} ownership and the allowlisted capture/retention policy before choosing storage.`;
  const steps = [firstDecision, hasDurable ? 'Specify provenance, expiry and confirmation gates; test a conflicting or poisoned candidate without promoting it.' : 'Keep only required working state and test cleanup after success, error and cancellation.', hasDurable ? 'Test scoped retrieval and deletion end to end, including derived indexes, caches and backup/restore policy.' : 'Verify no transcript, cache or log silently becomes a durable memory store.'];
  const lifecycle = [
    ['Capture', 'Allowlist useful distilled candidates; exclude secrets and unnecessary data.'],
    ['Validate', 'Check source, purpose, sensitivity, conflicts and expected user control.'],
    ['Store', hasDurable ? 'Write only approved records in the authorized scope with expiry.' : 'Session state only; no cross-session write.'],
    ['Retrieve', 'Filter authenticated scope, trust, current version and expiry before ranking.'],
    ['Use', 'Cite provenance; memory is evidence, never permission or instruction authority.'],
    ['Update', conflict],
    ['Decay', hasDurable ? 'Review stale/unused records; usefulness is not authority or automatic renewal.' : 'No durable decay process needed.'],
    ['Delete', hasDurable ? 'Enforce expiry/deletion across records, indexes and caches; define backup/hold exceptions.' : 'Clear task/session state at completion.'],
  ];
  return { strategy, hasDurable, storage, retrieval, types, rows, retention: hasDurable ? retention : 'Session / task; clear at completion', scope, shared: hasDurable && shared, semanticIndex, conflict, decay, entryFields, controls, userControls, complexity, risk, firstDecision, steps, lifecycle, warnings };
}
