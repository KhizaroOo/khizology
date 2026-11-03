# Human Atlas source

MIT-licensed source adapted from https://github.com/ashemag/human-atlas at 1c38bf35c254a891200d3cedecfd57abebe83d8d. Only the used UI controls and application modules are included. Existing compiled CSS is retained; Khizooology theme and learning layers are maintained separately.

Build: npm run human-atlas:build (also runs before Astro build/dev). Three.js and the original UI libraries are build dependencies for this existing viewer, isolated from generic Infooo and other routes. Geometry assets and third-party licenses are preserved.

Local changes: source-based lazy scene import, native worker geometry batching/decompression, cooperative picking setup, conservative bounds-derived picking spheres, whole-system visibility, on-demand rendering and reduced-motion transitions. Same-origin site theme synchronization repaints the existing renderer background without recreating the viewer. Anatomy materials and system colors remain unchanged. No model simplification, removed structure or quality downgrade.

The existing Infooo learning layer selects verified catalogue concepts through an Atlas-local, cancelable document event. The source viewer validates readiness, identifiers and geometry before accepting it. This path preserves view/layer preferences and adds no network, storage, cross-frame message or generic Infooo dependency.
