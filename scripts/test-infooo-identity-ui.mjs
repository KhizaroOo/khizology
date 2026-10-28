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
  const component = load(path.resolve('src/components/infooo/identity-lab/AgentIdentityLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'agent-identity-lab' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { click, choose, events, text: () => ui.map(text).join(' '), nodes: () => ui };
}

for(const reduced of [false,true]){
 const f=fixture(reduced);
 for(const name of ['Run normal work','Trigger incident','Trace actor','Revoke shared credential','Fix identity','Run same work','Repeat incident','Trace actor','Revoke Deploy Agent'])f.click(name);
 assert.ok(f.text().includes('only B stops'));assert.ok(f.text().includes('Actor ambiguous'));
 assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,1);
 f.click('Incident');
 for(const [i,fix] of [[0,'Dedicated identity'],[1,'Dedicated identity'],[2,'Narrow scope'],[3,'Re-authorize'],[4,'Disable and revoke'],[5,'Delegate read only']]){f.choose('Incident',String(i));f.click(fix);}
 f.click('Reset');for(const n of ['Run normal work','Trigger incident','Trace actor','Revoke shared credential','Fix identity'])f.click(n);
 for(const n of ['Assign owner','Define purpose','Narrow scope','Short-lived credential','Pass 15 minutes','Try normal task','Re-authorize','Try normal task','Owner leaves','Review owner','Assign owner','Permission drift','Review access','Identity drift','Define purpose'])f.click(n);
 f.click('On behalf of Example User');f.click('Record example action');assert.ok(f.text().includes('Travel Assistant'));
 f.click('Deny');f.click('Attempt requested email');assert.ok(f.text().includes('no approved current email grant'));
 f.click('Lab');f.click('On behalf of Example User');f.click('Approve');f.click('Attempt requested email');assert.ok(f.text().includes('ALLOW: explicitly approved'));
 f.click('Attempt delegated delete');assert.ok(f.text().includes('CHILD GRANT BLOCKED'));f.click('Delegate read only');assert.ok(f.text().includes('Research Agent · reports.read'));
 f.click('X-Ray');for(const name of ['Principal / human','Delegation','Agent identity','Credential','Authorization','Policy','Resource','Audit','Revocation'])f.click(name);
 f.click('Challenge');for(const answer of ['Attribution is ambiguous','staging.deploy','Review, disable and revoke','No — keep child authority within the parent grant']){f.click(answer);f.click('Next challenge');}
 assert.equal(f.events.filter(e=>e[2]==='identity-challenges').length,1);f.click('Attribution is ambiguous');assert.equal(f.events.filter(e=>e[2]==='identity-challenges').length,1);
 assert.ok(f.events.every(e=>e.slice(1).every(value=>/^[a-z0-9-]+$/.test(value))));
 f.click('Lab');assert.ok(f.text().includes('Three agents. One shared credential.'));
}
console.log('Identity UI PASS: complete shared/dedicated progression, six incident repairs, ownership/scope/expiry/drift, self/OBO, approval, delegation, nine X-Ray layers, four challenges, deterministic reset, normal/reduced motion and identifier-only once-per-completion analytics.');
