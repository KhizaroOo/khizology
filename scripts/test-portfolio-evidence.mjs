import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const { CONTACT } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/data/site.ts')))}`);
const html = read('dist/my-portfolio/index.html');
const attr = (tag, key) => tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
const selected = html.match(/<section\b[^>]*id="selected-work"[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert.ok(selected, 'Public evidence must be a visible section');
assert.ok(html.indexOf('id="selected-work"') < html.indexOf('pf-skills-section'), 'Evidence precedes the exhaustive skills list');
assert.ok(html.indexOf('id="selected-work"') < html.indexOf('pf-exp-section'), 'Evidence leads career history');
assert.equal((html.match(/id="selected-work"/g) || []).length, 1);
assert.match(html, /href="#selected-work"[^>]*>View selected work/);
const articles = [...selected.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(match => match[1]);
assert.equal(articles.length, 3);
for (const article of articles) {
  assert.match(article, /<h3\b/);
  for (const label of ['My role', 'My contribution', 'Delivered capability']) assert.ok(article.includes(label));
  assert.match(article, /<a\b/, 'Every highlighted contribution has evidence');
  assert.ok(!/\d+\+|revenue|ROI|guaranteed|sole author/i.test(article), 'No invented numeric outcomes or sole-authorship claims');
}
const cms = articles.find(article => article.includes('Custom .NET CMS at VAIVAL'));
assert.ok(cms.includes('Zeeshan Adil credits me'));
assert.ok(cms.includes('A public demo or source repository is not linked'));
assert.ok(cms.includes(`href="${CONTACT.linkedin}"`));
assert.ok(selected.includes('https://github.com/KhizaroOo/khizology'));
const links = [...selected.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
for (const [, tag, text] of links) {
  assert.ok(text.replace(/<[^>]+>/g, '').trim().length > 10, 'Use descriptive evidence/contact labels');
  if (attr(tag, 'target') === '_blank') {
    const rel = attr(tag, 'rel')?.split(' ') || [];
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
  }
}
const firstTeaser = [...read('dist/index.html').matchAll(/<a\b([^>]*)>/g)].find(match => attr(match[1], 'class')?.includes('artwork-thumb'));
assert.ok(selected.includes(`href="${attr(firstTeaser[1], 'href')}"`), 'Featured artwork links use the canonical artwork identity');
const base = (process.env.BASE_URL || '/').replace(/\/$/, '');
assert.ok(selected.includes(`href="${base}/drop-a-vibe/"`));
assert.ok(html.includes('team and client work'));
assert.ok(html.includes('Technical Skills') && html.includes('Additional project history'));
assert.ok(!html.includes('Open to creative collaborations'), 'Do not add an availability promise');
console.log('Portfolio evidence PASS: attributed contributions and public proof before skills, descriptive protected links, canonical artwork/contact discovery, and retained reported history.');
