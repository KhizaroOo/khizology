import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isSiteVerificationFile } from './site-verification.mjs';

const root = process.cwd();
const dist = join(root, 'dist');
const errors = [];
const configuredBase = process.env.BASE_URL?.trim() || '/';
const basePath = configuredBase === '/' ? '' : `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;
const expectedSite = new URL(process.env.SITE_URL?.trim() || 'https://khizooology.com').origin;
const quality = {
  missingDescriptions: 0,
  duplicateDescriptions: 0,
  missingH1: 0,
  missingCanonicals: 0,
  invalidCanonicals: 0,
  nonSelfCanonicals: 0,
  missingImageAlt: 0,
  invalidImageAlt: 0,
  emptyImageAlt: 0,
  invalidJsonLd: 0,
  profilePagesMissingMainEntity: 0,
  brokenInternalLinks: 0,
  nonCanonicalInternalLinks: 0,
  internalLinksToRedirects: 0,
  orphanIndexablePages: 0,
  placeholderFindings: 0,
};
const incomingLinks = new Map();
const visiblePlaceholder = /\b(?:lorem ipsum|todo\b|fixme\b|placeholder)\b/i;

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

function localTarget(raw, route = '/') {
  const value = decode(raw).trim();
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) return null;
  const clean = new URL(value, `${expectedSite}${basePath}${route}`).pathname;
  let pathname;
  try { pathname = decodeURIComponent(clean); } catch { pathname = clean; }
  if (basePath && pathname === basePath) pathname = '/';
  else if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
  if (pathname === '/') return join(dist, 'index.html');
  const target = join(dist, pathname.replace(/^\/+/, ''));
  if (existsSync(target) && statSync(target).isFile()) return target;
  return join(target, 'index.html');
}

function localPagePath(raw, route = '/') {
  const value = decode(raw).trim();
  if (!value || value.startsWith('#') || /^(?:mailto:|tel:|data:|javascript:)/i.test(value)) return null;

  let parsed;
  try { parsed = new URL(value, `${expectedSite}${basePath}${route}`); }
  catch { return null; }
  if (parsed.origin !== expectedSite) return null;

  let pathname;
  try { pathname = decodeURIComponent(parsed.pathname); } catch { pathname = parsed.pathname; }
  if (basePath && pathname === basePath) return '/';
  if (basePath && pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length);
  return pathname;
}

function parseJsonLd(html, route) {
  const values = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try { values.push(JSON.parse(decode(match[1]))); }
    catch (error) { quality.invalidJsonLd += 1; fail(`${route}: malformed JSON-LD (${error.message})`); }
  }
  return values;
}

function hasSchemaType(node, expected) {
  const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
  return types.includes(expected);
}

function topLevelSchemaNodes(schemas) {
  return schemas.flatMap((schema) => {
    if (Array.isArray(schema)) return topLevelSchemaNodes(schema);
    return Array.isArray(schema?.['@graph']) ? schema['@graph'] : [schema];
  });
}

function auditProfilePageSchema(schemas, route) {
  const nodes = topLevelSchemaNodes(schemas).filter((node) => node && typeof node === 'object');
  const byId = new Map(nodes.filter((node) => typeof node['@id'] === 'string').map((node) => [node['@id'], node]));
  const profilePages = nodes.filter((node) => hasSchemaType(node, 'ProfilePage'));
  for (const profilePage of profilePages) {
    const mainEntity = profilePage.mainEntity;
    if (!mainEntity || typeof mainEntity !== 'object') {
      quality.profilePagesMissingMainEntity += 1;
      fail(`${route}: ProfilePage is missing mainEntity`);
      continue;
    }
    const entity = typeof mainEntity['@id'] === 'string' ? byId.get(mainEntity['@id']) : mainEntity;
    if (!entity || (!hasSchemaType(entity, 'Person') && !hasSchemaType(entity, 'Organization'))) {
      quality.profilePagesMissingMainEntity += 1;
      fail(`${route}: ProfilePage.mainEntity must resolve to Person or Organization`);
    }
  }
  const personIds = nodes.filter((node) => hasSchemaType(node, 'Person') && typeof node['@id'] === 'string').map((node) => node['@id']);
  if (new Set(personIds).size !== personIds.length) fail(`${route}: duplicate canonical Person entity IDs in JSON-LD`);
  if (route === '/my-portfolio/') {
    const canonicalPersonId = `${expectedSite}${basePath}/my-portfolio/#person`;
    const profile = profilePages[0];
    const person = byId.get(canonicalPersonId);
    if (profilePages.length !== 1) fail('/my-portfolio/: expected exactly one ProfilePage');
    if (profile?.mainEntity?.['@id'] !== canonicalPersonId) fail('/my-portfolio/: ProfilePage.mainEntity must reference the canonical Person');
    if (!hasSchemaType(person, 'Person') || !person.name || !person.alternateName) fail('/my-portfolio/: canonical Person requires name and alternateName');
    if (personIds.filter((id) => id === canonicalPersonId).length !== 1) fail('/my-portfolio/: expected one canonical Person entity');
  }
}

if (!existsSync(dist)) {
  console.error('SEO audit requires a built dist directory. Run npm run build first.');
  process.exit(1);
}

const htmlFiles = walkFiles(dist, '.html').filter(file => !isSiteVerificationFile(file));
const pages = htmlFiles.map((file) => {
  const html = readFileSync(file, 'utf8');
  const route = routeFor(file);
  const robotsTags = meta(html, 'name', 'robots');
  const robots = robotsTags[0]?.content?.toLowerCase() ?? '';
  const redirect = meta(html, 'http-equiv', 'refresh').length > 0;
  return { file, html, route, robots, redirect, noindex: robots.includes('noindex') };
});

const indexable = pages.filter((page) => !page.noindex && !page.redirect);
const pagesByFile = new Map(pages.map((page) => [page.file, page]));
const noindexContentRoutes = new Set(['/404.html', '/future-monsters/', '/you-ask-i-answer/', '/infooo/human-atlas-viewer/']);
const notesIndex = pages.find((page) => page.route === '/notes/');
if (notesIndex?.noindex) noindexContentRoutes.add('/notes/');
const redirectRoutes = new Set(['/frop-a-vibe/']);
const titleOwners = new Map();
const descriptionOwners = new Map();
const canonicalOwners = new Map();
const requiredImageAltRoutes = new Set(['/', '/my-portfolio/', '/behind-the-vibes/', '/notooo/', '/infooo/']);
const requiredImageAltResults = new Map();

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
  if (!page.noindex && !page.redirect && titleMatches[0]?.length >= 70) fail(`${route}: title must be under 70 characters (${titleMatches[0].length})`);
  if (descriptionTags.length !== 1 || !descriptionTags[0]?.content) { quality.missingDescriptions += 1; fail(`${route}: expected exactly one meta description`); }
  if (robotsTags.length !== 1 || !page.robots) fail(`${route}: expected exactly one robots directive`);
  if (!page.noindex && !page.redirect && tags(head, 'meta').some(item => ['googlebot', 'bingbot'].includes((item.name || '').toLowerCase()) && /\b(?:noindex|none)\b/i.test(item.content || ''))) fail(`${route}: bot-specific directive conflicts with intended indexability`);
  if (canonicalTags.length !== 1 || !canonicalTags[0]?.href) { quality.missingCanonicals += 1; fail(`${route}: expected exactly one canonical`); }
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
    if (h1Count !== 1) { quality.missingH1 += 1; fail(`${route}: expected exactly one H1, found ${h1Count}`); }

    const title = titleMatches[0];
    const description = descriptionTags[0].content;
    const canonical = canonicalTags[0].href;
    for (const [value, owner, label] of [[title, titleOwners, 'title'], [description, descriptionOwners, 'description'], [canonical, canonicalOwners, 'canonical']]) {
      if (owner.has(value)) { if (label === 'description') quality.duplicateDescriptions += 1; fail(`${route}: duplicate ${label} also used by ${owner.get(value)}`); }
      else owner.set(value, route);
    }
    try {
      const parsed = new URL(canonical);
      if (parsed.protocol !== 'https:' || parsed.search || parsed.hash || !parsed.pathname.endsWith('/')) { quality.invalidCanonicals += 1; fail(`${route}: invalid canonical ${canonical}`); }
      if (parsed.origin !== expectedSite) { quality.invalidCanonicals += 1; fail(`${route}: canonical uses unexpected origin ${parsed.origin}`); }
      if (basePath && !parsed.pathname.startsWith(`${basePath}/`)) { quality.invalidCanonicals += 1; fail(`${route}: canonical escapes configured base ${basePath}`); }
      const expectedCanonical = `${expectedSite}${basePath}${route}`;
      if (canonical !== expectedCanonical) { quality.nonSelfCanonicals += 1; fail(`${route}: canonical must self-reference ${expectedCanonical}`); }
    } catch { quality.invalidCanonicals += 1; fail(`${route}: malformed canonical ${canonical}`); }

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
    auditProfilePageSchema(schemas, route);
    const schemaTypes = collectSchemaTypes(schemas);
    if (route !== '/' && !schemaTypes.has('BreadcrumbList')) fail(`${route}: missing BreadcrumbList schema`);
    if (route !== '/toolbox/' && route.startsWith('/toolbox/') && !route.startsWith('/toolbox/family/') && (html.includes('data-tool-example') || schemaTypes.has('WebApplication'))) {
      const page = topLevelSchemaNodes(schemas).find(node => hasSchemaType(node, 'WebPage'));
      const app = page?.mainEntity;
      // These active browser tools are applications. Validate the visible contract
      // rather than banning the type; planned tools must never claim a working app.
      if (!html.includes('data-tool-example') || !hasSchemaType(app, 'WebApplication') ||
          app.url !== canonical || app['@id'] !== `${canonical}#application` ||
          !app.name || !html.includes(app.name.replaceAll('&', '&amp;')) ||
          app.description !== description || app.operatingSystem !== 'Any' ||
          app.applicationCategory !== 'UtilitiesApplication' || app.isAccessibleForFree !== true ||
          app.aggregateRating || app.offers) fail(`${route}: application schema must match a working visible free browser tool`);
    }
  }

  const visible = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
  if (/\bKhizology\b/.test(visible)) fail(`${route}: old public brand spelling found`);
  if (!page.noindex && !page.redirect && visiblePlaceholder.test(visible)) { quality.placeholderFindings += 1; fail(`${route}: visible placeholder content found`); }

  const imageAudit = { total: 0, decorative: 0, missing: 0, invalid: 0 };
  for (const imageTag of html.matchAll(/<img\b[^>]*>/gi)) {
    const image = attrs(imageTag[0]);
    imageAudit.total += 1;
    if (!Object.hasOwn(image, 'alt')) {
      imageAudit.missing += 1;
      quality.missingImageAlt += 1;
      fail(`${route}: image missing alt attribute (${image.src || 'unknown source'})`);
    } else if (!image.alt.trim()) {
      imageAudit.invalid += 1;
      quality.emptyImageAlt += 1;
      fail(`${route}: empty image alt (${image.src || 'unknown source'}); use descriptive alt for content or DecorativeImage for ornament`);
    } else if (['undefined', 'null'].includes(image.alt.trim().toLowerCase())) {
      imageAudit.invalid += 1;
      quality.invalidImageAlt += 1;
      fail(`${route}: image has invalid alt value (${image.src || 'unknown source'})`);
    }
    if (!image.width || !image.height) fail(`${route}: image missing intrinsic dimensions (${image.src || 'unknown source'})`);
  }
  for (const decorativeTag of html.matchAll(/<span\b[^>]*data-decorative-image[^>]*>/gi)) {
    const decorative = attrs(decorativeTag[0]);
    imageAudit.decorative += 1;
    const asset = decorative.style?.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/)?.[1];
    const target = asset && localTarget(asset, route);
    if (decorative['aria-hidden'] !== 'true' || !target || !existsSync(target)) {
      fail(`${route}: decorative visual must be hidden from assistive technology and reference a real local asset`);
    }
  }
  if (requiredImageAltRoutes.has(route)) requiredImageAltResults.set(route, imageAudit);

  for (const element of html.matchAll(/<(?:a|link|script|img|iframe)\b[^>]*>/gi)) {
    const properties = attrs(element[0]);
    const target = localTarget(properties.href || properties.src, route);
    if (target && !existsSync(target)) { quality.brokenInternalLinks += 1; fail(`${route}: broken local reference ${properties.href || properties.src}`); }
    if (/^<a\b/i.test(element[0]) && target && pagesByFile.get(target)?.redirect) {
      quality.internalLinksToRedirects += 1;
      fail(`${route}: internal page link points to compatibility redirect (${properties.href})`);
    }
    if (target && existsSync(target) && indexable.some((page) => page.file === target) && routeFor(target) !== route) {
      const targetRoute = routeFor(target);
      incomingLinks.set(targetRoute, (incomingLinks.get(targetRoute) || 0) + 1);
    }
    if (/^<a\b/i.test(element[0]) && properties.href) {
      const pathname = localPagePath(properties.href, route);
      const hasFileExtension = /\/[^/]+\.[a-z0-9]+$/i.test(pathname || '');
      if (pathname && !hasFileExtension && !pathname.endsWith('/')) {
        quality.nonCanonicalInternalLinks += 1;
        fail(`${route}: internal page link must use the trailing-slash canonical URL (${properties.href})`);
      }
    }
  }
}

for (const route of requiredImageAltRoutes) {
  const result = requiredImageAltResults.get(route);
  if (!result) fail(`${route}: required image-alt audit route missing`);
  else if (!result.total && !result.decorative) fail(`${route}: expected at least one content image or decorative visual`);
  else if (result.missing || result.invalid) fail(`${route}: required image-alt audit failed`);
}

for (const page of indexable) {
  if (page.route !== '/' && !incomingLinks.get(page.route)) { quality.orphanIndexablePages += 1; fail(`${page.route}: indexable page has no internal discovery link`); }
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
  const sitemapPath = localPagePath(url);
  const target = sitemapPath ? localTarget(sitemapPath) : null;
  const page = target ? pagesByFile.get(target) : null;
  if (!page || page.noindex || page.redirect) fail(`sitemap: excluded or missing page ${url}`);
}
if (sitemapUrls.length !== canonicalUrls.length || sitemapUrls.slice().sort().some((url, index) => url !== canonicalUrls[index])) {
  fail(`sitemap: URL set differs from ${canonicalUrls.length} indexable canonicals`);
}

// Audit the generated agent guide against the same public HTML/canonicals as SEO.
const llmsFile = join(dist, 'llms.txt');
const llmsText = existsSync(llmsFile) ? readFileSync(llmsFile, 'utf8') : '';
if (!/^# Khizooology\n\n> [^\n]+\n/.test(llmsText)) fail('llms.txt: missing site name or summary');
for (const heading of ['Start Here', 'Toolooo — Visual Browser Tools', 'Infooo — Interactive Knowledge Worlds', 'Notooo — Book in One Page', 'Artooo — Original Art', 'Optional']) {
  if (!llmsText.includes(`\n## ${heading}\n`)) fail(`llms.txt: missing ${heading} section`);
}
const llmsLinks = [...llmsText.matchAll(/^- \[((?:\\.|[^\]\\])+)\]\(([^)\s]+)\): (.+)$/gm)];
const llmsUrls = new Set(llmsLinks.map((match) => match[2]));
if (!llmsLinks.length) fail('llms.txt: missing Markdown resource links');
for (const line of llmsText.split('\n').filter((line) => line.startsWith('- '))) {
  if (!llmsLinks.some((match) => match[0] === line)) fail('llms.txt: malformed resource link');
}
for (const target of llmsUrls) {
  if (!canonicalOwners.has(target)) fail(`llms.txt: noncanonical, excluded or missing public page ${target}`);
}
const llmsRequiredRoutes = new Set(['/', '/behind-the-vibes/', '/my-portfolio/', '/artworks/', '/privacy/', '/drop-a-vibe/']);
for (const page of indexable) {
  if (/^\/(?:toolbox|infooo|notooo|notes)(?:\/|$)/.test(page.route)) llmsRequiredRoutes.add(page.route);
}
for (const route of llmsRequiredRoutes) {
  if (!llmsUrls.has(`${expectedSite}${basePath}${route}`)) fail(`llms.txt: missing public content ${route}`);
}
if (/future-\d|\?\?\?ooo/i.test(llmsText)) fail('llms.txt: mystery content exposed');
if (existsSync(join(root, 'public', 'llms.txt'))) fail('llms.txt: must be generated, not maintained in public/');
for (const page of pages.filter((page) => !page.redirect && page.route !== '/infooo/human-atlas-viewer/')) {
  const discovery = tags(page.html, 'link').filter((item) => item.rel === 'describedby');
  if (discovery.length !== 1 || discovery[0].href !== `${expectedSite}${basePath}/llms.txt`) fail(`${page.route}: missing or incorrect llms.txt discovery link`);
}

const robotsFile = join(dist, 'robots.txt');
const robotsText = existsSync(robotsFile) ? readFileSync(robotsFile, 'utf8') : '';
if (!/^User-agent: \*$/m.test(robotsText) || !/^Allow: \/$/m.test(robotsText)) fail('robots.txt: crawl policy is missing');
// The canonical policy permits all public assets and crawlers. Changes require review.
if (/^Disallow:\s*\S+/mi.test(robotsText) || (robotsText.match(/^User-agent:/gmi) || []).length !== 1) fail('robots.txt: unexpected crawler restrictions or conflicting groups');
if (!/sitemap-index\.xml$/m.test(robotsText) || !/image-sitemap\.xml$/m.test(robotsText)) fail('robots.txt: sitemap declarations are missing');
if (!robotsText.includes(`Sitemap: ${expectedSite}${basePath}/sitemap-index.xml`)
  || !robotsText.includes(`Sitemap: ${expectedSite}${basePath}/image-sitemap.xml`)) {
  fail('robots.txt: sitemap declarations use an unexpected origin or base');
}

const imageSitemapFile = join(dist, 'image-sitemap.xml');
const imageSitemap = existsSync(imageSitemapFile) ? readFileSync(imageSitemapFile, 'utf8') : '';
const imageLocs = [...imageSitemap.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map((match) => decode(match[1]));
const artworkPage = pages.find((page) => page.route === '/artworks/');

const artworkButtonTags = [...(artworkPage?.html || '').matchAll(/<button\b[^>]*class=["'][^"']*\baw-card\b[^>]*>/gi)].map((match) => attrs(match[0]));
const artworkCards = artworkButtonTags.length;
if (!llmsText.includes(`Explore ${artworkCards} original artworks`)) fail('llms.txt: gallery count differs from public Artooo content');
const artworkSources = new Set(artworkButtonTags.map(button => button['data-artwork-original']));
for (const source of artworkSources) {
  if (!source || !imageLocs.includes(new URL(source, expectedSite).href)) fail(`Artooo: original missing from sitemap: ${source}`);
}
const artworkIds = artworkButtonTags.map((button) => button['data-artwork-id']);
const artworkSlugs = artworkButtonTags.map((button) => button['data-artwork-slug']);
if (imageLocs.length !== artworkSources.size) fail(`Artooo: image sitemap/gallery mismatch (${imageLocs.length}/${artworkSources.size})`);
if (artworkCards !== artworkSources.size) fail(`Artooo: expected ${artworkSources.size} server-rendered artwork cards, found ${artworkCards}`);
if (new Set(artworkIds).size !== artworkCards || new Set(artworkSlugs).size !== artworkCards) fail('Artooo: artwork IDs or slugs are not unique');
const normalizeArtworkSlug = (filename) => filename
  .replace(/\.(jpg|jpeg|png|webp)$/i, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const stableArtworkFilenameHash = (filename) => {
  let hash = 2166136261;
  for (const character of filename) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
};
const galleryFilenames = artworkButtonTags.map((button) => decodeURIComponent(new URL(button['data-artwork-original'], expectedSite).pathname.split('/').pop() || ''));
const gallerySlugCounts = galleryFilenames.reduce((counts, filename) => {
  const slug = normalizeArtworkSlug(filename);
  counts.set(slug, (counts.get(slug) || 0) + 1);
  return counts;
}, new Map());
for (const [index, button] of artworkButtonTags.entries()) {
  const filename = galleryFilenames[index];
  const normalizedSlug = normalizeArtworkSlug(filename);
  const expectedSlug = gallerySlugCounts.get(normalizedSlug) > 1
    ? `${normalizedSlug}-${stableArtworkFilenameHash(filename)}`
    : normalizedSlug;
  if (button['data-artwork-slug'] !== expectedSlug) fail(`Artooo: slug changed from filename identity for ${filename}`);
}
if (artworkIds.includes('artwork:flower-05.jpg')) fail('Artooo: duplicate Flowers in a Jar source identity must not remain');
if (!artworkIds.includes('artwork:Flower 05.jpg')) fail('Artooo: retained Flower 05 source identity is missing');
for (const imageUrl of imageLocs) {
  const parsed = new URL(imageUrl);
  if (parsed.origin !== expectedSite) fail(`image sitemap: unexpected origin ${parsed.origin}`);
  const target = localTarget(parsed.pathname);
  if (!target || !existsSync(target)) fail(`image sitemap: missing asset ${imageUrl}`);
}

const artworkRegistrySource = readFileSync(join(root, 'src', 'data', 'artworks.ts'), 'utf8');
const titleOverridesSource = artworkRegistrySource.match(/const artworkTitleOverrides: Record<string, string> = \{([\s\S]*?)\r?\n\};\r?\n\r?\nconst rawFiles/);
if (!titleOverridesSource) {
  fail('Artooo: artwork title override registry is missing');
}
const artworkTitleOverrides = new Map(
  [...(titleOverridesSource?.[1] || '').matchAll(/^\s*'([^']+)': '([^']+)',\r?$/gm)].map(([, filename, title]) => [filename, title]),
);
const artworkAssetDirectory = join(root, 'public', 'images', 'artworks');
const artworkFilenames = readdirSync(artworkAssetDirectory).filter((filename) => /\.(jpg|jpeg|png|webp)$/i.test(filename));
const artworkTitleOwners = new Map();
const suspiciousArtworkTitle = /\b(?:random|untitled|drawing|image|artwork|test|temp)\b/i;
const numberedGenericArtworkTitle = /^(?:flower|drawing|image|artwork|sketch|raw beauty|tree house|jack and sally|random)\s+\d+$/i;
const titleFromFilename = (filename) => filename
  .replace(/\.(jpg|jpeg|png|webp)$/i, '')
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

for (const filename of artworkFilenames) {
  const title = artworkTitleOverrides.get(filename) || titleFromFilename(filename);
  const titleKey = title.toLocaleLowerCase();
  if (!title.trim()) fail(`Artooo: empty title for ${filename}`);
  if (/\.(jpg|jpeg|png|webp)$/i.test(title)) fail(`Artooo: filename extension in title for ${filename}`);
  if (!/[a-z]/i.test(title)) fail(`Artooo: title is mostly numeric for ${filename}`);
  if (suspiciousArtworkTitle.test(title) || numberedGenericArtworkTitle.test(title)) fail(`Artooo: placeholder or import-style title for ${filename}: ${title}`);
  if (title.length > 54) fail(`Artooo: title cannot form a sub-70-character SEO title for ${filename}: ${title}`);
  if (artworkTitleOwners.has(titleKey)) fail(`Artooo: duplicate title ${title} for ${filename} and ${artworkTitleOwners.get(titleKey)}`);
  else artworkTitleOwners.set(titleKey, filename);
}
for (const filename of artworkTitleOverrides.keys()) {
  if (!artworkFilenames.includes(filename)) fail(`Artooo: title override references a missing asset: ${filename}`);
}
if (artworkTitleOwners.size !== artworkFilenames.length) fail('Artooo: title audit did not review every artwork asset');
const renderedArtworkTitles = [...(artworkPage?.html || '').matchAll(/<span\b[^>]*class=["'][^"']*\baw-card-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
  .map((match) => decode(match[1]).replace(/<[^>]+>/g, '').trim());
if (renderedArtworkTitles.length !== artworkCards) fail(`Artooo: expected ${artworkCards} rendered artwork titles, found ${renderedArtworkTitles.length}`);
const renderedArtworkTitleKeys = renderedArtworkTitles.map((title) => title.toLocaleLowerCase()).sort();
const registryArtworkTitleKeys = [...artworkTitleOwners.keys()].sort();
if (renderedArtworkTitleKeys.some((title, index) => title !== registryArtworkTitleKeys[index])) {
  fail('Artooo: generated artwork titles differ from the central registry');
}

for (const page of indexable.filter((item) => /^\/toolbox\/[^/]+\/$/.test(item.route))) {
  if (!page.html.includes('Understand ') || !page.html.includes('Assumptions and limits')) fail(`${page.route}: missing static explanatory guide`);
  if (!/class=["'][^"']*tp-related-item/.test(page.html)) fail(`${page.route}: missing crawlable related-tool links`);
  if (!page.html.includes(`/toolbox/family/`)) fail(`${page.route}: missing family link`);
}

if (notesIndex?.noindex && /data-note-card/.test(notesIndex.html)) fail('/notes/: noindex index cannot render note cards');
if (notesIndex && !notesIndex.noindex && !/data-note-card/.test(notesIndex.html)) fail('/notes/: published notes index must render note cards');

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
  longIndexableTitles: [...titleOwners.keys()].filter((title) => title.length >= 70).length,
  uniqueDescriptions: descriptionOwners.size,
  missingDescriptions: quality.missingDescriptions,
  duplicateDescriptions: quality.duplicateDescriptions,
  missingH1: quality.missingH1,
  missingCanonicals: quality.missingCanonicals,
  invalidCanonicals: quality.invalidCanonicals,
  nonSelfCanonicals: quality.nonSelfCanonicals,
  imagesMissingAlt: quality.missingImageAlt,
  imagesWithInvalidAlt: quality.invalidImageAlt,
  imagesWithEmptyAlt: quality.emptyImageAlt,
  invalidJsonLd: quality.invalidJsonLd,
  profilePagesMissingMainEntity: quality.profilePagesMissingMainEntity,
  brokenInternalLinks: quality.brokenInternalLinks,
  nonCanonicalInternalLinks: quality.nonCanonicalInternalLinks,
  internalLinksToRedirects: quality.internalLinksToRedirects,
  orphanIndexablePages: quality.orphanIndexablePages,
  placeholderFindings: quality.placeholderFindings,
  uniqueCanonicals: canonicalOwners.size,
  sitemapUrls: sitemapUrls.length,
  llmsPublicUrls: llmsUrls.size,
  imageSitemapEntries: imageLocs.length,
  serverRenderedArtworkCards: artworkCards,
  reviewedArtworkTitles: artworkTitleOwners.size,
  errors: errors.length,
};

console.log(JSON.stringify(summary, null, 2));
const inventoryArgument = process.argv.indexOf('--inventory');
if (inventoryArgument >= 0) {
  const inventoryFile = process.argv[inventoryArgument + 1];
  if (!inventoryFile) throw new Error('--inventory requires an output file');
  const graph = new Map(pages.map(page => [page.route, [...new Set(tags(page.html, 'a').map(link => localPagePath(link.href, page.route)).filter(route => pages.some(candidate => candidate.route === route)))]]));
  const depths = new Map([['/', 0]]), queue = ['/'];
  for (let index = 0; index < queue.length; index++) for (const route of graph.get(queue[index]) || []) if (!depths.has(route)) { depths.set(route, depths.get(queue[index]) + 1); queue.push(route); }
  const text = html => decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const inventory = pages.map(page => {
    const images = tags(page.html, 'img');
    const main = page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || page.html;
    const canonical = tags(page.html, 'link').find(link => link.rel === 'canonical')?.href;
    const family = page.route.split('/').filter(Boolean)[0] || 'home';
    return {
      url: `${expectedSite}${basePath}${page.route}`, route: page.route, routeType: page.redirect ? 'compatibility redirect' : page.route === '/404.html' ? 'error page' : page.route === '/infooo/human-atlas-viewer/' ? 'embedded application' : page.route.split('/').filter(Boolean).length > 1 ? 'detail/category' : 'hub/site',
      expectedHttpStatus: 200, statusContext: page.route === '/404.html' ? 'Direct static error document is 200; unknown routes must return 404' : page.redirect ? 'Static host uses an immediate meta-refresh fallback' : 'Static document',
      classification: page.redirect ? 'REDIRECT' : page.noindex ? 'INTENTIONAL NOINDEX' : 'INDEXABLE',
      indexable: !page.noindex && !page.redirect, robots: page.robots, canonical, sitemap: sitemapUrls.includes(`${expectedSite}${basePath}${page.route}`),
      title: text(page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''), description: meta(page.html, 'name', 'description')[0]?.content,
      h1: [...page.html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => text(match[1])),
      mainTextWords: text(main).split(/\s+/).filter(Boolean).length, contentMeasurement: 'Descriptive only; not a quality threshold',
      schemaTypes: [...collectSchemaTypes(parseJsonLd(page.html, page.route))], imageCount: images.length, imagesMissingAlt: images.filter(image => !Object.hasOwn(image, 'alt')).length,
      internalInboundPages: [...graph.values()].filter(links => links.includes(page.route)).length, internalOutbound: graph.get(page.route), linkDepthFromHome: depths.get(page.route) ?? null,
      redirectTarget: meta(page.html, 'http-equiv', 'refresh')[0]?.content?.match(/url=(.*)$/i)?.[1] || null,
      contentFamily: family, rendering: /<astro-island\b[^>]*client="only"/i.test(main) ? 'static context with client-only interactive renderer' : /<astro-island\b/i.test(main) ? 'static HTML with hydrated islands' : 'static HTML',
    };
  });
  writeFileSync(inventoryFile, JSON.stringify({ summary, maximumIndexableLinkDepth: Math.max(...inventory.filter(page => page.indexable).map(page => page.linkDepthFromHome ?? -1)), pages: inventory }, null, 2) + '\n');
  console.log(`URL inventory written: ${inventory.length} HTML documents`);
}
// Optional read-only live gate reuses the same generated route inventory and parsers.
if (process.argv.includes('--production')) {
  const records = [];
  async function request(url) {
    const hops = [];
    for (let i = 0; i < 6; i++) {
      const response = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }, signal: AbortSignal.timeout(20000) });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        const next = new URL(location, url);
        if (![new URL(expectedSite).hostname, `www.${new URL(expectedSite).hostname}`].includes(next.hostname)) throw new Error('unexpected redirect host');
        hops.push({ url, status: response.status, target: next.href });
        await response.body?.cancel();
        url = next.href;
        continue;
      }
      return { url, status: response.status, hops, xRobots: response.headers.get('x-robots-tag') || '', hsts: response.headers.get('strict-transport-security'), html: await response.text() };
    }
    throw new Error('redirect chain exceeds five hops');
  }
  function signals(html, route) {
    return {
      counts: { canonical: tags(html, 'link').filter(item => item.rel === 'canonical').length, title: [...html.matchAll(/<title\b/gi)].length, description: meta(html, 'name', 'description').length, robots: meta(html, 'name', 'robots').length, ogUrl: meta(html, 'property', 'og:url').length },
      botRobots: tags(html, 'meta').filter(item => ['googlebot', 'bingbot'].includes((item.name || '').toLowerCase())),
      metaRedirect: meta(html, 'http-equiv', 'refresh')[0]?.content || null,
      canonical: tags(html, 'link').find(item => item.rel === 'canonical')?.href,
      robots: meta(html, 'name', 'robots')[0]?.content,
      title: decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim(),
      description: meta(html, 'name', 'description')[0]?.content,
      h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => match[1]),
      ogUrl: meta(html, 'property', 'og:url')[0]?.content,
      schema: parseJsonLd(html, route),
      images: tags(html, 'img'),
      links: tags(html, 'a').map(item => item.href).filter(Boolean),
    };
  }
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < pages.length) {
      const page = pages[cursor++];
      const requested = `${expectedSite}${basePath}${page.route}`;
      try {
        const live = await request(requested);
        const signal = signals(live.html, page.route);
        const local = signals(page.html, page.route);
        const findings = [];
        if (live.status !== 200 || live.hops.length || live.url !== requested) findings.push('canonical document status/redirect mismatch');
        for (const field of ['counts', 'botRobots', 'metaRedirect', 'canonical', 'robots', 'title', 'description', 'h1', 'ogUrl', 'schema']) {
          if (JSON.stringify(signal[field]) !== JSON.stringify(local[field])) findings.push(`dist/production ${field} mismatch`);
        }
        if (!page.noindex && !page.redirect && /\b(?:noindex|none)\b/i.test(live.xRobots)) findings.push('indexable response has restrictive X-Robots-Tag');
        if (signal.images.some(item => !Object.hasOwn(item, 'alt'))) findings.push('missing image alt');
        for (const href of signal.links) {
          const target = new URL(href, requested);
          if (![new URL(expectedSite).hostname, `www.${new URL(expectedSite).hostname}`].includes(target.hostname)) continue;
          if (!/\/[^/]+\.[a-z0-9]+$/i.test(target.pathname) && (target.origin !== expectedSite || !target.pathname.endsWith('/'))) findings.push(`redirect-form internal link ${href}`);
          if (target.origin === expectedSite && !/\/[^/]+\.[a-z0-9]+$/i.test(target.pathname) && !pages.some(item => `${basePath}${item.route}` === target.pathname)) findings.push(`unknown internal page ${target.pathname}`);
        }
        records.push({ requested, status: live.status, finalUrl: live.url, redirects: live.hops, xRobots: live.xRobots, ...signal, indexable: !page.noindex && !page.redirect, sitemap: sitemapUrls.includes(requested), findings });
        findings.forEach(finding => fail(`${page.route}: live ${finding}`));
      } catch (error) { fail(`${page.route}: production request failed: ${error.message}`); records.push({ requested, error: error.message }); }
    }
  }));
  const discovery = [];
  for (const name of ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', 'image-sitemap.xml', 'llms.txt']) {
    try {
      const live = await request(`${expectedSite}${basePath}/${name}`);
      const matches = live.status === 200 && !live.hops.length && live.html.trim() === readFileSync(join(dist, name), 'utf8').trim();
      discovery.push({ name, status: live.status, matchesDist: matches });
      if (!matches) fail(`${name}: production discovery differs from dist`);
    } catch (error) { fail(`${name}: live request failed ${error.message}`); }
  }
  const variants = [ '/my-portfolio', '/toolbox/ai-project-pricing-lab', '/privacy', '/behind-the-vibes', '/drop-a-vibe' ].map(route => `${expectedSite}${basePath}${route}`);
  variants.push('http://www.khizooology.com/', 'http://khizooology.com/', 'https://www.khizooology.com/');
  const redirects = [];
  for (const requested of variants) {
    try {
      const live = await request(requested);
      const target = new URL(requested); target.protocol = 'https:'; target.hostname = new URL(expectedSite).hostname;
      if (!target.pathname.endsWith('/')) target.pathname += '/';
      const signal = signals(live.html, target.pathname);
      const canonical = target.href;
      const pass = live.hops.length === 1 && [301, 308].includes(live.hops[0].status) && live.status === 200 && live.url === canonical && signal.canonical === canonical && !/\b(?:noindex|none)\b/i.test(`${signal.robots} ${live.xRobots}`) && sitemapUrls.includes(canonical) && !sitemapUrls.includes(requested);
      redirects.push({ requested, classification: pass ? 'INTENTIONAL CANONICAL REDIRECT' : 'BROKEN / CHAINED REDIRECT', status: live.hops[0]?.status || live.status, hops: live.hops, finalStatus: live.status, finalUrl: live.url, canonical: signal.canonical, robots: signal.robots, xRobots: live.xRobots, hsts: live.hsts, destinationInSitemap: sitemapUrls.includes(canonical), sourceInSitemap: sitemapUrls.includes(requested) });
      if (!pass) fail(`${requested}: live redirect policy failed`);
    } catch (error) { fail(`${requested}: redirect request failed ${error.message}`); }
  }
  const missing = await request(`${expectedSite}/search-audit-missing-page/?private=synthetic-audit-marker`);
  const missingSignal = signals(missing.html, '/404.html');
  if (missing.status !== 404 || missing.hops.length || !/noindex/i.test(missingSignal.robots || '')) fail('unknown route: expected 404/noindex without redirect');
  const report = { generatedDocuments: pages.length, indexable: indexable.length, records, discovery, redirects, missingPage: { status: missing.status, canonical: missingSignal.canonical, robots: missingSignal.robots }, errorCount: errors.length };
  const reportIndex = process.argv.indexOf('--production-report');
  if (reportIndex >= 0 && process.argv[reportIndex + 1]) writeFileSync(process.argv[reportIndex + 1], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ productionDocuments: records.length, discovery, redirects, missingPage: report.missingPage, errorCount: errors.length }, null, 2));
}
if (errors.length) {
  console.error('\nSEO audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('\nSEO audit passed.');
