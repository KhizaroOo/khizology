import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(file, slug, reduced = false) {
  const state = [], events = [], modules = new Map(), timers = new Map(), listeners = new Map();
  let cursor = 0, dirty = false, pending = [], nextTimer = 0, ui;
  const jsx = (type, props) => ({ type, props });
  const doc = { hidden: false, addEventListener: (name, cb) => listeners.set(name, cb), removeEventListener: name => listeners.delete(name) };
  const win = { matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }), setTimeout: (cb, delay) => { assert.ok([2000, 4500, 5500, 6500].includes(delay)); timers.set(++nextTimer, cb); return nextTimer; }, clearTimeout: id => timers.delete(id) };
  const react = {
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { const next = typeof value === 'function' ? value(state[index]) : value; if (next !== state[index]) { state[index] = next; dirty = true; } }]; },
    useEffect(cb, deps) { const index = cursor++; const previous = state[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { pending.push(() => { previous?.cleanup?.(); state[index] = { deps, cleanup: cb() }; }); } },
  };
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename);
    const context = vm.createContext({ window: win, document: doc, exports: {}, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id.includes('utils/analytics')) return { trackInfoooWorldStart: (...args) => events.push(['start', ...args]), trackInfoooGuideComplete: (...args) => events.push(['complete', ...args]) };
      if (id.endsWith('.css')) return {};
      const base = path.resolve(path.dirname(filename), id);
      return load([base, base + '.tsx', base + '.ts'].find(name => fs.existsSync(name)));
    } });
    vm.runInContext(ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/')), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(filename, context.exports); return context.exports;
  }
  const component = load(path.resolve(file)).default;
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  const render = () => { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world: { slug, accent: '#5ccfaf' } })); pending.forEach(cb => cb()); } while (dirty); return ui; };
  const button = () => ui.find(node => node.type === 'button' && node.props.className?.includes('k-button--primary'));
  const click = name => { const item = name ? ui.find(node => node.type === 'button' && node.props.children === name) : button(); assert.ok(item, `Missing ${name}`); item.props.onClick(); render(); };
  const tick = () => { const entry = timers.entries().next().value; if (entry) { timers.delete(entry[0]); entry[1](); render(); } };
  const depth = value => { ui.find(node => node.type?.name === 'InfoooDepthControl').props.onChange(value); render(); };
  const choose = value => { ui.find(node => node.type === 'select').props.onChange({target:{value}}); render(); };
  render(); return { click, tick, depth, choose, button, events, timers, nodes: () => ui, step: () => ui.find(node => node.props?.role === 'img').props['data-step'], hide: () => { doc.hidden = true; listeners.get('visibilitychange')(); render(); } };
}

for (const [file, slug, last, completion] of [
  ['deployment/AppDeploymentJourney', 'app-deployment-journey', 4, 'deployment-to-user'],
  ['coding/AICodingAgentJourney', 'ai-coding-agent-journey', 10, 'coding-feature'],
]) {
  for (const reduced of [false, true]) for (const depth of [0, 1, 2]) {
    const f = fixture(`src/components/infooo/${file}.tsx`, slug, reduced);
    f.depth(depth);
    assert.equal(f.nodes().filter(node => node.props?.role === 'img').length, 1);
    assert.equal(f.nodes().filter(node => node.type === 'select').length, depth === 2 ? 1 : 0);
    assert.ok(f.nodes().some(node => node.props?.className === 'scene-card'));
    assert.ok(['Watch a deployment','Watch the agent work'].includes(f.button().props.children)); assert.equal(f.timers.size, 0);
    if(reduced && depth===0){f.click();assert.equal(f.step(),last,'first aha in one reduced-motion action');assert.equal(f.timers.size,0);assert.equal(f.events.filter(e=>e[0]==='start').length,1);assert.equal(f.events.filter(e=>e[0]==='complete').length,1);continue;}
    f.click(); assert.equal(f.step(), 0);
    if (!reduced) { f.click(); assert.equal(f.button().props.children, 'Play'); f.tick(); assert.equal(f.step(), 0); f.click(); }
    const finish = last;
    for (let step = 1; step <= finish; step++) {
      if (reduced) { assert.equal(f.timers.size, 0); assert.equal(f.button().props.children, 'Step'); f.click(); } else f.tick();
      assert.equal(f.step(), step);
      const notes = f.nodes().find(node => node.type?.name === 'InfoooTermNotes'); assert.ok(notes.props.terms.length <= 3);
      if (last === 10 && step === 4) assert.ok(f.nodes().some(node => node.props?.['data-result'] === 'fail'));
      if (last === 10 && step === 5) assert.ok(f.nodes().some(node => node.props?.className === 'workspace-object agent-object' && node.props['data-current-object']));
      if (last === 10 && step === 6) assert.ok(JSON.stringify(f.nodes()).includes(depth ? 'max-width: 420px' : 'Fits the screen'));
      if (last === 10 && step === 8) assert.ok(f.nodes().some(node => node.props?.['data-result'] === 'pass'));
    }
    assert.equal(f.button().props.children, 'Replay');
    assert.ok(!f.nodes().some(node => node.props?.className === 'agent-signal'), 'no floating success packet'); assert.equal(f.timers.size, 0);
    assert.equal(f.events.filter(event => event[0] === 'start').length, 1);
    assert.equal(f.events.filter(event => event[0] === 'complete' && event[2] === completion).length, 1);
    assert.ok(f.events.every(event => event[1] === slug));
    f.tick(); assert.equal(f.events.length, 2);
    f.click(); assert.equal(f.step(), 0);
    if (!reduced) { f.click('Step'); assert.equal(f.step(), 1); assert.equal(f.timers.size, 0); f.click(); f.hide(); assert.equal(f.timers.size, 0); }
    const position = f.step(); f.depth((depth + 1) % 3); assert.equal(f.step(), position, 'depth preserves position'); assert.equal(f.timers.size, 0, 'depth switches pause');
  }
  const cases = last === 4 ? ['normal', 'build', 'health', 'rollback', 'canary', 'database'] : ['normal', 'check', 'approval', 'wrong', 'context', 'scope'];
  for (const name of cases) {
    for (const reduced of [true, false]) {
      const f = fixture(`src/components/infooo/${file}.tsx`, slug, reduced); f.depth(2); f.choose(name);
      assert.equal(f.nodes().filter(node => node.type === 'option').length, 6);
      f.click();
      const end = last === 4 ? name === 'normal' ? 4 : ['build'].includes(name) ? 5 : 6 : last;
      for (let step = 1; step <= end; step++) {
        if (name === 'approval' && step === 10) {
          assert.equal(f.step(), 9); assert.equal(f.button().props.disabled, true); f.click(); assert.equal(f.step(), 9, 'permission cannot be bypassed');
          assert.equal(f.timers.size, 0);
          f.click('Simulate human approval'); assert.equal(f.step(), 9);
          assert.ok(f.nodes().some(node => node.props?.['data-open'] === true));
          if (!reduced) f.click();
        }
        if (reduced) f.click(); else f.tick();
        assert.equal(f.step(), step);
        assert.ok(f.nodes().find(node => node.type?.name === 'InfoooTermNotes').props.terms.length <= 3);
        if (last === 4 && (name === 'build' && step === 1 || ['health', 'database'].includes(name) && step === 3)) {
          assert.ok(f.nodes().some(node => node.props?.['data-failed'] === true));
          assert.ok(JSON.stringify(f.nodes().find(node => node.props?.className === 'live-version')).includes('1'));
          assert.equal(f.events.filter(event => event[0] === 'complete').length, 0);
        }
        if (last === 10 && ['wrong','context','scope'].includes(name) && step >= 2 && step < 6) {
          assert.ok(JSON.stringify(f.nodes()).includes('PATCH BLOCKED'));
          assert.ok(!f.nodes().some(node => node.type === 'ins'), 'blocked context must not show an accepted patch');
        }
      }
      assert.equal(f.button().props.children, 'Replay');
      assert.equal(f.events.filter(event => event[0] === 'complete').length, 1);
      if (name === 'rollback') assert.ok(JSON.stringify(f.nodes()).includes('v1 serving · v2 retained'));
      if (name === 'approval') assert.ok(JSON.stringify(f.nodes()).includes('No real publish happens'));
      const evidence = f.nodes().find(node => node.props?.className === 'scene-evidence');
      assert.ok(evidence);
      assert.ok(f.nodes().filter(node => node.type === 'li').every(node => node.props['data-ready'] === true));
      f.click('Replay key moment'); assert.equal(f.step(), last === 4 && name === 'build' ? 1 : last === 4 ? 3 : 4);
      assert.equal(f.events.filter(event => event[0] === 'start').length, 1, 'key moment is not a new world start');
      while (f.button().props.children !== 'Replay') { if (reduced) f.click(); else f.tick(); }
      assert.equal(f.events.filter(event => event[0] === 'complete').length, 1, 'key moment does not duplicate completion');
      f.click(); assert.equal(f.step(), 0);
      assert.equal(f.events.filter(event => event[0] === 'start').length, 2);
    }
  }
}
console.log('PASS: six cases per world, all depth/reduced-motion playback, failure/recovery, approval boundary, blocked diffs, accumulated evidence, key-moment replay and once-per-run identifier-only analytics.');
