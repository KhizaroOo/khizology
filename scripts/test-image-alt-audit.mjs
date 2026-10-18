import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('./audit-seo.mjs', import.meta.url), 'utf8');
function declaration(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
const start = source.indexOf('  const imageAudit = {');
const end = source.indexOf('  for (const element of html.matchAll', start);
assert.ok(start > 0 && end > start);
function audit(html) {
  const failures = [], results = new Map();
  vm.runInNewContext(`${declaration('decode')}\n${declaration('attrs')}\n${source.slice(start, end)}`, {
    html, route: '/', quality: {missingImageAlt: 0, invalidImageAlt: 0, emptyImageAlt: 0},
    fail: message => failures.push(message),
    localTarget: asset => asset,
    existsSync: asset => asset === '/ornament.webp',
    requiredImageAltRoutes: new Set(['/']), requiredImageAltResults: results,
  });
  return {failures, result: results.get('/')};
}
const image = alt => `<img src="/art.webp" width="100" height="100" ${alt}>`;
assert.equal(audit(image('alt="Original ink drawing of a bird"')).failures.length, 0);
assert.match(audit(image('')).failures.join(' '), /missing alt/);
for (const value of ['', '   ']) assert.match(audit(image(`alt="${value}"`)).failures.join(' '), /empty image alt/);
for (const value of ['null', 'undefined']) assert.match(audit(image(`alt="${value}"`)).failures.join(' '), /invalid alt/);
const decoration = `<span data-decorative-image aria-hidden="true" style="background-image:url('/ornament.webp')"></span>`;
assert.equal(audit(decoration).failures.length, 0);
assert.equal(audit(decoration).result.decorative, 1);
assert.ok(audit(decoration.replace('true', 'false')).failures.length);
assert.ok(audit(decoration.replace('/ornament.webp', '/missing.webp')).failures.length);
console.log('Image-alt audit PASS: descriptive content, missing/empty/whitespace/invalid alt, hidden decoration and broken decorative assets.');
