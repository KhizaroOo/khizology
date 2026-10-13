# Human Atlas performance recovery

2026-10-13. Local mobile lab measurements only; no field CWV or indexing claim. No commit, push or deployment.

## Cause and source changes

The original startup assembled and merged geometry on the main thread, scanned vertices for picking spheres, initialized environment/shader resources synchronously and retained an animation callback while idle. Lighthouse attributed long tasks to the embedded viewer, not the static world page. Its LCP candidate in the initial audit was the outer analytics-consent paragraph, delayed by viewer work.

The previously precompiled viewer is now reproducibly built from pinned MIT upstream source. Existing anatomy assets, compiled visual styles, learning layer and attribution remain. The existing Three.js/UI libraries are declared as build dependencies; they are not imported by generic Infooo or other worlds.

- Controls/context paint before the lazily imported scene initializes.
- A native worker fetches, decompresses and batches the same geometry using transferable buffers.
- Picking setup yields in bounded batches, uses conservative bounds-derived spheres and shares one immutable picking material.
- Environment/material shaders use Three.js's asynchronous compilation API where supported. Work is not deferred beyond the measurement window to hide it.
- Hidden whole-system batches skip rendering; per-part visibility/selection remains intact.
- Lazy-scene failures retain the reload state. Unmount stops work immediately and waits for pending shader preparation before GPU disposal.
- Animation callbacks stop when idle and wake for controls, state, loading, resize and motion preference changes. Reduced motion snaps explode transitions and suppresses auto-rotation.
- Build output is regenerated, not hand-patched. Obsolete generated chunks are removed only after a successful build. Source provenance/license is in `vendor/human-atlas/SOURCE.md`.

## Measurements

Initial supplied single run: FCP 1651ms, LCP 5776ms, TBT 9012ms, CLS 0.00008, TTFB 6ms. That blocking-time magnitude did not reproduce in the quieter controlled reruns; do not present its difference as the isolated effect of the fix.

Controlled comparison: three alternating fresh mobile Lighthouse runs per version, identical gzip/MIME/static-server handling on localhost:4327, default simulated throttling, headless Chrome, no analytics consent. The baseline serves the archived original viewer against the same surrounding page/assets. Medians:

| Metric | Original | Recovered |
| --- | ---: | ---: |
| FCP | 2717ms | 1216ms |
| LCP | 3782ms | 2883ms |
| TBT | 1918ms | 762ms |
| CLS | 0.000153 | 0.000083 |
| TTFB | 1.964ms | 2.054ms |
| Startup script transfer | 331801 bytes | 331710 bytes |
| Largest loaded JS chunk, decoded | 916416 bytes | 498850 bytes |
| Long tasks | 20 | 10 |
| Total long-task duration | 3293ms | 1557ms |
| Longest task | 832ms | 539ms |

Controlled TBT fell about 60%, LCP 24%, FCP 55%. Total script bytes are essentially unchanged: splitting improves initialization, not an invented download reduction. The UI entry is about 414KB decoded, scene about 499KB and worker about 1.5KB. Anatomy still contains all 2234 parts / 3432 concepts / 15 chunks; 32,956,129 compressed bytes, with the existing uncompressed fallback. No textures, geometry detail or anti-aliasing were reduced.

Same original Astro preview setup (localhost:4326), three additional fresh runs: median FCP 2340ms, LCP 4566ms, TBT 1146ms, CLS 0.000153, TTFB 3.42ms. Runs varied (FCP 1589–2389ms, LCP 3322–5154ms, TBT 556–2558ms). This confirms lower blocking while showing why the matched comparison and variation must both be retained. FCP is not uniformly faster than the supplied single run. Both servers use the same Lighthouse mobile flags; server timings are local and do not represent production TTFB or real-device INP.

Every controlled run had zero failed requests and no runtime error. Raw reports/comparison JSON accompany the review in local attachments. INP and field CWV remain unmeasured. The renderer remains a substantial 3D workload; long tasks are reduced, not eliminated.

These measurements precede the final small error-boundary and disposal safeguards; byte counts describe that measurement snapshot. The final source passed the build, type, geometry and HTTP audits again.

## Functionality and verification

- Browser: search `heart`, keyboard ArrowDown/Enter selection, 83-piece concept detail, isolate/restore, layer presets and switches, keyboard explode to 100%, front/three-quarter camera views, reset and 390px mobile rendering. No horizontal overflow or console errors observed. Loading status displayed during preparation and disappeared after completion.
- Automated: all 2234 parts across 15 chunks match Three.js's original merged positions, normalized normals, part IDs and indices byte-for-byte. Reduced-motion transition/rotation branches and invalid/truncated model responses are exercised by `scripts/test-atlas-geometry.mts`. Physical-device gesture behavior and OS-emulated reduced-motion playback were not separately tested.
- Human Atlas audit: 43 HTTP asset/route checks; all geometry boundaries, gzip fallbacks and source attribution validated. No anatomy resources on 322 unrelated documents.
- Final production build; Astro (zero errors/warnings, eight existing hints plus one upstream unused-variable hint); SEO, Value, prelaunch, domain, search/privacy, analytics tests and diff check pass. No route, canonical, sitemap or structured-data change. 318 indexable/sitemap URLs retained.

Use `npm run human-atlas:build` for a focused viewer rebuild; ordinary build/dev runs also rebuild it. Run `node --experimental-strip-types scripts/test-atlas-geometry.mts` and `npm run audit:human-atlas` for targeted verification. Final generated JavaScript is intentionally ignored by Git and created in the deployment build.
