import type { Family, FamilyId } from './families';
import type { Tool } from './tools';

export interface ToolSeoContent {
  title: string;
  description: string;
  primaryProblem: string;
  relatedPhrases: string[];
  whatYouLearn: string;
  whenToUse: string;
  interpretation: string;
  limitations: string;
}

const familyInterpretation: Record<FamilyId, string> = {
  check: 'Read each finding as a diagnostic signal, then confirm it against the contract, system, file, or production context you actually control.',
  simulate: 'Compare the shape and direction of different scenarios. The useful signal is how the result changes when an input changes, rather than one isolated number.',
  decide: 'Treat the leading option as the best fit for the priorities you selected. Review the score breakdown before acting because changing those priorities can change the result.',
  plan: 'Use the calculated fit, spacing, timing, or risk as a planning baseline, then verify it against the physical, commercial, or technical constraints of the real project.',
  create: 'Inspect the preview and generated asset against your source material and intended output before using it in production or sending it to print.',
};

const familyLimitations: Record<FamilyId, string> = {
  check: 'This browser-only check cannot observe your server, runtime, deployment, or external contract. It highlights issues in the information you provide and does not replace system-specific validation.',
  simulate: 'This is a simplified explanatory model, not a load test or production forecast. Real systems can include dependencies, distributions, failures, and feedback loops outside the selected inputs.',
  decide: 'The comparison uses transparent editorial scores and the priorities you choose. It supports a decision; it does not prove that one technology or approach is objectively best.',
  plan: 'Results are estimates based on the entered assumptions. Supplier specifications, team constraints, tolerances, and real-world conditions may require a different final plan.',
  create: 'The output is generated locally from your inputs. Check dimensions, compatibility, color, and production requirements in the destination workflow before relying on the exported asset.',
};

const toolLimitations: Partial<Record<string, string>> = {
  'browser-sbom-generator': 'npm package-lock versions 2/3 only, limited to 5 MiB, 5,000 package locations and 30,000 dependency declarations. Lockfile-derived CycloneDX 1.7, not complete deployment coverage, artifact hash verification, SPDX/license compliance or vulnerability scanning. Missing/unresolved relationships are flagged. No upload, registry lookup or persistence.',
  'agent-memory-architecture-planner': 'Deterministic architecture guidance only: no memory store, embeddings, database, AI or network processing. Scope and capture rules are proposals, not enforced isolation or poisoning immunity. Retention categories need owner-approved exact expiry; legal/system-of-record obligations require separate review. Inputs are ephemeral.',
  'local-ai-vs-cloud-ai-decision-lab': 'Editorial architecture fit, not probability, model quality, measured latency, hardware compatibility, price or compliance. No device probing, model execution or network requests. Offline hybrid requires a tested independent local fallback; local execution is not automatically secure and sensitive data has no default cloud approval.',
  'context-engineering-simulator': 'Deterministic aggregate planning model with two synthetic relevance bands per source. Diagnostic estimates overlap; signal retention is nonduplicate relevant-token volume, not recall, accuracy or output quality. No tokenizer, LLM, retrieval, summary, pricing or memory storage runs. Filtering conflicting content does not resolve the facts.',
  'ai-prompt-injection-scanner': 'Bounded, primarily English static heuristics only; not a firewall, LLM judge, malware detector or security certification. A PASS does not prove content is safe. No decoding or execution. Split, paraphrased or unknown patterns may be missed. Editor text remains visible; short evidence masks recognized values, not every possible secret.',
  'api-error-contract-builder': 'Bounded RFC 9457 profile and heuristic security review, not middleware, runtime HTTP validation, complete secret detection or security certification. Status choices depend on actual semantics. Retry safety and deduplication require implementation; Problem Details is not mandatory for every API.',
  'passkey-migration-planner': 'Advisory roadmap from declared evidence, not an authentication implementation, live compatibility test, assurance assessment or security/compliance certification. Credential-provider behavior, recovery and policy vary. No password removal is authorized by a checklist or candidate label.',
  'workflow-agent-decision-lab': 'Editorial architecture guidance, not probability, a benchmark or safety/compliance certification. Scores depend on declared answers; constraints override ranking. Test actual quality, permissions, review, cost and latency before adopting autonomy.',
  'cache-stampede-simulator': 'Seeded educational virtual-clock model, not Redis benchmarking or infrastructure capacity prediction. Origin slowdown is explicit and sampled at launch. No failures, retries, distributed-lock failures, evictions or proactive refresh are modeled. Stale data requires domain-specific approval; jitter cannot fix one hot key by itself.',
  'opentelemetry-trace-doctor': 'Bounded static OTLP JSON review, not collector validation, runtime tracing, complete semantic-convention compliance or security certification. Partial samples, clock skew and instrumentation versions need context. Heuristic masking is not guaranteed anonymization; redact real data first.',
  'mcp-tool-contract-builder': 'MCP tool-definition profile with a bounded object-root JSON Schema 2020-12 subset. No live MCP validation, server generation, reference resolution or security certification. Field/sensitivity warnings are heuristic; runtime validators, authorization, approvals and deduplication require implementation.',
  'ai-agent-permission-planner': 'Advisory deterministic rules, not runtime enforcement, verified authorization or a security certification. Purpose and safeguards are user declarations. Scope checks are shallow; resolved paths, DNS, tenant boundaries, real tool behavior and IAM require independent review and testing.',
  'real-time-transport-decision-lab': 'Weighted editorial fit, not statistical confidence, a benchmark or a capacity guarantee. Replay and recovery require application design. WebTransport is scoped to a verified HTTP/3 path; exact browser support and proxies need separate checks. No connection is created.',
  'ai-agent-cost-loop-simulator': 'Seeded educational aggregates, not an agent runtime or provider forecast. User rates determine cost. All runs have safety caps; summarization is billed explicitly. Branches share average context and repeated-action detection is a stated approximation.',
  'mcp-security-doctor': 'Static JSON heuristics only: no server connection, execution, schema-reference resolution, malware detection or security certification. Annotations and custom approval flags are declarations, not verified safeguards. Results hide values and unknown property names; the editor remains visible.',
  "cloud-cost-guardrail-builder": "No pricing, telemetry, forecasting, cloud credentials or provider actions. All amounts and thresholds are user-defined; a review ceiling is not an enforced cap and billing alerts can lag.",
  "ux-research-study-planner": "Generates a study plan, not research findings or a sample-size calculation. Qualitative patterns are not population estimates; statistical claims require a justified design, recruitment frame and sample calculation.",
  "llm-output-assurance-decision-lab": "A deterministic architecture checklist, not an evaluator or measured probability. Validation, evidence checks and human review cannot guarantee correctness. Consequential automation stops when required review is unavailable.",
  "slo-incident-burn-simulator": "An educational request-based snapshot, not telemetry or uptime measurement. Healthy errors are zero, recovery is linear and response delays extend incidents. A renewing rolling window is not simulated.",
  "data-contract-drift-doctor": "Samples are not schemas. BREAKING labels indicate potential incompatibility; enum, rename and movement findings are inferences. Arrays are sampled and empty arrays cannot establish item contracts.",
  "ui-edge-state-matrix-builder": "Draft test-design guidance, not implemented UI or an exhaustive specification. Business rules remain user-supplied; confirm cancellation, write replay and recovery against the actual contract. Generation and editing are bounded to 50 rows.",
  "accessibility-remediation-planner": "Planning from user-supplied findings only. Criteria, legal applicability, scope and counts are not independently audited. Manual keyboard and assistive-technology testing remain necessary; no compliance certification is provided.",
  "web-rendering-strategy-decision-lab": "Editorial weighted fit, not measured speed or a framework benchmark. Revalidation needs compatible infrastructure. This islands option uses a static shell; APIs, authentication and offline caching require their own architecture.",
  "network-failure-ux-simulator": "Sequential virtual requests and seeded outcomes are educational assumptions, not reliability predictions. The model excludes server contention, transport behavior and actual duplicate completions; no network or real-time timer runs.",
  'frontend-data-exposure-doctor': 'Heuristic review of supplied samples only, not a security audit. Field names do not prove sensitivity; encoded data is not necessarily confidential. Cookie flags, actual storage usage and live credential validity require external review.',
  'llm-eval-case-builder': 'This deterministic test-design tool does not run or grade models. Drafts require relevance review and an explicit rubric; translation, classification boundaries and safety templates need manual completion. No exact answers are inferred.',
  'web-performance-budget-planner': 'Resource allocations are editorial planning assumptions, not measured results or guarantees of Core Web Vitals. Actual values are user-entered; network latency, CPU and server response require representative testing.',
  'client-state-storage-decision-lab': 'Editorial scores do not guarantee security, persistence or capacity. Size categories are assumptions; quotas, denial, eviction and private browsing vary. Tokens need a separate authentication threat model. No storage API is used.',
  'browser-event-loop-simulator': 'An educational parser models a limited syntax subset, not a JavaScript engine. It never executes source. Model frames occur every 16ms and timers use eligibility order; actual rendering, execution time and task sources differ. History is capped.',
  'browser-security-policy-doctor': 'A static targeted header review cannot prove effective browser enforcement, nonce quality, live HTTPS readiness, cross-origin isolation or preload membership. Flexible policies require application context; this is not penetration testing.',
  'api-chaos-payload-builder': 'Generated JSON is syntactically valid and the API contract is unknown. Cases probe types, cardinality and encoding without predicting HTTP status or proving rejection. Input, nesting, case count and output size are capped; generation is not exhaustive.',
  'zero-downtime-schema-change-planner': 'Zero downtime is a goal, not a guarantee. Plans require exact engine/version checks, concurrent-write reconciliation, backups and rehearsal. No migration, backfill, lock or downtime duration is estimated; no SQL is executed.',
  'async-messaging-decision-lab': 'Fit percentages are weighted editorial scores, not measured performance or probabilities. Patterns overlap and delivery, ordering, replay and durability guarantees depend on implementation and configuration.',
  'replica-lag-simulator': 'A single client updates one record. Primary writes commit instantly and replicas apply ordered writes after fixed delays. Routing is seeded; age gaps are not latency or database benchmarks. Sticky routing does not guarantee freshness.',
  'date-time-contract-doctor': 'Epoch units and the 2000–2100 plausibility range are heuristics. Local times have no safe UTC conversion without an offset; DST cannot be resolved without timezone rules. Millisecond conversions lose finer precision. No server contract is executed.',
  'api-payload-doctor': 'The diagnosis uses structural and consistency checks on the pasted JSON. It does not call the API, execute a schema, test authorization, or prove how a server will process the payload.',
  'jwt-time-machine': 'JWT Time Machine decodes time-related claims for inspection. It does not verify the token signature, issuer authenticity, revocation state, permissions, or server-side acceptance.',
  'cors-doctor': 'The result follows the request and response details you enter. It does not send a network request, inspect the live server, change headers, or bypass the browser’s CORS enforcement.',
  'print-ready-doctor': 'Print quality is estimated from pixel dimensions, crop, and target size. Printer hardware, media, viewing distance, sharpening, and production tolerances can change the final result.',
  'schema-drift-doctor': 'The comparison describes the supplied samples. A sample may not represent every valid record or the full formal data contract, so confirm important findings against the authoritative schema.',
  'environment-drift-detector': 'The comparison focuses on key presence, empty values, and apparent types while masking values. It cannot determine whether a secret is correct or whether a configuration works at runtime.',
  'responsive-content-fit-lab': 'The preview measures a configurable content card and labels readability with explicit heuristics. It is not a substitute for testing the complete product in real browsers with real content.',
  'webhook-delivery-simulator': 'This deterministic model explains retries, acknowledgements, recovery, and idempotency. It does not deliver webhooks or reproduce every queue, timeout, and receiver behavior in a production system.',
  'capacity-cliff-simulator': 'Demand and capacity follow the growth, peak, loss, threshold, and expansion assumptions you enter. Use the crossings as planning signals, not guaranteed forecasts.',
  'retry-storm-simulator': 'The traffic model simplifies failure and retry behavior. It is designed to compare immediate retry, backoff, and jitter patterns; it is not a production load test.',
  'ai-project-pricing-lab': 'The range depends on your effort, rate, review, revision, support, and uncertainty inputs. It does not know the client relationship, market, contract, taxes, or final commercial risk.',
  'multi-format-campaign-planner': 'The layout plan uses the selected formats, safe areas, and focal-zone assumptions. Platform templates and publishing interfaces can change, so verify the final creative in each destination.',
};

const toolInterpretation: Partial<Record<string, string>> = {
  'browser-sbom-generator': 'Review generation quality, root metadata and graph warnings before exporting. Distinguish direct, reachable transitive and unclassified components. Copy/download deliberately includes package/project identifiers; review distribution policy and use compatible downstream tools for separate deployment and security analysis.',
  'agent-memory-architecture-planner': 'Start with the smallest useful memory set and an authenticated ownership boundary. Confirm sources, conflicts, sensitivity and retention before writes; test isolation, retrieval, correction and deletion across source records and derived indexes before adopting the proposed architecture.',
  'local-ai-vs-cloud-ai-decision-lab': 'Review hard constraints before fit scores. Validate the proposed local/cloud split on representative tasks, explicitly authorize any data leaving the device, and measure quality, latency, capacity and operational cost before committing to the simplest suitable architecture.',
  'context-engineering-simulator': 'Compare naive and engineered budgets, then inspect retained signal and unresolved source conflicts. Use the largest saving with acceptable evidence loss, retain required instructions and validate ranking, summaries and tool selection against the actual task before adoption.',
  'ai-prompt-injection-scanner': 'Review FAIL signals first and WARN in context. INFO may reflect educational discussion, not an attack. Verify authority outside supplied text, restrict tools, block unapproved data movement and authorize memory writes separately. Never treat a scan as permission to act.',
  'api-error-contract-builder': 'Resolve FAIL findings before export. Review WARN findings in context, align actual HTTP status and headers with the body, document custom extensions and implement the declared client recovery policy.',
  'passkey-migration-planner': 'Resolve recovery and readiness blockers before expansion. Follow each phase prerequisite, success gate and stop condition. Candidate status only starts a password-removal review; preserve approved access until recovery, device loss, portability, exceptions and policy are proven.',
  'workflow-agent-decision-lab': 'Read constraints before scores. A six-point margin favors the simpler eligible option. Use workflows for explicit control, bounded judgment only where needed, and multiple agents only for substantial independent work with useful context separation.',
  'cache-stampede-simulator': 'Compare the same arrivals before and after protection. Check duplicate origin work and overload first, then waiting latency and stale-response age. Jitter spreads different-key expirations; coalescing shares same-key work. A quiet window does not prove a cache is protected.',
  'opentelemetry-trace-doctor': 'Fix definite structure/time errors first, then review privacy and identity signals. Missing parents and multiple roots may reflect a partial sample. PASS only covers supported checks.',
  'mcp-tool-contract-builder': 'PASS means supported builder checks passed, not that implementation is secure. Resolve FAIL before export and review WARN findings. Keep the MCP definition separate from Toolooo safety metadata; copy JSON for a local MCP Security Doctor review.',
  'ai-agent-permission-planner': 'Requested exposure is not residual risk or likelihood. Withhold CONTEXT REQUIRED capabilities, enforce DENY before any approval, and bind human approvals to exact operations. Implement scoped grants and test blocked behavior separately.',
  'real-time-transport-decision-lab': 'Read eligibility and conflicting requirements before percentages. Compare the leading option with the runner-up, inspect scoring weights and use requirement-change triggers to revisit the decision.',
  'mcp-security-doctor': 'Review FAIL signals first, then WARN in context. Narrow scope and verify high-impact approval gates in the actual client/server. PASS applies only to the observed declaration; INFO records limits and unknowns, never proof of safety.',
  "cloud-cost-guardrail-builder": "Review the alert ladder with its owner, then implement environment and category controls separately. Investigate comparable-period baseline changes and assess commitments only against measured stable usage.",
  "ux-research-study-planner": "Agree decision criteria before recruitment, pilot the activities and record observations separately from interpretations. If participants are unavailable, use existing evidence provisionally rather than inventing user findings.",
  "llm-output-assurance-decision-lab": "Implement required gates first, then review stronger production layers and their costs. Use offline evaluation cases for evidence; never use model self-confidence as a substitute for validation or authorization.",
  "slo-incident-burn-simulator": "Inspect consumed budget and delay costs, then compare faster response. Peak burn is an error-fraction ratio; time to exhaust assumes a fixed remaining budget and sustained incident conditions.",
  "data-contract-drift-doctor": "Review BREAKING observations first, confirm RISKY value/date assumptions, and collect evidence for UNKNOWN findings. Preserve aliases or version contracts where consumers require migration.",
  "ui-edge-state-matrix-builder": "Review relevant categories and every expected action, complete custom drafts, remove unsupported behavior and use the matrix as a product acceptance and QA checklist. Export only deliberately reviewed content.",
  "accessibility-remediation-planner": "Follow prerequisite order, then the four phases. Confirm owners and affected flows, inspect the ordering weights and record the specific verification action before closing each barrier.",
  "web-rendering-strategy-decision-lab": "Read blocked requirements before scores. Review the recommended flow, private-cache boundaries and alternative; change strategy when initial-data or route requirements outgrow the current delivery model.",
  "network-failure-ux-simulator": "Compare initial versus eventual success with wait and amplification. Inspect exhaustion and recovery traces, honor server retry guidance and avoid automatic write retries without verified replay safety.",
  'frontend-data-exposure-doctor': 'Prioritize recognized authentication and credential shapes in URLs or persistent stores. Review uncertain field matches against real data classification and remove unnecessary client delivery or retention.',
  'llm-eval-case-builder': 'Edit probes and pass criteria into observable assertions, complete every unfinished template, then run the reviewed pack in your own evaluation harness and inspect actual results.',
  'web-performance-budget-planner': 'Prioritize failed gates, inspect the visible budget derivation and measure unknowns. Keep hero-image and total-image budgets distinct to avoid double-counting their shared bytes.',
  'client-state-storage-decision-lab': 'Read capability and privacy constraints before the percentage. If no single option fits, split public navigation from private data and choose explicit retention and recovery behavior.',
  'browser-event-loop-simulator': 'Read the active statement and stack before the queues. Compare microtask checkpoints with timer eligibility and modeled rendering opportunities; model timestamps are not performance measurements.',
  'browser-security-policy-doctor': 'Review FAIL as malformed recognized protection, WARN as a context-dependent concern and INFO as compatibility or scope guidance. Test changes before enforcement.',
  'date-time-contract-doctor': 'Read FAIL as unsupported or impossible input and WARN as ambiguity or a contract review signal. Only offset-bearing or assumed epoch instants receive UTC conversions.',
  'replica-lag-simulator': 'Compare stale-read exposure and primary read load under the same seed. Observed version age gaps describe freshness, not query latency.',
  'async-messaging-decision-lab': 'Inspect earned weighted points and conflicting requirements. Fit percentages describe this editorial model, not probabilities or implementation guarantees.',
  'zero-downtime-schema-change-planner': 'Follow compatibility and validation gates before switching behavior. Destructive cleanup changes rollback from an application action into a data-recovery problem.',
  'api-chaos-payload-builder': 'Inspect each case path, mutation and concern, then compare observed behavior against your own API contract in a test environment. No HTTP result is predicted.',
};

function sentenceList(values: string[]): string {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

export function getToolSeo(tool: Tool, family: Family): ToolSeoContent {
  const primaryProblem = tool.keywords[0] || tool.name;
  const relatedPhrases = tool.keywords.slice(1, 4);
  const contexts = tool.tags.slice(0, 3).map((tag) => tag.toLowerCase());
  const searchLanguage = [primaryProblem, ...relatedPhrases.slice(0, 2)];

  return {
    title: `${tool.name} | Toolooo`,
    description: tool.shortDescription,
    primaryProblem,
    relatedPhrases,
    whatYouLearn: tool.longDescription,
    whenToUse: `Use ${tool.name} when ${sentenceList(contexts)} work raises questions about ${sentenceList(searchLanguage)} and you need a concrete view before making the next move.`,
    interpretation: toolInterpretation[tool.slug] || familyInterpretation[family.id],
    limitations: toolLimitations[tool.slug] || familyLimitations[family.id],
  };
}
