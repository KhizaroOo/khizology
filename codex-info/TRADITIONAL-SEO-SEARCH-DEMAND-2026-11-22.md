# #12 — Traditional SEO & Search Demand Capture

Evidence date: **2026-11-22, Asia/Karachi**. **Completion gate met — ready for review.** This completes the current baseline and demand-analysis task, not ongoing SEO growth or an indexing guarantee.

## BASE / SCOPE

`main`, `origin/main`, local/remote `dev-dev` were verified at `12db6a2a864a857bb54ad6f0c15df9034f6a3a71` after fetching origin. Work: `khizology-dev`, `dev-dev`; starting tree clean. The [November 20 technical audit](TRADITIONAL-SEO-2026-11-20.md) and subsequent deployment remain the completed technical baseline. They were not repeated.

No website code/content changed. The current data does not justify metadata churn, another technical audit, a new page, a model change or performance tuning. Only this report and the separate [sanitized evidence JSON](TRADITIONAL-SEO-SEARCH-DEMAND-2026-11-22-EVIDENCE.json) changed locally. No commit, push, main update, deployment, indexing request or external promotion in this continuation.

## ACCESS / EVIDENCE QUALITY

The initial access blockers were resolved through Khizar completing Google sign-in in the in-app browser. Both Google Search Console and Bing Webmaster Tools were then read directly. GSC Wizard still requires a subscription; Windsor exposes only Bing and its on-request refresh is plan-limited. These connector limits **no longer block the mission** because authenticated browser reports provided fresh evidence.

Two Google CSV ZIPs downloaded through Search Console: 90-day Web context and the exact 28-day comparison. Their CSV tables and SHA-256 hashes are preserved in evidence JSON; source ZIPs remain in Downloads. No credentials, authentication links, cookies or raw profile-URL identity queries retained. Image, indexing, health and Bing evidence came from rendered account reports; Image/Bing download attempts did not yield retained export files, so they are not represented as successful downloads. October local exports were recognized as historical and not substituted for current reports.

## GOOGLE BASELINE

Search type: **Web (text-based)**, domain property `sc-domain:khizooology.com`, no query/page/device filter. Latest complete report day: **November 19**. UI reported updated about four hours earlier. November 20–22 excluded.

| Window | Dates inclusive | Clicks | Impressions | CTR, UI | Average position, UI |
|---|---|---:|---:|---:|---:|
| A, latest complete 28 days | Oct 23–Nov 19, 2026 | 3 | 171 | 1.8% | 30.7 |
| B, preceding 28 days | Sep 25–Oct 22, 2026 | 1 | 81 | 1.2% | 9.2 |
| Requested 90-day context | Aug 22–Nov 19, 2026 | 4 | 269 | 1.5% | 22.7 |

The 90-day chart/export begins September 5; no earlier property history returned. No extrapolation into the unavailable start of the requested window. Official chart clicks/impressions independently reconcile to the totals above. Position/CTR are the official aggregate display, not averages of query rows.

Impressions increased by 90 and clicks by two between A/B. With only three current clicks and retired-content exposure, this is **not proof of active-product SEO success**. Average position moved from 9.2 to 30.7 while the query mix changed; it does not prove every page lost rankings.

Devices A/B: mobile 3/0 clicks and 57/24 impressions; desktop 0/1 clicks and 111/57 impressions; tablet 0/0 clicks and 3/0 impressions. Context: mobile 3 clicks/90 impressions; desktop 1/176; tablet 0/3. Countries and empty search-appearance tables are retained in the exports. Context top country by impressions: US 101; Pakistan accounts for three of four context clicks, France one. These are search clicks, not verified customers or distinct external visitors.

### Image Search, separate from Web

Authenticated UI explicitly selected Image Search. A: **0 clicks, 0 impressions**; B: **0 clicks, 3 impressions**, average position 51.7; context: **0 clicks, 5 impressions**, position 36.4. No current position exists with zero impressions; UI's zero placeholder is not position zero. B page rows: Artooo two impressions, position 70; homepage one, position 15. This sample does not justify artwork-page expansion, image renaming or keyword changes.

## GOOGLE NON-BRANDED

Method: explicit case-insensitive site/person/module identity matches are branded (`artooo`, `infooo`, `khizarooo.github.io` in returned rows). `ooology` remains **ambiguous**: potentially a brand variant or unrelated terminology. Topic/problem queries are non-branded, but retired/book-related intent is separated from demand for current products. Do not classify unseen query rows.

| Returned-query classification | A impressions | B impressions |
|---|---:|---:|
| Branded | 26 | 15 |
| Ambiguous `ooology` | 5 | 8 |
| Non-branded, including retired/unrelated intent | 53 | 1 |
| All returned query rows | 84 | 24 |

These are visible query-row counts, **not site traffic totals or complete brand share**. The property totals are 171/81; 87/57 impressions are not represented by these returned query rows. All visible query rows have zero clicks, while official totals have 3/1 clicks; those clicks cannot be attributed to brand/non-brand from this export.

Of A's 53 visible non-branded impressions, **11 have verified current-product query/page pairs** (JWT 5, agent labs 3, caching 3). **32 have a verified retired Notooo destination** (`manufactured emotions`). The remaining ten impressions span low-volume tool, book and ambiguous intents without a complete pair drill-down. Do not market the 53 as 53 current-product impressions.

## GOOGLE QUERY/PAGE

Actually opened each query filter, then Pages, in the authenticated comparison report:

| Query | Actual landing page | A clicks / impressions | CTR | Position, displayed | B impressions | Assessment |
|---|---|---:|---:|---:|---:|---|
| jwt unix timestamp | `/toolbox/jwt-time-machine/` | 0 / 5 | 0% | 42.2 | 0 | Correct timing-inspection tool; small emerging signal |
| agent system labs | `/infooo/agent-systems-lab/` | 0 / 3 | 0% | 6.7 | 0 | Correct existing collection; too small for CTR diagnosis |
| prompt caching calculator | `/toolbox/prompt-cache-efficiency-simulator/` | 0 / 3 | 0% | 93.3 | 0 | Relevant simulator; weak position and very small sample |
| manufactured emotions | `/notooo/how-emotions-are-made/` | 0 / 32 | 0% | 73.9 | 0 | Retired book content; not a current-product opportunity |

The first three selected query reports each showed one page. No competing-page claim established for those terms. This is sampled pair evidence, not a complete cannibalization audit. Export queries also include book/person terms, latency simulator (2), lag generator online (1), webmcp vs mcp (1). They remain HOLD pending adequate sample and destination evidence; no guessed pairing or keyword volume.

Retired Notooo pages account for 90 impressions and one click **within returned page rows** in A, including `apple-in-china`. Page aggregation can differ from property aggregation; do not divide these page-row totals by 171 to claim a precise traffic share. Notooo stays retired: no revival, unrelated redirect or new book page.

### Priority-page rows

A Web comparison export, exact canonical URLs. “Not returned” means absent from the exported page rows, **not proof of zero searches or not indexed**. Slashless variants are separate rows and are not silently merged.

| Page | A clicks | A impressions | A position |
|---|---:|---:|---:|
| `/` | 1 | 13 | 5.69 |
| `/toolbox/` | 0 | 1 | 3 |
| `/toolbox/retry-storm-simulator/` | 0 | 2 | 5 |
| `/toolbox/bleed-safe-area-builder/` | Not returned | Not returned | Unknown |
| `/toolbox/api-payload-doctor/` | Not returned | Not returned | Unknown |
| `/toolbox/queue-capacity-planner/` | 0 | 1 | 4 |
| `/toolbox/rate-limit-playground/` | Not returned | Not returned | Unknown |
| `/toolbox/timeout-chain-planner/` | Not returned | Not returned | Unknown |
| `/toolbox/perspective-grid-maker/` | Not returned | Not returned | Unknown |
| `/infooo/` | 0 | 2 | 2 |
| `/infooo/human-atlas/` | Not returned | Not returned | Unknown |
| `/infooo/agent-systems-lab/` | 0 | 15 | 4.93 |
| `/artworks/` | 0 | 22 | 6.27 |
| `/my-portfolio/` | 0 | 14 | 5.93 |

## GOOGLE INDEXATION

All-known-pages report updated **November 16**: **401 indexed, 75 not indexed**, five reasons. This property history includes retired pages and variants; 401 is not today's canonical inventory and must not be compared directly with the current 131-page sitemap.

| Reason | Count | Evidence / interpretation |
|---|---:|---|
| Page with redirect | 14 | Sample includes HTTP/www and slashless paths; intentional canonical redirects. Validation attempt started Oct 14, failed Oct 24; failed validation does not make an intended redirect a bug. |
| Not found (404) | 37 | First ten examples are retired Notooo paths; do not restore or redirect to unrelated pages. |
| Crawled - currently not indexed | 2 | Multi-Format Campaign Planner and Environment Drift Detector; individually inspected below. |
| Excluded by noindex | 5 | Consistent with known intentional utility/error exclusions; no blanket indexing override. |
| Discovered - currently not indexed | 17 | Includes Human Atlas and 16 tools; complete visible list retained below. |

Nine URL Inspections, read-only Google Index records:

| Canonical route | Inspection verdict | Last crawl, as displayed |
|---|---|---|
| `/` | Indexed | Nov 16, 2026, 2:29:28 AM |
| `/toolbox/` | Indexed | Nov 21, 2026, 10:01:54 PM |
| `/toolbox/jwt-time-machine/` | Indexed | Nov 16, 2026, 4:21:24 PM |
| `/toolbox/retry-storm-simulator/` | Indexed | Oct 24, 2026, 5:26:26 AM |
| `/infooo/human-atlas/` | Unknown to Google | Unavailable |
| `/artworks/` | Indexed | Nov 15, 2026, 4:42:20 AM |
| `/infooo/agent-systems-lab/` | Indexed | Oct 31, 2026, 4:44:47 AM |
| `/toolbox/environment-drift-detector/` | Crawled - currently not indexed | Sep 9, 2026, 12:38:16 PM |
| `/toolbox/multi-format-campaign-planner/` | Crawled - currently not indexed | Nov 16, 2026, 5:24:39 PM |

For all eight inspected URLs with crawl records, fetch successful, crawl allowed Yes, indexing allowed Yes, declared canonical matches the inspected canonical, and selected canonical is “Inspected URL”. Human Atlas has no crawl/canonical/permission values available. The Page Indexing report lists Atlas as discovered; URL Inspection says unknown to Google. Preserve both surfaces' dates/verdicts rather than inventing agreement.

Some indexed inspections show “Temporary processing error” under the **discovery/sitemap association field**, while the sitemap report itself is Success. This does not establish a broken sitemap. Two crawled-not-indexed pages have self-canonicals and successful permitted fetches; Google's selection remains an engine decision, not proof of a site defect. Their current live titles/descriptions/H1/canonicals still match their distinct jobs; prior audit confirmed useful static content and discovery links.

All 17 discovered report examples (last crawl N/A):

- `/infooo/human-atlas/`
- `/toolbox/accessibility-remediation-planner/`
- `/toolbox/async-messaging-decision-lab/`
- `/toolbox/cloud-cost-guardrail-builder/`
- `/toolbox/date-time-contract-doctor/`
- `/toolbox/drawing-grid-maker/`
- `/toolbox/llm-eval-case-builder/`
- `/toolbox/llm-output-assurance-decision-lab/`
- `/toolbox/monolith-vs-microservices-lab/`
- `/toolbox/network-failure-ux-simulator/`
- `/toolbox/rest-vs-graphql-decision-lab/`
- `/toolbox/slo-incident-burn-simulator/`
- `/toolbox/ux-research-study-planner/`
- `/toolbox/value-study-maker/`
- `/toolbox/web-performance-budget-planner/`
- `/toolbox/web-rendering-strategy-decision-lab/`
- `/toolbox/zero-downtime-schema-change-planner/`

No live test or “Request indexing” action used. Targeted live HTTP read of Atlas returns 200, self-canonical and index/follow; the current sitemap and native hub links already expose it. No additional generic links or speculative copy changes justified. Atlas and the two crawled-not-indexed tools are **indexation observation priorities**, not declared fixed/indexed.

### Sitemap / crawl freshness

Google page sitemap index: Success, last read **Nov 21**, 131 discovered pages. Image sitemap: Success, last read **Nov 17**, one discovered **page** (the gallery, not an artwork-image count). Toolooo hub inspection last crawl Nov 21 provides actual recent rediscovery evidence. Retry's recorded crawl remains Oct 24; do not claim all recent semantic fixes have been recrawled. No fabricated lastmod or blind resubmission.

## GOOGLE CWV / ACCOUNT HEALTH

Manual Actions: **No issues detected**. Security Issues: **No issues detected**. CWV updated **Nov 20**: **not enough usage data in the last 90 days**, both mobile and desktop. No affected groups or p75 LCP/INP/CLS available; no field-performance pass/fail or performance fix justified. This is resolved account access with insufficient usage, not an access blocker.

## BING BASELINE

Authenticated browser November 22, **3 M: Aug 22–Nov 21**, Web and Chat filter: **0 clicks / 8 impressions / 0% CTR / position 3.8**. Chart data spans Sep 7–Nov 20; do not assume Nov 21 is settled. UI notes query/page/device/country detail is **Web only**. The All filter also showed 0/8; do not relabel the combined headline as Web-only traffic.

Windsor's daily, weekly query and page data matched eight impressions but were cached Nov 20. Refresh denied by plan. Fresh browser reports supersede the earlier “Bing unavailable” concern; the low numbers are now observed account values, not inferred from missing connector rows. No current 28-day Bing comparison exported, so none is fabricated.

Bing observed non-branded terms: distributed systems tax (2 impressions, position 2), its typo variant (1/2), capacity cliff (1/1), collision drawable roadmap (1/5), value study practice generator (1/8). Two profile-URL identity queries contribute two branded/person-navigation impressions; raw URLs redacted. This is low-sample observed query demand, not product validation.

## BING QUERY/PAGE

Connector cannot join Queries and Weekly Pages. **Browser can**: opened `distributed systems tax` → Served pages. Actual canonical destination `/toolbox/distributed-systems-tax/`: **0 clicks, 2 impressions, 0% CTR, position 2.00**. Served-pages grid contains one actual URL row; a “Served pages 2” summary label is not evidence of two canonical pages. This resolves the query/page access gap for the sampled Bing intent without inventing joins.

Other page aggregates: Distributed Systems Tax 3 impressions/position 2; Value Study Maker 1/8; Capacity Cliff 1/1; Roadmap Collision 1/5; portfolio 2/5. These historical page-row exposures do not prove current index inclusion.

## BING INDEXATION / CRAWL / HEALTH

Crawl & Indexing 3 M: **606 crawl requests, 55 crawl errors, indexed-pages metric 95**. These are account metrics, not a count of current sitemap URLs. Site Explorer root-folder snapshot reports 55 URLs: 49 indexed, zero errors, two warnings, four excluded. Different surfaces/windows/scopes are not reconciled into a fabricated current canonical-indexed total.

Site Explorer guidelines filter exposes the **slashless portfolio**, excluded, last crawled Nov 9 with recorded HTTP 200. “Other issues” filter has no data. Canonical portfolio inspection below also is not indexed, but Bing only supplies a generic guidelines message, not an actionable specific content violation. The two-warning aggregate is not declared resolved or automatically P1. Do not rewrite a verified portfolio merely to satisfy an unspecified engine warning.

| Bing inspected route | Current verdict | Crawl / permission evidence |
|---|---|---|
| `/` | Indexed successfully | Last attempted Oct 27 22:11; crawl/index allowed; fetch successful |
| `/toolbox/jwt-time-machine/` | Indexed successfully | Nov 1 17:30; crawl/index allowed; fetch successful |
| `/infooo/human-atlas/` | Indexed successfully | Oct 25 00:57; crawl/index allowed; fetch successful |
| `/my-portfolio/` | Discovered but not crawled | Discovered Oct 7; generic guidelines message, no specific cause/crawl result |

Bing canonical fields show `--` on the successful samples; no invented engine-selected canonical. Atlas also shows inconsistent SEO/markup-processing availability text, so indexed verdict is reported without claiming processing completed.

Sitemaps: page index Success, last crawl **Nov 20**, 131 discovered URLs; image sitemap Success, **Nov 19**, one discovered page. Latest visible Site Scan v9: 100 pages, zero errors/warnings, **26 days ago**; a historical scan, not a fresh 131-page release audit. IndexNow history: 570 submissions on **Oct 24**, zero in last seven hours. Historical submissions are neither current inventory nor indexing proof. Visible table date used; chart's ARIA label incorrectly says January 2022. No IndexNow submission performed.

## GOOGLE VS BING

- Home and JWT tool indexed in both sampled records.
- Human Atlas: Bing indexed; Google discovered/unknown with no crawl. Highest-value cross-engine indexation follow-up, not proof its content is broken.
- JWT timing, agent labs and caching have current Google query signals absent from returned Bing query rows. Distributed-systems tax, capacity cliff and value-study signals appear in Bing but not the returned Google query rows. Absence is not proof no impressions ever existed.
- Bing portfolio currently discovered/not crawled despite historical Bing impressions; Google's page export shows portfolio exposure. Historical exposure and current index status are distinct.
- No forced agreement, guessed ranking volumes or claim all sitemap pages must be indexed.

## SEARCH DEMAND MAP / OPPORTUNITIES

Metrics use A for Google and Bing's reported 3 M window. “Actual pair” is explicitly verified; other destinations are not silently treated as observed.

| Query / intent | Engine | Page | Clicks | Impressions | CTR | Position | Type | Action |
|---|---|---|---:|---:|---:|---:|---|---|
| jwt unix timestamp | Google | Actual: JWT Time Machine | 0 | 5 | 0% | 42.2 | EMERGING QUERY, small | Observe another complete 28 days; refine terminology only if sustained relevant demand supports it |
| agent system labs | Google | Actual: Agent Systems Lab | 0 | 3 | 0% | 6.7 | HOLD | Correct destination; sample too small for CTR rewrite |
| prompt caching calculator | Google | Actual: Prompt Cache Efficiency Simulator | 0 | 3 | 0% | 93.3 | HOLD | Calculator intent broadly fits simulator; no guarantee, no arbitrary title rewrite |
| manufactured emotions | Google | Actual: retired Notooo book | 0 | 32 | 0% | 73.9 | HOLD / retired | Preserve retirement; do not count as active-product success |
| latency simulator | Google | Not inspected | 0 | 2 | 0% | 67 | HOLD | Establish page pairing and sustained relevance first |
| distributed systems tax | Bing | Actual: Distributed Systems Tax | 0 | 2 | 0% | 2 | HOLD | Correct canonical; two impressions cannot establish CTR failure |
| capacity cliff | Bing | Intended Capacity Cliff; pair not inspected | 0 | 1 | 0% | 1 | HOLD | Wait; no padding or snippet churn |
| value study practice generator | Bing | Intended Value Study; pair not inspected | 0 | 1 | 0% | 8 | HOLD | Monitor Google's discovered status and future query evidence |

No verified QUICK WIN, CTR OPPORTUNITY, POSITION OPPORTUNITY, CONTENT GAP, WRONG LANDING PAGE or cannibalization defect at current sample size. “Emerging” means observed in A but not returned in B, not market volume or validated conversion demand. All single-digit signals remain low confidence.

## FIXES / NEXT IMPROVEMENTS

**Zero website/content fixes necessary on current evidence.** Reviewed live metadata/H1/purpose for JWT, caching, Agent Systems Lab and both crawled-not-indexed tools. Existing labels accurately describe each job; canonical links are correct. No supported intent mismatch or insufficient discovery found that justifies a code change.

Evidence-backed priorities, in order:

1. Monitor Google discovery/crawl for Human Atlas and the two fetched-but-not-indexed tools; existing canonical sitemap/internal links are already present. Check future recrawl outcomes before a content experiment.
2. Monitor Bing canonical portfolio processing and the specific Site Explorer warning when Bing exposes clearer detail; no invented guideline violation or generic quality rewrite.
3. Reassess JWT's five-impression emerging query after the next complete window; preserve its locally processed/signature-not-verified limitation.
4. Watch agent-lab and caching pairs; only prioritize wording/examples if repeated intent evidence grows beyond a few impressions.
5. Keep book queries and identity navigation separate from active-product non-branded growth.

No indexing submissions performed, including the previously prepared 16-route IndexNow list. This was evidence collection, not a blind recrawl campaign. No thin pages, unrelated links, revived Notooo, fake lastmod, AI visibility experiments or distribution work.

## VERIFIED

- Git status/branch/remote baseline; preserved completed production changes and other worktrees.
- Authenticated Google Web totals, exact A/B/90-day windows and downloaded CSVs; totals reconciled against daily chart rows.
- All returned queries/pages/devices/countries/search appearance tables analyzed; visible-row vs official-total distinction preserved.
- Four Google query/page drill-downs; nine Google URL Inspections; indexing reasons/examples including all 17 discovered entries; sitemap, CWV, manual/security reports.
- Authenticated Bing performance, one actual query/page drill-down, four URL Inspections, crawl/index metrics, Site Explorer filters, sitemap, prior Site Scan and IndexNow history.
- Targeted live HTTP reads: Atlas 200/self-canonical/index-follow; five reviewed metadata pages fetched successfully with expected title/description/H1/canonical.
- Evidence JSON/export hashes, links, dates, totals, redactions, exact changed-file scope and `git diff --check` verified before handoff.
- No runtime content/code change: no rebuild, browser layout regression or technical full audit rerun solely for documentation. Previous build/release checks remain historical evidence, not falsely claimed new runs.

## UNAVAILABLE DATA / LIMITS

- Google field CWV requires more real-user usage; neither device has enough data. No lab substitution.
- Hidden Google query attribution; all four context clicks absent from visible query rows. Full brand/conversion attribution cannot be established.
- No complete browser Bing 28-day comparison/device/country export retained. Baseline uses the actual displayed 3 M window; positions and dates preserve its granularity.
- Bing's exact portfolio exclusion reason and inconsistent processing/ARIA labels not explained by the product. No inferred fix or guarantee.
- Sample inspections do not classify all 131 current canonicals. No claim that 401 Google or 95 Bing equals the current canonical count.
- Future crawl/index selection, recrawl freshness and larger demand samples require engines/time/usage. No remaining search-account access blocker or justified unimplemented site fix found.

## COMPLETION / CHANGED

#12's defined gate is met: current Google and Bing baselines obtained; non-branded intent and actual pairs reviewed; indexation maturity assessed; opportunities ranked; fixes explicitly unnecessary; source/metadata verified; next changes conditional on observed evidence; no new verified P0/P1 site-controlled SEO defect. **This is not a claim that all URLs are indexed or traffic is strong.**

Changed files: this report and `TRADITIONAL-SEO-SEARCH-DEMAND-2026-11-22-EVIDENCE.json`. Local uncommitted documentation on `dev-dev`; production stays `12db6a2`. No commit SHA for this continuation, no push/deploy. Old November 20 report remains historical and is not rewritten.

## FINAL

**#12 TRADITIONAL SEO & SEARCH DEMAND CAPTURE — READY FOR KHIZAR REVIEW**
