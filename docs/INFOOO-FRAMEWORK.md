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
