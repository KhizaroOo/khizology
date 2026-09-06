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

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(dist, file).replaceAll('\\', '/');
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
  mixedContentResources += values(html, /<(?:link|script|img|source|video|audio)\b[^>]*(?:href|src)=["'](http:\/\/[^"']+)["']/gi).length;
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8');
const sitemapUrls = values(sitemap, /<loc>(.*?)<\/loc>/g);
sitemapUrls.forEach((url, index) => assertProductionUrl(url, `sitemap URL ${index + 1}`));

const imageSitemap = fs.readFileSync(path.join(dist, 'image-sitemap.xml'), 'utf8');
const imagePageUrls = values(imageSitemap, /<loc>(.*?)<\/loc>/g);
const imageUrls = values(imageSitemap, /<image:loc>(.*?)<\/image:loc>/g);
[...imagePageUrls, ...imageUrls].forEach((url, index) => assertProductionUrl(url, `image sitemap URL ${index + 1}`));

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
if (sitemapUrls.length !== 51) errors.push(`Expected 51 normal sitemap URLs, found ${sitemapUrls.length}`);
if (imageUrls.length !== 168) errors.push(`Expected 168 image sitemap URLs, found ${imageUrls.length}`);

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
  errors: errors.length,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) {
  console.error('\nDomain audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nDomain audit passed.');
