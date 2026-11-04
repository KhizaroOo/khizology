# Toolooo knowledge value

Every active Toolooo tool gives a person five connected forms of value without turning the page into a wall of explanation.

## The shared pattern

- **What** is one short, tool-specific description taken from the canonical tool registry.
- **Why** is a separately reviewed, evidence-based explanation for that exact tool. It is not generic family copy.
- **Result** is the tool's calculated conclusion or useful artifact. Live outputs update with inputs; run-on-demand checks describe the inputs used for that run and must be refreshed or marked outdated after edits.
- **Action** is the next practical step attached to that local result. `Insight` labels these dynamic explanations as Result, Why it matters, and Action where it is used.
- **Next** reuses editorial `nextToolIds` through `getTryNextTools`, with `nextToolReasons` or the destination's canonical use case explaining when to continue. Family/tag similarity belongs in Related, not an invented Next task. LV3 tools retain Smart Next Moves and chains; their destinations are excluded from Related. A workflow that ends in real external verification can omit Next rather than inventing an in-app continuation.

The compact tool header introduces the problem before the workspace. The full What / Why / Model note orientation remains in static HTML in an optional disclosure after the workspace. Required privacy disclosure stays before sensitive input. For non-LV3 tools, the canonical Next links appear after the tool output. The existing “How this tool stays honest” disclosure keeps model assumptions and limitations available without competing with the result.

## Content rules

Knowledge copy must be concise, specific to the tool, and truthful about the model. It must not claim to predict production behavior, hide assumptions, or replace a live system, contract, or project review. Use the existing tool result surface for dynamic facts; do not add a parallel static result system.

A new Toolooo tool needs all of the following in the same change:

1. A canonical registry entry with a short description and accurate long description.
2. One `toolKnowledgeWhyBySlug` entry that explains the real decision, risk, or trade-off the tool makes visible.
3. A local calculated result surface and an actionable interpretation where the tool has an outcome.
4. Canonical related relationships and a genuine Try Next continuation or reviewed LV3 moves where useful; otherwise keep the real next action with the result.
5. The usual Khizooology SEO, accessibility, privacy, and release checks.

## Validation

`node scripts/audit-value.mjs` verifies that every registered tool has a specific Why entry, all generated tool pages contain What and Why plus a model note, every tool component has a local result surface, and canonical Next links remain after the workspace.

`node scripts/test-tool-knowledge-content.mjs` checks the active registry and continuation boundaries plus real component/model behavior. The shared decision view distinguishes no weights, tied scores and blocked options, then uses the selected option's practical next step. Diagnostic headlines explain contract impact or error-budget status before counts. Quote-planning uplifts are editorial effort assumptions, not historical measurements, probabilities or guaranteed upper bounds. Calculations remain world/tool-local.

Run the normal build and site audits before release:

```sh
npm run build
node scripts/audit-value.mjs
node scripts/audit-seo.mjs
node scripts/audit-prelaunch.mjs
node scripts/audit-domain.mjs
```

## First-visit utility law

PROBLEM → DO → RESULT → ACTION → OPTIONAL DEPTH.

Aim for understanding the problem in 5 seconds, knowing what to do in 10 seconds, useful value in 30 seconds, and intentional depth in 2 minutes. These are heuristic targets, not measured usability claims.

Shared `Insight` emphasizes the decision and separates Action. Its polite status announces only plain-text decisions after 800ms of settled input; complex result markup is not flattened. No focus moves. Per-tool result placement ahead of supporting metrics requires local decisions, not a generic DOM reorder.

Dense Fan-Out and Timeout charts retain their designed width within a keyboard-focusable local scroll region. Other visualizations retain responsive sizing; multiple children stack vertically. LV3 save/discovery controls are optional depth, without changing their state or tracking.

Phase 4 retains tool-specific work: Timeout headline/warning consistency, API initial example and editor keyboard semantics, Perspective keyboard vanishing-point placement, individual controls and copy.
