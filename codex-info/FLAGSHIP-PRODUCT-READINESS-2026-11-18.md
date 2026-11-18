# Mission #9 — Flagship product readiness — 2026-11-18

Base: `c59e050c5837530612a16d335ead6c37a15a5af9`, the accepted MVP #8 production release. Work is on `dev-dev`; this candidate is not deployed.

## Research that affected the product

- [AWS retry guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/): bound attempts and retry time; backoff/jitter do not guarantee recovery; retry layers multiply work; repeat side effects require idempotency. Therefore compare actual model outputs without promising that one policy always wins or representing deterministic samples as a real distribution.
- [MOO print guidance](https://support.moo.com/hc/en-gb/articles/209324946-Design-quick-tips) and [Adobe print preparation](https://www.adobe.com/express/learn/blog/how-to-prepare-print-ready-files): distinguish background extension, intended cut and protected content; use the actual provider's specification. A guide is not a finished, verified print file.
- [W3C complex-image alternatives](https://www.w3.org/WAI/tutorials/images/complex/), [Open Anatomy Explorer research](https://vis.uib.no/wp-content/papercite-data/pdfs/vandenbossche2025open.pdf) and the existing [NIH blood-flow reference](https://www.nhlbi.nih.gov/health/heart/blood-flow): orientation, spatial relationships, curated context and text access matter more than adding visual controls. No claim of measured learning gains for this site.

## Retry Storm Simulator

Before: truthful primary verdict, but policy comparison was only optional numerical depth. No direct no-retry preset. Some colored numeric text lacked contrast. Auto-generated result changes were not explicitly measured.

Now: visible same-outage comparison line and explanation use the existing model, including equal or worse outcomes. No-retry preset reveals original traffic alone. Existing safer preset still truthfully reports Near capacity at 259/260. Copy contains the comparison and lesson. Limitations now explicitly include latency, timeouts, SDK policies, traffic distributions and multiple retry layers. Existing Rate Limit / reliability continuations remain canonical.

A one-click preset comparison makes a short demo possible. This is a policy-learning model, not a production load or recovery forecast. Calculations and pressure thresholds were not changed.

## Human Atlas

Before: the viewer already had a working seven-step guide, real target selection, spatial ghosting, relationships, progressive readiness and honest unavailable states. The surrounding page gave little first-use direction and no equivalent static reading route.

Now: concise orientation names actual controls. A numbered, sourced, seven-stop text route is rendered from existing canonical entities/relationships/guide order and works without JavaScript or precise pointer use. Educational/non-diagnostic boundaries and the distinction between explained blood flow and simulated movement are explicit. Attribution, guide interactions and all viewer state remain intact. No new anatomical facts or curriculum were invented.

The renderer file remains `human-atlas-scene-C2g4ALhk.js`: 503.96 kB raw / 129.13 kB gzip, identical to the baseline. Geometry remains 15 chunks / approximately 32.96 MB compressed; it is not newly downloaded through another service. The complete model remains heavy; the reading route and progressive geometry provide earlier access to useful learning, not a claim of reduced total transfer.

## Bleed & Safe Area Builder

Before: provider warning was buried, safe-content dimensions were absent, units were inches only, invalid margins could produce misleading guides, and every edit allocated an output-resolution canvas.

Now: visible printer-specific warning; inches/mm preserve physical size; trim/document/safe-content dimensions are explained; invalid guides cannot export. Preview differentiates areas and line patterns and has a maximum 900 px side. Full-resolution PNG is allocated only on export, capped at 16 million pixels; larger output remains available as physical-size SVG. PNG pixels and SVG dimensions remain correct. Export notes distinguish vector/raster guides, artwork and crop marks.

For example, the former poster-at-600-DPI preview requested 11,100 × 14,700 pixels (derived from existing dimensions). The new preview never exceeds 900 px per side. This is an allocation bound, not a measured real-device speedup. Primary practical continuation is Print Ready Doctor for the actual artwork; Perspective Grid Maker was an unrelated next step. Existing Related choices remain available.

## Shared changes and privacy

- `Metric.tsx` and `RangeControl.tsx`: reuse existing theme-aware identity/text mixing for numeric text; preserve identity colors for controls. These shared consumers affect other tools as well.
- `useToolResult.ts`: small React hook for settled, valid auto-result changes. No mount events, no per-drag-event inflation, timer cleanup, and no input/result arguments sent to analytics. Retry and Bleed use it. Existing start/share/export events are retained.
- The existing prelaunch gate now includes the settled-result/static-route and bleed regressions.
- No Infooo registry, generic framework, Atlas renderer, anatomy source or other world was changed. No dependency, backend, persistence, account or route was added.

## Verification

- Fresh `npm run build`: PASS, 136 Astro routes; existing large Atlas chunk warning unchanged.
- `npx astro check`: PASS, 515 files, 0 errors, 0 warnings, 14 hints.
- `npm run verify:release`: PASS (Astro, SEO/prelaunch/domain/search/Value, Atlas assets, Contract Drift, retry model/UI, Atlas geometry, World 017 model/UI). After the final preview/text CSS refinement, build and affected checks were repeated.
- Fresh standalone SEO/prelaunch/domain/search/Value audits: PASS. Sitemap stays 131 canonical pages plus 170 separate image entries; canonical/social/schema/discovery/retired-route protections remain intact.
- Focused tests: retry model/UI, bleed geometry/units/export/limits, flagship analytics debounce/cleanup/static route, shared accent contrast, analytics/privacy, tool discovery and Atlas learning: PASS. Prelaunch also runs existing contact, share, stale-result and discovery regressions.
- Browser: built candidate at 1440×900 and 360×800, light and dark, reduced motion. Retry presets, truthful equal comparison, 24-point visual comparison, copy, keyboard edits and one settled result event pass. Sampled normal-text minima: 5.52:1 light, 5.14:1 dark.
- Bleed: keyboard SVG export is physically 3.75 × 2.25 inches for the business-card preset; actual PNG is 1125 × 675 pixels at 300 DPI. Units, invalid-margin recovery, large-PNG guard, SVG availability, next destination and no page overflow pass in all four viewport/theme combinations.
- Atlas text route: seven canonical stops, NIH source and no overflow with JavaScript disabled. 3D checks use installed Chrome, actual built local geometry and delayed later chunks, with mocked Google transport. Installed Chrome checks at 1440×900/light and 360×800/dark pass Heart selection before full geometry, pending femur honesty, theme switching with selection preserved, isolation/surrounding anatomy, all seven guide targets, Back/Next/Finish/Restart/Exit and unobscured guide controls. Seven of 15 chunks are loaded; later requests are deliberately delayed. Completion emits once; no anatomy search/select history is sent.
- Google transport is mocked in local candidate analytics checks; these are not live GA ingestion evidence. No private inputs, search/select history, uploads or result payloads were collected. No external messages/shares were completed.
- `git diff --check`: PASS before commit.

## Value and growth decision

Unity: existing shell, renderer, data and workflows. Depth: actual policy comparison, spatial learning plus text, physical print geometry and honest boundaries. Identity: existing visual language and tokens. Discovery: existing routes/static context/canonical continuations; no thin landing pages.

These three cover reliability, visual learning and creator workflows. Bleed is an editorial selection based on growthPriority, utility and brand coverage, not proven first-party traffic demand. Search Console selection evidence remains unavailable; no demand, conversion, revenue or learning-outcome claim is inferred. Repeat value is intentional: policy comparisons, guided exploration and reusable print exports.

## Limits / handoff

Browser-emulated phones are not physical-device tests. No screen-reader speech, field CWV or clinical validation is claimed. An initial minimal headless-shell run did not finish; final functional checks use installed Chrome. After the parent theme toggle, the test scrolls the embedded viewer back into view, as a visitor would. No GPU or real-phone speed claim is inferred. No new Atlas bundle cost was introduced. No verified P0/P1 is known in the completed checks; production promotion remains Khizar's decision. Commit and push only mission files to dev-dev, never main or manual deployment.
