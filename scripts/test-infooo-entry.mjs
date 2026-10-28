import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real component handlers and effects, with deterministic React/timer adapters.
function fixture(fileName, reduced) {
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
    const context = vm.createContext({ exports: {}, matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}), setTimeout:cb=>{timers.set(++nextTimer,cb);return nextTimer;},clearTimeout:id=>timers.delete(id),document: { hidden: false, addEventListener: (n, cb) => listeners.set(n, cb), removeEventListener: n => listeners.delete(n) }, window: { setTimeout: cb => { timers.set(++nextTimer, cb); return nextTimer; }, clearTimeout: id => timers.delete(id) }, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'lucide-react') return new Proxy({}, { get: () => 'svg' });
      if (id.endsWith('.css')) return {};
      if (id.includes('InfoooWorldFoundation')) return { useInfoooReducedMotion: () => reduced, InfoooSourceDisclosure: () => null, InfoooWorldShell: props => jsx('section', { children: props.firstVisit || [props.toolbar,props.stage,props.footer] }) };
      if (id.includes('utils/analytics')) return Object.fromEntries(['trackInfoooWorldStart', 'trackInfoooGuideComplete', 'trackInfoooEntityView'].map(name => [name, (...args) => events.push([name, ...args])]));
      const base=path.resolve(path.dirname(file),id); return load([base,base+'.ts',base+'.tsx'].find(name=>fs.existsSync(name))); 
    } });
    vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(file, context.exports); return context.exports;
  }
  const component = load(path.resolve('src/components/infooo/'+fileName)).default;
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' ? '' : String(node ?? ''));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug: 'test-world' } })); pending.forEach(cb => cb()); } while (dirty); }
  function click(name) { const button = ui.find(n => n.type === 'button' && text(n).trim() === name.trim()); assert.ok(button, `Missing ${name}`); assert.ok(!button.props.disabled, `Disabled ${name}`); button.props.onClick(); render(); }
  render();
  function drain(){for(let i=0;i<500&&timers.size;i++){const [id,cb]=timers.entries().next().value;timers.delete(id);cb();render();}assert.equal(timers.size,0,'finite first-visit playback');}
  return { click, drain, events, text: () => ui.map(text).join(' '), nodes: () => ui };
}


const cases=[
 ['agent-economy/AgentEconomy.tsx','Try the purchase','Replay the purchase','purchase receipts',null,null],
 ['mcp-security/McpSecurityLab.tsx','Trigger the poisoned tool','Apply an action boundary','Unsafe action executed','Replay with the boundary','Action blocked'],
 ['reliability/AgentReliabilityLab.tsx','Trigger the timeout','Fix with idempotency','2 actual replacement(s)','Replay the safe retry','1 actual replacement(s)'],
 ['browser-security/BrowserAgentLab.tsx','Read the hostile page','Check the action against the task','UNAUTHORIZED ACTION EXECUTED','Replay with the intent check','BLOCKED'],
 ['skills-supply/SkillsSupplyLab.tsx','Update the skill','Pin the reviewed version','External effect','Replay with the version pinned','Update held'],
 ['context-lab/ContextEngineeringLab.tsx','Compare the two contexts','Replace stale context with current evidence','PASS','Replay with current evidence','FAIL'],
 ['identity-lab/AgentIdentityLab.tsx','Revoke B’s shared credential','Give each agent an identity · revoke B only','All three agents stopped.','Replay separate identities','B stopped; A and C continue.'],
 ['incident-room/AgentIncidentRoom.tsx','Trace the incident','Preserve evidence & contain the agent','production action beyond','Recheck containment','New actions blocked'],
];
for(const reduced of [false,true])for(const [file,first,second,outcome,third,fixed]of cases){
 const f=fixture(file,reduced);
 assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props.className?.includes('k-button--primary')).length,1,file+' exactly one primary');
 assert.ok(!f.text().includes('Learning mode'),file+' no mandatory mode selection');
 f.click(first);assert.equal(f.events.filter(e=>e[0]==='trackInfoooWorldStart').length,1,file+' single start');assert.ok(f.text().toLowerCase().includes(outcome.toLowerCase()),file+' first aha: '+f.text());
 assert.ok(f.text().includes('What happened')&&f.text().includes('Why')&&f.text().includes('What changes it'));
 if(third){f.click(second);assert.ok(f.text().toLowerCase().includes(fixed.toLowerCase()),file+' repair');assert.ok(f.text().includes(third));}
 if(!file.includes('identity-lab')&&!file.includes('incident-room'))assert.equal(f.events.filter(e=>e[0]==='trackInfoooGuideComplete').length,third?2:1,file+' one completion per run');
 f.click('Try again');assert.ok(f.text().includes(first),file+' reset');
 assert.ok(f.events.every(e=>e.slice(1).every(v=>typeof v==='string'&&/^[a-z0-9-]+$/.test(v))),file+' analytics identifiers only');
 console.log('Entry PASS '+file+' '+(reduced?'reduced':'normal'));
}


for(const reduced of [false,true]){
 const physical=fixture('physical/PhysicalAIWorld.tsx',reduced);
 physical.click('See a plan meet reality');physical.drain();
 assert.ok(physical.text().includes('Model out of date'),'warehouse aha in one click');
 physical.click('Observe again & replan');physical.drain();
 assert.ok(physical.text().includes('Mission complete'),'warehouse recovery in second click');
 const grid=fixture('grid/LivingGrid.tsx',reduced);
 grid.click('Restore balanceSUPPLY RETURNS');grid.drain();
 assert.ok(grid.text().includes('The lights are back on'),'grid aha in one click');
 assert.ok(grid.text().includes('Restored generation now meets'),'grid explanation follows actual action');
 console.log('Entry PASS physical/grid '+(reduced?'reduced':'normal'));
}
