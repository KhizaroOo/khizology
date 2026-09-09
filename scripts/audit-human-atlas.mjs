import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const base = (process.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '');
const prefix = base ? `/${base}` : '';
const auditOrigin = 'https://khizooology.com';
const worldPath = `${prefix}/infooo/human-atlas/`;
const viewerPath = `${prefix}/infooo/human-atlas-viewer/index.html`;
const viewerUrl = new URL(viewerPath, auditOrigin);
const checkedPaths = new Set([worldPath, viewerPath]);
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];

function asset(raw, from = viewerUrl) {
  const url = new URL(raw, from);
  assert.equal(url.origin, auditOrigin, `Viewer asset must be self-hosted: ${raw}`);
  assert.ok(url.pathname.startsWith(`${prefix}/infooo/`), `Viewer asset escapes Infooo: ${raw}`);
  assert.ok(!url.search && !url.hash, `Unexpected viewer asset state: ${raw}`);
  const file = path.join(dist, decodeURIComponent(url.pathname.slice(prefix.length)));
  assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), `Missing viewer asset: ${url.pathname}`);
  checkedPaths.add(url.pathname);
  return file;
}

assert.ok(fs.existsSync(dist), 'Build dist/ before running the Human Atlas audit');
const world = fs.readFileSync(path.join(dist, 'infooo/human-atlas/index.html'), 'utf8');
const frames = [...world.matchAll(/<iframe\b[^>]*>/gi)].map(match => match[0]);
assert.equal(frames.length, 1, 'Human Atlas must have exactly one viewer');
assert.equal(attr(frames[0], 'src'), viewerPath, 'Use the explicit viewer index.html; a public-directory URL returns 404 in Astro dev');
assert.ok(attr(frames[0], 'title'), 'The embedded viewer needs an accessible title');

const viewer = fs.readFileSync(asset(viewerPath), 'utf8');
assert.ok(/<div\b[^>]*id=["']root["']/.test(viewer), 'The viewer application mount is missing');
assert.ok(!/This vibe doesn.t exist|data-astro-source-file.*404/i.test(viewer), 'The viewer must not render the site 404 document');
assert.ok(/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(viewer), 'The viewer needs explicit noindex metadata');
const canonical = [...viewer.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => attr(tag, 'rel') === 'canonical');
assert.equal(attr(canonical || '', 'href'), `${auditOrigin}${worldPath}`, 'The viewer canonical must point to the public learning page');

const moduleFiles = [];
let learningLayer = '';
for (const match of viewer.matchAll(/<(?:script|link|img)\b[^>]*>/gi)) {
  const tag = match[0];
  if (attr(tag, 'rel') === 'canonical') continue;
  const raw = attr(tag, 'src') || attr(tag, 'href');
  if (!raw) continue;
  const file = asset(raw);
  if (file.endsWith('.js')) {
    if (raw.endsWith('learning-layer.js')) learningLayer = file;
    else moduleFiles.push(file);
  }
  if (file.endsWith('.css')) {
    const css = fs.readFileSync(file, 'utf8');
    for (const item of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      if (!item[1].startsWith('data:')) asset(item[1], new URL(raw, viewerUrl));
    }
  }
}
assert.equal(moduleFiles.length, 1, 'Expected one self-hosted viewer module');
assert.ok(learningLayer, 'The Infooo learning layer must be loaded with the viewer');
const learning = fs.readFileSync(learningLayer, 'utf8');
assert.ok(learning.includes('Follow the Blood'), 'The learning layer must include the Follow the Blood journey');
assert.ok(learning.includes('What is it?') && learning.includes('Why does it matter?'), 'Supported structures need concise learning prompts');
assert.ok(learning.includes('https://www.nhlbi.nih.gov/health/heart/blood-flow'), 'Learning claims need a source-backed reference');
assert.ok(!/diagnos|treat(?:ment)?/i.test(learning), 'The learning layer must not make diagnostic or treatment claims');
const bundle = fs.readFileSync(moduleFiles[0], 'utf8');
assert.ok(bundle.includes('DecompressionStream'), 'Compressed anatomy decoding support is missing');
assert.ok(!/["'`]\/models\//.test(bundle), 'An upstream /models URL would bypass the self-hosted assets');
assert.ok(!/["'`]\/ATTRIBUTION\.md/.test(bundle), 'An upstream attribution URL would return 404');
assert.ok(!/googletagmanager\.com|google-analytics\.com/.test(bundle), 'The embedded viewer must not add independent analytics');
const manifestRef = bundle.match(/["'`]([^"'`]*human-atlas-assets\/models\/atlas\.json)["'`]/)?.[1];
assert.ok(manifestRef, 'Viewer bundle must reference the self-hosted anatomy manifest');
const manifest = JSON.parse(fs.readFileSync(asset(manifestRef), 'utf8'));
assert.ok(manifest.chunks?.length && manifest.parts?.length && manifest.concepts?.length, 'Anatomy manifest is incomplete');
const chunkLengths = [];
let compressedBytes = 0;
let fallbackBytes = 0;
for (const [index, chunk] of manifest.chunks.entries()) {
  const gzip = fs.readFileSync(asset(chunk.gzip));
  assert.equal(gzip.length, chunk.gzipBytes, `Chunk ${index}: compressed byte count mismatch`);
  const decoded = gunzipSync(gzip);
  assert.equal(decoded.length, chunk.bytes, `Chunk ${index}: decoded byte count mismatch`);
  const fallback = fs.readFileSync(asset(chunk.url));
  assert.ok(fallback.equals(decoded), `Chunk ${index}: uncompressed fallback differs from gzip data`);
  chunkLengths.push(decoded.length);
  compressedBytes += gzip.length;
  fallbackBytes += fallback.length;
}
const partIds = new Set();
for (const part of manifest.parts) {
  assert.ok(part.id && !partIds.has(part.id), `Duplicate or missing anatomy part ID: ${part.id}`);
  partIds.add(part.id);
  const bytes = chunkLengths[part.chunk];
  assert.ok(Number.isInteger(bytes), `${part.id}: nonexistent geometry chunk`);
  assert.ok(Number.isInteger(part.vertexCount) && part.vertexCount > 0, `${part.id}: invalid vertex count`);
  assert.ok(Number.isInteger(part.indexCount) && part.indexCount > 0 && part.indexCount % 3 === 0, `${part.id}: invalid triangle indices`);
  for (const [field, length, alignment] of [
    ['positions', part.vertexCount * 3 * 4, 4],
    ['normals', part.vertexCount * 3 * 2, 2],
    ['indices', part.indexCount * 4, 4],
  ]) assert.ok(Number.isInteger(part[field]) && part[field] >= 0 && part[field] % alignment === 0 && part[field] + length <= bytes, `${part.id}: ${field} exceeds or misaligns its geometry chunk`);
}
const conceptIds = new Set();
for (const concept of manifest.concepts) {
  assert.ok(concept.id && !conceptIds.has(concept.id), `Duplicate or missing concept ID: ${concept.id}`);
  conceptIds.add(concept.id);
  assert.ok(concept.elements?.length && concept.elements.every(id => partIds.has(id)), `${concept.id}: concept references nonexistent anatomy`);
}
asset('./ATTRIBUTION.txt');
asset('./LICENSE.txt');

let unrelatedRoutes = 0;
for (const file of walk(dist).filter(file => file.endsWith('.html'))) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (['infooo/human-atlas/index.html', 'infooo/human-atlas-viewer/index.html'].includes(relative)) continue;
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(!/<(?:script|link|iframe|source)\b[^>]*(?:src|href)=["'][^"']*human-atlas-(?:viewer|assets)/i.test(html), `${relative}: anatomy resources must load only inside Human Atlas`);
  unrelatedRoutes++;
}

// Optional HTTP validation reproduces the original dev-server failure, which a
// filesystem existence check alone cannot catch. Use --origin for dev or preview.
const originArg = process.argv.indexOf('--origin');
if (originArg !== -1) {
  assert.ok(process.argv[originArg + 1], '--origin needs a server URL');
  const origin = new URL(process.argv[originArg + 1]);
  assert.ok(['http:', 'https:'].includes(origin.protocol), 'HTTP checks require an HTTP(S) origin');
  for (const pathname of checkedPaths) {
    const response = await fetch(new URL(pathname, origin), { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `HTTP ${response.status}: ${pathname}`);
    if (!pathname.endsWith('.html') && pathname !== worldPath) assert.ok(!response.headers.get('content-type')?.includes('text/html'), `HTML fallback returned instead of asset: ${pathname}`);
  }
  const response = await fetch(new URL(viewerPath, origin), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, 'Viewer GET failed');
  assert.ok(/<div\b[^>]*id=["']root["']/.test(await response.text()), 'HTTP viewer response is not the application document');
}

console.log(JSON.stringify({
  result: 'PASS', viewerDocument: viewerPath, checkedAssetsAndRoutes: checkedPaths.size,
  anatomyParts: partIds.size, anatomyConcepts: conceptIds.size, geometryChunks: chunkLengths.length,
  compressedBytes, fallbackBytes, unrelatedRoutesWithoutAnatomy: unrelatedRoutes,
  httpChecked: originArg !== -1,
}, null, 2));
