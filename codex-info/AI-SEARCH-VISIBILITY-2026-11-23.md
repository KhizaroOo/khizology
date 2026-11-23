# Mission #13 — AI search visibility & citation growth

Reviewed **2026-11-23, Asia/Karachi**. Source baseline: `329c5f04b3f9c39f55ba38ae5b503b24ba379e60`, confirmed local and remote `dev-dev`/`main` Git baseline. Production content was checked independently against the current inventory. Candidate changes are not deployed by this mission. No main merge, new service, paid subscription, outreach, hidden bot content or citation guarantee.

## Current inventory

Fresh canonical registries, production build and SEO inventory agree:

| Inventory | Count |
| --- | ---: |
| Astro-generated pages | 136 |
| HTML documents in SEO audit scope, including copied viewer | 137 |
| Indexable canonical pages / sitemap URLs | 131 |
| Active Toolooo details | 100 — LV2 88, LV3 12 |
| Toolooo hub and family pages | 6 |
| Public Infooo worlds | 17 |
| Infooo hub and Agent Systems Lab | 2 |
| Artooo gallery | 1 |
| Artwork entities / image sitemap entries | 170 |
| General indexable pages | 5 |
| Active / locked future monsters | 3 / 6 |
| Intentional noindex HTML / compatibility redirects | 5 / 1 |

Notooo remains retired; historical Google report rows are not current routes. Artwork fragments are entities in one gallery, not 170 thin HTML pages. No new route was created.

Complete coverage receipts: [131 pages](AI-SEARCH-VISIBILITY-2026-11-23-PAGES.csv), [100 tools](AI-SEARCH-VISIBILITY-2026-11-23-TOOLS.csv), [17 worlds](AI-SEARCH-VISIBILITY-2026-11-23-WORLDS.csv), [170 artworks](AI-SEARCH-VISIBILITY-2026-11-23-ARTWORKS.csv), [source classifications](AI-SEARCH-VISIBILITY-2026-11-23-SOURCES.csv), [24-query matrix](AI-SEARCH-VISIBILITY-2026-11-23-QUERIES.csv), [structured evidence](AI-SEARCH-VISIBILITY-2026-11-23-EVIDENCE.json). These are dated audit outputs from canonical sources, not a second runtime registry or permanent audit framework.

## Research

Current official guidance was reviewed before implementation; source-dependent factual checks followed during the audit.

- OpenAI separates OAI-SearchBot search from GPTBot training and ChatGPT-User user-directed fetching. Search access permits eligibility, not guaranteed inclusion; public crawler IP files support verification. User fetches do not necessarily follow crawler robots rules. [Bots](https://developers.openai.com/api/docs/bots), [publisher eligibility](https://help.openai.com/en/articles/12627856), [Search](https://help.openai.com/en/articles/9237897-chatgpt-search/).
- Anthropic separates Claude-SearchBot, Claude-User and ClaudeBot. Its updated guidance also discusses AI-training preferences; explicit bot rules remain relevant. Claude-Agent identifies hosted user-directed browsers, not the training crawler. [Crawler controls](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [hosted browsers](https://support.claude.com/en/articles/18234133-how-do-anthropic-hosted-browsers-identify-themselves-when-they-browse-the-web-on-a-user-s-behalf).
- Google’s normal search foundations remain applicable. AI Overviews and AI Mode are separate surfaces; Search Console also exposes a site-wide generative-AI inclusion control. Google-Extended covers specified Gemini grounding/training uses and does not govern Search ranking. The owner-approved combined permission remains intact. Dedicated generative-AI reporting rolled out in 2026; it must not be inferred from ordinary organic clicks. [AI features](https://developers.google.com/search/docs/appearance/ai-features), [sharing controls](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share), [crawler tokens](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers), [report rollout](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports).
- Google’s announced training-control work targets 2027; it is not a reason to invent a current directive. Preferred Sources is a separate publisher feature, not an AI-citation guarantee. [Training-control announcement](https://developers.google.com/search/blog/2026/10/ai-training-control), [Preferred Sources](https://developers.google.com/search/docs/appearance/preferred-sources).
- Bing AI Performance exposes citations, cited pages and sampled grounding queries. Intents, Topics and Citation Share describe reported citation activity; Citation Share is a per-query proportion, not traffic, authority or a rank. Topics Portfolio Beta may not appear for every property. [June reporting update](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/), [October Topics Portfolio](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/). Bing’s guidelines are a JavaScript application; existing #12 rendered guidance was reused rather than treating its empty HTTP shell as absent policy.
- Perplexity documents search crawling separately from user-requested fetches; neither described agent is a foundation-model training crawler. Its guidance provides verification IP lists and notes different user-fetch robots behavior. [Official crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).

No new special schema, draft crawler preference, fake FAQ, rewritten bulk summaries or AI-only page was justified. The [crawler-policy table](../docs/AI-CRAWLER-POLICY.md) records all 12 relevant agents/tokens and intentional permission boundaries.

## Crawler access

Production `robots.txt` serves wildcard allow with explicit root disallows for GPTBot and ClaudeBot, plus both sitemap declarations. Google-Extended intentionally remains allowed. Search Console Settings shows **Search generative AI: Include**; no setting was changed.

**231/231 live HTTP probes passed:** all 131 canonical pages with a normal browser UA, plus 20 priority routes each with Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot and PerplexityBot. Each returned 200 directly, self canonical, allowed indexing/robots and non-empty main text, without observed 403/429 or challenge. The evidence JSON preserves every route/agent result. These are UA spoof probes from this local connection; GitHub Pages server logs and verified provider-IP access were not available. A successful spoof probe is not proof of an actual crawler visit.

Live `llms.txt`: **27,642 bytes, 131 unique canonical public page URLs**, generated from canonical registries. It is optional discovery documentation, not a training permission, Google ranking mechanism or citation requirement. It contains public metadata, not private tool state. Existing audits protect it against omissions and retired/phantom routes.

## ChatGPT

OAI-SearchBot eligibility passed; GPTBot remains restricted independently. A fresh anonymous conversation with Web search enabled received query R1 once. The completed answer cited AWS/Google SRE and generated an interactive explanation; Khizooology was **NOT FOUND** in that answer. This is one test, not a claim about every ChatGPT user or index. Model version was not exposed. The evidence records public source URLs, not account history.

GA4 showed no identifiable `chatgpt.com` source row in the measured periods below. That is a referral observation, not a citation count.

## Claude

Claude-SearchBot probes and live robots eligibility passed; training remains restricted separately. The existing Google sign-in flow returned to the Claude login page. Owner sign-in was requested; no usable search conversation became available. Manual outcome: **NOT TESTED**, not NOT FOUND. No new account, subscription, CAPTCHA bypass or unsupported claim of Claude visibility was made. No identifiable `claude.ai` GA4 row was observed.

## Gemini

One signed-in Auto-mode query R1 completed with web citation controls and its own interactive backoff visualization. Khizooology was **NOT FOUND** in the displayed answer. Visible source examples were inspected through the source disclosure. The model version was not exposed. Google-Extended’s combined permission is intentional; it is not a Gemini indexing or citation guarantee. No identifiable `gemini.google.com` GA4 row was observed.

## Google AI Search

Both an actual **AI Overview** and **AI Mode** answer were observed for R1. Neither displayed a Khizooology mention/link/citation; both are **NOT FOUND** for that test. Organic web results were kept separate from AI answer citations.

Authenticated Search Console generative-AI Beta report, Web (text):

| Window | Reported total impressions |
| --- | ---: |
| Requested Aug 22–Nov 19, 2026; chart begins Sep 5 | 23 |
| Last-28-days preset: Oct 25–Nov 21, 2026 | 17 |
| Previous preset: Sep 27–Oct 24, 2026 | 7 |

Exact comparison dates came from the date-range dialog. The report’s chart accessibility date label was malformed, so it was not used as date evidence. Custom comparison validation also failed; the working preset was used and identified honestly, rather than reporting an invented 30-day comparison.

The 23-impression context report exposed 18 page rows: gallery 7, homepage 5, portfolio 3, contact and Agent Systems Lab 2 each, then smaller rows including MCP Security Lab and tools. All 18 are preserved in evidence. Page-level aggregation must not be summed to reconstruct the property total. The report also includes historical HTTP and retired Notooo URLs; they do not prove those routes are currently served or belong in the sitemap.

Clicks and search queries were **not exposed in this AI report**. Impressions are not a count of answer citations, clicks or unique visitors. The #12 traditional Web query data is supporting search-demand evidence, not a substitute for AI metrics.

## Copilot / Bing AI

Actual navigation redirected `copilot.microsoft.com` to **copilot.com**, which required sign-in. Microsoft documents that migration for personal use. Manual answer outcome: **NOT TESTED** pending owner authentication. [Microsoft support](https://support.microsoft.com/en-us/microsoft-365-copilot/troubleshoot-content-copilot-app), [current service domains](https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/termsofuse).

Authenticated Bing AI Performance, “Microsoft Copilots and Partners”:

| Report | Citations | Average cited pages |
| --- | ---: | ---: |
| 3 months requested Aug 23–Nov 22; data chart Sep 8–Nov 21 | 0 | 0 |
| 30 days requested Oct 24–Nov 22; chart Oct 24–Nov 21 | 0 | 0 |
| Compare current displayed labels Oct 24–Nov 21 | 0 | 0 |
| Compare previous displayed labels Sep 25–Oct 23 | 0 | 0 |

The comparison dialog requested Sep 24–Oct 23, but metric labels showed Sep 25 onward. Both are recorded; no missing day or row was fabricated. All displayed trend values were zero. Grounding Queries and Pages tables contained zero rows. Intent/Topic/Citation Share column headings exist, but **no values are available**; that is not a measured 0% Citation Share. Topics Portfolio was not exposed. Bing labels these data sampled and subject to refinement. Aggregated citations are not traffic and do not prove the outcome of an unrun Copilot prompt.

## Perplexity

Two independent fresh Search conversations used R1 and D1. Both completed; Khizooology was **NOT FOUND**. Visible sources included AWS for retries and print suppliers/design references for bleed. The second run automatically showed a free advanced-search preview; that mode detail is recorded rather than pretending the environment was identical. No model version was exposed. Platform-generated arithmetic was not treated as factual evidence for the site. PerplexityBot access passed; no identifiable `perplexity.ai` GA4 source row was observed.

## Citation and referral measurement

Authenticated GA4 Traffic acquisition, **Session source / medium**, all displayed source rows:

| Window | Total sessions | Source rows | Identifiable AI referral sessions |
| --- | ---: | --- | ---: |
| Oct 21–Nov 19, 2026 | 70 | Direct 58; not set 6; Google organic 6 | 0 |
| Sep 21–Oct 20, 2026 | 60 | Direct 57; not set 3 | 0 |

Zero here means no identifiable AI-source session in those observed report rows. Consent, app/browser referrer suppression and copied links limit attribution. Direct/not-set sessions must not be relabelled as AI; Google organic cannot isolate AI features. No inference about paid reviews, inquiries, revenue or unique external people was made. Citation and referral counts remain separate.

The GSC Wizard connector could not supply GA4 data; the authenticated native GA4 report provided the baseline instead. No connector subscription was purchased. Provider-side private configuration/processing and unobserved referrer loss remain outside this verification.

## Complete site review / extractability

All 131 indexable pages have static main content, creator reference, H1, canonical and useful internal discovery. Minimum observed main text was 232 words in the audited scope; word count was only a coverage diagnostic, not an arbitrary quality score. Interactive results require browser execution; their purpose and limitations do not.

**Toolooo:** Every one of the 100 tools has canonical What/Why/use/example/model-boundary data plus result interpretation and specific limitations in static HTML. The CSV preserves each tool’s actual text and destinations. The original contribution is a local calculation, input diagnosis, visual comparison, decision framework or export, not a claim to a newly discovered engineering law. Mathematical tools need assumptions; source-dependent protocol/security tools also expose supporting documentation where applicable. No generic bibliography or fake measured result was bolted onto every calculator. Existing shared knowledge/discovery regressions verify all 100 pages.

**Infooo:** All 17 worlds have static purpose, sources, model boundaries and limitations; 16 use canonical knowledge records and Atlas uses its dedicated text guide/attribution. Stable cube notation does not need a fabricated review date. World-specific output remains distinguished from measured research. Agent worlds explicitly bound idealized defenses, vendor experiments, non-universal adoption and incomplete logs. World 017 tracks sharing/exposure, not belief or intent. World 015 separates surface/air/storage and gives an upper-bound warning for its tree-cooling response. World 016 now explicitly identifies its older USDA data vintage rather than suggesting current estimates.

**Human Atlas deep review:** The seven-stop non-3D guide is static HTML, not trapped inside WebGL. Its sequence is consistent with the linked NIH blood-flow explanation. BodyParts3D is identified as an adult male reference, with required CC BY 4.0 attribution; upstream viewer MIT attribution remains separate. The page explicitly excludes diagnosis/treatment and says blood flow is explained, not measured or simulated. No clinical claim or credential was added. [NIH](https://www.nhlbi.nih.gov/health/heart/blood-flow), [dataset license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).

**Artooo:** 170 server-rendered cards, all canonical titles/tags, real local image files and 170 VisualArtwork entities were checked against the registry. Every schema creator points to the canonical Person. Available stories remain artist-supplied; modal interactions and related discovery do not justify separate thin artwork routes. No invented medium, date, inspiration or scientific authority was introduced.

**General:** Homepage identifies the three public families and creator. About/portfolio consistently connect the creator identity; portfolio’s employment/contributions remain personal claims with their existing evidence boundaries. Contact uses canonical direct channels. Privacy explains consented analytics and passive external resources. Hubs, families and Agent Systems Lab provide crawlable discovery, not an AI-only duplicate hierarchy.

## Entity consistency

| Entity | Canonical identity |
| --- | --- |
| Site | Khizooology — `https://khizooology.com/#website` |
| Creator | Khizar Imtiaz / khizooo — `https://khizooology.com/my-portfolio/#person` |
| Toolooo | `https://khizooology.com/toolbox/`, 100 registry tools and 5 families |
| Infooo | `https://khizooology.com/infooo/`, 17 canonical world records |
| Artooo | `https://khizooology.com/artworks/`, 170 `#art-…` entities |

Across indexable JSON-LD: 496 defined IDs, 114 unique reference-only IDs, **zero unresolved internal references**. WebSite, Person, ProfilePage, WebPage/CollectionPage, breadcrumbs, WebApplication, VisualArtwork, ImageObject and ItemList were inspected. Infooo also uses application schemas; their count is not an additional Toolooo inventory. Existing sameAs links agree with canonical creator data. The portfolio’s employer Organization is not recast as the site owner. External profile contents were not rewritten or treated as independent verification of employment. Valid schema is not a promise of rich results or AI citation.

## Source quality / factual boundaries

The source CSV classifies 84 world/source relationships. Official standards/vendor documentation and original institutional research are PRIMARY within their scope. Jaap’s puzzle material and academic synthesis are HIGH-QUALITY SECONDARY. Gartner commentary is secondary, not proof of universal adoption. The CRS mirror and AGRIS bibliographic record are SUPPORTING access paths, not the original institution or experiment. No known unsuitable source justified a wholesale replacement.

Prioritized fresh checks included MCP’s current security guidance, NIH blood flow, the dataset license, EPA heat-island distinctions and USDA. The current MCP link resolves to July 2026 documentation; existing agent limitations do not claim complete protection. Vendor announcements support what their vendors announced, not independent product efficacy.

**Actual freshness defect found:** USDA’s November 17 update revised prior years as well as releasing 2025 values. The model’s checked-in fixtures demonstrably preserve the March 10 release. The world now states that vintage in visible FACT/limitations/source labels and canonical knowledge; its numbers were not silently mixed with revised data. Original values were checked against preserved repository source-row fixtures and the generator; an independent archived March download was not recovered. This preserves a reproducible historical teaching model. A wholesale data refresh is HOLD, not a prerequisite for an honestly labelled historical example. [Current USDA findings](https://ers.usda.gov/data-products/food-dollar/summary-findings).

This was a proportional source/claim audit, not a fresh scientific replication of every paper or an independent security certification. PMC’s article fetch presented a browser challenge, so full-text access was not claimed. Model outcomes are not external scientific evidence.

## Opportunities / fixed / hold

| Classification | Evidence and decision |
| --- | --- |
| MEASUREMENT GAP — fixed P2 | Current Copilot domain was missing from the exact referral allowlist. Added `copilot.com`, preserving old host and consent gates. |
| SOURCE / CLARITY GAP — fixed P2 | USDA revised source data after the world’s review. Explicit historical-vintage wording now matches bundled fixtures. |
| CLARITY GAP — fixed P2 | Two worlds claimed nothing else leaves the page despite analytics metadata and passive badge resources. Replaced with bounded, truthful wording. |
| ACCESS / ENTITY / EXTRACTION blocker | None verified across the complete inventory; no justified P0/P1 remains in checked scope. Actual verified provider-IP crawling is unknown. |
| CITATION OPPORTUNITY | Google AI impressions demonstrate some exposure, particularly gallery/home/collection. No query-level AI evidence supports a specific page rewrite yet. |
| AUTHORITY GAP — handled by #11 | Existing authority ledger verifies zero newly earned qualified independent domains in its sprint. It does not prove authority is the cause of absent citations. No link buying or outreach here. |
| HOLD | One-answer absences, missing Claude/Copilot authentication, unrun matrix queries, unavailable Bing topic/share rows and future crawler standards do not justify speculative content changes. |

The neutral 24-query set spans seven reliability, four API, six agent, three design and four education questions. **Six answer checks were run**, across two query rows; unrun cells remain NOT TESTED. Google AI Overview and AI Mode are separately recorded in evidence even though the matrix combines their column. No brand/URL forcing, repeated tuning until a mention, fabricated citation score or claim of 144 completed tests.

## Verified

- `npm run build`: PASS; 136 pages, zero build errors. Existing approximately 504 KB Atlas renderer warning remains; this mission adds no renderer/dependency.
- `npm run verify:release`: PASS — Astro (515 files, zero errors/warnings, 14 existing hints), SEO, prelaunch, domain, search, Value, Atlas assets, contract drift, Retry/Rate models and UX, Atlas geometry, misinformation model/UI.
- `npm run audit:seo`, `npm run audit:search`, `npm run audit:publish`: PASS in final explicit runs; SEO reports 131 canonical pages and zero errors; search includes analytics regressions; publish includes domain, Astro and Value.
- `node scripts/test-analytics.mjs`: PASS — consent, safe referral origins, no private sentinels, exact new Copilot host, deceptive hosts/ports/credentials rejected, share/contact/earning lifecycle and accurate world privacy wording. Google transport is mocked; no real test event sent to production.
- `node --experimental-strip-types scripts/test-crawler-policy.mts`: PASS — policy presets, search/training separation, paths, conflicts, deterministic output and privacy.
- Food Prices model/UI: PASS (7,652 model checks); historical-data wording regression added. City Heat UI: PASS. No model math changed.
- Candidate browser: both changed worlds at 1440×900, 390×900 and 320×900 in light/dark, updated copy visible, no horizontal page overflow. Food slider ArrowRight changed 0 → 1. Emulation only; no physical-device or screen-reader-speech claim.
- Production/account/manual browser evidence is separate from the local candidate. No live analytics allowance change is claimed before release.
- Complete-page, artwork identity/file and schema-reference checks passed; `git diff --check`: PASS, including the final staged scope.

## Changed

Runtime/content: `src/utils/analytics.ts`, world-local `city-heat/HeatTruth.tsx` and `food-prices/FoodTruth.tsx`, and only World 016’s record in shared `src/data/infooo.ts`. No generic Infooo framework or model changes. Tests: `scripts/test-analytics.mjs`, `scripts/test-infooo-food-prices-ui.mjs`. Docs: the two existing AI policy/baseline documents plus this dated report and evidence CSV/JSON files.

The exact implementation commit SHA is supplied in the Git handoff; this report records its immutable source baseline rather than embedding its own impossible self-referential commit hash. Only dev-dev commit/push is authorized. Main and deployment remain separate.

## Data gaps / blockers

No unresolved repository blocker. Claude/Copilot answer checks need owner authentication. Other unrun query cells are a transparent sampling limit, not observed absence. Official crawler-IP logs, provider internals, missing referrers, complete paper texts behind access challenges and unexposed account metrics remain unknown. These limitations are not converted into defects, zeros or citation guarantees.

## Final

**#13 AI SEARCH VISIBILITY & CITATION GROWTH — READY FOR KHIZAR REVIEW**
