import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const origin = 'https://khizooology.com';
const read = file => fs.readFileSync(path.join(dist, file), 'utf8');
const locations = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
export function prepareSubmission(changes) {
  const { key } = JSON.parse(fs.readFileSync(path.join(root, 'scripts/indexnow-config.json'), 'utf8'));
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key) || read(`${key}.txt`) !== key) throw new Error('Invalid public IndexNow key file');
  function localUrl(value) {
    const u = new URL(value);
    if (u.origin !== origin || u.search || u.hash || /%|\.\./.test(u.pathname)) throw new Error('Noncanonical sitemap URL');
    return u.pathname.replace(/^\//, '');
  }
  const urlList = locations(read('sitemap-index.xml')).flatMap(sitemap => {
    const file = localUrl(sitemap);
    if (!/^sitemap-\d+\.xml$/.test(file)) throw new Error('Unexpected sitemap file');
    return locations(read(file));
  });
  if (!urlList.length || urlList.length > 10000 || new Set(urlList).size !== urlList.length) throw new Error('Invalid sitemap URL count or duplicates');
  for (const value of urlList) {
    const route = localUrl(value).replace(/\/$/, '');
    const html = read(route ? `${route}/index.html` : 'index.html');
    if (/<meta\b[^>]*(?:noindex|http-equiv=["']refresh)/i.test(html)) throw new Error(`Excluded page in sitemap: ${route}`);
    const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/)?.[1];
    if (canonical !== value) throw new Error(`Canonical mismatch: ${route}`);
  }
  if (!changes) return { host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList };
  if (!Array.isArray(changes.updated) || !Array.isArray(changes.removed)) throw new Error('Changes require updated and removed URL arrays');
  const selected = [...changes.updated, ...changes.removed];
  if (!selected.length || selected.length > 10000 || new Set(selected).size !== selected.length) throw new Error('Invalid changed URL count or duplicates');
  for (const value of selected) {
    if (typeof value !== 'string') throw new Error('Changed URLs must be strings');
    localUrl(value);
    if (!/^\/(?:[a-z0-9-]+\/)*$/.test(new URL(value).pathname)) throw new Error('Changed URL must be a canonical public page');
  }
  for (const value of changes.updated) if (!urlList.includes(value)) throw new Error('Updated URL is not canonical and indexable');
  for (const value of changes.removed) {
    if (urlList.includes(value)) throw new Error('Removed URL is still indexable');
    const route = localUrl(value).replace(/\/$/, '');
    const file = path.join(dist, route ? `${route}/index.html` : 'index.html');
    if (fs.existsSync(file) && !/<meta\b[^>]*http-equiv=["']refresh/i.test(fs.readFileSync(file, 'utf8'))) throw new Error('Removed URL still has a non-redirect page');
  }
  return { host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList: selected };
}
async function checkedGet(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Live prerequisite returned HTTP ${response.status}`);
  return response.text();
}
async function main() {
  const argument = process.argv.indexOf('--changes');
  const submitting = process.argv.includes('--submit');
  if (submitting && argument < 0) throw new Error('Submission requires --changes file.json with explicitly reviewed updated/removed URLs; unchanged sitemap URLs are not submitted');
  const changes = argument < 0 ? undefined : JSON.parse(fs.readFileSync(process.argv[argument + 1], 'utf8'));
  const payload = prepareSubmission(changes);
  if (!process.argv.includes('--submit')) { console.log(`IndexNow dry run PASS: ${payload.urlList.length} canonical indexable URLs. Nothing submitted.`); return; }
  if (await checkedGet(payload.keyLocation) !== payload.key) throw new Error('Hosted key does not match; deploy first');
  const liveMaps = locations(await checkedGet(`${origin}/sitemap-index.xml`));
  const liveUrls = [];
  for (const map of liveMaps) {
    if (!map.startsWith(`${origin}/sitemap-`)) throw new Error('Unexpected live sitemap host');
    liveUrls.push(...locations(await checkedGet(map)));
  }
  if (JSON.stringify([...liveUrls].sort()) !== JSON.stringify([...prepareSubmission().urlList].sort())) throw new Error('Live sitemap differs from local build; deploy and validate first');
  for (const value of changes.updated) {
    const html = await checkedGet(value);
    const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/)?.[1];
    if (canonical !== value || /<meta\b[^>]*noindex/i.test(html)) throw new Error('Updated live page is not canonical/indexable');
  }
  for (const value of changes.removed) {
    const response = await fetch(value, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if ([404, 410].includes(response.status)) continue;
    const html = response.status === 200 ? await response.text() : '';
    const target = [301, 308].includes(response.status) ? response.headers.get('location') : html.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)/i)?.[1];
    if (!target || !liveUrls.includes(new URL(target, value).href)) throw new Error('Removed live URL must return 404/410 or redirect to an indexable canonical URL');
    await checkedGet(new URL(target, value).href);
  }
  const response = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow HTTP ${response.status}; inspect key/host/payload or retry later for rate limits. No indexing claim made.`);
  console.log(`IndexNow received ${payload.urlList.length} URLs (HTTP ${response.status})${response.status === 202 ? '; key validation pending' : ''}. Submission does not mean indexed. This does not submit to Google.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
