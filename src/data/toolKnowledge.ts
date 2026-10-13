import type { Tool } from './tools';

export interface ToolKnowledge {
  what: string;
  why: string;
  modelNote: string;
  whenToUse: string;
  example: string;
}

// Curated use cases, not generated results or production guarantees.
export const toolUseCases: Record<string, [string, string]> = {
  'cloud-cost-guardrail-builder': ['Before assigning ownership of cloud spending alerts.', 'Set a monthly target and a warning threshold, then review who responds to each alert. A review ceiling does not automatically shut down resources.'],
  'ux-research-study-planner': ['When a product decision needs evidence from users.', 'Plan a study of checkout abandonment: define a neutral task and participant variation before deciding what observations would change the design.'],
  'llm-output-assurance-decision-lab': ['Before allowing model output to influence a consequential action.', 'Compare a draft-writing feature with an action-taking assistant. Review which validation and human approval layers each requires.'],
  'slo-incident-burn-simulator': ['When comparing incident detection and recovery timing.', 'Keep the request volume and error rate fixed, then shorten detection delay. Compare consumed budget rather than treating the result as uptime telemetry.'],
  'data-contract-drift-doctor': ['Before releasing a changed JSON response to existing consumers.', 'Compare an old sample with a new sample where a nullable timestamp becomes a number. Check affected parsing assumptions; samples alone do not establish a schema.'],
  'ui-edge-state-matrix-builder': ['Before handing a networked feature to implementation or QA.', 'Draft states for a save action: pending, timeout and recovery. Supply the write replay rules rather than assuming a timeout means the save failed.'],
  'accessibility-remediation-planner': ['When prioritizing an existing set of accessibility findings.', 'Enter a shared keyboard-navigation barrier and a page-specific label problem. Review reach and dependencies; this does not independently audit the interface.'],
  'web-rendering-strategy-decision-lab': ['When choosing how a page delivers content and private data.', 'Compare a public frequently updated catalog with a private account page. Check freshness and authentication requirements before accepting a rendering recommendation.'],
  'network-failure-ux-simulator': ['Before deciding how a UI waits, retries and recovers.', 'Compare retry behavior for a read request and a write with unknown completion. Review replay safety before enabling an automatic retry.'],
  'frontend-data-exposure-doctor': ['When reviewing where browser-visible data is placed.', 'Compare a public filter value in a URL with a private token in the same location. Confirm sensitivity and audience; field names are only clues.'],
  'llm-eval-case-builder': ['Before testing an AI feature against reviewed expectations.', 'Draft boundary and failure cases for a classifier, then supply a human-reviewed rubric. Exporting cases does not run or grade a model.'],
  'web-performance-budget-planner': ['Before assigning resource budgets or reviewing measured overruns.', 'Allocate a script budget, enter a measured bundle size and inspect the overrun. A budget is a planning boundary, not a Core Web Vitals score.'],
  'client-state-storage-decision-lab': ['When choosing the lifetime and visibility of browser state.', 'Compare a shareable search filter with a transient form draft. Review exposure and persistence requirements separately from a weighted fit score.'],
  'browser-event-loop-simulator': ['When learning why asynchronous output appears in a particular order.', 'Compare synchronous output, a promise microtask and a zero-delay timer. Inspect queue eligibility; the curated parser is not a full JavaScript runtime.'],
  'browser-security-policy-doctor': ['Before reviewing supplied browser-security response headers.', 'Compare an enforcing CSP with a report-only policy. Check the enforcement distinction before assuming that a reported violation is blocked.'],
  'api-chaos-payload-builder': ['When designing negative cases for a JSON API contract.', 'Start with a field that is required by your actual contract, then compare missing, null and wrong-type mutations against the real validator.'],
  'zero-downtime-schema-change-planner': ['Before coordinating schema changes across coexisting releases.', 'Plan an additive column change, backfill and consumer migration before removing the old field. Rehearse locking and rollback on your exact database version.'],
  'async-messaging-decision-lab': ['When choosing between work distribution, subscribers and retained replay.', 'Compare a background image-processing job with an event consumed by several independent services. Review delivery guarantees in the eventual implementation.'],
  'replica-lag-simulator': ['When explaining stale reads after a successful write.', 'Write one record, then compare primary and replica reads while changing the modeled delay. Sticky routing alone is not a consistency guarantee.'],
  'date-time-contract-doctor': ['Before integrating dates from clients or external APIs.', 'Compare a timestamp with an explicit offset, a local time without an offset and an epoch value. Confirm the producer’s units before conversion.'],
  'api-payload-doctor': ['When diagnosing a request or reviewing a response contract change.', 'Compare an expected object with one that omits a field and another that supplies null. Follow the affected path and confirm what the consumer permits.'],
  'jwt-time-machine': ['When debugging token validity windows and clock assumptions.', 'Use a non-sensitive example token with issued-at, not-before and expiry claims. Move the reference time across expiry; decoding does not verify its signature.'],
  'cors-doctor': ['When a browser blocks a cross-origin API request.', 'Model a credentialed request with a wildcard allow-origin response. Review preflight and response requirements without treating the walkthrough as a live server test.'],
  'print-ready-doctor': ['Before selecting a print size or committing to production.', 'Compare the same image at two target print sizes. Review resolution and crop, then confirm the printer’s actual specifications.'],
  'schema-drift-doctor': ['When comparing observed JSON shapes across releases.', 'Change a price field from a number to a string and compare samples. Review consumer handling before treating the change as compatible.'],
  'environment-drift-detector': ['When a configuration-dependent failure differs across environments.', 'Compare sanitized key sets with one required variable missing in staging. Keep secret values out of the input and validate the real deployment separately.'],
  'responsive-content-fit-lab': ['Before approving content at mobile and desktop widths.', 'Try a long heading and a narrow viewport. Inspect wrapping and hierarchy rather than assuming a short sample represents all content.'],
  'webhook-delivery-simulator': ['When reviewing retry and acknowledgement behavior.', 'Compare a receiver outage with delayed acknowledgement. Observe redelivery and check the receiver’s actual idempotency contract before replaying writes.'],
  'capacity-cliff-simulator': ['Before comparing growth, headroom and expansion timing.', 'Hold initial capacity fixed, increase demand growth and delay expansion. Compare threshold crossing under those assumptions, not as a forecast.'],
  'retry-storm-simulator': ['When a failing dependency is receiving amplified traffic.', 'Compare immediate retries with backoff and jitter under the same outage scenario. Check how attempted load changes before choosing a retry policy.'],
  'cache-value-simulator': ['When comparing cache freshness and reuse for a workload.', 'Change TTL while keeping the traffic pattern fixed. Inspect reuse and stale-data trade-offs; real keys and invalidation can change the outcome.'],
  'rate-limit-playground': ['Before choosing how an API handles bursty traffic.', 'Send the same burst through fixed-window, sliding-window and token-bucket policies. Compare accepted requests and waiting behavior.'],
  'queue-capacity-planner': ['When checking whether workers can drain an expected backlog.', 'Model 100 arrivals per second and 80 completions per second: backlog grows by 20 per second while those rates remain constant.'],
  'sla-chain-visualizer': ['When reviewing availability assumptions across a required request path.', 'Compare a path with two required dependencies to the same path with another required dependency. Review independence assumptions before relying on combined availability.'],
  'fan-out-latency-simulator': ['When comparing parallel and serial downstream calls.', 'Give one downstream branch a much longer response time. Observe how the slowest required branch constrains a parallel result.'],
  'circuit-breaker-playground': ['Before tuning isolation and recovery around a failing dependency.', 'Trigger consecutive failures, then inspect the open and half-open transitions. Compare recovery thresholds without assuming they match a production library.'],
  'n-plus-1-query-visualizer': ['When reviewing per-record database access patterns.', 'Load 10 parent records with one related lookup each: the simple pattern needs 11 queries. Compare eager loading under the displayed model.'],
  'connection-pool-simulator': ['When concurrent database work starts waiting for connections.', 'Keep pool size fixed and increase request concurrency. Inspect queued demand before assuming more connections will make the database faster.'],
  'http-cache-lab': ['When reviewing how response headers control browser or shared caching.', 'Compare a fresh cache entry with a stale entry carrying a validator. Follow whether the modeled request reuses, revalidates or fetches the response.'],
  'scope-creep-visualizer': ['Before accepting extra work within a fixed project quote.', 'Add revision hours while keeping the quoted fee fixed. Compare the effective hourly rate and decide which scope changes need a revised agreement.'],
  'ai-project-pricing-lab': ['When estimating AI-assisted delivery beyond typing time.', 'Include review, revisions and support alongside implementation effort. Compare the quote with those assumptions instead of treating AI output as finished delivery.'],
  'database-decision-lab': ['When database options need comparison against explicit priorities.', 'Increase the priority of consistency and then of flexible document shape. Inspect why the ranking changes before choosing a technology.'],
  'build-vs-buy': ['Before comparing ownership, delivery speed and ongoing cost.', 'Compare an internal build with a subscription over the same planning period. Include maintenance assumptions before accepting the leading option.'],
  'tech-stack-battle': ['When comparing stacks for a particular team and project.', 'Change team familiarity while holding the feature requirements fixed. Inspect the score breakdown rather than reading the winner as a universal ranking.'],
  'distributed-systems-tax': ['Before adding network boundaries to an application.', 'Compare a local operation with a multi-service path. Inspect modeled latency and coordination costs before splitting a working component.'],
  'monolith-vs-microservices-lab': ['When deployment independence must be weighed against operational cost.', 'Compare a small team with a larger team that needs independent releases. Review operational capacity instead of using company size alone.'],
  'rest-vs-graphql-decision-lab': ['When choosing an API style around client data needs.', 'Compare fixed cacheable resource requests with clients that need different field selections. Review caching and operational trade-offs.'],
  'multi-format-campaign-planner': ['Before adapting one campaign composition to several destinations.', 'Compare a wide banner with a portrait crop. Keep the focal subject and essential text inside each destination’s safe area.'],
  'api-pagination-planner': ['Before designing navigation and payload size for a growing list.', 'Compare page-number navigation with a cursor for frequently changing records. Confirm ordering and deep-page access requirements.'],
  'sticky-note-frame-planner': ['Before arranging physical notes inside a frame.', 'Enter note dimensions, spacing and a target frame size. Check the computed layout against the actual usable frame opening.'],
  'timeout-chain-planner': ['Before setting client and downstream request deadlines.', 'Compare a downstream timeout that exceeds the remaining client budget with a shorter budget. Include retry and cancellation assumptions.'],
  'frame-fit-finder': ['Before ordering a frame and mat for an artwork.', 'Compare the artwork dimensions with a frame opening and mat allowance. Confirm whether the supplier quotes outer or usable dimensions.'],
  'paper-nesting-planner': ['Before cutting or printing repeated pieces from a sheet.', 'Keep piece size fixed and compare allowed rotation. Check the layout against cutting gaps and the actual printable area.'],
  'project-quote-risk-planner': ['Before sending a quote with uncertain scope or effort.', 'Add a line item with a larger effort range. Review its exposure separately from fixed, well-understood work.'],
  'roadmap-collision-detector': ['When several projects share people or deadlines.', 'Assign overlapping work to the same person and inspect the collision. Verify the actual calendar and availability before rescheduling.'],
  'crop-guardian': ['Before exporting a reference to different aspect ratios.', 'Compare square and portrait destinations for the same image. Inspect whether the focal subject survives both crops.'],
  'drawing-grid-maker': ['When transferring proportions from a reference to a drawing surface.', 'Overlay a grid on a local reference and use corresponding cells on the target. The grid guides placement; it does not draw the image.'],
  'bleed-safe-area-builder': ['Before preparing artwork for trimming and print.', 'Set the trim size, bleed and safe inset. Keep essential text inside the safe area and confirm the printer’s required bleed.'],
  'value-study-maker': ['When studying tonal structure before adding detail and color.', 'Reduce a reference to a few tonal steps. Compare the large light and dark shapes with the original before using the study.'],
  'perspective-grid-maker': ['When practicing construction around a horizon and vanishing points.', 'Move the horizon and compare the resulting perspective guides. Use them as construction references, not automatic proof that a drawing is correct.'],
};

/**
 * One evidence-based reason per tool. Keeping this beside the canonical tool
 * registry makes the orientation copy reviewable without creating a second
 * result or recommendation system.
 */
export const toolKnowledgeWhyBySlug: Record<string, string> = {
  "cloud-cost-guardrail-builder": "A budget becomes useful when thresholds have owners, response actions and availability boundaries. Review spending context before applying resource controls.",
  "ux-research-study-planner": "A useful study starts with a decision and neutral evidence needs. Method choice alone cannot overcome biased recruitment or leading tasks.",
  "llm-output-assurance-decision-lab": "Valid-looking model output can still be wrong or unsafe to act on. Match assurance layers to the feature’s consequences before trusting its output.",
  "slo-incident-burn-simulator": "Error rate alone hides how traffic and response delays consume an error budget. A phase model shows which response improvements reduce bad events.",
  "data-contract-drift-doctor": "A payload can remain valid JSON while breaking consumer parsing, branching or field access. Compare release evidence before changing a contract.",
  "ui-edge-state-matrix-builder": "A usable feature needs truthful waiting, error, permission and recovery behavior as well as success. Explicit state coverage gives product and QA teams observable checks before those gaps reach users.",
  "accessibility-remediation-planner": "Fix order should unblock real tasks and shared barriers first. Dependencies and supplied reach make the plan actionable without pretending a checklist proves compliance.",
  "web-rendering-strategy-decision-lab": "Initial HTML, private data and freshness impose delivery constraints that framework popularity cannot resolve. Choose the smallest rendering pattern that meets those requirements.",
  "network-failure-ux-simulator": "Retry policy changes both recovery pressure and user waiting. A request can time out after a write succeeds, so retrying needs a replay-safety contract.",
  'frontend-data-exposure-doctor': 'A value can be legitimate but misplaced: shareable links, bundled configuration and persistent browser data expose different audiences and lifetimes.',
  'llm-eval-case-builder': 'Evaluation is useful only when representative inputs and reviewed expectations expose real failure modes; a generated template is not evidence that a model passed.',
  'web-performance-budget-planner': 'Explicit resource budgets make performance trade-offs reviewable before release; supplied measurements reveal overruns while unmeasured outcomes remain unknown.',
  'client-state-storage-decision-lab': 'Shareable navigation, transient state and durable private data have different lifetimes and exposure risks; a high fit score cannot override an unmet capability or privacy constraint.',
  'browser-event-loop-simulator': 'Microtasks wait for the running stack to unwind, while zero-delay timers only become eligible for a later task; seeing those queues explains surprising output order.',
  'browser-security-policy-doctor': 'Header protections interact: report-only CSP does not enforce, multiple policies intersect, and HSTS scope can affect every subdomain long after a rollout.',
  'api-chaos-payload-builder': 'Missing, null, coercible and unexpected values expose different validation assumptions; isolated mutations make those assumptions easier to test against the real API contract.',
  'zero-downtime-schema-change-planner': 'Schema and application changes can break coexisting releases; phased compatibility and explicit rollback gates make the dangerous cleanup point visible.',
  'async-messaging-decision-lab': 'Work distribution, independent subscribers and retained replay are different needs; exposing their trade-offs avoids selecting a broker before deciding the pattern.',
  'replica-lag-simulator': 'A successful primary write may not yet be visible on a replica, and sticky routing alone does not guarantee read-your-write consistency.',
  'date-time-contract-doctor': 'Missing offsets and inconsistent epoch units can change an instant silently, while impossible dates and lifecycle ordering deserve separate contract checks.',
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
  const useCase = toolUseCases[tool.slug];
  if (!useCase) throw new Error(`Missing Toolooo use case for ${tool.slug}`);

  return {
    what: tool.shortDescription,
    why,
    whenToUse: useCase[0],
    example: useCase[1],
    modelNote: 'This browser-side model explains the inputs you choose. Check an important decision against the real system, brief, or production constraints.',
  };
}
