import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/components/toolbox/ShareResultFoundation.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function fixture(initial = {}) {
  let props = { monster: 'toolooo', contentType: 'tool', slug: 'api-payload-doctor', title: 'Public title', ...initial };
  let slots = [], cursor = 0, pending = [], dirty = false, tree;
  const events = [], copies = [], shares = [], exports = {};
  const navigator = { clipboard: { writeText: async text => { copies.push(text); } }, share: async data => { shares.push(data); } };
  const react = {
    useId: () => 'share-field',
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; dirty = true; }]; },
    useLayoutEffect(callback, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) pending.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; }); },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  vm.runInNewContext(compiled, { exports, navigator, document: { querySelector: () => ({ href: 'https://khizooology.com/toolbox/api-payload-doctor/' }) }, setTimeout: () => { throw new Error('Feedback must not schedule timers'); }, require: id => id === 'react' ? react : id === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { trackShareAction: metadata => events.push(metadata) } });
  function render(next = {}) { props = { ...props, ...next }; do { cursor = 0; pending = []; dirty = false; tree = exports.default(props); pending.forEach(cb => cb()); } while (dirty); }
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : String(node ?? '');
  const nodes = () => flatten(tree);
  const status = () => nodes().find(n => n.props?.role === 'status');
  render();
  return { navigator, events, copies, shares, render, nodes, status, message: () => text(status()), field: () => nodes().find(n => n.type === 'textarea'),
    async click(label) { const button = nodes().find(n => n.type === 'button' && text(n) === label); assert.ok(button, label); const task = button.props.onClick(); render(); await task; render(); },
    start(label) { const button = nodes().find(n => n.type === 'button' && text(n) === label); const task = button.props.onClick(); render(); return task; },
    unmount() { slots.forEach(value => value?.cleanup?.()); },
  };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const link = 'https://khizooology.com/toolbox/api-payload-doctor/';
const f = fixture();
await f.click('Copy link'); assert.equal(f.message(), 'Link copied.'); assert.equal(f.copies[0], link);
const announcement = f.status().props.children.key;
await f.click('Copy link'); assert.notEqual(f.status().props.children.key, announcement, 'repeated success replaces live-region content');
assert.equal(f.status().props['aria-live'], 'polite'); assert.equal(f.status().props['aria-atomic'], 'true');
assert.ok(f.nodes().filter(n => n.type === 'button').every(n => n.props['aria-describedby'] === f.status().props.id));
assert.equal(f.events.length, 2);
delete f.navigator.clipboard;
await f.click('Copy link'); assert.match(f.message(), /Couldn’t copy automatically/); assert.equal(f.field().props.value, link); assert.equal(f.field().props.readOnly, true);
assert.ok(f.nodes().some(n => n.type === 'label' && n.props.htmlFor === f.field().props.id));
let selected = false; f.field().props.onFocus({ currentTarget: { select() { selected = true; } } }); assert.ok(selected, 'manual field is selectable using keyboard focus');
f.navigator.clipboard = { writeText: async () => { throw new Error('PRIVATE EXCEPTION'); } };
await f.click('Copy link'); assert.ok(f.field()); assert.ok(!f.message().includes('PRIVATE'));
f.render({ result: { summary: 'Aggregate counts only' } }); assert.equal(f.message(), ''); assert.equal(f.field(), undefined);
await f.click('Copy result'); assert.equal(f.field().props.value, `Public title\nAggregate counts only\n${link}`);
f.navigator.clipboard.writeText = async text => f.copies.push(text);
await f.click('Copy result'); assert.equal(f.message(), 'Result copied.'); assert.equal(f.field(), undefined);
const copyCount = f.copies.length;
f.navigator.share = async () => { throw Object.assign(new Error('private cancellation'), { name: 'AbortError' }); };
await f.click('Share'); assert.equal(f.message(), 'Share cancelled.'); assert.equal(f.copies.length, copyCount); assert.equal(f.field(), undefined);
f.navigator.share = async () => { throw new Error('PRIVATE SHARE FAILURE'); };
await f.click('Share'); assert.match(f.message(), /Couldn’t open sharing/); assert.ok(f.field()); assert.equal(f.copies.length, copyCount);
delete f.navigator.share;
await f.click('Share'); assert.match(f.message(), /Sharing isn’t supported here. Result copied/); assert.equal(f.events.at(-1).action, 'copy_result');
f.navigator.share = async data => f.shares.push(data);
await f.click('Share'); assert.equal(f.message(), 'Share action completed.'); assert.equal(f.events.at(-1).action, 'share_result'); assert.equal(f.shares[0].url, link);
assert.ok(!JSON.stringify(f.events).includes('Aggregate'), 'analytics never receives payloads');
const art = fixture({ monster: 'artooo', contentType: 'artwork', slug: 'public-art' });
await art.click('Copy link'); assert.equal(art.copies[0], `${link}#art-public-art`, 'artwork anchor is preserved without private location state');

for (const action of ['Copy result', 'Share']) {
  const g = fixture({ result: { summary: 'Old safe result' } }), work = deferred();
  if (action === 'Share') g.navigator.share = () => work.promise;
  else g.navigator.clipboard.writeText = () => work.promise;
  const task = g.start(action); g.render({ result: { summary: 'New safe result' } });
  assert.equal(g.message(), ''); assert.equal(g.field(), undefined);
  work.resolve(); await task; g.render(); assert.equal(g.message(), ''); assert.equal(g.events.length, 0, 'obsolete completion is ignored');
  const late = deferred(); g.navigator.clipboard.writeText = () => late.promise;
  const unmounted = g.start('Copy result'); g.unmount(); late.resolve(); await unmounted;
  assert.equal(g.events.length, 0, 'unmounted control ignores async completion');
}
const race = fixture(), old = deferred(); race.navigator.clipboard.writeText = () => old.promise;
const oldTask = race.start('Copy link'); race.navigator.clipboard.writeText = async () => {};
await race.click('Copy link'); const newestId = race.status().props.children.key;
old.reject(new Error('late denial')); await oldTask; race.render();
assert.equal(race.message(), 'Link copied.'); assert.equal(race.status().props.children.key, newestId); assert.equal(race.events.length, 1);
const cycle = fixture(), wait = deferred(); cycle.navigator.clipboard.writeText = () => wait.promise;
const cycleTask = cycle.start('Copy link'); cycle.render({ title: 'Different' }); cycle.render({ title: 'Public title' }); wait.resolve(); await cycleTask; cycle.render(); assert.equal(cycle.events.length, 0);
assert.doesNotMatch(source, /setTimeout|setInterval|localStorage|console\./, 'no feedback timers, persistence or payload logging');
console.log('PASS: copy/repeated announcements, labelled manual fallback, native share outcomes, safe payloads, stale operations, payload changes, unmount cleanup and unchanged analytics.');
