# AI crawler policy

Reviewed: 2026-11-23. Owner policy: maximize legitimate AI search/retrieval/citation visibility while limiting training access where platforms provide independent controls.

Canonical implementation: `src/pages/robots.txt.ts`. Search and retrieval inherit `User-agent: * / Allow: /`. Only GPTBot and ClaudeBot receive separate root disallows. Google-Extended intentionally inherits allow; no redundant allow groups are necessary. Both canonical sitemap declarations remain intact. `scripts/audit-seo.mjs` guards this exact grouping against accidental broad blocks.

| Crawler | Company | Purpose | Allowed? | Reason | Last verified | Official source |
| --- | --- | --- | --- | --- | --- | --- |
| Googlebot | Google | Search crawling | Yes | Search discovery | 2026-11-23 | [Google crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |
| Bingbot | Microsoft | Search crawling | Yes | Bing/Copilot discovery foundation | 2026-11-23 | [Bingbot](https://www.bing.com/webmasters/help/how-to-report-an-issue-with-bingbot-25c19802) |
| OAI-SearchBot | OpenAI | Search | Yes | ChatGPT search eligibility | 2026-11-23 | [OpenAI bots](https://developers.openai.com/api/docs/bots) |
| ChatGPT-User | OpenAI | User-directed retrieval | Yes | No intentional retrieval block | 2026-11-23 | [OpenAI bots](https://developers.openai.com/api/docs/bots) |
| GPTBot | OpenAI | Potential model training | No | Independent training restriction | 2026-11-23 | [OpenAI bots](https://developers.openai.com/api/docs/bots) |
| Claude-SearchBot | Anthropic | Search | Yes | Search discoverability | 2026-11-23 | [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Claude-User | Anthropic | User-directed retrieval | Yes | Public content retrieval | 2026-11-23 | [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Claude-Agent | Anthropic | Hosted browser acting on a user’s behalf | Yes | No intentional user-directed browser block; distinct from training | 2026-11-23 | [Anthropic hosted browsers](https://support.claude.com/en/articles/18234133-how-do-anthropic-hosted-browsers-identify-themselves-when-they-browse-the-web-on-a-user-s-behalf) |
| ClaudeBot | Anthropic | Potential model training | No | Independent training restriction | 2026-11-23 | [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Google-Extended | Google | Covered Gemini grounding and future training | Yes, intentionally | Owner accepts combined permission for maximum Gemini discovery | 2026-11-23 | [Google product tokens](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |
| PerplexityBot | Perplexity | Search discovery, not foundation-model training | Yes | Search visibility | 2026-11-23 | [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) |
| Perplexity-User | Perplexity | User-directed retrieval | Yes | Public content retrieval | 2026-11-23 | [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) |

## Boundaries

OpenAI search access is independent of GPTBot training permission. Anthropic likewise documents separate search, user retrieval and training crawlers. User-directed fetchers do not necessarily follow robots like autonomous crawlers: OpenAI says robots may not apply to ChatGPT-User; Perplexity says its user fetcher generally ignores robots.

**Google-Extended is the explicit exception:** allowing it permits covered Gemini grounding and future model-training uses under Google's current policy. It is a robots product token, not a separate HTTP crawler identity. Its permission does not control normal Google Search inclusion or ranking. This tradeoff is owner-approved, not an accidental wildcard omission.

Robots directives are cooperative crawler instructions, not authentication, deletion of previously collected material, or proof of compliance. Public access never authorizes publication of browser-local tool inputs. No private inputs, uploads, tokens, saved browser state or user prompts belong in discovery files or analytics.

Crawl access and valid structured data do not guarantee indexing, retrieval, ranking or citation. No special AI schema or hidden instructions are required. `llms.txt` remains optional generated discovery documentation, not an official eligibility requirement or a replacement for robots, sitemaps and canonicals.

## Live verification — 2026-11-23

Production now serves the two explicit training restrictions above. All 131 canonical pages passed normal-UA HTTP checks; 20 priority routes also passed Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot and PerplexityBot probes (231 successful requests total). These are local-connection UA probes, not requests from verified provider IPs. Every row above was checked against live robots; only the five named crawlers received additional HTTP probes.

Anthropic also documents `Claude-Agent` for its hosted, user-directed browser. Wildcard allow intentionally does not block it; it is distinct from ClaudeBot training. [Official browser identification](https://support.claude.com/en/articles/18234133-how-do-anthropic-hosted-browsers-identify-themselves-when-they-browse-the-web-on-a-user-s-behalf).

Google Search Console currently shows **Search generative AI: Include** for this property. That account control is separate from Google-Extended. Anthropic’s newer AI-preference support and Google’s announced future training-control work do not require replacing the current explicit restrictions with draft directives.

See the [current visibility receipt](../codex-info/AI-SEARCH-VISIBILITY-2026-11-23.md) for account windows, manual tests and limits. No crawler policy or production deployment was changed by this review.

UA probes test this connection using representative strings; they do not establish access from official crawler IPs. If a future WAF blocks verified crawlers, use official IP verification rather than trusting the user-agent alone.
