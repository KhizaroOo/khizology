// Isolated fake DOM and mocked Google queue: no Google script is fetched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const source = fs.readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8');
function fixture(id = 'G-TESTONLY00', saved = null, brokenStorage = false) {
  const scripts = [], docListeners = {}, toolListeners = {};
  let reloads = 0;
  class Element { closest() { return this; } }
  const tool = { dataset: { toolSlug: 'schema-drift-doctor', toolFamily: 'check', featureLevel: '2' }, addEventListener: (name, fn) => toolListeners[name] = fn };
  const doc = { title: 'Public tool title', cookie: '_ga=abc', querySelector: selector => selector.includes('canonical') ? { href: 'https://khizooology.com/toolbox/schema-drift-doctor' } : tool,
    querySelectorAll: () => [{ dataset: { artworkSlug: 'public-art' } }], createElement: () => ({ remove() {} }), head: { appendChild: s => scripts.push(s) },
    getElementById: () => scripts[0], addEventListener: (name, fn) => docListeners[name] = fn, dispatchEvent() {} };
  const win = { location: { href: 'https://khizooology.com/?private=NEVER_SEND', reload: () => reloads++ }, addEventListener() {} };
  const context = vm.createContext({ window: win, document: doc, Element, URL, Event, localStorage: { getItem: () => { if (brokenStorage) throw Error(); return saved; }, setItem: (_, v) => { if (brokenStorage) throw Error(); saved = v; } } });
  vm.runInContext(stripTypeScriptTypes(source.replace('import.meta.env.PUBLIC_GA_MEASUREMENT_ID', JSON.stringify(id))).replace(/export /g, ''), context);
  const run = code => vm.runInContext(code, context);
  const events = () => (win.dataLayer || []).map(args => Array.from(args)).filter(args => args[0] === 'event');
  return { run, scripts, win, docListeners, toolListeners, Element, events, reloads: () => reloads };
}
for (const saved of [null, 'declined']) {
  const f = fixture('G-TESTONLY00', saved); f.run('initializeAnalytics(); trackToolStart(); trackArtworkView("public-art"); trackToolExport("json")');
  assert.equal(f.scripts.length, 0); assert.equal(f.events().length, 0);
}
const missing = fixture('', 'accepted'); missing.run('initializeAnalytics(); trackToolStart()'); assert.equal(missing.scripts.length, 0);
const f = fixture(); f.run('initializeAnalytics(); setConsent("accepted"); loadAnalytics()'); assert.equal(f.scripts.length, 1);
const commands = Array.from(f.win.dataLayer, args => Array.from(args));
const config = commands.find(args => args[0] === 'config')[2];
assert.equal(config.send_page_view, false);
assert.equal(config.allow_google_signals, false);
assert.equal(config.allow_ad_personalization_signals, false);
for (const command of commands.filter(args => args[0] === 'consent')) {
  for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(command[2][key], 'denied');
}
assert.equal(f.events().filter(e => e[1] === 'page_view').length, 1);
f.toolListeners.input({ isTrusted: false, target: new f.Element() }); assert.equal(f.events().length, 1);
f.toolListeners.input({ isTrusted: true, target: new f.Element() });
f.toolListeners.change({ isTrusted: true, target: new f.Element() });
assert.equal(f.events().filter(e => e[1] === 'tool_start').length, 1);
f.run('trackArtworkView("public-art"); trackArtworkView("NEVER_SEND"); trackToolExport("json"); trackToolExport("NEVER_SEND")');
const contact = new f.Element(); contact.href = 'https://www.linkedin.com/in/private-person';
f.docListeners.click({ isTrusted: true, target: contact });
assert.deepEqual(Array.from(f.events(), e => e[1]), ['page_view', 'tool_start', 'artwork_view', 'tool_export', 'contact_click']);
const payload = JSON.stringify(f.events()); assert.ok(!/NEVER_SEND|private-person|private=/.test(payload));
for (const event of f.events()) {
  assert.equal(event[2].page_referrer, '');
  assert.equal(event[2].page_location, 'https://khizooology.com/toolbox/schema-drift-doctor');
  assert.ok(Object.keys(event[2]).every(key => ['page_location', 'page_referrer', 'page_title', 'tool_slug', 'tool_family', 'feature_level', 'artwork_slug', 'export_type', 'contact_type'].includes(key)));
}
f.run('setConsent("declined"); trackToolExport("json")'); assert.equal(f.win['ga-disable-G-TESTONLY00'], true); assert.equal(f.events().length, 0); assert.equal(f.reloads(), 1);
const failed = fixture('G-TESTONLY00', 'accepted'); failed.run('initializeAnalytics()'); failed.scripts[0].onerror(); failed.run('trackToolExport("png")'); assert.equal(failed.events().length, 0);
const storage = fixture('G-TESTONLY00', null, true); storage.run('initializeAnalytics(); setConsent("accepted"); setConsent("declined")'); assert.equal(storage.reloads(), 1);
console.log('PASS: unknown, declined, accepted, missing ID, single load/start, five safe events, withdrawal, blocked script, unavailable storage. Mock transport only; real GA validation awaits configuration.');
