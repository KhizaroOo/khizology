# Infooo roadmap — approved Worlds 015–027

Planning document. A world is live only once it is in the registry with a route; every other world here is reserved intent, not released content.

| State | Count | Meaning |
|---|---|---|
| Implemented and public | 15 | Worlds 001–015 exist in `src/data/infooo.ts` with routes and components. World 015 was built on `claude-dev` and goes live only when Khizooo integrates and releases it. |
| Approved / planned | 12 | Worlds 016–027 below. No registry entry, route, asset, sitemap URL or navigation card. |

`agent-systems-lab` is a curated collection page over Worlds 008–014, not a world, and is unchanged by this roadmap. Public world counts must keep reflecting implemented reality; never let a planned world change a count, a listing or a generated file.

## Strategic direction

**Infooo makes invisible systems explorable.** Supporting idea: see it, touch it, understand it.

Infooo must not become primarily a technology or AI education product. The knowledge universe should increasingly cover human life, nature, cities, infrastructure, economics, information, logic, behavior, science and technology.

Worlds 007–014 and Agent Systems Lab stay valuable, but future worlds must deliberately broaden the subject range. This batch exists to prove Infooo can explain the human body, everyday life, society, cities, money, information, physical systems, probability and technology — not only software.

## Approved order

This numbering is planning authority unless Khizar explicitly changes it.

| # | Title | Category | Primary question or direction |
|---|---|---|---|
| 015 | Why Cities Trap Heat | world-infrastructure | Why can two places in the same city feel completely different on the same hot day? |
| 016 | Why Food Prices Rise | world-infrastructure | Why the shelf price of everyday food depends on a chain rather than one cause. |
| 017 | How Misinformation Spreads | web-information | Make information propagation through a network visible. |
| 018 | Financial Literacy | logic-computation | One foundational financial mechanism, narrowed before build. |
| 019 | Sleep & Human Performance | life-human | What happens while you sleep, and what disruption changes. |
| 020 | Food Systems | world-infrastructure | How food physically reaches your plate. |
| 021 | Water Systems | world-infrastructure | The journey of your drinking water. |
| 022 | Traffic & Emergence | world-infrastructure | How traffic jams appear from nothing. |
| 023 | Human Immunity | life-human | Your immune system as coordinated layers. |
| 024 | Probability & Cognitive Bias | logic-computation | When probability tricks your brain. |
| 025 | Answer Engine Lab | web-information | Make modern answer-engine behavior explorable. |
| 026 | Query Plan Lab | software-systems | Make database query execution visible. |
| 027 | Passkey Lab | web-information | Make passkey authentication understandable without cryptography expertise. |

## World notes and constraints

### 015 — Why Cities Trap Heat
Compare two city blocks under the same weather. One has asphalt, concrete, dark roofs, few trees and little shade; the other has trees, shade, reflective surfaces, vegetation and different materials. Run the day and show sunlight, surface absorption, stored heat, the daytime difference, sunset, then different nighttime cooling.

**Aha:** cities do not only get hot — they store heat and release it later.

**Built (route `/infooo/why-cities-trap-heat`).** A deterministic three-store energy balance (surface skin, thermal mass, street air) runs a dark paved block, a green light block and an open-countryside yardstick through one day, or three. Reveal numbers come from the run, never from fixed text. Choices made while building, open to change: Celsius only (no Fahrenheit switch), the three-day mode and the optional guess are kept, and the block names stay "Dark & paved" and "Green & light". The tree option over-states air cooling on purpose and is labelled an upper bound.

### 016 — Why Food Prices Rise
System: farm, fertilizer, energy, weather, processing, transport, wholesale, retailer, consumer. Allow controlled shocks to fuel cost, crop failure, transport disruption, input costs and demand shift.

**Aha:** the price on a shelf is the output of an interconnected system.

**Truth requirement:** this stays an educational model. Never imply a simple percentage change predicts a real food price.

### 017 — How Misinformation Spreads
Seed one claim, let people share, let network hubs amplify, let communities repeat, then let a correction arrive. Allow exploration of trust, repetition, network structure, influential nodes, fact-check timing and sharing probability.

**Aha:** information does not spread only because it is true; network structure and behavior matter.

**Boundary:** neutral educational framing only. Not political persuasion.

### 018 — Financial Literacy
Build one foundational mechanism, not a finance dashboard. Candidates: purchasing power, compound debt, interest, saving, risk, cash flow, inflation. **Narrow to one primary question and one interactive aha before implementation.** Explain a system; do not duplicate Toolooo calculators; never give individualized financial advice.

### 019 — Sleep & Human Performance
Working title: What Happens While You Sleep. Concepts: sleep stages, circadian timing, sleep pressure, memory consolidation, restoration, interruption. Let the visitor observe how sleep changes across a night and what happens when stages or timing are disrupted.

**Boundary:** medical truth boundaries are mandatory. No diagnostic or treatment claims.

### 020 — Food Systems
Working title: How Food Reaches Your Plate. System: farm, harvest, processing, storage, transport, distribution, shop, home. Break or delay one part and watch consequences propagate.

**Aha:** everyday food depends on a large interconnected network most people never see.

**Do not duplicate 016.** 016 is price formation; 020 is physical food movement and supply.

### 021 — Water Systems
Working title: The Journey of Your Drinking Water. System: rain or source, reservoir, treatment, storage, pipes, home, wastewater, treatment, environment.

**Aha:** a glass of water is the visible end of a much larger hidden infrastructure system.

**Boundary:** stay globally understandable. Do not pretend every city's system is identical.

### 022 — Traffic & Emergence
Working title: How Traffic Jams Appear From Nothing. Cars move smoothly, one vehicle slows, following vehicles react, the disturbance amplifies, a traffic wave appears. Then change following distance, density and reaction behavior.

**Aha:** complex system behavior can emerge without a central cause.

**Competition warning:** this concept has existing educational competitors. Implementation must add distinctive Infooo interaction and design value, not copy known phantom-traffic simulators.

### 023 — Human Immunity
Working title: Your Immune System at Work. System: pathogen enters, barriers, innate response, inflammation, adaptive response, antibodies, memory. Then re-expose the system to the same simplified pathogen.

**Aha:** the immune system is not one defense; it is several coordinated layers.

**Boundary:** strict medical truth and safety boundaries. Educational simulation only. Never diagnose disease or predict individual responses.

### 024 — Probability & Cognitive Bias
Working title: When Probability Tricks Your Brain. Candidates: Monty Hall, birthday paradox, streak intuition, base rates, random clustering. **Choose one flagship misconception before implementation.** The first experience must not be a collection of unrelated mini-games.

**Aha:** human intuition often misreads probability because the underlying structure is invisible.

### 025 — Answer Engine Lab
Concepts to investigate: retrieval, source selection, citation, ranking, grounding, answer synthesis, source disagreement, freshness, authority.

**Research requirement:** perform fresh primary-source research at implementation time; this area changes quickly. Never imply knowledge of proprietary ranking algorithms. Fact / Model / Simulation boundaries are essential.

**Maintenance burden: HIGH.** Requires periodic review because answer-engine systems change rapidly. Position chosen for peak demand, current relevance, a Web & Information category opportunity and limited mature interactive competition.

### 026 — Query Plan Lab
Same query against different indexes, data distributions and joins produces a different execution plan and a different amount of work. Concepts: table scan, index seek, join strategies, cardinality, sorting, filtering, cost.

**Aha:** two queries that look almost identical can require dramatically different work underneath.

**Boundary:** browser-only and deterministic. Never require a live database. Positioned after 025 for evergreen technical value, very low maintenance and balance.

### 027 — Passkey Lab
System: device, credential, authenticator, website, challenge, signature, verification. Concepts: public key versus private key, device authentication, phishing resistance, sync, recovery, cross-device use.

**Aha:** the website does not need to receive or store your reusable password.

**Boundary:** never oversimplify passkeys into "biometrics sent to the website." Lower urgency than 025 and 026 because the explainer space is more crowded.

## Category balance

| Category | Worlds in this batch |
|---|---|
| World & Infrastructure | 015, 016, 020, 021, 022 |
| Life & Human | 019, 023 |
| Logic & Computation | 018, 024 |
| Web & Information | 017, 025, 027 |
| Software & Systems | 026 |
| AI & Intelligence | none |

The absence of an AI world is intentional. Do not balance this batch by adding one.

## Value gate before each build

Roadmap approval reserves direction. It does not override future evidence.

Before implementing any individual world: run fresh research, check current demand, check existing competitors, identify why interaction beats text or video, verify no duplicate existing Infooo world, define the maintenance burden, then apply the Khizooology Value Laws.

If a concept no longer passes the gate when its turn arrives, do not build it blindly because it appears here. Report the evidence and recommend **BUILD**, **REWORK**, **REPLACE** or **DROP**.

## Research rule

Worlds 015, 016, 017, 018, 019, 023, 025 and 027 are time-sensitive and need fresh authoritative sources at implementation time. Prefer official institutions, standards, peer-reviewed research, primary technical documentation and recognized public datasets.

Never fabricate market size, search volume, user demand, statistics or behavioral evidence. When a figure cannot be sourced, state **DATA UNAVAILABLE**.

## Implementation principle

Each world must answer the Infooo question: what can the visitor do here that a diagram, article, video or chatbot reply cannot?

Every world eventually needs one primary question, one strong aha, one obvious first interaction, meaningful cause and effect, progressive depth, Fact / Model / Simulation boundaries, accessible interaction, mobile support, sources and truthful limitations. No decorative-only worlds.

## First-visit UX law

Within 5 seconds the visitor understands what this is. Within 10 seconds they know what to do. One primary interaction makes something meaningful happen. By roughly 30 seconds the main aha is visible. Only then come Explore More, X-Ray where valuable, Test Yourself where valuable, and sources with truth boundaries.

Do not make visitors configure a simulator before they understand the idea.

## Architecture

Preserve browser-first delivery, static hosting, no signup, no unnecessary backend, no runtime AI unless explicitly approved, privacy, performance, accessibility and SEO.

Reuse the Infooo framework, canonical registries, shared components, design tokens, route helpers and metadata infrastructure described in [INFOOO-FRAMEWORK](INFOOO-FRAMEWORK.md). Thirteen worlds must not become thirteen architectural systems. World-specific models, components and tests stay in world files.

## Standing rules

Quality over count. Research before build. A broad knowledge universe. No phantom worlds.

## Document status

Canonical path: `docs/INFOOO-ROADMAP.md`. A mirror is kept in claude.ai project knowledge so planning context survives across sessions and branches. Update this file first, then the mirror.
