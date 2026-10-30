import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Real components/models; controlled file reads and in-memory React adapters only.
function fixture(name) {
  const slots = [], modules = new Map(), events = [], readers = [];
  let cursor = 0, dirty = false, effects = [], nodes, updates = 0;
  const react = {
    useId: () => 'diagnosis-test', useMemo: fn => fn(),
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; dirty = true; updates++; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((d, j) => d !== old.deps[j])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  class Reader { constructor() { readers.push(this); } readAsText() {} complete(text) { this.result = text; this.onload(); } fail() { this.onerror(); } }
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const exports = {}, jsx = (type, props) => ({ type, props });
    const require = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id.includes('utils/analytics')) return { trackToolResult: () => events.push('diagnosis'), trackContractDriftRun: () => events.push('drift'), trackToolScenarioSelect: () => events.push('scenario') };
      if (id.endsWith('useLocalPref')) return { useLocalPref: (_, value) => react.useState(value) };
      if (id.endsWith('mathHelpers') || id === './contractDrift') return load(path.resolve(path.dirname(file), `${id}.ts`));
      return { __esModule: true, default: Object.defineProperty(() => null, 'name', { value: path.basename(id) }) };
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require, Blob, FileReader: Reader });
    modules.set(file, exports); return exports;
  }
  const component = load(path.resolve(`src/components/toolbox/tools/${name}.tsx`)).default;
  const flatten = n => Array.isArray(n) ? n.flatMap(flatten) : n && typeof n === 'object' ? [n, ...flatten(n.props?.children)] : [];
  const text = n => Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' ? text(n.props?.children) : typeof n === 'boolean' ? '' : String(n ?? '');
  function render() { do { cursor = 0; dirty = false; effects = []; nodes = flatten(component()); effects.forEach(fn => fn()); } while (dirty); }
  const find = test => { const n = nodes.find(test); assert.ok(n, 'Expected diagnosis control'); return n; };
  const act = (node, handler, value) => { node.props[handler](value); render(); };
  render();
  return { act, find, text, nodes: () => nodes, events, readers, updates: () => updates, async flush() { await Promise.resolve(); await Promise.resolve(); render(); }, unmount() { slots.forEach(s => s?.cleanup?.()); } };
}
const staleText = 'Inputs changed. Run the diagnosis again to update this result.';
const api = fixture('ApiPayloadDoctor');
const editor = () => api.find(n => n.type === 'textarea');
const edit = raw => api.act(editor(), 'onChange', { target: { value: raw } });
const button = name => api.find(n => n.type === 'button' && n.props.role !== 'tab' && n.props.children === name);
const run = () => api.act(button('Diagnose'), 'onClick');
const status = () => api.find(n => n.props?.id === 'diagnosis-test-result-status');
const stale = () => api.text(status()).includes(staleText);
const insight = () => api.find(n => n.type?.name === 'Insight').props.what;
const upload = () => api.act(api.find(n => n.type === 'input' && n.props.type === 'file'), 'onChange', { target: { files: [{ name: 'fictional.json' }], value: '' } });
const original = editor().props.value;
edit('{"id":1}'); run(); const oldResult = insight(), eventCount = api.events.length;
edit('{"id":}'); assert.ok(stale()); assert.equal(insight(), oldResult); assert.equal(api.events.length, eventCount, 'editing never diagnoses automatically');
assert.equal(status().props['aria-live'], 'polite'); assert.equal(status().props['aria-atomic'], 'true');
edit('{"id":1}'); assert.ok(!stale(), 'identical inputs restore current status');
const preset = () => api.find(n => n.type?.name === 'PresetBar');
api.act(preset(), 'onSelect', 'mobile'); assert.ok(stale()); assert.equal(insight(), oldResult);
api.act(preset(), 'onSelect', 'web'); assert.ok(!stale());
api.act(api.find(n => n.type?.name === 'InputField'), 'onChange', '100'); assert.ok(stale());
assert.ok(!api.nodes().some(n => n.type?.name === 'Metric' && n.props.label === 'Daily bandwidth (est.)'), 'previous result keeps its original settings');
api.act(api.find(n => n.type === 'input' && n.props.type === 'checkbox'), 'onChange', { target: { checked: true } }); run();
assert.ok(!stale()); assert.ok(api.nodes().some(n => n.type?.name === 'Metric' && n.props.label === 'Daily bandwidth (est.)'));
assert.ok(api.nodes().some(n => n.type?.name === 'Metric' && n.props.label === 'Est. gzip size'));
api.act(button('Try an example'), 'onClick'); assert.ok(stale()); assert.equal(insight(), oldResult);
run(); assert.ok(!stale()); assert.equal(editor().props.value, original);
edit('{"id":}'); run(); assert.equal(insight(), 'Invalid JSON'); assert.equal(editor().props['aria-invalid'], true, 'invalid rerun replaces the old finding with the actual syntax error');
edit('{"id":2}'); assert.ok(stale()); assert.ok(!editor().props['aria-invalid']); run(); assert.ok(!stale());

upload(); assert.ok(stale()); assert.equal(button('Diagnose').props.disabled, true);
edit('{"newer":true}'); run(); const latestResult = insight();
api.readers[0].complete('{"obsolete":true}'); await api.flush(); assert.equal(editor().props.value, '{"newer":true}'); assert.equal(insight(), latestResult); assert.ok(!stale());
upload(); upload(); api.readers[2].complete('{"latestFile":true}'); await api.flush();
assert.equal(editor().props.value, '{"latestFile":true}'); assert.ok(stale(), 'file content does not auto-diagnose'); run();
api.readers[1].complete('{"olderFile":true}'); await api.flush(); assert.equal(editor().props.value, '{"latestFile":true}'); assert.ok(!stale(), 'out-of-order read cannot replace a newer diagnosis');
edit('{"pendingRetry":true}'); upload(); api.readers[3].fail(); await api.flush(); assert.ok(stale()); assert.ok(api.nodes().some(n => n.props.role === 'alert'));
upload(); api.readers[4].complete('{"retry":true}'); await api.flush(); run(); assert.ok(!stale());
upload(); api.act(button('Try an example'), 'onClick'); const afterReset = editor().props.value;
api.readers[5].complete('{"lateReset":true}'); await api.flush(); assert.equal(editor().props.value, afterReset); run(); assert.ok(!stale());
upload(); api.act(preset(), 'onSelect', 'mobile'); api.readers[6].fail(); await api.flush(); assert.ok(stale()); assert.ok(!api.nodes().some(n => n.props.role === 'alert'), 'obsolete upload errors do not overwrite newer input state');
upload(); api.unmount(); const updates = api.updates(); api.readers[7].complete('{}'); await Promise.resolve(); await Promise.resolve(); assert.equal(api.updates(), updates, 'unmounted file completions are ignored');

const drift = fixture('ApiPayloadContractDrift');
const input = (side, raw) => drift.act(drift.find(n => n.props.id === `contract-${side}`), 'onChange', { target: { value: raw } });
const runDrift = () => drift.act(drift.find(n => n.type === 'button' && n.props.children === 'Diagnose drift'), 'onClick');
const shares = () => drift.nodes().filter(n => n.type?.name === 'ShareResultFoundation');
const driftStale = () => drift.nodes().some(n => n.props.role === 'status' && drift.text(n).includes(staleText));
input('expected', '{"id":1}'); input('actual', '{"id":"1"}'); runDrift();
assert.equal(shares().length, 1); const safeSummary = shares()[0].props.result.summary;
input('actual', '{"id":2}'); assert.ok(driftStale()); assert.equal(shares().length, 0, 'outdated results cannot be shared/copied');
input('actual', '{"id":"1"}'); assert.ok(!driftStale()); assert.equal(shares()[0].props.result.summary, safeSummary);
drift.act(drift.find(n => n.type === 'input' && n.props.type === 'checkbox'), 'onChange', { target: { checked: false } }); assert.ok(!driftStale(), 'view filters do not change the diagnosed inputs');
const switcher = () => drift.find(n => n.type?.name === 'ToolScenarioSwitcher');
drift.act(switcher(), 'onSelect', switcher().props.scenarios[0]); assert.ok(driftStale()); assert.equal(shares().length, 0, 'preset changes retain but mark the old result'); runDrift(); assert.ok(!driftStale());
input('expected', '{'); runDrift(); assert.equal(shares().length, 0); assert.ok(drift.nodes().some(n => drift.text(n).includes('EXPECTED INVALID')), 'failed JSON rerun shows its own error, not the previous health result');
input('expected', '{}'); runDrift(); assert.equal(shares().length, 1);
drift.act(switcher(), 'onReset'); assert.equal(shares().length, 0); assert.ok(!driftStale());
for (const name of ['ApiPayloadDoctor', 'ApiPayloadContractDrift']) {
  const source = fs.readFileSync(`src/components/toolbox/tools/${name}.tsx`, 'utf8');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|URLSearchParams|console\./, 'no private input transmission, persistence or logging');
}
console.log('PASS: F17 input/settings/preset snapshots, accessible outdated status, explicit diagnoses, invalid reruns/reset/retry, reordered/obsolete upload completions, unmount cleanup and stale-share suppression.');
