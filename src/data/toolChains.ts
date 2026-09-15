import type { Tool } from './tools';

export interface ToolChainStep { toolId: string; label: string; reason: string; handoff?: { type: 'navigation' }; }
export interface ToolChain { id: string; title: string; description: string; steps: ToolChainStep[]; }

export const toolChains: ToolChain[] = [
  {
    id: 'capacity-planning',
    title: 'Capacity planning',
    description: 'Find the threshold, size the queue, then check the service-level budget.',
    steps: [
      { toolId: 'capacity-cliff-simulator', label: 'Capacity Cliff Simulator', reason: 'Find when demand reaches the safety threshold.' },
      { toolId: 'queue-capacity-planner', label: 'Queue Capacity Planner', reason: 'Turn the expected load into queue capacity.', handoff: { type: 'navigation' } },
      { toolId: 'sla-chain-visualizer', label: 'SLA Chain Visualizer', reason: 'Check the downstream time budget.', handoff: { type: 'navigation' } },
    ],
  },
  {
    id: 'delivery-strategy',
    title: 'Delivery strategy',
    description: 'Compare the paths, price the work, then expose quote risk before committing.',
    steps: [
      { toolId: 'build-vs-buy', label: 'Build vs Buy', reason: 'Make the delivery trade-off visible.' },
      { toolId: 'ai-project-pricing-lab', label: 'AI Project Pricing Lab', reason: 'Estimate the work behind the preferred path.', handoff: { type: 'navigation' } },
      { toolId: 'project-quote-risk-planner', label: 'Project Quote Risk Planner', reason: 'Check the assumptions and risk margin.', handoff: { type: 'navigation' } },
    ],
  },
  {
    id: 'resilient-api-traffic',
    title: 'Resilient API traffic',
    description: 'See how retry policy changes request volume, control incoming traffic, then stop calls to an unhealthy dependency.',
    steps: [
      { toolId: 'retry-storm-simulator', label: 'Retry Storm Simulator', reason: 'Make retry waves, amplification, and recovery pressure visible.' },
      { toolId: 'rate-limit-playground', label: 'Rate Limit Playground', reason: 'Test the modeled traffic against a rate-limit policy.', handoff: { type: 'navigation' } },
      { toolId: 'circuit-breaker-playground', label: 'Circuit Breaker Playground', reason: 'Stop calls to a failing dependency while it recovers.', handoff: { type: 'navigation' } },
    ],
  },
  {
    id: 'database-pressure',
    title: 'Database pressure',
    description: 'Find query multiplication, see how it occupies limited pooled connections, then model the waiting backlog.',
    steps: [
      { toolId: 'n-plus-1-query-visualizer', label: 'N+1 Query Visualizer', reason: 'Make query multiplication visible before it extends connection hold time.' },
      { toolId: 'connection-pool-simulator', label: 'Connection Pool Simulator', reason: 'See how database work occupies a limited pool and makes callers wait.', handoff: { type: 'navigation' } },
      { toolId: 'queue-capacity-planner', label: 'Queue Capacity Planner', reason: 'Model the backlog when work arrives faster than the system can complete it.', handoff: { type: 'navigation' } },
    ],
  },
  {
    id: 'latency-deadlines',
    title: 'Latency & deadlines',
    description: 'Find what controls user latency, budget the shared deadline, then test the reliability objective.',
    steps: [
      { toolId: 'fan-out-latency-simulator', label: 'Fan-Out Latency Simulator', reason: 'What controls the user’s latency? Find the critical path and tail exposure.' },
      { toolId: 'timeout-chain-planner', label: 'Timeout Chain Planner', reason: 'Can downstream work fit inside the end-to-end deadline?', handoff: { type: 'navigation' } },
      { toolId: 'sla-chain-visualizer', label: 'SLA Chain Visualizer', reason: 'Can the complete service path meet its reliability objective?', handoff: { type: 'navigation' } },
    ],
  },
];

export function getToolChain(id: string): ToolChain | undefined { return toolChains.find((chain) => chain.id === id); }
export function validateToolChains(registry: Tool[]): string[] {
  const ids = new Set(registry.map((tool) => tool.id));
  const chainIds = new Set<string>();
  const errors: string[] = [];
  for (const chain of toolChains) {
    if (chainIds.has(chain.id)) errors.push(`duplicate chain id: ${chain.id}`);
    chainIds.add(chain.id);
    for (const step of chain.steps) if (!ids.has(step.toolId)) errors.push(`${chain.id}: unknown tool ${step.toolId}`);
  }
  return errors;
}
