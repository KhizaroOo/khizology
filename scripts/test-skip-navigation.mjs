import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isSiteVerificationFile } from './site-verification.mjs';

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
let pages = 0, standalone = 0;
for (const file of walk('dist').filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('k-navbar')) {
    assert.ok(isSiteVerificationFile(file) || file.replaceAll('\\', '/').includes('/human-atlas-viewer/') || /http-equiv="refresh"/i.test(html), `${file}: unreviewed standalone document`);
    assert.ok(!html.includes('k-skip-link'), `${file}: embedded/redirect/verification document has no global navigation layer`);
    standalone++;
    continue;
  }
  const body = html.slice(html.indexOf('<body'));
  const links = [...body.matchAll(/<a\b[^>]*>/g)].filter(([tag]) => attr(tag, 'class')?.split(' ').includes('k-skip-link'));
  assert.equal(links.length, 1, `${file}: exactly one skip link`);
  assert.equal(attr(links[0][0], 'href'), '#main-content');
  const firstControl = body.match(/<(?:a|button|input|select|textarea|iframe)\b[^>]*>/)?.[0];
  assert.equal(firstControl, links[0][0], `${file}: skip link is first focusable control`);
  const mains = [...body.matchAll(/<main\b[^>]*>/g)];
  assert.equal(mains.length, 1, `${file}: one main landmark`);
  assert.equal(attr(mains[0][0], 'id'), 'main-content');
  assert.equal(attr(mains[0][0], 'tabindex'), '-1', `${file}: main is programmatically focusable only`);
  assert.equal([...html.matchAll(/\bid=["']main-content["']/g)].length, 1, `${file}: unique skip target`);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: unique generated IDs`);
  pages++;
}
assert.ok(pages > 0);
const css = fs.readFileSync('src/styles/global.css', 'utf8');
assert.match(css, /\.k-skip-link:focus\s*\{[^}]*transform: translateY\(0\)/);
assert.doesNotMatch(css.match(/\.k-skip-link\s*\{[^}]*\}/)[0], /display:\s*none|visibility:\s*hidden/);
assert.match(css, /#main-content\s*\{[^}]*scroll-margin-top:/);
console.log(`PASS: ${pages} shared-layout pages: first skip link, unique main/target/IDs; ${standalone} standalone documents retain their existing navigation boundaries.`);
