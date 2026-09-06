import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSubmission } from './indexnow.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(path.join(root, 'dist')).filter(f => f.endsWith('.html'));
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(!/<script\b[^>]*src=["'][^"']*(?:googletagmanager|google-analytics)/i.test(html), 'Google must never load from server HTML');
  if (html.includes('http-equiv="refresh"')) continue;
  assert.ok(html.includes('data-analytics-preferences'), `Missing preferences: ${file}`);
  assert.ok(/href="\/privacy"/.test(html), `Missing privacy link: ${file}`);
}
const payload = prepareSubmission();
assert.ok(payload.urlList.includes('https://khizooology.com/privacy/'));
console.log(`Search build audit PASS: ${files.length} HTML pages; consent-gated scripts, privacy links and ${payload.urlList.length} canonical IndexNow candidates. No submission performed.`);
