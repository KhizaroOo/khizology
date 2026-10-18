import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real component with deterministic timers; no browser or GA required.
const source = fs.readFileSync('src/components/toolbox/shared/Insight.tsx', 'utf8');
let state = '', deps, cleanup, pending, nextTimer = 0;
const timers = new Map();
const react = {
  useState: () => [state, value => { state = value; }],
  useEffect: (effect, next) => {
    if (!deps || next[0] !== deps[0]) { cleanup?.(); pending = effect; deps = next; }
  },
};
const jsx = (type, props) => ({ type, props });
const context = vm.createContext({ exports: {}, require: id => id === 'react' ? react : { jsx, jsxs: jsx },
  setTimeout: (fn, ms) => { assert.equal(ms, 800); timers.set(++nextTimer, fn); return nextTimer; },
  clearTimeout: id => timers.delete(id),
});
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
const render = what => { const tree = context.exports.default({ what, why: 'Supporting explanation', tip: 'Action' }); if (pending) { cleanup = pending(); pending = undefined; } return tree; };
const flush = () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } };
render('Initial decision');
assert.equal(state, '');
render('Intermediate decision');
render('Final decision');
assert.equal(timers.size, 1, 'rapid changes cancel stale announcements');
flush();
assert.equal(state, 'Final decision');
const tree = render('Final decision');
assert.equal(timers.size, 0, 'unchanged summaries do not repeat');
const status = tree.props.children[0];
assert.equal(status.props.role, 'status');
assert.equal(status.props['aria-live'], 'polite');
assert.equal(status.props.children, 'Final decision');
render({ type: 'div', props: { children: 'Metric wall' } }); flush();
assert.equal(state, '', 'complex results are not flattened into verbose announcements');
render('Pending decision'); cleanup();
assert.equal(timers.size, 0, 'unmount cancels pending update');
console.log('Shared Insight: debounce, cancellation, concise polite status and stable updates passed.');
