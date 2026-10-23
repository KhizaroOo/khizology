# AI discovery baseline

Date: 2026-10-23. Technical readiness receipt, not evidence of AI citations or new visitors. No deployment, submissions, manufactured visits or AI-answer prompting performed.

## Inventory and access

| Measurement | Local production build | Current production |
| --- | ---: | ---: |
| Canonical indexable HTML / sitemap URLs | 551 | 545 |
| Unique canonical sitemap URLs | 551 | 545 |
| Generated HTML in SEO audit scope | 557 | Not enumerated beyond live sitemap |
| Intentional noindex HTML | 5 | Not recounted outside sitemap |
| Compatibility redirects | 1 | Not recounted outside sitemap |
| Image entries / image-page entries | 170 / 1 | 170 / 1 |
| llms.txt bytes | 138725 | 137388 |
| Sitemap HTTP/canonical/index/schema-JSON failures | 0 | 0 across 545 URLs |

Astro reports 556 built pages. The existing SEO audit counts 557 HTML documents including the separately copied embedded viewer; search/Value walk all 558 including the root Yandex verification document that SEO deliberately excludes. These are different document scopes, not additional sitemap URLs. Use the SEO inventory for canonical page accounting. The mission's 540 count is stale: local content now includes 81 tools; production includes 75. Six unreleased tools (#76–81) explain the current local/live delta. This mission adds zero routes.

Noindex: `/404.html`, `/future-monsters/`, `/infooo/human-atlas-viewer/`, `/notes/`, `/you-ask-i-answer/`. Compatibility redirect: `/frop-a-vibe/`. None are canonical sitemap entries. Image entries must not be added to HTML counts.

Production receipt: 2026-10-23 12:20:45 UTC. All 545 production sitemap URLs returned HTTP 200 directly, self canonical, no meta/X-Robots noindex, meaningful static page structure, and parseable JSON-LD where present. No 403/429, authentication redirect or CAPTCHA challenge was observed. Existing local audits additionally check schema requirements, internal discovery, duplicate titles, descriptions, canonicals, alt and orphan routes.

Ten representative routes were also requested with seven additional agents (70 probes): Googlebot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User. All passed. Bingbot was used across the full live sitemap. Routes: homepage, Toolooo hub, Retry Storm, API Payload Doctor, Queue Capacity, Human Atlas, Infooo hub, Artooo, Notooo and portfolio. Spoofed UAs do not prove official crawler-IP accessibility or actual platform retrieval.

Live robots currently allows all crawlers. Local build additionally disallows GPTBot and ClaudeBot; see [owner crawler policy](AI-CRAWLER-POLICY.md). Release is separate. Google-Extended intentionally remains allowed, including its covered training permission.

Read-only IndexNow dry run validates 551 local canonical candidates; nothing submitted. The production sitemap and llms resource return 200. IndexNow is notification infrastructure, not proof of indexing or citations.

## Content and entities

Reviewed rendered static HTML and canonical knowledge/SEO metadata. All eight surfaces have descriptive identity, purpose and useful non-JS context. The interactive output remains browser-dependent; the explanation of what it does does not.

| Surface | Extractable knowledge / audience / example | Boundary and discovery |
| --- | --- | --- |
| Retry Storm | Backend retry amplification; compare immediate retries, backoff and jitter under the same outage | Simplified explanatory model, not a production load test; rate-limit/circuit-breaker next steps |
| API Payload Doctor | Integration diagnosis, JSON structure and expected-vs-actual contract changes; missing versus null example | Structural checks do not call an API or prove server behavior; related contract/schema tools |
| Queue Capacity | Worker/backlog planning; 100 arrivals versus 80 completions means growth of 20/second under constant rates | Simplified model, not a forecast; connection capacity and admission-control pathways |
| Timeout Chain | Serial deadline planning with retries, cancellation and remaining budget | Expected work and configured exposure are distinct; latency/retry/SLA pathways |
| Perspective Grid | Drawing practice using horizon and vanishing points; preview and downloadable guides | Construction reference, not proof of drawing correctness; print preparation links |
| Bleed & Safe Area | Print trim, bleed and safe inset; keep essential text inside the safe region | Printer specifications and tolerances still govern; related print/drawing tools |
| Human Atlas | Search/isolate/layer/explode anatomical structures; connected systems | BodyParts3D adult male reference limitations, source/license attribution and explicit non-diagnostic boundary |
| Artooo | Original artwork gallery with named works, meaningful tags and viewable art | Creator attribution and content-based discovery; no scientific/clinical claims imposed on artwork |

Existing What/Why/How, scenarios, result interpretation and limitations provide useful standalone context. No new filler or FAQs were justified. Technical Toolooo explanations remain distinct from artistic presentation. External citations matter for anatomy/source-dependent claims; simulator outputs are explanations of their stated local models, not independently validated forecasts.

Entity source remains `src/data/site.ts` plus centralized SEO helpers: Khizooology WebSite identity, Khizar Imtiaz / khizooo Person identity, stable portfolio `#person` and site `#website`, existing published social profile URLs, and four canonical monster modules. Portfolio mainEntity uses the shared Person reference. No invented entities, credentials or sameAs profiles added. Existing schema audit passes; this is not a promise of rich results.

`llms.txt` is generated from canonical registries: metadata links, not duplicated full note bodies or private state. It covers 551 public canonical URLs in about 139 KB locally. Its size reflects the 450-note catalog; no parallel hand-maintained inventory was introduced. It remains optional.

## Measurement: observed versus unknown

| Platform | Measurement surface | Current account evidence |
| --- | --- | --- |
| ChatGPT | GA4 session source/referral `chatgpt.com`, where browser supplies it; manual search citations | Fresh AI referrals/citations NOT OBSERVED in this mission |
| Claude | GA4 `claude.ai`; manual Claude Web Search results | NOT OBSERVED |
| Gemini / Google AI | Search Console generative-AI reporting where exposed to property; normal GSC supporting evidence; GA4 `gemini.google.com` where supplied | Property report not inspected; NOT OBSERVED |
| Copilot | Bing Webmaster AI Performance: citations, cited URLs and grounding queries; topics/intents/share only if actually available; GA4 `copilot.microsoft.com` | Fresh AI Performance metrics NOT OBSERVED |
| Perplexity | GA4 `perplexity.ai`; manual answer/citation checks | NOT OBSERVED |

Google's [June 2026 announcement, updated August 31](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports) documents worldwide rollout of generative-AI reporting; this does not establish what this account currently displays. [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) is the official Copilot/Bing AI reporting surface. Citations are not clicks or unique visitors; sampled grounding queries are not exhaustive traffic. Do not infer zero from unavailable account data.

Historical owner evidence is retained in [measurement baseline](SEARCH-MEASUREMENT-BASELINE.md), not re-dated: GA4 September 18–October 17 had 41 sessions, 40 Direct, 1 Unassigned, zero reported Organic/Referral. Earlier referral suppression prevents treating this as proof of no external users. GSC evidence was approximately 73 impressions/1 click; Bing search evidence was zero impressions/clicks despite indexing. These are not current AI-specific counts. External audience remains unconfirmed by this mission.

Existing analytics already recognizes all five AI referral hosts. It sends only an allowlisted origin, removing path/query/hash and credentials; unknown/private hosts are excluded. New tests cover each AI host with a private prompt sentinel. Consent, canonical page location, single events, advertising restrictions and browser-only processing are unchanged. Referrer loss in apps, copied links or browser policy is unavoidable; do not fingerprint to fill gaps.

## Repeatable manual discovery test

Run each natural query once per platform in a fresh conversation with search enabled. Record date, product/model/mode, exact query, answer/source URLs and screenshot or exported evidence. Do not supply Khizooology links or repeatedly tune prompts until a mention appears. Distinguish link presence, textual mention and cited support. Allowed outcomes: NOT FOUND, LINK FOUND, MENTIONED, CITED, TOP/PRIMARY SOURCE. NOT TESTED means no test occurred, not absence.

| Natural query | ChatGPT Search | Claude Web Search | Gemini | Copilot | Perplexity |
| --- | --- | --- | --- | --- | --- |
| How can retries amplify backend traffic during an outage? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Is there an interactive retry storm simulator? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| How can I calculate whether workers can drain a message queue? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| How can I debug a malformed JSON API payload locally? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| What is the difference between a missing JSON field and null? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| How should I divide a timeout budget across downstream services? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Why can one slow dependency control a parallel request? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Is there a browser-only perspective grid maker for drawing? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| How do bleed and safe areas work when printing artwork? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Is there an interactive human anatomy atlas in the browser? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| How can I compare backoff and jitter visually? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Where can I explore original drawings by Khizar Imtiaz? | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

## Trust and owner follow-up

Continue the [Backlink Authority Plan](BACKLINK-AUTHORITY-PLAN.md) and [tracker](BACKLINK-TRACKER.md): contextual independent references, useful public examples and consistent creator identity. The sprint recorded zero newly earned qualified independent domains, not zero lifetime backlinks. Crawlability cannot substitute for genuine authority.

Owner actions: approve/deploy separately; then verify live training restrictions. Inspect GA4 source/session reports and GSC/Bing AI reporting with real account data. Perform the above manual answer tests where product UI access is available. No account metrics or citations are claimed as verified here.

Local reproducible gates: `npm run audit:publish` (build, SEO, prelaunch, domain, Astro, Value), `node scripts/audit-search.mjs`, `node scripts/test-analytics.mjs`, `npm run indexnow:check`, `git diff --check`. Existing SEO `--inventory` output and temporary live HTTP receipts are under ignored `.performance/`; they are QA artifacts, not another committed audit framework.

