import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const expectedBase = (process.env.BASE_URL || '/khizology').replace(/\/$/, '') || '';
const expectedHost = process.env.SITE_URL || 'https://khizarooo.github.io';
const errors = [];
const warnings = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function count(html, pattern) { return [...html.matchAll(pattern)].length; }
function attr(html, name) {
  return [...html.matchAll(new RegExp(`\\s${name}=["']([^"']*)["']`, 'gi'))].map((match) => match[1]);
}
function decodeEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
function structuredNodes(value) {
  if (Array.isArray(value)) return value.flatMap(structuredNodes);
  if (!value || typeof value !== 'object') return [];
  const graph = Array.isArray(value['@graph']) ? value['@graph'].flatMap(structuredNodes) : [];
  return [value, ...graph];
}
function routeFor(file) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  if (relative === '404.html') return '/404.html';
  return `/${relative.replace(/\/index\.html$/, '/')}`;
}
function outputForPathname(pathname) {
  let local = decodeURIComponent(pathname);
  if (expectedBase && local.startsWith(expectedBase)) local = local.slice(expectedBase.length) || '/';
  if (local === '/') return path.join(dist, 'index.html');
  if (local === '/404.html') return path.join(dist, '404.html');
  const clean = local.replace(/^\//, '');
  if (path.extname(clean)) return path.join(dist, clean);
  return path.join(dist, clean, 'index.html');
}

if (!fs.existsSync(dist)) throw new Error('dist/ is missing. Run npm run build first.');

const files = walk(dist);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const htmlByRoute = new Map(htmlFiles.map((file) => [routeFor(file), fs.readFileSync(file, 'utf8')]));
const indexableRoutes = [];
const noindexRoutes = [];
const structuredTypes = new Map();
let internalLinks = 0;
let assetReferences = 0;

for (const [route, html] of htmlByRoute) {
  const location = `dist${route}`;
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  if (!html.trim()) errors.push(`${location}: empty HTML`);
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) errors.push(`${location}: missing html[lang=en]`);
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
    || /<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html);
  (noindex ? noindexRoutes : indexableRoutes).push(route);

  if (count(head, /<title\b[^>]*>[^<]+<\/title>/gi) !== 1) errors.push(`${location}: expected one non-empty title`);
  if (count(head, /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/gi) !== 1) errors.push(`${location}: expected one non-empty meta description`);
  if (count(head, /<link\b[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["']/gi) !== 1) errors.push(`${location}: expected one canonical`);
  if (route !== '/frop-a-vibe/' && count(html, /<h1\b/gi) !== 1) errors.push(`${location}: expected one h1`);
  if (route !== '/frop-a-vibe/' && count(html, /<main\b/gi) !== 1) errors.push(`${location}: expected one main landmark`);
  if (route !== '/frop-a-vibe/' && count(html, /<nav\b/gi) < 1) errors.push(`${location}: missing nav landmark`);

  if (!noindex) {
    for (const check of [
      ['Open Graph title', /<meta\b[^>]*property=["']og:title["']/i],
      ['Open Graph image', /<meta\b[^>]*property=["']og:image["']/i],
      ['Twitter card', /<meta\b[^>]*name=["']twitter:card["']/i],
    ]) if (!check[1].test(html)) errors.push(`${location}: missing ${check[0]}`);
  }

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = structuredNodes(data);
      for (const node of nodes) {
        const type = node?.['@type'];
        if (type) structuredTypes.set(type, (structuredTypes.get(type) || 0) + 1);
      }
    } catch { errors.push(`${location}: invalid JSON-LD`); }
  }

  const visible = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  for (const token of ['undefined', 'NaN', 'Infinity', '[object Object]']) {
    if (visible.includes(token)) errors.push(`${location}: visible sentinel ${token}`);
  }

  const documentIds = new Set([
    ...attr(html, 'id'),
    ...attr(html, 'name'),
  ]);
  for (const encoded of [...attr(html, 'href'), ...attr(html, 'src')]) {
    const raw = decodeEntities(encoded);
    if (!raw || /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(raw)) continue;
    let parsed;
    try { parsed = new URL(raw, `${expectedHost}${expectedBase}${route}`); } catch { errors.push(`${location}: invalid URL ${raw}`); continue; }
    if (parsed.origin !== expectedHost) continue;
    if (!parsed.pathname.startsWith(expectedBase || '/')) {
      errors.push(`${location}: internal URL escapes configured base (${parsed.pathname})`);
      continue;
    }
    const isAsset = /\.(?:css|js|png|jpe?g|gif|webp|svg|ico|xml|txt|woff2?)(?:$|\?)/i.test(parsed.pathname);
    if (isAsset) assetReferences++; else internalLinks++;
    const target = outputForPathname(parsed.pathname);
    if (!fs.existsSync(target) && !(route === '/404.html' && parsed.pathname === `${expectedBase}/404/`)) {
      errors.push(`${location}: broken ${isAsset ? 'asset' : 'link'} ${parsed.pathname}`);
      continue;
    }
    if (parsed.hash && !isAsset) {
      const targetHtml = parsed.pathname === new URL(`${expectedHost}${expectedBase}${route}`).pathname
        ? html
        : fs.readFileSync(target, 'utf8');
      const targetIds = new Set([...attr(targetHtml, 'id'), ...attr(targetHtml, 'name')]);
      if (!targetIds.has(decodeURIComponent(parsed.hash.slice(1)))) errors.push(`${location}: broken fragment ${parsed.pathname}${parsed.hash}`);
    }
  }
}

const toolRoutes = [...htmlByRoute.keys()].filter((route) => /^\/toolbox\/[^/]+\/$/.test(route));
const familyRoutes = [...htmlByRoute.keys()].filter((route) => /^\/toolbox\/family\/[^/]+\/$/.test(route));
if (htmlFiles.length !== 55) errors.push(`Expected 55 HTML pages, found ${htmlFiles.length}`);
if (toolRoutes.length !== 40) errors.push(`Expected 40 tool routes, found ${toolRoutes.length}`);
if (familyRoutes.length !== 5) errors.push(`Expected 5 family routes, found ${familyRoutes.length}`);
if (indexableRoutes.length !== 51) errors.push(`Expected 51 indexable pages, found ${indexableRoutes.length}`);
if (noindexRoutes.length !== 4) errors.push(`Expected 4 noindex/redirect pages, found ${noindexRoutes.length}`);

const artworkHtml = htmlByRoute.get('/artworks/') || '';
const artworkCards = count(artworkHtml, /data-artwork-id=/gi);
if (artworkCards !== 168) errors.push(`Expected 168 server-rendered artwork cards, found ${artworkCards}`);

const imageSitemap = fs.readFileSync(path.join(dist, 'image-sitemap.xml'), 'utf8');
const imageEntries = count(imageSitemap, /<image:image>/g);
if (imageEntries !== 168) errors.push(`Expected 168 image sitemap entries, found ${imageEntries}`);

const sitemap = files.find((file) => /sitemap-\d+\.xml$/.test(file));
const sitemapUrls = sitemap ? count(fs.readFileSync(sitemap, 'utf8'), /<url>/g) : 0;
if (sitemapUrls !== 51) errors.push(`Expected 51 sitemap URLs, found ${sitemapUrls}`);

const publicLeaks = files.filter((file) => /\.(?:map|ts|tsx|astro|md|log)$/i.test(file));
if (publicLeaks.length) errors.push(`Unexpected source/debug files in dist: ${publicLeaks.map(rel).join(', ')}`);

const textFiles = files.filter((file) => /\.(?:html|js|css|xml|txt|json)$/i.test(file));
const localPathFiles = textFiles.filter((file) => /(?:[A-Z]:\\|C:\/Users\/|D:\/)/i.test(fs.readFileSync(file, 'utf8')));
if (localPathFiles.length) errors.push(`Local developer paths in dist: ${localPathFiles.map(rel).join(', ')}`);

const scanFiles = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'scripts')),
  ...textFiles,
].filter((file) => /\.(?:html|js|mjs|ts|tsx|astro|css|xml|txt|json)$/i.test(file));
const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9_]{30,}/],
  ['Stripe live key', /sk_live_[A-Za-z0-9]{20,}/],
  ['generic credential assignment', /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"']{16,}["']/i],
];
const secretHits = [];
for (const file of scanFiles) {
  const contents = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of secretPatterns) if (pattern.test(contents)) secretHits.push(`${rel(file)} (${label})`);
}
if (secretHits.length) errors.push(`Suspected secrets (values suppressed): ${secretHits.join(', ')}`);

const toolScriptCounts = toolRoutes.map((route) => ({
  route,
  scripts: new Set([...htmlByRoute.get(route).matchAll(/\/_astro\/[^"'`\\s]+\.js/g)].map((match) => match[0])).size,
}));
const maxToolModuleScripts = Math.max(...toolScriptCounts.map((item) => item.scripts));
if (maxToolModuleScripts > 3) warnings.push(`A tool route loads up to ${maxToolModuleScripts} module entry scripts; inspect route isolation.`);

const astroAssets = files.filter((file) => rel(file).startsWith('dist/_astro/'));
const jsAssets = astroAssets.filter((file) => file.endsWith('.js'));
const cssAssets = astroAssets.filter((file) => file.endsWith('.css'));
const largestJs = [...jsAssets].sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const report = {
  generatedHtmlPages: htmlFiles.length,
  indexablePages: indexableRoutes.length,
  noindexOrRedirectPages: noindexRoutes.length,
  toolRoutes: toolRoutes.length,
  familyRoutes: familyRoutes.length,
  artworkCards,
  sitemapUrls,
  imageSitemapEntries: imageEntries,
  internalLinksChecked: internalLinks,
  assetReferencesChecked: assetReferences,
  structuredDataTypes: Object.fromEntries([...structuredTypes].sort()),
  publicSourceOrDebugFiles: publicLeaks.length,
  localPathLeaks: localPathFiles.length,
  suspectedSecretFiles: secretHits.length,
  jsBundles: jsAssets.length,
  cssBundles: cssAssets.length,
  largestJsBytes: largestJs ? fs.statSync(largestJs).size : 0,
  maxToolModuleEntryScripts: maxToolModuleScripts,
  warnings,
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
