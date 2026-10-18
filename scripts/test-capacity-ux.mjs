import { createHash } from 'node:crypto';
const fingerprints = {"QueueCapacityPlanner": "22f5261fb9b990ea1ac1cbd56431781c7d39d4e231530929f94149561e8fcf06", "CircuitBreakerPlayground": "f454aa055e3fb837a7ca626392dcb2b063938977a8004bac3c5e0ce10c47ac6f", "ConnectionPoolSimulator": "18dc6d48fc2dca82e9b9a694da4a2f2673d82e77bc86775c3f4d5f12d6459fdd"};
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
  const action = (node, name, ...values) => { node.props[name](...values); render(); };
  render(); return { render, find, action, nodes: () => nodes, events };
}

const isComponent = (node, name) => node.type?.name === name;
const descend = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(descend)];
const toReact = node => !node || typeof node !== 'object' ? node : Array.isArray(node) ? node.map(toReact) : createElement(node.type, { ...node.props, children: undefined }, ...[node.props.children].flat(Infinity).map(toReact));
const withinDepth = (f, target) => f.nodes().filter(n => isComponent(n, 'AdvancedDisclosure')).some(n => descend(n).includes(target));


for (const name of ['QueueCapacityPlanner', 'CircuitBreakerPlayground', 'ConnectionPoolSimulator']) {
  const f = fixture(name);
  const result = () => f.find(n => isComponent(n, 'Insight')).props;
  const check = () => {
    assert.ok(result().what && result().why && result().tip);
    assert.ok(!/NaN|Infinity/.test(result().what + result().why));
    assert.ok(f.nodes().indexOf(f.find(n => isComponent(n, 'Insight'))) < f.nodes().indexOf(f.find(n => n.type === 'svg')));
    assert.ok(f.nodes().filter(n => isComponent(n, 'Metric')).every(n => withinDepth(f, n)));
    assert.ok(f.find(n => isComponent(n, 'ShareResultFoundation')).props.result.summary.startsWith('Educational'));
    renderToStaticMarkup(toReact(f.find(n => n.type === 'svg')));
  };
  check();
  const presets = f.find(n => isComponent(n, 'PresetBar')).props.presets;
  for (const preset of presets) {
    f.action(f.find(n => isComponent(n, 'PresetBar')), 'onSelect', preset.values, preset.label);
    check();
    if (preset.label === 'Scale-out') assert.match(result().what, /budget at risk/);
    if (preset.label === 'Full outage') assert.match(result().what, /Open/);
    if (preset.label === 'Recovering dependency') assert.match(result().what, /Closed/);
  }
  const update = (label, value) => f.action(f.find(n => isComponent(n, 'RangeControl') && n.props.label === label), 'onChange', value);
  if (name === 'QueueCapacityPlanner') {
    update('Arrival rate', 10); update('Number of workers', 2); update('Processing rate / worker', 5);
    assert.match(result().what, /At capacity/); assert.match(result().tip, /drain headroom/);
  }
  // Model + preset definitions must stay byte-identical to the inspected pre-mission source.
  const current = fs.readFileSync(`src/components/toolbox/tools/${name}.tsx`, 'utf8');
  const prefix = text => text.slice(text.indexOf(name === 'CircuitBreakerPlayground' ? 'const REQUEST_COUNT' : 'const TICKS'), text.indexOf(`export default function ${name}`));
  assert.equal(createHash('sha256').update(prefix(current).replace(/\r\n/g, '\n')).digest('hex'), fingerprints[name], `${name}: model, helpers and scenarios unchanged`);
}
console.log('Capacity UX: presets, decision ordering, optional metrics, finite summaries, safe share shape and unchanged models PASS.');
