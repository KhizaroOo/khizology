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
  const component = load(path.resolve('src/components/infooo/context-lab/ContextEngineeringLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'context-engineering-lab' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { result:()=>text(ui.find(n=>n.props?.className==='ce-result')), click, choose, check, tick, events, timers, text: () => ui.map(text).join(' '), nodes: () => ui, status: () => ui.find(n => n.props?.className === 'ce-lab').props['data-stage'] };
}
for(const reduced of [false,true]){
 const f=fixture(reduced),step=()=>reduced?f.click('Step'):f.tick();
 function drive(){for(let i=0;i<4&&f.status()>0&&f.status()<3;i++)step();assert.equal(f.status(),3);}
 f.click('Run task');if(!reduced){f.click('Pause');assert.equal(f.timers.size,0);f.click('Continue');}drive();assert.ok(f.result().includes('✓ PASS'));
 assert.equal(f.events.filter(e=>e[0]==='trackInfoooWorldStart').length,1);assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,1);
 f.click('Project instructionsCURRENT');assert.ok(f.result().includes('checkout-only CSS'));f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'));
 f.click('Project instructionsEXCLUDED');f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.click('Break it');
 for(const [id,fix] of [['instruction','Add project rule'],['file','Refresh file'],['memory','Remove stale memory'],['retrieval','Retrieve current source'],['flood','Prune noise'],['handoff','Structured handoff']]){
  f.choose('Scenario',id);f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'),id);f.click(fix);f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'),id);
 }
 f.click('Reset');f.click('Load everything · 42 mixed items');assert.ok(f.text().includes('42 context items'));f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'));
 f.click('Prune noise');f.click('Check freshness');f.click('Load tool on demand');f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.click('Reset');f.click('Change context');f.choose('Tool outputs','noisy');f.click('Compact context');assert.ok(f.text().includes('Carried-forward compact state'));f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.choose('Carried state','lossy');f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'));assert.ok(f.text().includes('OMITTED IN THIS SIMULATION'));
 f.click('Structured handoff');assert.ok(f.text().includes('Session A → reset → Session B'));f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.click('Reset');f.click('Add conflicting old note');f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'));f.click('Check freshness');f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.click('Simulate scope drift');f.click('Run task');drive();assert.ok(f.result().includes('✕ FAIL'));f.click('Pin goal');f.click('Run task');drive();assert.ok(f.result().includes('✓ PASS'));
 f.click('X-Ray');for(const name of ['Task','Instructions','Current state','Files','Memory','Retrieval','Tool definitions','Tool outputs','Handoff / compaction'])f.click(name);
 assert.ok(f.text().includes('Why is this here?'));assert.ok(f.text().includes('Window, instructions and stored memory'));
 f.click('Challenge');for(const answer of ['Retrieve/read project instructions','Current authoritative evidence','Preserve relevant diagnostic evidence','Structured current state + constraints + next step']){f.click(answer);f.click('Next');}
 assert.equal(f.events.filter(e=>e[2]==='context-challenges').length,1);f.click('Retrieve/read project instructions');assert.equal(f.events.filter(e=>e[2]==='context-challenges').length,1);
 f.click('Reset challenge');assert.ok(f.text().includes('0 SOLVED'));assert.ok(f.events.every(e=>e.slice(1).every(value=>/^[a-z0-9-]+$/.test(value))),'only public static IDs enter analytics');
 f.click('Lab');f.click('Reset');assert.equal(f.status(),0);assert.ok(f.text().includes('6 context items'));
}
console.log('Context UI PASS: happy path, live source toggle, six failure/repair loops, 42-item preset, compaction/lossy/structured transfer, conflict/drift, nine X-Ray layers, four challenges, reset, normal/reduced motion, pause/step and once-only identifier-only analytics.');
