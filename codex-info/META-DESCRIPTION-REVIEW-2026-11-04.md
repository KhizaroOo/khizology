# Meta-description review — 2026-11-04

Review performed across 2026-11-03–04 PKT. Changes were reviewed on `codex-dev` and approved for local `dev-dev` integration. Codex has not pushed or deployed this work.

## Coverage and findings

- Generated local HTML: 135; indexable canonical pages: 128; HTML sitemap entries: 128. Inventory was derived from generated canonical/robots tags and `sitemap-0.xml`, not a historical expected count.
- Production sitemap: 130 canonical pages; all returned HTTP 200. All descriptions were present, nonempty and unique; 126 were under 150 characters and none exceeded 160. This is metadata inspection of production HTML, not a repeat interaction audit.
- The two additional live pages are Claude’s Worlds 015/016, absent from this older Codex branch. Their live HTML was reviewed separately; no Claude world/registry edit was needed.
- Local before: 124 descriptions under 150, zero missing/empty/duplicates, none over 160. Short length was a review candidate, not a failure.
- Local after: 28 descriptions improved; 96 short descriptions intentionally retained. Zero missing/empty/unintended duplicate descriptions, none over 160. New descriptions are 150–160 characters by editorial choice; no minimum-length rule or automatic truncation was added.
- The API Payload Doctor’s earlier 160-character fix is preserved exactly; production still serves its previous 95-character description.
- No known overlapping source edits were present in Claude’s local worktree (only its handoff note). Infooo changes are limited to hub metadata; `src/data/infooo.ts` and all world pages are untouched.

## Canonical changes and scope

- `src/data/tools.ts`: 24 page-specific `seoDescription` values. Existing `getToolSeo` and WebApplication schema already consume this canonical SEO value. All 100 tools retain identical visible descriptions and other registry data.
- `src/pages/artworks.astro`: shared page/schema description; artwork count remains derived from `artworks.length`.
- `src/pages/drop-a-vibe.astro` and `src/pages/privacy.astro`: existing canonical description variables reused for meta/social/page schema.
- `src/pages/infooo/index.astro`: one canonical description reused for meta/social/CollectionPage schema.
- No tool behavior, visible listing copy, routes, titles, canonical URLs, indexing rules, sitemap inventory or dependencies changed.

## Changed URLs — local only

| URL | Old local description (characters) | New local description (characters) | Why / supporting implementation |
|---|---|---|---|
| [/artworks/](https://khizooology.com/artworks/) | 170 original sticky-note artworks, illustrations, digital paintings, and visual stories by Khizar Imtiaz (khizooo). **(115)** | Browse 170 original artworks by Khizar Imtiaz (khizooo), from sticky-note sketches to digital paintings. Filter by subject and view each piece up close. **(152)** | Names artwork formats, subject filtering and close viewing; inventory remains dynamic. |
| [/drop-a-vibe/](https://khizooology.com/drop-a-vibe/) | Contact Khizar Imtiaz (khizooo) to share feedback, propose a collaboration, report a bug, suggest a Toolooo idea, or say hello. **(127)** | Contact Khizar Imtiaz for projects, collaboration, questions or feedback. Choose WhatsApp, LinkedIn or email; messages use your selected contact channel. **(153)** | Names the three working direct contact channels, without a website submission promise. |
| [/infooo/](https://khizooology.com/infooo/) | See it. Touch it. Understand it. Explore interactive knowledge worlds by Khizooology. **(85)** | Explore interactive worlds about anatomy, software, AI agents and electricity. Change a scene, watch cause and effect, and discover how complex systems work. **(157)** | Replaces a generic slogan with actual subjects and visual cause/effect interaction. |
| [/privacy/](https://khizooology.com/privacy/) | How Khizooology handles local tool inputs, uploaded images, optional analytics and your consent preferences. **(108)** | Learn how local tool inputs, optional Google Analytics and limited referrals work, how consent controls analytics, and how to change or withdraw your consent. **(158)** | Names consent-controlled analytics, limited referrals and changing/withdrawing consent. |
| [/toolbox/ai-project-pricing-lab/](https://khizooology.com/toolbox/ai-project-pricing-lab/) | Compare AI-assisted effort with the risk, review, and support you still own. **(76)** | Estimate an AI-assisted project's price from your effort and hourly baseline. Compare review, revisions, support and contingency without fixed AI savings. **(154)** | Names effort/rate inputs and review, revision, support and contingency costs; avoids assuming universal AI savings. |
| [/toolbox/api-chaos-payload-builder/](https://khizooology.com/toolbox/api-chaos-payload-builder/) | Generate bounded JSON edge-case packs with typed mutations, nested paths and local copy/export. **(95)** | Generate JSON edge cases for missing fields, nulls, types and array shapes. Inspect each mutation and export local test packs to probe your API's validation. **(157)** | Names actual mutation types and export use; does not predict API rejection. |
| [/toolbox/api-error-contract-builder/](https://khizooology.com/toolbox/api-error-contract-builder/) | Create consistent API errors with RFC 9457 JSON, safe messages and client recovery guidance. **(92)** | Build an API error catalog with HTTP statuses, field validation and retry guidance. Export RFC 9457 Problem Details JSON with safe messages for clients. **(152)** | Explains the error catalog, HTTP/validation/retry coverage and RFC 9457 export. |
| [/toolbox/api-pagination-planner/](https://khizooology.com/toolbox/api-pagination-planner/) | Compare pagination behavior and explore the tradeoff between page size and request count. **(89)** | Compare offset, cursor and keyset pagination for changing data and navigation needs. Explore page size, request count and ordering before testing an API. **(153)** | Names offset/cursor/keyset choices and ordering/page-size decisions. |
| [/toolbox/bleed-safe-area-builder/](https://khizooology.com/toolbox/bleed-safe-area-builder/) | Generate a downloadable bleed and safe-area guide for any print size. **(69)** | Set print dimensions, bleed and safe margins, then preview trim and cut boundaries. Download an SVG or PNG guide to keep important artwork inside the safe area. **(160)** | Explains trim/safe boundaries and supported SVG/PNG guide output. |
| [/toolbox/capacity-cliff-simulator/](https://khizooology.com/toolbox/capacity-cliff-simulator/) | Find when growing demand crosses your safe threshold and available capacity. **(76)** | Model demand growth against current and planned capacity. Explore peaks, outages and expansion timing to see threshold crossings and the headroom you may need. **(159)** | Names modeled demand, losses, expansion timing and threshold/headroom outputs. |
| [/toolbox/cors-doctor/](https://khizooology.com/toolbox/cors-doctor/) | Diagnose exactly which CORS rule is blocking a request, and why. **(64)** | Review the request and response headers you enter to locate CORS mismatches. Understand preflight and credential rules without calling or changing your server. **(159)** | Replaces a claim of exact live diagnosis with entered-header review; no server calls or changes. |
| [/toolbox/database-decision-lab/](https://khizooology.com/toolbox/database-decision-lab/) | Weigh database options against your own priorities and see a transparent, scored recommendation. **(96)** | Weight consistency, scaling, queries, operations and cost to compare database types. Inspect editorial scores and tradeoffs before testing your own workload. **(157)** | Names scoring criteria and editorial limitations before workload testing. |
| [/toolbox/distributed-systems-tax/](https://khizooology.com/toolbox/distributed-systems-tax/) | See the real cost of splitting a system into another network hop before you decide to do it. **(92)** | Model the added latency and compounded failure risk of extra network hops. Compare a service split with an in-process call using your own assumptions. **(150)** | Replaces real-cost certainty with modeled latency/failure risk under supplied assumptions. |
| [/toolbox/environment-drift-detector/](https://khizooology.com/toolbox/environment-drift-detector/) | Compare environment configuration structures while keeping values masked by default. **(84)** | Compare local environment files for missing keys, empty values and type differences. Review masked configuration drift and export a sanitized checklist. **(152)** | Names file/key/value-type checks, masking and sanitized checklist output. |
| [/toolbox/fan-out-latency-simulator/](https://khizooology.com/toolbox/fan-out-latency-simulator/) | Model fan-out tail latency, critical paths, optional work, and deadline headroom. **(81)** | See how one slow required dependency controls response latency. Compare optional branches, deadlines and tail risk in a browser model before changing a design. **(159)** | Leads with the required-dependency lesson, then optional branches, deadlines and modeled tail risk. |
| [/toolbox/frontend-data-exposure-doctor/](https://khizooology.com/toolbox/frontend-data-exposure-doctor/) | Review browser-visible data placement, masked exposure findings and context-aware safer directions. **(99)** | Review URL, storage and frontend configuration samples for potential data exposure. Get masked findings and safer handling guidance without uploading inputs. **(157)** | Specifies supplied URL/storage/configuration samples, potential exposure and masked local guidance. |
| [/toolbox/http-cache-lab/](https://khizooology.com/toolbox/http-cache-lab/) | Configure Cache-Control, ETag, and Last-Modified headers and simulate how browsers and CDNs actually cache the response. **(120)** | Explore Cache-Control, ETag and Last-Modified in a local cache model. Compare freshness and revalidation for browser and shared caches without server calls. **(156)** | Describes modeled freshness/revalidation, not proof of actual browser/CDN behavior. |
| [/toolbox/jwt-time-machine/](https://khizooology.com/toolbox/jwt-time-machine/) | Decode a JWT and see its issued/valid/expiry claims plotted on an actual timeline. **(82)** | Decode JWT time claims and compare issued, not-before and expiry times on a timeline. Inspect timing locally; signatures and server acceptance are not verified. **(160)** | Names supported time claims and explicitly excludes signature/server-acceptance verification. |
| [/toolbox/monolith-vs-microservices-lab/](https://khizooology.com/toolbox/monolith-vs-microservices-lab/) | Weigh monolith vs microservices for your actual team size and deployment cadence — not dogma. **(93)** | Compare a monolith with microservices using team size, deployment needs and scale. Inspect weighted tradeoffs in operations, scaling and independent delivery. **(158)** | Names team/deployment/scale inputs and operational/delivery tradeoffs. |
| [/toolbox/multi-format-campaign-planner/](https://khizooology.com/toolbox/multi-format-campaign-planner/) | Group campaign destinations into reusable master compositions and see the crop tradeoffs. **(89)** | Plan reusable master layouts for multiple campaign sizes. Adjust crop-loss limits, inspect retained frames and copy a plan with destination-specific checks. **(156)** | Explains master layouts, crop-loss controls and destination-specific planning output. |
| [/toolbox/paper-nesting-planner/](https://khizooology.com/toolbox/paper-nesting-planner/) | Plan how multiple pieces nest onto a sheet of paper or print stock with minimal wasted area. **(92)** | Enter piece and sheet sizes to preview a nesting layout, sheet count and unused area. Compare options before cutting; packing is not guaranteed optimal. **(152)** | Names layout, sheet count and waste; removes a suggestion of guaranteed optimal packing. |
| [/toolbox/print-ready-doctor/](https://khizooology.com/toolbox/print-ready-doctor/) | Check a photo or document against real print sizes and see exactly how sharp it will look at each one. **(102)** | Estimate print detail from image pixels, crop and target size. Compare effective PPI, size options and safe margins before checking with your print provider. **(157)** | Replaces exact-sharpness certainty with pixel/crop/PPI estimates and provider verification. |
| [/toolbox/responsive-content-fit-lab/](https://khizooology.com/toolbox/responsive-content-fit-lab/) | Resize your content and see where headings, copy, and actions start to struggle. **(80)** | Preview a content card at common browser widths. Adjust type, spacing and actions, then inspect measured wrapping and overflow alongside readability heuristics. **(160)** | Replaces vague struggling content with measured wrapping/overflow and labeled heuristics. |
| [/toolbox/schema-drift-doctor/](https://khizooology.com/toolbox/schema-drift-doctor/) | Compare JSON or CSV samples and see where a data contract may have changed. **(75)** | Compare JSON or CSV samples for added fields, type changes, nullability and possible renames. Inspect affected paths and plan consumer checks in your browser. **(158)** | Names field/type/nullability/rename checks and consumer follow-up, rather than a generic comparison. |
| [/toolbox/tech-stack-battle/](https://khizooology.com/toolbox/tech-stack-battle/) | Compare candidate tech stacks head-to-head, scored against your project's actual priorities. **(92)** | Weight team familiarity, ecosystem, performance and hiring needs to compare tech stacks. Review editorial scores and reasons, not workload benchmark results. **(157)** | Names scoring priorities and distinguishes editorial scores from benchmarks. |
| [/toolbox/timeout-chain-planner/](https://khizooology.com/toolbox/timeout-chain-planner/) | Plan one end-to-end deadline across serial calls, retries, and remaining downstream budget. **(91)** | Model serial calls, local work and retries against one deadline. Compare expected latency with configured waits to find timeout inversions or unsafe budgets. **(157)** | Separates expected latency from configured waits and identifies inversion/budget concerns. |
| [/toolbox/web-rendering-strategy-decision-lab/](https://khizooology.com/toolbox/web-rendering-strategy-decision-lab/) | Rank rendering patterns against freshness, personalization, hosting and discovery requirements. **(95)** | Compare static, server, client and hybrid rendering for freshness, personalization and hosting needs. Review delivery flows, caching and weighted tradeoffs. **(156)** | Names rendering patterns, decision inputs and flow/cache/tradeoff outputs. |
| [/toolbox/webhook-delivery-simulator/](https://khizooology.com/toolbox/webhook-delivery-simulator/) | See how failures, retries, and duplicate events affect webhook delivery and processing. **(87)** | Model webhook failures, timeouts, retries and idempotency. Trace delivery versus processing to inspect duplicate effects and unresolved work without live calls. **(160)** | Distinguishes delivery from processing and describes duplicate/unresolved work without live calls. |

The old column also matches the live production description for these 28 URLs. The new column exists only in the local build. Claims were checked against canonical long descriptions, tool limitations and relevant controls/models; the rewrites describe existing capabilities and add no new scientific or clinical claims.

## Short descriptions intentionally retained

| URL | Characters | Reason |
|---|---:|---|
| [/](https://khizooology.com/) | 138 | Names original art, browser tools, creator and brand clearly; padding adds no value. |
| [/infooo/agent-identity-lab/](https://khizooology.com/infooo/agent-identity-lab/) | 137 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/agent-incident-response-room/](https://khizooology.com/infooo/agent-incident-response-room/) | 137 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/agent-reliability-lab/](https://khizooology.com/infooo/agent-reliability-lab/) | 139 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/agent-skills-supply-chain/](https://khizooology.com/infooo/agent-skills-supply-chain/) | 145 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/ai-coding-agent-journey/](https://khizooology.com/infooo/ai-coding-agent-journey/) | 124 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/app-deployment-journey/](https://khizooology.com/infooo/app-deployment-journey/) | 126 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/browser-agent-under-attack/](https://khizooology.com/infooo/browser-agent-under-attack/) | 129 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/context-engineering-lab/](https://khizooology.com/infooo/context-engineering-lab/) | 136 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/human-atlas/](https://khizooology.com/infooo/human-atlas/) | 124 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/mcp-security-lab/](https://khizooology.com/infooo/mcp-security-lab/) | 139 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/physical-ai-world/](https://khizooology.com/infooo/physical-ai-world/) | 123 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/rubiks-cube-motion-graph/](https://khizooology.com/infooo/rubiks-cube-motion-graph/) | 110 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/the-agent-economy/](https://khizooology.com/infooo/the-agent-economy/) | 146 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/infooo/the-living-grid/](https://khizooology.com/infooo/the-living-grid/) | 147 | Names this world’s subject and interaction or learning scope accurately; concise copy retained. |
| [/toolbox/](https://khizooology.com/toolbox/) | 122 | States the available tool count, five purposes and browser/privacy access model. |
| [/toolbox/a2a-agent-card-builder/](https://khizooology.com/toolbox/a2a-agent-card-builder/) | 128 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/accessibility-remediation-planner/](https://khizooology.com/toolbox/accessibility-remediation-planner/) | 106 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/agent-memory-architecture-planner/](https://khizooology.com/toolbox/agent-memory-architecture-planner/) | 112 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/agent-skill-security-doctor/](https://khizooology.com/toolbox/agent-skill-security-doctor/) | 122 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/agent-skill-skill-md-builder/](https://khizooology.com/toolbox/agent-skill-skill-md-builder/) | 120 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/agent-trace-eval-builder/](https://khizooology.com/toolbox/agent-trace-eval-builder/) | 125 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/agentic-commerce-protocol-decision-lab/](https://khizooology.com/toolbox/agentic-commerce-protocol-decision-lab/) | 118 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/ai-agent-cost-loop-simulator/](https://khizooology.com/toolbox/ai-agent-cost-loop-simulator/) | 107 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/ai-agent-permission-planner/](https://khizooology.com/toolbox/ai-agent-permission-planner/) | 120 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/ai-agent-sandbox-policy-builder/](https://khizooology.com/toolbox/ai-agent-sandbox-policy-builder/) | 120 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/ai-crawler-policy-builder/](https://khizooology.com/toolbox/ai-crawler-policy-builder/) | 123 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/ai-prompt-injection-scanner/](https://khizooology.com/toolbox/ai-prompt-injection-scanner/) | 119 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/async-messaging-decision-lab/](https://khizooology.com/toolbox/async-messaging-decision-lab/) | 104 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/browser-ai-capability-checker/](https://khizooology.com/toolbox/browser-ai-capability-checker/) | 103 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/browser-event-loop-simulator/](https://khizooology.com/toolbox/browser-event-loop-simulator/) | 105 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/browser-sbom-generator/](https://khizooology.com/toolbox/browser-sbom-generator/) | 123 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/browser-security-policy-doctor/](https://khizooology.com/toolbox/browser-security-policy-doctor/) | 108 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/build-vs-buy/](https://khizooology.com/toolbox/build-vs-buy/) | 107 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/cache-stampede-simulator/](https://khizooology.com/toolbox/cache-stampede-simulator/) | 104 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/cache-value-simulator/](https://khizooology.com/toolbox/cache-value-simulator/) | 94 | Already names TTL, eviction, traffic, hit rate and staleness. |
| [/toolbox/circuit-breaker-playground/](https://khizooology.com/toolbox/circuit-breaker-playground/) | 89 | Clearly explains stopping failed calls and testing recovery. |
| [/toolbox/client-state-storage-decision-lab/](https://khizooology.com/toolbox/client-state-storage-decision-lab/) | 117 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/cloud-cost-guardrail-builder/](https://khizooology.com/toolbox/cloud-cost-guardrail-builder/) | 120 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/coding-agent-instructions-builder/](https://khizooology.com/toolbox/coding-agent-instructions-builder/) | 101 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/connection-pool-simulator/](https://khizooology.com/toolbox/connection-pool-simulator/) | 116 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/content-credentials-workflow-doctor/](https://khizooology.com/toolbox/content-credentials-workflow-doctor/) | 131 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/context-engineering-simulator/](https://khizooology.com/toolbox/context-engineering-simulator/) | 118 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/crop-guardian/](https://khizooology.com/toolbox/crop-guardian/) | 101 | Identifies multi-ratio image cropping, export and local browser processing. |
| [/toolbox/data-contract-drift-doctor/](https://khizooology.com/toolbox/data-contract-drift-doctor/) | 108 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/date-time-contract-doctor/](https://khizooology.com/toolbox/date-time-contract-doctor/) | 109 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/drawing-grid-maker/](https://khizooology.com/toolbox/drawing-grid-maker/) | 104 | Specifies canvas-sized downloadable grids and tracing/scaling use. |
| [/toolbox/family/check/](https://khizooology.com/toolbox/family/check/) | 138 | Names this family’s concrete tool subjects/use cases; no filler needed. |
| [/toolbox/family/create/](https://khizooology.com/toolbox/family/create/) | 125 | Names this family’s concrete tool subjects/use cases; no filler needed. |
| [/toolbox/family/decide/](https://khizooology.com/toolbox/family/decide/) | 133 | Names this family’s concrete tool subjects/use cases; no filler needed. |
| [/toolbox/family/plan/](https://khizooology.com/toolbox/family/plan/) | 137 | Names this family’s concrete tool subjects/use cases; no filler needed. |
| [/toolbox/family/simulate/](https://khizooology.com/toolbox/family/simulate/) | 147 | Names this family’s concrete tool subjects/use cases; no filler needed. |
| [/toolbox/frame-fit-finder/](https://khizooology.com/toolbox/frame-fit-finder/) | 72 | A narrow task: preview artwork in candidate frames before purchase. |
| [/toolbox/llm-eval-case-builder/](https://khizooology.com/toolbox/llm-eval-case-builder/) | 105 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/llm-model-routing-simulator/](https://khizooology.com/toolbox/llm-model-routing-simulator/) | 112 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/llm-output-assurance-decision-lab/](https://khizooology.com/toolbox/llm-output-assurance-decision-lab/) | 106 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/local-ai-vs-cloud-ai-decision-lab/](https://khizooology.com/toolbox/local-ai-vs-cloud-ai-decision-lab/) | 104 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/mcp-app-ui-builder/](https://khizooology.com/toolbox/mcp-app-ui-builder/) | 104 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/mcp-elicitation-builder/](https://khizooology.com/toolbox/mcp-elicitation-builder/) | 108 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/mcp-oauth-cimd-builder-doctor/](https://khizooology.com/toolbox/mcp-oauth-cimd-builder-doctor/) | 110 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/mcp-registry-server-json-builder/](https://khizooology.com/toolbox/mcp-registry-server-json-builder/) | 117 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/mcp-security-doctor/](https://khizooology.com/toolbox/mcp-security-doctor/) | 116 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/mcp-tasks-workflow-builder/](https://khizooology.com/toolbox/mcp-tasks-workflow-builder/) | 112 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/mcp-tool-contract-builder/](https://khizooology.com/toolbox/mcp-tool-contract-builder/) | 98 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/mcp-vs-a2a-vs-webmcp-decision-lab/](https://khizooology.com/toolbox/mcp-vs-a2a-vs-webmcp-decision-lab/) | 113 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/n-plus-1-query-visualizer/](https://khizooology.com/toolbox/n-plus-1-query-visualizer/) | 105 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/network-failure-ux-simulator/](https://khizooology.com/toolbox/network-failure-ux-simulator/) | 101 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/openapi-to-mcp-tool-mapper/](https://khizooology.com/toolbox/openapi-to-mcp-tool-mapper/) | 116 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/opentelemetry-trace-doctor/](https://khizooology.com/toolbox/opentelemetry-trace-doctor/) | 95 | Names static OTLP JSON, trace/timing/identity checks and sensitive-data signals. |
| [/toolbox/passkey-migration-planner/](https://khizooology.com/toolbox/passkey-migration-planner/) | 96 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/perspective-grid-maker/](https://khizooology.com/toolbox/perspective-grid-maker/) | 92 | States supported perspective modes and downloadable drawing output. |
| [/toolbox/project-quote-risk-planner/](https://khizooology.com/toolbox/project-quote-risk-planner/) | 103 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/prompt-cache-efficiency-simulator/](https://khizooology.com/toolbox/prompt-cache-efficiency-simulator/) | 120 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/queue-capacity-planner/](https://khizooology.com/toolbox/queue-capacity-planner/) | 92 | Already names bursts, backlog/drain and downstream pressure. |
| [/toolbox/rag-chunking-simulator/](https://khizooology.com/toolbox/rag-chunking-simulator/) | 113 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/rate-limit-playground/](https://khizooology.com/toolbox/rate-limit-playground/) | 98 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/real-time-transport-decision-lab/](https://khizooology.com/toolbox/real-time-transport-decision-lab/) | 115 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/replica-lag-simulator/](https://khizooology.com/toolbox/replica-lag-simulator/) | 102 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/rest-vs-graphql-decision-lab/](https://khizooology.com/toolbox/rest-vs-graphql-decision-lab/) | 99 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/retry-storm-simulator/](https://khizooology.com/toolbox/retry-storm-simulator/) | 99 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/roadmap-collision-detector/](https://khizooology.com/toolbox/roadmap-collision-detector/) | 104 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/scope-creep-visualizer/](https://khizooology.com/toolbox/scope-creep-visualizer/) | 101 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/sla-chain-visualizer/](https://khizooology.com/toolbox/sla-chain-visualizer/) | 98 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/slo-incident-burn-simulator/](https://khizooology.com/toolbox/slo-incident-burn-simulator/) | 123 | Identifies the modeled relationship, controls or observable outcome. |
| [/toolbox/software-provenance-workflow-builder/](https://khizooology.com/toolbox/software-provenance-workflow-builder/) | 118 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/sticky-note-frame-planner/](https://khizooology.com/toolbox/sticky-note-frame-planner/) | 93 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/structured-output-json-schema-builder/](https://khizooology.com/toolbox/structured-output-json-schema-builder/) | 119 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/ucp-business-profile-builder/](https://khizooology.com/toolbox/ucp-business-profile-builder/) | 110 | Names the artifact to be built/generated and its scope or review/export purpose. |
| [/toolbox/ui-edge-state-matrix-builder/](https://khizooology.com/toolbox/ui-edge-state-matrix-builder/) | 103 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/ux-research-study-planner/](https://khizooology.com/toolbox/ux-research-study-planner/) | 117 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/value-study-maker/](https://khizooology.com/toolbox/value-study-maker/) | 100 | Identifies the reference-photo transformation and shading-practice purpose. |
| [/toolbox/web-performance-budget-planner/](https://khizooology.com/toolbox/web-performance-budget-planner/) | 109 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/webmcp-readiness-doctor/](https://khizooology.com/toolbox/webmcp-readiness-doctor/) | 108 | Identifies the supplied data/configuration and specific review findings or boundaries. |
| [/toolbox/workflow-agent-decision-lab/](https://khizooology.com/toolbox/workflow-agent-decision-lab/) | 101 | Identifies alternatives/criteria and the comparison or decision value. |
| [/toolbox/x402-agent-payment-simulator/](https://khizooology.com/toolbox/x402-agent-payment-simulator/) | 107 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |
| [/toolbox/zero-downtime-schema-change-planner/](https://khizooology.com/toolbox/zero-downtime-schema-change-planner/) | 106 | States the task, relevant inputs and useful planning/result purpose; no length-only expansion. |

## Production-only Claude pages — reviewed, unchanged

| URL | Description | Characters | Decision |
|---|---|---:|---|
| [/infooo/why-cities-trap-heat/](https://khizooology.com/infooo/why-cities-trap-heat/) | Run one hot day on two city blocks under the same sky and watch where the heat goes: sunlight, hot surfaces, stored heat and a night that never fully cools. | 156 | Retain: specific interactive cause/effect and subject/data context; no padding or Claude-source edit. |
| [/infooo/why-food-prices-rise/](https://khizooology.com/infooo/why-food-prices-rise/) | Cut one dollar of food into slices, push on one cost and watch which shelf prices jump, which barely move, and who feels it. USDA data, 21 foods. | 145 | Retain: specific interactive cause/effect and subject/data context; no padding or Claude-source edit. |

## Intentional social override

Rubik’s Cube retains its existing 110-character main description and explicit social tagline: “Turn it. Trace it. Understand what moves in a Rubik’s Cube.” Open Graph and Twitter match each other. The override is intentional in its page source and was not replaced by a generic consistency rule. Every changed page’s meta/OG/Twitter description matches its canonical value; applicable page/application schema descriptions match too.

## Excluded generated documents

| Document | Reason |
|---|---|
| `404.html` | noindex |
| `frop-a-vibe/index.html` | redirect |
| `future-monsters/index.html` | noindex |
| `infooo/human-atlas-viewer/index.html` | noindex |
| `notes/index.html` | noindex |
| `yandex_7e0cf9493bfbe950.html` | standalone/no canonical |
| `you-ask-i-answer/index.html` | noindex |

## Verification

- PASS: final `npm run build` (133 Astro routes; 135 HTML documents including copied standalone/verification documents).
- PASS: SEO, prelaunch, domain, Value, analytics/privacy, Infooo category and batch 96–100 built-output/100-tool registry tests.
- PASS: `npx astro check` — 477 files, zero errors, zero warnings, 12 existing hints.
- PASS: exact before/after generated inventory; only the 28 intended descriptions changed, all other indexable descriptions/social values and canonical routes preserved.
- PASS: applicable generated page/application schema descriptions, meta/social derivation, sitemap membership, unchanged exclusions and no corrupted replacement characters.
- PASS: registry comparison against HEAD — only the 24 SEO description fields differ; API Payload Doctor’s earlier description is byte-for-byte unchanged.
- PASS: `git diff --check`.
- No new test enforces 150 characters globally. Existing checks already protect missing/duplicate metadata and schema consistency; human context review addresses the meaningful quality issue.

## Live status and remaining limits

These changes are local only. Existing production metadata remains unchanged until Khizooo releases it. Bing must recrawl after deployment to reassess its warning; a build does not prove recrawling or snippet selection. Search engines can choose different snippets. No private search-provider crawl report was used to certify a rescan.

Claude’s two production-only worlds were verified through live HTML, not generated from this Codex branch. No unfinished Claude work was merged. No remaining actionable metadata issue was found within the reviewed scope.
