import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const source = read('src/pages/toolbox.astro');
const registry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/data/tools.ts')))}`);
function element(attrs = {}, textContent = '') {
  return { attrs, textContent, hidden: false, value: '', handlers: {}, focused: false,
    getAttribute(name) { return this.attrs[name]; },
    querySelector(selector) { return selector === 'h3' ? { textContent: this.attrs.title } : null; },
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, fn) { this.handlers[name] = fn; },
    focus() { this.focused = true; },
    classList: { toggle() {}, remove() {} },
  };
}
const cards = registry.activeTools.map(tool => element({
  'data-family': tool.family, 'data-tags': tool.tags.join('|'), 'data-search-keywords': tool.keywords?.join(' '),
  title: tool.name, slug: tool.slug,
}, `${tool.icon} ${tool.name} ${tool.shortDescription} ${tool.family} ${tool.tags.slice(0, 3).join(' ')}`));
const families = ['all', ...new Set(registry.activeTools.map(tool => tool.family))].map(id => element({ 'data-family-filter': id, 'aria-pressed': String(id === 'all') }));
const tags = registry.allTags.map(tag => element({ 'data-tag-filter': tag }));
const ids = Object.fromEntries(['tb-visible-count', 'tb-partial-match', 'tb-clear-filters', 'tb-no-results', 'tb-active-topic', 'tb-search', 'tb-empty-clear'].map(id => [id, element()]));
let order = cards;
let moves = 0;
ids['tb-tool-results'] = { prepend(...sorted) { order = [...sorted, ...order.filter(card => !sorted.includes(card))]; moves++; } };
vm.runInNewContext(stripTypeScriptTypes(source.match(/<script>([\s\S]*?)<\/script>/)[1]), { document: {
  querySelectorAll(selector) { return selector === '[data-family-filter]' ? families : selector === '[data-tag-filter]' ? tags : cards; },
  getElementById(id) { return ids[id]; },
} });
const search = value => { ids['tb-search'].value = value; ids['tb-search'].handlers.input(); };
const clickFamily = id => families.find(button => button.attrs['data-family-filter'] === id).handlers.click();
const visible = () => order.filter(card => !card.hidden);
const expected = (family, query, tag) => cards.filter(card => (!family || card.attrs['data-family'] === family) && (!tag || card.attrs['data-tags'].split('|').includes(tag)) && query.every(term => card.textContent.toLowerCase().includes(term) || [card.attrs['data-tags'], card.attrs['data-search-keywords']].join(' ').toLowerCase().includes(term)));
search('  QUEUE ');
assert.deepEqual(visible(), expected(null, ['queue']));
clickFamily('simulate');
assert.deepEqual(visible(), expected('simulate', ['queue']));
search('');
assert.deepEqual(visible(), expected('simulate', []), 'Clearing search preserves family');
search('queue');
clickFamily('all');
assert.deepEqual(visible(), expected(null, ['queue']), 'All families preserves search');
const tag = registry.allTags.find(tag => cards.some(card => card.attrs['data-family'] === 'simulate' && card.attrs['data-tags'].split('|').includes(tag)));
clickFamily('simulate');
tags.find(button => button.attrs['data-tag-filter'] === tag).handlers.click();
assert.deepEqual(visible(), expected('simulate', ['queue'], tag));
assert.ok(ids['tb-active-topic'].textContent.includes(tag));
search('zzzz qqqq');
assert.equal(visible().length, 0);
assert.equal(ids['tb-visible-count'].textContent, '0');
assert.equal(ids['tb-no-results'].hidden, false);
ids['tb-empty-clear'].handlers.click();
assert.equal(visible().length, registry.activeTools.length);
assert.equal(ids['tb-clear-filters'].hidden, true);
assert.equal(ids['tb-no-results'].hidden, true);
assert.equal(ids['tb-search'].focused, true);
assert.equal(families.filter(button => button.attrs['aria-pressed'] === 'true').length, 1);
assert.equal(families[0].attrs['aria-pressed'], 'true');
const slugs = () => visible().map(card => card.attrs.slug);
search('api timeout');
const timeouts = slugs();
assert.ok(timeouts.includes('timeout-chain-planner'));
assert.equal(ids['tb-partial-match'].hidden, true);
const rankedMoves = moves;
search('timeout api');
assert.deepEqual(slugs(), timeouts, 'Term order must not change the results or ranking');
assert.equal(moves, rankedMoves, 'Identical ranking must not move DOM nodes');
search('what is a CORS error?');
assert.equal(slugs()[0], 'cors-doctor');
search('jwt expired');
assert.equal(slugs()[0], 'jwt-time-machine');
assert.equal(ids['tb-partial-match'].hidden, true);
search('jwt zzzz');
assert.equal(slugs()[0], 'jwt-time-machine');
assert.equal(ids['tb-partial-match'].hidden, false);
search('slow api');
assert.ok(slugs().includes('fan-out-latency-simulator'));
clickFamily('simulate');
assert.ok(visible().length > 0 && visible().every(card => card.attrs['data-family'] === 'simulate'));
tags.find(button => button.attrs['data-tag-filter'] === 'API').handlers.click();
assert.ok(visible().length > 0 && visible().every(card => card.attrs['data-tags'].split('|').includes('API')));
ids['tb-clear-filters'].handlers.click();
assert.deepEqual(visible(), cards, 'Clear returns to the original catalogue order');
for (const button of families.slice(1)) {
  button.handlers.click();
  assert.ok(visible().length > 0);
  assert.ok(visible().every(card => card.attrs['data-family'] === button.attrs['data-family-filter']));
  button.handlers.click();
  assert.equal(visible().length, cards.length);
}
assert.ok(source.indexOf('id="tb-search"') < source.indexOf('data-family-filter='));
assert.ok(source.indexOf('id="tb-tool-results"') < source.indexOf('<MyTooloooPanel'));
assert.equal((source.match(/id="tb-search"/g) || []).length, 1);
assert.ok(source.includes('aria-controls="tb-tool-results"'));
if (process.argv.includes('--built')) {
  const html = read('dist/toolbox/index.html');
  assert.ok(html.indexOf('id="tb-search"') < html.indexOf('id="growth-tools-title"'));
  assert.equal([...html.matchAll(/data-tool-card(?:\s|>)/g)].length, registry.activeTools.length);
  assert.equal([...html.matchAll(/data-family-filter=/g)].length, families.length);
}
console.log('Tool discovery PASS: early single finder, live families/counts, case-insensitive search, combined filters, independent clearing, zero-results recovery, selected state and focus recovery.');
