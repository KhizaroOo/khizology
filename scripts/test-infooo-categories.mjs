import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync(new URL('../src/pages/infooo/index.astro', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../dist/infooo/index.html', import.meta.url), 'utf8');
const buttons = [...html.matchAll(/<button[^>]*data-category="([^"]+)"/g)].map(match => ({ dataset: { category: match[1] }, setAttribute(name, value) { this[name] = value; } }));
const cards = [...html.matchAll(/<a[^>]*data-world-category="([^"]+)"/g)].map(match => ({ dataset: { worldCategory: match[1] }, hidden: false }));
let click;
const filters = { querySelectorAll: () => buttons, addEventListener: (_, handler) => { click = handler; }, hidden: true };
const status = { textContent: '' };
vm.runInNewContext(stripTypeScriptTypes(source.match(/<script>([\s\S]*?)<\/script>/)[1]), { document: { querySelector: selector => selector === '.category-filters' ? filters : status, querySelectorAll: () => cards } });
assert.equal(filters.hidden, false);
assert.equal(buttons.length, 7);
assert.equal(cards.length, 4);
for (const button of [...buttons, buttons[0]]) {
  click({ target: { closest: () => button } });
  const category = button.dataset.category;
  const expected = category === 'all' ? 4 : ['life-human', 'logic-computation', 'software-systems', 'ai-intelligence'].includes(category) ? 1 : 0;
  assert.equal(cards.filter(card => !card.hidden).length, expected, category);
  assert.equal(button['aria-pressed'], 'true');
  assert.equal(buttons.filter(item => item['aria-pressed'] === 'true').length, 1);
  if (!expected) assert.equal(status.textContent, 'More worlds are coming to this category.');
}
console.log('Infooo categories passed: six categories, four live worlds, all filters, empty states and restoration.');
