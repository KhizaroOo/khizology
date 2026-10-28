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
  const component = load(path.resolve('src/components/infooo/skills-supply/SkillsSupplyLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'agent-skills-supply-chain' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { click, choose, check, tick, events, timers, text: () => ui.map(text).join(' '), nodes: () => ui, status: () => ui.find(n => n.props?.className === 'ss-lab').props['data-status'] };
}
for(const reduced of [false,true]){
  const f=fixture(reduced),step=()=>reduced?f.click('Step'):f.tick();
  function drive(){for(let i=0;i<10&&f.status()==='running';i++)step();}
  f.click('Install skill');if(!reduced){f.click('Pause');assert.equal(f.timers.size,0);f.click('Continue');}drive();
  assert.equal(f.status(),'done');assert.ok(f.text().includes('LOCAL REPORT CREATED'));
  assert.equal(f.events.filter(e=>e[0]==='trackInfoooWorldStart').length,1);
  assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,1);
  f.click('Update skill');drive();assert.equal(f.status(),'blocked');assert.ok(f.text().includes('PINNED'));
  f.click('Inspect bundle');assert.ok(f.text().includes('A skill can include'));assert.ok(f.text().includes('scripts/'));
  f.click('Review diff');assert.ok(f.text().includes('scripts/report.ts'));
  f.click('Break it');
  for(const scenario of ['update','lookalike','publisher','dependency','instruction','script']){
    f.choose('Scenario',scenario);f.click('Blind update · broad access');drive();assert.equal(f.status(),'done',scenario);assert.ok(f.text().includes('OUTBOUND SIDE EFFECT'));
    f.click('Run in constrained environment');drive();assert.equal(f.status(),'blocked');assert.ok(f.text().includes('Report created locally'));
    f.click('Restore v1 + safeguards');f.click('Update skill');drive();assert.equal(f.status(),'blocked',scenario);
  }
  f.choose('Scenario','lookalike');f.click('project-reporter · Example Labs');f.click('Blind update · broad access');drive();assert.equal(f.status(),'done');assert.ok(f.text().includes('LOCAL REPORT CREATED'));
  f.choose('Scenario','update');f.click('Blind update · broad access');drive();
  f.check('Require approval',true);f.click('Run installed skill');drive();assert.equal(f.status(),'approval');f.click('Deny outbound action');assert.equal(f.status(),'denied');
  f.click('Run installed skill');drive();f.click('Approve shown outbound action');assert.equal(f.status(),'done');assert.ok(f.text().includes('OUTBOUND SIDE EFFECT'));
  f.click('Restore v1 + safeguards');for(const control of ['Pin version','Verify publisher','Verify integrity','Sandbox','Deny network','Limit file access','Limit shell','Require approval','Allowlist skills','Audit execution'])f.check(control,false);
  f.check('Network grant ON',true);f.click('Update skill');drive();assert.equal(f.status(),'review');f.click('Keep installed version');assert.equal(f.status(),'denied');
  f.click('Update skill');drive();f.click('Approve this exact update');drive();assert.equal(f.status(),'done');
  f.click('Revoke installed skill');f.click('Run installed skill');drive();assert.equal(f.status(),'blocked');assert.ok(f.text().includes('revoked'));
  f.click('X-Ray');for(const name of ['Author','Source','Review','Version','Distribution','Install','Environment','Capabilities','Execution','Audit'])f.click(name);
  assert.ok(f.text().includes('What is trusted?'));assert.ok(f.text().includes('Curated library vs open catalog'));
  f.click('Challenge');for(const answer of ['Review changes before adoption','Project directory','Verify provenance','Transitive dependency changes']){f.click(answer);f.click('Next');}
  assert.equal(f.events.filter(e=>e[2]==='skills-challenges').length,1);f.click('Review changes before adoption');assert.equal(f.events.filter(e=>e[2]==='skills-challenges').length,1);
  f.click('Reset challenge');assert.ok(f.text().includes('0 SOLVED'));
  assert.ok(f.events.every(e=>e.slice(1).every(value=>/^[a-z0-9-]+$/.test(value))),'only static IDs reach analytics');
  f.click('Supply Chain');f.click('Reset');assert.equal(f.status(),'ready');assert.ok(f.text().includes('Nothing yet'));
}
console.log('Skills supply UI PASS: install/update, six scenarios, broad/constrained replay, bundle/diff, intended publisher, exact review, approval/decline, revocation, ten X-Ray layers, four challenges, reset, normal/reduced motion, pause/step and once-only identifier-only analytics.');
