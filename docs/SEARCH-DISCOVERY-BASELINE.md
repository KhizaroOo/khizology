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
