# Khizooology — UX/UI audit

Date: 28 October 2026. Audit only; no implementation, commit, push or deployment.

## Scope and evidence

The primary target was the latest local product at `http://127.0.0.1:4325`, including the recent first-visit changes and Worlds 001–014. Findings below describe that version unless explicitly identified as production observations.

Seventeen major routes were rendered at 1920, 1440, 1280, 1024, 768, 390 and 320px: 119 layout checks. They covered Home, Infooo, Agent Systems Lab, Toolooo, five representative newer tools, Artooo, Notooo and Atomic Habits, portfolio, contact, privacy, Behind the Vibes and Q&A. Additional functional checks covered API Payload Doctor, all twelve Worlds 003–014 on desktop and 390px mobile, and Human Atlas and Rubik’s Cube. Dark-theme checks covered all seventeen routes. Short-phone checks used 320×740.

This was a rendered-product heuristic audit supported by source inspection and targeted regression tests. Scores and first-visit judgments are expert assessments, not measured user comprehension, analytics, a complete WCAG certification or field performance data. Pixel positions are rounded document coordinates from the tested local state; they can change with fonts, viewport height and saved recent tools.

**Production is an older version.** Fresh HTTP checks returned 200 for Home, Infooo and contact; Agent Systems Lab and MCP Security Lab returned 404. The production Infooo hub advertised six worlds and did not link to the new collection. This is an unreleased-work gap, not evidence that the published hub contains those broken links. This audit does not authorize releasing the pending work.

# EXECUTIVE VERDICT

**Overall: 64/100.** Arithmetic mean of the ten dimensions below. The strongest parts are useful underlying models, privacy boundaries and breadth of real content. The weakest parts are finding the right content, preserving interaction state and turning professional interest into a working contact action. More content or a larger design system would not resolve these problems.

| Dimension | /100 | Reason |
|---|---:|---|
| Clarity | 70 | Most detail pages explain their subject; catalog hierarchy and several simplified Infooo scenes still require interpretation. |
| Visual hierarchy | 64 | Main decisions are often present, but search, work evidence and problem-based entry sit beneath secondary material. |
| Consistency | 69 | Shared containers, inputs and tactile actions are coherent; embedded worlds and disclosure behavior diverge. |
| Interaction design | 66 | Real actions work, but collapsing exploration resets state and shared copying provides no confirmation. |
| Mobile UX | 63 | No page overflow in the broad layout sweep; long filter stacks and a few below-fold primary actions remain. |
| Accessibility | 64 | Useful labels, focus treatment and keyboard behavior coexist with confirmed low-contrast text and missing interaction feedback. |
| Discovery | 56 | Large useful inventories are harder to navigate than their size warrants; selected artwork intent is lost. |
| Trust | 77 | Sources and model limits are generally explicit; disabled contact promises, stale results and inaccurate privacy wording weaken confidence. |
| Professional conversion | 43 | Existing expertise is visible, but evidence is buried and the primary contact destination cannot submit. |
| Craft | 68 | Brand identity is recognizable; repeated framing, sparse generic teaching scenes and inconsistent theme treatment reduce finish. |

No site-wide P0 was found in the sampled flows. The contact dead end is P1 because working external contact channels remain available. This is not a claim that every route, model state or assistive-technology combination is defect-free.

Quality benchmarks used: clear action hierarchy, immediate feedback, preserved intent, restrained choices and visible evidence—the useful principles associated with strong products such as Apple, Linear, Stripe and Figma. No visual imitation or unsupported competitor performance comparison is proposed.

# TOP 10 PROBLEMS

Ranked by observed user impact, repetition, professional value, shared leverage and repair effort. IDs refer to the complete findings below.

| Rank | ID | Problem | Severity / scope | Effort | Recommended response |
|---:|---|---|---|---|---|
| 1 | F01 | Site-wide contact CTA leads to an editable form with disabled submission | P1 · PAGE | S | Lead with an existing working contact channel; remove the false form promise. |
| 2 | F02 | Toolooo search is several screens below secondary discovery layers | P1 · MODULE, MOBILE | M | Move the existing finder directly beneath a short introduction. |
| 3 | F03 | Closing Explore more silently clears the experiment | P1 · MODULE | S–M | Preserve state; reset only through an explicit action. |
| 4 | F04 | Small orange informational text fails normal-text contrast | P1 · ACCESSIBILITY | S | Use an accessible accent-text token without changing monster identity colors. |
| 5 | F05 | Several Infooo first actions show conclusions more clearly than causal evidence | P1 · MODULE | M | Reuse the actual scene to show one meaningful change or receipt. |
| 6 | F06 | Professional project proof follows a very long skills inventory | P1 · PAGE | M | Put existing work and contribution evidence before exhaustive skills. |
| 7 | F07 | Gallery filters delay the art; subject navigation behaves differently from filtering | P2 · MODULE, MOBILE | S–M | Prioritize search and a few subject choices; make jump/filter behavior truthful. |
| 8 | F10 | Agent Systems Lab repeats routing content before problem entry and professional positioning | P2 · PAGE, MOBILE | S–M | Bring problem entry forward and shorten repeated summaries. |
| 9 | F09 | Shared copy actions do not confirm success or explain failure | P2 · GLOBAL, ACCESSIBILITY | S | Add a concise visible and polite status. |
| 10 | F17 | Edited API input leaves the previous diagnosis looking current | P2 · PAGE | S | Mark the result as outdated until diagnosis runs again. |

Effort: S = a contained source/component/copy change; M = coordinated layout or world-local interaction work; L = substantial redesign. No L-sized repair is necessary for the top ten.

# GLOBAL FINDINGS

### F03 — A disclosure performs an unexpected reset

- **Where:** Worlds 007–014 through `src/components/infooo/InfoooWorldFoundation.tsx`; related custom behavior exists in Physical AI and Living Grid.
- **Issue / evidence:** In MCP Security Lab, trigger the poisoned tool, open Explore more, then close it. The unsafe result disappears and the initial Trigger action returns. The shared `onToggle` invokes `onReturnToFirstVisit` when closing; local callbacks reset the experiment. Opening exploration also swaps the compact scene for the full lab.
- **Why / impact:** A disclosure normally changes visibility. Here it changes the user's work, requiring repetition and making the advanced layer feel like a separate experience.
- **Severity / scope / effort:** P1 · MODULE · S–M.
- **Recommendation:** Keep current state and result across disclosure changes. Let explicit Reset/Replay restart the model. Reveal advanced controls without silently clearing the experiment; keep world intelligence local.

### F04 — Brand color is being used where an accessible text color is needed

- **Where:** Toolooo hub labels including “Five Ways In,” “All Tools” and “Toolooo Feature Levels”; related My Toolooo accent text. `src/pages/toolbox.astro` and the existing shared token consumers.
- **Issue / evidence:** Rendered 12px orange text uses `#F7933C`. Contrast is approximately 2.10:1 on `#F5F5F8`, and 2.28:1 on white. These are informational labels, not exempt logo artwork.
- **Why / impact:** Small labels become difficult to read, particularly in bright conditions or with low vision.
- **Severity / scope / effort:** P1 · ACCESSIBILITY, MODULE · S.
- **Recommendation:** Define/reuse a darker accessible text treatment for the accent family. Retain original module colors for suitable fills, borders and decorative marks. Verify both themes. [WCAG normal-text guidance requires 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### F09 — Shared copy feedback is absent

- **Where:** `src/components/toolbox/ShareResultFoundation.tsx`, used on tool pages, artwork detail and Infooo surfaces.
- **Issue / evidence:** Clipboard success emits tracking but no visible or live confirmation. Clipboard failure is silently caught; the component does not render the URL promised by its fallback comment. Native share cancellation itself is not an error.
- **Why / impact:** Users cannot distinguish copied, unavailable and unchanged states. Repeated clicks become likely; screen-reader users receive no success feedback.
- **Severity / scope / effort:** P2 · GLOBAL, ACCESSIBILITY · S.
- **Recommendation:** Show “Link copied” or “Result copied” in a polite status; offer an actionable failure fallback. Preserve safe share content and existing event semantics. No external share was sent during this audit.

### F11 — Privacy copy disagrees with the implemented referral boundary

- **Where:** `/privacy/`, compared with `safeReferrer()` in `src/utils/analytics.ts`.
- **Issue / evidence:** The page says referrers are excluded. The helper permits an allowlisted public referral origin after consent, stripping paths, queries and fragments and rejecting credential-bearing/non-allowlisted URLs.
- **Why / impact:** The policy describes a stricter behavior than the implementation. This is a trust/copy defect, not evidence that private tool input is leaking.
- **Severity / scope / effort:** P2 · PAGE · S.
- **Recommendation:** Explain the actual restricted-origin policy accurately. Do not loosen privacy or redesign analytics to resolve a wording mismatch.

### F12 — Keyboard users have no visible skip-to-main action

- **Where:** Shared `src/components/layout/BaseLayout.astro` and header.
- **Issue / evidence:** No skip link was found before navigation. Main and navigation landmarks exist, and ordinary controls have visible focus.
- **Why / impact:** Keyboard users repeatedly traverse shared controls before reaching content. Landmarks help screen-reader users but do not provide the same convenient visible shortcut for all keyboard users.
- **Severity / scope / effort:** P2 · GLOBAL, ACCESSIBILITY · S.
- **Recommendation:** Add one focus-visible skip link to an identified main element. This absence alone is not asserted as a formal WCAG failure; [bypass-block guidance allows multiple mechanisms](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html).

### F16 — The shared footer is disproportionately long on mobile

- **Where:** Shared footer across the seventeen reviewed routes; `src/components/layout/Footer.astro`.
- **Issue / evidence:** At 390px it occupies roughly 1,289px, versus 494px at desktop: brand statement, fourteen social links, two navigation boxes and legal copy.
- **Why / impact:** Short completed experiences end in more than a screen of repeated site furniture. The boxes themselves are structured and usable; their accumulated vertical cost is the problem.
- **Severity / scope / effort:** P2 · GLOBAL, MOBILE · S.
- **Recommendation:** Tighten redundant spacing and repeated identity copy; prioritize existing social destinations without shrinking targets or removing useful navigation. Do not turn every footer link into a button.

### F21 — Returning-tool content is inserted above the main finder

- **Where:** `src/components/toolbox/lv3/MyTooloooPanel.tsx` and Toolooo hub placement.
- **Issue / evidence:** The panel starts empty, reads browser-local recent tools after mounting and then renders above discovery. At the same 1440px width, the search position changed from approximately 2,090px to 2,526px after visiting tools.
- **Why / impact:** Return visits gain useful context but push the essential finder farther away. Late insertion can also move content after initial rendering. No CLS magnitude was measured.
- **Severity / scope / effort:** P2 · MODULE, MOBILE · S–M.
- **Recommendation:** Put the primary finder before the recent-tools panel, or use a compact predictable return slot. Preserve browser-local public tool references and avoid introducing new persistence.

## Shared system fixes

1. Correct disclosure state behavior in the existing Infooo foundation; do not introduce another world framework.
2. Reuse centralized accessible text colors, focus treatment and share-status feedback.
3. Reorder existing catalog components so search is first; no new search service or generalized catalog engine is needed.
4. Give shared navigation a skip-to-main action and reduce footer repetition.
5. Keep truthful canonical counts and availability in copy/filter consumers rather than maintaining hand-written totals.

Keep source models, domain state and teaching content in their world/tool layers. A shared card template is not a substitute for a world-specific causal demonstration.

# MODULE FINDINGS

## Homepage

The monster choices expose the four real modules, and the main exploration action works. The opening “Where Art meets Code” is memorable but less concrete than the useful module descriptions that follow. Keep the identity; prioritize those existing concrete descriptions over adding promotional claims.

### F08 — Clicking a specific artwork loses the selection

- **Where:** Eight artwork teaser links in `src/pages/index.astro`.
- **Issue / evidence:** Different artwork images link to the same `/artworks/` destination without identifying the selected work.
- **Why / impact:** A visitor choosing a particular image lands at the general catalog and must find it again.
- **Severity / scope / effort:** P2 · PAGE, MODULE · S.
- **Recommendation:** Reuse existing `#art-{slug}` gallery anchors/selection behavior. Preserve the existing modal detail architecture; do not create new artwork routes.

### F14 — Availability copy and filters are not consistently driven by current inventory

- **Where:** Home “3 are live” despite four active monster destinations; Infooo's empty Web & Information category; Notooo's Coming status with zero coming entries.
- **Issue / evidence:** Equally available choices sometimes lead to intentional empty inventory. Home's count is stale.
- **Why / impact:** Visitors cannot tell which choices provide content now. The home count also makes the site look less maintained.
- **Severity / scope / effort:** P2 · MODULE (home count alone P3) · S.
- **Recommendation:** Use canonical counts for labels and available filters. Hide or clearly count zero-result status choices until useful; preserve the taxonomy and published/draft rules. Replace the Infooo hub's anatomy-specific “isolating one system” discovery prompt with collection-appropriate wording.

## Infooo

### F05 — Fewer clicks have not always produced a clearer causal experience

- **Where:** Especially first-visit scenes in Worlds 007, 008, 010, 011 and 014; shared `InfoooFirstVisit.tsx` presentation and world-local first-action handlers.
- **Issue / evidence:** Many first actions run the relevant sequence to its conclusion and change three icon boxes, labels or counts. The richer world scene is behind Explore more. Incident Response reports the reconstruction before the initial view shows an actual evidence receipt. World 004 also replaces much of its richer desktop composition with text rows on mobile.
- **Why / impact:** Users can reach an answer with one click yet still miss how the system produced it. Identical presentation weakens distinctions between security, supply-chain and incident reasoning.
- **Severity / scope / effort:** P1 · MODULE · M.
- **Recommendation:** Reuse each existing scene to show one concrete before/after, changed authority boundary, receipt or failed checkpoint. Do not add decorative animation, a new engine, more modes or mandatory configuration. Retain the compact primary action and honest model boundaries.

### First-visit review of every world

“Meaningful first action” below means a visible model-backed change was observed. It does not prove a new visitor understood it within five seconds. The 5/10/30-second targets remain heuristic judgments, not timed user research.

| World | First interaction and observed value | Main remaining friction / recommendation |
|---|---|---|
| 001 · Human Atlas | Search for heart and select a structure; knowledge and isolation options become available. | Nested app framing and mismatched dark theme; F15. Preserve anatomy depth and keyboard alternatives. |
| 002 · Rubik’s Cube Motion Graph | Select 2×2: eight piece tokens; select a token: selected position/view state updates. | Mobile hides the corresponding cube while claiming to reveal it; F24. |
| 003 · App Deployment Journey | “Watch a deployment”; Code → Build → Deploy → Serve → User remains identifiable. | Keep the artifact/traffic relationship legible during reduced-motion stepping. Extra framing almost consumes the short-phone viewport. |
| 004 · AI Coding Agent Journey | “Watch the agent work”; Task → Look → Change → Check → Report retained. | Mobile becomes text-heavy; action below first viewport on a short phone. Show the focused change/check evidence, not more prose. |
| 005 · Physical AI World | “See a plan meet reality”; mismatch becomes visible, with a meaningful recovery step. | Collapse should not restart the lesson. Existing visual scene is stronger than adding more framing. |
| 006 · The Living Grid | “Restore balance”; observed supply rises from 58 to 74 against demand 74. | Result is immediate and model-backed. Keep the visual primary; preserve optional choices without resetting on collapse. |
| 007 · The Agent Economy | “Try the purchase”; receipts and bounded cost become visible. | The permission decision is explained more in text than in the transaction path. Show the relevant receipt/boundary in the current scene. |
| 008 · MCP Security Lab | “Trigger the poisoned tool”; unsafe outcome, then boundary action. | Hidden richer scene and disclosure reset undermine a clear first experiment; F03/F05. |
| 009 · Agent Reliability Lab | “Trigger the timeout”; two effects, then idempotency reduces the duplicate to one. | One of the clearest compact counterexamples. Keep its cause/result distinction when refining shared presentation. |
| 010 · Browser Agent Under Attack | “Read the hostile page”; unrelated requested action, then intent boundary. | Show the hostile page content versus authorized task in the same scene, rather than only summarizing the authority mistake. |
| 011 · Agent Skills Supply Chain | “Update the skill”; changed version/outbound behavior, then pinning. | Make the changed capability/diff visible in the existing scene. A version label alone teaches less than the actual change. |
| 012 · Context Engineering Lab | “Compare the two contexts”; contrasting pass/fail outcomes. | Side-by-side comparison is useful; some terminology and nested narrow boxes add friction; F22. |
| 013 · Agent Identity Lab | Revoke the shared credential, then compare dedicated identity. | All-stop versus only-B impact is clear. Surface one supporting identity record before inviting deep exploration. |
| 014 · Agent Incident Response Room | “Trace the incident”; reconstruction followed by containment. | The initial conclusion needs visible source evidence. The main action also falls below a short-phone viewport; F13. |

Worlds 007–014 retained functioning X-Ray/Trace and Challenge entry points in the mobile checks. Sources and model limits remain accessible. Worlds 003/004 retained advanced cases, approval/failure handling and replay paths in the targeted first-visit regression test. The audit did not exhaustively replay every state in every advanced world.

### F15 — Human Atlas does not follow the surrounding dark theme

- **Where:** `/infooo/human-atlas/`, outer page and embedded anatomy viewer.
- **Issue / evidence:** Dark shared navigation surrounds a large light viewer; outer and inner Human Atlas framing repeat. The viewer has real loading/progress and fallback states, so a missing-loader defect is not alleged.
- **Why / impact:** Abrupt theme changes and duplicate application framing make this world feel less integrated, especially during night reading.
- **Severity / scope / effort:** P2 · PAGE · M.
- **Recommendation:** Coordinate theme inside the Human Atlas layer and reduce duplicate framing where safe. Do not put anatomy/Three.js state in generic Infooo code or edit generated/vendor bundles directly.

### F22 — Context comparison cards contain unnecessarily narrow inner boxes

- **Where:** World 012 desktop first-visit comparison; `src/components/infooo/first-visit.css` and the context world consumer.
- **Issue / evidence:** Large comparison columns contain left-aligned objects capped around 270px, leaving unbalanced blank areas.
- **Why / impact:** Uneven visual weight makes the paired comparison feel unfinished and uses width without improving evidence readability.
- **Severity / scope / effort:** P3 · PAGE · S.
- **Recommendation:** Center or appropriately fill the existing objects within their comparison columns. Keep readable text measure and the current comparison model.

### F24 — Mobile Cube selection does not reveal the cube it refers to

- **Where:** World 002 at 390px, Motion view.
- **Issue / evidence:** The graph says selecting a token will reveal its piece on the cube. Selecting the Yellow/Orange/Blue corner updates the position to Bottom-left-back and the view to Bottom, but the visible tab remains Motion. Copy still says “Drag the cube above,” although the cube is hidden.
- **Why / impact:** The state changes correctly, but mobile users cannot see the promised paired visual without discovering another toggle.
- **Severity / scope / effort:** P2 · PAGE, MOBILE · S.
- **Recommendation:** Reveal the existing Cube view after a graph selection, or give an explicit contextual “See selected piece” action and accurate instructions. Preserve graph selection and non-pointer controls.

## Agent Systems Lab

The collection has a clear topic, a real ordered path and working previous/next destinations. It is more coherent than an arbitrary list, but not yet one seamless case study. The worlds use different fixtures and evidence models; implying a single continuous incident would overstate their connection.

### F10 — Problem entry and professional relevance arrive after repeated routing content

- **Where:** `/infooo/agent-systems-lab/`.
- **Issue / evidence:** At 390px, the seven-step section begins around 870px; problem entry around 3,046px; professional credibility/CTA sections around 4,647–4,960px. Seven world cards, seven problem rows and five compound paths repeat many destinations. Nineteen world links compete across these formats.
- **Why / impact:** A visitor with a specific problem must read or skip the full sequence before reaching the better entry method. Professional visitors see relevant capability late. Different order/hotel/report/checkout examples also require reorientation between labs.
- **Severity / scope / effort:** P2 · PAGE, MOBILE · S–M.
- **Recommendation:** Put a compact problem-entry shortcut near the hero, shorten repeated summaries and retain one quiet professional link near the byline. Add brief bridges describing the shared systems lesson; be honest that these are seven connected case studies, not one persistent simulation. Keep ordered navigation and the fuller bottom CTA.

## Toolooo

The five families provide a useful classification. Representative Check, Simulate, Decide, Plan and Create tools produced real results with explicit limitations. The main problem is reaching that value efficiently, followed by a few result/action mismatches.

### F02 — The finder is below too many competing introductions

- **Where:** `/toolbox/`, `src/pages/toolbox.astro`.
- **Issue / evidence:** Hero, optional My Toolooo, starter tools, problem clusters, five family cards and LV1/LV2/LV3 explanations precede search. Search appears around 2,090px on desktop before recent-tool insertion, and around 4,427px at 390px. A large tag set follows.
- **Why / impact:** Visitors looking for a known task must bypass internal product explanations before finding any of 100 tools. Several sections answer the same discovery question with equal visual weight.
- **Severity / scope / effort:** P1 · MODULE, MOBILE · M.
- **Recommendation:** Place existing search and primary family choices directly under a short hero. Keep one curated starting surface. Move maturity explanations and deeper tags below the finder or into a simple optional disclosure. Do not create more routes or a second metadata registry.

### F17 — API Payload Doctor retains a stale diagnosis while input changes

- **Where:** `src/components/toolbox/tools/ApiPayloadDoctor.tsx`.
- **Issue / evidence:** After replacing the fictional sample with invalid `{"foo":}`, the old casing diagnosis remains until Diagnose is pressed. The subsequent diagnosis correctly reports invalid JSON.
- **Why / impact:** Correct old information can be mistaken for the result of the currently visible input.
- **Severity / scope / effort:** P2 · PAGE · S.
- **Recommendation:** Clear the main decision or mark “Input changed — diagnose again.” Keep explicit execution and existing parsing/model behavior.

### F18 — Transport recommendation and next action are insufficiently connected

- **Where:** `/toolbox/real-time-transport-decision-lab/`, Chat Application preset.
- **Issue / evidence:** WebSocket wins at 96% editorial fit; the prominent action instead discusses preferring SSE for simpler one-way feeds and considering WebTransport only for verified need.
- **Why / impact:** The alternative advice is conditional and not mathematically false, but it does not clearly tell this user what to validate next for the winning choice. Percentages must remain explicitly editorial fit, not measured reliability.
- **Severity / scope / effort:** P2 · PAGE · S.
- **Recommendation:** Lead with a winner/constraint-specific next check. Keep alternatives and caveats as supporting guidance; do not change the scoring model.

### F19 — MCP Security Doctor makes the safe example unnecessarily indirect

- **Where:** `/toolbox/mcp-security-doctor/`.
- **Issue / evidence:** Initial empty analysis yields an input-required error. To see a fictional result, users open the example disclosure, load it, then analyze. Detailed size/depth constraints are prominent before first value.
- **Why / impact:** A new visitor must understand setup before seeing what the doctor produces.
- **Severity / scope / effort:** P2 · PAGE · S.
- **Recommendation:** Make the existing fictional example loader visible beside the primary input/action and keep detailed limits secondary. Preserve explicit analysis, input validation and browser-only processing.

### F20 — Next-tool priorities are not consistently the strongest workflow continuation

- **Where:** Canonical next-tool metadata for MCP Security Doctor and AI Agent Cost & Loop Simulator; shared Next versus Related surfaces.
- **Issue / evidence:** Both prioritize the same LLM assurance/evaluation destination despite different security and cost problems. Related sidebars sometimes offer a more immediately relevant continuation.
- **Why / impact:** Two recommendation surfaces can disagree about the best next task, making discovery feel generic.
- **Severity / scope / effort:** P2 · MODULE · S.
- **Recommendation:** Review existing `nextToolIds` against each tool's result/use case and reconcile priority with related links. No recommendation engine, duplicated registry or random rotation is warranted.

## Artooo

Artwork opening, related selection, modal focus containment, Escape and focus restoration worked. The main friction happens before the artwork, not in the modal mechanics.

### F07 — Search and artwork follow a mobile filter wall

- **Where:** `/artworks/`, `src/pages/artworks.astro` and `src/components/artworks/ArtworkGrid.tsx`.
- **Issue / evidence:** At 390px, gallery search begins around 1,632px and the first gallery item around 2,667px. Forty-five tag buttons separate finding from viewing. Subject tiles such as Nature/Animals/Fantasy jump to the first matching artwork anchor; they do not filter all works in that subject.
- **Why / impact:** Visitors spend attention on taxonomy before art. Subject labels can imply a collection result while delivering only a scroll jump.
- **Severity / scope / effort:** P2 · MODULE, MOBILE · S–M.
- **Recommendation:** Put search and a small useful subject set before secondary tag choices. Collapse the long tail of tags. Reuse the existing tag filter for subject navigation, or label the jump honestly. Keep crawlable artwork inventory and existing routes/assets.

## Notooo

Search and category controls are close to the listing introduction. Coming contains no entries and should not remain an equal availability choice (F14). Atomic Habits had readable 16px mobile body text and a usable reading flow. White paper inside a dark shell is an intentional reading treatment, not automatically a theme defect.

### F23 — Title/author-only rows provide little basis for choosing among 450 notes

- **Where:** `/notooo/`, unfiltered listing and search results.
- **Issue / evidence:** The compact library repeats title/author rows without much of the existing note's distinguishing value. The large inventory is searchable, so length alone is not a defect and new pagination routes are not required.
- **Why / impact:** Visitors without a known book must open entries to discover which one addresses their interest.
- **Severity / scope / effort:** P2 · MODULE · S–M.
- **Recommendation:** Reuse one short existing takeaway or category/topic cue where it materially helps choice, especially for filtered results. Keep the library/index design and published bodies unchanged; do not inflate every row into a large card or invent summaries.

## Professional / contact

### F01 — The principal contact destination cannot complete its task

- **Where:** `/drop-a-vibe/`, linked by header CTA, portfolio, Agent Systems Lab and Q&A. `src/pages/drop-a-vibe.astro`.
- **Issue / evidence:** Name, email, subject and message fields are editable, but submission is disabled and labeled Coming Soon. Copy promises “Every message gets read.” On 390px mobile the disabled submit appears around 1,039px, after the fields. Q&A's “Ask Right Now” reaches this same destination.
- **Why / impact:** Users can invest effort before discovering that no message can be sent. This directly interrupts professional interest and contradicts the promise.
- **Severity / scope / effort:** P1 · PAGE · S. Working external channels prevent this from being a site-wide P0.
- **Recommendation:** Make one existing working professional channel the primary action. Remove or clearly retire the unusable input path and its submission promise. Use truthful CTA wording. No backend, signup or new form vendor is needed.

### F06 — Work evidence appears after an exhaustive skills inventory

- **Where:** `/my-portfolio/`, `src/pages/my-portfolio.astro`.
- **Issue / evidence:** At 1440px, Technical Skills begins around 1,884px, Experience around 5,982px and Projects & Contributions around 7,002px; the contact section is around 10,418px. Only one project View link points to Khizooology; other entries mostly describe work without an evidence destination.
- **Why / impact:** Someone evaluating Khizar must absorb a long technology inventory before seeing concrete contributions or the strongest public proof.
- **Severity / scope / effort:** P1 · PAGE · M.
- **Recommendation:** Lead with two or three existing contributions and their honest role/outcome, linking public evidence where available, including the relevant current lab/work. Move exhaustive skills behind that proof. Do not invent metrics, client permissions, credentials, testimonials or new case-study routes.

## Page-specific fixes

Keep these local: artwork selection preservation (F08), API diagnosis freshness (F17), transport next-action copy (F18), MCP example placement (F19), Human Atlas theme coordination (F15), Cube mobile handoff (F24), Context comparison alignment (F22), portfolio proof order (F06) and contact truthfulness (F01). They do not justify global layout changes or new frameworks.

# MOBILE FINDINGS

### F13 — Two sampled primary actions fall below a short phone's first viewport

- **Where:** World 004 and World 014 at 320×740, measured from the initial top position.
- **Issue / evidence:** The coding-agent primary button bottom is around 785px; incident response around 808px. Deployment is barely within the viewport at 732px; Physical AI and Living Grid fit around 681–682px. At 390×900 all twelve newer worlds exposed their primary action in the initial view.
- **Why / impact:** The strongest first-use promise is less reliable on a common short screen. Header, breadcrumb, world label, title, tagline and question consume much of the available height.
- **Severity / scope / effort:** P2 · MOBILE · S–M.
- **Recommendation:** Reduce repeated framing and local spacing before shrinking controls or scene evidence. Keep the existing action near its result; do not add overlays covering the scene.

Other meaningful mobile issues are F02/F21 (finder depth), F07 (gallery tags), F10 (late problem entry), F16 (footer length), F24 (hidden paired Cube visual) and the text-heavy World 004 scene in F05. These are hierarchy issues rather than fixed-width overflow.

**Passed:** No page-level horizontal overflow in the 119 major-route layouts. The twelve first-visit worlds at 390px had usable primary targets, approximately 44px or taller (Living Grid about 59px). Mobile menu opened with keyboard, exposed state, closed with Escape and restored focus. These results do not mean every small graph token meets every target criterion; [WCAG's minimum target rule includes spacing and other exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

# ACCESSIBILITY FINDINGS

Priority order:

1. **P1 — F04:** Correct confirmed low-contrast informational text in light theme. This is the strongest objective accessibility defect found.
2. **P2 — F09:** Announce clipboard success and meaningful failure without stealing focus.
3. **P2 — F12:** Add a visible-on-focus skip-to-main shortcut.
4. **P2 — F03:** Preserve state across disclosure changes; do not surprise keyboard or screen-reader users with a reset.
5. **P2 — F24/F13:** Keep the selected visual and primary action discoverable on small screens.

Observed strengths: semantic main/navigation regions; named primary actions; visible focus; selected/pressed states on filters and Cube view choices; non-pointer Cube controls; artwork-modal Tab containment, Escape and originating-focus restoration; consent preferences returning focus to a usable choice. Infooo tests exercised normal and reduced-motion paths, and the browser's reduced-motion preference was active during interaction review.

No dedicated screen-reader application or exhaustive automated accessibility scan was run. Live-region semantics were inspected, not certified against every screen-reader/browser pair. No P0 accessibility failure was established in the sampled journeys. Preserve these limits when using the scores.

# USER JOURNEYS

| Journey | Observed outcome | Main friction |
|---|---|---|
| Home → monster → useful content | Explore Monsters and module links work. | Broad opening promise needs the module explanation; selected art loses intent (F08); count drift (F14). |
| Infooo → world → first value → deeper/next | All newer worlds produced a meaningful first action; ordered collection navigation works. | Some causal evidence stays hidden (F05); disclosure collapse clears results (F03). |
| Agent Systems Lab → problem → world → professional path | Start the Lab reaches World 008; problem and professional links exist. | Problem routing is late and repeated (F10); professional contact ends at F01. |
| Tool list → input → result → action | Search/empty-state recovery and representative tool results work. | Finder depth (F02), stale diagnosis (F17), next-action mismatch (F18). |
| Home/collection → expertise → contact | Portfolio and professional CTA are discoverable. | Proof arrives late (F06), then the form cannot submit (F01). |

# PERFORMANCE PERCEPTION / TRUST

No cold-load benchmark, Lighthouse score, network-throttled run or field CWV claim is made. Tool and world interactions responded with real local state changes. Human Atlas exposed progress and eventually became interactive. Local Astro hydration timing was not treated as proof of a production defect.

The concrete performance-related finding is late My Toolooo insertion (F21), not a fabricated site-wide speed score. Catalog and footer length create interaction cost even when rendering is fast. Prioritize content order before adding animation or more JavaScript.

Sources, Fact/Model/Simulation boundaries and browser-only tool constraints are useful trust infrastructure. Keep them available without leading the primary experience. Consent decline worked through Analytics preferences. This audit did not send private inputs, change GA administration or repeat the full analytics/privacy release gate; it does not replace that gate. Fix the observed privacy wording discrepancy (F11) rather than weakening the implementation.

# TOP 10 QUICK WINS

Ranked by value relative to contained effort:

| Rank | Change | Finding | Why it pays back quickly |
|---:|---|---|---|
| 1 | Replace unusable contact form path with an existing working channel | F01 | Repairs the end of every professional/contact journey without a backend. |
| 2 | Stop resetting on Explore more collapse | F03 | Preserves learning across multiple worlds. |
| 3 | Correct small accent-text contrast centrally | F04 | Improves readability without changing brand colors or layouts. |
| 4 | Add copied/failure status to the shared share component | F09 | One change improves repeated actions across modules. |
| 5 | Mark edited API input as needing a fresh diagnosis | F17 | Prevents a correct old result from appearing current. |
| 6 | Preserve artwork selection in home teaser destinations | F08 | Makes existing visual discovery behave as expected. |
| 7 | Correct privacy referral wording | F11 | Removes an objective policy/implementation mismatch. |
| 8 | Remove/count unavailable filter options and fix live-monster copy | F14 | Eliminates misleading empty choices using existing data. |
| 9 | Add the shared skip-to-main shortcut | F12 | Repeated keyboard-efficiency benefit with little code. |
| 10 | Make the existing MCP example loader immediately visible | F19 | Reduces setup before first useful output. |

# RECOMMENDED IMPLEMENTATION ORDER

## Phase 1 — Repair truth and predictable behavior

F01, F03, F04, F09, F11, F12, F14 and F17. These address failed task completion, unexpected state loss, readability, stale information and inaccurate promises. Add focused behavioral coverage where it protects the defect; preserve analytics semantics and privacy boundaries.

Acceptance: contact action works; collapsing exploration preserves the result; normal text meets contrast; copy gives feedback; no stale diagnosis looks current; availability/policy copy matches canonical data.

## Phase 2 — Put existing value earlier

F02/F21, F07/F08, F10, F06, F18/F19/F20 and F23. Reorder existing discovery and proof, reduce redundant choices and make the current result's next action specific. Do not create SEO pages, accounts, a search backend or a new recommendation system.

Acceptance: a known tool can be found near the hub opening; gallery art follows a short useful filter set; a collection visitor can choose a problem early; professional evidence precedes the skills inventory; every promoted action points to its intended existing destination.

## Phase 3 — Improve world-specific causal clarity and finish

F05, F13, F15, F16, F22 and F24. Reuse world assets to show evidence, preserve distinct teaching models, shorten mobile framing, coordinate Human Atlas theme locally and improve the Cube selection handoff.

Acceptance: the important cause and changed result are visible together; short-phone primary actions remain discoverable; paired selections reveal the relevant visual; both themes look intentional. Evaluate with first-time visitors before claiming comprehension improvements or higher measured usability.

# VERIFIED

- Rendered major surfaces at all seven requested widths: 119 layout checks, no horizontal page overflow found.
- Both themes reviewed; dark sweep of all seventeen major routes plus targeted visual checks.
- Worlds 003–014: desktop and 390px initial state, primary action and resulting lesson; selected short-phone states at 320×740.
- Worlds 007–014: advanced X-Ray/Trace and Challenge entry checked; disclosure state-loss reproduced in World 008 and confirmed in source.
- Human Atlas: loading-to-ready, search and structure selection. Cube: 2×2/eight-token state, graph selection and mobile view handoff.
- Check: MCP Security Doctor example/analysis and empty error; API Payload Doctor invalid-input diagnosis. Simulate: runaway-loop cost comparison. Decide: Chat Application transport result. Plan: shared-workstation passkey readiness. Create: API Error Contract Builder generation. No external share/download was required.
- Art modal keyboard containment, Escape and focus restoration; mobile menu keyboard/Escape; consent decline through preferences; filter empty states and recovery; Notooo search-to-note reading.
- `node scripts/test-infooo-first-visit.mjs` — PASS.
- `node scripts/test-infooo-entry.mjs` — PASS.
- Source checks corroborated shared disclosure reset, missing share feedback, referral policy mismatch and stale inventory copy.
- Audit-only work: no build, broad release audit, Lighthouse run, GA admin change, code implementation or deployment. Existing unrelated working changes were preserved.

# BLOCKERS

None for completing this heuristic audit. Production's older six-world version, absence of real-user testing, dedicated assistive-technology certification and fresh performance measurements are explicit evidence limits—not reasons to invent results or delay the actionable report.

# FINAL

🟢 AUDIT COMPLETE — READY FOR KHIZAR REVIEW
