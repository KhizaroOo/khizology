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
  const component = load(path.resolve('src/components/infooo/mcp-security/McpSecurityLab.tsx')).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'mcp-security-lab' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  function choose(label, value) { const field = ui.find(n => n.type === 'label' && text(n).startsWith(label)); assert.ok(field, label); const select = flatten(field).find(n => n.type === 'select' || n.type === 'input'); select.props.onChange({ target: { value } }); render(); }
  function check(label, checked) { const field = ui.find(n => n.type === 'label' && text(n).includes(label)); const input = flatten(field).find(n => n.type === 'input'); input.props.onChange({ target: { checked } }); render(); }
  function tick() { const next = timers.entries().next().value; if (next) { timers.delete(next[0]); next[1](); render(); } }
  render();
  return { click, choose, check, tick, events, timers, text: () => ui.map(text).join(' '), nodes: () => ui, status: () => ui.find(n => n.props?.className === 'ms-experiment').props['data-status'] };
}
for (const reduced of [false, true]) {
  const f = fixture(reduced);
  const advance = () => reduced ? f.click('Step') : f.tick();
  assert.equal(f.timers.size,0); f.click('Run safe task');
  if(!reduced){ f.click('Pause'); assert.equal(f.timers.size,0); f.click('Continue'); }
  for(let i=0;i<4&&f.status()==='running';i++) advance();
  assert.equal(f.status(),'approval'); assert.ok(f.text().includes('team@example.test'));
  assert.ok(f.text().includes('approved short project summary'));
  f.click('Approve this action'); advance(); assert.equal(f.status(),'complete');
  assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,1);
  f.click('Break trust');
  for(const scenario of ['poisoning','cross-server','deputy','token','rug-pull','misrouting']) {
    f.choose('Experiment',scenario); f.click('Expose demo architecture'); f.click('Run experiment');
    for(let i=0;i<6&&f.status()==='running';i++) advance();
    assert.equal(f.status(),'exposed',scenario);
    f.click('Apply layered defenses'); f.click('Run experiment');
    for(let i=0;i<6&&f.status()==='running';i++) advance();
    assert.equal(f.status(),'blocked',scenario); assert.ok(f.text().includes('BLOCKED'));
  }
  f.click('Reset'); assert.ok(f.text().includes('LOW')); assert.equal(f.status(),'ready');
  f.click('X-ray'); f.click('Compare local process access'); f.click('Run experiment'); advance();
  assert.equal(f.status(),'blocked'); f.check('Sandbox local process',false); f.click('Run experiment'); advance(); assert.equal(f.status(),'exposed');
  f.click('Try schema validation'); f.click('Run experiment'); advance(); assert.equal(f.status(),'blocked');
  f.check('Input / output validation',false); f.click('Run experiment'); advance(); assert.equal(f.status(),'exposed');
  f.click('Expire demo authority'); f.click('Run experiment'); advance(); assert.equal(f.status(),'blocked'); assert.ok(f.text().includes('expired'));
  f.click('Challenge');
  for(const answer of ['Issues read-only','Re-review the tool','Execution-time policy and meaningful approval','Only the required project directory']) { f.click(answer); f.click('Next question'); }
  assert.equal(f.events.filter(e=>e[2]==='boundary-challenge').length,1);
  f.click('Issues read-only'); assert.equal(f.events.filter(e=>e[2]==='boundary-challenge').length,1);
  f.click('Reset challenge'); assert.ok(f.text().includes('0 SOLVED'));
  assert.ok(f.events.every(e=>e.slice(1).every(v=>/^[a-z0-9-]+$/.test(v))), 'Only public identifiers may reach analytics');
}
console.log('MCP Security UI PASS: safe task, meaningful approval, six exposed/protected cases, reset, expiry, local sandbox and validation comparisons, four challenges, normal/reduced motion, pause/step and once-per-lesson identifier-only analytics.');
