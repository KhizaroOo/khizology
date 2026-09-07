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
| IndexNow key | PASS locally and live: valid 32-character random hex key and exact public file |
| IndexNow initial submission | PASS: 52 canonical URLs received by IndexNow (HTTP 202; key validation pending, not indexing evidence) |
| GA4 property | CONFIGURED — G-6PNF4YPRPP centrally set as repository variable |
| GA4 measurement | Google tag privacy configuration PASS; deployment, network validation and human Realtime evidence pending |
| Analytics consent | PASS locally and live: unknown and decline load no Google tag; acceptance loads the configured tag |
| Analytics privacy | PASS source review, mocked transport, GA4 settings gate and live consent-gating check |
| Private tool data to analytics | 0 occurrences in tested mock payloads; live custom-event payload inspection is limited by browser instrumentation |
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

The owner confirmed Search Console verification, both Google sitemap submissions, Bing connection, and GA4 property creation. The GitHub Actions variable `GA_MEASUREMENT_ID` is set to the supplied measurement ID. The public tag configuration reports no Enhanced Measurement modules and no user-provided-data capabilities. The GitHub Pages deployment for `5ab906d` completed successfully. The live homepage, Privacy, Toolooo, Artooo, five representative tools, robots, normal sitemap and image sitemap returned HTTPS 200 with correct canonicals and no mixed-content resource references. HTTP and www both redirect to the apex host. IndexNow received 52 URLs with HTTP 202. Google/Bing indexing metrics remain Pending.

**🟡 MISSION 5 TECHNICALLY COMPLETE — WAITING FOR GA4 REALTIME CONFIRMATION**
