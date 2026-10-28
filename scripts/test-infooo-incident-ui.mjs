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
  const component = load(path.resolve('src/components/infooo/incident-room/AgentIncidentRoom.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'agent-incident-response-room' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  render();
  return { click, choose, check, events, text: () => ui.map(text).join(' '), nodes: () => ui };
}


for(const reduced of [false,true]){
 const f=fixture(reduced);
 function investigate(){f.click('Investigate');for(let n=0;n<5;n++)f.click('Reveal next evidence');}
 for(let i=0;i<6;i++){
  f.choose('Incident',String(i));investigate();assert.ok(f.text().includes('INFERRED'));assert.ok(f.text().includes('UNKNOWN'));
  for(const action of ['Preserve evidence','Contain affected authority','Remove unsafe authority','Verify authority','Inspect resulting state','Restore safe workflow','Monitor next action'])f.click(action);
  assert.ok(f.text().includes('RECOVERY VERIFIED'));f.click('Replay with stronger architecture');assert.ok(f.text().includes(i===5?'ONE EFFECT · duplicate suppressed':'BLOCKED · independent policy'));
 }
 assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,6);
 f.click('Replay with stronger architecture');assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,6);
 f.choose('Incident','4');f.check('Reviewed version pin',true);assert.ok(f.nodes().some(n=>n.props?.className==='ir-replay'),'architecture replay must be visible even before sources are opened');assert.ok(f.text().includes('BLOCKED · unreviewed v2 not adopted'));
 f.choose('Incident','1');f.click('Pause agent');f.click('Probe subsequent action');assert.ok(f.text().includes('Probe ALLOWED'));f.click('Contain now');f.click('Probe subsequent action');assert.ok(f.text().includes('Probe BLOCKED'));
 f.click('Reset');f.click('Clear fictional session trace');assert.ok(f.text().includes('Trace lost'));f.click('Capture evidence bundle');assert.ok(f.text().includes('5 original sources preserved'));
 f.click('Reset');f.click('Capture evidence bundle');f.click('Clear fictional session trace');assert.ok(f.text().includes('Trace retained'));
 for(const name of ['Dedicated identity','Least privilege','Policy outside agent','Approval gate','Session isolation','Reviewed version pin','Correlated tracing','Result verification','Reconcile + idempotency'])f.check(name,true);
 f.click('X-Ray');for(const layer of ['User','Agent','Context','Identity','Credential','Tool','Policy','Resource','Audit'])f.click(layer);
 assert.ok(f.text().includes('What remains unknown?'));
 f.click('Challenge');for(const answer of ['Reachable does not mean confirmed accessed','Inspect resulting state and investigate the discrepancy','These records may not uniquely attribute it','No — address the architectural contributing conditions']){f.click(answer);f.click('Next challenge');}
 assert.equal(f.events.filter(e=>e[2]==='incident-challenges').length,1);f.click('Reachable does not mean confirmed accessed');assert.equal(f.events.filter(e=>e[2]==='incident-challenges').length,1);
 assert.ok(f.events.every(e=>e.slice(1).every(value=>/^[a-z0-9-]+$/.test(value))),'analytics contain only fixed public IDs');
 f.click('Incident');f.click('Reset');assert.ok(f.text().includes('Investigate'));
}
console.log('Incident UI PASS: six complete investigations/recoveries/replays, immediate containment, independent proof misuse, preserved/lost evidence, nine X-Ray layers, four challenges, reset, normal/reduced-motion meaning and once-only identifier-only completion analytics.');
