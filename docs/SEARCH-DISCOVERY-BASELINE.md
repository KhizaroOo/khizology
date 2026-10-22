# Phase 0 — production verification baseline

Verified **2026-10-18 21:34 Asia/Karachi (16:34 UTC)** against deployed commit `86c55ba` and a fresh production-configured build. This receipt supersedes the earlier measurement baseline's statement that the Bing repair remained uncommitted. No product or analytics code changed during this verification.

## Google Search Console

Owner-provided URL Inspection evidence: **3/3 PASS** — homepage, `/my-portfolio/`, `/toolbox/ai-project-pricing-lab/`. All indexed, fetched successfully by Googlebot smartphone, crawl/indexing allowed, self-canonical and Google-selected inspected URL. These are owner account observations, not a fresh connector export.

Production sitemap index and child sitemap return HTTP 200, `application/xml`, valid XML and match generated output. **318 unique canonical URLs**, all indexable, fetched without redirects/errors. Image sitemap: one gallery URL containing **170 image entries**. Robots and llms.txt also return 200 and match the build. No unexpected exclusions, wrong hosts, HTTP canonicals or duplicates.

GSC's “Sitemaps: Temporary processing error”: **ACCOUNT/GOOGLE TEMPORARY STATE**, with no reproducible production sitemap defect. Recheck the owner UI; do not change valid sitemap code to address this message.

Pricing Lab slashless referring URL: **historical discovery data**. Source references use canonical slugs/normalizing route helpers; generated links, schemas, discovery files and live internal links emit no redirect-form references. Slashless URL correctly redirects once to its slash-terminated canonical.

## Bing deployed image-alt verification

Previous warning affected homepage, portfolio, Behind the Vibes, Notooo and Infooo. Deployed shared repair uses hidden CSS decoration for redundant decorative imagery and descriptive canonical alt text for meaningful images.

All **324 live HTML documents**, fetched with a Bingbot-style user agent, match generated SEO signals. **679 img elements**, zero missing, invalid or empty alt values. Existing audit additionally validates local decorative assets and hidden semantics. Rendered DOM checks passed on all five affected pages plus hydrated artwork gallery and opened artwork modal; modal image retains its artwork title. Source gallery normal/lazy/modal image paths retain alt. No responsive source path drops it.

No reproducible site-controlled SEO warning/error in the checks performed. A **fresh Bing Site Scan** is still required to replace historical account findings; its next result cannot be guaranteed from a local or production crawl.

## GA4 preservation

Public production tag `G-6PNF4YPRPP`: Enhanced Measurement modules absent, automatic user data OFF, user-provided capabilities OFF. Live browser: decline + reload = **0 GA tags**; accept = **1**; repeat acceptance = **1**.

Existing mock-transport analytics/privacy tests pass: single initialization/manual page_view, exactly-once intended events, independent contact/share events, safe attribution and no raw/private content leakage. This establishes application event behavior, not a packet capture of every production event. Owner confirms live `result_shared` and `contact_click` receipt. Advertising consent/privacy restrictions unchanged; no account settings changed.

## Current technical inventory

| Check | Result |
| --- | ---: |
| Generated HTML documents (includes error document) | 324 |
| Indexable / normal sitemap URLs / llms URLs | 318 / 318 / 318 |
| Intentional noindex documents, excluding compatibility redirect | 5 |
| Compatibility redirect documents | 1 |
| Broken internal page links / indexable orphans | 0 / 0 |
| Internal redirect links / sitemap redirects | 0 / 0 |
| Canonical errors / wrong-host / HTTP canonicals | 0 / 0 / 0 |
| Malformed structured data / missing descriptions / missing H1 | 0 / 0 / 0 |
| Missing / invalid / empty image alt | 0 / 0 / 0 |
| Duplicate titles / indexable titles >=70 characters | 0 / 0 |
| Production crawl findings | 0 |

All eight checked HTTP/www/slashless variants redirect once to HTTPS apex canonical. Compatibility redirect remains intentionally excluded. Unknown URL returns HTTP 404 with noindex. These counts describe deployed technical inventory, not search-engine indexed totals.

## Verification evidence

`npm run audit:publish` PASS (fresh build, SEO, prelaunch, domain, Astro and Value including knowledge/analytics/privacy). Astro: 287 files, 0 errors, 0 warnings, 8 existing hints. `npm run audit:ga-config`, image-alt fixtures and independent analytics tests PASS. `git diff --check` PASS.

Existing SEO production gate: `node scripts/audit-seo.mjs --production --production-report .performance/phase0-final-production.json --inventory .performance/phase0-final-inventory.json` PASS. Ignored evidence: `.performance/phase0-final-gates.log`, `phase0-final-production.log`, `phase0-final-xml.json`. Raw live HTML checks cover every generated route; rendered-DOM checks are representative, not an exhaustive browser interaction crawl.

Phase 0: **CLEAN BASELINE LOCKED**. Remaining owner UI actions: fresh Bing Site Scan and recheck GSC's temporary sitemap processing message. Existing discovered/crawled-not-indexed inventories remain observation items, not newly proven technical defects.

## Inventory reconciliation — 2026-10-23

The Phase 0 receipt above remains a historical snapshot of `86c55ba`, not a permanent page-count ceiling. Comparing its saved route inventory with a fresh build of current source `6733a6a` explains **all 222 additional canonical pages**. The intervening Backlink Authority Sprint changed only README/docs; it observed the expanded inventory and did not cause it.

| Canonical HTML category | Phase 0 | Current | Added | Removed |
|---|---:|---:|---:|---:|
| Notooo published details | 240 | 450 | 210 | 0 |
| Toolooo active details | 60 | 70 | 10 | 0 |
| Infooo world details | 4 | 6 | 2 | 0 |
| Existing hubs, tool-family pages and other canonical pages | 14 | 14 | 0 | 0 |
| **Indexable HTML / canonical sitemap URLs** | **318** | **540** | **222** | **0** |

Notooo additions are published entries **241–450**: expansion to 300 (`8ffccd2`), 330 (`542403c`), 390 (`b8dcb9a`) and 450 (`6733a6a`). The canonical registry and publishing audit confirm 450 published entries and zero drafts. Existing entries/slugs remain present.

Ten added Toolooo routes:

- `/toolbox/mcp-security-doctor/`
- `/toolbox/ai-agent-cost-loop-simulator/`
- `/toolbox/real-time-transport-decision-lab/`
- `/toolbox/ai-agent-permission-planner/`
- `/toolbox/mcp-tool-contract-builder/`
- `/toolbox/opentelemetry-trace-doctor/`
- `/toolbox/cache-stampede-simulator/`
- `/toolbox/workflow-agent-decision-lab/`
- `/toolbox/passkey-migration-planner/`
- `/toolbox/api-error-contract-builder/`

Two added Infooo routes: `/infooo/physical-ai-world/` and `/infooo/the-living-grid/`. No other canonical route category changed. These are existing implemented public products, not new pages created by this reconciliation.

### Counting boundaries

| Inventory type | Phase 0 | Current | Interpretation |
|---|---:|---:|---|
| Physical `.html` files in build | 324 | **547** | Includes the error document and the new ownership-verification service file. |
| Content HTML documents reported by SEO audit | 324 | **546** | Existing `generatedHtmlPages` field excludes recognized ownership-verification assets. |
| Indexable HTML routes | 318 | **540** | Exactly matches the canonical page sitemap and llms public URL set. |
| Intentional noindex content documents | 5 | **5** | Listed below; excludes the compatibility redirect. |
| Compatibility redirect documents | 1 | **1** | `/frop-a-vibe/`; outside the page sitemap. |
| Ownership-verification HTML service assets | 0 | **1** | `yandex_7e0cf9493bfbe950.html`, added in `fa3d155`; outside content/page sitemap counts. |
| Image sitemap `<url>` records | 1 | **1** | Existing gallery target; already represented in the canonical HTML set. Do not add it again. |
| Image sitemap `<image:image>` entries | 170 | **170** | Image resources, not 170 additional HTML pages. |
| Sitemap-index child-document references | 1 | **1** | `sitemap-0.xml`, a discovery resource, not an indexable HTML page. |
| Non-HTML resources in canonical page sitemap | 0 | **0** | Images and verification files are not included. |

Arithmetic: **547 = 540 indexable + 5 noindex + 1 redirect + 1 verification asset**. Content-only comparison: **546 − 324 = 222**. Raw-file comparison: **547 − 324 = 223**, with the additional one explained by Yandex ownership verification.

Noindex content routes remain `/404.html`, `/future-monsters/`, `/you-ask-i-answer/`, `/infooo/human-atlas-viewer/` and `/notes/`. The verification service file is neither a public content route nor an additional noindex content document; its exact provider challenge format is recognized by the existing audit.

Audit history shows only the narrow ownership-file exclusion changed after Phase 0. **Indexable/sitemap counting semantics did not change**; image entries were never part of 540. There are zero duplicate canonical URLs, zero added noindex/redirect/noncanonical sitemap entries, and zero removals. No sitemap generator, route, indexing policy or production code was changed to reconcile the totals.

### Reconciliation evidence

Fresh `npm run audit:publish` passed: build, SEO, prelaunch, domain, Astro (zero errors/warnings; 10 hints), Value, Notooo/Knowledge and existing mock-transport analytics/privacy tests. The build physically contains 547 HTML files; its SEO content inventory has 546 documents/540 indexable routes. Production sitemap index/child and image sitemap return HTTP 200; production page-URL set is identical to the fresh source build. No image resources or XML discovery documents are combined with canonical HTML counts.

Full production audit passed on the confirmation crawl: all **540 sitemap HTML URLs** return HTTP 200 without redirects, use HTTPS/apex/slash-terminated self-canonicals, allow indexing and are reachable from the production homepage link graph. Zero sitemap redirects, noindex pages, 404/5xx responses, canonical conflicts, duplicates or orphans remain in that crawl. All 546 content documents were fetched; robots, page/image sitemaps and llms match source output. Unknown-page 404/noindex behavior and eight intentional redirect variants also passed.

The first crawl encountered one GitHub Pages **503** at `/notooo/die-with-zero/`; an immediate targeted retry returned the correct 200/self-canonical document. A second complete production audit returned zero errors. This was a transient hosting response, not an invalid sitemap route or a reason to change content; retain it as a hosting observation rather than concealing the first result.

Ignored machine-readable evidence: `.performance/sitemap-reconcile-current.json`, `sitemap-reconcile-delta.json`, `sitemap-reconcile-production-xml.json`, `sitemap-reconcile-production.json` (initial crawl), `sitemap-reconcile-production-confirmed.json` (passing repeat), `sitemap-reconcile-final.json`, and `sitemap-reconcile-gates.log`. `git diff --check` passed. This documents technical route availability, not the number indexed by Google/Bing or proof of search traffic. No commit, push, deployment or production modification was performed.
