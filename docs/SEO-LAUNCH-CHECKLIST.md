# Khizooology SEO launch checklist

Use this checklist as `https://khizooology.com` is connected. The repository build now targets the custom domain at the root; GitHub and DNS activation remain human-controlled steps.

## Domain and deployment

- [x] Point the authoritative Astro `site` value to `https://khizooology.com` and set `base` to `/` in one deployment change.
- [ ] Confirm the live homepage loads over HTTPS and GitHub Pages enforces HTTPS.
- [ ] Confirm page canonicals, Open Graph URLs, JSON-LD URLs, `robots.txt`, and both sitemaps now use `https://khizooology.com/` with no `/khizology` base.
- [ ] Open `/robots.txt`, `/sitemap-index.xml`, `/sitemap-0.xml`, and `/image-sitemap.xml` on the live domain.
- [ ] Run `npm run audit:seo` against the production configuration before deployment.

## Search engines

- [ ] Create a Google Search Console Domain Property using DNS verification; do not add a made-up HTML token.
- [ ] Submit `https://khizooology.com/sitemap-index.xml` and `https://khizooology.com/image-sitemap.xml`.
- [ ] Inspect the homepage, `/toolbox/`, `/artworks/`, and representative Toolooo pages, then request indexing for the main entry pages.
- [ ] Add the domain to Bing Webmaster Tools and submit or import the sitemap.
- [ ] Consider a GitHub Actions IndexNow submission only after the final domain is stable.
- [ ] Check indexed-page and artwork-image growth after launch; investigate exclusions instead of forcing every URL into the index.

## Structured data and previews

- [ ] Test the live homepage and portfolio in Google Rich Results Test.
- [ ] Test WebSite, Person, ProfilePage, CollectionPage, WebPage, and BreadcrumbList graphs in Schema.org Validator.
- [ ] Validate the 1200×630 preview on LinkedIn, Facebook/Open Graph, X, and a WhatsApp-compatible share flow.
- [ ] Confirm the square favicon and Apple touch icon load from the live root.

## Experience and measurement

- [ ] Run PageSpeed Insights for mobile and desktop on the homepage, Artooo, Toolooo, and one interactive tool.
- [ ] Check layout stability, artwork loading, keyboard use, and light/dark themes on the live build.
- [ ] Create the real analytics property before adding analytics; keep the integration centralized in the shared layout.
