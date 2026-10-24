# Search and measurement baseline

## Phase 0: Product Clarity Reset

**Status: COMPLETE — final closure, 2026-10-18 (Asia/Karachi).** This supersedes the earlier incomplete Phase 0 attempt. The latest owner-provided production exports/Admin observations are accepted as the missing evidence; they are not relabelled as connector reads. GSC Wizard account reads remain subscription-blocked and Windsor's earlier empty Bing query pulls are not the search baseline. No broad audit repeated. No account setting, owner filter, IP handling, advertising feature, Google Signals, commit, push or deployment changed.

### GA4 production baseline — 2026-09-18 through 2026-10-17

This is an inclusive **30-day** window, not a seven- or 28-day baseline. Property reporting timezone was not supplied; preserve the original report timezone on future exports. Measurement stream: G-6PNF4YPRPP. The owner supplied evidence for Khizooology; no numeric property ID is invented.

| Metric | Verified owner evidence |
|---|---:|
| Sessions | 41 |
| Engaged sessions | 29 |
| Engagement rate | approximately 70.7% |
| Direct sessions | 40 |
| Unassigned sessions | 1 |
| Reported Organic Search sessions | 0 |
| Reported Referral sessions | 0 |
| Key Events | 0 |

Active/total/new user totals, device/geography breakdowns, average engagement time and comparison-period metrics were not supplied. `first_visit = 8` must not be presented as a verified total-user count. Acquisition zeros describe reports under the old suppression behavior, not proof that no search/referral visits happened.

| Received event | Count | Users supplied |
|---|---:|---:|
| page_view | 146 | — |
| user_engagement | 82 | — |
| session_start | 40 | — |
| artwork_view | 20 | — |
| scroll | 14 | — |
| contact_click | 13 | 4 |
| result_shared | 13 | 4 |
| infooo_world_start | 8 | 3 |
| module_discovery | 5 | 2 |
| tool_start | 4 | 2 |
| share_action | 2 | 1 |
| first_visit | 8 | — |

These are actual received-event observations supplied by the owner, not a complete inferred event inventory. Missing rows (e.g. result_generated/export/guide_complete) are not asserted to be zero without the export. Historical `scroll` is not proof that Enhanced Measurement is currently on: the public configuration gate remains off. 41 sessions versus 40 session_start, or 146 page views, does not itself establish duplication.

| Landing path as reported | Sessions |
|---|---:|
| / | 21 |
| /notooo | 7 |
| /infooo | 6 |
| /artworks | 2 |
| /notooo/atomic-habits | 2 |
| /toolbox | 1 |
| /toolbox/api-pagination-planner | 1 |

Provided landing rows sum to **40 of 41** sessions; the remaining landing value is unspecified. Do not invent a row or assume it is the Unassigned session. Slashless report dimension labels are preserved as evidence; canonical public routes retain trailing slashes.

### Attribution: ISSUE → FIXED in code, release pending

Previously every event/configuration forced `page_referrer: ''`. The shared helper now reads browser referrer only when analytics is allowed, recognizes an explicit set of known public search/referral hosts, and sends only their scheme/hostname root. Referrer paths, query/hash, credentials, port, unknown/private hosts and identifiable subdomains are omitted. Exact host matching prevents lookalikes. Same-site referrers remain blank. Canonical page_location is unchanged and arbitrary campaign/user URL state remains excluded.

This restores truthful Google/Bing and other allowlisted source signals without forwarding raw browser referrers. Unknown origins still report no referrer by deliberate privacy policy; no claim of exhaustive referral or campaign attribution. There is no fingerprinting, owner/IP exclusion or new storage/backend. Consent remains default denied → analytics-only granted; all advertising consent remains denied. No new Google tag/analytics architecture.

The fix is locally implemented and verified, **not deployed by this mission**. Historical attribution cannot be repaired retrospectively. Record the separately approved release date as a measurement boundary: post-fix Organic/Referral growth may reflect corrected attribution, not UX uplift. Phase 0 does not wait for new traffic, but UX comparisons must not attribute a measurement-definition change to design.

### Event integrity: independently verified

Equal contact_click/result_shared totals (13 each / 4 users each) do not establish event aliasing. Actual shared ShareResultFoundation callbacks and delegated analytics listeners were tested together: result share adds exactly one result_shared and no contact_click; a contact link adds exactly one contact_click without increasing result_shared. The Value audit’s former literal blank-referrer requirement was replaced with the existing behavioral analytics/privacy suite, including sanitization and no-cross-fire assertions; privacy is verified rather than bypassed. Repeated initialization adds no listeners/events; repeated consent acceptance adds no tag/page view. Cancelled/failed sharing emits no successful share; clipboard fallback is result_copied, not result_shared. Other actions may deliberately have different semantic events (e.g. tool_start plus a completed output), not two copies of the same event.

The isolated browser harness uses actual analytics/share source and real trusted button/link clicks, with Google transport and native sharing mocked; its test-only localhost bypass is confined to an ignored fixture. It shows declined → zero loader attempts/events; accepted twice → one loader/page_view; share once → one result_shared; contact once → one contact_click, no cross-firing. No fixture was deployed or sent test data to GA4. Existing tests separately preserve production localhost suppression and private-input exclusions. This is browser implementation verification, not a claim of new production receipt or deployment.

### Key Events: configuration requirement documented

Latest Admin evidence supersedes prior owner statements: only irrelevant **purchase** is marked, with no stream data. Thus the received contact/share events did not qualify as configured Key Events; the reported zero is not evidence they never fired. Khizar will mark **contact_click** and **result_shared**, and remove purchase if applicable. No fake events or Admin settings created by code. Marking applies prospectively; historical zero remains valid. Future candidates **result_generated**, **tool_export**, **infooo_guide_complete** require demonstrated useful production behavior before promotion. page_view/tool_start and every navigation are not Key Events.

### Google Search Console — WATCH, not technical failure

| Current owner report | Count |
|---|---:|
| Indexed | 97 |
| Not indexed | 237 |
| Discovered — currently not indexed | 222 |
| Page with redirect | 8 |
| Excluded by noindex | 5 |
| Crawled — currently not indexed | 2 |

Reasons reconcile: 222 + 8 + 5 + 2 = 237. The 222 discovered and 2 crawled URLs are **WATCH**; no broad rewrite, forced indexing, pruning or title change follows from that count. Eight normalization redirects and five intentional noindex exclusions are **EXPECTED** under the previously verified canonical/lifecycle policy. No newly supplied evidence establishes an actionable technical error. Reopen a specific URL only if a reproducible canonical/noindex/response defect appears.

| Sitemap | Account status | Discovered | Last read |
|---|---|---:|---|
| sitemap-index.xml | Success | 318 | 2026-10-12 |
| image-sitemap.xml | Success | 1 | 2026-10-07 |

Image sitemap discovered=1 is the reported page URL, not proof that the 170 image entries disappeared; normal sitemap has 318 public canonical URLs. Property performance: approximately **73 impressions, 1 click**, with discovery across countries. The performance window was not supplied and must not be silently equated to GA4's 30 days. A Google click establishes search discovery activity, not a confirmed external person or correctly attributed GA session. Index totals include historical/alternate known URLs and need not equal sitemap inventory. Earlier insufficient field-CWV observation remains not a new measured field result.

### Bing — DISCOVERY/INDEXING PRESENT, SEARCH TRAFFIC = 0

Owner search-performance export: **0 clicks / 0 impressions** (export date window not supplied). Two known sitemaps, **0 errors / 0 warnings**, **319 discovered URLs**. Site Explorer showed **29 indexed / 1 excluded in the displayed indexed-URL view**; do not promote that filtered view into a proven entire-site inventory or invent the exclusion reason. Sitemap discovered URLs are not an indexed count and need not match Google's inventory one-for-one.

AI Performance exists in the owner UI; no citation values were supplied. It is optional for this Product Clarity Reset and no longer blocks Phase 0. No AI citation count is inferred from zero ordinary search impressions.

### Audience and post-UX metrics

**External audience: NOT YET CONFIRMED.** Search impressions/click and geographic discovery do not identify visitors. Khizar's own multi-browser/device usage remains included; no owner filtering/fingerprinting. Do not infer identities from the 4 event users or 8 first_visit events.

Lock the following measurement definitions through the UX reset: acquisition = per-engine clicks/impressions plus GA session source/medium/channel and public landing path; activation = sessions with tool_start / relevant consented tool sessions and per-world Infooo starts; value = meaningful output/export/guide completion counts and sessions; depth = module_discovery/try_next_click; creator/share = contact_click/result_shared. Session rates use sessions with an event, not raw event_count divided by sessions as a unique-user conversion rate. Infooo deployment mounts versus coding-run starts have different existing semantics; segment by world and annotate coverage rather than claim an aggregate activation improvement.

Use the supplied 30-day GA baseline and equal post-release windows; retain report timezones/filters and account export dates. The GSC/Bing evidence windows need recording for quantitative comparisons, but that is not a measurement-code blocker. Do not mix 7/28/30-day totals or promise significance with this sample size. Do not present fixed acquisition attribution as organic-audience growth. No need to wait weeks to close Phase 0.

### Final completion gate

Production baseline documented; attribution repaired; contact/share cross-fire and duplicate tests passed; privacy/consent preserved; owner Key Event configuration responsibility documented; **no remaining measurement-code blocker**. Phase 0's final closure criteria explicitly supersede the earlier gate that required live connector reads and completed Admin configuration before proceeding. Historical incomplete investigation notes are replaced by this owner-evidence snapshot; September setup history remains below.

Verification: production build; public GA configuration gate; audit:search; audit:publish (SEO/prelaunch/domain/Value/Astro); analytics/privacy tests; isolated browser interaction checks; git diff --check. No commit/push/deployment. Release of the attribution repair and Khizar's Key Event toggles remain explicit follow-through, not hidden completed actions.

---

## Historical Mission 5 preparation (not the Phase 0 numeric baseline)

Prepared: 2026-09-07. Domain: https://khizooology.com/. This is the local Mission 5 preparation baseline; the deployment date is Pending.

| Item | Baseline |
|---|---|
| Generated HTML | 56 locally; production Mission 4 baseline 55 |
| Indexable pages | 52 locally; production Mission 4 baseline 51 |
| Active tools / families | 40 / 5 |
| Artworks / image sitemap entries | 168 / 168 |
| Normal sitemap | https://khizooology.com/sitemap-index.xml |
| Image sitemap | https://khizooology.com/image-sitemap.xml |
| Search Console | VERIFIED — owner confirmed 2026-09-07 |
| Google sitemap / image sitemap | SUBMITTED — owner confirmed both; processing/indexing evidence Pending |
| Priority URL requests | 0 confirmed; 13 prepared |
| Bing site / sitemap | CONNECTED / VERIFIED — owner confirmed; sitemap import status Pending |
| IndexNow key | Hosted and validated live |
| IndexNow initial submission | Submitted 2026-09-07: 52 canonical URLs; HTTP 202 received / key validation pending; indexing Pending |
| GA4 property / ID | CREATED — owner confirmed; G-6PNF4YPRPP configured as GitHub repository variable |
| GA4 live measurement / Realtime | Consent gating and tag load verified live; Realtime Pending human confirmation |

## Observations to fill with real evidence

For each review, record the observation date, date range, source account/property and evidence link or screenshot. Pending is unknown, not zero.

| Source | Metric | Observation |
|---|---|---|
| Google Search Console | Impressions | Pending |
| Google Search Console | Clicks | Pending |
| Google Search Console | CTR | Pending |
| Google Search Console | Average position | Pending |
| Google Search Console | Indexed pages | Pending |
| Google Search Console | Queries | Pending |
| Google Search Console | Landing pages / pages | Pending |
| Google Search Console | Countries | Pending |
| Google Search Console | Devices | Pending |
| Bing Webmaster Tools | Impressions | Pending |
| Bing Webmaster Tools | Clicks | Pending |
| Bing Webmaster Tools | Indexed pages | Pending |
| GA4 | Users | Pending |
| GA4 | Sessions | Pending |
| GA4 | Top landing pages | Pending |
| GA4 | Top Toolooo pages | Pending |
| GA4 | Top Artooo interactions | Pending |

## First 30 days

Day 0 starts after deployment and verified setup, not this document's creation date.

| Review | Actions | Evidence |
|---|---|---|
| Day 0 | Search Console and Bing connected; both sitemaps submitted; IndexNow submitted 52 URLs (202); consented tag load checked. Request priority URLs and verify GA Realtime. | In progress |
| Day 3 | Inspect crawl and indexing status. Early ranking changes are not a conclusion. | Pending |
| Day 7 | Review first queries/impressions, indexing errors and top landing pages. | Pending |
| Day 14 | Find tools gaining impressions and pages with impressions but low CTR; review the queries behind them. | Pending |
| Day 30 | Establish an observed baseline, identify useful tools attracting visitors and choose improvements or next builds. | Pending |

Watch impressions, clicks, CTR, position and indexed pages together. Compare queries, pages, countries and devices; do not optimize average position alone. Consent-based GA4 omits visitors who decline or block analytics, so its totals need not match search or hosting data.

Known, submitted, discovered, crawled, indexed and ranking are separate states. Only Search Console evidence supports Google indexing claims. An IndexNow 200/202 is a receipt, not indexing evidence. No traffic, ranking or revenue outcomes are promised.

Use Search Console, Bing and GA4 as the initial sources of truth. Build → get discovered → observe → improve useful winners → build smarter. No custom dashboard is needed.


## Phase 4 release / Phase 5 observation — 2026-10-18

Product release commit: `8935f282529f58cb4c86da7cdc3e6be4ac5fa0b2`. First production deployment succeeded **2026-10-18 16:03:24 UTC / 21:03:24 Asia/Karachi**, production head `4be8ad91ef9556183e835149eb44418e6f6f548e` (baseline commit); [Astro Pages run 39143032487](https://github.com/KhizaroOo/khizology/actions/runs/39143032487). Final production verification: 15 HTTP-200/self-canonical routes; all ten tool core interactions at 390px; 12 advanced journey cases completed; no console-breaking errors; declined consent loads zero GA scripts, accepted/repeated acceptance loads exactly one. Freeze is active. This post-deployment receipt is a local documentation update, not another product deployment. The separate Bing image-alt repair is excluded and remains uncommitted.

Observation: **2026-10-19 through 2026-11-01**, 14 full Asia/Karachi calendar days; review **2026-11-02**. Day 7 health check: **2026-10-25**, health only. Freeze begins with successful deployment: no Infooo/Top-10 redesign, new tools/worlds, speculative SEO changes, event/Key Event changes from small-sample noise. Exceptions: critical, security/privacy, broken route/asset or measurement-integrity repairs, logged below. Owner consenting usage remains included; no IP/owner exclusion.

### Pre-observation evidence and availability

GA4: latest available owner evidence remains **2026-09-18 → 2026-10-17**, documented above: 41 sessions, 29 engaged sessions, ~70.7% engagement, 40 Direct / 1 Unassigned, 146 page views. Users and source/medium detail unavailable in supplied evidence. Landing sessions: / 21; /notooo 7; /infooo 6; /artworks 2; /notooo/atomic-habits 2; /toolbox 1; /toolbox/api-pagination-planner 1 (one landing unspecified). tool_start 4; result_shared 13; infooo_world_start 8; contact_click 13. result_generated, tool_export, try_next_click and infooo_guide_complete unavailable, not assumed zero. Fresh GA4 connector access is unavailable: Windsor lists only Bing. No settings changed.

GSC: latest owner evidence: ~73 impressions / 1 click, approximately 1.37% CTR (rounded impressions); average position/top queries/top pages not supplied. 97 indexed / 237 not indexed (222 discovered-not-indexed, 8 redirects, 5 noindex, 2 crawled-not-indexed). Sitemap success, 318 discovered normal / 1 image-sitemap discovery. Fresh 2026-10-18 GSC Wizard read refused: subscription_required. Preserve the evidence date/window limits; do not call these newly fetched totals.

Bing: Windsor query on 2026-10-18 for **2026-10-04 → 2026-10-17** returned **no rows**, not a proven zero total. Latest owner evidence remains 0 clicks / 0 impressions (window unspecified), displayed Site Explorer 29 indexed / 1 excluded; 319 discovered URLs, 2 known sitemaps without errors/warnings. No fresh indexed inventory API available.

Fresh pre-window GA4/GSC exports remain an evidence gap; collection/observation can proceed without inventing them. Retrieve matching historical windows later if access is restored. Compare equal periods with matching report timezone/filters; exclude or annotate deployment/testing on Oct 18. Do not infer causality or external audience from tiny samples.

### Review metrics

Users/sessions/engaged sessions/engagement and source-medium/channel/landing pages; tool_start, result_generated, tool_export, result_shared, try_next_click, infooo_world_start, infooo_guide_complete, contact_click (preserve existing per-world semantics). GSC clicks/impressions/CTR/position/queries/pages/indexing; Bing clicks/impressions/indexing/discovery/sitemap health. Day 7 checks receipt/runtime/crawl health only. Day 14 assesses friction cautiously; if external traffic is insufficient, proceed to acquisition rather than redesigning from noise.

### Production intervention log

None after deployment yet. Record timestamp, commit, reason and affected metrics for any allowed intervention.

## Toolooo 100 release receipt — 2026-10-24

Release commit: `4d19909600161eb96b61d60ce7736182bbd880e3` (`release: complete Toolooo 100`), pushed by Khizar through GitHub Desktop. Existing [GitHub Pages workflow 40101500160](https://github.com/KhizaroOo/khizology/actions/runs/40101500160) completed both build and deployment successfully; deployment completed **2026-10-24 14:14:56 UTC / 19:14:56 Asia/Karachi**. This release supersedes the earlier observation freeze for its explicitly approved scope. This post-deployment receipt remains a local documentation update, not a second product deployment.

Canonical inventory: **100 active tools** — Check 17, Simulate 25, Decide 16, Plan 16, Create 26. Final build: 577 HTML documents, 570 indexable canonical sitemap URLs; image sitemap separately contains 170 image entries on one gallery URL. Existing Notooo inventory remains 450 published notes.

Verification: final build, Astro (zero errors/warnings), SEO, Publish, Value, domain, search, privacy/analytics and GA configuration gates passed; all 70 regression suites passed, including the 242-group milestone check. Production checks passed for all 100 tool routes (HTTP 200, self canonical, expected titles/descriptions and social metadata), all 570 sitemap pages, and 70 search-agent probes. Robots, sitemap index, image sitemap and llms.txt returned 200; llms.txt includes all 100 tools. HTTP and www redirect to the HTTPS apex.

Production browser checks: hub count/search/combined family-tag filters; established and recent tools across all five families, including MCP security, API diagnosis, retry scenarios, x402 simulation, transport decisions, Passkey planning, Sandbox policy, MCP contracts, Tasks, Elicitation, OAuth/CIMD, UCP, commerce decisions, OpenAPI mapping, A2A cards, MCP App UI and SKILL.md. Representative generation, reset and copy actions passed; no console errors observed. Hub and commerce layouts passed 320/375/390px overflow checks and light/dark inspection; hub search touch target is 44px. Declined consent plus reload loaded zero GA scripts; acceptance and repeated acceptance loaded exactly one. Existing privacy tests passed with no raw-content leakage; this does not assert live GA property receipt or new audience measurements.

Search submission: existing IndexNow dry-run gate passed; existing submission script validated the hosted key, matching local/live sitemap and every submitted live canonical page, then received **HTTP 200 for 570 URLs**. Receipt is not evidence of indexing or ranking and does not submit to Google. No fresh GA4, GSC or Bing traffic/indexing baseline was fetched for this release; retain the historical evidence and its date limitations above.
