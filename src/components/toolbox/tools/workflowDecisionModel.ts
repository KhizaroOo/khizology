export const architectures = ['Deterministic Code', 'Workflow / DAG', 'Single Agent', 'Agent + Tools', 'Multi-Agent'] as const;
export type Architecture = typeof architectures[number];
type Points = readonly [
    number,
    number,
    number,
    number,
    number
];
interface Question {
    id: string;
    label: string;
    advanced?: boolean;
    options: {
        value: string;
        label: string;
        points: Points;
    }[];
}
export const architectureQuestions: Question[] = [
    { id: 'predictability', label: 'What kind of work is it?', options: [{ value: 'rules', label: 'Fixed rules, calculations or validation', points: [35, 15, -35, -35, -35] }, { value: 'mostly', label: 'Mostly rules, with a language/judgment step', points: [10, 25, 0, 5, -10] }, { value: 'reasoning', label: 'Reasoning-heavy; route is not fully known', points: [-30, 5, 30, 35, 15] }, { value: 'open', label: 'Highly open-ended investigation', points: [-40, -5, 35, 35, 25] }] },
    { id: 'process', label: 'How defined is the process?', options: [{ value: 'simple', label: 'One task; no staged process', points: [15, -10, 10, 8, -5] }, { value: 'ordered', label: 'Known ordered steps', points: [-5, 30, -5, 0, -5] }, { value: 'branching', label: 'Known branching rules', points: [-5, 30, 0, 5, 0] }, { value: 'controlled', label: 'Controlled stages with retries/checkpoints', points: [-15, 35, -15, -10, -5] }] },
    { id: 'tools', label: 'External capabilities needed?', options: [{ value: 'none', label: 'None — supplied context only', points: [10, 5, 15, -10, 0] }, { value: 'known', label: 'A few known calls/actions', points: [5, 15, -5, 15, 5] }, { value: 'dynamic', label: 'Tool choice must adapt during work', points: [-20, 0, -10, 25, 15] }] },
    { id: 'parallel', label: 'Can major subtasks run independently?', options: [{ value: 'no', label: 'No — results depend on prior steps', points: [5, 5, 10, 10, -30] }, { value: 'some', label: 'Some decomposition is possible', points: [0, 5, 5, 5, 0] }, { value: 'yes', label: 'Yes — substantial independent branches', points: [0, 5, 0, 5, 25] }] },
    { id: 'specialization', label: 'Distinct expertise or isolated context?', options: [{ value: 'no', label: 'One context and skill set is enough', points: [5, 0, 5, 5, -20] }, { value: 'some', label: 'Some distinct perspectives', points: [0, 5, 5, 5, 5] }, { value: 'distinct', label: 'Distinct specialists or context boundaries', points: [0, 5, 0, 5, 25] }] },
    { id: 'state', label: 'How tightly shared is the work state?', options: [{ value: 'independent', label: 'Independent inputs and clear deliverables', points: [0, 0, 0, 0, 10] }, { value: 'moderate', label: 'Some shared context', points: [0, 5, 5, 5, -5] }, { value: 'heavy', label: 'Highly shared / tightly coupled', points: [10, 10, 5, 5, -30] }] },
    { id: 'risk', label: 'Impact of an incorrect result', advanced: true, options: [{ value: 'low', label: 'Low', points: [0, 0, 0, 0, 0] }, { value: 'moderate', label: 'Moderate', points: [0, 5, -5, -5, -5] }, { value: 'high', label: 'High', points: [5, 10, -15, -15, -15] }, { value: 'critical', label: 'Critical', points: [10, 15, -25, -25, -25] }] },
    { id: 'cost', label: 'Cost sensitivity', advanced: true, options: [{ value: 'high', label: 'High — avoid unnecessary calls', points: [10, 5, -10, -15, -30] }, { value: 'medium', label: 'Medium', points: [5, 5, 0, -5, -5] }, { value: 'low', label: 'Low', points: [0, 0, 0, 0, 0] }] },
    { id: 'latency', label: 'Latency sensitivity', advanced: true, options: [{ value: 'high', label: 'High — coordination overhead matters', points: [10, 5, -10, -15, -25] }, { value: 'medium', label: 'Medium', points: [0, 0, 0, -2, -5] }, { value: 'low', label: 'Low', points: [0, 0, 0, 0, 0] }] },
    { id: 'audit', label: 'Clear replayable execution needed?', advanced: true, options: [{ value: 'no', label: 'No', points: [0, 0, 0, 0, 0] }, { value: 'yes', label: 'Yes — record process and evidence', points: [5, 20, -10, -10, -10] }] },
    { id: 'approval', label: 'Human approval gates required?', advanced: true, options: [{ value: 'no', label: 'No', points: [0, 0, 0, 0, 0] }, { value: 'yes', label: 'Yes — application-enforced gates', points: [0, 20, -15, -10, -10] }] },
    { id: 'scale', label: 'Scope of work', advanced: true, options: [{ value: 'small', label: 'One small task', points: [10, -5, 5, 0, -25] }, { value: 'recurring', label: 'Recurring workflow', points: [5, 10, 0, 5, 0] }, { value: 'many', label: 'Many substantial tasks', points: [0, 5, 0, 5, 20] }] },
    { id: 'exact', label: 'Must the result be exact/repeatable?', advanced: true, options: [{ value: 'yes', label: 'Yes — no judgment in the final decision', points: [20, 15, -35, -35, -35] }, { value: 'no', label: 'No — evaluated judgment is acceptable', points: [0, 0, 0, 0, 0] }] },
    { id: 'verification', label: 'Verification for judgment-based steps', advanced: true, options: [{ value: 'none', label: 'No verification defined', points: [0, 0, -10, -15, -20] }, { value: 'planned', label: 'Evaluation/review gates planned', points: [0, 5, 0, 0, -5] }, { value: 'existing', label: 'Implemented checks and accountable review', points: [0, 5, 5, 5, 5] }] }
];
export type ArchitectureAnswers = Record<string, string>;
export const architectureDefaults: ArchitectureAnswers = { predictability: 'rules', process: 'simple', tools: 'none', parallel: 'no', specialization: 'no', state: 'moderate', risk: 'low', cost: 'high', latency: 'high', audit: 'no', approval: 'no', scale: 'small', exact: 'yes', verification: 'existing' };
export const architecturePresets: Record<string, ArchitectureAnswers> = {
    'Data Validation': { ...architectureDefaults },
    'Invoice Approval': { ...architectureDefaults, process: 'controlled', tools: 'known', risk: 'high', audit: 'yes', approval: 'yes', scale: 'recurring' },
    'Research Assistant': { ...architectureDefaults, predictability: 'open', tools: 'dynamic', exact: 'no', cost: 'medium', latency: 'medium', verification: 'planned' },
    'Company Research Across 20 Firms': { ...architectureDefaults, predictability: 'reasoning', tools: 'dynamic', parallel: 'yes', specialization: 'distinct', state: 'independent', scale: 'many', exact: 'no', cost: 'medium', latency: 'medium', risk: 'moderate', verification: 'planned' },
    'Coding Assistant': { ...architectureDefaults, predictability: 'reasoning', tools: 'dynamic', state: 'heavy', scale: 'recurring', exact: 'no', cost: 'medium', latency: 'medium', risk: 'moderate' },
    'Compliance Approval Process': { ...architectureDefaults, predictability: 'mostly', process: 'controlled', tools: 'known', risk: 'critical', audit: 'yes', approval: 'yes', scale: 'recurring', exact: 'no', latency: 'medium' },
    'Multi-Discipline Due Diligence': { ...architectureDefaults, predictability: 'open', tools: 'dynamic', parallel: 'yes', specialization: 'distinct', state: 'independent', risk: 'high', scale: 'many', exact: 'no', cost: 'low', latency: 'medium' }
};
export const architectureNotes: Record<Architecture, {
    flow: string;
    risks: string;
    upgrade: string;
    simplify: string;
    steps: [
        string,
        string,
        string
    ];
    levels: [
        string,
        string,
        string,
        string,
        string
    ];
}> = {
    'Deterministic Code': { flow: 'Input → Explicit logic → Validated output', risks: 'Rigid rules and incomplete edge-case coverage can encode the wrong assumptions.', upgrade: 'Use a workflow when ordered stages, durable retries or approvals become requirements.', simplify: 'Keep one function or small service when orchestration adds no value.', steps: ['Write the input/output contract and explicit rules.', 'Test edge cases and invalid inputs.', 'Add bounded error handling and evidence for failures.'], levels: ['Low', 'Low', 'Low', 'Low', 'Low'] },
    'Workflow / DAG': { flow: 'Input → Known stages → Verification → Approval if required → Output', risks: 'Process growth, brittle stage contracts and incorrect retry/idempotency behavior.', upgrade: 'Add a bounded reasoning step only where rules genuinely cannot express the task.', simplify: 'Replace the workflow with code when ordering, checkpoints and approval orchestration are no longer needed.', steps: ['Define stage contracts, transitions and retry ownership.', 'Implement checks, checkpoints and required approval gates.', 'Test failure recovery and idempotency before enabling actions.'], levels: ['Medium', 'Low', 'Medium', 'Medium', 'Medium'] },
    'Single Agent': { flow: 'User + supplied context → One bounded reasoning loop → Checked result', risks: 'Non-deterministic output, hallucination, variable cost and incomplete reasoning.', upgrade: 'Add narrow tools only when external capabilities are needed; delegate only after measurable context/decomposition limits.', simplify: 'Replace stable reasoning patterns with rules or a fixed prompt/workflow. A single model call may be enough.', steps: ['Define the task, examples and observable success criteria.', 'Start with one model call; add a loop only if evaluation justifies it.', 'Set iteration limits and review/evaluate outputs.'], levels: ['Medium', 'Medium', 'Medium', 'Medium', 'Low'] },
    'Agent + Tools': { flow: 'User → One agent → Allowlisted tools → Agent → Verification → Result', risks: 'Tool misuse, prompt injection, non-determinism and repeated side effects; permissions require enforcement.', upgrade: 'Consider multiple agents only for independent substantial branches with isolated context and measurable benefit.', simplify: 'Use known calls in a workflow if dynamic tool choice stops being useful.', steps: ['Define a small tool set with least-privilege scopes.', 'Bound iterations, spending and side effects; implement approvals.', 'Evaluate task completion, tool failures and unsafe-action handling.'], levels: ['High', 'High', 'High', 'High', 'Medium'] },
    'Multi-Agent': { flow: 'User → Coordinator → Independent specialists A / B / C → Evidence synthesis → Verification → Result', risks: 'Coordination failures, duplicated work, context divergence, greater token/tool cost and harder debugging. Separate agents do not guarantee independent correctness.', upgrade: 'Add new specialists only when measured task boundaries or evaluation failures justify them.', simplify: 'Collapse back to one agent when branches share most context or coordination outweighs independent work.', steps: ['Define independent subtasks and explicit evidence/output contracts.', 'Cap specialist count, iterations and shared-state writes.', 'Evaluate synthesis, disagreement and total cost against a single-agent baseline.'], levels: ['Very High', 'Very High', 'High', 'Very High', 'Very High'] }
};
export function decideArchitecture(answers: ArchitectureAnswers) {
    const selected = architectureQuestions.map(q => { const option = q.options.find(o => o.value === answers[q.id]); if (!option)
        throw Error('Choose a supported answer for every architecture question.'); return { q, option }; });
    const reasoning = answers.predictability !== 'rules', structured = answers.process !== 'simple' || answers.audit === 'yes' || answers.approval === 'yes';
    const hybrid = reasoning && structured;
    const unsafe = (answers.risk === 'high' || answers.risk === 'critical') && answers.verification === 'none';
    const warnings: string[] = [];
    if (answers.exact === 'yes' && reasoning)
        warnings.push('Exact repeatable output conflicts with a declared judgment requirement. Define deterministic acceptance rules or route judgment to accountable human review.');
    if (unsafe && reasoning)
        warnings.push('High-impact judgment has no verification. Establish checks and accountable review before enabling autonomous steps.');
    if (answers.approval === 'yes')
        warnings.push('Approval gates must be enforced by the application and bound to the exact proposed action. A prompt is not an authorization boundary.');
    if (answers.audit === 'yes' && reasoning)
        warnings.push('Record replayable process/evidence; model output itself is not guaranteed to replay identically.');
    const ranked = architectures.map((name, index) => {
        const signals = selected.map(({ q, option }) => ({ question: q.label, answer: option.label, points: option.points[index] }));
        const raw = [45, 40, 25, 25, 10][index] + signals.reduce((sum, s) => sum + s.points, 0);
        const blocked: string[] = [];
        if (index === 0 && (reasoning || structured || answers.tools === 'dynamic'))
            blocked.push('Rules-only code cannot satisfy the declared judgment or orchestration requirements by itself.');
        if (index === 1 && !structured && reasoning)
            blocked.push('No known process boundary is declared for a controlled workflow.');
        if (index === 2 && answers.tools !== 'none')
            blocked.push('This category uses supplied context only; external capabilities require Agent + Tools or controlled calls.');
        if (index === 3 && answers.tools === 'none')
            blocked.push('No external capability is required; adding a tool layer is unnecessary.');
        if (index >= 2 && answers.predictability === 'rules')
            blocked.push('Fixed rules do not justify autonomous reasoning.');
        if ((index >= 2 || index === 1 && hybrid) && answers.exact === 'yes')
            blocked.push('A judgment-based component cannot guarantee exact/repeatable output.');
        if ((index >= 2 || index === 1 && hybrid) && unsafe)
            blocked.push('High-impact judgment requires verification before autonomy.');
        if (index === 4 && (answers.parallel !== 'yes' || answers.specialization === 'no' || answers.state === 'heavy' || answers.scale === 'small'))
            blocked.push('Needs substantial independent branches, useful context/specialist separation and bounded shared state; a small tightly coupled task does not justify delegation.');
        return { name, index, score: Math.max(0, Math.min(100, Math.round(25 + raw / 2))), raw, signals, blocked };
    }).sort((a, b) => b.score - a.score || a.index - b.index);
    const eligible = ranked.filter(r => !r.blocked.length), top = eligible[0];
    const winner = top ? [...eligible.filter(r => r.score >= top.score - 6)].sort((a, b) => a.index - b.index)[0] : undefined;
    const recommendation = winner ? (winner.name === 'Workflow / DAG' && hybrid ? 'Workflow + bounded agent step' : winner.name) : 'Resolve conflicting requirements';
    const multi = ranked.find(r => r.name === 'Multi-Agent')!;
    const whyNotMulti = winner?.name === 'Multi-Agent' ? 'Independent branches and separate contexts justify testing delegation. Compare against one agent; the score is not proof of a speed or quality gain.' : multi.blocked[0] ?? `Multi-Agent fit is ${multi.score}/100. Coordination, cost and latency signals do not justify it over the simpler recommended design.`;
    const reasons = winner ? [...winner.signals].filter(s => s.points > 0).sort((a, b) => b.points - a.points).slice(0, 4) : [];
    const flow = winner?.name === 'Workflow / DAG' && hybrid ? 'Input → Explicit workflow → Bounded agent step → Deterministic checks / human review → Approval if required → Output' : winner ? architectureNotes[winner.name].flow : 'Requirements → Resolve exactness / verification conflict → Compare again';
    return { ranked, winner, recommendation, hybrid: !!winner && winner.name === 'Workflow / DAG' && hybrid, warnings, reasons, whyNotMulti, flow, simplerTie: !!winner && !!top && winner.name !== top.name, pattern: winner?.name === 'Multi-Agent' ? 'Manager / subagents with concurrent independent branches and one synthesis owner' : undefined };
}
