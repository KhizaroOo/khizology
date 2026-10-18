import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(name) {
  const state = [], events = [], modules = new Map();
  let cursor = 0, dirty = false, effects = [], nodes;
  const react = {
    useId: () => 'phase4b',
    useMemo: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { const next = typeof value === 'function' ? value(state[i]) : value; if (next !== state[i]) { state[i] = next; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useEffect(fn, deps) { const i = cursor++, previous = state[i]; if (!previous || deps.some((v, j) => v !== previous[j])) { state[i] = deps; effects.push(fn); } },
  };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const context = vm.createContext({ exports: {}, Blob, FileReader: class {}, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id.includes('utils/analytics')) return { trackToolResult: () => events.push('result') };
      if (id.endsWith('useLocalPref')) return { useLocalPref: (_, initial) => react.useState(initial) };
      if (id.endsWith('.css')) return {};
      if (id.endsWith('exportHelpers')) return { downloadSVG: (node, name) => events.push({kind:'svg', node, name}), downloadCanvasPNG: (node, name) => events.push({kind:'png', node, name}) };
      if (!id.endsWith('mathHelpers')) return { __esModule: true, default: Object.defineProperty(() => null, 'name', { value: path.basename(id) }) };
      return load(path.resolve(path.dirname(file), id + '.ts'));
    } });
    const text = fs.readFileSync(file, 'utf8');
    vm.runInContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(file, context.exports); return context.exports;
  }
  const component = load(path.resolve(`src/components/toolbox/tools/${name}.tsx`)).default;
  const flatten = n => !n || typeof n !== 'object' ? [] : [n, ...[n.props?.children].flat(Infinity).flatMap(flatten)];
  function render() { do { dirty = false; cursor = 0; effects = []; nodes = flatten(component()); effects.forEach(fn => fn()); } while (dirty); return nodes; }
  const find = predicate => { const node = nodes.find(predicate); assert.ok(node, 'Expected UI control'); return node; };
  const action = (node, name, value) => { node.props[name](value); render(); };
  render(); return { render, find, action, nodes: () => nodes, events };
}

const f = fixture('BleedSafeAreaBuilder');
const named = (type, label) => f.find(n => n.type?.name === type && n.props.label === label);
const svg = () => f.find(n => n.type === 'svg');
const preview = () => f.find(n => n.type === 'canvas');
assert.equal(preview().props.role, 'img');
assert.match(preview().props['aria-label'], /trim.*bleed.*safe margin/);
const presets = f.find(n => n.type?.name === 'PresetBar').props.presets;
for (const preset of presets) {
  f.action(f.find(n => n.type?.name === 'PresetBar'), 'onSelect', preset.values); // label is presentation-only
  const before = {...svg().props};
  f.action(named('InputField', 'Output DPI'), 'onChange', '600');
  assert.equal(svg().props.viewBox, before.viewBox, 'SVG geometry must remain independent of raster DPI');
  assert.equal(svg().props.width, before.width);
  assert.ok(f.find(n => n.type?.name === 'Insight').props.tip.includes('printer'));
  const portrait = f.find(n => n.type === 'button' && n.props.children === 'Portrait');
  const landscape = f.find(n => n.type === 'button' && n.props.children === 'Landscape');
  assert.notEqual(portrait.props['aria-pressed'], landscape.props['aria-pressed']);
  const oldWidth = named('InputField', 'Trim width').props.value;
  const oldHeight = named('InputField', 'Trim height').props.value;
  f.action(portrait.props['aria-pressed'] ? landscape : portrait, 'onClick');
  assert.equal(named('InputField', 'Trim width').props.value, oldHeight);
  assert.equal(named('InputField', 'Trim height').props.value, oldWidth);
}
preview().props.ref.current = {localCanvas:true};
svg().props.ref.current = {localVector:true};
f.action(f.find(n => n.type === 'button' && n.props.children === 'Download SVG guide'), 'onClick');
f.action(f.find(n => n.type === 'button' && String(n.props.children).startsWith('Download PNG')), 'onClick');
assert.deepEqual(f.events.map(e=>e.kind), ['svg','png'], 'One export for each intended action');
assert.ok(f.events[0].node.localVector && f.events[1].node.localCanvas);
assert.ok(f.events.every(e=>e.name.startsWith('bleed-guide-') && !e.name.includes('http')));
console.log('Bleed: preset/orientation geometry, accessible preview/selected state, SVG DPI independence and once-per-action local export PASS.');
