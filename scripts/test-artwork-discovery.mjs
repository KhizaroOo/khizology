import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => fs.readFileSync(file, 'utf8');
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, window: mocks.window, document: mocks.document,
    require(id) { return mocks[id] || load(path.resolve(path.dirname(file), `${id}.ts`), mocks, cache); },
  });
  return exports;
}
const { artworks, featuredArtworks } = load('src/data/artworks.ts');
const subjects = vm.runInNewContext(read('src/pages/artworks.astro').match(/const galleryTopics = ([\s\S]*?);\r?\n/)[1], { artworks });
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'boolean' ? '' : String(node ?? '');
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : !node || typeof node !== 'object' ? [] : [node, ...flatten(node.props?.children)];
function fixture(hash = '') {
  const slots = [], effects = [], listeners = new Map(), events = [], focus = [];
  let cursor = 0, dirty = false, nodes;
  const location = { hash, pathname: '/artworks/', search: '' };
  const history = { entries: [hash], index: 0,
    pushState(_, __, value) { this.entries.splice(++this.index); this.entries.push(value); location.hash = value; },
    replaceState(_, __, value) { location.hash = value.startsWith('#') ? value : ''; this.entries[this.index] = location.hash; },
  };
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { if (slots[i] !== value) { slots[i] = value; dirty = true; } }]; },
    useCallback(fn) { return fn; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, index) => old.deps[index] !== value)) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const component = load('src/components/artworks/ArtworkGrid.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '../../utils/imagePreview': { preview: value => value, previewSrcset: () => '' },
    '../../utils/analytics': { trackArtworkView: slug => events.push(slug) },
    '../toolbox/ShareResultFoundation': { default: () => null },
    window: { location, history, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    document: { getElementById: id => ({ focus: () => focus.push(id) }) },
  }).default;
  const props = { artworks, base: '', emptyStateText: 'Try another search.', subjects: subjects.map(({ tag, label }) => ({ tag, label })) };
  function render() { do { dirty = false; cursor = 0; effects.length = 0; nodes = flatten(component(props)); effects.splice(0).forEach(fn => fn()); } while (dirty); }
  const find = predicate => { const node = nodes.find(predicate); assert.ok(node, 'Expected control'); return node; };
  const act = (node, handler, value) => { node.props[handler](value); render(); };
  render();
  return { find, act, nodes: () => nodes, events, focus, location, history,
    navigate(hash) { history.pushState(null, '', hash); listeners.get('hashchange')(); render(); },
    back() { location.hash = history.entries[--history.index]; listeners.get('hashchange')(); render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); assert.equal(listeners.size, 0); },
  };
}
const f = fixture();
const cards = () => f.nodes().filter(node => node.props?.className === 'aw-card');
const modal = () => f.nodes().find(node => node.type?.name === 'ArtworkModal');
const search = value => f.act(f.find(node => node.type === 'input'), 'onChange', { target: { value } });
const tag = value => f.act(f.find(node => node.props?.['data-artwork-tag'] === value), 'onClick');
assert.equal(cards().length, artworks.length);
assert.equal(modal(), undefined);
assert.equal(new Set(f.nodes().filter(node => node.props?.['data-artwork-tag']).map(node => node.props['data-artwork-tag'])).size, new Set(artworks.flatMap(art => art.tags)).size);
const secondary = f.find(node => node.type === 'details');
assert.ok(!secondary.props.open, 'Long-tail tags start collapsed');
assert.equal(flatten(secondary).filter(node => node.type === 'button').length, new Set(artworks.flatMap(art => art.tags)).size - subjects.length);
for (const subject of subjects) {
  tag(subject.tag);
  assert.deepEqual(cards().map(node => node.props['data-artwork-slug']), Array.from(artworks.filter(art => art.tags.includes(subject.tag)), art => art.slug));
  assert.equal(f.find(node => node.props?.['data-artwork-tag'] === subject.tag).props['aria-pressed'], true);
  tag(subject.tag);
  assert.equal(cards().length, artworks.length);
}
tag(subjects[0].tag); search('no-match-zzzz');
assert.equal(cards().length, 0);
assert.ok(f.nodes().some(node => text(node) === 'No artworks found'));
f.act(f.find(node => node.type === 'button' && text(node) === 'Reset filters'), 'onClick');
assert.equal(cards().length, artworks.length);
search(artworks[0].title.toUpperCase());
assert.ok(cards().some(node => node.props['data-artwork-slug'] === artworks[0].slug));
const filteredCount = cards().length;
f.act(cards()[0], 'onClick');
assert.ok(modal());
assert.equal(cards().length, filteredCount, 'Opening a matching artwork preserves search context');
assert.equal(f.location.hash, `#art-${modal().props.artwork.slug}`);
assert.equal(f.events.length, 1);
search('no-match-zzzz');
assert.equal(modal(), undefined, 'Filter changes cannot retain an excluded selection');
assert.equal(f.location.hash, '');
f.navigate(`#art-${artworks[4].slug}`);
assert.equal(modal().props.artwork.slug, artworks[4].slug);
assert.equal(cards().length, artworks.length, 'Incoming artwork restores visible context');
assert.equal(f.focus.at(-1), `art-${artworks[4].slug}`);
f.act(modal(), 'onSelect', artworks[7]);
assert.equal(modal().props.artwork.slug, artworks[7].slug);
const focusCount = f.focus.length;
f.back();
assert.equal(f.focus.length, focusCount, 'Changing an open artwork must not move focus behind the modal');
assert.equal(modal().props.artwork.slug, artworks[4].slug, 'Back restores the previous selected artwork');
f.navigate('#art-not-a-real-work'); assert.equal(modal(), undefined);
f.unmount();
for (const artwork of featuredArtworks.slice(0, 8)) {
  const direct = fixture(`#art-${artwork.slug}`);
  assert.equal(direct.nodes().find(node => node.type?.name === 'ArtworkModal').props.artwork.slug, artwork.slug);
  assert.equal(direct.events.length, 1);
  direct.act(direct.find(node => node.type?.name === 'ArtworkModal'), 'onClose');
  assert.equal(direct.location.hash, '');
  direct.unmount();
}
const home = read('src/pages/index.astro');
assert.ok(home.includes('href={url(`/artworks#art-${art.slug}`)}'));
if (process.argv.includes('--built')) {
  const html = read('dist/index.html'), gallery = read('dist/artworks/index.html');
  for (const artwork of featuredArtworks.slice(0, 8)) {
    assert.ok(html.includes(`/artworks/#art-${artwork.slug}`));
    assert.ok(gallery.includes(`id="art-${artwork.slug}"`));
  }
  assert.equal([...gallery.matchAll(/data-artwork-slug=/g)].length, artworks.length);
  assert.ok(!gallery.includes('art-topic-links'));
}
console.log('Artwork discovery PASS: canonical subject/tag filters, stable choices, combined search, empty recovery, exact teaser/hash selection, related selection, history, listener cleanup and view-event integrity.');
