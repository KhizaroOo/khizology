# Khizooology Notes

Notes are file-based written knowledge. They are not a monster and do not replace Notooo's **One Book. One Page.** visual book format.

## Create a note

1. Create `src/content/notes/<category>/<filename>.md` for ordinary writing, or `.mdx` only when a supported component improves the explanation.
2. Add valid frontmatter. `status: draft` keeps the note out of routes, listings and sitemaps. Use `status: published` and a `publishedAt` date only when the note is approved for release.
3. Write the note, then run `npm run build`, `node scripts/audit-seo.mjs`, `node scripts/audit-value.mjs`, and `node scripts/audit-prelaunch.mjs`.

```md
---
title: Clear, specific note title
description: A useful description between 30 and 160 characters.
slug: clear-specific-note-title
category: Development
tags: [astro, static-sites]
status: draft
publishedAt: 2026-09-19
relatedNotes: []
---

Write original, useful knowledge here.
```

Published notes require `title`, `description`, `slug`, `category`, `status`, and `publishedAt`. Optional fields include `updatedAt`, `featured`, `tags`, `image` with `imageAlt`, `imageWidth`, `imageHeight`, `author`, `relatedNotes`, `seoTitle`, and `seoDescription`.

Use Markdown by default. In MDX, the supported initial component surface is deliberately small:

```mdx
import Callout from '@notes/Callout.astro';
import KhizoLink from '@notes/KhizoLink.astro';

<Callout type="tip" title="Keep it practical">A short useful point.</Callout>

<KhizoLink kind="toolooo" slug="api-payload-doctor">Open API Payload Doctor</KhizoLink>
```

`KhizoLink` supports `note`, `toolooo`, `infooo`, and `notooo` targets, so internal MDX links retain the configured base path. For Markdown images, provide meaningful alt text and intrinsic `width` and `height` attributes. A frontmatter cover image requires `imageAlt`, `imageWidth`, and `imageHeight`.

Git is the history, files are the storage, and the Astro build is the publishing engine. Do not add a CMS, backend, database, or placeholder notes.
