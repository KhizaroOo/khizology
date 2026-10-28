# Khizooology

**Art meets Code.** Original art, visual browser tools and interactive knowledge worlds by **Khizar Imtiaz (khizooo)**.

[Explore the live site](https://khizooology.com/) · [Meet the maker](https://khizooology.com/my-portfolio/)

## Useful without an account

Khizooology is static and browser-first. Tool calculations run in your browser; no signup is required. Tool inputs are not sent to analytics. Optional analytics loads only after consent. Hosting, assets and consented analytics still use the network.

| Family | What you can do | Live |
|---|---|---|
| Artooo | Explore original artworks and related pieces | [Artworks](https://khizooology.com/artworks/) |
| Toolooo | Check, simulate, decide, plan and create with visual tools | [Toolbox](https://khizooology.com/toolbox/) |
| Infooo | See, touch and understand interactive knowledge worlds | [Worlds](https://khizooology.com/infooo/) |

## Try a useful problem

- [Retry Storm Simulator](https://khizooology.com/toolbox/retry-storm-simulator/): compare retries, backoff and recovery pressure.
- [API Payload Doctor](https://khizooology.com/toolbox/api-payload-doctor/): inspect JSON issues and compare expected versus actual contracts locally.
- [Queue Capacity Planner](https://khizooology.com/toolbox/queue-capacity-planner/): explore arrivals, capacity and backlog drain time.
- [Timeout Chain Planner](https://khizooology.com/toolbox/timeout-chain-planner/): distinguish expected work from configured waiting and retry exposure.
- [Perspective Grid Maker](https://khizooology.com/toolbox/perspective-grid-maker/): create drawing guides around vanishing points.
- [Bleed & Safe Area Builder](https://khizooology.com/toolbox/bleed-safe-area-builder/): preview trim, bleed and safe areas before exporting a guide.
- [Human Atlas](https://khizooology.com/infooo/human-atlas/): explore a simplified interactive 3D anatomy model; educational, not diagnostic or clinical.

Simulators explain bounded models, not production guarantees. Print guides do not replace printer specifications. Read each tool's assumptions before applying its output.

Notooo’s book-note product was retired on 28 October 2026. Its mascot and color remain as the anonymous locked `future-5` monster; former URLs use the normal 404. Historical reports are snapshots, not current publishing instructions.

## Development

Requires Node.js **22.19+**. Built with Astro, TypeScript, React islands and Tailwind CSS.

```sh
npm install
npm run dev
```

Use the URL printed by Astro. Reuse an existing checkout server rather than starting another.

| Command | Purpose |
|---|---|
| `npm run build` | Generate assets and the static site in `dist/` |
| `npm run preview` | Preview the build locally |
| `npx astro check` | Astro and TypeScript checks |
| `npm run audit:seo` | Build and check metadata, schemas, links, images and sitemaps |
| `npm run audit:publish` | Full domain, SEO, prelaunch, type, Value and privacy gate |

## Sources of truth

- `src/data/tools.ts`: Toolooo registry and editorial growth priorities.
- `src/data/infooo.ts`: Infooo worlds and framework metadata.
- `src/data/artworks.ts`: artwork metadata.
- `src/data/site.ts`: site identity and social metadata.
- `src/components/` and `src/pages/`: shared UI, interactive experiences and routes.
- `scripts/`: asset generation, audits and targeted tests.

Follow [AGENTS.md](AGENTS.md). Add content through canonical registries and verify SEO, accessibility, privacy and user value. Do not edit generated `dist/` files.

## Sharing and discovery

Link to the relevant tool, world, artwork or note using its canonical URL. Share safe generated summaries; keep private payloads, tokens and personal information out of screenshots.

- [Distribution copy and channel packages](docs/GROWTH-DISTRIBUTION-KIT.md)
- [Authority plan and asset matrix](docs/BACKLINK-AUTHORITY-PLAN.md)
- [Verified links and planned opportunities](docs/BACKLINK-TRACKER.md)

Deployment uses GitHub Actions and GitHub Pages. Local documentation changes require owner review and release to appear publicly. No unrestricted reuse rights for artwork or third-party material are implied.
