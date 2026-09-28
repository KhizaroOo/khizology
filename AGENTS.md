# Khizoooology content-growth rule

Whenever adding or publishing a new public Khizoooology content page, tool, artwork, Infooo world, collection, or other indexable content, include its complete growth foundation in the same change:

- a unique, accurate title, meta description, canonical URL, and Open Graph/social metadata;
- the appropriate structured data and internal links;
- sitemap and image-sitemap coverage where applicable;
- robots/indexability decisions that match the content's intended public status;
- accessible, performant assets with meaningful alt text where images are used; and
- the relevant existing SEO, domain, and pre-launch validation before release.

Do not add pages to the public sitemap or make them indexable before Khizar has approved their public release.

# Development team operating model

## Roles and authority

- **Khizar — product owner / final approval:** owns vision, taste, final product decisions and release approval.
- **ChatGPT — brain / product and architecture partner:** works with Khizar on brainstorming, product direction, features, UX, architecture, priorities, scope, acceptance criteria, developer missions and review.
- **Claude Code and Codex — equal developers and verifiers:** inspect → understand → implement → test → fix → verify → report. Decide how to implement the approved mission inside the existing repository.

Khizar + ChatGPT decide what should exist, why, the intended experience and the quality bar. Claude Code + Codex build, verify and fix. Khizar has final taste and release approval.

## Mission execution

Treat a mission's product direction and acceptance criteria as approved. Inspect the smallest relevant repo surface, find the existing source of truth, inspect consumers before changing shared APIs, reuse the architecture and implement the smallest complete solution. Verify actual behavior, fix mission-related regressions automatically and stop before unrelated improvements.

Autonomously choose implementation details, component structure, types, CSS/layout, directly required refactors, bug fixes, meaningful tests, accessibility fixes and performance-safe equivalent technical approaches. Do not ask questions answered by source, docs, tests, types, config or existing patterns.

Do not independently redefine monster purposes, invent product directions, add speculative features, change the public UX philosophy, create top-level systems, introduce monsters/worlds/tools, expand scope or replace an approved interaction model. If implementation exposes a genuine product conflict, preserve the approved direction and report the conflict and trade-off clearly; do not silently redesign it. Material changes to behavior, UX, scope, architecture direction, privacy, routes, SEO strategy, monetization or monster identity require explicit direction.

## Product and architecture boundaries

Khizooology is static and browser-first: useful, fast, beautiful, no signup, no bullshit. Every public creation should help people USE, UNDERSTAND, FEEL or SHARE. Prefer deeper value over more features: don't build more; build something worth existing.

Do not add a backend, database, auth, accounts, CMS, cloud processing, unnecessary API calls or unnecessary dependencies without explicit approval. Protect privacy, accessibility, SEO, performance, responsive behavior, analytics and public routes.

Reuse canonical monster/tool registries, artwork metadata, Infooo world metadata, route helpers, shared components, voice system, Value Laws, Publishing Quality, Compound Value, Build Smarter and SEO infrastructure. Do not create parallel sources of truth.

- **Infooo:** share presentation; keep world intelligence local. The generic framework remains reusable, world-independent and renderer-independent where intended.
- **Toolooo:** protect Input → Visualize → Result → Understand → Act → Continue. Keep it browser-only, privacy-safe, useful, truthful and visual.
- **Artooo:** never invent artwork stories, dates, meanings, techniques or creator intent. Use real metadata and creator-authored context only.
- **Notooo:** keep it useful, concise, original, human-first and copyright-safe. No generic SEO content factory.

## Git safety and developer coexistence

Inspect status/diff before risky Git actions. Never discard unrelated work, remove stashes, expose secrets or expose PAT-bearing remotes. Do not commit, push or deploy unless explicitly authorized. The default stopping point is implementation plus verification complete.

Preserve compatible work from either developer, including uncommitted work. Inspect relevant existing changes before editing; never overwrite work merely because the other developer produced it. Focus only on the assigned mission. Do not coordinate parallel agents unless explicitly requested.

## Context efficiency and verification

Use targeted search, the closest implementation, shared dependencies, affected consumers and diff-focused validation. Avoid repeated whole-repo reads, huge scans, long narration, speculative research, repeated instructions and unnecessary docs. Use the smallest context necessary for correctness.

Run relevant checks and never skip meaningful verification: targeted tests, Astro/type checks, build, publishing/SEO/Value audits, accessibility, performance, responsive/browser review and `git diff --check` as applicable. Browser review is mandatory for visual changes. Inspect likely consumers for shared infrastructure changes.

If implementation causes build/test/type/import failures, broken routes or regressions, investigate and fix automatically. Do not stop at a reasonably fixable in-repo failure.

## Final report

Keep reports short, with CHANGED (meaningful changes), VERIFIED (checks actually performed and results), BLOCKERS (none unless genuinely blocked), and FINAL: `🟢 READY FOR KHIZAR REVIEW` or `🔴 BLOCKED`.
