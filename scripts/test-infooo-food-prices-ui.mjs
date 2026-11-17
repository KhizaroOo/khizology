// UI checks for Infooo World 016 "Why Food Prices Rise".
// Runs the real component, hooks and playback with deterministic React, timer and frame adapters. Run: node scripts/test-infooo-food-prices-ui.mjs
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
const world = registry.exports.infoooWorlds.find(w => w.id === 'world-016');
assert.ok(world, 'world-016 must be in the registry');
assert.equal(world.slug, 'why-food-prices-rise'); assert.equal(world.status, 'published'); assert.equal(world.visibility, 'public');
assert.equal(world.worldNumber, 16); assert.equal(world.category, 'world-infrastructure');
assert.ok(registry.exports.infoooCategories.some(c => c.id === world.category));
assert.equal(new Set(registry.exports.infoooWorlds.map(w => w.slug)).size, registry.exports.infoooWorlds.length, 'slugs stay unique');
for (const id of world.relatedWorlds) assert.ok(registry.exports.infoooWorlds.some(w => w.id === id && w.status === 'published'), `related ${id} must be a public world`);
assert.ok(!registry.exports.infoooWorlds.some(w => w.worldNumber > 17 || /^world-0(1[89]|2\d)$/.test(w.id)), 'planned worlds 018-027 must not exist yet');
for (const k of ['fact', 'model', 'simulation', 'limitations', 'educationalContext', 'lastReviewed']) assert.ok(world.knowledge[k], `knowledge.${k}`);
assert.equal(world.knowledge.sources.length, 6);
for (const s of world.knowledge.sources) { assert.ok(s.label && /^https:\/\//.test(s.url), s.url); }
assert.equal(new Set(world.knowledge.sources.map(s => s.url)).size, 6, 'sources are unique');
for (const asset of [world.hero.asset, world.preview.asset]) assert.ok(fs.existsSync(path.join('public', asset)), `${asset} must exist`);
const png = fs.readFileSync(path.join('public', world.hero.asset)); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
assert.ok(world.preview.alt.length > 30);
assert.ok(fs.existsSync('src/pages/infooo/why-food-prices-rise.astro'));

// ---- source hygiene: browser-only, no storage, no network, no timers that outlive the page ----
const dir = 'src/components/infooo/food-prices', sources = fs.readdirSync(dir).filter(f => /\.(tsx?|css)$/.test(f)).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
for (const [file, text] of sources) { assert.ok(!/\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|sendBeacon|setInterval)\b/.test(text), `${file}: no storage, network or intervals`); assert.ok(!/from 'three'|from 'd3|from 'recharts|from 'chart/.test(text), `${file}: no chart or 3D dependency`); }
assert.ok(!/\bimport\b[^;]*\binfoooWorlds\b/.test(fs.readFileSync(`${dir}/FoodPricesWorld.tsx`, 'utf8')), 'the client must not import the full registry');

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
        if (id.includes('utils/analytics')) return Object.fromEntries(['trackInfoooWorldStart', 'trackInfoooGuideComplete', 'trackInfoooEntityView'].map(name => [name, (...args) => { if (name !== 'trackInfoooWorldStart' || !events.some(event => event[0] === name && event[1] === args[0])) events.push([name, ...args]); }]));
        const base = path.resolve(path.dirname(file), id); return load([base, `${base}.ts`, `${base}.tsx`].find(name => fs.existsSync(name) && fs.statSync(name).isFile()));
      },
    });
    vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    modules.set(file, context.exports); return context.exports;
  }
  const component = load(path.resolve('src/components/infooo/food-prices/FoodPricesWorld.tsx')).default;
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
// ---- the real model, story and view modules, for expected values ----
const tsCache = new Map();
function loadTs(file) {
  if (tsCache.has(file)) return tsCache.get(file);
  const context = vm.createContext({ exports: {}, Math, Number, Object, Array, String, JSON, Infinity, NaN, isNaN, Set, Map, Error, require: id => { const base = path.resolve(path.dirname(file), id); return loadTs([base, `${base}.ts`].find(n => fs.existsSync(n) && fs.statSync(n).isFile())); } });
  vm.runInContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  tsCache.set(file, context.exports); return context.exports;
}
const D = 'src/components/infooo/food-prices';
const model = loadTs(path.resolve(`${D}/foodModel.ts`)), story = loadTs(path.resolve(`${D}/foodStory.ts`)), views = loadTs(path.resolve(`${D}/foodViews.ts`));
const { fx, signed, money } = story;
const byId = (f, id) => f.nodes().find(n => n.props?.id === id);
const idText = (f, id) => { const n = byId(f, id); assert.ok(n, `missing #${id}`); return f.label(n); };
const selects = f => f.nodes().filter(n => n.type === 'select');   // [cost, first food, second food]
const pct = f => Number(f.slider().props.value);
const slider = f => f.nodes().find(n => n.type === 'input' && n.props.type === 'range');
const ahaHidden = f => byId(f, 'fp-aha').props.hidden;

// ---- standard motion ----
{
  const f = fixture(false);
  assert.ok(f.find('button', '▶ Play the shock'), 'primary action is "Play the shock"');
  assert.equal(slider(f).props.min, 0); assert.equal(slider(f).props.max, 100); assert.equal(pct(f), 0);
  assert.equal(ahaHidden(f), true, 'the reveal stays hidden at the start');
  assert.ok(f.text().includes('Start.') && f.text().includes('Nothing has changed yet.'), 'opening caption'); assert.ok(!bad(f.text()), 'no broken numbers at the start');
  assert.equal(f.events.length, 0, 'rendering emits no analytics');
  assert.equal(idText(f, 'fp-pr-A'), '$1.00'); assert.equal(idText(f, 'fp-pr-B'), '$1.00'); assert.equal(idText(f, 'fp-ch-A'), '0.0%');
  assert.deepEqual(selects(f).map(s => s.props.value), ['farm', 'Xf1102', 'Xf1110'], 'cost, then bakery and eggs');

  f.click('▶ Play the shock');
  assert.deepEqual(f.events[0], ['trackInfoooWorldStart', 'why-food-prices-rise'], 'starting emits one public world-start event');
  assert.ok(f.find('button', '⏸ Pause'), 'label becomes Pause while running');
  const seen = [];
  for (let i = 0; i < 600 && !f.find('button', '↻ Replay'); i++) { f.advance(32); seen.push(pct(f)); }
  assert.ok(f.find('button', '↻ Replay'), 'the run finishes and offers Replay'); assert.equal(pct(f), 50);
  assert.ok(seen.every((v, i) => i === 0 || v >= seen[i - 1]), 'the shock never shrinks while playing');
  const seconds = seen.length * 32 / 1000; assert.ok(seconds > 3 && seconds < 6, `the demo run takes a few seconds (${seconds.toFixed(1)} s)`);
  assert.equal(ahaHidden(f), false, 'the reveal appears'); assert.ok(f.text().includes('A cost shock only matters as much as the slice it hits.'));
  assert.equal(idText(f, 'fp-ch-A'), `${signed(model.effect('Xf1102', 'farm', 50))}%`); assert.equal(idText(f, 'fp-ch-B'), `${signed(model.effect('Xf1110', 'farm', 50))}%`);
  assert.equal(idText(f, 'fp-ch-A'), '+2.4%'); assert.equal(idText(f, 'fp-ch-B'), '+34.6%'); assert.equal(idText(f, 'fp-pr-A'), '$1.02'); assert.equal(idText(f, 'fp-pr-B'), '$1.35');
  assert.ok(f.text().includes('Same shock, 14× difference: Fresh eggs +34.6%, Bakery products +2.4%.'), 'the lead line is computed from the run');
  assert.ok(f.text().includes('Ceiling, not a forecast.'), 'the caption always says it is a ceiling');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooGuideComplete').length, 1); assert.deepEqual(f.events.find(e => e[0] === 'trackInfoooGuideComplete').slice(1), ['why-food-prices-rise', 'shock-run'], 'reaching the reveal completes the guide once');
  assert.equal(f.frames(), 0, 'no frame callback is left running after the run ends');
  f.click('↻ Replay'); assert.ok(f.find('button', '⏸ Pause')); f.advance(400); assert.ok(pct(f) > 0 && pct(f) < 15, 'Replay restarts from zero');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooWorldStart').length, 1, 'world start is reported once');
  f.click('⏸ Pause'); const frozen = pct(f); f.advance(1500); assert.equal(pct(f), frozen, 'Pause freezes the shock'); assert.ok(f.find('button', '▶ Resume')); assert.equal(f.frames(), 0);
  f.click('▶ Resume'); f.setHidden(true); f.listener('visibilitychange')(); f.render(); assert.ok(f.find('button', '▶ Resume'), 'a hidden tab pauses playback'); f.setHidden(false);
  slider(f).props.onChange({ target: { value: '70' } }); f.render(); assert.equal(pct(f), 70, 'dragging the slider sets the size'); assert.ok(f.find('button', '↻ Replay'), 'and shows Replay past the demo size');
  assert.equal(slider(f).props['aria-valuetext'], 'Farm gate up 70 percent', 'the slider announces its value in words');
  assert.equal(idText(f, 'fp-ch-B'), `${signed(model.effect('Xf1110', 'farm', 70))}%`);
  assert.ok(!bad(f.text()), 'no broken numbers after a full run');
  assert.ok(f.nodes().some(n => n.type === 'p' && n.props['aria-live'] === 'polite' && String(n.props.className) === 'fp-sr' && f.label(n).includes('Farm gate')), 'the spoken update appears on commit');
}

// ---- guess, reveal ----
{
  const f = fixture(false);
  f.click('Fresh eggs'); assert.equal(f.find('button', 'Fresh eggs').props['aria-pressed'], true); assert.equal(f.find('button', 'Bakery products').props['aria-pressed'], false);
  f.click('Fresh eggs'); assert.equal(f.find('button', 'Fresh eggs').props['aria-pressed'], false, 'a guess can be taken back');
  f.click('Fresh eggs'); assert.ok(f.text().includes('Locked in for the reveal'));
  f.click('▶ Play the shock'); for (let i = 0; i < 600 && !f.find('button', '↻ Replay'); i++) f.advance(32);
  assert.ok(f.text().includes('You guessed fresh eggs. Right: with a 50% jump in farm prices, fresh eggs rise up to +34.6% and bakery products up to +2.4%.'), 'the verdict is computed from the model');
  assert.ok(f.text().includes('Locked in: “Fresh eggs”'));
  assert.ok(f.nodes().filter(n => n.type === 'button' && n.props.className === 'fp-chip' && ['Bakery products', 'Fresh eggs', 'About the same'].includes(f.label(n))).every(n => n.props.disabled), 'guess chips lock after the reveal');
  const w = fixture(false); w.click('Bakery products'); slider(w).props.onChange({ target: { value: '60' } }); w.render(); assert.ok(w.text().includes('You guessed bakery products. Not quite:'), 'a wrong guess is told honestly');
  const g = fixture(false); slider(g).props.onChange({ target: { value: '10' } }); g.render();
  assert.equal(g.nodes().find(n => n.props?.className === 'fp-guess').props.hidden, true, 'moving the slider before guessing hides the dead chips');
  const h = fixture(false); h.click('Fresh eggs'); slider(h).props.onChange({ target: { value: '10' } }); h.render(); assert.equal(h.nodes().find(n => n.props?.className === 'fp-guess').props.hidden, false, 'a made guess stays visible until the reveal');
}

// ---- costs, foods, table, stories, pairs ----
{
  const f = fixture(false);
  selects(f)[0].props.onChange({ target: { value: 'wages' } }); f.render();
  assert.equal(pct(f), 10, 'choosing a cost from zero sets a visible +10%'); assert.equal(idText(f, 'fp-ch-A'), '+5.6%'); assert.equal(idText(f, 'fp-ch-B'), '+4.3%', 'the wage shock flips the order: bakery above eggs');
  assert.ok(f.nodes().some(n => String(n.props?.className).includes('fp-cap') && String(n.props.className).includes('fp-seg')), 'wages draw an extra block on top'); assert.ok(f.text().includes('Wages in every link +10%.'));
  assert.ok(f.nodes().filter(n => String(n.props?.className).startsWith('fp-seg') && String(n.props.className).includes('fp-hit')).length === 0, 'no slice is marked as hit by a wage rise');
  selects(f)[0].props.onChange({ target: { value: 'farm' } }); f.render(); assert.ok(!f.nodes().some(n => String(n.props?.className).includes('fp-cap') && String(n.props.className).includes('fp-seg')), 'a farm shock shows no wage block');
  assert.equal(f.nodes().filter(n => String(n.props?.className || '').includes('fp-hit')).length, 2, 'the farm slice is marked as hit in both bars');
  selects(f)[1].props.onChange({ target: { value: 'Xf1103' } }); f.render(); assert.equal(selects(f)[1].props.value, 'Xf1103'); assert.equal(idText(f, 'fp-ch-A'), `${signed(model.effect('Xf1103', 'farm', 10))}%`, 'choosing a food updates the numbers');
  f.click('Retail'); assert.equal(f.find('button', 'Retail').props['aria-pressed'], true); assert.equal(selects(f)[0].props.value, 'retail', 'a table row puts that cost on the stack');
  assert.ok(f.nodes().some(n => n.props?.className === 'fp-best'), 'the largest cost per food is flagged'); assert.ok(f.text().includes('(largest)'));
  f.click('Fuel spike: energy +50%'); assert.equal(pct(f), 50); assert.equal(selects(f)[0].props.value, 'energy'); assert.equal(f.find('button', 'Fuel spike: energy +50%').props['aria-pressed'], true); assert.equal(ahaHidden(f), false, 'a story that reaches 40% reveals the aha');
  assert.ok(!f.events.some(e => e[0] === 'trackInfoooGuideComplete'), 'a preset may show the reveal without completing guided playback');
  f.click('Beef vs soft drinks'); assert.deepEqual([selects(f)[1].props.value, selects(f)[2].props.value], ['Xf1103', 'Xf1128']); assert.ok(f.nodes().some(n => n.type === 'th' && f.label(n) === 'Soft drinks & water'), 'table headers follow the foods');
  f.click('Wage rise: +10% in every link'); assert.equal(selects(f)[0].props.value, 'wages');
  f.click('Same foods, new shock: wages +10%'); assert.equal(pct(f), 10);
  const ids = f.events.filter(e => e[0] === 'trackInfoooEntityView').map(e => e[2]);
  for (const id of ['cost-wages', 'cost-farm', 'food-xf1103', 'cost-retail', 'story-fuel-spike', 'pair-beef-soft-drinks', 'story-wage-rise']) assert.ok(ids.includes(id), id);
  assert.ok(f.events.every(e => e.slice(1).every(v => /^[a-z0-9-]+$/.test(v))), 'analytics carries only public world and control identifiers');
  assert.equal(f.events.filter(e => e[0] === 'trackInfoooWorldStart').length, 1, 'the first interaction is the world start');
}

// ---- every number on screen equals the model, across many states ----
{
  const f = fixture(false); let n = 0;
  const foods = model.FOODS.map(x => x.id), costs = model.COSTS.map(c => c.id);
  for (let i = 0; i < 60; i++) {
    const A = foods[(i * 7) % foods.length], B = foods[(i * 11 + 3) % foods.length], C = costs[i % costs.length], P = (i * 17) % 101;
    selects(f)[1].props.onChange({ target: { value: A } }); selects(f)[2].props.onChange({ target: { value: B } }); selects(f)[0].props.onChange({ target: { value: C } }); slider(f).props.onChange({ target: { value: String(P) } }); f.render();
    const eff = id => model.effect(id, C, P);
    assert.equal(idText(f, 'fp-ch-A'), `${signed(eff(A))}%`, `${A} ${C} ${P}`); assert.equal(idText(f, 'fp-ch-B'), `${signed(eff(B))}%`); assert.equal(idText(f, 'fp-pr-A'), money(100 + eff(A))); assert.equal(idText(f, 'fp-pr-B'), money(100 + eff(B)));
    const hh = views.householdRows(C, P).rows; assert.ok(f.text().includes(views.householdText(hh[0])) && f.text().includes(views.householdText(hh[2])), 'household panel text'); assert.ok(!bad(f.text()), `${A} ${C} ${P}`); n++;
  }
  assert.equal(n, 60);
  const t0 = fixture(false); const bars = () => t0.nodes().filter(x => String(x.props?.className || '').startsWith('fp-seg') && x.props.style).map(x => parseFloat(x.props.style.height));
  const farmBar = bars()[0]; assert.ok(Math.abs(farmBar - model.food('Xf1102').farmShare / model.DOMAIN * 100) < 1e-9, 'bar heights follow the fixed scale');
}

// ---- household panel ----
{
  const f = fixture(false);
  assert.ok(f.text().includes('33.0% of before-tax income now') && !f.text().includes('→ 3'), 'baseline only at zero'); assert.ok(f.text().includes('Move the slider or press'));
  slider(f).props.onChange({ target: { value: '50' } }); f.render();
  const r = views.householdRows('farm', 50); assert.ok(f.text().includes('Upper bound') && f.text().includes(`${signed(r.basket)}%`));
  assert.ok(f.text().includes(`33.0% → ${fx(33.0 + r.rows[0].hitPoints, 1)}% of before-tax income`), 'before and after share');
  assert.ok(f.nodes().filter(n => n.props?.role === 'img' && String(n.props['aria-label']).includes('percent of income')).length === 3, 'three labelled bars');
}

// ---- quiz ----
{
  const f = fixture(false);
  const checks = () => f.nodes().filter(n => n.type === 'button' && f.label(n) === 'Check answer');
  const radio = (q, v) => f.nodes().find(n => n.type === 'input' && n.props.type === 'radio' && n.props.name === `fp-q${q}` && n.props.value === v);
  checks()[1].props.onClick(); f.render(); assert.ok(f.text().includes('Pick an answer first.'));
  radio(1, 0).props.onChange(); f.render(); checks()[1].props.onClick(); f.render(); assert.ok(f.text().includes('Not quite.') && f.text().includes('The answer: “Fresh eggs”.') && f.text().includes('up to +34.6%'), 'a wrong answer names the right one with model numbers');
  radio(1, 1).props.onChange(); f.render(); assert.ok(f.text().includes('Yes.'), 'the verdict follows the selected answer');
  radio(0, 1).props.onChange(); f.render(); checks()[0].props.onClick(); f.render(); assert.ok(f.text().includes('18.5¢ in 2024'));
  radio(2, 0).props.onChange(); f.render(); checks()[2].props.onClick(); f.render(); assert.ok(f.text().includes('+3.3 points of income') && !bad(f.text()));
}

// ---- the truth panel ----
{
  const f = fixture(false), t = f.text();
  for (const s of ['FACT', 'MODEL', 'SIMULATION', 'Limits', 'Sources', 'Demand is not modelled.', 'A ceiling, not a prediction.', 'Reality check.']) assert.ok(t.includes(s), s);
  for (const s of ['69.1¢ for fresh eggs', '18.5¢ of each dollar spent on food at home', '7.1¢ of each dollar spent on food away from home', '11.8¢ across all domestically produced food', '47.2¢ of the average grocery dollar', '$5,498', '33.0%', '$9,097', '12.2%', '$16,989', '6.4%', 'about 1.2%']) assert.ok(t.includes(s), s);
  assert.equal(f.nodes().filter(n => n.type === 'li' && String(n.props.id || '').startsWith('fp-s')).length, 6, 'every registry source is listed');
  assert.equal(f.nodes().filter(n => n.type === 'tr').length > 40, true, 'the all-foods table is present');
}

// ---- reduced motion: no animation, instant ----
{
  const f = fixture(true);
  assert.ok(f.find('button', '▶ Play the shock'));
  f.nodes().find(n => n.type === 'button' && n.props.id === 'fp-run').props.onClick(); f.render();
  assert.equal(pct(f), 50, 'Play jumps straight to the demo size'); assert.equal(ahaHidden(f), false, 'the reveal works without animation'); assert.ok(f.find('button', '↻ Start again'));
  assert.equal(f.frames(), 0, 'no animation frames are ever requested'); f.advance(2000); assert.equal(pct(f), 50, 'nothing moves on its own');
  f.click('↻ Start again'); assert.equal(pct(f), 0); assert.equal(f.frames(), 0);
  assert.ok(f.nodes().some(n => n.props?.['data-reduced'] === true && String(n.props.className).startsWith('food-prices')), 'root marks reduced motion');
}
console.log('Food Prices UI PASS: inline public registry record and assets, no storage/network/intervals, run, pause, resume, hidden tab, slider, guess and reveal, wage flip, cost table, stories, pairs, every displayed number against the model, household panel, quiz, truth panel, public-only analytics identifiers and reduced motion.');
