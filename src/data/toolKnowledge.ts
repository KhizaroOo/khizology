import type { Tool } from './tools';

export interface ToolKnowledge {
  what: string;
  why: string;
  modelNote: string;
}

/**
 * One evidence-based reason per tool. Keeping this beside the canonical tool
 * registry makes the orientation copy reviewable without creating a second
 * result or recommendation system.
 */
export const toolKnowledgeWhyBySlug: Record<string, string> = {
  'api-payload-doctor': 'It exposes structural issues such as inconsistent keys, ambiguous fields, unsafe dates, oversized bodies, and deep nesting before they become integration failures.',
  'jwt-time-machine': 'A token can look valid while its time claims make it expired, not yet valid, or valid only during a narrow window.',
  'cors-doctor': 'Browser CORS failures depend on the exact request, response, credentials, and preflight rules, so a precise walkthrough is more useful than a generic error message.',
  'print-ready-doctor': 'Pixel dimensions, crop, and target size determine whether an image has enough detail for a print before production costs are committed.',
  'schema-drift-doctor': 'Added, removed, renamed, or differently typed fields can break consumers even when an API response still appears to work.',
  'environment-drift-detector': 'Configuration differences across environments often explain a deployment problem, and comparing structure keeps secrets out of the diagnosis.',
  'responsive-content-fit-lab': 'Content that looks fine at one width can lose hierarchy, wrap poorly, or overflow at the breakpoints people actually use.',
  'webhook-delivery-simulator': 'Retries, acknowledgements, receiver recovery, and idempotency can turn a delivery failure into duplicate effects or unresolved work.',
  'capacity-cliff-simulator': 'Growth, temporary loss, expansion timing, and a safety threshold determine when available capacity becomes a planning risk.',
  'retry-storm-simulator': 'Immediate retries can amplify a failure into more traffic, while backoff and jitter change that feedback loop.',
  'cache-value-simulator': 'Cache freshness and hit rate are a trade-off, so a TTL or eviction policy needs to be tested against the traffic pattern it will serve.',
  'rate-limit-playground': 'Fixed windows, sliding windows, and token buckets throttle the same traffic differently, which changes fairness and burst behavior.',
  'queue-capacity-planner': 'When arrivals exceed processing, queue depth grows instead of draining; the model makes that threshold visible.',
  'sla-chain-visualizer': 'A request path depends on every required component, so separate availability assumptions can combine into a different modeled service objective.',
  'fan-out-latency-simulator': 'A fan-out request is constrained by its slowest downstream branch, and serial calls compound that delay further.',
  'circuit-breaker-playground': 'Circuit-breaker thresholds and recovery rules decide whether a failing dependency is isolated or allowed to keep consuming resources.',
  'n-plus-1-query-visualizer': 'Fetching related records inside a loop makes query count grow with the dataset, while eager loading changes that cost shape.',
  'connection-pool-simulator': 'A connection pool becomes a queue when concurrent demand exceeds available connections, which changes response time before the database is necessarily slow.',
  'http-cache-lab': 'Cache-Control, validators, and request state decide whether a response is served, revalidated, or fetched again.',
  'scope-creep-visualizer': 'Small additions to a fixed quote consume time and reduce the effective hourly rate before the project appears obviously over budget.',
  'ai-project-pricing-lab': 'AI-assisted delivery still carries review, revision, support, and ownership work that a simple time estimate can hide.',
  'database-decision-lab': 'Database choices depend on the priorities of the specific system, so a transparent score is more useful than a universal ranking.',
  'build-vs-buy': 'The better choice changes with cost, control, speed, and maintenance priorities, including how those costs evolve over time.',
  'tech-stack-battle': 'A stack fit depends on the team, ecosystem, performance needs, and hiring context of the project being planned.',
  'distributed-systems-tax': 'Every network boundary adds latency, failure modes, and operational work that a single-process design avoids.',
  'monolith-vs-microservices-lab': 'Team size, deployment cadence, and scale can make the same architecture helpful in one context and costly in another.',
  'rest-vs-graphql-decision-lab': 'API style should follow the needed query flexibility, caching, team familiarity, and streaming behavior rather than a blanket preference.',
  'multi-format-campaign-planner': 'A reusable campaign composition only works when real destination crops preserve the important content inside each safe area.',
  'api-pagination-planner': 'Page size and pagination method change payload cost, deep-page work, ordering stability, and how people can navigate data.',
  'sticky-note-frame-planner': 'Physical note size, spacing, count, and frame dimensions need to fit together before a layout is built or bought.',
  'timeout-chain-planner': 'A service chain can outlive the client timeout when local budgets are not planned as one end-to-end request.',
  'frame-fit-finder': 'Artwork, matting, and frame dimensions must be compared together to avoid ordering a frame that does not visually or physically fit.',
  'paper-nesting-planner': 'How pieces fit on a sheet directly affects material waste and the number of sheets required for a print or cut run.',
  'project-quote-risk-planner': 'Risky line items can quietly erode a quote, so scope and time exposure need to be visible before it is sent.',
  'roadmap-collision-detector': 'Projects competing for the same people or deadlines create schedule risk that is easier to resolve on a plan than in a live sprint.',
  'crop-guardian': 'Each destination aspect ratio can require a different crop, and reviewing them together protects the focal content before export.',
  'drawing-grid-maker': 'A proportion grid gives a repeatable visual reference for transferring scale and placement from a source to a drawing surface.',
  'bleed-safe-area-builder': 'Bleed, trim, and safe areas protect important print content from being cut off by production tolerances.',
  'value-study-maker': 'Reducing a reference to tonal steps makes value relationships easier to study before detail and color complicate the composition.',
  'perspective-grid-maker': 'A controlled horizon and vanishing points make spatial construction easier to practice and check while drawing.',
};

export function getToolKnowledge(tool: Tool): ToolKnowledge {
  const why = toolKnowledgeWhyBySlug[tool.slug];
  if (!why) throw new Error(`Missing Toolooo knowledge reason for ${tool.slug}`);

  return {
    what: tool.shortDescription,
    why,
    modelNote: 'This browser-side model explains the inputs you choose. Check an important decision against the real system, brief, or production constraints.',
  };
}
