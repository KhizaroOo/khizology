# Toolooo top-10 first-visit UX audit

2026-10-18 · Phase 2 · Audit only · baseline `cb6e664`.

## Method and scope

The ten tools come from `growthPriorityTools` in `src/data/tools.ts`; no substitutions.
Inspected the shared route/header/knowledge/privacy/LV3/truth/sidebar/share components,
shared controls/visualization/insight components and relevant tool implementations.
Browser-tested the existing production-equivalent `dist` at localhost:4338: desktop
1280×900 and every tool at 320×800, 375×800 and 390×800. The scrollbar leaves content
widths of 1274, 314, 369 and 384px respectively. Tested one example/preset in each tool,
native keyboard editing and Tab progression in all ten, plus API mode-arrow behavior.
No user payloads/uploads were used; examples were curated or synthetic. No sharing,
export, analytics configuration, production code or lifecycle behavior was changed.

Scores and the 5/10/30-second and two-minute judgments are **heuristics**, not timed
human research, task-success rates, performance measurements or accessibility certification.
Testing was in the light theme; no full screen-reader/device/contrast audit was performed.
Most tools compute a default immediately: the problem is finding and interpreting it,
not demonstrated slow computation. No production build is needed for this document-only phase.

Scoring: purpose / first interaction / quick value / actionable result / restrained depth,
0–2 each. GREEN ≥8, YELLOW 5–7, RED ≤4. Status describes first-visit clarity, not model
correctness or release eligibility. Accessibility defects are recorded separately.

## Compact matrix

| Tool | Purpose clarity | Primary action | Time-to-value | Result clarity | Cognitive load | Mobile | Score / status | Main issue |
|---|---|---|---|---|---|---|---|---|
| API Payload Doctor | Clear JSON diagnosis | Load example → Diagnose; empty initial field | Two clicks for useful sample | Specific finding + repair | Low default; two modes | First control 943–1092px down | **7 / YELLOW** | Empty default and unlabeled payload editor; example is secondary |
| Retry Storm Simulator | Clear retry-pressure problem | Choose preset or adjust traffic | Default ready; safer preset visibly changes pressure | Concrete peak, reason and next action | Moderate: 6 fields, 8 buttons | Tiny time-axis labels; result far below controls | **7 / YELLOW** | Strong explanation follows chart + five metrics |
| Rate Limit Playground | Clear allowed/throttled problem | Three competing choice groups | Default ready; burst preset changes outcome | Clear counts and cautious advice | High choice density despite only 2 fields | Stacked choice groups; tiny chart ticks | **6 / YELLOW** | Preset, limiter and traffic choices compete; duplicate “Retry burst” labels |
| Queue Capacity Planner | Clear backlog/capacity problem | Choose scenario; edit rates/workers | Default growing queue; drain example works | Excellent capacity warning and action | Five fields, six presets, long metric/comparison stack | Result at 3358–3841px | **6 / YELLOW** | Alternative consumers/downstream ceiling precede the basic worker story |
| Fan-Out Latency Simulator | Useful dependency/deadline problem | Preset or seven exposed fields | Numbers ready; mobile graph effectively unreadable | Deadline warning useful; visual relationship lost | Many optional/advanced controls exposed | SVG only 46–80px wide | **4 / RED** | Caption and chart compete in the same flex row |
| Circuit Breaker Playground | Clear failure-containment purpose | Scenario plus policy comparison | Default and full-outage example work | Useful avoided-call story; terminal state needs context | Two preset groups + controls | Long state/metric stack | **6 / YELLOW** | “Current state: Closed” competes with opened/blocked-call history |
| Connection Pool Simulator | Clear waiting/connection problem | Three useful primary sliders | Default healthy; Slow queries shows waiting/timeouts | Concrete hold-time advice | Good advanced disclosure, excessive result stack | Result at 4145–4913px | **6 / YELLOW** | Many equal-weight metrics/budget/comparison sections before the decision |
| Timeout Chain Planner | Clear end-to-end budget problem | Six presets, propagation choices and editable hops | Default ready; useful waterfall buried and compressed | Expected-latency headline can reassure despite retry risk | **15 fields + 16 buttons**, no advanced disclosure | SVG only 49–84px wide | **3 / RED** | Configuration wall plus conflicting headline/warning hierarchy |
| Bleed & Safe Area Builder | Clear printable-guide purpose | Choose size → inspect → download | Ready default; Business card updates guide | Clear dimensions, trim/bleed/safe-area advice | Five fields; mostly task-relevant | Preview precedes precise summary; no overflow | **8 / GREEN** | Shared preamble delays an otherwise straightforward workspace |
| Perspective Grid Maker | Clear drawing-overlay purpose | Mode/drag grid; upload is optional | Ready default; 1-Point changes grid/count | Useful visual output, dimensions and tracing advice | Optional image/dimensions precede preview | Grid fits; point editing is pointer-only | **6 / YELLOW** | Preview comes late; arbitrary vanishing-point placement lacks keyboard equivalent |

Score components in matrix order:
`2/1/1/2/1`, `2/1/1/2/1`, `2/1/1/2/0`, `2/1/1/2/0`, `2/1/0/1/0`,
`2/1/1/1/1`, `2/1/1/2/0`, `2/0/0/1/0`, `2/2/1/2/1`, `2/1/1/2/0`.
**1 GREEN · 7 YELLOW · 2 RED.**

## Measured default-state density and scroll distance

I/B/D = rendered input/select/textarea fields / buttons / disclosure summaries in the
**whole default workspace**, not just the viewport. Closed disclosure contents are excluded;
disabled and result-share/export buttons are included. The shared header/sidebar/LV3
controls are excluded. These counts are not all competing primary actions.

Positions are CSS pixels from the document top, rounded, not elapsed time. “First control”
is the earliest workspace control (API's mode tab and Perspective's optional upload are
not necessarily the most useful starting action). “Result” is the explicit plain-language
Result label, not the first available chart/metric. Thus these distances must not be
presented as time-to-result or absence of earlier useful value.

| Tool | I/B/D | Desktop first control / Result | Mobile first control: 320 / 375 / 390 | Mobile Result: 320 / 375 / 390 |
|---|---|---|---|---|
| API Payload Doctor | 1/4/1 | 774 / absent until Diagnose | 1092 / 1027 / 943 | absent initially |
| Retry Storm | 6/8/1 | 763 / 1573 | 1101 / 1029 / 972 | 2827 / 2660 / 2602 |
| Rate Limit | 2/13/1 | 783 / 1623 | 1101 / 998 / 972 | 2960 / 2655 / 2577 |
| Queue Capacity | 5/8/1 | 792 / 2178 | 1130 / 1059 / 1001 | 3841 / 3538 / 3358 |
| Fan-Out | 7/10/0 | 762 / 1841 | 1128 / 1059 / 978 | 3673 / 3391 / 3221 |
| Circuit Breaker | 4/10/1 | 784 / 1855 | 1123 / 1054 / 952 | 3573 / 3351 / 3249 |
| Connection Pool | 3/7/1 | 784 / 2320 | 1171 / 1070 / 1021 | 4913 / 4270 / 4145 |
| Timeout Chain | 15/16/0 | 789 / 1937 | 1107 / 1056 / 999 | 4111 / 3896 / 3786 |
| Bleed & Safe Area | 5/8/0 | 711 / 1738 | 997 / 925 / 895 | 2439 / 2327 / 2316 |
| Perspective Grid | 5/5/0 | 804 / no Result label | 1170 / 1058 / 1006 | canvas at 1889 / 1686 / 1629 |

**30/30 mobile checks had no document-level horizontal overflow.** That does not imply
readable graphics. Fan-Out's SVG widths were **46/72/80px**, Timeout's **49/76/84px** at
320/375/390. At 320 their visualization parents were 228px wide: the sibling caption
consumed most of the shared horizontal flex layout. This was confirmed visually.
Other scaled SVGs also showed roughly 3–4px text in their smallest ticks at 320px;
textual metrics help, but the chart cannot carry detailed reading at that size.
Default visible workspace buttons measured at least 44px high. This is not a full
pointer-target audit of sliders, checkboxes, canvas interactions or spacing exceptions.

## Top five shared problems — ranked by impact

1. **P1: Workspace starts too late.** Header description/tags, main-section spacing,
   What/Why and sometimes privacy come before the tool. The What copy for API literally
   repeats its header description. First controls are below the 800px mobile viewport
   for every tool (895–1171px across tested widths). Helpful context has become a gate.
2. **P1: Shared visualization layout can destroy the lesson.**
   `VisualizationContainer` uses horizontal flex centering for arbitrary children.
   Caption + SVG consumers (Fan-Out/Timeout) shrink the chart instead of placing its
   explanation above it. Other SVGs shrink fine detail below practical reading size.
   “No overflow” is insufficient; test plot width and legibility too.
3. **P1: The decision is subordinate to the dashboard.** Charts, many equal metrics,
   warnings and comparisons precede the useful Result/Action block. Connection Pool
   is the strongest example. `Insight` already contains good specific advice: surface
   it earlier instead of inventing more generic educational copy.
4. **P2: Competing configuration and continuation layers.** Presets, algorithm/mode,
   traffic and advanced settings can all demand attention before the first decision.
   Below results, My Toolooo, Smart next moves, chain steps, Related tools, page/result
   sharing and More Khizooology create several competing exits. Desktop sidebar links
   are alongside the initial workspace; on mobile they move below it, which is better.
5. **P1/P2: Shared accessibility support stops short of result delivery.** All ten
   default workspaces had zero live/status/alert regions; API's post-diagnosis source
   also lacks an announcement. Native fields generally have labels and keyboard
   editing works, but automatic visual updates are not automatically announced.
   Warning icons/text provide non-color cues; accessible chart descriptions and
   existing disclosure semantics should be preserved. Do not announce every slider tick.

## Tool-specific findings and observed cause/effect

- **API (P1 accessibility, P2 onboarding):** Load example → Diagnose yielded inconsistent
  key casing with a concrete normalization action, plus date/null/array findings.
  Payload textarea has a placeholder but no persistent programmatic label; its inline
  `outline: none` overrides the generic focus outline. The advanced file input has an
  unassociated visual label too. Mode buttons declare tabs but lack a tabpanel relationship
  and arrow-key handler: ArrowRight on Diagnose left Diagnose selected. The intro promises
  Result/Action updates as inputs change, but this tool requires an explicit Diagnose click.
- **Retry (P2):** Safer bounded jitter changed peak 283 → 259 req/s and Recovery risk → Low
  pressure. Preserve this meaningful comparison. Teach that single comparison before
  idempotency/error-policy choices; retain the production-validation caveats.
- **Rate Limit (P2):** Burst-friendly changed 500 allowed / 160 throttled → 540 / 120.
  Two different button groups contain “Retry burst”; distinguish policy and traffic choices.
- **Queue (P2):** Recovery / drain changed growing backlog to a temporary peak of 40 with
  6/s steady drain capacity. “Alternative consumers” appears before “Number of workers”;
  comparison/downstream controls should follow the primary arrival-versus-capacity result.
  Keep the distinction between a temporary buffer and sustainable throughput.
- **Fan-Out (P1):** One slow dependency produced 600ms against a 400ms deadline with
  actionable timeout guidance. The 46px mobile chart hides the causal relationship;
  optional branches, tail probability and forced-branch controls also compete initially.
- **Circuit Breaker (P2):** Full outage blocked 48 dependency calls. In the default case,
  “Current state: Closed” coexists with 13 transitions and 20 rejected calls. Explain
  terminal state versus history; use a recovery/containment decision as the lead result.
  Current action advice distinguishes rate limits from breakers, but is less specific
  about the next local policy experiment than the retry/pool advice.
- **Connection Pool (P2):** Slow queries produced 25 waiting callers and 75 acquisition
  timeouts; the action correctly recommends reducing hold time before increasing pool
  size. Preserve that diagnostic distinction and the visible Busy/Idle labels. Reveal
  database budgets, alternate-pool comparison and secondary counters after the decision.
- **Timeout (P1):** Retry eats budget shows “Modeled serial work fits ... 500ms headroom”
  while Service B's retry exposure is 800ms against 780ms remaining. Expected latency
  and configured exposure are legitimately different; the headline needs an aggregate
  risk state so the valid latency result is not mistaken for a safe retry plan. Also fix
  the compressed waterfall before simplifying its 15 fields. Hop inputs are individually
  labeled but repeating Name/Expected latency/Timeout labels need programmatic hop grouping.
- **Bleed (P2 accessibility/minor UX):** Business card updated to 3.5×2in and 1125×675px,
  with clear physical-versus-raster export labels. The SVG has no accessible name/role;
  nearby dimensions/Result text provide useful partial alternatives. Preserve units,
  printer-specification caveats and direct downloads rather than adding a Run step.
- **Perspective (P1 accessibility, P2 hierarchy):** 1-Point changed the grid and point count
  from two to one without an upload. Canvas has an informative accessible description,
  but arbitrary point movement is pointer-only (pointer handlers, no focusable handles
  or keyboard position editor). Its optional file input also lacks an associated label.
  Mode buttons do not expose selected state programmatically.
  Keep the useful horizon/line-count controls; make the no-upload starting path clearer.

## Shared fix opportunities — recommended Phase 3, not implemented

Smallest high-value sequence:

1. Repair the **visualization presentation contract** for caption + graphic consumers,
   after inspecting other consumers. Offer a contained vertical composition/opt-in
   treatment; do not blindly change every existing visualization layout. Preserve model data.
2. In the existing route shell, bring the **workspace immediately after a concise problem
   statement**. Reduce duplicated intro copy/spacing; move extended What/Why into optional
   static disclosure or later context. Keep privacy concise and adjacent to sensitive input.
   Preserve SSR knowledge, canonicals, schemas and SEO substance.
3. Reuse `Insight` for an earlier **one-decision summary plus next action**, with optional
   detail below. Let each tool compute its own severity and copy; do not infer “safe” from
   a generic numeric threshold or replace warnings with one universal success message.
4. Give each workspace one clear starter: an example, scenario comparison, live preview
   or primary input as appropriate. Fold secondary comparison controls, not meaningful depth.
   Fix API's labels/focus/tab behavior and Perspective's keyboard point placement locally.
5. Add restrained, meaningful result announcements through existing shared result UI;
   keep focus stable. Consolidate continuation presentation after results while preserving
   distinct page sharing versus safe result sharing and favorites versus recommendations.

Accept Phase 3 only if users reach a useful workspace sooner, understand the important
risk before secondary metrics, and can read the actual graphics at all three widths.
Retest the ten tool-specific examples above, keyboard/selected states, labels and
announcements. Do not equate fewer controls with removing useful functionality.

## Things that should not be standardized

- **No universal Run button:** seven simulators/planners update live, API needs explicit
  diagnosis, and visual makers should keep ready previews/direct exports.
- **No universal good/bad score:** expected latency, configured exposure, retry semantics,
  downstream ceilings and printer specifications require different local judgments.
- **No forced Infooo journey:** Toolooo is PROBLEM → DO → RESULT → ACTION → OPTIONAL DEPTH.
- Preserve local models, units, scenarios, chart types, design-canvas manipulation and
  truthful limits. Keep richer technical depth available after the first useful result.
- A missing literal Result label is not itself a defect: Perspective's usable grid is a result.

## Verification and artifacts

Canonical shortlist confirmed from the registry at runtime. Ten default workspaces,
ten example/preset interactions, keyboard field editing/Tab progression in ten tools,
API arrow-key behavior, 30 responsive layouts and shared-source checks completed.
No document-level mobile overflow; two confirmed internally compressed charts.
Raw local measurements: `.performance/phase2-ux-observations.json` (ignored audit artifact).
No production code edits, build, full SEO/Value audits, commit, push or deployment.
Final verification: document diff and `git diff --check`.


## Phase 4D — final consistency review (2026-10-18)

Completion review of the same canonical growth-priority ten. The five rubric components remain purpose / first interaction / quick value / actionable result / restrained depth (0–2 each). Scores and the 5/10/30-second, two-minute goals are heuristics, not measured user research.

| Tool | Before | After | Components | Status |
|---|---:|---:|---|---|
| API Payload Doctor | 7 | 9 | 2/2/2/2/1 | GREEN |
| Retry Storm Simulator | 7 | 9 | 2/2/2/2/1 | GREEN |
| Rate Limit Playground | 6 | 9 | 2/2/2/2/1 | GREEN |
| Queue Capacity Planner | 6 | 9 | 2/2/2/2/1 | GREEN |
| Fan-Out Latency Simulator | 4 | 9 | 2/2/2/2/1 | GREEN |
| Circuit Breaker Playground | 6 | 8 | 2/2/1/2/1 | GREEN |
| Connection Pool Simulator | 6 | 9 | 2/2/2/2/1 | GREEN |
| Timeout Chain Planner | 3 | 8 | 2/2/1/2/1 | GREEN |
| Bleed & Safe Area Builder | 8 | 8 | 2/2/1/2/1 | GREEN |
| Perspective Grid Maker | 6 | 9 | 2/2/2/2/1 | GREEN |

Circuit keeps a compact static request history rather than an interactive state replay; Timeout still requires reading a multi-hop budget; Bleed keeps its useful preview-first print workflow. These retain 1/2 for quick value. No major usability blocker or RED tool remains. All tools retain 1/2 for restrained depth because expert capabilities remain substantial.

### Small justified changes

- Bleed: accessible canvas description, exposed orientation selection, readable guide background/button ink, responsive padding and local touch/focus treatment. Print calculations, presets and export implementation unchanged.

- Shared native range and disclosure primitives: 44px minimum target instead of the observed 16px range inputs / short summaries. No new abstraction or shared-shell redesign.

- Fan-Out optional checkbox and Timeout native summaries: matching target sizes. API/Perspective native upload controls and API checkbox labels: matching local targets. No model, preset, analytics or SEO semantics changed.

### Verification evidence

- Final browser baseline: 80 states = 10 tools × 4 widths (1440/320/375/390) × light/dark; 30 distinct mobile layouts, each in both themes. No page overflow; useful Result/Why/Action and polite status region in all. First interaction and result document positions recorded in `.performance/phase4d-summary.json`.

- Each core interaction activated with the keyboard. Expanded-depth checks at 320px: no overflow, non-finite result or undersized visible action target. Existing local chart scrolling preserves readable 480–660px charts; Perspective retains its labeled non-pointer position controls.

- All eight tools with scenario presets exercised in-browser (39 scenarios); API diagnosis and Perspective modes covered separately by browser/UI tests.

- All ten copy paths returned canonical public URLs without synthetic private query/hash markers. Simulator copies contain only safe model summaries. Real Bleed SVG/PNG and Perspective PNG exports downloaded and dimensions verified.

- Fan-Out one-required-branch invariant passes targeted model/UI tests and real 2→1 browser reduction: optional control disabled and unchecked, finite result with required branch #1. Retry/Rate, Queue, Circuit, Pool, Timeout, Contract Drift, API/Perspective, Bleed, Insight and analytics/privacy tests pass.

- Final `npm run audit:publish` passes its build, SEO, prelaunch, domain, Astro and Value/knowledge/privacy gates. Astro: zero errors/warnings, eight existing hints. 323 routes / 324 audited HTML files. `git diff --check` passes. Titles/canonicals/meta preserved across ten. No new dependency or public route.

- No formal screen-reader certification, hardware touch testing, field performance claim or production GA receipt claimed. Existing reduced-motion rules retained; no animation added. No commit, push or deployment.
