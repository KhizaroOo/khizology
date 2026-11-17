// UI checks for Infooo World 017 "How Misinformation Spreads".
// Runs the real component and its playback with deterministic React and timer adapters. Run: node scripts/test-infooo-misinformation-ui.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const strip = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;

// ---- the real registry record ----
const registry = { exports: {} };
vm.runInNewContext(strip('src/data/infooo.ts'), { exports: registry.exports, require: id => {
  if (id.endsWith('valueLaws')) return { createIdeaEvaluation: value => value };
  if (id.endsWith('gridTrends')) return { gridSources: [] };
  if (id.endsWith('humanAtlasLearning')) return { followTheBloodGuide: {}, humanAtlasEntities: [], humanAtlasRelationships: [] };
  if (id.endsWith('deploymentJourney')) return { deploymentStages: [], deploymentGuide: {} };
  throw Error(`Unexpected registry dependency: ${id}`);
} });
const worlds = registry.exports.infoooWorlds, world = worlds.find(w => w.id === 'world-017');
assert.ok(world, 'world-017 must be in the registry');
assert.equal(world.slug, 'how-misinformation-spreads'); assert.equal(world.status, 'published'); assert.equal(world.visibility, 'public');
assert.equal(world.worldNumber, 17); assert.equal(world.category, 'web-information');
assert.ok(registry.exports.infoooCategories.some(c => c.id === world.category));
assert.equal(new Set(worlds.map(w => w.slug)).size, worlds.length, 'slugs stay unique');
assert.ok(!worlds.some(w => w.worldNumber > 17 || /^world-0(1[89]|2\d)$/.test(w.id)), 'planned worlds 018-027 must not exist yet');
assert.ok(world.description.length >= 110 && world.description.length <= 155, `description length ${world.description.length}`);
for (const k of ['fact', 'model', 'simulation', 'limitations', 'educationalContext', 'lastReviewed']) assert.ok(world.knowledge[k], `knowledge.${k}`);
assert.equal(world.knowledge.sources.length, 6);
for (const s of world.knowledge.sources) assert.ok(s.label && /^https:\/\//.test(s.url), s.url);
assert.equal(new Set(world.knowledge.sources.map(s => s.url)).size, 6, 'sources are unique');
for (const asset of [world.hero.asset, world.preview.asset]) assert.ok(fs.existsSync(path.join('public', asset)), `${asset} must exist`);
const png = fs.readFileSync(path.join('public', world.hero.asset)); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
assert.ok(!png.includes(Buffer.from('c2pa')), 'social image carries no C2PA metadata');
const page = fs.readFileSync('src/pages/infooo/how-misinformation-spreads.astro', 'utf8');
const title = page.match(/title="([^"]+)"/)[1]; assert.ok(title.length <= 60, `title ${title.length} chars`);
assert.ok(/world-017/.test(page) && /<h2>/.test(page), 'page reads the registry and has static text');

// ---- source hygiene ----
const dir = 'src/components/infooo/misinformation', files = fs.readdirSync(dir).filter(f => /\.(tsx?|css)$/.test(f)).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
for (const [file, text] of files) {
  assert.ok(!/\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|sendBeacon|setInterval)\b/.test(text), `${file}: no storage, network or intervals`);
  assert.ok(!/from 'three'|from 'd3|from 'recharts|from 'chart/.test(text), `${file}: no chart or 3D dependency`);
}
assert.ok(!/\bimport\b[^;]*\binfoooWorlds\b/.test(fs.readFileSync(`${dir}/MisinformationWorld.tsx`, 'utf8')), 'the client must not import the full registry');

// ---- deterministic React + timer adapters ----
function fixture(reduced) {
  const values = [], modules = new Map(), events = [], timers = new Map();
  let cursor = 0, dirty = false, pending = [], nextTimer = 0, ui;
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], next => { const v = typeof next === 'function' ? next(values[i]) : next; if (!Object.is(v, values[i])) dirty = true; values[i] = v; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useEffect(cb, deps) { const i = cursor++, prev = values[i]; if (!prev || !deps || deps.some((d, n) => !Object.is(d, prev.deps[n]))) pending.push(() => { prev?.cleanup?.(); values[i] = { deps, cleanup: cb() }; }); },
  };
  const win = { setTimeout: (cb, ms) => { assert.equal(ms, 600); timers.set(++nextTimer, cb); return nextTimer; }, clearTimeout: id => timers.delete(id), innerWidth: 1280, innerHeight: 800 };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const ctx = vm.createContext({ exports: {}, window: win, Math, Number, Object, Array, String, JSON, Set, Map, Error, Uint8Array, Int8Array, Int16Array, Infinity, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (id.endsWith('.css')) return {};
      if (id.includes('InfoooWorldFoundation')) return { useInfoooReducedMotion: () => reduced, InfoooWorldShell: p => jsx('section', { children: [p.stage, p.footer] }) };
      if (id.includes('utils/analytics')) return Object.fromEntries(['trackInfoooWorldStart', 'trackInfoooGuideComplete', 'trackInfoooEntityView'].map(n => [n, (...a) => events.push([n, ...a])]));
      const base = path.resolve(path.dirname(file), id);
      return load([base, base + '.ts', base + '.tsx'].find(f => fs.existsSync(f)));
    } });
    ctx.module = { exports: ctx.exports };
    vm.runInContext(strip(file), ctx);
    modules.set(file, ctx.exports); return ctx.exports;
  }
  const Component = load(path.resolve(`${dir}/MisinformationWorld.tsx`)).default;
  const flatten = node => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (!node || typeof node !== 'object') return [];
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    const kids = [node.props?.children].flat(Infinity);
    const keyed = kids.filter(k => k && typeof k === 'object' && k.key != null).map(k => k.key);
    assert.equal(new Set(keyed).size, keyed.length, `duplicate React keys under ${node.type}`);
    return [node, ...kids.flatMap(flatten)];
  };
  const render = () => { let n = 0; do { dirty = false; cursor = 0; pending = []; ui = flatten(jsx(Component, { world, children: null })); const p = pending; p.forEach(cb => cb()); assert.ok(++n < 50, 'render loop'); } while (dirty); return ui; };
  const text = node => [node?.props?.children].flat(Infinity).map(c => typeof c === 'string' || typeof c === 'number' ? String(c) : c && typeof c === 'object' ? text(c) : '').join('');
  const find = (pred, msg) => { const n = ui.find(pred); assert.ok(n, msg); return n; };
  const button = label => find(n => n.type === 'button' && text(n).includes(label), `button "${label}"`);
  const click = label => { button(label).props.onClick(); render(); };
  const flush = () => { let guard = 0; while (timers.size) { const [id, cb] = timers.entries().next().value; timers.delete(id); cb(); render(); assert.ok(++guard < 40, 'playback ends'); } };
  const byClass = c => ui.filter(n => typeof n.props?.className === 'string' && n.props.className.split(' ').includes(c));
  render();
  return { ui: () => ui, render, click, flush, text, find, button, byClass, events, timers };
}

// ---- the model, loaded the same way, for expected numbers ----
const ctxM = { exports: {}, Math, Uint8Array, Int8Array, Int16Array, require: () => ({}) };
const loadTs = (file, req) => { const c = vm.createContext({ exports: {}, Math, Number, Object, Array, String, JSON, Set, Map, Uint8Array, Int8Array, Int16Array, require: req }); vm.runInContext(strip(file), c); return c.exports; };
const M = loadTs(`${dir}/misinfoModel.ts`, () => ({}));
const Story = loadTs(`${dir}/misinfoStory.ts`, id => id.includes('misinfoModel') ? M : {});
const heard = (r, h) => 120 - r.counts[h][0] - r.counts[h][3];
const rep2 = r => Array.from(r.recvC).filter(x => x >= 2).length;
const q = Story.story(M.QUIET), h = Story.story(M.BUSY_HUB), late = Story.story(M.BUSY_HUB, 'late');
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };

const C = loadTs(`${dir}/misinfoCases.ts`, id => id.includes('misinfoModel') ? M : id.includes('misinfoStory') ? Story : {});

// ---- the optional challenge: first view ----
let f = fixture(false);
const cResult = () => f.text(f.find(n => typeof n.props?.className === 'string' && n.props.className.includes('mc-result'), 'challenge result'));
const cH2 = () => f.text(f.find(n => n.type === 'h2' && n.props.tabIndex === -1, 'question'));
const cCount = () => f.text(f.find(n => n.props?.className === 'mi-count', 'count'));
const hl = () => f.byClass('mi-hl').length;
const optBtn = label => f.find(n => n.type === 'button' && n.props['aria-pressed'] !== undefined && f.text(n).startsWith(label), `option "${label}"`);
const runs = C.runsFor();
const svgText = () => f.text(f.find(n => n.type === 'svg', 'map'));
const stepNow = () => f.text(f.find(n => n.type === 'li' && n.props['aria-current'] === 'step', 'current step'));
const opt = label => f.find(n => n.type === 'button' && n.props['aria-pressed'] !== undefined && f.text(n).includes(label), `option "${label}"`);
const chooseOpt = label => { opt(label).props.onClick(); f.render(); };
const disabledBtns = () => f.ui().filter(n => n.type === 'button' && n.props.disabled === true).length;
const cardText = () => f.text(f.find(n => n.props?.className?.startsWith('mi-card mc-card'), 'challenge card'));

// opening: one clear action
ok(cH2() === 'A rumor starts with one person' && stepNow().includes('Watch'), `opening: ${cH2()}`);
ok(!f.ui().some(n => n.type === 'ol' && n.props.className === 'mi-rail'), 'the first view is the experiment, not the five-step story');
ok(f.ui().filter(n => n.type === 'circle' && /mi-p[nrf]/.test(n.props.className)).length === 120 && cCount().startsWith('0 '), 'opening scene: blank town, nobody has seen it');
ok(f.text(f.button('Watch the first share')).includes('Watch the first share') && f.text(f.button('Explore freely')).length > 0 && disabledBtns() === 0, 'one action (Watch the first share), Explore freely, nothing disabled');
ok(svgText().includes('Mia · 6 connections'), 'the map names Mia and her connection count');
ok(hl() === 0 && f.timers.size === 0, 'no bold lines and no timers before the visitor acts');
// first share, from the real trace
f.click('Watch the first share');
ok(f.events.some(e => e[0] === 'trackInfoooWorldStart') && f.events.some(e => e[0] === 'trackInfoooEntityView' && e[2] === 'challenge-start'), 'analytics: start only');
ok(cH2() === 'Mia posts it. 6 people see it right away.' && stepNow().includes('Choose') && cCount().startsWith('7 '), 'first share: Mia plus her 6 connections');
ok(hl() === M.TOWN.adj[M.QUIET].length && heard(runs.mia, 0) === 7, 'the 6 first-share lines are highlighted, from the model trace');
ok(/dot/.test(cardText()) && /line is a connection/.test(cardText()) && /bold lines/.test(cardText()), 'dot, line and bold lines are explained beside the first event');
ok(!/\bhub\b/i.test(cardText().replace(/Large dot[^.]*/, '')) && cardText().includes('Person with many connections'), 'no unexplained "hub"; the role is explained where it appears');
ok(f.ui().filter(n => n.type === 'button' && n.props['aria-pressed'] !== undefined).length === 3 && disabledBtns() === 0 && f.text(opt('Mia shares first')).includes('baseline'), 'three runnable options, the baseline labelled, nothing disabled');
// every option runs, including the first (baseline)
chooseOpt('Mia shares first');
ok(f.timers.size === 1 && cCount().startsWith(String(heard(runs.mia, 0))), 'baseline starts running (one timer)');
f.flush();
ok(cResult().includes('Baseline.') && cCount().startsWith(String(runs.mia.reached)) && !f.ui().some(n => n.props?.className === 'mc-compare'), 'baseline result: 7, no compare toggle until another option runs');
chooseOpt('Sam shares first'); ok(f.timers.size === 1, 'Sam starts running'); f.flush();
ok(cH2() === 'What happened' && cCount().startsWith(String(runs.sam.reached)) && hl() === M.TOWN.adj[M.BUSY_HUB].length, "Sam: 86 reached, Sam's 34 first-share lines highlighted");
ok(cResult().includes("Mia's post reached 6 people. Sam's reached 34") && cResult().includes(`Sam's reached ${runs.sam.reached}`) && cResult().includes('Across 100 runs'), 'comparison text is built from the runs, with the odds line');
f.find(n => n.type === 'button' && f.text(n).startsWith('Baseline'), 'compare: baseline').props.onClick(); f.render();
ok(cCount().startsWith(String(runs.mia.reached)) && hl() === M.TOWN.adj[M.QUIET].length, "compare toggle: Mia's run with its 6 lines");
f.find(n => n.type === 'button' && f.text(n).startsWith('Sam'), 'compare: Sam').props.onClick(); f.render();
ok(cCount().startsWith(String(runs.sam.reached)), 'compare toggle: back to Sam');
chooseOpt('Ana shares first'); f.flush();
ok(cCount().startsWith(String(runs.ana.reached)) && hl() === M.TOWN.adj[C.ANA].length && cResult().includes(`Ana's reached ${C.firstWave(runs.ana)}`), 'switching to Ana runs Ana (own result, own lines)');
chooseOpt('Sam shares first'); f.flush(); const samCount = cCount(), samResult = cResult();
chooseOpt('Sam shares first'); f.flush();
ok(cCount() === samCount && cResult() === samResult, 'rerunning the same option gives the identical result');
chooseOpt('Ana shares first'); ok(f.timers.size === 1, 'Ana running'); chooseOpt('Sam shares first');
ok(f.timers.size === 1, 'switching mid-run keeps a single timer'); f.flush(); ok(cCount().startsWith(String(runs.sam.reached)), 'switching mid-run lands on the new option');
ok(disabledBtns() === 0 && f.ui().filter(n => n.type === 'button' && n.props['aria-pressed'] === true && f.text(n).includes('shares first')).length === 1, 'nothing disabled; exactly one option selected');
ok(f.events.some(e => e[0] === 'trackInfoooGuideComplete' && e[2] === 'challenge'), 'analytics: experiment complete after the first comparison');
ok(f.events.every(e => !JSON.stringify(e).includes('Ana') && !JSON.stringify(e).includes('Sam')), 'analytics never carries the visitor\'s choice');
f.click('Start over');
ok(cH2() === 'A rumor starts with one person' && cCount().startsWith('0 '), 'Start over returns to the opening');
// leaving mid-run shows the finished run, nothing keeps playing
f.click('Watch the first share'); chooseOpt('Sam shares first');
ok(f.timers.size === 1, 'run started'); f.click('Explore freely');
ok(f.timers.size === 0, 'leaving mid-run stops the playback instead of letting a hidden timer play on');
ok(f.ui().some(n => n.type === 'ol' && n.props.className === 'mi-rail'), 'Explore freely opens the five-step story');
f.click('Try the challenge'); ok(cH2() === 'What happened' && cCount().startsWith(String(runs.sam.reached)), 'returning to the challenge keeps its state (the finished run)');

// ---- first view of the free story ----
f = fixture(false);
f.click('Explore freely');
const result = () => f.text(f.find(n => n.props?.className === 'mi-result', 'result'));
const count = () => f.text(f.find(n => n.props?.className === 'mi-count', 'count'));
const circles = cls => f.byClass(cls).filter(n => n.type === 'circle').length;
ok(f.ui().filter(n => n.type === 'circle' && /mi-p[nrf]/.test(n.props.className)).length === 120, '120 people on the map');
ok(circles('mi-pn') === 120 && f.byClass('mi-tr').length === 0, 'blank town before the first post');
ok(f.find(n => n.props?.className === 'mi-result').props.hidden === true, 'no result before acting');
ok(f.ui().filter(n => n.type === 'li' && n.props.children?.type === 'button').length === 5, 'five steps in the rail');
ok(!f.ui().some(n => n.type === 'button' && f.text(n).includes('Next step')) && !f.ui().some(n => n.type === 'button' && f.text(n).includes('Back')), 'no Next or Back before acting');
ok(f.ui().some(n => n.type === 'q' && f.text(n).includes('Old Mill Bridge')), 'rumor card shown');

// ---- step 1, animated ----
f.click('Post it');
ok(f.events.some(e => e[0] === 'trackInfoooWorldStart') && f.events.some(e => e[0] === 'trackInfoooEntityView' && e[2] === 'one-post'), 'analytics: start + step view');
ok(f.timers.size === 1 && f.button('Post it').props.disabled === true, 'playing: one timer, button disabled');
ok(count().startsWith(String(heard(q, 0))), 'hour 0 count');
f.flush();
ok(count().startsWith(String(q.reached)) && f.byClass('mi-tr').length === q.reached - 1, 'step 1 finished: count and trails match the model');
ok(result() === `Only ${q.reached} people heard it. It died out. Most posts do.`, `step 1 result: ${result()}`);
ok(f.byClass('mi-now').length === 0, 'no highlighted trail after playback');
// ---- step 2 ----
f.click('Next step');
ok(circles('mi-pn') === 120, 'step 2 starts blank');
f.click('Let the hub post it'); f.flush();
ok(count().startsWith(String(h.reached)) && circles('mi-pr') === h.counts[12][1], 'step 2 matches the model');
ok(result().startsWith(`${h.reached} of 120 heard it.`), 'step 2 result');
// ---- step 3 (instant) ----
f.click('Next step');
ok(count().startsWith(String(h.reached)) && f.byClass('mi-rep').length === 0, 'step 3 opens on the finished hub map');
f.click('Show who heard it twice');
ok(f.timers.size === 0 && f.byClass('mi-rep').length === rep2(h), 'rings mark everyone who heard it twice');
ok(result().startsWith(`${rep2(h)} people heard it twice or more.`), 'step 3 result');
ok(!f.ui().some(n => n.type === 'button' && f.text(n).includes('Show who heard it twice')), 'step 3 action hides once shown');
// ---- step 4 ----
f.click('Next step'); f.click('Post the truth'); f.flush();
ok(f.byClass('mi-tx').length === Array.from(late.fromX).filter(v => v >= 0).length, 'one blue trail per person the truth reached');
ok(result() === `The truth reached ${late.corrected + late.warned}. ${late.rumorNow} are left with only the rumor.`, `step 4 result: ${result()}`);
ok(count().includes(`${late.rumorNow} still have only the rumor`), 'only-rumor count next to the map');
ok(!f.events.some(e => e[0] === 'trackInfoooGuideComplete' && e[2] === 'story'), 'analytics: step four does not complete the story');
// ---- step 5 ----
f.click('Next step');
ok(f.ui().filter(n => n.type === 'fieldset').length === 3, 'three choices');
ok(!f.ui().some(n => n.type === 'button' && f.text(n).includes('Next step')), 'no Next on the last step');
let combos = 0;
for (const seed of ['quiet', 'hub']) for (const pause of ['no', 'yes']) for (const corr of ['none', 'late', 'early']) {
  const pick = (legend, label) => { const fs_ = f.find(n => n.type === 'fieldset' && f.text(n).startsWith(legend), legend); const b = [fs_.props.children].flat(Infinity).flatMap(x => x?.props?.children ? [x.props.children].flat(Infinity) : []).find(x => x?.type === 'button' && f.text(x) === label); b.props.onClick(); f.render(); };
  pick('Who posts first?', seed === 'hub' ? 'A busy hub' : 'A quiet person'); pick('People check before sharing?', pause === 'yes' ? 'Yes' : 'No'); pick('When does the truth come?', { none: 'Never', late: 'Late', early: 'Early' }[corr]);
  const r = Story.pickRun({ seed, pause, corr });
  assert.equal(f.timers.size, 0, 'choices apply instantly');
  assert.ok(result().startsWith(`${r.rumorNow} left with only the rumor (was ${late.rumorNow}).`), `${seed}/${pause}/${corr}: ${result()}`);
  assert.ok(count().startsWith(String(heard(r, 12))));
  combos++;
}
ok(combos === 12, 'all 12 step-5 combinations match the model');
ok(f.events.some(e => e[0] === 'trackInfoooGuideComplete' && e[2] === 'story'), 'analytics: the final experiment completes the story');
// ---- navigation ----
f.find(n => n.type === 'button' && f.text(n).includes('A hub') && n.props['aria-current'] !== 'step', 'rail step 2').props.onClick(); f.render();
ok(count().startsWith(String(h.reached)) && result().startsWith(`${h.reached} of 120`), 'rail jumps back to step 2 with its finished run');
f.click('Back');
ok(f.find(n => n.props?.className === 'mi-kicker').props.children.join('') === 'Step 1 of 5', 'Back goes to step 1');
ok(f.find(n => n.type === 'button' && f.text(n).includes('Your turn')).props.disabled === false, 'done steps stay reachable');

// ---- reduced motion: instant, never schedules a timer ----
f = fixture(true);
f.click('Explore freely');
f.click('Post it');
ok(f.timers.size === 0 && result().startsWith(`Only ${q.reached} people`), 'reduced motion: instant result, no timer');
f.click('Next step'); f.click('Let the hub post it');
ok(f.timers.size === 0 && count().startsWith(String(h.reached)), 'reduced motion: step 2 instant');

// ---- reduced motion in the challenge: instant, no timer ----
f = fixture(true);
f.click('Watch the first share'); chooseOpt('Sam shares first');
ok(f.timers.size === 0 && cResult().includes("Sam's reached 34") && cCount().startsWith(String(runs.sam.reached)), 'reduced motion: the result is instant, no timer');
chooseOpt('Mia shares first'); ok(f.timers.size === 0 && cResult().includes('Baseline.'), 'reduced motion: the baseline replays instantly too');

// ---- a fresh visitor cannot skip ahead ----
f = fixture(false);
f.click('Explore freely');
ok(f.find(n => n.type === 'button' && f.text(n).includes('Repeats')).props.disabled === true, 'later steps locked at first');
console.log(`World 017 UI: ${checks} checks passed`);
