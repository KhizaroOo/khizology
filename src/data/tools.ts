import type { FamilyId } from './families';
import type { ToolFeatureLevel } from './featureLevels';

export type ToolStatus = 'active' | 'planned' | 'experimental';

export type ToolLv3Capability = 'scenario' | 'shareResults' | 'myToolooo' | 'smartNextMoves' | 'toolChains';
export interface ToolNextMove {
  id: string;
  type: 'tool';
  label: string;
  description: string;
  targetToolId: string;
  priority?: number;
}
export interface ToolLv3Config {
  capabilities: Partial<Record<ToolLv3Capability, boolean>>;
  nextMoves?: ToolNextMove[];
  chainIds?: string[];
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  family: FamilyId;
  tags: string[];
  status: ToolStatus;
  featureLevel: ToolFeatureLevel;
  featured?: boolean;
  /** Editorial readiness, not measured search demand or a numeric Value score. */
  growthPriority?: boolean;
  privacySensitive?: boolean;
  icon: string;
  keywords: string[];
  /** Explicit workflow relationships take priority over generic tag similarity. */
  relatedToolIds?: string[];
  nextToolIds?: string[];
  lv3?: ToolLv3Config;
}

export const tools: Tool[] = [
  {id:'api-error-contract-builder',slug:'api-error-contract-builder',name:'API Error Contract Builder',shortDescription:'Create consistent API errors with RFC 9457 JSON, safe messages and client recovery guidance.',longDescription:'Define stable problem types, HTTP statuses and public codes. Build a reviewed error catalog with field-validation extensions, retry classifications, idempotency warnings and safe client actions. Generate and export Problem Details locally without connecting an API.',family:'create',tags:['Engineering','API','Backend','Security','Reliability'],status:'active',featureLevel:2,privacySensitive:true,icon:'📋',keywords:['API error contract builder','RFC 9457 Problem Details JSON','HTTP error catalog','API retry guidance'],relatedToolIds:['api-payload-doctor','api-chaos-payload-builder','data-contract-drift-doctor'],nextToolIds:['retry-storm-simulator','mcp-tool-contract-builder']},

  {id:'passkey-migration-planner',slug:'passkey-migration-planner',name:'Passkey Migration Planner',shortDescription:'Plan a staged passkey rollout with recovery, fallback, shared-device and password-removal gates.',longDescription:'Build a practical migration roadmap from current authentication to a supported passkey pilot, enrollment and passkey-first access. Review lost-device recovery, authenticator choices, legacy compatibility, owner-defined metrics, stop conditions and evidence gates before reducing passwords. No authentication or credential APIs run.',family:'plan',tags:['Engineering','Security','Privacy','Planning','UX'],status:'active',featureLevel:2,privacySensitive:true,icon:'🔑',keywords:['passkey migration planner','passwordless rollout plan','passkey recovery fallback','synced device bound passkeys'],relatedToolIds:['browser-security-policy-doctor','frontend-data-exposure-doctor'],nextToolIds:['ui-edge-state-matrix-builder','accessibility-remediation-planner']},

  {id:'workflow-agent-decision-lab',slug:'workflow-agent-decision-lab',name:'Workflow vs Agent vs Multi-Agent Decision Lab',shortDescription:'Choose the simplest useful architecture: code, workflow, one agent, tools or independent specialists.',longDescription:'Compare five architecture patterns using transparent deterministic fit signals, eligibility constraints and a simplicity margin. Review workflow hybrids, coordination penalties, verification conflicts, relative complexity and practical first steps. No runtime agents or model calls execute.',family:'decide',tags:['Engineering','AI','Architecture','Planning','Security'],status:'active',featureLevel:2,privacySensitive:true,icon:'🧭',keywords:['workflow vs agent decision','single agent vs multi agent','code or AI workflow','agent architecture fit'],relatedToolIds:['ai-agent-permission-planner','ai-agent-cost-loop-simulator','llm-output-assurance-decision-lab'],nextToolIds:['async-messaging-decision-lab','mcp-tool-contract-builder']},

  {id:'cache-stampede-simulator',slug:'cache-stampede-simulator',name:'Cache Stampede Simulator',shortDescription:'Compare hot-key expiry, duplicate origin work and cache protection strategies on a seeded virtual clock.',longDescription:'Simulate traffic through a cache to its origin. Compare no protection, request coalescing, bounded stale-while-revalidate, multi-key TTL jitter and combined concurrency protection. Inspect waiting latency, duplicate fetches, overload signals, expiry concentration and freshness trade-offs without connecting to Redis or a database.',family:'simulate',tags:['Engineering','Backend','Performance','Reliability','Architecture'],status:'active',featureLevel:2,privacySensitive:true,icon:'🌊',keywords:['cache stampede simulator','thundering herd cache expiry','request coalescing comparison','TTL jitter stale while revalidate'],relatedToolIds:['retry-storm-simulator','queue-capacity-planner','slo-incident-burn-simulator'],nextToolIds:['network-failure-ux-simulator','web-performance-budget-planner']},

  {id:'opentelemetry-trace-doctor',slug:'opentelemetry-trace-doctor',name:'OpenTelemetry Trace Doctor',shortDescription:'Check trace structure, timing, service identity and sensitive-data signals in static OTLP JSON.',longDescription:'Paste a bounded OpenTelemetry JSON sample and inspect parent relationships, timestamp safety, naming, selected semantic-convention types, error context and GenAI content disclosure. Review masked evidence and prioritized fixes without uploading telemetry or connecting a collector.',family:'check',tags:['Engineering','Backend','API','Security','Performance','AI'],status:'active',featureLevel:2,privacySensitive:true,icon:'🔎',keywords:['OpenTelemetry trace checker','OTLP JSON diagnosis','trace parent validation','telemetry privacy review'],relatedToolIds:['frontend-data-exposure-doctor','mcp-security-doctor','slo-incident-burn-simulator'],nextToolIds:['network-failure-ux-simulator','ai-agent-cost-loop-simulator']},

  {id:'mcp-tool-contract-builder',slug:'mcp-tool-contract-builder',name:'MCP Tool Contract Builder',shortDescription:'Create bounded MCP input/output schemas with separate approval, scope, retry and failure guidance.',longDescription:'Build a tool definition using a bounded JSON Schema 2020-12 editor. Review declared side effects, field constraints, sensitive-data signals and contract-quality findings. Copy MCP JSON separately from Toolooo safety guidance; no MCP server is generated, connected or certified.',family:'create',tags:['Engineering','AI','API','Security','Validation','Planning'],status:'active',featureLevel:2,privacySensitive:true,icon:'📐',keywords:['MCP tool contract builder','MCP input output schema','agent tool safety plan','JSON Schema 2020-12 fields'],relatedToolIds:['ai-agent-permission-planner','llm-output-assurance-decision-lab'],nextToolIds:['mcp-security-doctor']},
  {id:'ai-agent-permission-planner',slug:'ai-agent-permission-planner',name:'AI Agent Permission Planner',shortDescription:'Plan least-privilege agent capabilities, scope restrictions, human approvals and denied actions before connecting tools.',longDescription:'Define an agent job, environment and required capabilities. Review deterministic permission decisions, requested exposure, sensitive-data boundaries, execution limits, audit requirements and emergency controls. Plans stay local and require separate authorization enforcement; this is not a sandbox or security certification.',family:'plan',tags:['Engineering','AI','Security','Privacy','Planning'],status:'active',featureLevel:2,privacySensitive:true,icon:'🔐',keywords:['AI agent permission plan','least privilege agent tools','agent approval boundaries','agent access scope'],relatedToolIds:['mcp-security-doctor','llm-output-assurance-decision-lab'],nextToolIds:['mcp-tool-contract-builder','frontend-data-exposure-doctor','cloud-cost-guardrail-builder']},
  {id:'real-time-transport-decision-lab',slug:'real-time-transport-decision-lab',name:'Real-Time Transport Decision Lab',shortDescription:'Compare Polling, Long Polling, SSE, WebSocket and WebTransport against your communication and infrastructure needs.',longDescription:'Choose direction, freshness, data, reliability, browser and backend requirements. Inspect deterministic weighted fits, capability constraints, trade-offs and switch triggers across five browser transport patterns. Compare workload assumptions without opening a connection or claiming measured performance.',family:'decide',tags:['Engineering','Backend','Frontend','API','Performance','Planning'],status:'active',featureLevel:2,privacySensitive:true,icon:'⇄',keywords:['real-time transport decision','SSE versus WebSocket','polling architecture','WebTransport trade-offs'],relatedToolIds:['async-messaging-decision-lab','network-failure-ux-simulator'],nextToolIds:['retry-storm-simulator','web-performance-budget-planner']},
  {id:'ai-agent-cost-loop-simulator',slug:'ai-agent-cost-loop-simulator',name:'AI Agent Cost & Loop Simulator',shortDescription:'Compare agent token, retry, branch and model-cost growth against explicit guardrails using your own prices.',longDescription:'Simulate seeded agent execution, retained context, tool overhead and retries. Compare baseline usage with step, cost, token, tool, context, branch and approval limits. Inspect bounded timelines and billed summarization assumptions without calling a model or pricing API.',family:'simulate',tags:['Engineering','AI','Performance','Planning'],status:'active',featureLevel:2,privacySensitive:true,icon:'🔁',keywords:['AI agent cost simulation','agent loop guardrails','token growth planning'],relatedToolIds:['retry-storm-simulator','network-failure-ux-simulator'],nextToolIds:['llm-output-assurance-decision-lab','llm-eval-case-builder']},
  {
    id: 'mcp-security-doctor', slug: 'mcp-security-doctor', name: 'MCP Security Doctor',
    shortDescription: 'Review MCP tool and server JSON for risky capabilities, broad permissions, approval gaps and sensitive data signals.',
    longDescription: 'Paste tool definitions, a tools/list response or server configuration for a bounded static security review. Inspect declared capabilities, permissions, approval requirements, schemas, suspicious instructions and trust boundaries with hidden result values. Nothing is executed, connected, uploaded or certified safe.',
    family: 'check', tags: ['Engineering', 'Backend', 'Security', 'Privacy', 'AI', 'Validation'], status: 'active', featureLevel: 2, privacySensitive: true,
    icon: '🛡️', keywords: ['MCP security review', 'MCP tool permissions', 'agent tool trust boundaries', 'MCP configuration checker'],
    relatedToolIds: ['frontend-data-exposure-doctor', 'browser-security-policy-doctor'],
    nextToolIds: ['llm-output-assurance-decision-lab', 'llm-eval-case-builder'],
  },
  {"id":"cloud-cost-guardrail-builder","slug":"cloud-cost-guardrail-builder","name":"Cloud Cost Guardrail Builder","shortDescription":"Build owner-led spending guardrails with your budget thresholds, environment constraints and cost-category review rules.","longDescription":"Set a monthly target, warning percentage, critical amount and review ceiling to draft an operational alert ladder. Add environment uptime assumptions, selected cost categories and an optional measured baseline, then export a local policy with availability, billing-delay and commitment cautions.","family":"create","tags":["Engineering","Backend","Performance","Planning","Money","Capacity"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"☁️","keywords":["cloud cost guardrail policy","cloud budget review","spending alert ladder","cost ownership"],"relatedToolIds":["web-performance-budget-planner","build-vs-buy"],"nextToolIds":["capacity-cliff-simulator"]},
  {"id":"ux-research-study-planner","slug":"ux-research-study-planner","name":"UX Research Study Planner","shortDescription":"Turn a product decision into a neutral study plan with suitable methods, recruitment, evidence and decision criteria.","longDescription":"Describe the decision, user goal and existing evidence, then select study context to draft a practical research plan. Compare method fit, participant variation, neutral tasks, observation and analysis needs while keeping qualitative exploration distinct from statistically justified measurement.","family":"plan","tags":["Design","Frontend","UX","Planning","Testing","Accessibility"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🔎","keywords":["UX research study plan","user research methods","neutral usability tasks","research decision criteria"],"relatedToolIds":["accessibility-remediation-planner","responsive-content-fit-lab"],"nextToolIds":["ui-edge-state-matrix-builder"]},
  {"id":"llm-output-assurance-decision-lab","slug":"llm-output-assurance-decision-lab","name":"LLM Output Assurance Decision Lab","shortDescription":"Choose validation, review and failure-handling layers from an AI feature’s explicit risks and constraints.","longDescription":"Compare fourteen assurance layers for structured, user-facing and action-taking model output. Inspect deterministic reasons, costs and limits, distinguish minimum requirements from a stronger production stack, and define when automation must stop without calling or evaluating a model.","family":"decide","tags":["Engineering","Backend","API","Validation","AI","Security"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🛡️","keywords":["LLM output assurance","AI validation stack","untrusted model output","fail closed architecture"],"relatedToolIds":["browser-security-policy-doctor","api-payload-doctor"],"nextToolIds":["llm-eval-case-builder"]},
  {"id":"slo-incident-burn-simulator","slug":"slo-incident-burn-simulator","name":"SLO Incident Burn Simulator","shortDescription":"Model request-based error-budget consumption through incident severity, detection, mitigation, recovery and traffic spikes.","longDescription":"Use deterministic incident presets and editable timings to trace healthy, incident, detection, mitigation and recovery phases. Compare faster response with baseline, inspect repeated incidents and cumulative budget use, and distinguish burn rate from absolute bad-event spending in one evaluation window.","family":"simulate","tags":["Engineering","Backend","Reliability","Performance","Networking"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🔥","keywords":["SLO incident error budget","burn rate simulator","incident response planning","reliability"],"relatedToolIds":["retry-storm-simulator","sla-chain-visualizer","network-failure-ux-simulator"],"nextToolIds":["timeout-chain-planner","queue-capacity-planner"]},
  {"id":"data-contract-drift-doctor","slug":"data-contract-drift-doctor","name":"Data Contract Drift Doctor","shortDescription":"Compare JSON release samples for consumer-breaking changes, date/value-set drift and possible path movement.","longDescription":"Review before and after JSON snapshots with bounded shared schema inference. Inspect observed type, shape, presence and nullability changes alongside uncertain date, value-set, rename and nesting evidence, then plan consumer validation and a backward-compatible migration.","family":"check","tags":["Engineering","Backend","API","Validation","Data"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🩺","keywords":["data contract drift","consumer compatibility","json release comparison","schema migration"],"relatedToolIds":["api-payload-doctor","schema-drift-doctor"],"nextToolIds":["api-chaos-payload-builder","zero-downtime-schema-change-planner"]},
  {"id":"ui-edge-state-matrix-builder","slug":"ui-edge-state-matrix-builder","name":"UI Edge-State Matrix Builder","shortDescription":"Draft editable UI state coverage with triggers, recovery behavior, QA checks and local JSON/CSV export.","longDescription":"Describe a feature and its network, authentication and write requirements to generate relevant data, interaction, concurrency and recovery states. Edit or remove rows, add custom coverage and export the reviewed product/QA matrix without inventing business behavior.","family":"create","tags":["Engineering","Frontend","UX","Validation","API","Accessibility"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🧩","keywords":["ui edge state matrix","frontend qa coverage","loading empty error states","product state design"]},
  {"id":"accessibility-remediation-planner","slug":"accessibility-remediation-planner","name":"Accessibility Remediation Planner","shortDescription":"Turn observed accessibility barriers into phased fixes with dependencies, owners and verification actions.","longDescription":"Add known accessibility findings, supplied scope and impact to build a practical four-phase remediation order. Inspect blocking barriers, shared fixes, dependency promotion, suggested owners and manual completion checks without scanning a site or claiming certification.","family":"plan","tags":["Engineering","Frontend","Accessibility","Planning","UX"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"♿","keywords":["accessibility remediation plan","keyboard barrier fixes","wcag issue prioritization","accessible ui planning"]},
  {"id":"web-rendering-strategy-decision-lab","slug":"web-rendering-strategy-decision-lab","name":"Web Rendering Strategy Decision Lab","shortDescription":"Rank rendering patterns against freshness, personalization, hosting and discovery requirements.","longDescription":"Compare SSG, SSR, CSR, revalidation, static islands and hybrid rendering with visible weighted points and capability constraints. Inspect delivery flows, cache boundaries, operational costs and switching conditions independently of frameworks.","family":"decide","tags":["Engineering","Frontend","Architecture","Performance","Browser"],"status":"active","featureLevel":2,"icon":"🏗️","keywords":["web rendering strategy","ssg ssr csr comparison","islands architecture","rendering decision"]},
  {"id":"network-failure-ux-simulator","slug":"network-failure-ux-simulator","name":"Network Failure UX Simulator","shortDescription":"Compare seeded retry strategies, waiting, failures and recovery from the frontend user’s perspective.","longDescription":"Model latency, jitter, offline recovery, timeouts and repeated HTTP failures without traffic. Inspect request attempts, backoff, cumulative wait, retry amplification and potential write replay risk across five bounded retry strategies.","family":"simulate","tags":["Engineering","Frontend","Networking","Reliability","API"],"status":"active","featureLevel":2,"icon":"📶","keywords":["network failure ux","retry backoff simulation","offline recovery","frontend timeout"]},
  {"id":"frontend-data-exposure-doctor","slug":"frontend-data-exposure-doctor","name":"Frontend Data Exposure Doctor","shortDescription":"Review browser-visible data placement, masked exposure findings and context-aware safer directions.","longDescription":"Inspect supplied URLs, fragments, cookies, storage dumps, frontend configuration and JSON state. Review authentication, credential, personal-data and unknown signals with location-specific leak surfaces, bounded local decoding and hidden result values.","family":"check","tags":["Engineering","Frontend","Security","Browser","Privacy"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🔒","keywords":["frontend data exposure","browser storage privacy","tokens in url","client secrets review"]},
  {"id":"llm-eval-case-builder","slug":"llm-eval-case-builder","name":"LLM Eval Case Builder","shortDescription":"Design and edit local evaluation case templates with explicit expectations, review notes and JSON export.","longDescription":"Describe an AI feature and representative input to draft happy-path, ambiguity, context, format and failure probes. Select applicable categories, inspect and edit each case, and export a bounded test-design pack without calling a model or inventing ground-truth answers.","family":"create","tags":["Engineering","Backend","API","Validation","AI"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🧪","keywords":["llm evaluation cases","ai feature test design","eval rubric builder","json evaluation pack"]},
  {"id":"web-performance-budget-planner","slug":"web-performance-budget-planner","name":"Web Performance Budget Planner","shortDescription":"Derive project-specific resource budgets and compare optional measurements against transparent release gates.","longDescription":"Set device, network, content and complexity assumptions to allocate initial JavaScript, CSS, fonts and image budgets. Compare entered measurements against resource and Core Web Vitals targets, inspect trade-offs and export a local plan without running network tests.","family":"plan","tags":["Engineering","Frontend","Performance","Planning","Web"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"📊","keywords":["web performance budget","javascript bundle budget","core web vitals targets","frontend release gates"]},
  {"id":"client-state-storage-decision-lab","slug":"client-state-storage-decision-lab","name":"Client State & Storage Decision Lab","shortDescription":"Choose browser state and storage mechanisms with transparent fit scores, capability constraints and privacy cautions.","longDescription":"Compare memory, URL navigation, sessionStorage, localStorage, IndexedDB and Cache API for lifetime, data shape, size, offline needs, history and write frequency. Inspect constraints separately from scores and split incompatible public-navigation and private-data requirements.","family":"decide","tags":["Engineering","Frontend","Architecture","Browser","Privacy","Storage"],"status":"active","featureLevel":2,"icon":"🗄️","keywords":["browser storage decision","localstorage vs indexeddb","client state architecture","url state privacy"]},
  {"id":"browser-event-loop-simulator","slug":"browser-event-loop-simulator","name":"Browser Event Loop Simulator","shortDescription":"Step through the call stack, microtasks, timers and rendering opportunities using safely parsed examples.","longDescription":"Parse a bounded JavaScript teaching subset without executing it. Follow synchronous logs, resolved Promise callbacks, microtasks, timer eligibility, async continuations and modeled rendering callbacks through a readable timeline with run, pause and step controls.","family":"simulate","tags":["Engineering","Frontend","JavaScript","Performance","Browser"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🔄","keywords":["browser event loop simulator","microtask task queue","async await execution order","javascript scheduling"]},
  {"id":"browser-security-policy-doctor","slug":"browser-security-policy-doctor","name":"Browser Security Policy Doctor","shortDescription":"Review CSP, HSTS and browser security headers together, with contextual findings and compatibility cautions.","longDescription":"Paste response headers to inspect enforcing versus report-only CSP, source restrictions, HSTS scope, referrer disclosure, feature delegation and legacy framing protections. Review grouped findings and safer directions without network requests or penetration-testing claims.","family":"check","tags":["Engineering","Backend","Security","Networking","API"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🛡️","keywords":["browser security header checker","content security policy review","hsts policy doctor","permissions policy checker"]},
  {"id":"api-chaos-payload-builder","slug":"api-chaos-payload-builder","name":"API Chaos Payload Builder","shortDescription":"Generate bounded JSON edge-case packs with typed mutations, nested paths and local copy/export.","longDescription":"Start from a JSON object or array and create independent cases for missing fields, nulls, number ranges, text encoding, boolean coercion, array cardinality and object shape. Inspect each path and purpose, copy a payload or export a local test pack without assuming API status codes.","family":"create","tags":["Engineering","Backend","API","Validation"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"🧪","keywords":["api chaos payload generator","json edge case builder","api validation tests","malformed payload testing"],"relatedToolIds":["api-payload-doctor"]},
  {"id":"zero-downtime-schema-change-planner","slug":"zero-downtime-schema-change-planner","name":"Zero-Downtime Schema Change Planner","shortDescription":"Plan compatible schema rollouts with phased deployment, data verification and honest rollback checkpoints.","longDescription":"Choose among nine common relational schema changes and build an expand-and-contract rollout plan. Review application overlap, database-specific locking considerations, resumable backfills, validation gates and the point where destructive cleanup makes rollback require data recovery.","family":"plan","tags":["Engineering","Backend","Database","Deployment"],"status":"active","featureLevel":2,"icon":"🗂️","keywords":["zero downtime schema migration","expand contract migration","database backfill planning","safe column rename"]},
  {"id":"async-messaging-decision-lab","slug":"async-messaging-decision-lab","name":"Async Messaging Decision Lab","shortDescription":"Compare Queue, Pub/Sub and Event Stream against delivery, replay, ordering and operational requirements.","longDescription":"Rank asynchronous messaging patterns with a visible weighted fit model. Inspect the strongest signals, requirement conflicts, winner weaknesses and the delivery, retention and consumer-independence trade-offs before choosing an implementation.","family":"decide","tags":["Engineering","Backend","Architecture","Messaging"],"status":"active","featureLevel":2,"icon":"📬","keywords":["async messaging decision","queue vs pub sub vs event stream","message architecture","event replay"]},
  {"id":"replica-lag-simulator","slug":"replica-lag-simulator","name":"Replica Lag Simulator","shortDescription":"Trace stale replica reads and compare primary routing, post-write windows, sticky reads and lower lag.","longDescription":"Step through a seeded single-client replication model with one primary and up to three replicas. Compare fresh and stale reads, observed version age gaps, routing utilization and mitigation strategies under the same reproducible workload.","family":"simulate","tags":["Engineering","Backend","Database","Reliability"],"status":"active","featureLevel":2,"icon":"🪞","keywords":["replica lag simulator","stale database reads","eventual consistency","read your writes"]},
  {"id":"date-time-contract-doctor","slug":"date-time-contract-doctor","name":"Date & Time Contract Doctor","shortDescription":"Find ambiguous timestamps, epoch-unit risks and unsafe lifecycle ordering in JSON, with safe UTC conversions.","longDescription":"Inspect date/time fields and direct timestamps for missing offsets, impossible dates, mixed representations, suspicious epoch units and sibling lifecycle ordering. Review each path, the reason it matters and safe conversions without guessing a local timezone.","family":"check","tags":["Engineering","Backend","API","Time"],"status":"active","featureLevel":2,"privacySensitive":true,"icon":"📅","keywords":["timestamp validator","date time contract checker","epoch seconds milliseconds","timezone ambiguity"]},
  // ── CHECK ──────────────────────────────────────────
  {
    id: 'api-payload-doctor',
    growthPriority: true,
    name: 'API Payload Doctor',
    slug: 'api-payload-doctor',
    shortDescription: 'Paste an API request or response and get a structured diagnosis of what could go wrong with it.',
    longDescription: 'Drop in a JSON payload and API Payload Doctor runs it through a checklist real backend engineers use — inconsistent key casing, ambiguous null vs. missing fields, oversized payloads, unsafe date formats, duplicate keys, and deep nesting that will bite you later. Every finding is explained, not just flagged.',
    family: 'check',
    tags: ['Engineering', 'Backend', 'API'],
    status: 'active',
    featureLevel: 3,
    featured: true,
    privacySensitive: true,
    icon: '🩺',
    keywords: ['json validator', 'api payload checker', 'request debugging', 'response diagnostics'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true },
      nextMoves: [
        { id: 'check-schema', type: 'tool', label: 'Check the schema', description: 'Compare the observed drift with a broader schema diagnosis.', targetToolId: 'schema-drift-doctor', priority: 1 },
        { id: 'check-environment', type: 'tool', label: 'Check the environment', description: 'Find configuration differences that can explain a changed payload.', targetToolId: 'environment-drift-detector', priority: 2 },
        { id: 'plan-pagination', type: 'tool', label: 'Plan the response shape', description: 'Design a safer paginated response when payload growth is the issue.', targetToolId: 'api-pagination-planner', priority: 3 },
      ],
    },
  },
  {
    id: 'jwt-time-machine',
    name: 'JWT Time Machine',
    slug: 'jwt-time-machine',
    shortDescription: 'Decode a JWT and see its issued/valid/expiry claims plotted on an actual timeline.',
    longDescription: 'Paste a JWT and instead of a wall of decoded JSON, see iat, nbf, and exp laid out on a timeline against right now — was this token ever valid, is it valid now, and exactly when does it die.',
    family: 'check',
    tags: ['Engineering', 'Backend', 'Security', 'API'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🕰️',
    keywords: ['jwt decoder', 'token expiry', 'jwt debugger', 'auth token checker'],
  },
  {
    id: 'cors-doctor',
    name: 'CORS Doctor',
    slug: 'cors-doctor',
    shortDescription: 'Diagnose exactly which CORS rule is blocking a request, and why.',
    longDescription: 'Describe your request and response headers and CORS Doctor walks through the actual browser CORS algorithm step by step, showing exactly where it fails — missing Access-Control-Allow-Origin, a credentials mismatch, a preflight that never got the right method — instead of just repeating the cryptic browser error.',
    family: 'check',
    tags: ['Engineering', 'Backend', 'Networking', 'Security', 'API'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🌐',
    keywords: ['cors error debugger', 'cors checker', 'preflight request', 'access-control-allow-origin'],
  },
  {
    id: 'print-ready-doctor',
    name: 'Print Ready Doctor',
    slug: 'print-ready-doctor',
    shortDescription: 'Check a photo or document against real print sizes and see exactly how sharp it will look at each one.',
    longDescription: 'Upload an image, pick a target print size — from a business card to a full poster — and see a size-by-size print-quality table instead of a single pass/fail. Covers effective PPI, best practical print size, crop/aspect mismatch, and a bleed & safe-area preview.',
    family: 'check',
    tags: ['Print', 'Design'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🖨️',
    keywords: ['print ready checker', 'document print check', 'print resolution', 'safe area checker'],
  },

  {
    id: 'schema-drift-doctor',
    name: 'Schema Drift Doctor',
    slug: 'schema-drift-doctor',
    shortDescription: 'Compare JSON or CSV samples and see where a data contract may have changed.',
    longDescription: 'Compare before and after samples to reveal added or missing fields, type and nullability changes, nested structure drift, and possible renames. Explore the affected paths and the checks a consumer may need, with all parsing and comparison kept in your browser.',
    family: 'check',
    tags: ['Data', 'API', 'Engineering', 'Schema', 'Debugging'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🧬',
    keywords: ['schema drift detector', 'json schema comparison', 'data contract changes', 'csv structure comparison'],
  },
  {
    id: 'environment-drift-detector',
    name: 'Environment Drift Detector',
    slug: 'environment-drift-detector',
    shortDescription: 'Compare environment configuration structures while keeping values masked by default.',
    longDescription: 'Paste or open local environment files to compare key presence, empty settings, and apparent value types across development, staging, and production. See structural drift in a configuration matrix and export a sanitized checklist without uploading or saving your configuration.',
    family: 'check',
    tags: ['Engineering', 'DevOps', 'Configuration', 'Environment', 'Debugging'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🧩',
    keywords: ['environment drift', 'env file comparison', 'configuration matrix', 'missing environment variables'],
  },

  // ── SIMULATE ───────────────────────────────────────
  {
    id: 'responsive-content-fit-lab', name: 'Responsive Content Fit Lab', slug: 'responsive-content-fit-lab',
    shortDescription: 'Resize your content and see where headings, copy, and actions start to struggle.',
    longDescription: 'Test a configurable content card at real browser widths. Explore typography, spacing, action layouts, and card limits, then inspect measured wrapping and overflow alongside clearly labeled readability heuristics at common breakpoints.',
    family: 'simulate', tags: ['Design', 'Frontend', 'Responsive', 'Content', 'UX'], status: 'active', featureLevel: 2,
    icon: '↔️', keywords: ['responsive content tester', 'text wrapping', 'button overflow', 'breakpoint preview'],
  },
  {
    id: 'webhook-delivery-simulator', name: 'Webhook Delivery Simulator', slug: 'webhook-delivery-simulator',
    shortDescription: 'See how failures, retries, and duplicate events affect webhook delivery and processing.',
    longDescription: 'Explore a deterministic webhook delivery model with receiver failures, timeouts, retry delays, recovery, and idempotency. Inspect event timelines and compare acknowledged deliveries with actual processing to understand retries, duplicate side effects, and unresolved work.',
    family: 'simulate', tags: ['Engineering', 'Backend', 'API', 'Webhooks', 'Reliability'], status: 'active', featureLevel: 2,
    icon: '📨', keywords: ['webhook simulator', 'webhook retries', 'idempotency', 'duplicate events', 'delivery timeline'],
  },
  {
    id: 'capacity-cliff-simulator', name: 'Capacity Cliff Simulator', slug: 'capacity-cliff-simulator',
    shortDescription: 'Find when growing demand crosses your safe threshold and available capacity.',
    longDescription: 'Plot demand growth against a current and expanded capacity plan. Explore peaks, temporary capacity loss, expansion timing, and your chosen safe-utilization threshold to see margins, crossings, and the capacity needed through the planning horizon.',
    family: 'simulate', tags: ['Engineering', 'Capacity', 'Planning', 'Performance', 'Growth'], status: 'active', featureLevel: 3,
    icon: '📈', keywords: ['capacity planning simulator', 'demand growth', 'utilization threshold', 'capacity expansion'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'size-the-queue', type: 'tool', label: 'Queue Capacity Planner', description: 'Turn the expected load into a queue-size and drain-rate plan.', targetToolId: 'queue-capacity-planner', priority: 1 },
        { id: 'test-service-levels', type: 'tool', label: 'SLA Chain Visualizer', description: 'Check whether downstream service targets still fit the capacity plan.', targetToolId: 'sla-chain-visualizer', priority: 2 },
      ],
      chainIds: ['capacity-planning'],
    },
  },
  {
    id: 'retry-storm-simulator',
    growthPriority: true,
    name: 'Retry Storm Simulator',
    slug: 'retry-storm-simulator',
    shortDescription: 'Compare retry policies and see how attempts, backoff, jitter, and budgets change recovery pressure.',
    longDescription: 'Model a bounded outage and compare immediate, fixed, and exponential retry policies. See retry waves, load amplification, idempotency warnings, a retry budget, and how synchronized attempts can add pressure while a dependency recovers.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Reliability', 'Architecture'],
    status: 'active',
    featureLevel: 3,
    featured: true,
    icon: '🔁',
    keywords: ['retry storm', 'retry amplification', 'exponential backoff', 'thundering herd'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [{ id: 'test-rate-policy', type: 'tool', label: 'Test the traffic policy', description: 'See whether a rate-limit policy absorbs or protects against the modeled retry pressure.', targetToolId: 'rate-limit-playground', priority: 1 }],
      chainIds: ['resilient-api-traffic'],
    },
  },
  {
    id: 'cache-value-simulator',
    name: 'Cache Value Simulator',
    slug: 'cache-value-simulator',
    shortDescription: 'Simulate cache hit rate and staleness as you change TTL, eviction policy, and traffic pattern.',
    longDescription: 'Adjust TTL, eviction policy, and a simulated traffic pattern, and watch the hit rate and data-staleness tradeoff play out over simulated time — the tradeoff every caching decision actually hinges on.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Architecture', 'Reliability'],
    status: 'active',
    featureLevel: 2,
    icon: '💾',
    keywords: ['cache hit rate', 'ttl simulator', 'cache eviction', 'cache staleness'],
  },
  {
    id: 'rate-limit-playground',
    growthPriority: true,
    name: 'Rate Limit Playground',
    slug: 'rate-limit-playground',
    shortDescription: 'Design and compare a rate-limit policy under steady traffic, bursts, overload, and client retries.',
    longDescription: 'Compare fixed-window, sliding-window, and token-bucket models under steady traffic, short bursts, sustained overload, and retry-created traffic. See allowed flow, throttled 429 responses, burst capacity, and optional Retry-After behavior as an explicit educational model.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'API', 'Reliability'],
    status: 'active',
    featureLevel: 3,
    icon: '🚦',
    keywords: ['rate limiting', 'token bucket', 'sliding window', 'api throttling'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [{ id: 'test-retry-policy', type: 'tool', label: 'Test the retry policy', description: 'See how client retry choices can create the next traffic wave after throttling.', targetToolId: 'retry-storm-simulator', priority: 1 }],
      chainIds: ['resilient-api-traffic'],
    },
  },
  {
    id: 'queue-capacity-planner',
    growthPriority: true,
    name: 'Queue Capacity Planner',
    slug: 'queue-capacity-planner',
    shortDescription: 'See when queues absorb bursts, build backlog, drain, or expose downstream capacity pressure.',
    longDescription: 'Compare steady load, bursts, overload, consumer slowdown, recovery, and scale-out. Make backlog growth, drain time, spare capacity, consumer scaling, and a user-defined downstream ceiling visible before changing queue capacity.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Architecture', 'Reliability'],
    status: 'active',
    featureLevel: 3,
    icon: '📥',
    keywords: ['queue capacity', 'queue buildup', 'message queue simulator', 'backpressure'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'check-connection-throughput', type: 'tool', label: 'Check connection throughput', description: 'Check whether limited database connections are slowing worker throughput.', targetToolId: 'connection-pool-simulator', priority: 1 },
        { id: 'control-incoming-work', type: 'tool', label: 'Control incoming work', description: 'Explore controlling incoming work before it creates an unbounded backlog.', targetToolId: 'rate-limit-playground', priority: 2 },
        { id: 'explore-growth-limit', type: 'tool', label: 'Explore growth limit', description: 'Explore when demand growth crosses available processing capacity.', targetToolId: 'capacity-cliff-simulator', priority: 3 },
      ],
      chainIds: ['database-pressure', 'capacity-planning'],
    },
  },
  {
    id: 'sla-chain-visualizer',
    name: 'SLA Chain Visualizer',
    slug: 'sla-chain-visualizer',
    shortDescription: 'Model required-path reliability, error-budget fit, and the assumptions behind a service objective.',
    longDescription: 'Build a simplified required-dependency reliability model, compare it with a selected service objective across a defined window, make error-budget headroom visible, and surface optional-path and shared-failure assumptions without treating the result as a contractual SLA.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Architecture', 'Reliability'],
    status: 'active',
    featureLevel: 3,
    icon: '🔗',
    keywords: ['sla calculator', 'combined uptime', 'availability chain', 'five nines'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'inspect-critical-latency', type: 'tool', label: 'Fan-Out Latency Simulator', description: 'Inspect critical-path and tail latency separately from availability.', targetToolId: 'fan-out-latency-simulator', priority: 1 },
        { id: 'plan-deadline-budget', type: 'tool', label: 'Timeout Chain Planner', description: 'Check whether dependency work fits inside the caller’s time budget.', targetToolId: 'timeout-chain-planner', priority: 2 },
        { id: 'contain-unhealthy-calls', type: 'tool', label: 'Circuit Breaker Playground', description: 'Explore when calls to a repeatedly unhealthy dependency should stop.', targetToolId: 'circuit-breaker-playground', priority: 3 },
      ],
      chainIds: ['latency-deadlines', 'capacity-planning'],
    },
  },
  {
    id: 'fan-out-latency-simulator',
    growthPriority: true,
    name: 'Fan-Out Latency Simulator',
    slug: 'fan-out-latency-simulator',
    shortDescription: 'Model fan-out tail latency, critical paths, optional work, and deadline headroom.',
    longDescription: 'Explore a deterministic fan-out latency model with required and optional branches, tail-risk amplification under an explicit independence assumption, serial versus parallel completion, deadline headroom, and a focused path to timeout and service-level decisions.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Architecture', 'Networking'],
    status: 'active',
    featureLevel: 3,
    icon: '🌳',
    keywords: ['fan-out latency', 'tail latency', 'parallel requests', 'p99 latency'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'plan-timeout-budget', type: 'tool', label: 'Timeout Chain Planner', description: 'Turn the response deadline into explicit downstream time budgets.', targetToolId: 'timeout-chain-planner', priority: 1 },
        { id: 'check-service-targets', type: 'tool', label: 'SLA Chain Visualizer', description: 'Check whether service targets combine into an achievable customer-facing goal.', targetToolId: 'sla-chain-visualizer', priority: 2 },
        { id: 'contain-failing-branches', type: 'tool', label: 'Circuit Breaker Playground', description: 'See how a breaker can contain calls to a dependency that is repeatedly unhealthy.', targetToolId: 'circuit-breaker-playground', priority: 3 },
      ],
      chainIds: ['latency-deadlines'],
    },
  },
  {
    id: 'circuit-breaker-playground',
    growthPriority: true,
    name: 'Circuit Breaker Playground',
    slug: 'circuit-breaker-playground',
    shortDescription: 'See when a circuit breaker stops calls to a failing dependency and how it tests recovery.',
    longDescription: 'Compare failure containment policies across healthy, intermittent, outage, slow, and recovering dependency scenarios. Follow Closed, Open, and Half-Open states, see avoided dependency calls, and compare failure pressure with and without the breaker.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Reliability', 'Architecture'],
    status: 'active',
    featureLevel: 3,
    icon: '⚡',
    keywords: ['circuit breaker', 'fault tolerance', 'half-open state', 'resilience pattern'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'test-retry-pressure', type: 'tool', label: 'Test retry pressure', description: 'See how retry policy can increase calls before the breaker protects the dependency.', targetToolId: 'retry-storm-simulator', priority: 1 },
        { id: 'control-incoming-volume', type: 'tool', label: 'Control incoming volume', description: 'Rate limiting controls demand before it reaches a downstream dependency.', targetToolId: 'rate-limit-playground', priority: 2 },
      ],
      chainIds: ['resilient-api-traffic'],
    },
  },
  {
    id: 'n-plus-1-query-visualizer',
    name: 'N+1 Query Visualizer',
    slug: 'n-plus-1-query-visualizer',
    shortDescription: 'See how related-data loading multiplies database queries, round trips, and potential downstream pressure.',
    longDescription: 'Compare per-item loading, JOIN/eager loading, batched related loading, and a simplified split-query model. Make query multiplication, sequential round trips, JOIN row expansion, query budgets, and potential query execution rate visible before selecting a data-access strategy.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Database'],
    status: 'active',
    featureLevel: 3,
    icon: '🔢',
    keywords: ['n+1 problem', 'orm query explosion', 'eager loading', 'lazy loading query count'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'test-connection-pressure', type: 'tool', label: 'Test connection pressure', description: 'See how repeated database work can keep pooled connections busy and make callers wait.', targetToolId: 'connection-pool-simulator', priority: 1 },
        { id: 'model-work-backlog', type: 'tool', label: 'Model work backlog', description: 'Explore what happens when database-backed work arrives faster than the system completes it.', targetToolId: 'queue-capacity-planner', priority: 2 },
      ],
      chainIds: ['database-pressure'],
    },
  },
  {
    id: 'connection-pool-simulator',
    growthPriority: true,
    name: 'Connection Pool Simulator',
    slug: 'connection-pool-simulator',
    shortDescription: 'See when callers wait for a pooled connection and how pool size, hold time, scale-out, and database budget interact.',
    longDescription: 'Model normal load, bursts, slow work, long-held connections, and scale-out. See busy versus idle slots, waiting callers, pool acquisition timeouts, current-versus-alternative pool outcomes, and potential database connection exposure before changing a pool setting.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Database', 'Reliability'],
    status: 'active',
    featureLevel: 3,
    icon: '🔌',
    keywords: ['connection pool', 'database pool sizing', 'pool exhaustion', 'concurrent connections'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'inspect-query-multiplication', type: 'tool', label: 'Inspect query multiplication', description: 'One request making many database queries can keep pooled connections busy longer; explore the N+1 pattern.', targetToolId: 'n-plus-1-query-visualizer', priority: 1 },
        { id: 'model-waiting-backlog', type: 'tool', label: 'Model waiting backlog', description: 'See what happens when work arrives faster than it can be completed.', targetToolId: 'queue-capacity-planner', priority: 2 },
        { id: 'explore-capacity-growth', type: 'tool', label: 'Explore capacity growth', description: 'Explore how growth can push a system past available capacity.', targetToolId: 'capacity-cliff-simulator', priority: 3 },
      ],
      chainIds: ['database-pressure'],
    },
  },
  {
    id: 'http-cache-lab',
    name: 'HTTP Cache Lab',
    slug: 'http-cache-lab',
    shortDescription: 'Configure Cache-Control, ETag, and Last-Modified headers and simulate how browsers and CDNs actually cache the response.',
    longDescription: 'Set response caching headers on a mock request and step through what a browser and a CDN would actually do with them — serve from cache, revalidate, or fetch fresh — so HTTP caching semantics stop being guesswork.',
    family: 'simulate',
    tags: ['Engineering', 'Backend', 'Networking', 'API'],
    status: 'active',
    featureLevel: 2,
    icon: '🗄️',
    keywords: ['http caching', 'cache-control header', 'etag', 'cdn caching behavior'],
  },
  {
    id: 'scope-creep-visualizer',
    name: 'Scope Creep Visualizer',
    slug: 'scope-creep-visualizer',
    shortDescription: 'Add "small" extra asks to a freelance project one by one and watch your effective hourly rate shrink.',
    longDescription: 'Start with a quoted project and rate, then add small "just one more thing" asks one at a time — each one recalculates your real effective hourly rate live, making scope creep visible before it quietly eats your margin.',
    family: 'simulate',
    tags: ['Freelance', 'Money', 'Projects'],
    status: 'active',
    featureLevel: 2,
    icon: '📉',
    keywords: ['scope creep', 'freelance rate calculator', 'effective hourly rate', 'project scope tracker'],
  },

  // ── DECIDE ─────────────────────────────────────────
  {
    id: 'ai-project-pricing-lab', name: 'AI Project Pricing Lab', slug: 'ai-project-pricing-lab',
    shortDescription: 'Compare AI-assisted effort with the risk, review, and support you still own.',
    longDescription: 'Use your own effort estimates and hourly baseline to compare straightforward time costing with a transparent contingency range. Explore revisions, uncertainty, review, support, and ownership without treating AI speed as a universal project price.',
    family: 'decide', tags: ['Freelance', 'AI', 'Money', 'Projects', 'Business', 'Pricing'], status: 'active', featureLevel: 2,
    icon: '⚖️', keywords: ['AI project pricing', 'freelance quote planning', 'risk-adjusted effort', 'AI assisted estimates'],
  },
  {
    id: 'database-decision-lab',
    name: 'Database Decision Lab',
    slug: 'database-decision-lab',
    shortDescription: 'Weigh database options against your own priorities and see a transparent, scored recommendation.',
    longDescription: 'Set how much you care about consistency, scalability, query flexibility, ops simplicity, and cost, and Database Decision Lab scores PostgreSQL, MongoDB, a DynamoDB-style key-value store, and a Cassandra-style wide-column store against those exact priorities — showing which inputs caused the result, never claiming one database is universally "the best."',
    family: 'decide',
    tags: ['Engineering', 'Database', 'Architecture'],
    status: 'active',
    featureLevel: 2,
    featured: true,
    icon: '🗃️',
    keywords: ['database comparison', 'postgres vs mongodb', 'database decision', 'sql vs nosql'],
  },
  {
    id: 'build-vs-buy',
    name: 'Build vs Buy',
    slug: 'build-vs-buy',
    shortDescription: 'Weigh building a feature in-house against buying a third-party service, scored against your own priorities.',
    longDescription: 'Set your priorities across cost, control, speed to ship, and ongoing maintenance, and get a transparent, weighted comparison of building the feature yourself versus integrating an existing service.',
    family: 'decide',
    tags: ['Engineering', 'Projects', 'Money'],
    status: 'active',
    featureLevel: 3,
    icon: '🏗️',
    keywords: ['build vs buy', 'make or buy decision', 'third party vs in house'],
    lv3: {
      capabilities: { myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'price-the-work', type: 'tool', label: 'AI Project Pricing Lab', description: 'Price the delivery work before comparing it against a vendor quote.', targetToolId: 'ai-project-pricing-lab', priority: 1 },
        { id: 'test-the-quote', type: 'tool', label: 'Project Quote Risk Planner', description: 'Make the assumptions and risk margin behind the preferred option visible.', targetToolId: 'project-quote-risk-planner', priority: 2 },
      ],
      chainIds: ['delivery-strategy'],
    },
  },
  {
    id: 'tech-stack-battle',
    name: 'Tech Stack Battle',
    slug: 'tech-stack-battle',
    shortDescription: 'Compare candidate tech stacks head-to-head, scored against your project\'s actual priorities.',
    longDescription: 'Pick candidate stacks and weight what matters for your project — team familiarity, ecosystem maturity, performance, hiring pool — and see a transparent, scored comparison with the reasoning shown.',
    family: 'decide',
    tags: ['Engineering', 'Architecture', 'Projects'],
    status: 'active',
    featureLevel: 2,
    icon: '⚔️',
    keywords: ['tech stack comparison', 'stack decision', 'framework comparison'],
  },
  {
    id: 'distributed-systems-tax',
    name: 'Distributed Systems Tax',
    slug: 'distributed-systems-tax',
    shortDescription: 'See the real cost of splitting a system into another network hop before you decide to do it.',
    longDescription: 'Every service split adds latency, failure modes, and operational complexity that a single process never had. This lays out that cost explicitly for a proposed split, so "just make it a microservice" is a decision, not a reflex.',
    family: 'decide',
    tags: ['Engineering', 'Architecture', 'Backend'],
    status: 'active',
    featureLevel: 2,
    icon: '💸',
    keywords: ['distributed systems cost', 'microservices tax', 'network hop cost'],
  },
  {
    id: 'monolith-vs-microservices-lab',
    name: 'Monolith vs Microservices Lab',
    slug: 'monolith-vs-microservices-lab',
    shortDescription: 'Weigh monolith vs microservices for your actual team size and deployment cadence — not dogma.',
    longDescription: 'Set your team size, deployment frequency, and scale, and get a transparent, weighted comparison of staying monolithic versus splitting into microservices — with the reasoning behind the score shown plainly.',
    family: 'decide',
    tags: ['Engineering', 'Architecture', 'Backend'],
    status: 'active',
    featureLevel: 2,
    icon: '🧱',
    keywords: ['monolith vs microservices', 'architecture decision', 'service decomposition'],
  },
  {
    id: 'rest-vs-graphql-decision-lab',
    name: 'REST vs GraphQL Decision Lab',
    slug: 'rest-vs-graphql-decision-lab',
    shortDescription: 'Compare REST, GraphQL, and gRPC against your API\'s actual shape with a transparent, weighted score.',
    longDescription: 'Set how much your API needs query flexibility, simple caching, team familiarity, and streaming, then compare REST, GraphQL, and gRPC for your specific case — not a blanket opinion.',
    family: 'decide',
    tags: ['Engineering', 'Backend', 'API'],
    status: 'active',
    featureLevel: 2,
    icon: '🔀',
    keywords: ['rest vs graphql', 'api design decision', 'graphql vs rest api'],
  },

  // ── PLAN ───────────────────────────────────────────
  {
    id: 'multi-format-campaign-planner', name: 'Multi-Format Campaign Planner', slug: 'multi-format-campaign-planner',
    shortDescription: 'Group campaign destinations into reusable master compositions and see the crop tradeoffs.',
    longDescription: 'Choose destination canvases or add custom sizes, then explore how a chosen crop-loss limit changes the master layouts your campaign needs. Compare an existing ratio, inspect retained frames, and copy a production plan with destination-specific checks.',
    family: 'plan', tags: ['Creator', 'Design', 'Social Media', 'Campaign', 'Art', 'Content'], status: 'active', featureLevel: 2,
    icon: '🖼️', keywords: ['campaign format planner', 'master compositions', 'aspect ratio groups', 'social media layouts'],
  },
  {
    id: 'api-pagination-planner', name: 'API Pagination Planner', slug: 'api-pagination-planner',
    shortDescription: 'Compare pagination behavior and explore the tradeoff between page size and request count.',
    longDescription: 'Compare offset queries, cursor APIs, and keyset queries for your navigation and data-update pattern. Explore payload sizes, deep-page work, stable ordering, and page-jump requirements to choose an approach and a starting page-size range to test.',
    family: 'plan', tags: ['Engineering', 'API', 'Backend', 'Performance', 'Data'], status: 'active', featureLevel: 2,
    icon: '📑', keywords: ['API pagination planner', 'offset vs keyset', 'cursor pagination', 'page size calculator'],
  },
  {
    id: 'sticky-note-frame-planner',
    name: 'Sticky Note Frame Planner',
    slug: 'sticky-note-frame-planner',
    shortDescription: 'Plan how sticky notes tile inside a frame or board — to scale, before you commit to a layout.',
    longDescription: 'Set note size, count, and spacing, and see a to-scale visual layout of how they arrange inside a frame or board, with the frame size needed calculated for you.',
    family: 'plan',
    tags: ['Art', 'Print', 'Design'],
    status: 'active',
    featureLevel: 2,
    featured: true,
    icon: '🗒️',
    keywords: ['sticky note layout', 'frame planner', 'sticky note grid', 'art board planner'],
  },
  {
    id: 'timeout-chain-planner',
    growthPriority: true,
    name: 'Timeout Chain Planner',
    slug: 'timeout-chain-planner',
    shortDescription: 'Plan one end-to-end deadline across serial calls, retries, and remaining downstream budget.',
    longDescription: 'Model how local work and serial downstream calls consume one end-to-end deadline. Compare expected latency with timeout ceilings, spot timeout inversions and retry plans that cannot fit, and make cancellation and deadline-propagation assumptions explicit.',
    family: 'plan',
    tags: ['Engineering', 'Backend', 'Reliability', 'Architecture'],
    status: 'active',
    featureLevel: 3,
    icon: '⏱️',
    keywords: ['timeout budget', 'service chain timeout', 'request timeout planning'],
    lv3: {
      capabilities: { scenario: true, shareResults: true, myToolooo: true, smartNextMoves: true, toolChains: true },
      nextMoves: [
        { id: 'compare-fanout-critical-path', type: 'tool', label: 'Fan-Out Latency Simulator', description: 'Use the critical path and tail-latency model before assigning a deadline budget.', targetToolId: 'fan-out-latency-simulator', priority: 1 },
        { id: 'check-service-objective', type: 'tool', label: 'SLA Chain Visualizer', description: 'Compare the deadline design with the end-to-end availability target.', targetToolId: 'sla-chain-visualizer', priority: 2 },
        { id: 'test-retry-amplification', type: 'tool', label: 'Retry Storm Simulator', description: 'A retry plan can fit the deadline and still amplify failure traffic.', targetToolId: 'retry-storm-simulator', priority: 3 },
      ],
      chainIds: ['latency-deadlines'],
    },
  },
  {
    id: 'frame-fit-finder',
    name: 'Frame Fit Finder',
    slug: 'frame-fit-finder',
    shortDescription: 'See your artwork placed inside candidate frame sizes before you buy one.',
    longDescription: 'Enter your artwork\'s dimensions and preview it placed inside standard and custom frame sizes, with matting accounted for, so you can pick a frame that actually fits before you order it.',
    family: 'plan',
    tags: ['Art', 'Print', 'Framing'],
    status: 'active',
    featureLevel: 2,
    icon: '🖼️',
    keywords: ['frame size finder', 'art framing calculator', 'picture frame fit'],
  },
  {
    id: 'paper-nesting-planner',
    name: 'Paper Nesting Planner',
    slug: 'paper-nesting-planner',
    shortDescription: 'Plan how multiple pieces nest onto a sheet of paper or print stock with minimal wasted area.',
    longDescription: 'Enter your piece sizes and a sheet size, and see a visual layout of how they nest together with the wasted area shown — so you know how many sheets you actually need before you print or cut.',
    family: 'plan',
    tags: ['Art', 'Print', 'Design'],
    status: 'active',
    featureLevel: 2,
    icon: '📄',
    keywords: ['paper nesting', 'print layout planner', 'cut layout optimizer'],
  },
  {
    id: 'project-quote-risk-planner',
    name: 'Project Quote Risk Planner',
    slug: 'project-quote-risk-planner',
    shortDescription: 'See which line items in a client quote carry the most risk of scope or time overrun before you send it.',
    longDescription: 'Break a project quote into line items and flag which ones historically run over on time or scope — so the risk is visible in the quote itself, not discovered halfway through the project.',
    family: 'plan',
    tags: ['Freelance', 'Money', 'Projects'],
    status: 'active',
    featureLevel: 2,
    icon: '📋',
    keywords: ['project quote risk', 'freelance quote planner', 'scope risk estimator'],
  },
  {
    id: 'roadmap-collision-detector',
    nextToolIds: ['scope-creep-visualizer'],
    name: 'Roadmap Collision Detector',
    slug: 'roadmap-collision-detector',
    shortDescription: 'Lay multiple project timelines side by side and catch where they collide before it becomes a fire drill.',
    longDescription: 'Add multiple project timelines with their shared resources and deadlines, and see exactly where they overlap or compete — catching a scheduling collision on the plan, not in the middle of the sprint.',
    family: 'plan',
    tags: ['Projects', 'Productivity'],
    status: 'active',
    featureLevel: 2,
    icon: '🗺️',
    keywords: ['roadmap planner', 'project timeline collision', 'resource overlap planner'],
  },

  // ── CREATE ─────────────────────────────────────────
  {
    id: 'crop-guardian',
    name: 'Crop Guardian',
    slug: 'crop-guardian',
    shortDescription: 'Crop one image to multiple target aspect ratios at once and export every crop, right in your browser.',
    longDescription: 'Upload an image once, set the aspect ratios you need (square, 16:9, story, print sizes...), fine-tune each crop visually, and export them all — nothing ever leaves your browser.',
    family: 'create',
    tags: ['Art', 'Design'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '✂️',
    keywords: ['multi crop tool', 'aspect ratio cropper', 'batch image crop'],
  },
  {
    id: 'drawing-grid-maker',
    nextToolIds: ['perspective-grid-maker'],
    name: 'Drawing Grid Maker',
    slug: 'drawing-grid-maker',
    shortDescription: 'Generate and download a proportion grid overlay for any canvas size — for tracing, scaling, or practice.',
    longDescription: 'Set your canvas size and grid density, preview the grid live, and download it as an image — a clean overlay for gridding up a reference, scaling a sketch, or practicing proportion.',
    family: 'create',
    tags: ['Art', 'Drawing'],
    status: 'active',
    featureLevel: 2,
    featured: true,
    privacySensitive: true,
    icon: '🔳',
    keywords: ['drawing grid generator', 'proportion grid', 'grid overlay maker', 'sketch grid'],
  },
  {
    id: 'bleed-safe-area-builder',
    relatedToolIds: ['frame-fit-finder', 'paper-nesting-planner'],
    nextToolIds: ['perspective-grid-maker'],
    growthPriority: true,
    name: 'Bleed & Safe Area Builder',
    slug: 'bleed-safe-area-builder',
    shortDescription: 'Generate a downloadable bleed and safe-area guide for any print size.',
    longDescription: 'Set your print size and bleed amount and download a ready-to-use SVG/PNG guide overlay showing trim line, bleed, and safe area — so nothing important gets cut off at the printer.',
    family: 'create',
    tags: ['Print', 'Design'],
    status: 'active',
    featureLevel: 2,
    icon: '🎯',
    keywords: ['bleed guide generator', 'safe area template', 'print bleed calculator'],
  },
  {
    id: 'value-study-maker',
    nextToolIds: ['perspective-grid-maker'],
    name: 'Value Study Maker',
    slug: 'value-study-maker',
    shortDescription: 'Turn a reference photo into a simplified tonal value study to practice shading and composition from.',
    longDescription: 'Upload a reference image and generate a simplified version reduced to a handful of tonal steps — a clean value study to practice shading, form, and composition from, processed entirely on your device.',
    family: 'create',
    tags: ['Art', 'Drawing'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '🌓',
    keywords: ['value study generator', 'tonal value reference', 'shading practice tool'],
  },
  {
    id: 'perspective-grid-maker',
    relatedToolIds: ['value-study-maker', 'crop-guardian'],
    nextToolIds: ['bleed-safe-area-builder'],
    growthPriority: true,
    name: 'Perspective Grid Maker',
    slug: 'perspective-grid-maker',
    shortDescription: 'Generate and download a customizable 1, 2, or 3-point perspective grid for drawing practice.',
    longDescription: 'Set vanishing points, horizon line, and grid density for 1, 2, or 3-point perspective, preview it live, and download it as an overlay to draw on top of.',
    family: 'create',
    tags: ['Art', 'Drawing'],
    status: 'active',
    featureLevel: 2,
    privacySensitive: true,
    icon: '📐',
    keywords: ['perspective grid generator', 'vanishing point grid', 'drawing perspective tool'],
  },
];

export const getToolBySlug = (slug: string): Tool | undefined =>
  tools.find((t) => t.slug === slug);

export const getToolsByFamily = (familyId: string): Tool[] =>
  tools.filter((t) => t.family === familyId);

export function getRelatedTools(tool: Tool, limit = 3): Tool[] {
  const tagSet = new Set(tool.tags);
  const keywordSet = new Set(tool.keywords);

  return tools
    .filter((candidate) => candidate.status === 'active' && candidate.slug !== tool.slug && !tool.nextToolIds?.includes(candidate.id)
      && (!tool.relatedToolIds?.length || tool.relatedToolIds.includes(candidate.id)))
    .map((candidate) => ({
      candidate,
      score:
        (tool.relatedToolIds?.includes(candidate.id) ? 100 - tool.relatedToolIds.indexOf(candidate.id) : 0)
        + (candidate.family === tool.family ? 8 : 0)
        + candidate.tags.filter((tag) => tagSet.has(tag)).length * 3
        + candidate.keywords.filter((keyword) => keywordSet.has(keyword)).length * 2
        + (candidate.featured ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

const nextFamily: Record<FamilyId, FamilyId> = { check: 'simulate', simulate: 'decide', decide: 'plan', plan: 'create', create: 'check' };
export function getTryNextTools(tool: Tool, limit = 2): Tool[] {
  if (tool.nextToolIds?.length) return tool.nextToolIds
    .map(id => tools.find(candidate => candidate.id === id && candidate.status === 'active' && candidate.id !== tool.id))
    .filter((candidate): candidate is Tool => Boolean(candidate)).slice(0, limit);
  const tagSet = new Set(tool.tags);
  return tools
    .filter(candidate => candidate.status === 'active' && candidate.family === nextFamily[tool.family])
    .map(candidate => ({ candidate, score: candidate.tags.filter(tag => tagSet.has(tag)).length * 3 + (candidate.featured ? 1 : 0) }))
    .filter(({ candidate }) => candidate.tags.some(tag => tagSet.has(tag)))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export const getToolCountByFamily = (familyId: string): number =>
  tools.filter((t) => t.family === familyId).length;

export const activeTools: Tool[] = tools.filter((t) => t.status === 'active');
export const featuredTools: Tool[] = tools.filter((t) => t.featured);
export const growthPriorityTools: Tool[] = activeTools.filter((tool) => tool.growthPriority);

export const getActiveToolCountByFeatureLevel = (featureLevel: ToolFeatureLevel): number =>
  activeTools.filter((tool) => tool.featureLevel === featureLevel).length;

export const allTags: string[] = Array.from(
  new Set(tools.flatMap((t) => t.tags))
).sort();
