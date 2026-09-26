# Notooo Engine v1

Notooo Engine v1 is the static content-production system behind **Book in One Page**. It converts reviewed research into a compact, original, reusable knowledge page. It does not call AI, an API, a CMS, or a backend at runtime.

The canonical source model lives in `src/data/notooo.ts`. The renderer reads that model; it does not own book copy, research claims, or page-specific layout data.

## Pipeline

`select → research → knowledge map → idea scoring → compression → simple language → fact check → copyright check → Engine output → khizooo review → publish`

1. **Select** a book with Khizar’s approval.
2. **Research** the thesis, frameworks, examples, limits, and edition facts.
3. **Map** the core thesis, major ideas, named frameworks, practical lessons, useful examples, necessary nuance, and repeated evidence to the source records that support them.
4. **Score** candidate ideas before giving them limited page space.
5. **Compress** into a single big idea, five to eight sections, one Khizooo Take, and one Remember line.
6. **Check** simple language, factual support, and copyright discipline.
7. **Review** content and release intent with Khizar.
8. **Implement** in the typed registry and shared renderer.
9. **Validate** deterministic structural and readability rules.
10. **Release** only after public approval and the normal Khizooology growth checks.

## Source priority and truth rules

Prefer sources in this order: (1) author official material, (2) publisher information, (3) official book pages and summaries, (4) author interviews or talks, (5) table of contents, (6) legally available excerpts, (7) strong independent reviews or analysis, and (8) additional sources only for cross-checking. Avoid random summary farms, copied SEO articles, unsourced AI output, and a single weak secondary source.

Record only sources actually used. Do not invent a URL, access date, quotation, claim, author intent, or reading history. A source record has a stable `id`, title, type, and optional publisher, HTTPS URL, and access date. Sections cite source IDs internally through `sourceIds`; those IDs are not public page clutter. A high-confidence entry requires at least two sources. A published entry may never be marked `low` confidence.

Notooo creates original paraphrase and interpretation. It must not reproduce chapters, long quotations, official cheat sheets, third-party summaries, or a book’s visual layout. Framework names may be used when needed for accuracy. The page always remains a synthesis, not a substitute for the original work.

## Knowledge map

Before compression, identify the core thesis, major ideas, named frameworks, practical lessons, useful examples, essential nuance, and concepts that recur across reliable sources. This map is editorial research material. It is not rendered publicly by default.

Each `NotoooBook` contains:

- identity, slug, number, category, tags, and lifecycle status;
- public metadata and accessibility text;
- the book’s Big Idea, four to seven main sections, Khizooo Take, and Remember line;
- typed source records and internal section-to-source references;
- `researchConfidence`: `high`, `medium`, or `low`; and
- optional edition, relationship, and lifecycle dates.

Every visual section has an ID, title, one-liner, zero to three supporting points, and optional source references. The shared renderer uses these fields generically, so a new book does not need a custom page component.

## Scoring and page gates

Score each candidate idea from 0–2 for **importance**, **usefulness**, **uniqueness**, **confidence**, and **explainability**. Keep ideas that earn their space; remove repeated, minor, generic, weakly supported, or hard-to-explain ideas. Scores guide editorial review and are never public metadata.

Before `approved` or `published`, fact-check the author, title, publication metadata, central thesis, named frameworks, important factual claims, and whether the interpretation is supported by the recorded research. Preserve uncertainty or remove unsupported certainty when sources conflict.

The deterministic validator blocks duplicate IDs, numbers, slugs, section IDs, source IDs, broken source references, empty titles or one-liners, more than three supporting points, invalid lifecycle or confidence states, invalid dates, invalid HTTPS source URLs, unsupported formats, and published low-confidence entries. It warns when a page falls outside the five-to-eight section target, becomes too wordy, or has long sentences or points.

The copyright gate requires original paraphrase and organization. Flag long quotations, copied paragraphs, copied publisher descriptions, copied third-party summaries, copied cheat sheets, and chapter-by-chapter reproduction for rewrite or removal. The lightweight checks cannot prove every claim is correct, measure comprehension, detect every copyright issue, or replace editorial judgment. Human review remains required before a public release.

## JSON exchange shape

Use this shape for research handoff or structured authoring; validate and edit before adding it to the TypeScript registry.

```json
{
  "id": "book-slug",
  "number": 2,
  "slug": "book-slug",
  "status": "draft",
  "researchConfidence": "medium",
  "sources": [
    { "id": "author-site", "title": "Author material", "type": "author", "url": "https://example.com" }
  ],
  "bigIdea": { "id": "big-idea", "title": "Big Idea", "oneLiner": "Plain-language thesis.", "points": [], "sourceIds": ["author-site"] },
  "sections": [
    { "id": "main-idea", "title": "Main idea", "oneLiner": "One clear sentence.", "points": ["Up to three short points."], "sourceIds": ["author-site"] }
  ],
  "khizoooTake": { "id": "khizooo-take", "title": "Khizooo Take", "oneLiner": "Original interpretation.", "points": [] },
  "remember": { "id": "remember", "title": "Remember", "oneLiner": "The line worth keeping.", "points": [] }
}
```

## Research prompt

> Create a Notooo Engine v1 draft for the selected book and author. Research author, publisher, official material, interviews, table of contents, legally available excerpts, then strong cross-checks in that order. Return typed JSON with metadata, Big Idea, five to eight strongest sections, one-line explanations, no more than three supporting points per section, Khizooo Take, Remember, typed sources, source IDs, research confidence, and `draft` status. Separate direct facts from interpretation, flag uncertainty, use language a 15-year-old can understand, and write original paraphrases. Do not invent URLs, dates, quotations, reading history, or unsupported claims; do not produce a chapter-by-chapter recap or long quotes.

## Author workflow

### September 2026 catalog expansion

The decided reading catalog contains 120 unique books: 20 each in Mind, Money, Nature, Life, People, and Society. Seven existing notes remain published; the other 113 are complete Engine-shaped research drafts in `src/data/notooo.ts`. The repeated Money entries in the supplied list are represented once each.

Each addition has a Big Idea, five book-specific sections, an original editorial reflection, One Thing to Keep, category/tags, a recorded source, related-note references, and prepared metadata. `seoTitle` is an optional editorial override for unusually long book titles; it never changes the visible book name. The existing page layout supplies canonical, social, and structured data when a note is approved for publication.

The additions have **medium research confidence**, based on consulted author/publisher overviews, catalog descriptions, or publisher excerpts. They do not claim a complete reading, independent verification of every assertion, or Khizar's endorsement. Before approval, cross-check detailed frameworks and contested claims against further reliable material, review the synthesis and reflection, and check its rendered reading/export layout. Financial, medical, cultural, historical, and memoir boundaries remain part of that review.

The public hub may list draft **catalog metadata only**: title, author, category, tags, and a Coming state. Listed does not mean published. Drafts do not create public detail pages, bodies, related links, manifest entries, or sitemap entries. The existing Value audit checks the metadata inventory, combined search/category/status filtering, published-only schema, and body/route/sitemap exclusions against the generated build, including entries marked `approved` but not yet `published`. Public release still requires Khizar's explicit approval and the publishing quality gate. Do not change all 113 statuses as a side effect of importing or listing the catalog.

Create the entry as `draft`; only its catalog metadata may appear publicly. Add enough typed sources for the selected confidence, connect factual sections to their source IDs, and run `npm run audit:value`. Fix errors, review warnings, and get Khizar’s approval. Only then change lifecycle status to `approved`; change to `published` only when public release, growth foundation, and release validation are approved. Public route, manifest, relationship and schema filtering is centralized in `getPublishedNotoooBooks`. MVP progress counts published notes, never the full inventory.

Do not add scraping, crawling, source downloads, book PDFs, full book text, a backend, or runtime generation to this workflow. For public release, follow `docs/NOTOOO.md` and the repository growth rule: unique metadata, canonical and social data, appropriate structured data and internal links, sitemap/indexability decisions, accessible assets, and relevant validation. Do not make a new page indexable or add it to a sitemap before Khizar approves release.
