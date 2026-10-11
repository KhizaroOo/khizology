export const tools = [
  { id: 'files', label: 'Files', description: 'Read selected project files and surrounding code. Reading is not editing.' },
  { id: 'search', label: 'Search', description: 'Find symbols, routes and consumers before choosing a change.' },
  { id: 'editor', label: 'Editor', description: 'Apply a focused workspace change. Inspect the result afterwards.' },
  { id: 'terminal', label: 'Terminal', description: 'Run project commands and inspect exit status and output.' },
  { id: 'tests', label: 'Tests', description: 'Check expected behavior. Passing tests only cover what they assert.' },
  { id: 'browser', label: 'Browser / Preview', description: 'Interact with the result at desktop and mobile sizes. A build cannot prove usable UI.' },
  { id: 'diff', label: 'Git / Diff', description: 'Review added, modified and removed lines. Detect unrelated scope before reporting.' },
] as const;
export type ToolId = typeof tools[number]['id'];
export const repository = [
  { path: 'AGENTS.md', why: 'Project-specific agent guidance: preserve unrelated work; do not deploy.', content: 'Use shared sources. Verify relevant behavior. No production push.' },
  { path: 'README.md', why: 'Project setup and architecture conventions.', content: 'A small storefront with shared UI, style tokens and behavior tests.' },
  { path: 'package.json', why: 'Installed dependencies and available validation scripts.', content: 'Scripts: test, build, lint, typecheck. Use the existing stack.' },
  { path: 'src/components/ThemeToggle.tsx', why: 'Shared theme control, used by every page.', content: 'setTheme(next); document.documentElement.classList.toggle("dark");' },
  { path: 'src/components/Checkout.tsx', why: 'The empty-cart crash and its input contract.', content: 'const first = cart.items[0]; // may be undefined' },
  { path: 'src/pages/', why: 'Consumers of shared components; a local fix may miss other pages.', content: 'Home, product and checkout pages use shared components.' },
  { path: 'src/styles/theme.css', why: 'Canonical theme tokens and responsive layout.', content: '.dark { --surface: #161a22; --text: #f4f5f7; }' },
  { path: 'src/api/retry.ts', why: 'One shared retry policy must preserve limits and idempotency safeguards.', content: 'retry(operation, { maxAttempts: 3 }); // demo API' },
  { path: 'src/api/consumers.ts', why: 'Find callers before changing a shared retry signature.', content: 'Catalog and checkout both call retry; payment retries need safeguards.' },
  { path: 'tests/', why: 'Existing expectations and regression cases.', content: 'Theme class, empty cart and retry limit cases.' },
  { path: 'config/', why: 'Build and environment behavior, not secret values.', content: 'Local preview configuration; no production credentials.' },
] as const;
export const tasks = [
  { id: 'feature', label: 'Feature', request: 'Add dark mode to this app.', file: 'src/components/ThemeToggle.tsx', search: 'ThemeToggle, theme tokens and page consumers', observation: 'The shared toggle controls the root theme class.', fix: 'Use the existing dark class and readable theme tokens.', failure: 'Expected class dark; received theme-dark.', diff: ['+ root.classList.toggle("dark", enabled)', '- root.classList.toggle("theme-dark", enabled)', '+ regression: all pages use readable theme tokens'], changed: 'Shared toggle, theme tokens and theme regression test' },
  { id: 'bug', label: 'Bug fix', request: 'Checkout crashes when cart is empty.', file: 'src/components/Checkout.tsx', search: 'Checkout, cart.items and empty-cart tests', observation: 'Reproduced TypeError: first is undefined. Hypothesis: the empty array needs a guard.', fix: 'Render the existing empty-cart state before reading the first item.', failure: 'Empty-cart test failed: item.title was read from undefined.', diff: ['+ if (!cart.items.length) return EmptyCart', '- const title = cart.items[0].title', '+ regression: empty and populated carts'], changed: 'Checkout guard and empty-cart regression test' },
  { id: 'refactor', label: 'Refactor', request: 'Remove duplicated API retry logic.', file: 'src/api/retry.ts', search: 'retry, maxAttempts and every API consumer', observation: 'Two callers duplicate retry handling; their attempt limits must remain unchanged.', fix: 'Use one retry helper and update both callers without broad cleanup.', failure: 'Consumer test failed: checkout still used the old retry signature.', diff: ['+ shared retry(operation, options)', '- duplicated caller retry loops', '+ regression: limits and both consumer contracts'], changed: 'Retry helper, two callers and regression tests' },
] as const;
export type TaskId = typeof tasks[number]['id'];
export type Autonomy = 'assisted' | 'balanced' | 'autonomous';
export type Phase = 'Observe' | 'Decide' | 'Act' | 'Observe result';
export interface AgentStep { id: string; label: string; place: string; phase: Phase; tool?: ToolId; summary: string; file?: string; gate?: string; fault?: string; repair?: string; approval?: boolean; }
export const failures = [
  { id: 'wrong-file', label: 'Wrong file', at: 'edit', message: 'A page-local toggle leaves other pages unchanged.', repair: 'Inspect the shared source, then move the fix there.', lesson: 'Inspect architecture before editing.' },
  { id: 'missing-consumer', label: 'Missing consumer', at: 'unit', message: 'One caller still expects the previous shared API.', repair: 'Search every consumer, update the missed caller, rerun tests.', lesson: 'Shared changes require consumer checks.' },
  { id: 'test', label: 'Test failure', at: 'unit', message: 'A regression assertion failed.', repair: 'Read the failure, fix the mismatch and rerun the same test.', lesson: 'Failure is feedback, not permission to ignore the check.' },
  { id: 'build', label: 'Build failure', at: 'build', message: 'Cannot resolve the imported shared component.', repair: 'Correct the import and rerun the production build.', lesson: 'Compilation checks structure, not usability.' },
  { id: 'ui', label: 'UI regression', at: 'mobile', message: 'Unit tests and build passed; the mobile toggle overflows.', repair: 'Fix the responsive layout; recheck desktop and mobile.', lesson: 'Build success is not UX success.' },
  { id: 'permission', label: 'Permission block', at: 'permission', message: 'Production push is outside this task’s authorization.', repair: 'Cancel the production action; continue safe local verification.', lesson: 'Capability does not grant permission.' },
  { id: 'scope', label: 'Scope creep', at: 'diff', message: '18 unrelated files changed alongside the requested fix.', repair: 'Remove only agent-introduced unrelated edits; preserve existing user work.', lesson: 'Review the smallest justified change surface.' },
  { id: 'stale', label: 'Stale context', at: 'read', message: 'The file changed since the previous observation.', repair: 'Re-read the current file before applying the edit.', lesson: 'Refresh assumptions when the workspace changes.' },
] as const;
export type FailureId = 'none' | typeof failures[number]['id'];
export function journey(taskId: TaskId, plan: boolean, scenario: FailureId, finale = false): AgentStep[] {
  const task = tasks.find(t => t.id === taskId)!;
  const steps: AgentStep[] = [
    { id: 'task', label: 'Read task', place: 'Task', phase: 'Observe', summary: task.request },
    { id: 'rules', label: 'Read instructions', place: 'Repository', phase: 'Observe', tool: 'files', file: 'AGENTS.md', summary: 'Read project constraints; keep work local and preserve unrelated changes.' },
    { id: 'search', label: taskId === 'bug' ? 'Reproduce & trace' : 'Find relevant files', place: 'Search', phase: 'Act', tool: 'search', summary: task.search },
    { id: 'read', label: 'Read surrounding code', place: 'Read', phase: 'Observe result', tool: 'files', file: task.file, summary: task.observation },
    { id: 'consumers', label: 'Inspect consumers', place: 'Repository', phase: 'Observe', tool: 'search', summary: 'Check callers, styles and existing regression cases before changing shared behavior.' },
    ...(plan ? [{ id: 'plan', label: 'Form focused plan', place: 'Plan', phase: 'Decide' as const, summary: `Inspect → ${task.fix} → tests → build → preview → diff. Planning helps this multi-step task; a trivial change may need no separate plan.` }] : [{ id: 'immediate', label: 'Act without a separate plan', place: 'Plan', phase: 'Decide' as const, summary: 'Proceed after inspection. This curated path adds an avoidable edit-and-check detour; real outcomes depend on the task, not a guaranteed planning advantage.' }, { id: 'detour', label: 'Revisit change boundary', place: 'Read', phase: 'Observe result' as const, tool: 'files' as const, summary: 'The local approach would miss shared consumers. Re-read the shared pattern before editing.' }]),
    { id: 'edit', label: 'Apply focused edit', place: 'Edit', phase: 'Act', tool: 'editor', summary: task.fix, approval: true },
    { id: 'type', label: 'Type check', place: 'Terminal', phase: 'Observe result', tool: 'terminal', gate: 'Type check', summary: 'npm run typecheck → PASS (simulated)' },
    { id: 'lint', label: 'Lint', place: 'Terminal', phase: 'Observe result', tool: 'terminal', gate: 'Lint', summary: 'npm run lint → PASS (simulated)' },
    { id: 'first-test', label: 'First test fails', place: 'Tests', phase: 'Observe result', tool: 'tests', summary: `npm test → FAIL: ${task.failure}`, fault: 'feedback', repair: task.fix },
    { id: 'inspect-failure', label: 'Inspect failure', place: 'Read', phase: 'Observe', tool: 'files', file: task.file, summary: 'Use the error as new context; inspect implementation and expectation together.' },
    { id: 'fix', label: 'Revise solution', place: 'Edit', phase: 'Act', tool: 'editor', summary: task.fix },
    { id: 'unit', label: 'Rerun regression tests', place: 'Tests', phase: 'Observe result', tool: 'tests', gate: 'Unit tests', summary: 'npm test → PASS: relevant new and existing cases (simulated)' },
    { id: 'build', label: 'Production build', place: 'Terminal', phase: 'Observe result', tool: 'terminal', gate: 'Build', summary: 'npm run build → PASS (simulated). UI still needs verification.' },
    { id: 'desktop', label: 'Desktop preview', place: 'Browser / Preview', phase: 'Observe result', tool: 'browser', gate: 'Desktop UI', summary: taskId === 'feature' ? 'Toggle dark mode; text remains readable on existing pages.' : taskId === 'bug' ? 'Check empty cart and populated cart in the preview.' : 'Check catalog and checkout paths using the shared retry helper.' },
    { id: 'mobile', label: 'Mobile preview', place: 'Browser / Preview', phase: 'Observe result', tool: 'browser', gate: 'Mobile UI', summary: 'Check touch targets, text and layout at a narrow viewport.' },
    { id: 'permission', label: 'Respect action boundary', place: 'Diff', phase: 'Decide', summary: 'Local changes are ready for review. No commit, push or deployment is authorized.' },
    { id: 'diff', label: 'Review diff', place: 'Diff', phase: 'Observe result', tool: 'diff', gate: 'Diff review', summary: `${task.changed}. No unrelated edits retained.` },
    { id: 'verify', label: 'Verify evidence', place: 'Result', phase: 'Decide', summary: 'All relevant gates must have evidence. Tests alone are insufficient.' },
    { id: 'report', label: 'Report result', place: 'Result', phase: 'Act', summary: 'Report changed files, actual checks and any blockers. This is the end of the local demonstration.' },
  ];
  const fault = failures.find(f => f.id === scenario);
  return steps.map(step => fault?.at === step.id ? { ...step, fault: fault.id, summary: fault.message, repair: fault.repair } : finale && step.id === 'mobile' ? { ...step, fault: 'ui', summary: 'Desktop passed; mobile toggle overflows and text becomes unreadable.', repair: 'Use responsive spacing and theme text tokens; recheck desktop and mobile.' } : step);
}
export interface RunState { index: number; status: 'idle' | 'running' | 'paused' | 'blocked' | 'approval' | 'done'; repaired: number[]; approved: number[]; }
export const initialRun: RunState = { index: -1, status: 'idle', repaired: [], approved: [] };
export function advance(state: RunState, steps: AgentStep[], autonomy: Autonomy): RunState {
  if (state.status !== 'running') return state;
  const next = state.index + 1;
  if (next >= steps.length) return { ...state, status: 'done' };
  const step = steps[next];
  return { ...state, index: next, status: step.fault && !state.repaired.includes(next) ? 'blocked' : autonomy === 'assisted' && step.approval && !state.approved.includes(next) ? 'approval' : next === steps.length - 1 ? 'done' : 'running' };
}
export function recover(state: RunState, steps: AgentStep[]): RunState {
  if (state.status !== 'blocked') return state;
  // Repeat the same action/gate after repair; do not silently mark a failed gate passed.
  const id = steps[state.index]?.id;
  const restart = id === 'mobile' ? steps.findIndex(s => s.id === 'desktop') : ['first-test', 'unit', 'build'].includes(id) ? steps.findIndex(s => s.id === 'type') : state.index;
  return { ...state, index: restart - 1, repaired: [...state.repaired, state.index], status: 'running' };
}
export function gateStatus(state: RunState, steps: AgentStep[], gate: string) {
  const index = steps.findIndex(s => s.gate === gate);
  if (index < 0 || state.index < index) return 'Pending';
  return state.index === index && state.status === 'blocked' ? 'FAIL' : 'PASS';
}
export function permission(action: string, autonomy: Autonomy) {
  if (action === 'push') return 'Blocked — production push is not authorized in this example.';
  if (action === 'delete' || action === 'migration') return 'Ask human — review scope, backup and explicit approval before a destructive action.';
  if (autonomy === 'assisted' && action === 'edit') return 'Ask human — assisted mode adds a local edit approval point.';
  return 'Allowed — safe local work within this example’s workspace rules.';
}
export const challenges = [
  { id: 'source', question: 'The login button looks wrong. Where should inspection start?', choices: ['Patch only the login page', 'Inspect the shared Button and its consumers', 'Rewrite the entire design system'], answer: 1, lesson: 'Find the shared source before deciding the smallest change.', scenario: 'wrong-file' },
  { id: 'feedback', question: 'A regression test fails. What comes next?', choices: ['Ignore it', 'Delete the assertion', 'Read the failure, repair and rerun'], answer: 2, lesson: 'The error is evidence for the next observation/action loop.', scenario: 'test' },
  { id: 'approval', question: 'Should a destructive migration proceed automatically?', choices: ['Always', 'Review risk and ask for explicit approval', 'Only if the agent is fast'], answer: 1, lesson: 'Autonomy never grants unlimited permission.', scenario: 'permission' },
  { id: 'preview', question: 'Build passes, but the mobile UI breaks. Is the task done?', choices: ['No: fix and recheck user-facing behavior', 'Yes: compilation is enough', 'Hide the preview'], answer: 0, lesson: 'Build correctness and usable behavior are different gates.', scenario: 'ui' },
  { id: 'consumers', question: 'A shared API changed. What must be inspected?', choices: ['Only the helper', 'Nothing else', 'All relevant callers and regression cases'], answer: 2, lesson: 'A shared fix must preserve its consumers.', scenario: 'missing-consumer' },
] as const;
