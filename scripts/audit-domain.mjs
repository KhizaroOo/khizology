import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const productionOrigin = 'https://khizooology.com';
const formerOrigin = 'https://khizarooo.github.io';
const formerBase = '/khizology/';
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function decode(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function values(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => decode(match[1]));
}

function assertProductionUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== productionOrigin) errors.push(`${label}: unexpected origin ${parsed.origin}`);
    if (parsed.pathname.startsWith(formerBase)) errors.push(`${label}: former base path remains`);
  } catch {
    errors.push(`${label}: invalid absolute URL`);
  }
}

const files = walk(dist);
const textFiles = files.filter((file) => /\.(?:html|css|js|json|txt|xml)$/i.test(file));
const text = textFiles.map((file) => fs.readFileSync(file, 'utf8'));
const htmlFiles = files.filter((file) => file.endsWith('.html'));

let canonicalUrls = 0;
let openGraphUrls = 0;
let socialImageUrls = 0;
let mixedContentResources = 0;
const redirectAudit = { httpInternalPageUrls: 0, wwwInternalPageUrls: 0, slashlessInternalPageUrls: 0, redirectUrlsInSitemap: 0, canonicalToRedirectUrls: 0 };
const htmlByFile = new Map(htmlFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));

/** Check actual discovery/navigation signals, including absolute same-site links. */
function assertPageSignal(value, label, route = '/', kind = 'reference') {
  if (!value || /^(?:#|mailto:|tel:|data:|javascript:)/i.test(value)) return;
  let parsed;
  try { parsed = new URL(decode(value), `${productionOrigin}${route}`); }
  catch { errors.push(`${label}: invalid URL`); return; }
  if (!['khizooology.com', 'www.khizooology.com'].includes(parsed.hostname)) return;
  const isPage = !/\/[^/]+\.[a-z0-9]+$/i.test(parsed.pathname);
  if (parsed.protocol !== 'https:') {
    if (isPage) redirectAudit.httpInternalPageUrls++;
    errors.push(`${label}: HTTP site URL ${value}`);
  }
  if (parsed.hostname !== 'khizooology.com') {
    if (isPage) redirectAudit.wwwInternalPageUrls++;
    errors.push(`${label}: WWW site URL ${value}`);
  }
  const slashlessRoot = /^https?:\/\/[^/?#]+(?:[?#]|$)/i.test(value);
  const redirectsByForm = parsed.protocol !== 'https:' || parsed.hostname !== 'khizooology.com' || (isPage && (!parsed.pathname.endsWith('/') || slashlessRoot));
  if (redirectsByForm && kind === 'canonical') redirectAudit.canonicalToRedirectUrls++;
  if (redirectsByForm && kind === 'sitemap') redirectAudit.redirectUrlsInSitemap++;
  if (isPage && (!parsed.pathname.endsWith('/') || slashlessRoot)) {
    redirectAudit.slashlessInternalPageUrls++;
    errors.push(`${label}: slashless directory URL ${value}`);
  }
  let pathname;
  try { pathname = decodeURIComponent(parsed.pathname); }
  catch { errors.push(`${label}: invalid path encoding`); return; }
  const target = path.join(dist, pathname.replace(/^\/+/, ''), isPage ? 'index.html' : '');
  // Astro's noindex error document uses /404/ metadata but is emitted as 404.html.
  const errorDocumentMetadata = route === '/404.html' && pathname === '/404/' && (kind === 'canonical' || label.endsWith('og:url'));
  if ((isPage || pathname.endsWith('.html')) && !htmlByFile.has(target) && !errorDocumentMetadata) errors.push(`${label}: missing generated page ${value}`);
  if (/http-equiv=["']refresh["']/i.test(htmlByFile.get(target) || '')) {
    if (!redirectsByForm && kind === 'canonical') redirectAudit.canonicalToRedirectUrls++;
    if (!redirectsByForm && kind === 'sitemap') redirectAudit.redirectUrlsInSitemap++;
    errors.push(`${label}: points to a compatibility redirect ${value}`);
  }
}

function assertSchemaSignals(value, label, route) {
  if (typeof value === 'string' && /^(?:https?:\/\/|\/)/i.test(value)) assertPageSignal(value, label, route);
  else if (Array.isArray(value)) value.forEach((item, i) => assertSchemaSignals(item, `${label}[${i}]`, route));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertSchemaSignals(item, `${label}.${key}`, route));
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  const route = `/${relative.replace(/index\.html$/, '')}`;
  for (const tag of html.matchAll(/<(?:a|link|meta)\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
    if (attributes.href) assertPageSignal(attributes.href, `${relative} ${tag[0].slice(1, 5)} href`, route, attributes.rel === 'canonical' ? 'canonical' : 'reference');
    if (attributes.property === 'og:url') assertPageSignal(attributes.content, `${relative} og:url`, route);
  }
  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { assertSchemaSignals(JSON.parse(script[1]), `${relative} JSON-LD`, route); }
    catch { errors.push(`${relative}: invalid JSON-LD`); }
  }
  for (const url of values(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/gi)) {
    canonicalUrls++;
    assertProductionUrl(url, `${relative} canonical`);
  }
  for (const url of values(html, /<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/gi)) {
    openGraphUrls++;
    assertProductionUrl(url, `${relative} og:url`);
  }
  for (const url of [
    ...values(html, /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi),
    ...values(html, /<meta\b[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi),
  ]) {
    socialImageUrls++;
    assertProductionUrl(url, `${relative} social image`);
  }
  mixedContentResources += values(html, /<(?:link|script|img|source|video|audio|iframe)\b[^>]*(?:href|src)=["'](http:\/\/[^"']+)["']/gi).length;
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8');
const sitemapUrls = values(sitemap, /<loc>(.*?)<\/loc>/g);
sitemapUrls.forEach((url, index) => assertProductionUrl(url, `sitemap URL ${index + 1}`));
if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push('sitemap: duplicate canonical variants');
sitemapUrls.forEach((url, index) => assertPageSignal(url, `sitemap URL ${index + 1}`, '/', 'sitemap'));

const imageSitemap = fs.readFileSync(path.join(dist, 'image-sitemap.xml'), 'utf8');
const imagePageUrls = values(imageSitemap, /<loc>(.*?)<\/loc>/g);
const imageUrls = values(imageSitemap, /<image:loc>(.*?)<\/image:loc>/g);
[...imagePageUrls, ...imageUrls].forEach((url, index) => assertProductionUrl(url, `image sitemap URL ${index + 1}`));
imagePageUrls.forEach((url, index) => assertPageSignal(url, `image sitemap page ${index + 1}`, '/', 'sitemap'));
for (const name of ['robots.txt', 'llms.txt', 'sitemap-index.xml']) {
  const discovery = fs.readFileSync(path.join(dist, name), 'utf8');
  for (const match of discovery.matchAll(/https?:\/\/[^\s<>"')]+/g)) assertPageSignal(match[0], `${name} discovery`);
}

const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
for (const expected of [
  `Sitemap: ${productionOrigin}/sitemap-index.xml`,
  `Sitemap: ${productionOrigin}/image-sitemap.xml`,
]) if (!robots.includes(expected)) errors.push(`robots.txt: missing ${expected}`);

const formerOriginOccurrences = text.reduce((sum, contents) => sum + contents.split(formerOrigin).length - 1, 0);
const formerBaseOccurrences = text.reduce((sum, contents) => sum + contents.split(formerBase).length - 1, 0);
if (formerOriginOccurrences) errors.push(`Former GitHub Pages origin occurs ${formerOriginOccurrences} time(s) in dist`);
if (formerBaseOccurrences) errors.push(`Former /khizology/ base occurs ${formerBaseOccurrences} time(s) in dist`);
if (mixedContentResources) errors.push(`Found ${mixedContentResources} insecure HTTP resource reference(s)`);
if (canonicalUrls !== htmlFiles.length) errors.push(`Expected ${htmlFiles.length} canonicals, found ${canonicalUrls}`);
const indexableCount = htmlFiles.filter(file => !/noindex|http-equiv=["']refresh/i.test(fs.readFileSync(file, 'utf8'))).length;
if (sitemapUrls.length !== indexableCount) errors.push(`Expected ${indexableCount} normal sitemap URLs, found ${sitemapUrls.length}`);
const expectedArtworkCount = fs.readdirSync(path.join(root, 'public', 'images', 'artworks')).filter(file => /\.(?:jpe?g|png|webp)$/i.test(file)).length;
if (imageUrls.length !== expectedArtworkCount) errors.push(`Expected ${expectedArtworkCount} image sitemap URLs, found ${imageUrls.length}`);

const report = {
  productionOrigin,
  productionBase: '/',
  generatedHtmlPages: htmlFiles.length,
  canonicalUrls,
  openGraphUrls,
  socialImageUrls,
  sitemapUrls: sitemapUrls.length,
  imageSitemapUrls: imageUrls.length,
  formerOriginOccurrences,
  formerBaseOccurrences,
  mixedContentResources,
  redirectAudit,
  errors: errors.length,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) {
  console.error('\nDomain audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nDomain audit passed.');
