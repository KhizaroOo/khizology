# Human Atlas

Human Atlas is Infooo World 001. Its isolated viewer bundle and BodyParts3D-derived anatomy files load only on `/infooo/human-atlas`; no backend or API key is used. The viewer supports system layers, search, direct selection, isolation, reset, and exploded anatomy. Attribution and limitations are in `HUMAN-ATLAS-ATTRIBUTION.md`.

## Loading repair and validation — 2026-09-09

The iframe now targets the explicit `human-atlas-viewer/index.html` document: the directory URL returned the site's 404 in Astro development. The viewer's manifest URL resolves relative to its module, and geometry URLs resolve relative to the viewer directory. All 15 compressed geometry chunks have matching uncompressed fallbacks for browsers without `DecompressionStream`. Both Infooo pages use the main landmark supplied by BaseLayout.

After `npm run build`, run `npm run audit:human-atlas`. To also check HTTP responses, run `npm run audit:human-atlas -- --origin http://127.0.0.1:4322` against a running preview. This checks the explicit iframe document, assets, geometry boundaries, fallback contents, attribution, and isolation from unrelated routes.

Validation passed: production build; SEO, prelaunch, domain, and value audits; and 39 viewer/asset HTTP checks. The anatomy audit checked 2,234 parts, 3,432 concepts, and 15 geometry chunks. Browser checks confirmed rendering, search, keyboard selection, isolation, system visibility, reset, and exploded view, with no logged browser errors. Sampled widths from 320 to 1440 pixels showed no outer horizontal overflow. Small screens still require vertical scrolling; physical touch-device behavior and performance budgets have not been validated.

This is a self-hosted precompiled upstream viewer with Infooo framing. The loading repair does not complete the full flagship specification: native source adaptation remains separate work. No commit, push, or deployment was performed for this repair.

## Learning layer — 2026-09-09

The viewer now has a small Infooo learning layer that leaves the rendering engine unchanged. It adds concise, source-backed knowledge for the supported heart, lungs, pulmonary vessels, aorta, and venae cavae; relationship cards that select related structures; and the `Follow the Blood` journey. The guide follows: heart → pulmonary trunk → lung → pulmonary vein → heart → aorta → vena cava. Its key insight is that artery and vein names describe direction from or to the heart, not oxygen level.

The source for every educational statement is [NIH: How Blood Flows through the Heart](https://www.nhlbi.nih.gov/health/heart/blood-flow). The model remains an adult male BodyParts3D reference; it is educational only and not diagnostic, treatment, or medical advice.
