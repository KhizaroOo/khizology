import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const input = fs.readFileSync('src/components/toolbox/tools/FanOutLatencySimulator.tsx', 'utf8');
const modelSource = input
  .slice(input.indexOf('export interface FanoutBranch'), input.indexOf('const PERCENTILE_TRIALS'))
  .replace("import { clamp } from '../shared/mathHelpers';", '')
  .replace('export interface FanoutBranch', 'interface FanoutBranch')
  .replace('export function simulateFanout', 'function simulateFanout')
  .replace('export function independentTailRisk', 'function independentTailRisk');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const model = await import('data:text/javascript,' + encodeURIComponent('const clamp = ' + clamp.toString() + ';\n' + stripTypeScriptTypes(modelSource) + '\nexport { simulateFanout, independentTailRisk };'));

const slowRequired = model.simulateFanout(4, 100, 0, true, 3, 600);
assert.equal(slowRequired.responseLatency, 600, 'parallel response must wait for its slowest required branch');
assert.equal(slowRequired.serialTotal, 900, 'serial comparison must sum branch latencies');
const slowOptional = model.simulateFanout(4, 100, 0, true, 3, 600, 3);
assert.equal(slowOptional.responseLatency, 100, 'optional branch must not gate the modeled response');
assert.equal(slowOptional.optionalCount, 1);
assert.ok(Math.abs(model.independentTailRisk(10, 2) - 0.19) < 1e-12, 'independent tail formula must be 1 - (1-f)^n');
assert.ok(model.independentTailRisk(5, 10) > model.independentTailRisk(5, 2), 'more independent branches amplify tail-event chance');

// An all-optional request has no modeled base response path: retain one required branch.
for (const parallel of [true, false]) {
  for (const [count, optional] of [[1, -1], [1, 0], [2, 0], [5, -1]]) {
    const result = model.simulateFanout(count, 120, 40, parallel, 0, 600, optional);
    assert.ok(result.requiredCount >= 1);
    assert.ok(result.criticalIndex >= 0 && result.criticalIndex < result.branches.length);
    for (const value of [result.responseLatency, result.serialTotal, model.independentTailRisk(5, result.requiredCount), ...result.branches.flatMap(branch => [branch.start, branch.end, branch.latency])]) assert.ok(Number.isFinite(value), 'model outputs must not contain NaN or Infinity');
    assert.equal(result.optionalCount, count > 1 && optional >= 0 ? 1 : 0);
    if (count === 1) assert.equal(result.responseLatency, 600, 'attempted optional branch remains required, never a 0ms response');
  }
}
assert.equal(model.simulateFanout(2, 100, 0, true, 0, 600, 0).responseLatency, 100);

// Run the real UI handlers with isolated React hooks, without a browser or analytics.
const state = [];
let cursor = 0;
const jsx = (type, props) => ({ type, props });
const context = vm.createContext({ exports: {}, require: id => {
  if (id === 'react') return { useMemo: fn => fn(), useState: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  } };
  if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (id.endsWith('mathHelpers')) return { clamp };
  return { default: id };
} });
vm.runInContext(ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
const render = () => { cursor = 0; return nodes(context.exports.default()); };
let ui = render();
const control = label => ui.find(node => node.props?.label === label);
const checkbox = () => ui.find(node => node.type === 'input' && node.props.type === 'checkbox');
control('Downstream branches').props.onChange(2); ui = render();
control('Forced slow branch').props.onChange(1); ui = render();
assert.equal(checkbox().props.disabled, false);
checkbox().props.onChange({ target: { checked: true } }); ui = render();
assert.equal(checkbox().props.checked, true);
control('Downstream branches').props.onChange(1); ui = render();
assert.equal(checkbox().props.disabled, true);
assert.equal(checkbox().props.checked, false, 'reducing 2 → 1 clears optional mode even when branch #1 remains selected');
assert.ok(!JSON.stringify(ui).includes('Infinity'));
control('Downstream branches').props.onChange(2); ui = render();
assert.equal(checkbox().props.checked, false, 'optional mode must not silently return after count increases');
console.log('Fan-out latency model tests passed.');

