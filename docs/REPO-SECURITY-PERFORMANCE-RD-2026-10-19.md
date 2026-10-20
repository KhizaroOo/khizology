# Repository security and performance R&D — 2026-10-19

Audit only; no application, dependency, workflow, Git configuration or production changes. Existing untracked search baseline preserved. Current source commit: `86c55ba`.

## Conclusion

**Address exposed credential material first.** The static/browser-first architecture and privacy controls are useful strengths, but passing the existing publishing audits does not constitute security clearance. Six dependency packages have current advisories. Several measured or reproducible client-side performance/stability improvements are worthwhile; no framework rewrite is justified.

Scope: inventory of 623 tracked files; automated scans across tracked text and 284 source/script/vendor code files; focused manual review of deployment, shared layout, analytics, storage, sharing/export, image upload/rendering, payload parsing and Human Atlas loading. Production response headers sampled on four routes. This is a repo-wide risk review, not an exhaustive penetration test or proof of absence of vulnerabilities. No credentials were printed, validated against GitHub or used for new authentication. Historical commits, account permissions, branch protection and real-user performance were not comprehensively audited.

## Prioritized actions

| Priority | Finding and evidence | Smallest useful action / acceptance check |
| --- | --- | --- |
| **P0 — immediate owner action** | A GitHub-token-shaped value is committed in `.claude/settings.local.json:45`. The local origin URL also contains embedded credential material. Validity/scopes are untested; treat as exposed until revoked or established already revoked. File history exists, so deleting the current line alone is insufficient. | Revoke/rotate affected credentials first; review GitHub access/security logs. Stop tracking the local settings file while preserving the local copy; ignore local settings and non-example environment files. Use Git Credential Manager or SSH rather than credentials in the remote URL. Review history cleanup separately with collaborator coordination; no unilateral history rewrite. Add secret scanning/push protection. |
| **P1** | `npm audit --json`: **4 high / 2 moderate vulnerable packages**, no critical packages. Locked `sharp` is 0.35.4; advisory patch is 0.35.5. Other affected packages: devalue, source-map-js, http-cache-semantics, fast-uri, smol-toml. All six report a fix available. | Review compatible lockfile updates without `--force`, then clean install, full gates and viewer/image checks. Re-run audit; document any unavoidable advisory with reachability evidence. No need for an automatic major upgrade. |
| **P1 prevention** | `.github/workflows/deploy.yml:36–44` installs, builds and uploads without running the existing SEO/Value/privacy/type checks or a security gate. The tracked credential coexists with passing publish checks. | Reuse existing audit commands in CI, add maintained secret/dependency checks, and fail deployment on actionable findings. Avoid rebuilding repeatedly: build once, then existing direct audit scripts. Scope `pages:write`/`id-token:write` to the deploy job where possible; pin external actions to reviewed immutable SHAs. |
| **P2 stability** | `ApiPayloadDoctor.tsx:89,101,196,305`: original Diagnose has unbounded file/text parsing and recursive traversals. Extracting its actual `collectKeys` function and feeding valid 12,000-level nested JSON reproduced **RangeError: Maximum call stack size exceeded**. Only JSON.parse errors are caught; recursion occurs later during rendering. | Add byte/node/depth budgets before expensive diagnosis, bounded iterative traversal and a visible safe error. Cap file size before FileReader. Reuse established bounded-parser patterns from newer tools. Test deep, wide and oversize inputs while preserving normal results. This is local browser availability, not a demonstrated remote service attack. |
| **P2 performance** | `ArtworkGrid.tsx:85` loads the original in the modal. Originals in dist reach **12,666,283 bytes (12.1 MiB)**. Existing 320/640px WebP previews already protect normal listings. | Add larger responsive viewing derivatives to the existing preview generator; use them for normal modal display. Keep original quality available through an explicit full-resolution action. Measure modal transfer/decode time; preserve artwork routes, alt, original downloads and image sitemap. |
| **P2 performance** | `vendor/human-atlas/app/scene.tsx:108` drains all 15 chunks with concurrency 3 regardless of visible systems. Canonical manifest totals **32,956,129 compressed bytes (31.4 MiB)** / 59,546,744 decoded bytes. All geometry prepares even when some layers are hidden. | Profile a visible-first chunk order and defer nonessential preparation; then consider true system-on-demand chunks if packing warrants it. Preserve search/isolation/explode completeness with explicit loading. Keep this entirely in the world layer. Compare identical mobile lab runs before/after; no new speed claims from these byte counts. |
| **P2 performance** | `ValueStudyMaker.tsx:32–78,125–194` synchronously recalculates per adjustment. Extracted actual radius-5 blur on 1200×1200 pixels took **401/296/301ms** in three local Node VM runs (median 301ms), before subsequent histogram/posterization work. | Replace repeated neighborhood sums with sliding-window sums; cache the blur stage when only tone settings change. Start there, then use existing worker/native options only if browser profiling still shows long tasks. Pixel/output equivalence tests and actual mobile traces are required. The Node microbenchmark is not browser TBT/INP. |
| **P2 resilience** | `shared/loadImage.ts:10–30` decodes arbitrary accepted images before size/dimension limits. Canvas caps in consumers apply after the full source has decoded. | Add shared file-byte/type limits and decoded pixel budgets, with friendly errors. Assess resize-at-decode support and clean fallbacks; close ImageBitmap resources if introduced. Verify large originals, corrupted images and repeated selections. No upload/cloud processing needed. |
| **P2 defense in depth** | Four production route samples lack CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy and frame protection headers; no generated CSP meta was found. HTTPS works, so this is hardening, not proof of compromise. | First evaluate the installed Astro `security.csp` support with the current inline theme script, React styles, GA consent loading, workers, blob/data exports and anatomy iframe. Stage and regression-test it; do not blindly enable a strict policy. Header-only protections need a supported serving layer; an `_headers` file on GitHub Pages alone is not a verified solution. Do not force a hosting migration or HSTS preload. |
| **P3 robustness** | `shared/useLocalPref.ts:10–11` trusts arbitrary JSON with a TypeScript cast. `ApiPayloadDoctor.tsx:337` immediately indexes its context registry with the result. Valid JSON containing an unexpected context can cause a render failure. | Validate the three existing preference consumers against their supported values/shapes and fall back to defaults. Do not persist tool inputs. Test corrupted/obsolete preferences. |
| **P3 performance** | `src/utils/notoooExport.ts:3–13,95–96` copies every computed CSS property recursively and renders at least 3× scale with no explicit total pixel budget. This is user-triggered, not initial-load cost. | Measure representative note exports on mobile. Bound total output pixels/dimensions and retain a useful quality option; narrow style copying only if visually equivalent. Test failure/retry paths and long notes. |

## Dependency reachability

| Package | Installed | Advisory class / actual project context |
| --- | --- | --- |
| sharp | 0.35.4 | High; vulnerable native SVG dependency. Used by the build/image pipeline, not visitor-side uploads. Current thumbnail generator only selects raster filename extensions. The advisory's SVG/RCE preconditions were not reproduced; patch nonetheless. |
| devalue | 5.9.2 | High; multiple serializer/parser advisories. Transitive through Astro/React integration; no app-level direct call or server endpoint identified. |
| source-map-js | 1.2.1 | High; source-map CPU denial of service, through CSS/build tooling. No production source maps found in dist. |
| http-cache-semantics | 4.2.0 | High; cache isolation advisory, transitive through Astro. This deployment is static; no personalized runtime response cache identified. |
| fast-uri | 3.1.7 | Moderate; URI normalization, through Astro check/language-server/AJV development tooling. |
| smol-toml | 1.8.0 | Moderate; parser CPU amplification, through Astro/content tooling. No public TOML parsing endpoint identified. |

Audit severities above are dependency package classifications, not six demonstrated public-site exploits. Raw audit evidence: ignored `.performance/repo-security-npm-audit.json`.

## Performance inventory

- Existing dist snapshot: images **509.74 MiB**, anatomy assets **89.49 MiB** including raw and compressed fallback copies. These are deployment bytes, **not homepage transfer**. Preserve originals/fallbacks until actual delivery improvements are verified.
- Largest generated JS: shared React client **179.8 KiB raw / 56.1 KiB local gzip estimate**. Atlas scene **487.2 / 123.3 KiB**, viewer entry **404.6 / 131.4 KiB**. Gzip figures are computed locally, not measured network transfer.
- Generated HTML: homepage 60.3 KiB, artwork hub 300.9 KiB, Notooo hub 173.3 KiB; local gzip estimates 13.2 / 40.9 / 32.8 KiB respectively.
- Homepage and Notooo hub have zero React islands. API Doctor has four small islands sharing the React client; this does not mean the runtime downloads four times or every tool bundle loads.
- Keep existing static text, SSR gallery discoverability and on-demand originals. Do not sacrifice SEO/accessibility through blind virtualization or `client:only` conversion.
- Existing Lighthouse reports are historical. No fresh Lighthouse, production INP or field CWV was measured in this audit; do not present old scores as today's results. Use the existing performance budgets and matched viewer benchmarking setup for implementation.

## Protections confirmed

- Static build; no new server/API/database/signup surface. Browser tools do not need credentials.
- No app `eval`, Function constructor, innerHTML or document.write sink found in the source pattern scan; matching event-loop strings are explicit rejection tests. React text rendering is retained. Build-time JSON-LD uses canonical project data.
- Analytics remains consent-first, canonical-location based, referrer-host sanitized, ad/Google Signals disabled, and metadata-only. Relevant mocked event/privacy tests pass; this audit did not recapture every live GA request.
- CSV output neutralizes spreadsheet formula/control prefixes. Private tool values are not stored by workspace/history; observed persistence is public tool IDs and small preferences.
- Known-token pattern scan found **zero matches in generated dist** and zero production source maps. The tracked settings credential is a repository/control-plane finding; no matching generated credential was found. Pattern scans cannot prove absence of every secret format.
- Existing Atlas lazy scene import, geometry worker, demand rendering, pixel-ratio caps and disposal should be preserved; do not redo the prior renderer recovery without a new measured benefit.

## Verification performed

- `npm run audit:publish`: PASS — fresh production-configured build, SEO, prelaunch, domain, Astro and Value/knowledge/analytics/privacy checks. 324 HTML documents / 318 indexable; Astro 0 errors, 0 warnings, 8 existing hints.
- Security-policy, data-exposure, browser-pack, CSV, client-storage, Contract Drift and analytics test scripts: PASS.
- `npm audit --json`: **FAIL by design of the audit result**, six vulnerable packages as above. No dependency installation or automatic fix applied.
- Safe current-tree secret pattern scan, local remote credential-presence check, asset/bundle/HTML inventory, production header sample and two extracted-source reproductions completed.
- `git diff --check`: PASS; application code unchanged. No commit, push or deployment.

## Recommended implementation order

1. Owner revokes/rotates credentials; separately clean tracking/remote authentication and prevent recurrence.
2. Patch dependency lockfile and add CI release/security checks; run existing complete gates once.
3. Bound API diagnosis and validate saved preferences; then centralize safe image decoding limits.
4. Improve modal derivatives and Value Study processing, measuring actual browser interactions.
5. Profile Atlas staged loading; evaluate CSP in a separate compatibility-tested hardening change.
6. Optimize note PNG export only after measuring its user-triggered cost.

No justified dependency deletion or broad abstraction rewrite was established by the complexity pass. Do not replace the existing architecture to pursue hypothetical savings. Net confirmed deletion: **0 lines / 0 dependencies**.

## Primary research

- [GitHub: revoke/rotate secrets before considering history rewriting](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- [Sharp advisory: affected versions, patch and SVG-specific conditions](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- [devalue advisory](https://github.com/advisories/GHSA-j22f-vq7h-c4qm); the npm audit artifact contains all remaining advisory URLs.
- [GitHub Actions: secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
- [Astro configuration: security.csp](https://docs.astro.build/en/reference/configuration-reference/#securitycsp); also verified against installed config types.
- [MDN: CSP enforcement and meta-policy limitations](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).
- [web.dev: identifying and breaking up long tasks](https://web.dev/articles/optimize-long-tasks).
- [MDN: createImageBitmap resize options and compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap).
