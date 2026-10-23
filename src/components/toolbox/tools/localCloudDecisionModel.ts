// Editorial architecture-fit weights, not model benchmarks or probabilities.
type Points = readonly [number, number, number]; // Local, Cloud, Hybrid
const option = (value: string, label: string, points: Points) => ({ value, label, points });
export const deploymentQuestions = [
  { id: 'sensitivity', label: 'Data sensitivity', options: [option('public', 'Public', [0, 8, -4]), option('internal', 'Internal', [4, 2, 4]), option('confidential', 'Confidential', [14, -12, 14]), option('sensitive', 'Highly sensitive', [18, -20, 14])] },
  { id: 'offline', label: 'Offline requirement', options: [option('none', 'None', [0, 6, 0]), option('nice', 'Nice to have', [4, -2, 4]), option('important', 'Important', [12, -12, 8]), option('mandatory', 'Mandatory', [20, -30, 4])] },
  { id: 'capability', label: 'Model capability need', options: [option('simple', 'Small / simple task', [12, 0, -12]), option('moderate', 'Moderate reasoning', [6, 6, 0]), option('strong', 'Strong reasoning', [-8, 14, 14]), option('frontier', 'Frontier-level capability important', [-20, 20, 14])] },
  { id: 'hardware', label: 'Available hardware', options: [option('cpu', 'CPU only', [-12, 12, -4]), option('integrated', 'Integrated GPU / NPU', [0, 4, 4]), option('gpu', 'Consumer GPU', [12, 0, 8]), option('workstation', 'High-memory GPU / workstation', [18, -4, 12]), option('server', 'Server / on-prem hardware', [18, -4, 10]), option('unknown', 'Unknown', [-12, 10, -6])] },
  { id: 'workload', label: 'Workload type', options: [option('classification', 'Classification', [8, 0, -4]), option('extraction', 'Extraction', [8, 0, 2]), option('summarization', 'Summarization', [2, 4, 4]), option('chat', 'Chat', [2, 6, 2]), option('coding', 'Coding', [0, 8, 8]), option('documents', 'Document processing', [4, 4, 8]), option('vision', 'Vision', [-4, 8, 8]), option('agent', 'Agent / tool use', [-4, 8, 10]), option('batch', 'Batch processing', [8, 4, 2])] },
  { id: 'residency', label: 'Data residency', options: [option('unrestricted', 'No special requirement', [0, 4, 0]), option('region', 'Must stay in region', [8, -8, -4]), option('onprem', 'Must stay on-prem / device', [20, -30, -30])] },
  { id: 'network', label: 'Network reliability', advanced: true, options: [option('reliable', 'Reliable', [0, 8, 4]), option('variable', 'Variable', [8, -10, 6]), option('poor', 'Poor / unavailable', [16, -24, -8])] },
  { id: 'latency', label: 'Latency need', advanced: true, options: [option('seconds', 'Seconds acceptable', [0, 4, -2]), option('fast', 'Fast interaction preferred', [4, 2, 4]), option('instant', 'Near-instant response important', [8, -4, 6])] },
  { id: 'frequency', label: 'Usage frequency', advanced: true, options: [option('occasional', 'Occasional', [-8, 10, -4]), option('regular', 'Regular', [2, 4, 0]), option('high', 'High-volume', [10, -4, 8]), option('continuous', 'Continuous', [12, -6, 8])] },
  { id: 'context', label: 'Data / context size', advanced: true, options: [option('small', 'Small', [8, 0, -4]), option('moderate', 'Moderate', [2, 4, 2]), option('large', 'Large', [-10, 10, 8]), option('veryLarge', 'Very large', [-18, 16, 8])] },
  { id: 'scale', label: 'Scaling requirement', advanced: true, options: [option('single', 'Single user / device', [8, 0, -4]), option('team', 'Small team', [2, 4, 0]), option('organization', 'Organization', [-4, 10, 6]), option('public', 'Large public workload', [-20, 22, 4])] },
  { id: 'cost', label: 'Cost sensitivity', advanced: true, options: [option('high', 'High', [2, 2, -4]), option('medium', 'Medium', [0, 0, 0]), option('low', 'Low', [0, 0, 2])] },
  { id: 'maintenance', label: 'Maintenance tolerance', advanced: true, options: [option('minimal', 'Minimal', [-14, 16, -18]), option('moderate', 'Moderate', [2, 6, 0]), option('comfortable', 'Comfortable managing models / runtime', [10, 0, 8])] },
  { id: 'freshness', label: 'Model freshness', advanced: true, options: [option('low', 'Low', [6, 0, -2]), option('medium', 'Medium', [0, 4, 2]), option('high', 'High', [-10, 14, 8])] },
  { id: 'fallback', label: 'Independent local fallback tested?', advanced: true, options: [option('no', 'No / not yet', [0, 0, 0]), option('yes', 'Yes — required offline tasks work locally', [0, 0, 4])] },
] as const;
export type DeploymentAnswers = Record<typeof deploymentQuestions[number]['id'], string>;
export type DeploymentArchitecture = 'Local' | 'Cloud' | 'Hybrid';
export const deploymentDefaults: DeploymentAnswers = { sensitivity: 'internal', offline: 'none', capability: 'moderate', hardware: 'unknown', workload: 'chat', residency: 'unrestricted', network: 'reliable', latency: 'fast', frequency: 'regular', context: 'moderate', scale: 'team', cost: 'medium', maintenance: 'minimal', freshness: 'medium', fallback: 'no' };
export const deploymentPresets: { name: string; answers: DeploymentAnswers }[] = [
  { name: 'Private Document Assistant', answers: { ...deploymentDefaults, sensitivity: 'confidential', hardware: 'gpu', workload: 'documents', maintenance: 'comfortable', frequency: 'high', freshness: 'low' } },
  { name: 'Public Customer Chatbot', answers: { ...deploymentDefaults, sensitivity: 'public', capability: 'strong', scale: 'public', frequency: 'high' } },
  { name: 'Offline Field App', answers: { ...deploymentDefaults, sensitivity: 'internal', offline: 'mandatory', network: 'poor', hardware: 'integrated', capability: 'simple', workload: 'classification', context: 'small', scale: 'single', maintenance: 'moderate', freshness: 'low' } },
  { name: 'Coding Assistant on Powerful Workstation', answers: { ...deploymentDefaults, sensitivity: 'confidential', hardware: 'workstation', capability: 'strong', workload: 'coding', maintenance: 'comfortable', frequency: 'high', scale: 'single' } },
  { name: 'High-Scale Public AI Service', answers: { ...deploymentDefaults, sensitivity: 'public', hardware: 'cpu', capability: 'frontier', scale: 'public', frequency: 'continuous', context: 'large', freshness: 'high' } },
  { name: 'Healthcare / Sensitive Data Assistant', answers: { ...deploymentDefaults, sensitivity: 'sensitive', hardware: 'server', capability: 'strong', workload: 'documents', maintenance: 'comfortable', context: 'large', scale: 'organization', residency: 'region' } },
  { name: 'Small Startup Without GPU', answers: { ...deploymentDefaults, hardware: 'cpu', sensitivity: 'public', frequency: 'occasional', cost: 'high', capability: 'strong' } },
];
export const deploymentNotes = {
  Local: { flow: ['User / data', 'Local model', 'Local validation', 'Result'], cost: 'Variable upfront; hardware, electricity and maintenance. Low marginal API spend is not zero total cost.', latency: 'Avoids an internet round trip; model size, memory, device load and runtime still determine response time.', resilience: 'Device limits, runtime failure and model availability remain failure modes. Scaling requires distributing hardware and runtime updates.' },
  Cloud: { flow: ['Approved data only', 'Network', 'Cloud model', 'Validate result'], cost: 'Variable recurring usage / token / request fees. No local accelerator purchase, but consumption, quotas and egress can grow.', latency: 'Network adds delay; remote accelerators may infer faster than local hardware. Measure end-to-end latency.', resilience: 'Network outages, provider failures, throttling and quotas remain. Elastic capacity is easier to access, not unlimited or guaranteed.' },
  Hybrid: { flow: ['Local data / router', 'Local task or approved cloud request', 'Local validation', 'Result'], cost: 'Variable: both local operation and cloud usage. Routing can reduce API spend but adds engineering and support cost.', latency: 'Routing adds overhead; keep time-sensitive work local only when measured local performance is adequate.', resilience: 'More moving parts; a tested independent local fallback can help during outages. Routing alone does not provide resilience.' },
};

export function decideDeployment(answers: DeploymentAnswers) {
  const selected = deploymentQuestions.map(q => {
    const choice = q.options.find(o => o.value === answers[q.id]);
    if (!choice) throw new Error(`Choose a valid answer for ${q.label}.`);
    return { question: q.label, answer: choice.label, points: choice.points };
  });
  const strong = ['strong', 'frontier'].includes(answers.capability);
  const weak = ['cpu', 'unknown'].includes(answers.hardware);
  const remoteUnavailable = answers.offline === 'mandatory' || answers.network === 'poor';
  const localOnly = answers.residency === 'onprem';
  const warnings: string[] = [];
  if (remoteUnavailable) warnings.push('Required work must function without a remote service. Hybrid qualifies only with an independently tested local fallback; cloud escalation cannot be required to finish it.');
  if (localOnly) warnings.push('All workload data and processing must remain on-prem/device. Remote-cloud and remote-hybrid designs are excluded, regardless of their scores.');
  if (answers.residency === 'region') warnings.push('Verify inference, logs, backups, support access and subprocessors stay in the required region. A regional endpoint alone is not evidence.');
  if (['confidential', 'sensitive'].includes(answers.sensitivity)) warnings.push('Do not send sensitive raw data to a cloud path by default. Authorize the data boundary and verify retention, access, contracts and redaction separately; this tool grants no permission.');
  if (weak && (strong || ['large', 'veryLarge'].includes(answers.context))) warnings.push('Modest or unknown hardware and demanding capability/context are in tension. Validate a representative local task before relying on local execution.');
  if (answers.latency === 'instant') warnings.push('Near-instant response is unverified for every architecture. Measure real hardware, model, context, concurrency and network latency.');
  if (answers.offline === 'important' && answers.fallback !== 'yes') warnings.push('Offline operation is important but no independent fallback is declared tested. Cloud-only operation will not cover an outage.');
  const conflict = (remoteUnavailable || localOnly) && weak && strong;
  if (conflict) warnings.push('Requirements conflict: demanding reasoning, weak/unknown hardware and no dependable remote path. Validate or change the capability/hardware requirement before selecting an architecture.');
  const ranked = (['Local', 'Cloud', 'Hybrid'] as DeploymentArchitecture[]).map((name, index) => {
    const signals: { question: string; answer: string; points: number }[] = selected.map(s => ({ question: s.question, answer: s.answer, points: s.points[index] }));
    // High cost sensitivity depends on both usage and existing hardware, not price guesses.
    const repeated = ['high', 'continuous'].includes(answers.frequency);
    if (answers.cost === 'high') signals.push({ question: 'Cost × existing hardware × frequency', answer: repeated && !weak && answers.hardware !== 'integrated' ? 'Repeated work with an existing accelerator' : 'No demonstrated local amortization advantage', points: repeated && !weak && answers.hardware !== 'integrated' ? [10, -8, 6][index] : [-6, 6, -4][index] });
    const raw = signals.reduce((n, s) => n + s.points, 0);
    const blocked: string[] = [];
    if (name === 'Cloud' && remoteUnavailable) blocked.push('Required offline work / unavailable network.');
    if (name !== 'Local' && localOnly) blocked.push('On-prem/device residency forbids a remote path.');
    if (name === 'Hybrid' && remoteUnavailable && answers.fallback !== 'yes') blocked.push('No independently tested local fallback.');
    return { name, raw, score: Math.max(5, Math.min(95, Math.round(50 + raw / 2))), signals, blocked };
  }).sort((a, b) => b.score - a.score);
  const eligible = ranked.filter(r => !r.blocked.length);
  const best = eligible[0];
  // Prefer a single-environment design when its score is within three points.
  const winner = conflict ? undefined : eligible.find(r => r.name !== 'Hybrid' && r.score >= best.score - 3) ?? best;
  const recommendation = winner ? `${winner.name} — proposed architecture to validate` : 'Resolve requirements before choosing';
  const reasons = winner ? winner.signals.filter(s => s.points > 0).sort((a, b) => b.points - a.points).slice(0, 3) : [];
  const keepLocal = winner?.name === 'Cloud' ? 'Credentials, authorization, data minimization and result validation; raw sensitive data has no default approval to leave.' : `${answers.workload} over private source data, access controls and validation${remoteUnavailable ? '; every required offline task must complete locally' : '; benchmark bounded or repetitive work first'}.`;
  const useCloud = !winner || winner.name === 'Local' ? 'None in this proposed design. Revisit only if data policy and connectivity permit.' : winner.name === 'Cloud' ? 'Approved workload data for remote inference; confirm region, retention, quotas and provider terms before connecting.' : remoteUnavailable ? 'Optional online enhancements only; never the required offline task or its sensitive raw data.' : 'Only separately approved, minimized requests needing harder reasoning or larger context; never automatic sensitive-data escalation.';
  const risk = conflict ? 'Required capability is not demonstrated on the available local hardware.' : winner?.name === 'Hybrid' ? 'Routing mistakes can expose data; fallback and redaction may fail. Two runtimes increase maintenance.' : winner?.name === 'Local' ? 'The target model may not meet quality, memory or latency needs; local logs and compromised devices can still expose data.' : 'Connectivity, quotas and provider data handling can invalidate an otherwise good fit.';
  const steps = winner?.name === 'Cloud' ? ['Define approved outbound data, region and provider retention/access terms.', 'Test representative task quality, latency, concurrency and failure behavior.', 'Set usage budgets, quotas, retries and output validation before launch.'] : ['Test representative local tasks for quality, memory and end-to-end latency.', 'Define what must stay local and explicitly authorize any outbound data.', winner?.name === 'Hybrid' ? 'Implement fail-closed routing, test redaction and exercise offline fallback before enabling cloud escalation.' : 'Plan runtime updates, secure storage/logging and recovery; revise conflicting requirements if tests fail.'];
  return { ranked, winner, recommendation, reasons, warnings, conflict, keepLocal, useCloud, risk, steps };
}
