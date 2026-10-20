import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSubmission } from './indexnow.mjs';
import { isSiteVerificationFile } from './site-verification.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(path.join(root, 'dist')).filter(f => f.endsWith('.html'));
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(!/<script\b[^>]*src=["'][^"']*(?:googletagmanager|google-analytics)/i.test(html), 'Google must never load from server HTML');
  if (isSiteVerificationFile(file) || html.includes('http-equiv="refresh"')) continue;
  if (path.relative(path.join(root, 'dist'), file).split(path.sep).join('/') === 'infooo/human-atlas-viewer/index.html') {
    assert.ok(/<meta\b[^>]*noindex/i.test(html), 'Embedded viewer must stay noindex; preferences belong to the parent world');
    continue;
  }
  assert.ok(html.includes('data-analytics-preferences'), `Missing preferences: ${file}`);
  assert.ok(/href="\/privacy\/?"/.test(html), `Missing privacy link: ${file}`);
}
const payload = prepareSubmission();
assert.ok(payload.urlList.includes('https://khizooology.com/privacy/'));
const updated = 'https://khizooology.com/toolbox/api-payload-doctor/';
const removed = 'https://khizooology.com/infooo/infrastructure-x-ray/';
assert.deepEqual(prepareSubmission({ updated: [updated], removed: [removed] }).urlList, [updated, removed]);
for (const changes of [
  { updated: [updated, updated], removed: [] },
  { updated: [`${updated}?private=NEVER_SEND`], removed: [] },
  { updated: ['https://khizooology.com/future-monsters/'], removed: [] },
  { updated: [], removed: [updated] },
  { updated: ['https://example.com/'], removed: [] },
]) assert.throws(() => prepareSubmission(changes), 'IndexNow must reject private, duplicate, noncanonical and lifecycle-invalid submissions');
console.log(`Search build audit PASS: ${files.length} HTML pages; consent-gated scripts, privacy links and ${payload.urlList.length} canonical IndexNow candidates. No submission performed.`);
