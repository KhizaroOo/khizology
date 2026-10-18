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

const api = fixture('ApiPayloadDoctor');
let editor = api.find(n => n.type === 'textarea');
assert.ok(editor.props.value.includes('user_id'));
assert.ok(api.nodes().some(n => n.type === 'label' && n.props.htmlFor === editor.props.id));
assert.ok(api.find(n => n.type.name === 'Insight').props.what.includes('casing'));
assert.equal(api.events.length, 0, 'Example render is not a user completion');
const editAndRun = raw => {
  api.action(api.find(n => n.type === 'textarea'), 'onChange', { target: { value: raw } });
  api.action(api.find(n => n.type === 'button' && n.props.role !== 'tab' && n.props.children === 'Diagnose'), 'onClick');
};
editAndRun('{"id":1,"name":"Example"}');
assert.equal(api.find(n => n.type.name === 'Insight').props.what, 'No major structural concerns found');
assert.ok(api.find(n => n.type.name === 'Insight').props.tip.includes('contract'));
editAndRun('{"id":}');
assert.equal(api.find(n => n.type === 'textarea').props['aria-invalid'], true);
assert.equal(api.find(n => n.type.name === 'Insight').props.what, 'Invalid JSON');
assert.ok(api.find(n => n.type === 'p' && n.props.id === 'phase4b-error'));
assert.equal(api.events.length, 2, 'One event for each explicit diagnosis');
api.action(api.find(n => n.type === 'textarea'), 'onChange', { target: { value: '{}' } });
assert.ok(!api.find(n => n.type === 'textarea').props['aria-invalid'], 'Do not label an edited payload using stale errors');
let focused;
for (const [key, mode] of [['ArrowRight', 'contract-drift'], ['ArrowRight', 'diagnose'], ['End', 'contract-drift'], ['Home', 'diagnose'], ['ArrowLeft', 'contract-drift']]) {
  const tab = api.find(n => n.props.role === 'tab' && n.props['aria-selected']);
  let prevented = false;
  api.action(tab, 'onKeyDown', { key, preventDefault: () => { prevented = true; }, currentTarget: { parentElement: { querySelector: selector => ({ focus: () => { focused = selector; } }) } } });
  assert.ok(prevented); assert.ok(focused.includes(mode));
  const selected = api.find(n => n.props.role === 'tab' && n.props['aria-selected']);
  assert.equal(selected.props['data-mode'], mode);
  assert.equal(api.nodes().filter(n => n.props.role === 'tab' && n.props.tabIndex === 0).length, 1);
  for (const tab of api.nodes().filter(n => n.props.role === 'tab')) assert.ok(api.nodes().some(n => n.props.id === tab.props['aria-controls']));
  assert.equal(api.nodes().filter(n => n.props.role === 'tabpanel' && !n.props.hidden).length, 1);
}

const grid = fixture('PerspectiveGridMaker');
assert.ok(!grid.nodes().some(n => n.type === 'button' && n.props.children === 'Reset vanishing points'), 'Reset should not compete before any manual placement');
const control = label => grid.find(n => n.type.name === 'RangeControl' && n.props.label === label);
const summary = () => grid.find(n => n.type === 'p' && n.props.id === 'perspective-coordinates').props.children.join('');
for (const [mode, count] of [['1-Point', 1], ['2-Point', 2], ['3-Point', 3]]) {
  grid.action(grid.find(n => n.type === 'button' && n.props.children === mode), 'onClick');
  assert.equal(grid.nodes().filter(n => n.type === 'fieldset').length, count);
  assert.equal(grid.nodes().filter(n => n.type === 'button' && n.props['aria-pressed']).length, 1);
  if (count === 3) assert.ok(summary().includes('vertical 140%'), 'Off-canvas third point remains reachable');
  grid.action(control('Point 1 horizontal'), 'onChange', 25);
  grid.action(control('Point 1 vertical'), 'onChange', -20);
  assert.ok(summary().includes('horizontal 25%, vertical -20%'));
  grid.action(control('Horizon position (eye level)'), 'onChange', 60);
  assert.ok(summary().includes('horizontal 25%, vertical -20%'), 'Manual placement survives horizon changes');
  grid.action(grid.find(n => n.type === 'button' && n.props.children === 'Reset vanishing points'), 'onClick');
  assert.ok(summary().includes('vertical 60%'));
}
grid.action(control('Point 3 vertical'), 'onChange', 180);
assert.ok(summary().includes('vertical 180%'));
grid.action(control('Point 1 horizontal'), 'onChange', 500);
assert.equal(control('Point 1 horizontal').props.value, 200, 'Same off-canvas bound as pointer placement');
const canvas = grid.find(n => n.type === 'canvas');
const captured = new Set();
canvas.props.ref.current = { width: 1200, height: 900, getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 360 }), setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id), getContext: () => null };
grid.action(grid.find(n => n.type === 'button' && n.props.children === 'Reset vanishing points'), 'onClick');
grid.action(grid.find(n => n.type === 'canvas'), 'onPointerDown', { clientX: 48, clientY: 216, pointerId: 1 });
assert.ok(captured.has(1));
grid.action(grid.find(n => n.type === 'canvas'), 'onPointerMove', { clientX: 96, clientY: 180, pointerId: 1 });
assert.ok(summary().includes('horizontal 20%, vertical 50%'));
grid.action(grid.find(n => n.type === 'canvas'), 'onPointerUp', { pointerId: 1 });
assert.ok(!captured.has(1));
grid.action(grid.find(n => n.type === 'canvas'), 'onPointerDown', { clientX: 96, clientY: 180, pointerId: 2 });
assert.ok(captured.has(2));
grid.action(grid.find(n => n.type === 'canvas'), 'onPointerCancel', { pointerId: 2 });
assert.ok(!captured.has(2), 'Cancelled touch/drag releases capture');
console.log('Phase 4B PASS: safe default and diagnoses, labeled/stale/error state, once-per-action events, arrow/Home/End tabs and panel relationships; 1/2/3-point placement, off-canvas access, reset, horizon retention and pointer/keyboard-equivalent coordinates.');
