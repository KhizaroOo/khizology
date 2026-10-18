# Infooo framework

Infooo shares presentation and keeps world intelligence local. `InfoooWorldShell` supplies identity, responsive layout, the hero stage, optional toolbar/panel/footer, and Infooo visual tokens. A world supplies its own renderer: WebGL, SVG, canvas, DOM, or another isolated implementation. The framework never imports a renderer.

## Shared components

- `InfoooStage`: accessible renderer container with loading and recoverable error overlays.
- `InfoooToolbar`, `InfoooModeSwitcher`, `InfoooLayerControl`: optional controls only when a world has the capability.
- `InfoooSearchPanel`, `InfoooEntityPanel`, `InfoooKnowledgePanel`, `InfoooRelationshipPanel`: semantic discovery and knowledge presentation.
- `useInfoooGuide` and `InfoooGuideControls`: navigation state only; each world interprets its own guide action.
- `InfoooScenarioControl` and `InfoooCompareLayout`: optional presentation for local simulations and comparisons.
- `InfoooMobileSheet`: accessible small-screen details surface.
- `InfoooLoadingState`, `InfoooErrorState`, and `InfoooSourceDisclosure`: shared honest-state UI.

`src/data/infooo.ts` contains optional world metadata, entities, relationships, layers, guides, scenarios, sharing, analytics, performance, and accessibility declarations. A world should declare only what it uses. Relationships stay generic (`from`, `type`, `to`, `explanation`); each renderer decides how to visualize focus.

## Future world workflow

1. Pass the Infooo candidate and Value Laws checks.
2. Add a published world record only after release approval.
3. Build the renderer and domain data locally to its route.
4. Compose relevant shared Infooo components around it.
5. Add real truth/source metadata, accessible visual descriptions, and consent-safe analytics.
6. Add the approved public route and growth foundation, then run build and audits.

Shared UI is intentionally lightweight. Heavy renderer code and assets stay route-specific, so Human Atlas does not load on future Infooo pages and future worlds do not load on Human Atlas.

## Infooo First-Visit Clarity

A published world should aim for:

- 5 sec — understand what is being taught.
- 10 sec — know the primary interaction.
- 30 sec — experience the core relationship.
- 2 min — intentionally explore deeper.

These are heuristic quality targets, not measured usability claims unless real user testing exists.

The default experience should offer one primary question, one simple mental model,
one obvious primary action, visible cause/effect and a concise aha moment. Advanced
depth belongs behind progressive disclosure. The design principle is:
**QUESTION → SIMPLE MENTAL MODEL → ONE PRIMARY ACTION → WATCH CAUSE/EFFECT → AHA MOMENT → EXPLORE DEEPER.**

Share presentation; keep world intelligence local. Reuse the foundation's stage,
source disclosure and reduced-motion hook where appropriate. Extract additional
presentation only when semantics match and its API is simpler than the duplication.
Deployment's release progress and Coding Agent's evidence/repair loop retain distinct
layouts, completion treatments and reset behavior. Native disclosure/status markup
alone does not justify a wrapper. Human Atlas and Rubik's Cube keep their own interaction models.

### Visual learning stories (worlds 003 and 004)

The owner's visual review supersedes the rejected text stepper. One idea, one coherent visual scene, one playback action. Start with a title, a one-line promise, the scene and Play. Use comprehension holds, Pause, Step and Replay; reduced motion stays manual with no motion. Keep the current stage and one concise textual equivalent, sources and related-world navigation. No advanced lab, tab system or tutorial stepper. Share playback/presentation only; release and agent intelligence stays local. These are product heuristics, not measured usability claims.


### Knowledge depth on one visual world

Worlds 003/004 use Beginner, Intermediate and Advanced as annotation depth, not separate layouts. Switching depth pauses and preserves position. Explicit scenario selection resets the same scene. Playback holds 4.5/5.5/6.5 seconds per state; Step pauses, reduced motion stays manual, and sources explain what is real, simplified or variable. Advanced scenarios are capped at three. Failed release candidates never receive traffic; simulated verification never grants production approval.


### Visual clarity and contextual terms

Each visual object owns a fixed region. Connectors use the gaps and outer lanes; no detached completion marks. Current-stage term notes are plain term/meaning pairs, capped at three and replaced as the story advances. Mobile uses a vertical sequence with instant current-object following after playback begins; the existing explanation and controls remain available. Human approval is explicitly simulated, gates progression, and never publishes anything. The Advanced release walkthrough includes a labelled application rollback demonstration; database recovery remains separate.
