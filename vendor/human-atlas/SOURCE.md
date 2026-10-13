# Human Atlas source

MIT-licensed source adapted from https://github.com/ashemag/human-atlas at 1c38bf35c254a891200d3cedecfd57abebe83d8d. Only the used UI controls and application modules are included. Existing compiled CSS and Khizooology learning/brand layers remain unchanged.

Build: npm run human-atlas:build (also runs before Astro build/dev). Three.js and the original UI libraries are build dependencies for this existing viewer, isolated from generic Infooo and other routes. Geometry assets and third-party licenses are preserved.

Local changes: source-based lazy scene import, native worker geometry batching/decompression, cooperative picking setup, conservative bounds-derived picking spheres, whole-system visibility, on-demand rendering and reduced-motion transitions. No model simplification, removed structure or quality downgrade.
