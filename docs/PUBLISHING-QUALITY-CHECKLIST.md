# Publishing Quality Checklist

Use this release gate for every meaningful Khizooology change. It protects work that is useful, truthful, browser-first, fast, beautiful, and recognizably Khizooology.

`build → verify → review → publish`

Passing a build is necessary, not sufficient.

## 1. Automated gate

Run this before a normal release:

```sh
npm run audit:publish
```

It deliberately composes existing checks instead of recreating them:

1. `audit:domain` runs the production build, SEO, pre-launch, and domain checks.
2. `npx astro check` validates Astro and TypeScript diagnostics.
3. `audit:value` verifies Value Laws, knowledge rules, privacy contracts, and generated output.

Use focused checks when relevant: `npm run audit:human-atlas`, `npm run test:contract-drift`, `npm run audit:ga-config`, and `npm run indexnow:check`. See [Content + SEO standard](CONTENT-SEO-STANDARD.md), [Value Laws](KHIZOOOLOGY-VALUE-LAWS.md), [performance budget](PERFORMANCE-BUDGET.md), [Toolooo LV3](TOOLOOO-LV3.md), and [Monster Voice System](MONSTER-VOICE-SYSTEM.md).

## 2. Core manual gate

Answer these before publishing. Mark a real concern as **REVIEW** or **BLOCKED**; do not manufacture certainty from automation.

- Does the release solve the intended visitor problem?
- What real value does this give the visitor: **USE, UNDERSTAND, FEEL, or SHARE**? If none, do not publish.
- Can a first-time visitor understand the main action or conclusion?
- Are claims, calculations, examples, and limits truthful and appropriately qualified?
- Is private input kept browser-side and out of analytics, URLs, storage, logs, and unsafe shares?
- Does the affected route work at 320px, 375px, and 390px without horizontal overflow or blocked controls?
- Can keyboard and screen-reader users reach and understand the key interaction?
- Are image alts meaningful, or empty when the image is decorative?
- Does the change preserve clear hierarchy, focus visibility, contrast, and reduced-motion behavior where relevant?
- Does the page deserve indexing, with SEO that describes real value rather than inventing it?
- Does it use the canonical registry and shared infrastructure instead of copied metadata or parallel routes?
- Does it still feel like Khizooology and preserve the relevant monster role and subtle voice?
- Did it avoid unnecessary dependencies, JavaScript, network requests, large assets, or layout shift?
- Is there a useful next step where one naturally belongs?
- Is any new copy generic filler, repeated explanation, fake depth, or unnecessary UI noise?
- Would Khizar confidently publish this today?

## 3. Conditional gates

Apply only the rows touched by the release.

| Area | Review |
| --- | --- |
| Toolooo | What → Why → Result → Action → Next are useful and truthful. For LV3, check scenario, safe share, My Toolooo, next moves, chains, and raw-input privacy. |
| Infooo | Fact/model/simulation boundaries are clear; knowledge relationships are visible; the generic framework stays world-independent; the mobile stage works. |
| Artooo | Artwork identity, path, metadata, alt text, related logic, and image sitemap remain valid. Do not invent meaning, history, or creator intent. |
| Monster system | Use the canonical registry, role, status, and voice. Keep future identities hidden until released. |
| Content / SEO | Verify unique purpose, title, description, H1, canonical, truthful schema, internal discovery, indexability, and sitemap intent. |
| Analytics / sharing | Consent behavior is unchanged or reviewed; no raw data reaches events, URLs, storage, logs, or share text. |
| Notooo | Engine validation, source references, confidence, lifecycle, plain language, disclosure, Concept F, fullscreen, and PNG export remain correct. |

## 4. Severity and decision

| Severity | Meaning | Release response |
| --- | --- | --- |
| **P0** | Must not publish: build/route failure, privacy or secret leak, misleading core claim, critical accessibility failure, canonical/domain break, or major mobile failure. | **BLOCKED** |
| **P1** | Fix before a normal release: broken important interaction, missing critical content, internal-link or meaningful SEO regression, source-of-truth drift, or release-caused performance regression. | **BLOCKED** until fixed |
| **P2** | Improvement: non-critical polish, copy refinement, or optional enhancement. | **READY** or **REVIEW**, based on judgment |

Use one release result only:

- **READY** — all required automated gates pass; no P0/P1 issue remains.
- **REVIEW** — no hard blocker, but a real human-quality decision remains.
- **BLOCKED** — a P0 or P1 issue remains.

## 5. Release hygiene

Before commit, push, or deploy, review the diff and git status. Include only intended work, keep credentials and secret-bearing configuration out of output, do not remove stashes, and do not change unrelated files. Commit, push, and deploy need explicit authorization.

## 6. Production smoke check

After an approved deployment, check the affected route on HTTPS:

1. Route and primary interaction load correctly.
2. Canonical URL, assets, and main metadata resolve correctly.
3. One mobile-width smoke check shows no obvious overflow or blocked control.
4. Browser console has no breaking error.
5. For a larger release, repeat this on each affected connected surface.

## Representative release review

Use these surfaces to keep the checklist grounded without requiring a full-site manual regression every time:

- Artooo: `/artworks/`
- Normal Toolooo: `/toolbox/jwt-time-machine/`
- LV3 Toolooo: `/toolbox/api-payload-doctor/`
- Infooo: `/infooo/human-atlas/`
- Creator surface: `/behind-the-vibes/`

This checklist coordinates canonical rules; it does not replace them.
