import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const errors = [];
const configuredBase = process.env.BASE_URL?.trim() || '/';
const basePath = configuredBase === '/' ? '' : `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;
const expectedSite = new URL(process.env.SITE_URL?.trim() || 'https://khizooology.com').origin;

function fail(message) {
  errors.push(message);
}

function walkFiles(directory, extension) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const file = join(directory, name);
    return statSync(file).isDirectory()
      ? walkFiles(file, extension)
      : (!extension || file.endsWith(extension) ? [file] : []);
  });
}

function decode(value = '') {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1].toLowerCase() === 'x';
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => attrs(match[0]));
}

function meta(html, key, value) {
  return tags(html, 'meta').filter((item) => item[key] === value);
}

function routeFor(file) {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  return `/${rel.replace(/\/index\.html$/, '/')}`;
}

function collectSchemaTypes(value, types = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectSchemaTypes(item, types));
  else if (value && typeof value === 'object') {
    const type = value['@type'];
    if (typeof type === 'string') types.add(type);
    if (Array.isArray(type)) type.forEach((item) => types.add(item));
    Object.values(value).forEach((item) => collectSchemaTypes(item, types));
  }
  return types;
}

function localTarget(raw) {
  const value = decode(raw).trim();
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) return null;
  const clean = value.split(/[?#]/, 1)[0];
  let pathname;
  try { pathname = decodeURIComponent(clean); } catch { pathname = clean; }
  if (!pathname.startsWith('/')) return null;
  if (basePath && pathname === basePath) pathname = '/';
  else if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
  if (pathname === '/') return join(dist, 'index.html');
  const target = join(dist, pathname.replace(/^\/+/, ''));
  if (existsSync(target) && statSync(target).isFile()) return target;
  return join(target, 'index.html');
}

function parseJsonLd(html, route) {
  const values = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try { values.push(JSON.parse(decode(match[1]))); }
    catch (error) { fail(`${route}: malformed JSON-LD (${error.message})`); }
  }
  return values;
}

if (!existsSync(dist)) {
  console.error('SEO audit requires a built dist directory. Run npm run build first.');
  process.exit(1);
}

const htmlFiles = walkFiles(dist, '.html');
const pages = htmlFiles.map((file) => {
  const html = readFileSync(file, 'utf8');
  const route = routeFor(file);
  const robotsTags = meta(html, 'name', 'robots');
  const robots = robotsTags[0]?.content?.toLowerCase() ?? '';
  const redirect = meta(html, 'http-equiv', 'refresh').length > 0;
  return { file, html, route, robots, redirect, noindex: robots.includes('noindex') };
});

const indexable = pages.filter((page) => !page.noindex && !page.redirect);
const noindexContentRoutes = new Set(['/404.html', '/future-monsters/', '/you-ask-i-answer/']);
const redirectRoutes = new Set(['/frop-a-vibe/']);
const titleOwners = new Map();
const descriptionOwners = new Map();
const canonicalOwners = new Map();

for (const page of pages) {
  const { html, route } = page;
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const titleMatches = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => decode(match[1]).trim());
  const descriptionTags = meta(head, 'name', 'description');
  const robotsTags = meta(head, 'name', 'robots');
  const canonicalTags = tags(head, 'link').filter((item) => (item.rel || '').split(/\s+/).includes('canonical'));
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!/^<!doctype html>/i.test(html) || !/<html\b[^>]*\blang=["']en["']/i.test(html)) fail(`${route}: missing HTML5 doctype or lang=en`);
  if (titleMatches.length !== 1 || !titleMatches[0]) fail(`${route}: expected exactly one non-empty title`);
  if (descriptionTags.length !== 1 || !descriptionTags[0]?.content) fail(`${route}: expected exactly one meta description`);
  if (robotsTags.length !== 1 || !page.robots) fail(`${route}: expected exactly one robots directive`);
  if (canonicalTags.length !== 1 || !canonicalTags[0]?.href) fail(`${route}: expected exactly one canonical`);
  if (tags(head, 'meta').some((item) => item.name === 'keywords')) fail(`${route}: obsolete meta keywords found`);

  if (page.redirect) {
    if (!redirectRoutes.has(route)) fail(`${route}: unexpected compatibility redirect`);
    if (!page.noindex || !page.robots.includes('follow')) fail(`${route}: redirect must use noindex, follow`);
  } else if (noindexContentRoutes.has(route)) {
    if (!page.noindex) fail(`${route}: expected noindex`);
  } else if (page.noindex) {
    fail(`${route}: unexpected noindex`);
  }

  if (!page.noindex && !page.redirect) {
    if (!page.robots.includes('index') || !page.robots.includes('follow') || !page.robots.includes('max-image-preview:large')) fail(`${route}: incomplete indexable robots directive`);
    if (h1Count !== 1) fail(`${route}: expected exactly one H1, found ${h1Count}`);

    const title = titleMatches[0];
    const description = descriptionTags[0].content;
    const canonical = canonicalTags[0].href;
    for (const [value, owner, label] of [[title, titleOwners, 'title'], [description, descriptionOwners, 'description'], [canonical, canonicalOwners, 'canonical']]) {
      if (owner.has(value)) fail(`${route}: duplicate ${label} also used by ${owner.get(value)}`);
      else owner.set(value, route);
    }
    try {
      const parsed = new URL(canonical);
      if (parsed.protocol !== 'https:' || parsed.search || parsed.hash || !parsed.pathname.endsWith('/')) fail(`${route}: invalid canonical ${canonical}`);
      if (parsed.origin !== expectedSite) fail(`${route}: canonical uses unexpected origin ${parsed.origin}`);
      if (basePath && !parsed.pathname.startsWith(`${basePath}/`)) fail(`${route}: canonical escapes configured base ${basePath}`);
    } catch { fail(`${route}: malformed canonical ${canonical}`); }

    for (const key of ['title', 'description', 'url', 'image', 'image:alt']) {
      if (meta(head, 'property', `og:${key}`).length !== 1) fail(`${route}: missing or duplicate og:${key}`);
    }
    for (const key of ['card', 'title', 'description', 'image', 'image:alt']) {
      if (meta(head, 'name', `twitter:${key}`).length !== 1) fail(`${route}: missing or duplicate twitter:${key}`);
    }
    for (const [label, value] of [
      ['og:url', meta(head, 'property', 'og:url')[0]?.content],
      ['og:image', meta(head, 'property', 'og:image')[0]?.content],
      ['twitter:image', meta(head, 'name', 'twitter:image')[0]?.content],
    ]) {
      try {
        if (new URL(value).origin !== expectedSite) fail(`${route}: ${label} uses an unexpected origin`);
      } catch { fail(`${route}: ${label} is not a valid absolute URL`); }
    }

    const schemas = parseJsonLd(html, route);
    if (!schemas.length) fail(`${route}: no JSON-LD`);
    const schemaTypes = collectSchemaTypes(schemas);
    if (route !== '/' && !schemaTypes.has('BreadcrumbList')) fail(`${route}: missing BreadcrumbList schema`);
    if (route.startsWith('/toolbox/') && !route.startsWith('/toolbox/family/') && schemaTypes.has('WebApplication')) fail(`${route}: misleading WebApplication schema found`);
  }

  const visible = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
  if (/\bKhizology\b/.test(visible)) fail(`${route}: old public brand spelling found`);

  for (const imageTag of html.matchAll(/<img\b[^>]*>/gi)) {
    const image = attrs(imageTag[0]);
    if (!Object.hasOwn(image, 'alt')) fail(`${route}: image missing alt attribute (${image.src || 'unknown source'})`);
    if (!image.width || !image.height) fail(`${route}: image missing intrinsic dimensions (${image.src || 'unknown source'})`);
  }

  for (const element of html.matchAll(/<(?:a|link|script|img)\b[^>]*>/gi)) {
    const properties = attrs(element[0]);
    const target = localTarget(properties.href || properties.src);
    if (target && !existsSync(target)) fail(`${route}: broken local reference ${properties.href || properties.src}`);
  }
}

for (const expected of noindexContentRoutes) {
  if (!pages.some((page) => page.route === expected && page.noindex)) fail(`${expected}: required noindex page missing`);
}
for (const expected of redirectRoutes) {
  if (!pages.some((page) => page.route === expected && page.redirect && page.noindex)) fail(`${expected}: required noindex redirect missing`);
}

const sitemapFile = join(dist, 'sitemap-0.xml');
const sitemap = existsSync(sitemapFile) ? readFileSync(sitemapFile, 'utf8') : '';
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decode(match[1]));
const canonicalUrls = [...canonicalOwners.keys()].sort();
if (new Set(sitemapUrls).size !== sitemapUrls.length) fail('sitemap: duplicate URLs');
for (const url of sitemapUrls) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== expectedSite) fail(`sitemap: unexpected origin ${parsed.origin}`);
  } catch { fail(`sitemap: malformed URL ${url}`); }
}
if (sitemapUrls.length !== canonicalUrls.length || sitemapUrls.slice().sort().some((url, index) => url !== canonicalUrls[index])) {
  fail(`sitemap: URL set differs from ${canonicalUrls.length} indexable canonicals`);
}

const robotsFile = join(dist, 'robots.txt');
const robotsText = existsSync(robotsFile) ? readFileSync(robotsFile, 'utf8') : '';
if (!/^User-agent: \*$/m.test(robotsText) || !/^Allow: \/$/m.test(robotsText)) fail('robots.txt: crawl policy is missing');
if (!/sitemap-index\.xml$/m.test(robotsText) || !/image-sitemap\.xml$/m.test(robotsText)) fail('robots.txt: sitemap declarations are missing');
if (!robotsText.includes(`Sitemap: ${expectedSite}${basePath}/sitemap-index.xml`)
  || !robotsText.includes(`Sitemap: ${expectedSite}${basePath}/image-sitemap.xml`)) {
  fail('robots.txt: sitemap declarations use an unexpected origin or base');
}

const imageSitemapFile = join(dist, 'image-sitemap.xml');
const imageSitemap = existsSync(imageSitemapFile) ? readFileSync(imageSitemapFile, 'utf8') : '';
const imageLocs = [...imageSitemap.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map((match) => decode(match[1]));
const artworkPage = pages.find((page) => page.route === '/artworks/');
const artworkSources = new Set([...(artworkPage?.html || '').matchAll(/<img\b[^>]*src=["']([^"']*\/images\/artworks\/[^"']+)["']/gi)].map((match) => decode(match[1])));
const artworkButtonTags = [...(artworkPage?.html || '').matchAll(/<button\b[^>]*class=["'][^"']*\baw-card\b[^>]*>/gi)].map((match) => attrs(match[0]));
const artworkCards = artworkButtonTags.length;
const artworkIds = artworkButtonTags.map((button) => button['data-artwork-id']);
const artworkSlugs = artworkButtonTags.map((button) => button['data-artwork-slug']);
if (imageLocs.length !== artworkSources.size) fail(`Artooo: image sitemap/gallery mismatch (${imageLocs.length}/${artworkSources.size})`);
if (artworkCards !== artworkSources.size) fail(`Artooo: expected ${artworkSources.size} server-rendered artwork cards, found ${artworkCards}`);
if (new Set(artworkIds).size !== artworkCards || new Set(artworkSlugs).size !== artworkCards) fail('Artooo: artwork IDs or slugs are not unique');
if (!artworkIds.includes('artwork:flower-05.jpg') || !artworkIds.includes('artwork:Flower 05.jpg')) fail('Artooo: both Flower 05 source identities must remain present');
for (const imageUrl of imageLocs) {
  const parsed = new URL(imageUrl);
  if (parsed.origin !== expectedSite) fail(`image sitemap: unexpected origin ${parsed.origin}`);
  const target = localTarget(parsed.pathname);
  if (!target || !existsSync(target)) fail(`image sitemap: missing asset ${imageUrl}`);
}

for (const page of indexable.filter((item) => /^\/toolbox\/[^/]+\/$/.test(item.route))) {
  if (!page.html.includes('Understand ') || !page.html.includes('Assumptions and limits')) fail(`${page.route}: missing static explanatory guide`);
  if (!/class=["'][^"']*tp-related-item/.test(page.html)) fail(`${page.route}: missing crawlable related-tool links`);
  if (!page.html.includes(`/toolbox/family/`)) fail(`${page.route}: missing family link`);
}

const socialImage = join(dist, 'images', 'site', 'khizooology-social.png');
if (!existsSync(socialImage)) fail('social preview: default image is missing');
else {
  const data = readFileSync(socialImage);
  if (data.readUInt32BE(16) !== 1200 || data.readUInt32BE(20) !== 630) fail('social preview: expected 1200x630 PNG');
}
if (!existsSync(join(dist, 'apple-touch-icon.png'))) fail('favicon: apple touch icon is missing');

const summary = {
  generatedHtmlPages: pages.length,
  indexablePages: indexable.length,
  noindexContentPages: pages.filter((page) => page.noindex && !page.redirect).length,
  compatibilityRedirects: pages.filter((page) => page.redirect).length,
  uniqueTitles: titleOwners.size,
  uniqueDescriptions: descriptionOwners.size,
  uniqueCanonicals: canonicalOwners.size,
  sitemapUrls: sitemapUrls.length,
  imageSitemapEntries: imageLocs.length,
  serverRenderedArtworkCards: artworkCards,
  errors: errors.length,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error('\nSEO audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('\nSEO audit passed.');
