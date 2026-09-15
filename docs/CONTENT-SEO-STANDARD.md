# Content + SEO standard

Khizooology publishes work for people first. Search metadata describes real value; it never invents it.

Before a public page, tool, artwork, or Infooo world is released, confirm:

- It has a useful, distinct, truthful purpose and clear primary audience need.
- Its canonical registry supplies a unique title, accurate description, H1, canonical URL, social metadata, and truthful structured data.
- Intended indexability is explicit. Drafts, utility states, personal tool inputs, filters, and placeholders stay out of the sitemap and search index.
- Related links reflect real discovery paths. Images have stable dimensions and useful alt text, or empty alt text when decorative.
- Artworks use only known titles, tags, dates, medium, and context. Infooo claims distinguish facts, models, and simulations and cite authoritative sources where needed.

Publishing flow:

`Idea → Value Laws → Build → Content review → SEO quality gate → Build/audits → Human review → Publish → Search Console/Bing measure → Improve`

Run `npm run build`, `npm run audit:seo`, `npm run audit:value`, `npm run audit:prelaunch`, and `npm run audit:domain` before release. The generated-output audit blocks objective issues such as missing or duplicate metadata, broken canonicals or links, invalid JSON-LD, missing image alt text, placeholder copy, orphan indexable pages, and sitemap drift. Human review remains responsible for usefulness, clarity, originality, and creative judgment.
