# Mission 5 — code preparation scorecard

Validated locally 2026-09-07. Account setup was confirmed by the owner; the Google tag's public configuration was also checked after Enhanced Measurement and user-provided-data capabilities were disabled. Deployment and live validation remain pending.

| Check | Result / evidence |
|---|---|
| Google Search Console property | VERIFIED — owner confirmed |
| Google sitemap | SUBMITTED — owner confirmed |
| Google image sitemap | SUBMITTED — owner confirmed |
| Priority URL Inspection | 0 confirmed submitted; 13 canonical URLs prepared |
| Bing Webmaster Tools | CONNECTED / VERIFIED — owner confirmed |
| Bing sitemap | WAITING for import/submission evidence |
| IndexNow key | PASS locally: valid 32-character random hex key, exact UTF-8 file; live hosting pending |
| IndexNow initial submission | WAITING; URLs submitted: 0; dry-run candidates: 52 |
| GA4 property | CONFIGURED — G-6PNF4YPRPP centrally set as repository variable |
| GA4 measurement | Google tag privacy configuration PASS; deployment, network validation and human Realtime evidence pending |
| Analytics consent | PASS locally: unknown, decline, acceptance, withdrawal, persistence and preference reopening |
| Analytics privacy | PASS local source review and mocked transport; live request inspection pending |
| Private tool data to analytics | 0 occurrences in tested mock payloads; live inspection pending deployment |
| Privacy page | PASS: title, description, H1, canonical, breadcrumb schema, footer link, sitemap |
| Build | PASS with and without the Measurement ID; 56 HTML pages |
| Types | PASS: `npm exec --yes --package=typescript --call "tsc --noEmit"` |
| SEO audit | PASS: 52 unique indexable URLs, 168 images |
| Prelaunch audit | PASS: 40 tools, 5 families, 2,119 links, 772 asset references |
| Domain audit | PASS: apex/root base, 0 former paths/hosts and mixed-content resource references |
| Search build audit | PASS: no server-rendered Google script, privacy controls, canonical IndexNow candidates |
| Mobile | PASS local consent/privacy page at 320, 375, 390, 768 and 1440 px, light and dark |
| Accessibility | PASS scoped checks: named banner region, semantic buttons, keyboard Enter/Tab, visible 3px focus, equal choices, no cookie wall |
| Git diff check | PASS |

## Evidence and limits

The consent test fixture executes the actual TypeScript helper in an isolated DOM with a mocked Google queue and a test-only ID. It never fetches Google's script and does not insert a fake ID into a production build. It checks unknown/declined no-op behavior, missing-ID acceptance, single tag/page_view, trusted tool interaction once per page, artwork/export/contact metadata allowlists, stripped page query/referrer, disabled advertising configuration, withdrawal and reload, network-script failure, and unavailable storage. These tests establish local behavior, not real GA delivery.

In the local browser, unknown consent showed the banner with no Google tag. Keyboard decline hid it; preferences reopened with focus on Accept; Tab reached Decline with a visible outline. Decline persisted on reload. A Schema Drift Doctor preset changed successfully and an Artooo artwork modal opened with consent declined; no Google script appeared.

Across both themes and all five widths, the privacy page had no horizontal overflow and both consent buttons had matching widths and approximately 47px height. Dark desktop and light mobile screenshots were visually inspected. This is a scoped accessibility check, not a comprehensive assistive-technology certification.

`npm run audit:search` combines the build, existing SEO/prelaunch/domain checks, the search artifact audit and isolated analytics tests. `npm run indexnow:check` validates the payload without sending it. The first build integration exposed an audit expectation missing the site's canonical trailing slash; that expectation and the priority URL document now use the actual canonical format.

The owner confirmed Search Console verification, both Google sitemap submissions, Bing connection, and GA4 property creation. The GitHub Actions variable `GA_MEASUREMENT_ID` is set to the supplied measurement ID. The public tag configuration reports no Enhanced Measurement modules and no user-provided-data capabilities. New Privacy, consent and IndexNow features are still local until deployment. The complete post-deployment checks are in SEARCH-ANALYTICS-SETUP.md. Google/Bing indexing metrics remain Pending.

**🟢 CODE READY — DEPLOYMENT AND LIVE VALIDATION NEXT**
