# Google + Microsoft SEO standards audit

Reviewed 2026-10-13 (Asia/Karachi). Scope: current local production build plus representative public responses. No commit, deployment, indexing request or account configuration change. Standards are eligibility/quality guidance, never a ranking guarantee.

Classification: **REQUIRED** = eligibility/policy requirement; **RECOMMENDED** = best practice; **CONTEXTUAL** = applies when that mechanism is used; **NOT APPLICABLE** = no appropriate feature. **PASS** means the stated technical evidence passed, not that every factual claim has been independently verified. **MANUAL** preserves subjective or external review.

## Architecture and evidence

Astro static routes consume canonical `tools.ts`, `artworks.ts`, `infooo.ts`, `notooo.ts`, monster and content-manifest registries. `SEO.astro`, `utils/seo.ts`, `utils/schema.ts` and `utils/url.ts` centralize metadata, identities and paths. Astro's sitemap integration excludes intentional utility/redirect routes; image sitemap and llms.txt are generated from canonical content. React islands enhance existing HTML. GitHub Pages hosts the static build. Analytics remains opt-in with public metadata only.

Reusable inventory command: `node scripts/audit-seo.mjs --inventory <output.json>`. It records every generated HTML URL, classification/status expectation, canonical/robots/sitemap, title/description/H1, descriptive text size, schema types, images/alt, link graph/depth, redirect target, family and rendering mode. Text counts are observations, not quality scores. Crawl evidence and lab reports accompany the review outside the source tree.

## A. Google — 27 documentation areas

All links below are Google Search Central (`developers.google.com`). Official documents were retrieved during this audit; no third-party standards were used.

| Area / official source | Rule class | Status | Implementation / evidence |
| --- | --- | --- | --- |
| [Search Essentials](https://developers.google.com/search/docs/essentials) and [technical requirements](https://developers.google.com/search/docs/essentials/technical) | REQUIRED | PASS | Public sample indexable URLs return 200, allow crawling and expose content. |
| [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) | REQUIRED | MANUAL | No observed cloaking, doorway, fake rating or link-scheme pattern; editorial-scale review remains human. |
| [People-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | RECOMMENDED | MANUAL | Working tools and original art have independent utility; sample notes are specific and sourced, not all 240 independently fact-checked here. |
| [Generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) | CONTEXTUAL | MANUAL | Automation does not excuse low value or incorrect claims; keep book-level editorial oversight. |
| [Robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro) / resources | CONTEXTUAL | PASS | One allow-all group; both sitemap declarations; no important resource restriction. |
| [Robots meta / X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) | CONTEXTUAL | PASS | Five intentional noindex documents, one noindex redirect, no conflicting sampled response headers. |
| [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) | RECOMMENDED | PASS | 318 unique indexable self-canonicals, HTTPS apex and consistent slash policy. |
| [Redirects / removals](https://developers.google.com/search/docs/crawling-indexing/301-redirects) | CONTEXTUAL | MANUAL | Host/slash redirects are single-hop 301; legacy typo uses immediate static meta-refresh, not a server 301. Actual missing pages return 404. |
| [Sitemaps / lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | RECOMMENDED | PASS | Canonical indexable set matches sitemap; no rebuild-derived lastmod. |
| [Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) / graph | RECOMMENDED | FIXED | Smart Next and chain moves are real anchors; tracking/progress retained. Inventory measures reachability/depth. |
| [Duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) / content | RECOMMENDED | MANUAL | Technical URL consolidation passes. Near-duplicate meaning and independent usefulness require editorial judgment. |
| [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) | RECOMMENDED | PASS | Static titles, canonicals, guides and primary context; interactive renderers remain intentionally interactive. |
| [Title links](https://developers.google.com/search/docs/appearance/title-link) | RECOMMENDED | PASS | 318 distinct descriptive titles. Under 70 characters is a project convention, not Google's ranking threshold. |
| [Snippets / descriptions](https://developers.google.com/search/docs/appearance/snippet) | RECOMMENDED | PASS | Unique useful descriptions; engines may choose different snippets. |
| [Starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) / headings | RECOMMENDED | PASS | Meaningful H1 and section hierarchy sampled; semantic main/navigation and topic-specific copy. No invented word-count rule. |
| [Image SEO](https://developers.google.com/search/docs/appearance/google-images) | RECOMMENDED | PASS | All images have alt and intrinsic dimensions; originals/preview assets and 170 sitemap images available. |
| [Structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | CONTEXTUAL | PASS | Parse/type/reference checks pass; no fabricated ratings/offers or invisible schema claims observed. |
| [BreadcrumbList](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) | CONTEXTUAL | PASS | Canonical positions/name/item relationships retained; 317 documents expose breadcrumbs. |
| [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page) | CONTEXTUAL | PASS | Portfolio mainEntity resolves to the canonical Person with name/alternateName. Google Rich Results Test remains an external confirmation. |
| [SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app) rich result | NOT APPLICABLE | N/A | Generic WebApplication entity descriptions do not claim app rich-result eligibility; no reviews invented to qualify. |
| [Site names](https://developers.google.com/search/docs/appearance/site-names) | RECOMMENDED | PASS | Homepage WebSite entity uses canonical Khizooology identity. |
| [Favicons](https://developers.google.com/search/docs/appearance/favicon-in-search) | RECOMMENDED | PASS | Use actual linked PNG icons, not an assumed favicon.svg endpoint; stable crawlable assets. |
| [Page experience](https://developers.google.com/search/docs/appearance/page-experience) / HTTPS | RECOMMENDED | PASS | HTTPS, no mixed-resource findings, no signup/ad obstruction, accessible representative controls. |
| [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) | RECOMMENDED | MANUAL | Current mobile lab measurements below; field LCP/INP/CLS need Search Console/CrUX data. Lab scores do not establish field status. |
| [Mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing) | RECOMMENDED | PASS | Same primary HTML; representative mobile layouts and controls checked without hiding searchable content. |
| [Interstitials](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) | RECOMMENDED | PASS | No marketing interstitial; optional analytics controls and user-opened dialogs preserve main content. |
| [Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start) | CONTEXTUAL | MANUAL | Owner should inspect Google-selected canonicals, crawl/render and actual coverage/performance. No account metrics invented. |

Google totals: PASS 18; FIXED 1; MANUAL 7; N/A 1. These are area classifications, not an SEO score.

## B. Microsoft — 16 documentation areas

Source **B1**: [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a) (`bing.com`). The direct page is a JavaScript shell; the official indexed document supplied its current contents. **B2**: [Sitemaps in AI-powered search](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/). **B3**: [Duplicate content and AI visibility](https://blogs.bing.com/webmaster/2025/12/Does-Duplicate-Content-Hurt-SEO-and-AI-Search-Visibility/). **B4**: [AI Performance introduction](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/). **B5**: [2026 AI visibility features](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/). **B6**: [IndexNow specification](https://www.indexnow.org/documentation).

| Area / source | Rule class | Status | Site evidence |
| --- | --- | --- | --- |
| Eligibility / crawl (B1) | REQUIRED | PASS | Public 200 responses; static context. |
| Bingbot / robots (B1) | CONTEXTUAL | PASS | Generic allow-all policy. |
| Noindex / snippet controls (B1) | CONTEXTUAL | PASS | Intentional exclusions; no grounding opt-out added. |
| Canonical URLs (B3) | RECOMMENDED | PASS | Apex/slash consolidation. |
| Moves / deletion (B1) | CONTEXTUAL | MANUAL | 404 removal; static typo alias fallback. |
| XML sitemaps / lastmod (B2) | RECOMMENDED | PASS | 318 canonical URLs; truthful omitted lastmod. |
| IndexNow (B6) | CONTEXTUAL | FIXED | Explicit reviewed changes; removed/moved URL support. |
| Crawlable links (B1) | RECOMMENDED | FIXED | Shared Next anchors. |
| Semantics / headings / metadata (B1) | RECOMMENDED | PASS | Structured static HTML. |
| Focus / standalone quality (B1) | RECOMMENDED | MANUAL | Editorial verification remains necessary. |
| Entities / creator trust (B1) | RECOMMENDED | PASS | Canonical creator references. |
| Truthful schema (B1) | CONTEXTUAL | PASS | Valid visible entity descriptions. |
| Freshness (B2) | CONTEXTUAL | PASS | No artificial rebuild dates. |
| Spam / AI manipulation (B1) | REQUIRED | MANUAL | No observed abusive pattern; human oversight retained. |
| Copilot grounding (B4) | RECOMMENDED | MANUAL | Technical preparation is not citation evidence. |
| AI Performance (B5) | CONTEXTUAL | MANUAL | Owner account report needed. |

Microsoft totals: PASS 9; FIXED 2; MANUAL 5; N/A 0. Six official source families support these sixteen areas.

Differences: Google supports immediate meta-refresh as a static-host redirect fallback; Bing recommends permanent server redirects for moves. Preserve the legacy alias for users, exclude it from the sitemap and avoid internal references. Microsoft assigns Copilot-specific effects to noarchive/nocache; Google's directive support differs. Do not add restrictive snippet directives to content intended for discovery. Generic schema.org validity is distinct from Google-supported rich-result eligibility. Neither engine promises indexing/ranking/citations.

## C. Shared technical findings

- Recomputed build: 324 HTML documents = 323 site documents + one embedded viewer; 318 indexable, five noindex, one compatibility redirect. Sitemap/llms have 318 URLs; image sitemap has 170 images. All indexable pages are reachable from Home within two anchor hops.
- Explained exclusions: `/future-monsters/` and `/you-ask-i-answer/` are intentional previews; `/notes/` is an empty reserved notes index; `/infooo/human-atlas-viewer/` is a non-indexable embedded application whose canonical points to its world; `/404.html` is the error template. `/frop-a-vibe/` is the typo compatibility redirect to the contact page. None belongs in the sitemap. Direct access to the error file returns 200; nonexistent requested routes return 404.
- Existing audits report zero indexable canonical conflicts, broken internal links, orphan pages, duplicate critical metadata, missing alt or malformed JSON-LD. Error/embedded/redirect documents deliberately have different canonical semantics from indexable pages.
- IndexNow previously submitted the whole sitemap. `--submit` now requires `--changes file.json` with `{"updated":[],"removed":[]}`. Dry run remains safe. Updated URLs must be canonical/indexable; removed URLs cannot remain indexable. Submission checks live lifecycle responses and deployed sitemap. Nothing was submitted. The operator must supply real meaningful changes; this is not an automatic freshness detector.
- Search/privacy audit now recognizes canonical trailing slashes and the embedded viewer's parent-owned preferences. No analytics or SEO system was duplicated. The public IndexNow key returned 200 and matched; production sitemap matched the local 318-URL set.
- No artwork detail route exists: all 170 works have static images/titles/context in `/artworks/` with interactive dialogs. Do not manufacture 170 routes just to satisfy a page-count checklist.

## D. Search / AI discovery and content quality

Toolooo: 60 tools have distinct use cases/examples and working local outputs. Shared limitations are deliberate explanatory scaffolding, not independent SEO pages. Ten existing priority tools remain the first improvement targets.

Artooo: original artwork is real value; titles, visible tags, related works and image context are discoverable. Some metadata is sparse. Add only genuine creator context when available, never inferred medium/year/story.

Infooo: four worlds expose static topic descriptions, guides/limitations and related links. Interaction is necessary for full exploration, not for discovering the subject. Human Atlas's heavy renderer should remain isolated from generic framework code.

Notooo: 240 published notes have distinct book intent and source references; twelve additional notes across all six categories were sampled. Attributed book arguments and practical takeaways are specific. The scale still warrants continuing editorial review of fidelity, original added value and sensitive claims. No automatic noindex, filler or word-count expansion is justified by these samples. No assertion that every book claim is verified.

llms.txt remains a useful project discovery artifact, not an official Google/Bing eligibility requirement. Robots permits crawlers; sitemap and static context provide conventional discovery. No AI-targeted instructions, fake citations or special prompt bait were introduced. Generic social artwork is valid metadata but less topic-specific than a genuine representative image; improve only with existing truthful assets, not a mass image-generation system.

## E. Traffic opportunities — existing URLs only

All demand below is **Likely**, inferred from a concrete task and usable output; no keyword-volume or account click data was available to establish demand. Order is editorial priority, not predicted traffic.

| Existing URL | User value / remaining action |
| --- | --- |
| [/toolbox/api-payload-doctor/](https://khizooology.com/toolbox/api-payload-doctor/) | Contract review; validate anonymized examples and inspect actual query signals. |
| [/toolbox/perspective-grid-maker/](https://khizooology.com/toolbox/perspective-grid-maker/) | Drawing template; demonstrate the exported grid in a real permitted workflow. |
| [/toolbox/bleed-safe-area-builder/](https://khizooology.com/toolbox/bleed-safe-area-builder/) | Print guide; make supplier-specific assumptions clear when sharing examples. |
| [/toolbox/retry-storm-simulator/](https://khizooology.com/toolbox/retry-storm-simulator/) | Retry amplification; test comprehension of the recovery comparison. |
| [/toolbox/rate-limit-playground/](https://khizooology.com/toolbox/rate-limit-playground/) | Traffic policy comparison; inspect whether visitors use result copy/share. |
| [/toolbox/timeout-chain-planner/](https://khizooology.com/toolbox/timeout-chain-planner/) | Deadline budgeting; test the explanation with a representative serial workflow. |
| [/toolbox/queue-capacity-planner/](https://khizooology.com/toolbox/queue-capacity-planner/) | Backlog/drain planning; review assumptions against users' questions. |
| [/toolbox/circuit-breaker-playground/](https://khizooology.com/toolbox/circuit-breaker-playground/) | Failure isolation; assess whether recovery phases are understandable. |
| [/toolbox/connection-pool-simulator/](https://khizooology.com/toolbox/connection-pool-simulator/) | Pool pressure; compare pool/database-budget misconceptions in feedback. |
| [/toolbox/fan-out-latency-simulator/](https://khizooology.com/toolbox/fan-out-latency-simulator/) | Tail latency; validate critical-path comprehension and actual query demand. |

Earn legitimate discovery by sharing useful examples in relevant communities, with permission and context. Compare impressions/query intent with real completion/share/return signals. Avoid invented popularity, backlinks or traffic forecasts.

## Verification and external actions

Current build, Astro (zero errors/warnings; eight existing hints), SEO, Value, prelaunch, domain, search/privacy, analytics tests and diff checks pass. Generated URLs are reconciled with sitemap/canonicals/internal links. All 324 direct local HTML requests returned 200; 318 indexable routes are valid. Representative production canonicals/headers and host redirects were inspected separately. Current lab results are recorded below; a lab report is not field Core Web Vitals or ranking evidence.

Owner actions: Search Console URL Inspection and coverage for priority URLs; Rich Results Test for ProfilePage/BreadcrumbList; field Core Web Vitals report; Bing URL Inspection/sitemap and AI Performance (citations/grounding queries, not guessed authority). Do not resubmit every unchanged URL. The current public GA4 tag still fails the existing Enhanced Measurement gate (automatic modules present; user-provided data disabled). Review that configuration before enabling the newly built growth events; no Admin settings were changed. Production retains previous deployed code until a separately approved release.

## Current mobile lab measurements

| Page | FCP ms | LCP ms | TBT ms | CLS | TTFB ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| home | 1349 | 1699 | 5 | 0.00007 | 113 |
| toolbox | 2178 | 2775 | 150 | 0.00000 | 13 |
| tool | 2140 | 2978 | 24 | 0.00007 | 6 |
| artworks | 1772 | 2951 | 79 | 0.00000 | 13 |
| atlas | 1651 | 5776 | 9012 | 0.00008 | 6 |
| cube | 1746 | 2665 | 0 | 0.00000 | 7 |
| note | 1234 | 1672 | 0 | 0.00007 | 5 |
| portfolio | 1450 | 2114 | 14 | 0.00007 | 7 |

**Finding: Human Atlas is a performance priority, not a clean CWV pass.** The embedded 3D viewer produced about 9 seconds of lab TBT and 5.8 seconds LCP in this run. Long tasks are attributed to the upstream viewer bundle. Optimize its source/rendering workload in a focused viewer task; do not edit generated vendor code or hide useful content to game a score. Other measured pages had low CLS; some lab LCP values exceed the good-field target, which does not establish their field classification. There is no matched baseline to claim a measured regression.

Lighthouse is already installed; no dependency added. Eight single runs use the local production preview with default simulated mobile throttling, no accepted analytics consent. Record FCP/LCP/CLS/TBT and navigation TTFB; INP needs real interaction/field measurement. An individual lab run is not a population estimate or proof of regression against an unmatched historical environment.
