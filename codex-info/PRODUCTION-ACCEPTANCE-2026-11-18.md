# MVP #8 — Production acceptance — 2026-11-18

## Decision

**BLOCKED for production acceptance.** Approved release is deployed, but two reproducible P1 defects remain on production. Both have minimal, regression-tested candidate fixes on dev-dev; Khizar must promote and release them before production can pass. No P0 found in the checked scope. This is representative acceptance, not certification of every tool or WCAG conformance.

## Release identity and inventory

- Production: https://khizooology.com
- Approved source and checked main: cd1b38c12e9ad2a2ccce8c12205ced49ef2ceced.
- GitHub Pages deployment 7868348849 reports success for that SHA. [Run 44192245466](https://github.com/KhizaroOo/khizology/actions/runs/44192245466): build, release gate and deployment succeeded.
- Full production SEO crawl: 131 distinct canonical sitemap HTML URLs, zero errors. Image sitemap resources: 170; these are not additional HTML pages. Current registries: 100 active tools, 17 public worlds, 170 artworks. Intentional retired Notooo routes remain 404/noindex; no phantom new pages were introduced.
- Local build: 136 Astro routes. Counts use their stated semantics; standalone HTML and redirects do not inflate indexable counts.

## Material standards researched

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): normal text 4.5:1, qualifying large text 3:1; keyboard access and unobscured focus. Measured rendered/composited colors; excluded invisible image-hover overlays from contrast results.
- [Core Web Vitals](https://web.dev/articles/vitals): LCP 2.5 s, INP 200 ms and CLS 0.1 are field targets at the 75th percentile. Desktop Chromium lab observations do not establish field/mobile CWV.
- [Google crawling/indexing](https://developers.google.com/search/docs/crawling-indexing) and [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features): crawlable useful content, canonical consistency and valid discovery matter; sitemap submission does not guarantee indexing and special AI schema is not required.
- [OpenAI bots](https://developers.openai.com/api/docs/bots) and [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): search discovery, training and user-triggered access are separate controls. Nine live user-agent probes across robots.txt, llms.txt and World 017 returned 200 for OAI-SearchBot, Claude-SearchBot and Googlebot.
- [Google consent guidance](https://developers.google.com/tag-platform/security/concepts/consent-mode): checked the site's basic consent model against actual requests, not merely a consent banner or dataLayer.

## Production journeys actually checked

Chromium browser-emulated desktop 1440×900/light and phone 360×800/dark; consent flows at 390×844/dark. Reduced motion enabled. Themes were switched and reload persistence checked. No physical phones or actual screen-reader speech were tested.

- Both viewports: homepage, Toolooo hub, Retry Storm, API Payload Doctor, Bleed & Safe Area Builder, Infooo hub, How Misinformation Spreads, Artooo, portfolio, contact, privacy and future monsters: HTTP 200, meaningful H1, no page-wide overflow or uncaught page errors in these route checks. Mobile menu keyboard open/Escape works. Portfolio/contact destinations inspected without contacting anyone.
- Toolooo search: multiword queries, reversed terms, genuine no-match and reset. Retry safer preset: 259/260, Near capacity; copied result agrees; aggressive preset reports severe pressure. API diagnosis: valid sample, edits/outdated, restoration/current, malformed JSON, example and successful rerun. Local-vs-cloud decision produces comparison; Bleed business-card preset produces a downloadable SVG. No sample input was sent to a processing service or analytics.
- Artooo: actual decoded artwork, modal semantics and focus containment, related artwork changes, browser Back restores selected artwork, Escape restores originating card focus; Nature filter produces 22 artworks. Images loaded without HTTP errors. Related-click analytics defect recorded below.
- World 017: deliberate first-share choice and comparison completion; Start over and repeat. Actual analytics emits one world start and one guide completion per page, rather than on render or duplicate replays.
- Atlas: actual production geometry, later nonpriority requests held to prove progressive readiness. Heart, first guide targets, Back/Restart/Exit, isolation/surrounding anatomy and free canvas picking worked with 7/15 chunks. Deferred femur honestly showed Loading geometry. Full-load desktop keyboard pass confirmed all 15 chunks, 2,234 catalogue pieces, loaded femur selection, layers, all seven guide steps and Finish. On the 360×800 reduced-motion phone check, changing the parent theme preserved Heart selection and the second guide target plus Back/Restart/Exit remained reachable with 7/15 chunks. Initial full-geometry pointer attempt timed out under software WebGL; desktop keyboard retest completed. This does not establish full-geometry pointer performance on physical hardware.
- Skip links on home, API tool, World 017, gallery and contact: actual first Tab, Enter focuses main, next Tab reaches content. No claim of a complete keyboard audit of all routes.

## Analytics/privacy production evidence

- Clean preconsent and fresh declined sessions: zero Google tag/collect requests. Accept: one tag load; actual Google collect responses 204. Tool start dedupes; repeated diagnoses emit new result events.
- Campaign labels use allowlisted normalized values; canonical page_location excludes synthetic query/hash markers. Checked Google request bodies/URLs contained no synthetic private input marker. Referral values followed scheme/host sanitization. No raw URLs or sensitive payloads are retained in this report.
- Offer visibility emits once, deliberate prevented-navigation contact intent emits once; no fake lead/payment/tool-complete event. No message, email or real external share was sent.
- Withdrawal via preferences reloads and stops subsequent checked tool/navigation analytics.
- FoundrList image decodes successfully under accepted and declined states; both www and redirect-target requests omit Referer. Privacy copy describes its passive resource request even if analytics is declined.
- Public Google tag configuration audit passes: no Enhanced Measurement modules or enabled automatic/user-provided-data capabilities. This is public configuration plus transport evidence, not private GA Admin access or proof of report ingestion/revenue.

## Confirmed P1s and candidate fixes

### A8-P1-01 — shared Tool Info contrast

Reproduce on API Payload Doctor or Retry Storm, light theme: inspect Price / Free and Status / Live. Inline #22c55e on white measures **2.28:1**, below 4.5:1 for normal text. Shared detail template affects all tools.

Fix: remove these inline color overrides and reuse existing --k-text; retain words and checkmark, pricing/status logic and layout. Built candidate measured **12.74:1 light**, **13.65:1 dark** at the checked surfaces. Regression protects use of the already-tested theme token. Acceptance after release: both labels remain readable in both themes and reach 4.5:1.

### A8-P1-02 — missing Artooo related-click measurement

Reproduce on production after analytics acceptance: open 1st Day At Sea, follow a related artwork. The artwork changes and artwork_view increments, but **related_art_click remains zero**. Modal click propagation stops before the document's bubbling analytics listener, losing a meaningful growth event.

Fix: use capture for the existing shared discovery listener, preserving its consent gate, event names, public metadata and deduplication. Focused test checks related source/destination from the capture handler. Built browser candidate: trusted related click emits **exactly one** related_art_click with public source/destination and no private payload; both desktop/light and phone/dark pass.

## Local changes and verification

Runtime files only: src/pages/toolbox/[slug].astro; src/utils/analytics.ts.
Focused regressions: scripts/test-accent-contrast.mjs; scripts/test-analytics.mjs.
This dated acceptance record is the only documentation change. No dependencies, tool models, Atlas code, routes, metadata or theme redesign changed.

Actual fresh checks after fixes:

- npm run build — PASS; also rebuilt with the confirmed public production GA ID for built analytics verification. No project environment file changed.
- node scripts/audit-seo.mjs — PASS.
- node scripts/audit-prelaunch.mjs — PASS.
- node scripts/audit-domain.mjs — PASS.
- node scripts/audit-search.mjs — PASS.
- node scripts/audit-value.mjs — PASS.
- node scripts/test-analytics.mjs — PASS, including earning privacy/visibility tests.
- node scripts/test-accent-contrast.mjs — PASS: 48 token/surface/tint pairs and fills.
- node scripts/test-artwork-discovery.mjs — PASS.
- node scripts/test-share-feedback.mjs — PASS, mocked cancellation/failure paths.
- node scripts/test-atlas-learning.mjs — PASS.
- npx astro check — PASS: 513 files, 0 errors, 0 warnings, 14 hints.
- Atlas asset audit / geometry tests — PASS: 44 assets/routes, 2,234 parts, 3,432 concepts, 15 chunks; worker assembly preserves geometry.
- git diff --check — PASS before this record; repeat before commit.

The deployed exact-SHA GitHub release gate also passed Astro, SEO/prelaunch/domain/search/Value/Atlas audit, Contract Drift, retry model/UI, Atlas geometry and World 017 model/UI checks. This earlier CI evidence is distinct from fresh local checks and direct production behavior.

Built candidate browser checks use generated dist served under an intercepted production origin, with Google transport stubbed; those are **local candidate evidence**, not a production deployment. Actual live consent/network checks above used production without mocked Google responses.

## Performance and verification limits

- Production PerformanceObserver samples collected for seven representative routes at desktop/light and phone/dark. Desktop observed LCP 1.30–1.93 s and CLS no higher than 0.052 in this run. Some phone-width LCP samples rose to 3.14–4.98 s while a concurrent full-geometry software WebGL test saturated the host. Isolated reruns after the heavy full-geometry job ended measured Toolooo hub 1.936 s, Retry Storm 1.608 s and Infooo hub 1.116 s LCP (CLS <= 0.0194). The contended samples cannot establish a production regression, and none of these runs establish real-phone performance. No field INP/CWV pass is claimed.
- Public PageSpeed request returned HTTP 429; CrUX/field CWV unavailable. Private GA property settings and report ingestion were not independently accessed.
- Browser-native share cancellation/failure uses automated mocks; no real external share completed. Actual clipboard success and modal focus were exercised. No full screen-reader test, full WCAG audit or physical-device test.
- Navigation intentionally aborted late image/script requests in rapid route smoke; these are separated from HTTP failures. No unexpected failed HTTP responses on completed representative journeys; retired route 404 was intentional.
- Standard large Atlas renderer build warning and existing Astro diagnostics are recorded as baseline observations, not new feature work. No unrelated P2/P3 cleanup performed.

## Handoff

Commit/push only this record and four task files to dev-dev. main/deployment must remain unchanged. After Khizar releases the candidate: rerun production Tool Info contrast and related-art event reproduction, then finish outstanding acceptance limits. **MVP #8 BLOCKED until live defects are resolved.**
