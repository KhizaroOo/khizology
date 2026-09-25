# Khizooology — Handoff for Codex / ChatGPT Plus

This document briefs a new AI collaborator (or a new human dev) on the `khizology`
repository: what it is, how it's built, what conventions must be respected, and
exactly where the most recent work left off.

Read this fully before making changes. The codebase has strong, deliberate
conventions — deviating from them (adding Tailwind classes, introducing a backend,
hardcoding a path instead of using `url()`, publishing something before approval)
will visibly break the site, its deployment, or its own governance checks.

This file is itself a living document maintained across sessions by whichever
agent (Claude Code or Codex/ChatGPT) is currently working here. **Keep it
updated** when you finish a body of work — a stale handoff is worse than none,
because the next agent trusts it.

---

## 1. What this project is

**Khizooology** is Khizar Imtiaz's personal site. Tagline: **Art meets Code.**
The site is built around a **monster mascot system** — each major product pillar
is personified as a monster with its own role verb:

| Monster | Role | Route | Status |
|---|---|---|---|
| **artooo** | FEEL | `/artworks` | active — sticky-note art, sketches, illustrations |
| **toolooo** | USE | `/toolbox` | active — 40 free, browser-only utilities (§5–§7) |
| **infooo** | UNDERSTAND | `/infooo` | active — interactive "worlds" that teach a topic (§8–§9) |
| **notooo** | REMEMBER | `/notooo` | active — "one page per book" visual knowledge pages (§10) |
| `future-2`, `future-3`, `future-4`, `future-6`, `future-8` | — | `/future-monsters` | coming-soon — 5 generic **`???ooo`** mystery placeholders, all identical copy, all `noindex`. Some secretly reuse retired brand colors/art from old modules. **Not a bug, don't "fix" it** — this is the deliberate **Mystery Monster Unlock Gate** (§12). |

There is a `MonsterStatus` value `'foundation'` declared in the type but not
currently used by any monster — reserved/dead type surface, not a bug.

Toolooo's own philosophy — "Turn invisible problems into visible ones. Don't
just give the answer. Make the answer visible." — governs that module
specifically; see §6.

---

## 2. Tech stack & hard constraints

- **Astro 7.3+** (static output, `output: 'static'` in `astro.config.mjs`). Watch
  for stale docs claiming "Astro 6" — `package.json` (`astro: ^7.3.1`) is
  authoritative.
- **React 19** islands (`client:load`) only where a component needs interactivity
- **TypeScript** (project uses `strict` via `astro/tsconfigs/strict`)
- **Tailwind 4** is installed (`@tailwindcss/vite`) but **is not used anywhere in
  practice** — see §4 styling conventions. Do not add Tailwind utility classes;
  follow the existing inline-style/CSS-variable pattern instead.
- **`@astrojs/mdx`** is installed for the Notes content collection (§11).
- **GitHub Pages** deployment via GitHub Actions (`.github/workflows/deploy.yml`),
  triggered on push to `main`, custom domain `khizooology.com`.
  - `site: 'https://khizooology.com'`
  - `base: '/'` (root — the earlier GitHub Pages project-site base of
    `/khizology` was migrated away; both `SITE_URL`/`BASE_URL` env overrides
    exist in `astro.config.mjs` for deliberate local validation only, default to
    the production values above)
- **No backend of any kind.** No API routes, no serverless functions, no
  database, no auth, no server-side secrets, no runtime AI/LLM calls. Everything
  must run in the browser. This is a hard constraint repeated explicitly for
  Toolooo (§6) and Infooo worlds (§8) but applies sitewide.
- **No 3D/heavy rendering library.** Notably the Rubik's Cube world (§9) is
  hand-built with CSS/SVG/canvas-style transforms — no three.js or similar.

### `npm` scripts

Full authoritative list (from `package.json` — always trust this file over any
doc, including this one, if they disagree):

```
dev                 astro dev (localhost:4321)
build               astro build → dist/
preview             astro preview

prebuild / predev   images:generate (Sharp-based thumbnail generation, runs automatically)
images:generate     node scripts/generate-thumbnails.mjs

audit:seo           build + scripts/audit-seo.mjs        (titles/descriptions/canonicals/H1/OG/JSON-LD/broken links/alt text/placeholder text)
audit:prelaunch     ^ + scripts/audit-prelaunch.mjs       (expected routes exist: fixed/family/tool/compat/sitemap/robots/404)
audit:domain        ^ + scripts/audit-domain.mjs          (every absolute URL uses khizooology.com, no old GH Pages host/base leaking, no mixed content)
audit:search        audit:domain + audit-search.mjs + test-analytics.mjs   (no server-rendered GTM tag, /privacy link + data-analytics-preferences on every page, IndexNow payload valid, analytics consent gating)
audit:ga-config     scripts/audit-ga-config.mjs           (live: fetches real GA config for PUBLIC_GA_MEASUREMENT_ID, fails if Enhanced Measurement / user-provided-data capture is enabled — never changes settings)
audit:value         build + scripts/audit-value.mjs       (Value Laws, content manifest, tool/monster registries, Mystery Monster Gate, Monster Voice System, Compound Value/Build Smarter rules — see §12)
audit:human-atlas   scripts/audit-human-atlas.mjs         (Human Atlas iframe/viewer wiring, noindex+canonical correctness, self-hosted assets)
audit:publish       audit:domain + `npx astro check` + audit:value   ← THE pre-release gate, see §12
indexnow:check      scripts/indexnow.mjs                  (dry run — validates payload, submits nothing)
indexnow:submit     scripts/indexnow.mjs --submit          (validates + live-checks + POSTs to IndexNow)
test:contract-drift node --experimental-strip-types scripts/test-contract-drift.ts
test:rubiks-cube    node --experimental-strip-types scripts/test-rubiks-cube.mts   (§9)
```

**`npm run audit:publish` is the gate to run before anything ships.** See §12 for
what it actually checks and why it's not optional ceremony.

There are also 8 standalone Toolooo Simulate-family model-regression scripts
under `scripts/` (`test-circuit-breaker.mjs`, `test-connection-pool.mjs`,
`test-fan-out-latency.mjs`, `test-n-plus-one.mjs`, `test-queue-capacity.mjs`,
`test-retry-rate-models.ts`, `test-sla-chain.mjs`, `test-timeout-chain.mjs`) that
are **not wired into any npm script** — run them manually
(`node scripts/<name>.mjs` or `node --experimental-strip-types <name>.ts`) after
touching those tools' math. Worth wiring into a `test:toolooo-models` aggregate
at some point.

Node >= 22.19.0 required (`engines` in `package.json`). No dedicated test
framework is used anywhere (no vitest/jest/playwright) — every "test" is a
hand-rolled Node script that transpiles/strips types from the real component
source and asserts against it directly.

### The `url()` / `img()` helpers — mandatory

`src/utils/url.ts` exports two helpers that prepend `BASE_URL`:

```ts
url('/toolbox')          // → '/toolbox' at the production-domain root
img('/images/foo.png')   // same, for asset paths
```

**Every internal `href` and asset `src` in the codebase must go through one of
these.** This keeps route/asset paths correct if the deployment base ever
changes again — always grep for raw `href="/` or `src="/` before shipping
anything that adds links.

### Git safety — read before touching git

- **Do not run `git remote -v` or otherwise print/expose the git remote URL.** It
  is known to contain an embedded personal access token from an earlier handoff.
  Never paste it into chat, commits, or logs.
- **Do not commit, push, or deploy unless explicitly asked.** The user reviews
  and commits themselves in most sessions.
- Always run `git status` before starting anything, and don't assume a clean tree.
- **GitHub Desktop is used alongside AI-driven edits in this repo**, and has been
  observed to **auto-stash the working tree mid-session** (visible as
  `stash@{N}: WIP on main` in `git stash list`) — apparently triggered by some
  interaction in the GitHub Desktop GUI while an agent is mid-edit. This caused a
  real incident during an earlier Toolooo upgrade session where several
  completed file edits vanished from the working tree and had to be recovered
  with `git stash show --stat` / `git checkout stash@{N} -- <path>`. **If files
  you expect to be modified suddenly look reverted to their last-committed
  state, check `git stash list` before assuming your own edit was lost or
  wrong** — the content is very likely sitting safely in a stash. Do not
  `git stash drop` anything without first confirming its contents are no longer
  needed elsewhere.

### A stale document to be aware of

`README.md` (repo root) is **not fully in sync with the current site** — it
still describes a retired `freeooo` monster and dead `/infographics`/`/freebies`
routes, and is internally inconsistent about the Astro major version. This
matters because `scripts/audit-prelaunch.mjs` explicitly asserts `freeooo` must
**never** reappear in `src/data/monsters.ts` — the README is describing a state
the site's own governance forbids. Don't trust README.md for "what monsters/
routes currently exist" — trust `src/data/monsters.ts` directly, or this
document.

---

## 3. Repository structure (the parts that matter)

```
src/
  pages/
    index.astro                  # homepage — monster grid, hero, Toolooo teaser cards
    artworks.astro                # artooo module
    my-portfolio.astro, behind-the-vibes.astro, you-ask-i-answer.astro,
    drop-a-vibe.astro             # misc content pages
    frop-a-vibe.astro             # deliberate redirect alias (typo'd URL from an old
                                   #   PDF) → /drop-a-vibe. NOT a stray duplicate, leave it.
    future-monsters.astro         # Mystery Monster Gate — always noindex, see §12
    privacy.astro
    404.astro
    robots.txt.ts, image-sitemap.xml.ts   # generated, not static files
    toolbox.astro                 # Toolooo hub — see §5–§7
    toolbox/
      [slug].astro                 # dynamic route — generates all 40 tool pages
      family/[id].astro            # dynamic route — generates the 5 family detail pages
    infooo/                       # Infooo worlds — see §8–§9
      index.astro                  # hub, links to both Human Atlas and Rubik's Cube Motion Graph
      human-atlas.astro
      rubiks-cube-motion-graph.astro   # published, public — World 002, see §9
    notooo.astro                  # Notooo hub — see §10
    notooo/[slug].astro
    notes.astro                   # Notes hub — see §11 (currently empty-state)
    notes/[slug].astro

  content.config.ts               # Astro content collections — defines the "notes" collection
  content/notes/                  # actual .md/.mdx note files live here (currently none, see §11)

  data/                           # SINGLE SOURCE OF TRUTH per domain — see §5, §8–§12
    families.ts                    # 5 Toolooo families
    tools.ts                       # all 40 tools' metadata
    monsters.ts                    # monster roster (drives homepage/footer/cross-links)
    monsterVoices.ts               # Monster Voice System microcopy, see §12
    site.ts                        # global site meta
    navigation.ts                  # NOTE: mainNav/footerNav exports here are DEAD CODE,
                                    #   not consumed by the real Navbar/Footer components
                                    #   (which hardcode their own lists). Kept in sync by
                                    #   convention but double-check before trusting it.
    artworks.ts                    # artooo gallery data
    infooo.ts                      # Infooo world registry + shared type contract, see §8
    humanAtlasLearning.ts          # Human Atlas entity/relationship/guide content (TS side, see §8)
    notooo.ts                      # Notooo book registry + validator, see §10
    notes.ts                       # Notes collection helpers, see §11
    noteCategories.ts              # Notes category enum
    valueLaws.ts                   # the 18 Value Laws + evaluateValueLaws(), see §12
    contentManifest.ts             # canonical cross-module content registry, see §12
    buildSmarter.ts                # "Build Smarter With Data" workflow data model, see §12

  components/
    layout/
      BaseLayout.astro             # <head>, SEO, theme, noindex prop, accentColor
      Navbar.astro                 # hardcodes mainNav
      Footer.astro                 # hardcodes footer nav incl. family links
      SEO.astro                    # single metadata layer — canonicals, OG, JSON-LD, robots meta
    ui/                            # generic site-wide primitives (Breadcrumb, MonsterCard, etc.)
    artworks/ArtworkGrid.tsx
    infooo/
      InfoooWorldFoundation.tsx    # shared, renderer-agnostic world shell — see §8
      rubiks/                      # World 002's fully local engine + renderer — see §9
        RubiksCubeMotionGraph.tsx, cubeEngine.ts, cubeMotion.ts, pieceMap.ts,
        rubikExperience.ts, rubiks.css
    notooo/NotoooSheet.astro       # renders one book page, see §10
    notes/Callout.astro, KhizoLink.astro   # Notes MDX components, see §11
    toolbox/                       # Astro primitives (server-rendered, no interactivity)
      TagChip.astro
      PrivacyNotice.astro
      FamilyCard.astro             # button, in-place filter trigger on the hub page
      ToolCard.astro                # anchor to a tool page
      ToolHeader.astro
      shared/                      # REACT primitives used *inside* tool islands — see §6
        InputField.tsx, RangeControl.tsx, Metric.tsx, Warning.tsx, ResultPanel.tsx,
        VisualizationContainer.tsx, DecisionLab.tsx, PresetBar.tsx, AdvancedDisclosure.tsx,
        Insight.tsx, loadImage.ts, exportHelpers.ts, mathHelpers.ts,
        useUrlState.ts, useLocalPref.ts
      tools/                       # the 40 actual tool components — one file per tool

  styles/global.css                # CSS custom properties, light/dark theme — see §4
  utils/url.ts                     # url()/img() helpers, see §2

scripts/                          # audit + test tooling, all run via `node`, see §2 and §12
docs/                              # 28 markdown docs — product specs, governance rules,
                                    #   launch/SEO tracking. Every doc that defines a rule
                                    #   enforced by an audit script is cited in §12.
public/                            # static assets, incl. self-hosted Human Atlas viewer bundle
prototypes/                        # scratch/exploratory work, currently just
                                    #   notooo-design-exploration.html (Notooo's still-
                                    #   unfinished mascot/visual identity — not build-wired)
```

---

## 4. Styling conventions — do not deviate

**No Tailwind classes anywhere**, despite Tailwind being installed. Every element
uses:

- React components: inline `style={{...}}` objects
- Astro components: scoped `<style>` blocks

Both reference the same CSS custom properties, defined once in `src/styles/global.css`
and swapped for dark mode automatically:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--k-bg` | `#F5F5F8` | `#0F1117` | page background |
| `--k-bg-card` | `#FFFFFF` | `#1A1F2E` | card background |
| `--k-bg-elevated` | `#FFFFFF` | `#242938` | nested/elevated surface |
| `--k-text` | `#2A3439` | `#E8EAF0` | primary text |
| `--k-text-muted` | `#6B7280` | `#9CA3AF` | secondary text |
| `--k-border` | `#E5E7EB` | `#2D3348` | borders |
| `--k-accent` | `#f82d48` | (same) | site-wide brand accent (not module-specific) |

Fonts: **Poppins** for headings/labels/UI text (often `fontWeight: 700-900`,
frequently `textTransform: uppercase` + `letterSpacing: .06em` for small labels),
**Mulish** for body copy.

Semantic status colors used throughout Toolooo tool components (not CSS vars, just
convention): good `#22c55e`, warn `#F7933C`, danger `#ef4444`, info `#6CA6FF`.

Card pattern used everywhere: `background: var(--k-bg-card); border: 1px solid
var(--k-border); border-radius: 1rem; padding: 1.5rem;`

Responsive grids: `gridTemplateColumns: repeat(auto-fit, minmax(NNNpx, 1fr))` —
never fixed multi-column layouts. SVG charts: `viewBox` + `style={{width:'100%',
maxWidth:'NNNpx', height:'auto'}}` so they scale down on mobile without horizontal
overflow.

---

## 5. The Toolooo data model (single source of truth)

### `src/data/families.ts`

```ts
export type FamilyId = 'check' | 'simulate' | 'decide' | 'plan' | 'create';
export interface Family { id: FamilyId; name: string; icon: string; question: string;
  description: string; color: string; }
export const families: Family[];              // exactly 5, fixed — do not add more
export const getFamilyById: (id: string) => Family | undefined;
```

Every family's `color` is the *same* value — `TOOLOOO_COLOR`, imported from
`monsters.ts` (`monsters.find(m => m.id === 'toolooo').color`). This encodes a
deliberate site-wide rule: **any page inside a monster's territory themes itself
with that monster's own primary color, not a separate per-section palette.**
Families are visually distinguished by icon + copy, not by hue. This same
pattern should be followed for Infooo/Notooo pages if they ever need internal
sub-sections.

### `src/data/tools.ts`

```ts
export type ToolStatus = 'active' | 'planned' | 'experimental';
export interface Tool {
  id: string; name: string; slug: string;
  shortDescription: string; longDescription: string;
  family: FamilyId; tags: string[]; status: ToolStatus;
  featured?: boolean; privacySensitive?: boolean;
  icon: string; keywords: string[];
}
export const tools: Tool[];                    // all 40, all status: 'active'
export const getToolBySlug, getToolsByFamily, getToolCountByFamily;
export const activeTools, featuredTools, allTags;   // derived, don't hand-maintain
```

Adding a new tool = **add one entry here + create one component file** under
`src/components/toolbox/tools/` + wire it into `src/pages/toolbox/[slug].astro`
(see §5.2). Navigation, counts, related-tools, and family pages all derive
automatically. Also add the tool to `src/data/contentManifest.ts` and pass
`npm run audit:value` — see §12, the content-growth rule applies to every new
tool too.

`privacySensitive: true` tools get a `<PrivacyNotice />` auto-rendered on their
page by `[slug].astro` — do not add a second one inside the tool component itself.

### 5.2 Routing

- `src/pages/toolbox/[slug].astro` — **one file generates all 40 tool pages** via
  `getStaticPaths()` over `tools`. Near the top it has a long but intentional
  block: every active tool component is imported, then conditionally rendered:
  `{tool.slug === 'x' && <X client:load />}`. This is not bloat — Astro
  tree-shakes each static page to only the branch that actually matches, so a
  tool's JS bundle is not shipped on every other tool's page. **When you add a
  tool, add its import + one conditional line here, in the same pattern.**
- `src/pages/toolbox/family/[id].astro` — generates the 5 family detail pages
  from `families`.
- `src/pages/toolbox.astro` — the hub. Family cards + tag filter row + full tool
  grid. Filtering is done via a plain vanilla `<script>` block (no React island —
  deliberate) toggling `hidden` based on `data-family`/`data-tags` attributes on
  `ToolCard.astro`.

---

## 6. Toolooo product philosophy (read before adding/upgrading a tool)

> "Turn invisible problems into visible ones."
> "Don't just give the answer. Make the answer visible."

- 5 fixed families only: **Check** (🩺 "What's wrong? Is this okay?"), **Simulate**
  (🧪 "What happens if I change this?"), **Decide** (⚖️ "Which option makes more
  sense?"), **Plan** (📐 "How should I arrange/build/size this?"), **Create** (🛠️
  "Make something useful for me."). Do not invent a 6th family without an explicit
  ask.
- Every tool prefers a **real visualization** (SVG charts, diagrams, timelines,
  layouts) over a bare number — but every visualization needs a plain-text/numeric
  interpretation alongside it, and must not rely on color alone.
- **Live by default**: changing an input recalculates immediately via `useMemo` —
  no "Calculate" button, except where a tool genuinely processes a pasted/uploaded
  payload.
- **Basic/Advanced split**: common controls visible by default, less-common ones
  behind `<AdvancedDisclosure>`. Don't show 15 inputs at once.
- **Presets matter**: a user should understand a tool without inventing realistic
  input data themselves — see `<PresetBar>`.
- **Decision tools never claim absolute truth.** Always "for the priorities you
  selected, X scores highest," never "X is the best." The shared `DecisionLab`
  component enforces this framing.
- **Privacy**: any tool handling pasted/uploaded user content (JSON, JWTs,
  headers, images) processes 100% client-side, shows the `<PrivacyNotice/>`
  (auto-rendered, don't duplicate), and never logs/persists the raw content —
  including not putting it in `localStorage` or URL state.
- **No fake precision**: simplified/heuristic models say so briefly, once, not
  repeatedly.
- **Mobile is mandatory**: no horizontal overflow, stacked controls, responsive SVGs.
- **Don't chase feature count.** A feature is only justified if it saves time,
  reveals something hard to see, improves a decision, prevents a mistake, makes a
  result reusable, or explains *why* something happens.

### Shared React primitives (under `src/components/toolbox/shared/`)

Read the actual files (they're short) rather than trusting a paraphrase, but as
a map:

| File | Purpose |
|---|---|
| `InputField.tsx` | labeled text/number input, optional suffix |
| `RangeControl.tsx` | labeled slider with live value readout |
| `Metric.tsx` | a single stat card (label/value/color/sublabel) |
| `Warning.tsx` | `level: info\|warn\|danger\|good` callout |
| `ResultPanel.tsx` | generic titled bordered card |
| `VisualizationContainer.tsx` | bordered, horizontally-scrollable box for SVG/canvas |
| `DecisionLab.tsx` | **generic weighted-priority comparison engine.** Takes `dimensions`, `options` (each with `scores` and optional `dealBreakers`), `assumptionsNote`, `accent`. Renders sliders, sorted score bars, an auto-computed "what would change the winner" hint, a per-dimension "category winner" pill row (3+ options only), a breakdown table, and a collapsible assumptions note. Prefer wrapping this over duplicating scoring logic. |
| `PresetBar.tsx` | generic `{label, values}[]` → pill buttons that populate a tool's inputs at once |
| `AdvancedDisclosure.tsx` | `<details>` wrapper for advanced controls, collapsed by default |
| `Insight.tsx` | structured "Result / Why it matters / Action" block (relabeled from an earlier "What/Why/Try" naming — same shape) |
| `loadImage.ts` | `loadImageFromFile(file) → Promise<{image, width, height, fileSizeBytes, mimeType, fileName}>` |
| `exportHelpers.ts` | `downloadSVG`, `downloadCanvasPNG`, `downloadJSON`, `copyText` — all local, no upload. Now also calls `trackToolExport(type)` from `src/utils/analytics.ts` on every export — keep that call if you touch this file, it feeds the LV3 analytics contract (§12). |
| `mathHelpers.ts` | `safeNumber`, `clamp`, `safeDiv`, `formatNumber` — use these to keep NaN/Infinity/crashes out of the UI on empty/zero/extreme input |
| `useUrlState.ts` | mirrors a plain-value state object into the URL query string (`replaceState`, no navigation) for shareable configs. **Never** pass sensitive/large values (pasted payloads, tokens, file contents) through this. |
| `useLocalPref.ts` | tiny `useState`+`localStorage` hook for small non-sensitive per-viewer preferences. Same rule — never persist sensitive pasted content. |

Every tool component's contract: `export default function ToolName()` — **no
props**. The page (`[slug].astro`) renders it as `<ToolName client:load />`. Don't
change this shape without also updating `[slug].astro`.

---

## 7. Current state of all 40 Toolooo tools

All 40 tools are **active**. Every tool follows the shared conventions above.

**Check (6)**: API Payload Doctor, JWT Time Machine, CORS Doctor, Print Ready
Doctor (absorbed a previously-separate "Artwork Print Doctor" tool that was
deliberately removed/merged — if you see that name anywhere, it's stale), Schema
Drift Doctor, Environment Drift Detector.

**Simulate (14)**: Responsive Content Fit Lab, Webhook Delivery Simulator,
Capacity Cliff Simulator, Retry Storm Simulator, Cache Value Simulator, Rate
Limit Playground, Queue Capacity Planner, SLA Chain Visualizer, Fan-Out Latency
Simulator, Circuit Breaker Playground, N+1 Query Visualizer, Connection Pool
Simulator, HTTP Cache Lab, Scope Creep Visualizer.

**Decide (7)**: AI Project Pricing Lab, Database Decision Lab, Build vs Buy,
Tech Stack Battle, Distributed Systems Tax, Monolith vs Microservices Lab, REST
vs GraphQL Decision Lab (includes gRPC as a 3rd option plus a "Real-time/
Streaming" dimension — don't revert to a 2-way comparison without asking).

**Plan (8)**: Multi-Format Campaign Planner, API Pagination Planner, Sticky Note
Frame Planner, Timeout Chain Planner, Frame Fit Finder, Paper Nesting Planner,
Project Quote Risk Planner, Roadmap Collision Detector.

**Create (5)**: Crop Guardian, Drawing Grid Maker, Bleed & Safe Area Builder,
Value Study Maker, Perspective Grid Maker (draggable vanishing points — a real
click-and-drag canvas interaction, not just sliders).

`npm run build` currently succeeds with **zero errors, 68 total generated
pages** (40 tool pages + 5 family pages + toolbox index + Infooo/Notooo/Notes/
misc pages). Treat any build failure as blocking. Page counts will keep shifting
as content grows — don't hardcode this number elsewhere; use `npm run audit:seo`
for a live count if you need one.

8 Simulate-family regression-test scripts exist under `scripts/` but aren't
wired into any npm script (see §2) — run them manually after touching Simulate
tool math.

---

## 8. The Infooo world framework

**Infooo is the UNDERSTAND pillar.** It's a shared, renderer-agnostic shell plus
a typed contract that every interactive "world" plugs into — each world owns its
own rendering/domain logic locally, the framework never imports a renderer.

- **Contract**: `src/data/infooo.ts` exports `InfoooWorld` (id, slug, title,
  description, `status: idea|research|prototype|private|ready|published|
  retired`, `visibility: private|public`, worldNumber, `interactions[]` from a
  fixed vocabulary — explore/isolate/layer/explode/animate/compare/timeline/
  simulate/what-if/connect/focus/reset — `modes[]`, optional entities/
  relationships/knowledge/layers/guides/whatIfScenarios/compareModes, share/
  performance/accessibility flags, and a `valueScore` (Value Laws, §12). It also
  exports `infoooWorlds: InfoooWorld[]` (the registry) and
  `infoooDesignContract` (explicit boundaries: "Not Wikipedia with prettier
  CSS", "Not a generic 3D model viewer", etc.).
- **Shared shell**: `src/components/infooo/InfoooWorldFoundation.tsx` exports
  presentation-only primitives — `InfoooWorldShell`, `InfoooStage`,
  `InfoooToolbar`, `InfoooModeSwitcher`, `InfoooLayerControl`,
  `InfoooSearchPanel`, `InfoooEntityPanel`, `InfoooKnowledgePanel`,
  `InfoooRelationshipPanel`, `useInfoooGuide`, `InfoooGuideControls`,
  `InfoooScenarioControl`, `InfoooCompareLayout`, `InfoooMobileSheet`,
  `InfoooLoadingState`, `InfoooErrorState`, `InfoooSourceDisclosure`,
  `useInfoooReducedMotion`. No renderer/rendering library is imported here.
- **Learning loop**: `infoooExperienceLoop = ['see','explore','isolate',
  'connect','understand']` plus `infoooExperienceCopy` are exported as data
  from `infooo.ts`, but as of this writing **nothing in `src/` actually imports
  or renders them** — the loop's spirit is realized ad hoc per world (search/
  select ≈ See+Explore, layer controls ≈ Isolate, relationship panels ≈
  Connect, knowledge panels ≈ Understand), not as a shared, labeled UI
  step-tracker. Building that shared component would be a legitimate
  cross-world improvement if ever prioritized.
- **Routing**: one static `.astro` file per world under `src/pages/infooo/`
  (`index.astro` hub + one file per world), **not** a dynamic `[slug].astro`.
  Each page looks up its own record from `infoooWorlds` by id.
- **Future-world workflow** (per `docs/INFOOO-FRAMEWORK.md`): fill out
  `docs/INFOOO-WORLD-TEMPLATE.md` (Identity / Experience / Truth-and-care /
  Release-readiness) → pass Value Laws checks → add a **published** registry
  record only after Khizar's release approval → build the renderer/data
  locally → compose the shared shell components → add real source-attribution
  metadata → add the approved public route + full content-growth footprint
  (§12) → build + audit.

### World 001 — Human Atlas (published, public, live at `/infooo/human-atlas`)

Per `docs/HUMAN-ATLAS.md`, this is a **self-hosted, precompiled third-party
viewer** (BodyParts3D data, `ashemag/human-atlas` origin), embedded via
`<iframe src="/infooo/human-atlas-viewer/index.html">`, with a small vanilla-JS
"learning layer" (`public/infooo/human-atlas-viewer/learning-layer.js`) bolted
on top. **It does not use `InfoooWorldFoundation.tsx` at all** — no shared
panels are rendered. `src/data/humanAtlasLearning.ts` (entities/relationships/
follow-the-blood guide) feeds the `infooo.ts` registry record but is a
**second, independent copy** of the same knowledge that also lives hardcoded in
the plain-JS `learning-layer.js` that the iframe actually loads — editing one
does not update the other; keep both in sync manually if you touch Human
Atlas content. The doc itself says this is "a working loading-repair/learning-
layer patch," not the full flagship spec — native source adaptation is
separate future work. `npm run audit:human-atlas` checks the iframe/viewer
wiring, noindex-on-the-viewer-itself, canonical pointing back to the public
page, and that all viewer assets are self-hosted under `/infooo/`.

### World 002 — Rubik's Cube Motion Graph (published, public, live at `/infooo/rubiks-cube-motion-graph`) — see §9

---

## 9. Infooo World 002 — Rubik's Cube Motion Graph — CURRENT STATUS

**Feature-complete and publicly published as of 2026-09-25.** If you're picking
up a Rubik's-Cube-related task, start here — but this is now steady-state
maintenance/enhancement territory, not a from-scratch build.

- **Route**: `src/pages/infooo/rubiks-cube-motion-graph.astro`, renders
  `<RubiksCubeMotionGraph client:load world={world} />`. No `noindex` prop,
  and `/infooo/rubiks-cube-motion-graph/` is **not** in `astro.config.mjs`'s
  `sitemapExcludedRoutes` — it ships in `sitemap-0.xml` and is linked from the
  `/infooo/` hub. Registry record in `infooo.ts`:
  `status: 'published', visibility: 'public'`. Its Compound Value pack lives
  in `contentManifest.ts`'s public `compoundValuePacks` array (not the
  review-only one). Full title/description/canonical/OG/Twitter/JSON-LD
  (`WebApplication` + `BreadcrumbList`) metadata per the content-growth rule.
- **What it is**: a genuinely multi-size cube (2×2 / 3×3 / 4×4, 3×3 default)
  paired with a "motion graph" (orbital diagram of the movable pieces, grouped
  by orbit at 4×4) that teaches how face turns permute cube state. Core
  promise: **TURN · TRACE · UNDERSTAND**.
- **Engine files** (`src/components/infooo/rubiks/`):
  `cubeEngine.ts` (canonical cube state, **size-aware** via `CubeSize = 2|3|4`
  and `coordsForSize(size)` — corner ids always unique by color-set, edge/
  center ids only get a `:home` suffix when `size === 4`, where multiple
  physical pieces share a color-set), `pieceMap.ts` (motion-graph token
  placement — legacy exact-position table at 3×3, sign-pattern corner ring
  reused at every size, grouped-ring layout with per-orbit spread for 4×4's
  24 edge-wings/24 centers), `rubikExperience.ts` (`cubeSizes`,
  `defaultCubeSize`, real `randomScramble`-backed `newScramble(size)`; the
  original curated `oneTurnSequence`/`workingExampleSequence` fixtures remain
  as engine-level test data, no longer reachable from the UI — see below),
  `cubeMotion.ts` (camera/viewpoint math — `CameraAngle`/`ViewInput` support a
  free `{yaw,pitch}` angle *or* a named `Viewpoint` preset everywhere,
  `presetAngle`/`nearestViewpoint`/`isNearPreset` bridge the two,
  `cubeSurfaces()`, `pieceVisible()`, `revealView()`), `RubiksCubeMotionGraph.tsx`
  (the component), `rubiks.css`.
- **Camera**: a genuine continuous 360° drag-to-orbit camera (Pointer Events,
  mouse + touch) on the Cube view, with the six named viewpoints
  (Front/Right/Back/Left/Top/Bottom — **Bottom is what makes yellow/Down
  reachable at all**, every other preset has positive pitch so Down's normal
  can never win the visibility dot-product test without it) kept as one-tap
  jump-to presets, not the only way to look around. A small pixel-movement
  threshold disambiguates drag-to-orbit from click-to-select-a-sticker.
- **No manual per-face turning.** The original face-turn button panel (6 face
  buttons, clockwise/counter-clockwise/double modifiers, Undo, and the
  3×3-only "See one turn"/"Trace one piece" flagship demos) was **deliberately
  removed entirely** — state, handlers, and UI — per direct user feedback that
  it added complexity without teaching value beyond what Randomize/Watch-it-
  solve already demonstrate. Every move now happens through "Randomize cube"
  (real legal-move scramble, size-appropriate length, never fake colors) and
  "Watch it solve" (reverses that exact scramble — disclosed as such, not
  presented as an optimal/CFOP/general solver), with Play/Pause/One-step/
  Step-back/0.5×–2× speed/Restart controls.
- **Layout**: `.infooo-world-shell` is 1680px max-width (widened from the
  original 1380px). The camera-controls block (location/hidden-piece status +
  drag hint + the six preset buttons) and the playback/solve card sit as two
  equal columns in one row (`.rubik-controls-row`, CSS Grid,
  `:only-child` spans full-width before a scramble exists), collapsing to one
  column on mobile. Turns always animate (no `prefers-reduced-motion` gate —
  it's a short, explicitly-triggered interaction, not ambient motion). The
  affected-piece highlight is always on, not an opt-in toggle. There is no
  "WHY IT MOVED"/"THIS PIECE" card and no "Animate turns" checkbox — all
  removed.
- **Verification**: `npm run test:rubiks-cube` (hand-rolled engine/geometry
  assertions incl. a permanent six-color-visibility regression guard),
  `npm run audit:publish`, and a live browser pass (drag-to-orbit, preset
  jumps, 4×4 randomize→solve, mobile viewport) all pass. See
  `docs/INFOOO-RUBIKS-CUBE-MOTION-GRAPH.md` for the full validation log across
  every round of this feature's development.

If you're given a further brief for this world (deeper accessibility polish,
a richer Cube↔Motion Graph shared context, new cube sizes), treat this section
as ground truth for what's already shipped — verified against the actual code,
not inferred from an older doc.

---

## 10. Notooo module — "One Book. One Page."

**Notooo is the REMEMBER pillar**, fully separate from Toolooo/Infooo. Product
concept: one A4-portrait visual knowledge page per book, produced through a
documented editorial pipeline (research → compress → khizooo curation → typed
registry entry).

- **Data model**: `src/data/notooo.ts` — `notoooIdentity` (role REMEMBER,
  tagline "One Book. One Page.", color `#E38D7C`, **mascot art not finalized
  yet** — `mascot: null`, and `monsters.ts`'s `notooo` entry still points at a
  reserved placeholder image `ff-04.png` with an explicit code comment that
  it's not final). `NotoooBook` interface: id/number/slug/title/author/
  category/tags/bigIdea/4–8 sections (each ≤3 points + sourceIds)/
  khizoooTake/remember/sources/researchConfidence(`high|medium|low`, published
  entries can't be `low`)/status(`draft|approved|published`).
- **Content right now**: `notoooBooks` has **exactly 7 published entries** —
  Atomic Habits, Thinking Fast and Slow, The Psychology of Money, Braiding
  Sweetgrass, Man's Search for Meaning, Steve Jobs, Sapiens. No draft/approved-
  only entries currently exist.
- **Validator**: `assessNotoooBooks()` in the same file enforces unique ids/
  numbers/slugs/section-ids/source-ids, HTTPS source URLs, the
  published-can't-be-low-confidence rule, section-count targets, and word
  budgets — run via `npm run audit:value`.
- **Rendering**: `src/pages/notooo.astro` (hub, lists all published books by
  category) → `src/pages/notooo/[slug].astro` (`getStaticPaths()` over
  published books) → `src/components/notooo/NotoooSheet.astro` (the actual
  page renderer, supports fullscreen + PNG download). Full SEO/JSON-LD
  (CreativeWork/Book) per the content-growth rule.
- **Rule from `docs/NOTOOO.md`**: "Notooo owns ideas from books that are worth
  keeping. It must not blur into a Toolooo workflow or an Infooo interactive
  world." Add a public entry only after Khizar approves release; reuse
  `notooo.ts` and `NotoooSheet.astro`, don't build a page-specific parallel
  system.
- A scratch design-exploration file (`prototypes/notooo-design-exploration.html`,
  not build-wired) exists, tied to the still-unfinished Notooo mascot/visual
  identity — reference material, not something the build consumes.

---

## 11. Notes module — plain written notes (not a monster)

Explicitly documented as separate from Notooo: `docs/NOTES.md` — *"Notes are
file-based written knowledge. They are not a monster and do not replace
Notooo's One Book. One Page. visual book format."*

- **Schema**: `src/content.config.ts` defines one Astro content collection,
  `notes`, glob-loaded from `src/content/notes/**/*.{md,mdx}`, Zod-validated
  (title 3–52 chars, description 30–160 chars, hyphenated slug, category from
  `noteCategories.ts`, tags ≤8, `status: draft|published` default draft,
  `publishedAt` required when published, image/imageAlt/imageWidth/
  imageHeight must all be present or all absent).
- **Content right now**: `src/content/notes/` has **zero real entries** — only
  a `.gitkeep` and one non-public `__fixtures__/mdx-smoke-test.mdx` (status
  draft, exists purely to smoke-test the MDX build path). This is a deliberate
  "foundation ready, no content yet" state, not a bug.
- **Empty-state behavior is enforced by tooling, not accidental**:
  `src/pages/notes.astro` sets `noindex={!hasPublishedNotes()}` and shows a
  placeholder message when there are zero published notes;
  `astro.config.mjs` excludes `/notes/` from the sitemap the same way;
  `scripts/audit-seo.mjs` explicitly fails the build if `/notes/` is noindex
  but still renders note cards, or is indexable without any.
- **To add a real note**: create `src/content/notes/<category>/<file>.md(x)`
  with `status: draft` until approved, then run `npm run build` +
  `audit:seo` + `audit:value` + `audit:prelaunch` before flipping to
  `published` (per `docs/NOTES.md`'s documented workflow).
- **Components**: `src/components/notes/Callout.astro` (note/warning/tip
  aside), `KhizoLink.astro` (internal-link helper enforcing lowercase-hyphen
  slugs, with root mappings for note/toolooo/infooo/notooo).

---

## 12. Governance, Value Laws & the publish-gate audit pipeline

This is unusually real for a personal-project docs folder: the governance docs
below aren't aspirational — their exact wording and numeric thresholds are
**parsed and asserted against by `scripts/audit-value.mjs` and
`scripts/audit-prelaunch.mjs`** at audit time, so the docs and the code cannot
silently drift apart without breaking `npm run audit:publish`. If you ever edit
one of these docs' key phrasing, check whether the matching audit script needs
a matching update in the same change.

- **`AGENTS.md`** (repo root) — the **content-growth rule** that heads this
  whole system: every new public page/tool/artwork/Infooo world/collection
  must ship, in the same change, with unique title+description+canonical+OG/
  social metadata, structured data + internal links, sitemap/image-sitemap
  coverage, correct robots/indexability, accessible assets with real alt text,
  and the relevant SEO/domain/pre-launch validation — **and must not be added
  to the sitemap or made indexable before Khizar approves its public
  release.**
- **`docs/KHIZOOOLOGY-VALUE-LAWS.md`** — 18 named laws (utility, unity, depth,
  identity, discovery, visuality, interaction, truth, clarity, actionability,
  shareability, compoundValue, maintainability, measurability, surprise,
  originalContribution, respect, craft), each scored 0/1/2, max 36. Decision
  bands: REJECT (0–17) / REWORK (18–23) / PROTOTYPE (24–29) / STRONG (30–33) /
  FLAGSHIP (34–36). **`utility`, `identity`, or `truth` scoring 0 is a hard
  REJECT gate regardless of total.** Implemented verbatim in
  `src/data/valueLaws.ts` (`evaluateValueLaws()`).
- **`docs/KHIZOOOLOGY-PUBLISHING-CHECKLIST.md` /
  `docs/PUBLISHING-QUALITY-CHECKLIST.md`** — the concrete pre-publish gate:
  run `npm run audit:publish`, answer a manual checklist (real value mode
  USE/UNDERSTAND/FEEL/REMEMBER/SHARE, truthful claims, private input stays
  browser-side, no overflow at 320/375/390px, keyboard/screen-reader
  reachable, meaningful alt text, indexing actually deserved, canonical
  registry reused not duplicated, monster voice preserved, no unnecessary
  JS/deps, "would Khizar publish this today"), apply per-module conditional
  gates, classify severity P0(blocked)/P1(blocked-until-fixed)/P2(ready or
  review), then a post-deploy production smoke check.
- **Mystery Monster Unlock Gate** (`docs/MYSTERY-MONSTER-UNLOCK-GATE.md`) —
  the mechanism behind the 5 generic `???ooo` entries in `monsters.ts`
  (§1). Enforced end-to-end: generic name/module/description/tagline, id
  pattern `future-\d+`, no `role` field, shared "mystery" voice only, and the
  **built** `dist/future-monsters/index.html` is asserted `noindex,follow`
  with no leaked historical names (`devooo`, `freeooo`, raw `future-N` ids).
- **Monster Voice System** (`docs/MONSTER-VOICE-SYSTEM.md`,
  `src/data/monsterVoices.ts`) — `getMonsterVoice(monster)` returns a
  4-context microcopy set (intro/discovery/empty/next) per monster, or the
  shared `mysteryMonsterVoice` for any `coming-soon` monster, or
  `baseMonsterVoice` as fallback. Actually consumed by `artworks.astro`,
  `toolbox.astro`, `infooo/index.astro`, `infooo/human-atlas.astro`, and
  `future-monsters.astro` — not dead code.
- **Compound Value Workflow / Build Smarter With Data**
  (`docs/COMPOUND-VALUE-WORKFLOW.md`, `docs/BUILD-SMARTER-WITH-DATA.md`,
  `src/data/contentManifest.ts`, `src/data/buildSmarter.ts`) — a deliberately
  **manual, local-only** workflow (no social APIs, no OAuth, no background
  jobs, no CMS, no server, no runtime AI). Rules enforced: content only
  references real canonical source/related IDs, no raw visitor data anywhere,
  a "published" social draft requires prior human approval, insufficient
  evidence means HOLD not ship, and any example data must be labeled
  synthetic (`synthetic: true, humanReviewRequired: true`).
- **`docs/CREATIVE-RD-LAB.md`** — the "Think → Create Ideas → Score →
  Prototype → Build → Verify → Publish → Share → Measure → Improve → Build
  Smarter" workflow arrows referenced by the Value Laws / Compound Value docs.

**Practical takeaway for any new work**: before calling something done, run
`npm run audit:publish` (build + SEO/prelaunch/domain audits + `astro check` +
value-law audit). If it's a new Infooo world or a page that should stay
private, double-check `visibility`/`status` in its registry, the page's
`noindex` prop, and `astro.config.mjs`'s `sitemapExcludedRoutes` all agree —
these three gates are checked independently and must all say the same thing.

---

## 13. Session history (append to this, don't just overwrite it)

**Toolooo V2 upgrade** (earlier session): every MVP-depth Toolooo tool
rewritten to add presets, richer visualizations, Basic/Advanced control
splits, deal-breaker-aware decision scoring, draggable/interactive canvases,
and exports, using a shared new foundation (`PresetBar`, `AdvancedDisclosure`,
`Insight`, `mathHelpers`, `exportHelpers`, `useUrlState`, `useLocalPref`, an
upgraded `DecisionLab`). Executed via many parallel AI subagents; two lessons
from that session worth remembering:
1. A subagent reporting "failure" doesn't always mean its file write failed —
   several completed successfully and only failed to report success because a
   session/usage limit was hit at that exact moment. A clean `npm run build`
   and actual line-count/content are more reliable signals than an agent's own
   reported status.
2. GitHub Desktop auto-stashed the working tree mid-session more than once
   (see §2) — always check `git stash list` before assuming edits are lost.

**Since then** (this session's investigation, 2026-09-25): the repo grew
substantially beyond what the prior handoff covered — Toolooo went 32→40
tools, and three entirely new systems were added: **Infooo** (interactive
worlds — Human Atlas published, Rubik's Cube Motion Graph in private
development, §8–§9), **Notooo** (7 published book pages, §10), and **Notes**
(schema-complete, zero content yet, §11) — plus a full governance/audit
pipeline (§12) that didn't exist before. This document was rewritten to
reflect all of that.

**Rubik's Cube Motion Graph — multi-size upgrade, feedback rounds, and public
release** (2026-09-25, same day as the investigation above): the engine was
generalized from a hardcoded 3×3×3 to size-aware 2×2/3×3/4×4; the yellow
(Down-face) visibility bug was root-caused and fixed with a 6th Bottom
viewpoint; a live-solve player, then a genuine continuous drag-to-orbit
camera, were built; the original manual per-face-turn button panel and its
backing state were removed entirely after direct user feedback; the layout
was widened and the camera-controls/playback cards were put into a two-column
row; and — after verifying the feature and its SEO were complete — World 002
was flipped to `status: 'published', visibility: 'public'`, linked from the
`/infooo/` hub, added to the sitemap, and had its Compound Value pack moved
into the public manifest, with the review-only audit guardrails in
`audit-value.mjs`/`audit-prelaunch.mjs`/`audit-seo.mjs` updated to assert the
new public state instead. Separately, `/my-portfolio/`'s reported
`ProfilePage.mainEntity` Search Console issue was investigated and found
already fixed in the shipped code (verified via the built HTML and
`audit-seo.mjs`'s dedicated ProfilePage check) — no code change was needed
there; that GSC report is stale crawl data. See §9 for the Rubik's Cube
world's current-state details.

---

## 14. Known non-issues (don't "fix" these)

- `frop-a-vibe.astro` — deliberate typo-redirect to `/drop-a-vibe`, not a stray
  duplicate.
- `src/data/navigation.ts`'s `mainNav`/`footerNav` exports are dead code (the
  real Navbar/Footer hardcode their own lists) but are still kept in sync by
  convention.
- The 5 `???ooo` mystery monsters sharing identical copy/route — intentional,
  see the Mystery Monster Unlock Gate in §12.
- The `MonsterStatus` type's `'foundation'` value is declared but currently
  unused by any monster entry — reserved type surface, not a bug.
- Notooo's mascot image is a known, explicitly-commented placeholder
  (`ff-04.png`, reused from a reserved lab asset) — final art not done yet.
- Notes has zero real content despite complete plumbing — deliberate
  "foundation ready" state, see §11.
- `README.md` is stale (describes a retired `freeooo` monster, dead
  `/infographics`/`/freebies` routes, and disagrees with itself on the Astro
  major version) — see the callout in §2. Worth a real update pass at some
  point, but don't treat its content as current fact meanwhile.
- The "planned"/"experimental" `ToolStatus` values and the `ComingSoonCard`
  component exist for future use but every current tool is `'active'`.

## 15. Open items / fair game for future work

- 8 Toolooo Simulate-family regression scripts (§2, §7) aren't wired into any
  npm script — worth a `test:toolooo-models` aggregate.
- `infoooExperienceLoop`/`infoooExperienceCopy` (§8) are declared but unused —
  a shared "SEE → EXPLORE → ISOLATE → CONNECT → UNDERSTAND" step-tracker
  component would be a legitimate cross-world investment if ever prioritized.
- Human Atlas's knowledge content is duplicated between
  `src/data/humanAtlasLearning.ts` and the plain-JS viewer bundle (§8) — could
  be unified so one edit updates both, though that would mean changing the
  precompiled third-party viewer bundle, which is a bigger call.
- `README.md` needs an accuracy pass (§2, §14) — not urgent, but it actively
  contradicts the site's own governance rules right now.
- Several `SEO-LAUNCH-CHECKLIST.md` checkboxes are unchecked even though later
  docs (`MISSION-5-VALIDATION.md`, `SEARCH-MEASUREMENT-BASELINE.md`) report
  the same items as owner-confirmed done — worth reconciling the checklist
  file itself so it isn't misleading.
- `useUrlState` (shareable tool configs) is only wired into a subset of
  Toolooo tools — could extend to more Simulate/Decide tools where sharing a
  scenario is genuinely useful (never to tools handling sensitive pasted
  content).
- No local-storage-based "favorites"/"recent tools" list exists yet, though
  `useLocalPref` is ready to support one.

---

## 16. SEO foundation

- `src/components/layout/SEO.astro` is the single metadata layer — canonicals,
  social URLs, schemas, `robots.txt`, and both sitemaps all derive from
  Astro's configured `site`/`base`.
- Production is `https://khizooology.com/` with a root `/` base (see §2).
- Indexability is controlled per-route by two independent mechanisms that must
  agree (§12): the `SEO.astro`/`BaseLayout` `noindex` prop, and
  `astro.config.mjs`'s `sitemapExcludedRoutes` set (also conditionally
  excludes `/notes/` while it has zero published entries).
- `npm run audit:seo` builds first, then checks titles, descriptions,
  canonicals, robots, H1s, social metadata, JSON-LD, internal references,
  assets, sitemap consistency, and placeholder/lorem text. Don't hand-trust a
  specific "N indexable pages" figure in any doc (including this one) — it
  shifts as content is added; re-run the audit for a current count.
- Search-engine account state (GSC/Bing/GA4/IndexNow) is tracked in
  `docs/MISSION-5-VALIDATION.md` and `docs/SEARCH-MEASUREMENT-BASELINE.md` —
  treat those as more current than `docs/SEO-LAUNCH-CHECKLIST.md`'s own
  checkbox state (see §15).

---

## 17. Quick-start checklist for a new session

1. `npm install` (Node >= 22.19.0), then `npm run dev` → `http://localhost:4321`.
2. Before any git operation: `git status` and `git stash list` first (§2).
3. Read the relevant `src/data/*.ts` registry before touching any module —
   they're short and are the actual source of truth (not the docs, not this
   file, if they disagree).
4. Never hardcode a path — use `url()`/`img()` (§2).
5. Never add Tailwind classes — inline `style={{}}` + the `--k-*` CSS
   variables (§4).
6. Before calling anything done: `npm run build` must succeed, and for
   anything publish-adjacent, `npm run audit:publish` must pass (§12). For
   pure content/SEO changes, `npm run audit:seo` alone is a faster loop.
7. If touching Infooo world visibility/indexability, double-check the
   registry `status`/`visibility`, the page's `noindex` prop, and
   `astro.config.mjs`'s exclusion set all agree (§12).
8. Do not print the git remote URL. Do not commit, push, or deploy unless
   explicitly asked.
9. When you finish a body of work, **update this document** — especially §9
   (current in-flight status) and §13 (session history) — before handing off.
