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
f.navigate(f.location.hash);
assert.equal(cards().length, filteredCount, 'History within the active result set preserves search context');
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
// All canonical identities and objective assets remain valid; related results are stable and unique.
const { rankRelatedArtworks, artworkRelationshipReason } = load('src/utils/artworkRelations.ts');
assert.equal(artworks.length, 170);
assert.equal(artworks.filter(a => a.story && a.whatIWasThinking && a.behindTheSketch).length, 20, 'Artist-supplied batch retains all three fields');
assert.equal(artworks.find(a => a.slug === 'portal-to-the-past').story, 'I like old doors because they always make me think about the past. So many people may have used the same door before us.');
assert.equal(artworks.find(a => a.slug === 'big-slave').whatIWasThinking, 'Power does not always mean freedom.');
assert.equal(new Set(artworks.map(a => a.id)).size, artworks.length);
assert.equal(new Set(artworks.map(a => a.slug)).size, artworks.length);
for (const artwork of artworks) {
  assert.ok(fs.existsSync(path.join('public/images/artworks', artwork.filename)));
  assert.ok(artwork.width > 0 && artwork.height > 0);
  assert.equal(new Set(artwork.tags).size, artwork.tags.length);
  for (const slug of artwork.relatedArtwork || []) assert.ok(artworks.some(a => a.slug === slug && a.id !== artwork.id));
  const related = rankRelatedArtworks(artwork, artworks);
  assert.deepEqual(related.map(a => a.id), rankRelatedArtworks(artwork, [...artworks].reverse()).map(a => a.id));
  assert.equal(new Set(related.map(a => a.id)).size, related.length);
  assert.ok(related.every(a => a.id !== artwork.id && artworkRelationshipReason(artwork, a).length));
}
for (const prefix of ['tree-house', 'flower', 'raw-beauty', 'jack-and-sally']) {
  const members = artworks.filter(a => a.filename.toLowerCase().startsWith(prefix) && /[ -]\d+\.jpg$/i.test(a.filename));
  for (const art of members) assert.ok(rankRelatedArtworks(art, artworks).slice(0, Math.min(3, members.length - 1)).every(a => members.includes(a)), `${prefix}: numbered family first`);
}
const sample = (slug, tags, extra = {}) => ({ id: slug, slug, title: slug, filename: slug + '.jpg', tags, width: 1, height: 1, ...extra });
const source = sample('source', ['portrait', 'figure', 'sea', 'fantasy']);
const specific = sample('specific', ['sea', 'fantasy']);
const broad = Array.from({ length: 15 }, (_, i) => sample('broad-' + i, ['portrait', 'figure']));
assert.equal(rankRelatedArtworks(source, [source, specific, ...broad])[0].slug, 'specific', 'Rare shared subjects beat broad portrait overlap');
assert.equal(rankRelatedArtworks({ ...source, relatedArtwork: [broad[0].slug] }, [specific, ...broad])[0].slug, broad[0].slug);
assert.equal(rankRelatedArtworks({ ...source, collection: 'Artist classified' }, [specific, { ...broad[0], collection: 'Artist classified' }])[0].slug, broad[0].slug);
assert.equal(rankRelatedArtworks(source, [source, specific, specific]).length, 1);
assert.equal(rankRelatedArtworks(source, [specific], 0).length, 0);
assert.equal(rankRelatedArtworks(source, [sample('unrelated', ['space'])]).length, 0);
const basic = fixture('#art-' + artworks[0].slug);
const basicModal = basic.nodes().find(node => node.type?.name === 'ArtworkModal');
const basicTree = flatten(basicModal.type(basicModal.props));
assert.ok(!text(basicTree).includes('An original artwork by khizooo'));
assert.ok(!basicTree.some(node => ['What I was thinking', 'Behind the sketch'].includes(text(node))));
const relatedButtons = basicTree.filter(node => node.props?.['data-related-content']);
assert.ok(relatedButtons.length > 0 && relatedButtons.length <= 3);
for (const button of relatedButtons) {
  const image = flatten(button).find(node => node.type === 'img');
  assert.equal(image.props.loading, 'lazy');
  assert.equal(image.props.alt, '', 'Adjacent title already names this thumbnail link');
  assert.ok(text(button).includes('Shared:') || text(button).includes('series'));
}
const authoredTree = flatten(basicModal.type({ ...basicModal.props, artwork: { ...artworks[0], story: 'Fixture artist story.', year: 2020, medium: 'Fixture medium', collection: 'Fixture collection', whatIWasThinking: 'Fixture perspective.', behindTheSketch: 'Fixture process.' } }));
assert.ok(text(authoredTree).includes('2020 · Fixture medium · Fixture collection'));
assert.ok(authoredTree.some(node => node.type === 'h3' && text(node) === 'What I was thinking'));
assert.ok(authoredTree.some(node => node.type === 'details' && !node.props.open && text(node).includes('Fixture process.')));
basic.unmount();
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
  const schemas = [...gallery.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])).flatMap(data => data['@graph'] || data);
  const collection = schemas.find(schema => schema.mainEntity?.['@type'] === 'ItemList');
  assert.equal(collection.mainEntity.numberOfItems, artworks.length);
  for (const { item } of collection.mainEntity.itemListElement) {
    const art = artworks.find(a => item['@id'].endsWith('#art-' + a.slug));
    assert.ok(art);
    assert.equal(item.description, art.description || art.story);
    assert.equal(item.artMedium, art.medium);
    assert.equal(item.dateCreated, art.year ? String(art.year) : undefined);
  }
  assert.equal([...read('dist/image-sitemap.xml').matchAll(/<image:image>/g)].length, artworks.length);
}
console.log('Artwork discovery PASS: canonical subject/tag filters, stable choices, combined search, empty recovery, exact teaser/hash selection, related selection, history, listener cleanup and view-event integrity.');
