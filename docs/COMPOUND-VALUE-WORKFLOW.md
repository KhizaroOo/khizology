# Compound Value Workflow

Compound Value turns one finished Khizooology creation into a small set of additional, useful ways to discover, teach, explain, share, connect, remember, or return. It does not turn one idea into a content farm.

The primary creation remains the source of truth. Derived material may use canonical metadata, real calculations, verified knowledge, creator-authored context, and documented assumptions. It must never fill missing context with invented meaning, a personal story, an unsupported failure cause, or a medical claim.

## Workflow

`CREATE → EXTRACT REAL VALUE → PACKAGE → CONNECT → SHARE → MEASURE → IMPROVE`

1. Finish the primary creation and pass its normal publishing-quality gate.
2. Identify one real, artifact-specific insight. Add a **One Thing to Keep** only when the source supports it.
3. Select only outputs that have a real job: discovery, teaching, explanation, sharing, connection, remembering, or return.
4. Add an internal Compound Value Pack to the existing content manifest using canonical source and related IDs.
5. Prepare any social copy as a small, platform-light draft. Keep its value understandable before its promotion.
6. Connect only genuinely related Khizooology work.
7. Review truth, privacy, clarity, and the appropriate Monster Voice. A person approves before anything can be marked published.
8. Publish selectively through the normal Publishing Quality Checklist. A draft alone never creates a page, sitemap entry, canonical, schema item, or social post.
9. Later, measure source visits, safe share usage, social referrals, related-content clicks, Toolooo continuation, and Infooo engagement to learn whether the output created value.

## Pack model

`src/data/contentManifest.ts` is the single canonical manifest. A lightweight `CompoundValuePack` can carry:

- the **primary** canonical source and URL;
- a **knowledge** takeaway or discovery angle;
- an optional **social** draft with a human-approval flag;
- a **visual** share idea;
- a short **demo** plan: hook, action, reveal, takeaway;
- meaningful **connection** references; and
- an internal **Notooo candidate** for a future note.

The lifecycle is `idea`, `draft`, `ready`, `published`, or `skipped`. `skipped` is a correct outcome when no useful derivative exists. A social draft cannot validate as published without human approval. There are no social APIs, OAuth credentials, background jobs, n8n execution, CMS, server, database, runtime AI, or UTM system in this workflow.

## Human approval and sharing

Every social output remains `draft → human review → published`. The manifest stores preparation only; it never sends a post. A human must explicitly approve a social draft before its status can be `published`.

## Module guidance

### Toolooo — USE / DO

Reuse the canonical Toolooo What → Why → Result → Action → Next system. Do not copy dynamic results into the manifest. Pack only reviewed, static material such as a truthful takeaway, demonstration concept, safe social draft, and a canonical related tool. Never use a visitor's inputs, local results, saved scenarios, API payloads, uploads, or LocalStorage history.

### Artooo — FEEL

Use creator-authored story, process, medium, or date only when it exists in the artwork registry. When the registry has only a title, image, and tags, keep the pack factual and minimal: for example, an original-artwork caption and a detail/crop idea. Do not infer meaning, emotion, intent, technique, or history from an image, title, filename, or tags.

### Infooo — UNDERSTAND

Keep facts, models, simulations, sources, limitations, and educational boundaries intact. Human Atlas material remains for learning and exploration, never diagnosis or treatment. An Infooo draft may describe a real relationship or exploration path, but it cannot overstate a model or introduce medical advice.

### Future Notooo — REMEMBER

Packs can hold an internal candidate for a later Notooo note when a real build lesson, knowledge insight, mental model, or creator-authored process lesson deserves deeper treatment. A candidate is not a Notooo record, route, or public promise. The Notooo Engine and its source/research gates still apply before any note is created.

## Truth, privacy, and identity rules

- Reference canonical records by `contentType` and canonical `sourceId`; related references must resolve too.
- Keep public canonical links clean. Do not create phantom SEO pages or add planning data to sitemaps.
- Source all pack fields from public artifact definitions or approved authored material, never visitor data, analytics identifiers, raw tool inputs, uploaded files, JWTs, API payloads, favorites, or browser storage.
- Reuse the canonical Monster Voice system as a light filter: Artooo FEEL, Toolooo USE / DO, Infooo UNDERSTAND, and Notooo REMEMBER. Clarity wins, and mystery identities stay hidden.
- Draft planning data stays in build-time data only. It is not imported by public routes, shipped to the browser, or exposed through a network request.

## Review and validation

Use the [Publishing Quality Checklist](PUBLISHING-QUALITY-CHECKLIST.md) for any derivative that becomes public. Before review, run:

```sh
npm run audit:publish
```

The existing value audit validates canonical source and related references, source URLs, unsafe raw-visitor-data patterns, social approval, the three representative packs, the Human Atlas educational boundary, factual Artooo copy, and mystery-identity protection.
