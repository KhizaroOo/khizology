# AGENTS.md — KHIZOOOLOGY

## Goal

Build Khizooology with maximum user value and minimum complexity, tokens, context reads, and tool calls.

Core philosophy:

**Useful. Browser-only. Fast. Beautiful. No signup. No bullshit.**

For every task:

**Inspect relevant code → implement smallest complete solution → targeted verify → report briefly.**

---

## Working Style

Work autonomously.

Do not ask questions when the answer can reasonably be inferred from:

- existing code
- nearby implementations
- project docs
- types
- configuration
- established patterns

Do not narrate exploration or produce long plans.

Use targeted search and read only files relevant to the mission.

Do not scan the entire repository unless genuinely required.

Prefer extending existing systems over creating parallel ones.

---

## Scope

Make the smallest high-quality change that completely solves the mission.

Avoid:

- unrelated refactors
- speculative architecture
- duplicate systems
- unnecessary dependencies
- unnecessary documentation
- one-off hacks
- phantom features/pages
- touching unrelated files

Preserve working behavior unless the mission explicitly changes it.

---

## Architecture

Respect existing sources of truth, registries, helpers, components, metadata, and conventions.

Prefer:

**shared fix → all consumers**

over:

**manual edits → many consumers**

Do not duplicate routes, monster identities, tool metadata, artwork metadata, paths, or other canonical project data.

### Toolooo

Keep tools:

- browser-only
- fast
- privacy-safe
- understandable
- truthful

Prefer improvements to shared Toolooo infrastructure over editing many tools separately.

Never send raw/private tool input to analytics.

### Infooo

Infooo is a reusable interactive knowledge-world framework.

Keep shared framework code:

- world-independent
- renderer-independent where intended
- reusable
- lightweight
- accessible
- responsive

Do not leak Human Atlas-specific or Three.js-specific assumptions into generic framework layers.

New worlds should plug into the framework instead of duplicating it.

### Artooo

Prefer metadata/data-driven improvements.

Protect existing:

- artwork routes
- images
- tags
- related-art logic
- structured data
- SEO metadata

---

## Browser-Only / Privacy

Khizooology is static/browser-first.

Do not introduce unnecessary:

- backend services
- databases
- authentication
- accounts
- CMS systems
- cloud processing

Never expose secrets or private/raw user content through:

- URLs
- analytics
- logs
- generated metadata
- persistent storage

unless explicitly and safely required.

---

## UX

Protect:

- responsive behavior
- mobile usability
- hierarchy
- readability
- keyboard usability
- touch targets
- loading states
- empty states
- error states

Avoid unnecessary:

- modals
- popups
- animations
- controls
- UI noise
- explanatory text

Every visible element should provide value.

---

## Performance

Performance regressions are bugs.

Avoid unnecessary:

- JavaScript
- dependencies
- asset weight
- network requests
- runtime computation
- re-renders
- layout shifts
- render blocking

Prefer existing libraries and lightweight browser-native solutions.

Do not sacrifice existing Lighthouse/PageSpeed quality for minor features.

---

## Accessibility

Preserve or improve:

- semantic HTML
- keyboard navigation
- focus states
- labels
- contrast
- screen-reader usability
- reduced-motion behavior

Prefer semantic HTML over unnecessary ARIA.

---

## SEO — Mandatory for New Public Content

SEO is a **completion requirement**, not an optional enhancement.

Whenever creating or materially changing public Toolooo tools, Artooo artworks/pages,
Infooo worlds/pages, Notooo notes/content, landing pages, category/listing pages,
or other indexable content, automatically inspect and implement all relevant SEO
requirements without waiting for a separate request.

For every new indexable page/content item, verify as applicable:

- unique `<title>` and useful meta description
- canonical URL and correct index/noindex behavior
- Open Graph and Twitter/social metadata
- meaningful social image and alt text
- semantic H1 and heading hierarchy
- crawlable descriptive page copy
- truthful structured data / JSON-LD using existing project infrastructure
- breadcrumbs where appropriate
- internal links and related-content / discovery links
- sitemap inclusion and image sitemap inclusion where applicable
- descriptive image alt text
- clean, stable URL and slug
- no duplicate, empty, thin, or phantom indexable pages
- no broken canonical or BASE_URL paths
- no accidental orphan pages

Use existing centralized SEO helpers, metadata registries, route helpers, schemas,
sitemap generators, and canonical content sources. Do not duplicate SEO metadata
across components when a canonical source already exists. Protect existing SEO.

### Search + AI Discovery

Preserve and verify, where applicable:

- robots.txt crawlability
- AI crawler accessibility according to project policy
- llms.txt / generated AI-discovery files
- sitemap discovery
- meaningful static text understandable without executing interactive JavaScript
- clear entity/topic terminology and useful contextual internal linking

Generated SEO/AI-discovery files must update automatically from canonical project
data wherever the existing architecture supports it.

### SEO Truthfulness

Never keyword-stuff, create fake FAQ/schema content, generate misleading structured
data, expose private/tool input in metadata, URLs, analytics, or schemas, or create
SEO-only pages without genuine user value.

SEO must support the Value Laws rather than bypass them.

### Verification Gate

For every new public content implementation:

1. Inspect how existing strong pages implement SEO.
2. Add/update canonical metadata through the existing source of truth.
3. Verify the generated route and canonical.
4. Verify sitemap inclusion/exclusion and structured data.
5. Verify social metadata and internal discovery links.
6. Verify robots/indexing behavior where relevant.
7. Run existing SEO/prelaunch/domain/content audits.
8. Run `npm run build`.
9. Fix all mission-related SEO failures before completion.

A new public page/content item is **NOT DONE** if its relevant SEO surface is
incomplete. Final reports must mention SEO verification under `VERIFIED`.

---

## Analytics

Reuse existing analytics infrastructure.

Track meaningful interactions only.

Never send:

- JWTs
- API payloads
- uploads
- private text
- sensitive tool input

to analytics.

---

## Dependencies

Before adding a dependency, determine whether the current stack can solve the problem cleanly.

If yes, do not add one.

Only introduce dependencies when their value clearly exceeds:

- bundle cost
- maintenance cost
- complexity
- security surface

---

## Verification

Verification must match risk.

### Tiny/local change
- inspect diff
- targeted check if useful

### Normal feature
- relevant type/lint/test/runtime checks

### Shared/build/SEO/routing change
- broader regression checks
- production build when justified
- relevant audits

Do not repeatedly run the full build/test suite while developing.

Use targeted checks first.

Run broader validation once near completion when the risk justifies it.

Fix failures caused by your changes automatically.

Never claim checks were run when they were not.

---

## Git Safety

Do not:

- expose secrets
- discard unrelated changes
- modify unrelated user work
- commit
- push
- deploy

unless explicitly requested.

Inspect Git state before risky operations.

---

## Token / Tool Efficiency

Minimize context and tool use without reducing correctness.

Do not:

- restate the mission
- repeat stable project rules
- reread unchanged files unnecessarily
- explain obvious code
- dump code into the final response
- investigate unrelated warnings
- generate long summaries

Batch related reads, edits, and checks when safe.

---

## Decision Priority

When multiple solutions are valid, prefer:

1. Correctness
2. User value
3. Existing architecture
4. Simplicity
5. Privacy
6. Accessibility
7. Performance
8. Maintainability
9. Minimal dependencies
10. Minimal code

---

## Final Response

Return only:

### CHANGED
- short meaningful summary

### VERIFIED
- checks actually performed

### BLOCKERS
- `None` or genuine blocker

### FINAL
- `READY`
- or `BLOCKED`

Keep the response extremely short.

Do not paste code unless explicitly requested.

---

## Golden Rule

**Think deeply. Read selectively. Change precisely. Verify proportionally. Report briefly.**
