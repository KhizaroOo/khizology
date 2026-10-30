// UI checks for Infooo World 015 "Why Cities Trap Heat".
// Runs the real component, hooks and playback with deterministic React, timer and frame adapters. Run: node scripts/test-infooo-city-heat-ui.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// ---- the real registry record (no fixtures needed: the record must stay fully inline) ----
const registry = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/infooo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: registry.exports, require: id => {
  if (id.endsWith('valueLaws')) return { createIdeaEvaluation: value => value };
  if (id.endsWith('gridTrends')) return { gridSources: [] };
  if (id.endsWith('humanAtlasLearning')) return { followTheBloodGuide: {}, humanAtlasEntities: [], humanAtlasRelationships: [] };
  if (id.endsWith('deploymentJourney')) return { deploymentStages: [], deploymentGuide: {} };
  throw Error(`Unexpected registry dependency: ${id}`);
} });
const world = registry.exports.infoooWorlds.find(w => w.id === 'world-015');
assert.ok(world, 'world-015 must be in the registry');
assert.equal(world.slug, 'why-cities-trap-heat'); assert.equal(world.status, 'published'); assert.equal(world.visibility, 'public');
assert.equal(world.worldNumber, 15); assert.equal(world.category, 'world-infrastructure');
assert.ok(registry.exports.infoooCategories.some(c => c.id === world.category));
assert.equal(new Set(registry.exports.infoooWorlds.map(w => w.slug)).size, registry.exports.infoooWorlds.length, 'slugs stay unique');
for (const id of world.relatedWorlds) assert.ok(registry.exports.infoooWorlds.some(w => w.id === id && w.status === 'published'), `related ${id} must be a public world`);
assert.ok(!registry.exports.infoooWorlds.some(w => w.worldNumber > 15 || /^world-0(1[6-9]|2\d)$/.test(w.id)), 'planned worlds 016-027 must not exist yet');
for (const k of ['fact', 'model', 'simulation', 'limitations', 'educationalContext', 'lastReviewed']) assert.ok(world.knowledge[k], `knowledge.${k}`);
assert.equal(world.knowledge.sources.length, 8);
for (const s of world.knowledge.sources) { assert.ok(s.label && /^https:\/\//.test(s.url), s.url); }
assert.equal(new Set(world.knowledge.sources.map(s => s.url)).size, 8, 'sources are unique');
for (const asset of [world.hero.asset, world.preview.asset]) assert.ok(fs.existsSync(path.join('public', asset)), `${asset} must exist`);
const png = fs.readFileSync(path.join('public', world.hero.asset)); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
assert.ok(world.preview.alt.length > 30);
assert.ok(fs.existsSync('src/pages/infooo/why-cities-trap-heat.astro'));

// ---- source hygiene: browser-only, no storage, no network, no timers that outlive the page ----
const dir = 'src/components/infooo/city-heat', sources = fs.readdirSync(dir).filter(f => /\.(tsx?|css)$/.test(f)).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
for (const [file, text] of sources) { assert.ok(!/\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|sendBeacon|setInterval)\b/.test(text), `${file}: no storage, network or intervals`); assert.ok(!/from 'three'|from 'd3|from 'recharts|from 'chart/.test(text), `${file}: no chart or 3D dependency`); }
assert.ok(!/\bimport\b[^;]*\binfoooWorlds\b/.test(fs.readFileSync(`${dir}/CityHeatWorld.tsx`, 'utf8')), 'the client must not import the full registry');

// ---- deterministic React / frame / timer adapters ----
function fixture(reduced) {
  const values = [], modules = new Map(), events = [], listeners = new Map(), frames = new Map();
  let cursor = 0, dirty = false, pending = [], nextFrame = 0, clock = 0, ui, hidden = false;
  const jsx = (type, props, key) => ({ type, props, key });
  const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], next => { const value = typeof next === 'function' ? next(values[i]) : next; if (!Object.is(value, values[i])) dirty = true; values[i] = value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useMemo(fn, deps) { const i = cursor++, prev = values[i]; if (prev && same(prev.deps, deps)) return prev.value; const value = fn(); values[i] = { deps, value }; return value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(cb, deps) { const i = cursor++, prev = values[i]; if (!prev || !deps || !same(prev.deps, deps)) pending.push(() => { prev?.cleanup?.(); values[i] = { deps, cleanup: cb() }; }); },
    memo: component => component,
  };
  const windowObject = { setTimeout: () => 0, clearTimeout: () => {}, matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }) };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const context = vm.createContext({
      exports: {}, Math, Number, Object, Array, String, JSON, Infinity, NaN, isNaN, Date, Set, Map, Error,
      performance: { now: () => clock },
      requestAnimationFrame: cb => { frames.set(++nextFrame, cb); return nextFrame; }, cancelAnimationFrame: id => { frames.delete(id); },
      document: { get hidden() { return hidden; }, addEventListener: (name, cb) => listeners.set(name, cb), removeEventListener: name => listeners.delete(name), querySelector: () => null },
      window: windowObject, getComputedStyle: () => ({ paddingLeft: '0', paddingRight: '0' }), ResizeObserver: class { observe() {} disconnect() {} },
      require: id => {
        if (id === 'react') return react;
        if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (id.endsWith('.css')) return {};
        if (id.includes('InfoooWorldFoundation')) return { useInfoooReducedMotion: () => reduced, InfoooWorldShell: props => jsx('section', { children: [props.controls, props.stage, props.footer] }) };
        if (id.includes('utils/analytics')) return Object.fromEntries(['trackInfoooWorldStart', 'trackInfoooGuideComplete', 'trackInfoooEntityView'].map(name => [name, (...args) => events.push([name, ...args])]));
        const base = path.resolve(path.dirname(file), id); return load([base, `${base}.ts`, `${base}.tsx`].find(name => fs.existsSync(name) && fs.statSync(name).isFile()));
      },
    });
    vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(file, context.exports); return context.exports;
  }
  const component = load(path.resolve('src/components/infooo/city-heat/CityHeatWorld.tsx')).default;
  const keyErrors = [];
  const flatten = node => { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) { const keys = node.filter(n => n && typeof n === 'object' && n.key !== undefined).map(n => String(n.key)); const dupes = keys.filter((k, i) => keys.indexOf(k) !== i); if (dupes.length) keyErrors.push(`duplicate React key(s) ${[...new Set(dupes)].join(', ')} among ${keys.length} siblings`); return node.flatMap(flatten); } if (typeof node.type === 'function') return flatten(node.type(node.props)); return [node, ...flatten(node.props?.children)]; };
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : (typeof node === 'boolean' || node == null ? '' : String(node));
  function render() { do { dirty = false; cursor = 0; pending = []; ui = flatten(component({ world })); pending.forEach(cb => cb()); } while (dirty); assert.deepEqual(keyErrors.splice(0), [], 'React keys must be unique among siblings (React warns, and may drop or duplicate rows)'); }
  const label = n => text(n).replace('✓', '').trim();
  const find = (type, name) => ui.find(n => n.type === type && label(n) === name);
  function click(name, index = 0) { const matches = ui.filter(n => n.type === 'button' && label(n) === name); const button = matches[index]; assert.ok(button, `Missing button "${name}"`); assert.ok(!button.props.disabled, `Disabled button "${name}"`); button.props.onClick(); render(); }
  const slider = () => ui.find(n => n.type === 'input' && n.props.type === 'range');
  const hour = () => 5 + Number(slider().props.value) / 60;
  function advance(ms) { const end = clock + ms; while (clock < end) { clock += 16; const due = [...frames.entries()]; frames.clear(); due.forEach(([, cb]) => cb(clock)); render(); } }
  render();
  return { click, advance, render, events, hour, slider, find, label, text: () => ui.map(text).join(' ') , nodes: () => ui, frames: () => frames.size, listener: name => listeners.get(name), setHidden: v => { hidden = v; }, tick: ms => { clock += ms; } };
}
const bad = (s) => /NaN|undefined|Infinity|\[object/.test(s);

// ---- standard motion ----
{
  const f = fixture(false);
  assert.ok(f.find('button', '▶ Run the day'), 'primary action is "Run the day"');
  assert.equal(f.slider().props.min, 0); assert.equal(f.slider().props.max, 1440); assert.equal(f.hour(), 5);
  assert.ok(!f.nodes().some(n => n.props?.id === 'ch-aha' && !n.props.hidden), 'the reveal stays hidden at the start');
  assert.ok(f.text().includes('Same start.'), 'opening caption'); assert.ok(!bad(f.text()), 'no broken numbers at the start');
  assert.equal(f.events.length, 0, 'rendering emits no analytics');

  f.click('▶ Run the day');
  assert.deepEqual(f.events[0], ['trackInfoooWorldStart', 'why-cities-trap-heat'], 'starting emits one public world-start event');
  assert.ok(f.find('button', '⏸ Pause'), 'label becomes Pause while running');
  const seen = []; const stepsAtBeat = new Map();
  for (let i = 0; i < 4000 && !f.find('button', '↻ Replay'); i++) { f.advance(32); const h = f.hour(); seen.push(h); stepsAtBeat.set(h, (stepsAtBeat.get(h) || 0) + 1); }
  assert.ok(f.find('button', '↻ Replay'), 'the day finishes and offers Replay'); assert.equal(f.hour(), 29);
  assert.ok(seen.every((h, i) => i === 0 || h >= seen[i - 1]), 'time never runs backwards');
  for (const beat of [9, 15, 19.5, 22, 27]) assert.ok(stepsAtBeat.get(beat) >= 60, `playback holds at ${beat} so the moment can be read (${stepsAtBeat.get(beat)} frames)`);
  const seconds = seen.length * 32 / 1000; assert.ok(seconds > 25 && seconds < 45, `the whole day takes about half a minute of reading (${seconds.toFixed(1)} s)`);
  assert.ok(f.text().includes('Cities don’t only get hot. They store heat and release it later.'), 'the reveal appears');
  assert.ok(f.events.some(e => e[0] === 'trackInfoooGuideComplete' && e[2] === 'day-run'), 'reaching 3 AM completes the guide once');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooGuideComplete').length, 1, 'completion fires once');
  assert.equal(f.frames(), 0, 'no frame callback is left running after the day ends');
  f.click('↻ Replay'); assert.ok(f.find('button', '⏸ Pause')); f.advance(400); assert.ok(f.hour() > 5 && f.hour() < 6, 'Replay restarts from dawn');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooWorldStart').length, 1, 'world start is reported once');
  f.click('⏸ Pause'); const frozen = f.hour(); f.advance(1500); assert.equal(f.hour(), frozen, 'Pause freezes time'); assert.ok(f.find('button', '▶ Resume')); assert.equal(f.frames(), 0);
  f.click('▶ Resume'); f.setHidden(true); f.listener('visibilitychange')(); f.render(); assert.ok(f.find('button', '▶ Resume'), 'a hidden tab pauses playback'); f.setHidden(false);
  const slid = f.slider(); f.click('▶ Resume'); slid.props.onChange({ target: { value: '600' } }); f.render(); assert.equal(f.hour(), 15, 'dragging the slider moves the clock'); assert.ok(f.find('button', '▶ Resume'), 'and pauses playback');
  assert.ok(f.slider().props['aria-valuetext'].includes('3:00 PM'), 'slider announces the time in words');
  assert.ok(f.text().includes('3 PM · Hot surfaces, warm air.'));
  assert.ok(!bad(f.text()), 'no broken numbers after a full run');
}

// ---- guess, reveal, replay, three days ----
{
  const f = fixture(false);
  f.click('Hot surfaces fade first');
  assert.equal(f.find('button', 'Hot surfaces fade first').props['aria-pressed'], true); assert.equal(f.find('button', 'Warm air fades first').props['aria-pressed'], false);
  f.click('Hot surfaces fade first'); assert.equal(f.find('button', 'Hot surfaces fade first').props['aria-pressed'], false, 'a guess can be taken back');
  f.click('Hot surfaces fade first'); assert.ok(f.text().includes('Locked in for the reveal'));
  f.click('Skip to 3 AM'); assert.equal(f.hour(), 27);
  const t = f.text(); assert.ok(t.includes('You guessed “Hot surfaces fade first”. Right.'), 'the verdict is computed from this run'); assert.ok(t.includes('Locked in: “Hot surfaces fade first”'));
  assert.ok(f.nodes().filter(n => n.type === 'button' && n.props.className === 'ch-chip' && ['Hot surfaces fade first', 'Warm air fades first', 'Both fade together'].includes(f.label(n))).every(n => n.props.disabled), 'guess chips lock after the reveal');
  f.click('Show the stored heat'); assert.ok(f.find('button', 'Showing stored heat'));
  f.click('Keep the heat wave going (3 days)');
  assert.equal(f.slider().props.max, 4320, 'three days extend the slider'); assert.ok(f.find('button', '⏸ Pause'), 'the heat wave starts playing'); assert.equal(f.hour(), 29, 'from dawn of day 2');
  f.advance(200); assert.ok(f.hour() > 29, 'time moves on into day 2'); assert.ok(f.text().includes('Day 2 ·'));
  assert.ok(f.events.some(e => e[0] === 'trackInfoooEntityView' && e[2] === 'days-3'));
  f.click('Back to one day'); assert.ok(f.hour() <= 29, 'back to one day clamps the clock'); assert.equal(f.slider().props.max, 1440);
  const f2 = fixture(false); f2.slider().props.onChange({ target: { value: '1440' } }); f2.render();
  const hiddenGuess = f2.nodes().find(n => n.props?.className === 'ch-guess'); assert.equal(hiddenGuess.props.hidden, true, 'scrubbing to the end before guessing hides the dead chips');
}

// ---- weather, levers, chart tabs, quiz ----
{
  const f = fixture(false);
  f.click('Add street trees'); assert.equal(f.find('button', 'Add street trees').props['aria-pressed'], true); assert.equal(f.find('button', 'No change').props['aria-pressed'], false);
  assert.ok(f.text().includes('Block A before the change'), 'the chart shows the "before" ghost once something is changed');
  f.click('No change'); assert.ok(!f.text().includes('Block A before the change'));
  for (const name of ['Reflective roofs', 'Grass, not asphalt', 'Open the sky']) { f.click(name); assert.equal(f.find('button', name).props['aria-pressed'], true); assert.ok(!bad(f.text()), name); }
  f.click('Cloudy'); f.click('Windy'); f.click('Hot, clear, calm');
  for (const tab of ['Air temperature', 'Air vs countryside', 'Stored heat', 'Surface temperature']) { f.click(tab); assert.equal(f.find('button', tab).props['aria-pressed'], true); assert.ok(!bad(f.text()), tab); }
  f.click('Air vs countryside'); assert.ok(/peaks at \d+:\d\d [AP]M/.test(f.text()), 'the heat-island note names the peak from the run');
  f.click('3 days'); assert.equal(f.slider().props.max, 4320); f.click('1 day'); assert.equal(f.slider().props.max, 1440);
  const entityIds = f.events.filter(e => e[0] === 'trackInfoooEntityView').map(e => e[2]);
  for (const id of ['lever-trees', 'lever-none', 'lever-roofs', 'lever-grass', 'lever-sky', 'weather-cloudy', 'weather-windy', 'weather-clear', 'days-3', 'days-1']) assert.ok(entityIds.includes(id), id);
  assert.ok(f.events.every(e => e.slice(1).every(v => /^[a-z0-9-]+$/.test(v))), 'analytics carries only public world and control identifiers');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooWorldStart').length, 0, 'changing settings alone is not a world start');
  // quiz: wrong, then right; checking with nothing picked asks for an answer
  const checks = () => f.nodes().filter(n => n.type === 'button' && f.label(n) === 'Check answer');
  const radio = (q, v) => f.nodes().find(n => n.type === 'input' && n.props.type === 'radio' && n.props.name === `ch-q${q}` && n.props.value === v);
  checks()[1].props.onClick(); f.render(); assert.ok(f.text().includes('Pick an answer first.'));
  radio(0, 0).props.onChange(); f.render(); checks()[0].props.onClick(); f.render(); assert.ok(f.text().includes('Not quite.') && f.text().includes('The answer: “Much less different than the surfaces”.'), 'a wrong answer names the right one');
  radio(0, 1).props.onChange(); f.render(); assert.ok(radio(0, 1).props.checked); assert.ok(f.text().includes('Yes.'), 'the verdict follows the selected answer');
  assert.ok(/°C/.test(f.text()) && !bad(f.text()), 'explanations use model numbers');
}

// ---- reduced motion: no autoplay, no animation loop, stepping instead ----
{
  const f = fixture(true);
  assert.ok(f.find('button', '▶ First moment'), 'the label offers stepping, not autoplay');
  const hours = []; for (let i = 0; i < 7; i++) { f.nodes().find(n => n.type === 'button' && n.props.id === 'ch-run').props.onClick(); f.render(); hours.push(f.hour()); }
  assert.deepEqual(hours, [9, 15, 19.5, 22, 27, 29, 5], 'each press jumps to the next story moment, then wraps');
  assert.equal(f.frames(), 0, 'no animation frames are ever requested'); f.advance(2000); assert.equal(f.hour(), 5, 'time never moves on its own');
  const g = fixture(true); g.click('▶ First moment'); g.click('Next moment ▶'); g.click('Next moment ▶'); g.click('Next moment ▶'); g.click('Next moment ▶');
  assert.ok(g.text().includes('Cities store heat and release it later.')); assert.ok(g.text().includes('Cities don’t only get hot.'), 'the reveal works without animation');
  assert.ok(g.nodes().some(n => n.props?.className === 'city-heat' && n.props['data-reduced'] === true) || g.nodes().some(n => String(n.props?.className || '').startsWith('city-heat')), 'root marks reduced motion');
}
console.log('City Heat UI PASS: inline public registry record and assets, no storage/network/intervals, real playback with beat holds, pause/resume/hidden-tab, slider, guess and reveal, three-day replay, weather/levers/chart tabs, quiz, public-only analytics identifiers and reduced-motion stepping.');
