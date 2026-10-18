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
      if (!id.endsWith('mathHelpers') && !id.endsWith('retryRateModels')) return { __esModule: true, default: Object.defineProperty(() => null, 'name', { value: path.basename(id) }) };
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
  render(); return { render, find, action, nodes: () => nodes, events, input: () => state[0], models: load(path.resolve('src/components/toolbox/tools/retryRateModels.ts')) };
}

const isComponent = (node, name) => node.type?.name === name;
const descend = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(descend)];
const toReact = node => !node || typeof node !== 'object' ? node : Array.isArray(node) ? node.map(toReact) : createElement(node.type, { ...node.props, children: undefined }, ...[node.props.children].flat(Infinity).map(toReact));
const withinDepth = (f, target) => f.nodes().filter(n => isComponent(n, 'AdvancedDisclosure')).some(n => descend(n).includes(target));

for (const name of ['RetryStormSimulator', 'RateLimitPlayground']) {
  const f = fixture(name);
  const retry = name === 'RetryStormSimulator';
  const result = () => f.find(n => isComponent(n, 'Insight')).props;
  const update = (label, value) => f.action(f.find(n => isComponent(n, 'RangeControl') && n.props.label === label), 'onChange', value);
  const compare = () => {
    const model = retry ? f.models.simulateRetry(f.input()) : f.models.simulateRate(f.input());
    const share = f.find(n => isComponent(n, 'ShareResultFoundation')).props.result.summary;
    assert.ok(Object.values(model).filter(v => typeof v === 'number').every(Number.isFinite));
    assert.ok(model.ticks.every(t => Object.values(t).every(Number.isFinite)));
    if (retry) {
      assert.ok(result().what.includes(model.totalOriginal.toLocaleString()));
      assert.ok(result().what.includes(Math.round(model.totalOriginal + model.totalRetry).toLocaleString()));
      assert.ok(share.includes(model.amplification.toFixed(1) + '×'));
    } else {
      assert.ok(result().why.includes(Math.round(model.totalAllowed).toLocaleString()));
      assert.ok(result().why.includes(Math.round(model.totalThrottled).toLocaleString()));
      assert.ok(share.includes(model.throttlePercent.toFixed(0) + '%'));
    }
    assert.ok(result().tip);
    assert.ok(f.nodes().indexOf(f.find(n => isComponent(n, 'Insight'))) < f.nodes().indexOf(f.find(n => n.type === 'svg')), 'Decision precedes chart');
    assert.ok(f.nodes().filter(n => isComponent(n, 'Metric')).every(n => withinDepth(f, n)), 'Metrics remain available as optional depth');
    const chart = f.find(n => isComponent(n, 'VisualizationContainer'));
    assert.equal(chart.props.minContentWidth, 480, 'Use existing readable local-scroll chart foundation');
    const svg = f.find(n => n.type === 'svg');
    const titles = [...renderToStaticMarkup(toReact(svg)).matchAll(/<title>(.*?)<\/title>/g)];
    assert.equal(titles.length, 24);
    assert.ok(titles.every(title => title[1].length > 0), 'React 19 must server-render every SVG title; fragmented title children break hydration');
  };
  compare();
  const presets = f.find(n => isComponent(n, 'PresetBar')).props.presets;
  for (const preset of presets) {
    f.action(f.find(n => isComponent(n, 'PresetBar')), 'onSelect', preset.values, preset.label);
    for (const [key, value] of Object.entries(preset.values)) assert.equal(f.input()[key], value, 'Preset semantics retained');
    assert.equal(f.find(n => isComponent(n, 'PresetBar')).props.activeLabel, preset.label);
    compare();
  }
  if (retry) {
    assert.ok(!withinDepth(f, f.find(n => isComponent(n, 'RangeControl') && n.props.label === 'Total attempts per request')));
    assert.ok(withinDepth(f, f.find(n => n.type === 'button' && n.props.children === 'Exponential')));
    update('Total attempts per request', 1); compare();
    assert.ok(result().why.includes('no retries'));
    update('Simulated capacity', 20); compare();
    assert.ok(result().tip.includes('baseline'));
    f.action(f.find(n => n.type === 'select' && n.props.value === 'transient'), 'onChange', { target: { value: 'non-retryable' } });
    assert.ok(result().why.includes('non-retryable'));
    f.action(f.find(n => n.type === 'select' && n.props.value === 'yes'), 'onChange', { target: { value: 'no' } });
    assert.ok(f.nodes().some(n => isComponent(n, 'Warning')));
  } else {
    assert.ok(withinDepth(f, f.find(n => n.type === 'button' && n.props.children === 'Token bucket')));
    f.action(f.find(n => n.type === 'button' && n.props.children === 'Token bucket'), 'onClick');
    f.action(f.find(n => n.type === 'select'), 'onChange', { target: { value: 'steady' } });
    f.action(f.find(n => n.type === 'input' && n.props.checked === true && !n.props.disabled), 'onChange', { target: { checked: false } });
    compare(); assert.equal(result().what, 'Within the modeled limit');
    for (const algorithm of ['Fixed window', 'Sliding window', 'Token bucket']) {
      f.action(f.find(n => n.type === 'button' && n.props.children === algorithm), 'onClick'); compare();
      assert.equal(f.nodes().some(n => isComponent(n, 'RangeControl') && n.props.label === 'Burst reserve'), algorithm === 'Token bucket');
    }
    f.action(f.find(n => n.type === 'select'), 'onChange', { target: { value: 'sustained-overload' } });
    compare(); assert.equal(result().what, 'Requests are being throttled');
    assert.ok(result().tip.includes('sustained'));
  }
  assert.equal(f.events.length, 0, 'No new noisy analytics emitted by UI presentation');
}
console.log('Retry/Rate UX PASS: all original presets, model-backed summaries/actions, core vs advanced hierarchy, readable chart foundation, zero retries, unsafe-operation warning, allowed/throttled states, all algorithms and safe summary sharing.');
