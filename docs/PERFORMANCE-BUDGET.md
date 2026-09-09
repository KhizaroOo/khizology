# Normal-page performance budget

Measured 2026-09-09 on the local Astro production preview at `http://127.0.0.1:4322/`, using Lighthouse 12.8.2 default simulated desktop/mobile throttling and fresh browser sessions without analytics consent. These are laboratory results, not deployed PageSpeed Insights or field Core Web Vitals. Three final runs per device; medians below. Scores varied 99–100 for performance and stayed 100 for accessibility, best practices, and SEO. A separate light-theme desktop run scored 100 in all categories.

| Metric | Desktop measured | Mobile measured | Normal-page review budget |
|---|---:|---:|---:|
| Initial transfer | 424,840 B | 237,866 B | <= 1 MB |
| Image transfer | 321,274 B | 142,502 B | <= 700 KB |
| JavaScript transfer | 3,155 B | 3,155 B | <= 150 KB |
| CSS transfer | 14,276 B | 14,276 B | <= 30 KB |
| FCP | 0.375 s | 1.240 s | desktop <= 0.8 s; mobile <= 1.8 s |
| LCP | 0.632 s | 1.677 s | desktop <= 1.5 s; mobile <= 2.2 s |
| TBT | 0 ms | 0 ms | near 0; investigate > 50 ms |
| CLS | 0.00020 | 0.00007 | <= 0.01 |
| Speed Index | 0.587 s | 2.209 s | desktop <= 1 s; mobile <= 3 s |

The byte budgets are review triggers for normal landing/content/tool pages, not claims that every route has been benchmarked. Artooo's user-triggered full-resolution views and Human Atlas's intentionally heavy isolated viewer require separate budgets. Neither may preload originals or anatomy on normal routes. Measurements include resources Lighthouse loads within its initial observation window; scrolling through an entire gallery is a different workload.

## Before and after

| Local baseline / final median | Desktop | Mobile |
|---|---:|---:|
| Before P/A/BP/SEO | 95/96/100/100 | 82/95/100/100 |
| After P/A/BP/SEO | 100/100/100/100 | 100/100/100/100 |
| Total transfer before | 27,160,862 B | 1,418,499 B |
| Total transfer after | 424,840 B | 237,866 B |
| Total reduction | 26,736,022 B (98.44%) | 1,180,633 B (83.23%) |
| Image transfer before | 27,054,490 B | 1,320,698 B |
| Image transfer after | 321,274 B | 142,502 B |
| Image reduction | 26,733,216 B (98.81%) | 1,178,196 B (89.21%) |

The supplied production scores (97 desktop / 90 mobile performance) are a separate observation; do not mix them with the measured local baseline. Raw local Lighthouse reports remain in ignored `.performance/`. `PERFORMANCE-RESULTS.json` records the compact machine-readable baseline, final runs, medians, largest resources, and diagnostics.

## Implementation and operating rules

- `npm run build` and `npm run dev` generate previews first. `scripts/generate-thumbnails.mjs` uses Sharp to create 320/640 px artwork previews and 160 px monster previews, plus the homepage's creative image. WebP quality is 82; originals are untouched. Only matching obsolete generated filenames are pruned. Derived files and their manifest are ignored by Git and recreated on clean builds.
- Use `preview()` and `previewSrcset()` from `src/utils/imagePreview.ts` for cards, with layout-appropriate `sizes`, intrinsic dimensions, lazy loading below the fold, and async decoding. The gallery modal retains the original image; sitemap verification matches all 168 originals to their cards.
- Poppins 400–900 and variable Mulish remain the brand fonts. Local WOFF2 imports go through Vite's fingerprinted asset pipeline. Only the body and heavy heading fonts are preloaded; other weights load when used. Font licenses ship in `public/font-licenses.txt`.
- Desktop LCP was the hero heading; mobile LCP was the hero subtitle. No speculative image preloads were added. The external HTML → Google font CSS → font chain was removed.
- Exact contrast fixes cover muted light-theme text, section labels, monster text, dimmed future cards, and the follow CTA. Background/border monster identity colors remain intact. Redundant artwork alt text and overriding card labels were corrected.
- A persistent page-entry transform was released after animation so fixed artwork dialogs remain attached to the viewport. Two stale future-monster emoji references were removed. Source checking excludes static precompiled vendor files under `public`, while authored TypeScript/Astro still receives checks.

## Remaining diagnostics and hosting boundary

Lighthouse still suggests reducing high-density preview images (about 162 KiB desktop / 132 KiB mobile) and reports the remaining local CSS/font dependency chain. Representative render-blocking insight savings are about 60 ms desktop and 160 ms mobile. Previews retain resolution for high-density screens; no fragile stylesheet loading workaround was introduced. Baseline DOM size was 469 elements; DOM and forced-reflow audits passed, so no speculative rewrite was made.

Production HEAD checks on the homepage and a monster image returned `Cache-Control: max-age=600`. Content hashing avoids stale filename reuse but does not change GitHub Pages' response-header policy. No unsupported custom header files, CDN, or proxy were added. Recheck public PSI and cache diagnostics after an explicitly approved deployment; local scores cannot guarantee production scores.

## Repeat and regression checks

1. `npm ci`, then `npm run build` (Node >= 22.19).
2. Run `npm run preview`, then Lighthouse JSON audits against the displayed preview origin, desktop (`--preset=desktop`) and mobile, three fresh runs each. Keep raw reports outside `public`/`dist`.
3. Run `node scripts/summarize-performance.mjs` when `.performance/` contains the documented baseline and `final-{desktop,mobile}-{1,2,3}.json` plus `final-light.json` names.
4. Run the SEO, domain, value, prelaunch, Human Atlas isolation, and consent audits; `npx astro check`; `npx tsc --noEmit`; and `git diff --check`.

Validated: homepage at 320/375/390/768/1280/1440 in both themes without horizontal overflow; full-resolution artwork modal; Toolbox family filtering; API Payload Doctor example diagnosis; Behind and Privacy rendering; zero observed browser console errors. Build and source checks passed (Astro: zero errors/warnings, eight existing informational hints). Consent tests passed with mocked transport; normal-page inspection found no Google analytics scripts before consent. No commit, push, or deployment performed. No P0/P1 blockers identified for performance review.
