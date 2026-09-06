# Khizooology — Handoff for Codex / ChatGPT Plus

This document briefs a new AI collaborator (or a new human dev) on the `khizology`
repository: what it is, how it's built, what conventions must be respected, and
exactly where the most recent major work (the "Toolooo V2" upgrade) left off.

Read this fully before making changes. The codebase has strong, deliberate
conventions — deviating from them (adding Tailwind classes, introducing a backend,
hardcoding `/toolbox` instead of using `url()`) will visibly break the site or its
deployment.

---

## 1. What this project is

**Khizooology** is Khizar Imtiaz's personal site. Its tagline is **Art meets Code.**
The site is built around a **monster mascot system**. Each major site section is
personified as a monster:

- **artooo** — Artworks (sticky-note art, sketches, illustrations)
- **toolooo** — Toolbox (40 free, browser-only developer/freelance/art utilities —
  this is where almost all recent work happened)
- Several **coming-soon "???ooo" mystery monsters** on `/future-monsters` (a few of
  these secretly carry the retired brand colors/art of old modules — see
  `src/data/monsters.ts`, not something to "fix," it's intentional)

Site tagline pattern: "Turn invisible problems into visible ones. Don't just give
the answer. Make the answer visible." This philosophy governs Toolooo specifically
— see §6.

---

## 2. Tech stack & hard constraints

- **Astro 7** (static output, `output: 'static'` in `astro.config.mjs`)
- **React 19** islands (`client:load`) only where a component needs interactivity
- **TypeScript**
- **Tailwind 4** is installed (`@tailwindcss/vite`) but **is not used anywhere in
  practice** — see §4 styling conventions. Do not add Tailwind utility classes;
  follow the existing inline-style/CSS-variable pattern instead.
- **GitHub Pages** deployment via GitHub Actions (`.github/workflows/deploy.yml`),
  triggered on push to `main`. Production site config:
  - `site: 'https://khizooology.com'`
  - `base: '/'`
- **No backend of any kind.** No API routes, no serverless functions, no database,
  no auth, no server-side secrets. Everything must run in the browser. This is a
  hard constraint for the entire Toolooo module — see §6.

### `npm` scripts

```
npm run dev       # astro dev, localhost:4321
npm run build     # astro build → dist/ (production)
npm run preview   # serve the built dist/ locally
```

Node >= 22.19.0 required (`engines` in `package.json`).

### The `url()` / `img()` helpers — mandatory

`src/utils/url.ts` exports two helpers that prepend `BASE_URL`:

```ts
url('/toolbox')          // → '/toolbox' at the production-domain root
img('/images/foo.png')   // same, for asset paths
```

**Every internal `href` and asset `src` in the codebase must go through one of
these.** This keeps route and asset paths correct if the deployment base changes
during local validation — always grep for raw `href="/` or `src="/` before
shipping anything that adds links.

### Git safety — read before touching git

- **Do not run `git remote -v` or otherwise print/expose the git remote URL.** It
  is known to contain an embedded personal access token from an earlier handoff.
  Never paste it into chat, commits, or logs.
- **Do not commit unless explicitly asked.** The user reviews and commits
  themselves in most sessions.
- **GitHub Desktop is used alongside AI-driven edits in this repo**, and has been
  observed to **auto-stash the working tree mid-session** (visible as
  `stash@{N}: WIP on main` in `git stash list`) — apparently triggered by some
  interaction in the GitHub Desktop GUI while an agent is mid-edit. This caused a
  real incident during the Toolooo V2 work where several completed file edits
  vanished from the working tree and had to be recovered with
  `git stash show --stat` / `git checkout stash@{N} -- <path>`. **If files you
  expect to be modified suddenly look reverted to their last-committed state,
  check `git stash list` before assuming your own edit was lost or wrong** — the
  content is very likely sitting safely in a stash. Do not `git stash drop`
  anything without first confirming its contents are no longer needed elsewhere.

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
    future-monsters.astro
    404.astro
    toolbox.astro                 # Toolooo hub: hero, 5 family cards, tag filters, tool grid
    toolbox/
      [slug].astro                 # dynamic route — ONE file generates all 40 tool pages
      family/[id].astro            # dynamic route — generates the 5 family detail pages

  data/                           # SINGLE SOURCE OF TRUTH — see §5
    families.ts                    # 5 Toolooo families
    tools.ts                       # all 40 tools' metadata
    monsters.ts                    # monster roster (drives homepage/footer/cross-links)
    site.ts                        # global site meta
    navigation.ts                  # NOTE: mainNav/footerNav exports here are DEAD CODE,
                                    #   not consumed by the real Navbar/Footer components
                                    #   (which hardcode their own lists). Kept in sync by
                                    #   convention but double-check before trusting it.
    artworks.ts                    # artooo gallery data

  components/
    layout/
      BaseLayout.astro             # <head>, SEO, theme, accepts accentColor/accentColorLight
      Navbar.astro                 # hardcodes mainNav: Home / Portfolio / Artworks / Toolbox
      Footer.astro                 # hardcodes footer nav incl. family links
      SEO.astro
    ui/                            # generic site-wide primitives (Breadcrumb, MonsterCard, etc.)
    artworks/ArtworkGrid.tsx
    toolbox/                       # Astro primitives (server-rendered, no interactivity)
      TagChip.astro
      PrivacyNotice.astro
      FamilyCard.astro             # button, in-place filter trigger on the hub page
      ToolCard.astro                # anchor to a tool page
      ToolHeader.astro
      shared/                      # REACT primitives used *inside* tool islands — see §6.4
        InputField.tsx, RangeControl.tsx, Metric.tsx, Warning.tsx, ResultPanel.tsx,
        VisualizationContainer.tsx, DecisionLab.tsx, PresetBar.tsx, AdvancedDisclosure.tsx,
        Insight.tsx, loadImage.ts, exportHelpers.ts, mathHelpers.ts,
        useUrlState.ts, useLocalPref.ts
      tools/                       # the 40 actual tool components — one file per tool

  styles/global.css                # CSS custom properties, light/dark theme — see §4
  utils/url.ts                     # url()/img() helpers, see §2
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
| `--k-accent` | `#f82d48` | (same) | site-wide brand accent (not Toolooo-specific) |

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

**Important recent change**: `color` on every family is now the *same* value —
`TOOLOOO_COLOR`, imported from `monsters.ts` (`monsters.find(m => m.id ===
'toolooo').color`, currently `#F7933C`). This encodes an explicit site-wide rule
requested by the user: **any page inside a monster's territory themes itself with
that monster's own primary color, not a separate per-section palette.** Families
are visually distinguished by icon + copy, not by hue. If a future family or a new
monster module is added, follow the same pattern — don't reintroduce multiple
accent colors within one monster's pages. (There's a code comment on
`TOOLOOO_COLOR` in `families.ts` explaining this — read it before changing
family colors.)

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
automatically — you should never need to touch the hub page, family pages, or
routing when adding a tool's data.

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
  deliberate, this doesn't need client-side framework overhead) toggling `hidden`
  based on `data-family`/`data-tags` attributes on `ToolCard.astro`.

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
  behind `<AdvancedDisclosure>` (see §6.4). Don't show 15 inputs at once.
- **Presets matter**: a user should understand a tool without inventing realistic
  input data themselves — see `<PresetBar>`.
- **Decision tools never claim absolute truth.** Always "for the priorities you
  selected, X scores highest," never "X is the best." The shared `DecisionLab`
  component (§6.4) already enforces this framing.
- **Privacy**: any tool handling pasted/uploaded user content (JSON, JWTs,
  headers, images) processes 100% client-side, shows the `<PrivacyNotice/>` (auto-
  rendered, don't duplicate), and never logs/persists the raw content — including
  not putting it in `localStorage` or URL state.
- **No fake precision**: simplified/heuristic models say so briefly, once, not
  repeatedly.
- **Mobile is mandatory**: no horizontal overflow, stacked controls, responsive SVGs.
- **Don't chase feature count.** A tool proposal is only justified if it saves
  time, reveals something hard to see, improves a decision, prevents a mistake,
  makes a result reusable, or explains *why* something happens. If a feature
  idea does none of those, skip it even if it sounds cool.

### 6.4 Shared React primitives (under `src/components/toolbox/shared/`)

All of these are stable APIs — read the actual files (they're short) before using
them rather than trusting a paraphrase, but as a map:

| File | Purpose |
|---|---|
| `InputField.tsx` | labeled text/number input, optional suffix |
| `RangeControl.tsx` | labeled slider with live value readout |
| `Metric.tsx` | a single stat card (label/value/color/sublabel) |
| `Warning.tsx` | `level: info\|warn\|danger\|good` callout |
| `ResultPanel.tsx` | generic titled bordered card |
| `VisualizationContainer.tsx` | bordered, horizontally-scrollable box for SVG/canvas |
| `DecisionLab.tsx` | **generic weighted-priority comparison engine.** Takes `dimensions`, `options` (each with `scores` and optional `dealBreakers`), `assumptionsNote`, `accent`. Renders sliders, sorted score bars, an auto-computed "what would change the winner" hint, a per-dimension "category winner" pill row (3+ options only), a breakdown table, and a collapsible assumptions note. 3 of the 6 Decide-family tools are thin wrappers around this (see `TechStackBattle.tsx` for the minimal pattern) — prefer wrapping this over duplicating scoring logic. |
| `PresetBar.tsx` | generic `{label, values}[]` → pill buttons that populate a tool's inputs at once |
| `AdvancedDisclosure.tsx` | `<details>` wrapper for advanced controls, collapsed by default |
| `Insight.tsx` | structured "What happened / Why / Try" result block |
| `loadImage.ts` | `loadImageFromFile(file) → Promise<{image, width, height, fileSizeBytes, mimeType, fileName}>` |
| `exportHelpers.ts` | `downloadSVG`, `downloadCanvasPNG`, `downloadJSON`, `copyText` — all local, no upload |
| `mathHelpers.ts` | `safeNumber`, `clamp`, `safeDiv`, `formatNumber` — use these to keep NaN/Infinity/crashes out of the UI on empty/zero/extreme input |
| `useUrlState.ts` | mirrors a plain-value state object into the URL query string (`replaceState`, no navigation) for shareable configs. **Never** pass sensitive/large values (pasted payloads, tokens, file contents) through this. |
| `useLocalPref.ts` | tiny `useState`+`localStorage` hook for small non-sensitive per-viewer preferences (e.g. preferred units, remembered currency). Same rule — never persist sensitive pasted content. |

Every tool component's contract: `export default function ToolName()` — **no
props**. The page (`[slug].astro`) renders it as `<ToolName client:load />`. Don't
change this shape without also updating `[slug].astro`.

---

## 7. Current state of all 40 tools (as of this handoff)

All 40 tools are **active** and have been upgraded to "V2" depth in the most
recent work session (see §8). Every tool follows the shared conventions above.

**Check (6)**: API Payload Doctor, JWT Time Machine, CORS Doctor, Print Ready
Doctor (this absorbed a previously-separate "Artwork Print Doctor" tool that the
user explicitly chose to remove and merge into this one — if you ever see a
reference to "Artwork Print Doctor" anywhere, it's stale, there is no such tool
anymore), Schema Drift Doctor, Environment Drift Detector.

**Simulate (14)**: Responsive Content Fit Lab, Webhook Delivery Simulator,
Capacity Cliff Simulator, Retry Storm Simulator, Cache Value Simulator, Rate
Limit Playground, Queue Capacity Planner, SLA Chain Visualizer, Fan-Out Latency
Simulator, Circuit Breaker Playground, N+1 Query Visualizer, Connection Pool
Simulator, HTTP Cache Lab, Scope Creep Visualizer.

**Decide (7)**: AI Project Pricing Lab, Database Decision Lab, Build vs Buy,
Tech Stack Battle, Distributed Systems Tax, Monolith vs Microservices Lab, REST
vs GraphQL Decision Lab (this one now includes **gRPC as a 3rd option** plus a "Real-time/Streaming"
dimension — added with explicit user approval; don't revert it to a 2-way
comparison without asking).

**Plan (8)**: Multi-Format Campaign Planner, API Pagination Planner, Sticky Note
Frame Planner, Timeout Chain Planner, Frame Fit Finder, Paper Nesting Planner,
Project Quote Risk Planner, Roadmap Collision Detector.

**Create (5)**: Crop Guardian, Drawing Grid Maker, Bleed & Safe Area Builder,
Value Study Maker, Perspective Grid Maker (this one has **draggable vanishing
points** — a real click-and-drag canvas interaction, not just sliders).

Full per-tool feature detail lives in the component files themselves and in the
tool descriptions in `tools.ts` — those are accurate and up to date.

`npm run build` currently succeeds with **zero errors, 55 static pages**. That's
the baseline to preserve — always re-run it after any change and treat a build
failure as blocking.

---

## 8. What just happened (context on the most recent work)

The prior work session executed a large, spec-driven "Toolooo V2" upgrade: every
one of the 40 MVP-depth tools was rewritten to add presets, richer
visualizations, Basic/Advanced control splits, deal-breaker-aware decision
scoring, draggable/interactive canvases, exports, and so on — using a shared new
foundation (`PresetBar`, `AdvancedDisclosure`, `Insight`, `mathHelpers`,
`exportHelpers`, `useUrlState`, `useLocalPref`, and an upgraded `DecisionLab`).

This was executed via many parallel AI subagents (one per tool, grouped by
family), with the human developer's session repeatedly hitting Claude usage
limits mid-run. Two things are worth knowing if something looks unfinished or
inconsistent:

1. **A tool whose upgrade agent reported "failure" may still be fully upgraded.**
   Several agents wrote their complete file successfully and only failed to
   return their final success message because the session limit was hit at that
   exact moment. Line-count/content and a clean `npm run build` are more reliable
   signals of completion than the agent's own reported status.
2. **GitHub Desktop auto-stashed the working tree at least twice during that
   session** (see §2, git safety). All stashed work was recovered before this
   handoff was written, and the build is currently clean — but if you inherit a
   git history with unexplained stash entries, check them before assuming
   anything is actually lost.

Also completed in the same session, sitewide (not just Toolooo):
- Navbar reordered to **Home / Portfolio / Artworks / Toolbox**.
- Homepage, Footer, and `navigation.ts` all updated to point at the current
  Toolooo structure (5 family pages at `/toolbox/family/{id}`, not dead links).
- A full sitewide SEO/link audit now runs against the actual built `dist/`
  output (not just source) — zero broken local references across all 55
  generated HTML pages.
- The family-color unification described in §5 (`TOOLOOO_COLOR`).

---

## 9. Known non-issues (don't "fix" these)

- `frop-a-vibe.astro` — deliberate typo-redirect to `/drop-a-vibe`, not a stray
  duplicate.
- `src/data/navigation.ts`'s `mainNav`/`footerNav` exports are dead code (the
  real Navbar/Footer hardcode their own lists) but are still kept in sync by
  convention. Don't assume editing `navigation.ts` alone changes the rendered
  nav — it doesn't.
- A 404-page canonical URL referencing `/404/` (trailing slash) while the actual
  built file is a flat `dist/404.html` — this is a benign metadata quirk from how
  `BaseLayout.astro`'s canonical-URL logic handles the one special-cased error
  page, confirmed non-functional/non-broken via a full link audit.
- The "planned"/"experimental" `ToolStatus` values and the `ComingSoonCard`
  component still exist in the codebase for future use, but every current tool
  is `'active'` — don't be surprised these code paths exist but are currently
  unused.

## 10. Open ideas not yet implemented (fair game for future work)

These were noted during the V2 project but intentionally left out of scope
(either flagged as needing a product decision, or just not requested):

- Several Simulate/Plan tools could support more scenario-comparison depth
  (e.g. side-by-side algorithm comparisons) — the spec allowed this "if the
  architecture can support it cleanly," and only some tools got it.
- `useUrlState` (shareable tool configs via URL) exists as a primitive but is
  only wired into a subset of tools — could be extended to more Simulate/Decide
  tools where sharing a scenario is genuinely useful (never to tools handling
  sensitive pasted content).
- No local-storage-based "favorites" or "recent tools" list exists yet, though
  `useLocalPref` is ready to support one if wanted.
- Artooo now server-renders all 168 artwork cards with stable source IDs,
  collision-safe slugs, intrinsic dimensions, and an image sitemap. Individual
  artwork detail pages remain a future product decision.

---

## 11. SEO foundation (Mission 2)

- `src/components/layout/SEO.astro` is the single metadata layer. Canonicals,
  social URLs, schemas, `robots.txt`, and both sitemaps derive from Astro's
  configured `site` and `base` through `src/utils/seo.ts`.
- The production configuration is `https://khizooology.com/` with a root `/`
  base. Mission 4 validated that configuration without page-level URL edits.
- The generated site has 51 indexable pages, three noindex content/error pages,
  and one noindex compatibility redirect. The normal sitemap contains exactly
  the 51 indexable canonical URLs.
- All 40 active Toolooo pages have unique metadata, static support content,
  visible and JSON-LD breadcrumbs, family links, and relevance-ranked related
  links. Tool schemas use `WebPage`.
- `npm run audit:seo` builds first, then checks titles, descriptions, canonicals,
  robots, H1s, social metadata, JSON-LD, internal references, assets, sitemap
  consistency, and Artooo SSR coverage.
- Post-domain actions are tracked in `docs/SEO-LAUNCH-CHECKLIST.md`.

---

## 12. Quick-start checklist for a new session

1. `npm install` (Node >= 22.19.0), then `npm run dev` → `http://localhost:4321`.
2. Before any git operation: `git status` and `git stash list` first (see §2/§8).
3. Read `src/data/tools.ts` and `src/data/families.ts` before touching anything
   Toolooo-related — they're short and are the actual source of truth.
4. Never hardcode a `/toolbox/...` or `/images/...` path — use `url()`/`img()`.
5. Never add Tailwind classes — inline `style={{}}` + the `--k-*` CSS variables.
6. After any change: `npm run build` must complete with zero errors. For SEO or
   routing changes, also run `npm run audit:seo`.
7. Do not print the git remote URL. Do not commit unless explicitly asked.
