# Toolooo knowledge review — 4 November 2026

Local `codex-dev` review; no commit, merge, push or deployment. Preserves the pending documentation-review work. The approved Technical Clarity Review, Infooo and Artooo were not changed.

## Scope and method

Reviewed all **100 active tools** from the current canonical registry. Systematic checks traced route/component bindings, static What/Why/use-case data, result and action bindings, artifact controls, shared DecisionLab/LocalReviewOutput, canonical Next/Related ranking and all 12 LV3 continuations. Manual source/model review covered the weak and custom result patterns. Browser coverage below is representative; this is not 100 manual usability sessions or measured 5/10/30-second user research.

`main` was `bcea18b` at inspection and already included Codex `72ae31f`; the older Codex branch omits Claude's Worlds 015/016. This mission changed Toolooo only and did not bring other branches into this worktree.

## Changes

- Shared DecisionLab now puts a plain Result/Why/Action before score bars for five tools, with option-specific prototype/verification advice. Zero priorities, equal scores and excluded candidates do not produce a false unique recommendation. Weighted scores, ordering and deal-breaker calculations are unchanged.
- Data Contract Drift Doctor explains impact and prioritizes an actual finding's action. SLO Incident Burn names fit/exhaustion/overrun before metrics, including the zero-headroom boundary. Both use Insight's concise announcement rather than wrapping its entire text in another live region.
- Project Quote Risk Planner labels fixed effort uplifts and compounded scenarios honestly, removes historical/probability/certainty claims, and directs attention to the largest actual extra-hours contribution. Its arithmetic is unchanged (default 115h base, 148.5h once-applied, 193.125h twice-applied). Short/long canonical descriptions and scenario instructions match this behavior.
- Cache Value retains its TTL/capacity/traffic model. The advanced metric describes entry age, not verified source-data staleness. Three scenario instructions now refer to actual database, stack and quote controls. Fan-Out Why distinguishes required from optional branches.
- 47 canonical Next records were curated/refined, including 38 formerly chosen by family rotation. Similar tags remain a Related mechanism. Existing canonical destination use cases supply conditional guidance when no source-specific Next reason exists. Smart moves and following chain steps are excluded from Related, without changing LV3 chains/state/analytics.
- Crawler policy and Content Credentials have no fabricated in-app Next: their real actions are deploying/testing the robots policy and verifying the actual media publishing pipeline. Related exploration remains available.
- Static What/Why and existing deep explanations remain; no parallel static Result/Action section, new tool, route, dependency, network processing or persistence was added.

## Per-tool classification

A transition means a weakness was corrected. `good` is a source/model classification, not a measured usability score. `not useful` means an educational comparison does not justify a direct production prescription. Missing Next¹ is intentional external verification, not a broken route.

| Active tool slug | What | Why | Result/artifact | Action | Next |
|---|---|---|---|---|---|
| mcp-tasks-workflow-builder | good | good | good | good | good |
| mcp-elicitation-builder | good | good | good | good | good |
| mcp-oauth-cimd-builder-doctor | good | good | good | good | weak → good |
| ucp-business-profile-builder | good | good | good | good | good |
| agentic-commerce-protocol-decision-lab | good | good | good | good | good |
| mcp-registry-server-json-builder | good | good | good | good | weak → good |
| agent-trace-eval-builder | good | good | good | good | good |
| openapi-to-mcp-tool-mapper | good | good | good | good | good |
| agent-skill-security-doctor | good | good | good | good | good |
| ai-agent-sandbox-policy-builder | good | good | good | good | good |
| content-credentials-workflow-doctor | good | good | good | good | weak → missing¹ |
| agent-skill-skill-md-builder | good | good | good | good | weak → good |
| mcp-app-ui-builder | good | good | good | good | good |
| x402-agent-payment-simulator | good | good | good | good | good |
| a2a-agent-card-builder | good | good | good | good | weak → good |
| software-provenance-workflow-builder | good | good | good | good | weak → good |
| browser-ai-capability-checker | good | good | good | good | good |
| structured-output-json-schema-builder | good | good | good | good | good |
| llm-model-routing-simulator | good | good | good | good | good |
| webmcp-readiness-doctor | good | good | good | good | good |
| prompt-cache-efficiency-simulator | good | good | good | good | weak → good |
| mcp-vs-a2a-vs-webmcp-decision-lab | good | good | good | good | good |
| ai-crawler-policy-builder | good | good | good | good | weak → missing¹ |
| rag-chunking-simulator | good | good | good | good | good |
| coding-agent-instructions-builder | good | good | good | good | good |
| browser-sbom-generator | good | good | good | good | good |
| agent-memory-architecture-planner | good | good | good | good | weak → good |
| local-ai-vs-cloud-ai-decision-lab | good | good | good | good | good |
| context-engineering-simulator | good | good | good | good | good |
| ai-prompt-injection-scanner | good | good | good | good | good |
| api-error-contract-builder | good | good | good | good | good |
| passkey-migration-planner | good | good | good | good | good |
| workflow-agent-decision-lab | good | good | good | good | good |
| cache-stampede-simulator | good | good | good | good | good |
| opentelemetry-trace-doctor | good | good | good | good | good |
| mcp-tool-contract-builder | good | good | good | good | good |
| ai-agent-permission-planner | good | good | good | good | good |
| real-time-transport-decision-lab | good | good | good | good | good |
| ai-agent-cost-loop-simulator | good | good | good | good | good |
| mcp-security-doctor | good | good | good | good | good |
| cloud-cost-guardrail-builder | good | good | good | good | good |
| ux-research-study-planner | good | good | good | good | good |
| llm-output-assurance-decision-lab | good | good | good | good | good |
| slo-incident-burn-simulator | good | good | weak → good | weak → good | good |
| data-contract-drift-doctor | good | good | weak → good | weak → good | good |
| ui-edge-state-matrix-builder | good | good | good | good | weak → good |
| accessibility-remediation-planner | good | good | good | good | weak → good |
| web-rendering-strategy-decision-lab | good | good | good | good | weak → good |
| network-failure-ux-simulator | good | good | good | good | weak → good |
| frontend-data-exposure-doctor | good | good | good | good | weak → good |
| llm-eval-case-builder | good | good | good | good | weak → good |
| web-performance-budget-planner | good | good | good | good | weak → good |
| client-state-storage-decision-lab | good | good | good | good | weak → good |
| browser-event-loop-simulator | good | good | good | good | weak → good |
| browser-security-policy-doctor | good | good | good | good | weak → good |
| api-chaos-payload-builder | good | good | good | good | weak → good |
| zero-downtime-schema-change-planner | good | good | good | good | weak → good |
| async-messaging-decision-lab | good | good | good | good | weak → good |
| replica-lag-simulator | good | good | good | good | weak → good |
| date-time-contract-doctor | good | good | good | good | weak → good |
| api-payload-doctor | good | good | good | good | good |
| jwt-time-machine | good | good | good | good | weak → good |
| cors-doctor | good | good | good | good | weak → good |
| print-ready-doctor | good | good | good | good | weak → good |
| schema-drift-doctor | good | good | good | good | weak → good |
| environment-drift-detector | good | good | good | good | weak → good |
| responsive-content-fit-lab | good | good | good | good | weak → good |
| webhook-delivery-simulator | good | good | good | good | weak → good |
| capacity-cliff-simulator | good | good | good | good | good |
| retry-storm-simulator | good | good | good | good | good |
| cache-value-simulator | good | weak → good | weak → good | good | weak → good |
| rate-limit-playground | good | good | good | good | weak → good |
| queue-capacity-planner | good | good | good | good | good |
| sla-chain-visualizer | good | good | good | good | good |
| fan-out-latency-simulator | good | weak → good | good | good | good |
| circuit-breaker-playground | good | good | good | good | weak → good |
| n-plus-1-query-visualizer | good | good | good | good | weak → good |
| connection-pool-simulator | good | good | good | good | good |
| http-cache-lab | good | good | good | good | weak → good |
| scope-creep-visualizer | good | good | good | good | weak → good |
| ai-project-pricing-lab | good | good | good | good | weak → good |
| database-decision-lab | good | good | weak → good | weak → good | weak → good |
| build-vs-buy | good | good | weak → good | weak → good | weak → good |
| tech-stack-battle | good | good | weak → good | weak → good | weak → good |
| distributed-systems-tax | good | good | good | not useful (educational comparison) | weak → good |
| monolith-vs-microservices-lab | good | good | weak → good | weak → good | weak → good |
| rest-vs-graphql-decision-lab | good | good | weak → good | weak → good | weak → good |
| multi-format-campaign-planner | good | good | good | good | weak → good |
| api-pagination-planner | good | good | good | good | weak → good |
| sticky-note-frame-planner | good | good | good | good | weak → good |
| timeout-chain-planner | good | good | good | good | good |
| frame-fit-finder | good | good | good | good | weak → good |
| paper-nesting-planner | good | good | good | good | weak → good |
| project-quote-risk-planner | weak → good | weak → good | weak → good | weak → good | weak → good |
| roadmap-collision-detector | good | good | good | good | good |
| crop-guardian | good | good | good | good | weak → good |
| drawing-grid-maker | good | good | good | good | good |
| bleed-safe-area-builder | good | good | good | good | good |
| value-study-maker | good | good | good | good | good |
| perspective-grid-maker | good | good | good | good | good |

¹ AI Crawler Policy Builder and Content Credentials Workflow Doctor retain meaningful result/action guidance; no Toolooo tool can perform their final real-system verification. A Next link is therefore omitted.

## Verification

- PASS: focused `test-tool-knowledge-content.mjs` runs real component functions/models with deterministic hook state: five shared decision consumers, zero weights, tied scores, all excluded options, different REST/gRPC/GraphQL actions, unchanged quote arithmetic, largest-contribution/zero-hour guidance, cache TTL age, contract changes and SLO fit/exhaustion/overrun, input clearing and reset.
- PASS: 100 built active routes retain static context; every rendered Next/Related destination is an active canonical tool with generated HTML; zero rendered Next/Related overlap. Canonical tool IDs, slugs, availability and LV3 definitions are preserved.
- PASS: existing Insight announcement, crawler policy, Content Credentials, and batch 96–100 suites (142 handler/reset/event/export/privacy/discovery groups).
- PASS: `npm run audit:publish` (build, SEO, prelaunch, domain, Astro and Value). Astro reported zero errors/warnings and 12 existing hints. After the final copy refinements, build, SEO, prelaunch, domain, Value/analytics/privacy and focused regression checks passed on the resulting artifact again. `git diff --check` passed.
- PASS: local Playwright against built preview, eight primary changed tools at 1440×900, 320×568, 375×667, 390×844 in both themes; terminal workflows and LV3 separation also checked (70 page/layout cases). Keyboard changes produced matching winners/actions, result focus stayed on controls, concise status regions remained, diagnostics cleared edited inputs and Reset worked. Native Next navigation reached the canonical destination. No page-wide overflow, runtime errors, failed requests or private sentinel in requests.
- PASS: four additional final desktop/390px theme pairs verified the cache TTL/entry-age distinction, quote metadata/body and overflow after the last copy update. Representative phone result screenshots were inspected for hierarchy/readability.
- Privacy: no analytics implementation changes; only current component output is shown locally. No tool values/results added to URLs, metadata, storage or analytics. No contact, email or external share completed.

## Shared paths and limits

Shared runtime paths: `src/data/tools.ts`, `src/data/toolKnowledge.ts`, `src/components/toolbox/ToolKnowledge.astro`, `src/components/toolbox/shared/DecisionLab.tsx`, `src/pages/toolbox/[slug].astro`. Local result/copy changes affect the five decision consumers, Data Contract Drift Doctor, SLO Incident Burn, Project Quote Risk and Cache Value. Tests/audit expectations and `docs/TOOLOOO-KNOWLEDGE.md` were updated for these semantics.

Phone checks are browser emulation, not real-device testing. Screen-reader speech and field performance were not measured. No production claim is made. The installed Node 22.14 is below the declared >=22.19 release requirement; the recorded checks passed in this environment. Prior documentation-review edits remain pending and were preserved.
