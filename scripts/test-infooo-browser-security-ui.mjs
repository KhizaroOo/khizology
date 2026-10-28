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
  const component = load(path.resolve('src/components/infooo/browser-security/BrowserAgentLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'browser-agent-under-attack' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { click, choose, check, tick, events, timers, text: () => ui.map(text).join(' '), nodes: () => ui, status: () => ui.find(n => n.props?.className === 'ba-lab').props['data-decision'] };
}
for (const reduced of [false, true]) {
  const f = fixture(reduced);
  const step = () => reduced ? f.click('Step') : f.tick();
  function drive() { for (let i = 0; i < 12 && ['ready', 'running'].includes(f.status()); i++) step(); }
  f.click('Run task');
  if (!reduced) { f.click('Pause'); assert.equal(f.timers.size, 0); f.click('Continue'); }
  drive(); assert.equal(f.status(), 'approval');
  f.click('Approve shown action'); drive(); assert.equal(f.status(), 'executed');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooWorldStart').length, 1);
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooGuideComplete').length, 1);
  f.click('Attack the agent');
  for (const scenario of ['webpage','hidden','image','cross-site','data','purchase']) {
    f.choose('Attack scenario', scenario); f.click('A · Broad access'); f.click('Run attack'); drive(); assert.equal(f.status(), 'executed', scenario);
    f.click('B · Bounded access'); f.click('Run attack'); drive(); assert.equal(f.status(), 'blocked', scenario);
  }
  f.choose('Attack scenario', 'webpage'); f.click('A · Broad access');
  f.check('Approval gate', true); f.click('Run attack'); drive(); assert.equal(f.status(), 'approval');
  f.click('Decline'); assert.equal(f.status(), 'denied');
  f.click('Reset'); f.click('Run attack'); drive(); f.click('Approve shown action'); drive(); assert.equal(f.status(), 'executed', 'approval without policy can permit a bad action');
  for (const name of ['Treat web as untrusted','Intent binding','Least privilege','Minimum context','Destination policy','Action validation','Isolated session','Sensitive data filter','Audit trail']) { f.check(name, true); assert.equal(f.status(), 'ready'); }
  f.click('X-Ray');
  for (const label of ['1. User goal','2. Agent','3. Browser observation','4. Content classification','5. Action proposal','6. Policy','7. Permission','8. Approval','9. Execution']) f.click(label);
  assert.ok(f.text().includes('What it trusts')); assert.ok(f.text().includes('Email and document example'));
  f.click('Challenge');
  for (const answer of ['Nobody','Only relevant shopping context','Block / require new user authorization','Limit permissions and high-impact actions']) { f.click(answer); f.click('Next'); }
  assert.equal(f.events.filter(e => e[2] === 'browser-challenges').length, 1);
  f.click('Nobody'); assert.equal(f.events.filter(e => e[2] === 'browser-challenges').length, 1);
  f.click('Reset challenge'); assert.ok(f.text().includes('0 SOLVED'));
  assert.ok(f.events.every(e => e.slice(1).every(value => /^[a-z0-9-]+$/.test(value))), 'only canonical static IDs enter analytics');
  f.click('Mission'); assert.equal(f.status(), 'ready');
}
console.log('Browser security UI PASS: safe task, informed approval/decline, six weak/strong attacks, all defenses, nine X-Ray layers, four challenges, reset, pause/step, normal/reduced motion and once-only identifier-only analytics.');
