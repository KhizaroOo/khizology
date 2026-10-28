import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real component handlers and effects, with deterministic React/timer adapters.
function fixture(reduced) {
  const values = [], modules = new Map(), timers = new Map(), events = [], listeners = new Map();
  let cursor = 0, dirty = false, pending = [], nextTimer = 0, ui;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; dirty = true; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useEffect(cb, deps) { const i = cursor++, previous = values[i]; if (!previous || deps.some((d, n) => d !== previous.deps[n])) pending.push(() => { previous?.cleanup?.(); values[i] = { deps, cleanup: cb() }; }); },
  };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const context = vm.createContext({ exports: {}, document: { hidden: false, addEventListener: (n, cb) => listeners.set(n, cb), removeEventListener: n => listeners.delete(n) }, window: { setTimeout: cb => { timers.set(++nextTimer, cb); return nextTimer; }, clearTimeout: id => timers.delete(id) }, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'lucide-react') return new Proxy({}, { get: () => 'svg' });
      if (id.endsWith('.css')) return {};
      if (id.includes('InfoooWorldFoundation')) return { useInfoooReducedMotion: () => reduced, InfoooSourceDisclosure: () => null, InfoooWorldShell: props => jsx('section', { children: [props.controls, props.stage, props.footer] }) };
      if (id.includes('utils/analytics')) return Object.fromEntries(['trackInfoooWorldStart', 'trackInfoooGuideComplete', 'trackInfoooEntityView'].map(name => [name, (...args) => events.push([name, ...args])]));
      const base=path.resolve(path.dirname(file),id); return load([base,base+'.ts',base+'.tsx'].find(name=>fs.existsSync(name))); 
    } });
    vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(file, context.exports); return context.exports;
  }
  const component = load(path.resolve('src/components/infooo/reliability/AgentReliabilityLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'agent-reliability-lab' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { click, choose, check, tick, events, timers, text: () => ui.map(text).join(' '), nodes: () => ui, status: () => ui.find(n => n.props?.className === 'rl-lab').props['data-status'] };
}
for(const reduced of [false,true]){
  const f=fixture(reduced),step=()=>reduced?f.click('Step'):f.tick();
  function drive(recover=true){for(let i=0;i<45;i++){if(f.status()==='partial'&&recover)f.click('Resume failed notification');else if(f.status()==='mismatch'&&recover){const b=f.nodes().find(n=>n.type==='button'&&/Reconcile & repair|Escalate existing/.test(textOf(n)));f.click(textOf(b));}else if(f.status()==='running')step();else return;}assert.fail('UI did not reach an outcome');}
  f.click('Run mission');if(!reduced){f.click('Pause');assert.equal(f.timers.size,0);f.click('Continue');}drive();assert.equal(f.status(),'verified');
  assert.equal(f.events.filter(e=>e[0]==='trackInfoooWorldStart').length,1);assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,1);
  f.click('Try a failure');
  const expected={timeout:'verified',partial:'verified','false-success':'verified',stale:'stopped',handoff:'verified','retry-loop':'escalated'};
  for(const id of Object.keys(expected)){
    f.choose('Failure scenario',id);f.click('Naive architecture');f.click('Run mission');drive();
    assert.equal(f.status(),id==='retry-loop'?'review':'claimed',id);
    if(id==='timeout'||id==='handoff')assert.ok(f.text().includes('Actual 2 replacements'));
    f.click('Reliable architecture');f.click('Run mission');drive();assert.equal(f.status(),expected[id],id);
  }
  f.choose('Failure scenario','timeout');f.click('Naive architecture');f.check('Idempotency key',true);f.click('Run mission');drive();assert.ok(f.text().includes('Actual 1 replacement'));assert.equal(f.status(),'claimed','idempotency alone is not verification');
  f.choose('Failure scenario','partial');f.click('Naive architecture');f.click('Run mission');drive(false);assert.equal(f.status(),'partial');f.click('Replay completed action too');drive();assert.ok(f.text().includes('Actual 2 replacements'));
  f.click('Trace');f.click('Compare duplicate run');f.click('Run mission');drive();assert.ok(f.text().includes('FAIL — execution did not meet criteria'));assert.ok(f.text().includes('Clean reference trace'));
  const span=f.nodes().find(n=>n.type==='button'&&n.props['data-retry']);assert.ok(span);span.props.onClick();
  const before=JSON.stringify(f.events);f.check('Show fictional full-content example',true);assert.ok(f.text().includes('Example Customer'));assert.equal(JSON.stringify(f.events),before,'content lesson must not emit telemetry');
  f.check('Metadata trace',false);assert.ok(f.text().includes('Instrumentation off'));
  f.click('Challenge');for(const answer of ['The outcome may be unknown','Idempotency','Verify the important resulting state','Escalate for review']){f.click(answer);f.click('Next question');}
  assert.equal(f.events.filter(e=>e[2]==='reliability-challenge').length,1);f.click('The outcome may be unknown');assert.equal(f.events.filter(e=>e[2]==='reliability-challenge').length,1);f.click('Reset challenge');assert.ok(f.text().includes('0 SOLVED'));
  assert.ok(f.events.every(e=>e.slice(1).every(v=>/^[a-z0-9-]+$/.test(v))),'analytics receives public identifiers only');
  f.click('Mission');f.click('Reset');assert.equal(f.status(),'ready');assert.ok(f.text().includes('Actual 0 replacements'));
}
function textOf(node){if(Array.isArray(node))return node.map(textOf).join('');return node&&typeof node==='object'?textOf(node.props?.children):typeof node==='boolean'?'':String(node??'');}
console.log('Reliability UI PASS: six naive/reliable scenarios, partial recovery/replay, idempotency, trace grading/selection, telemetry privacy, four challenges, reset, normal/reduced motion, pause/step and identifier-only once-per-run analytics.');
