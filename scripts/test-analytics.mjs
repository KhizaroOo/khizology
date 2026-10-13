// Isolated fake DOM and mocked Google queue: no Google script is fetched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8');
function fixture(id = 'G-TESTONLY00', saved = null, brokenStorage = false, href = 'https://khizooology.com/?private=NEVER_SEND') {
  const scripts = [], docListeners = {}, toolListeners = {};
  let reloads = 0;
  class Element { dataset = {}; closest(selector) { return selector.includes('.share-foundation') ? null : this; } }
  const tool = { dataset: { toolSlug: 'schema-drift-doctor', toolFamily: 'check', featureLevel: '2' }, addEventListener: (name, fn) => toolListeners[name] = fn };
  const doc = { title: 'Public tool title', cookie: '_ga=abc', querySelector: selector => selector.includes('canonical') ? { href: 'https://khizooology.com/toolbox/schema-drift-doctor' } : tool,
    querySelectorAll: () => [{ dataset: { artworkSlug: 'public-art' } }], createElement: () => ({ remove() {} }), head: { appendChild: s => scripts.push(s) },
    getElementById: () => scripts[0], addEventListener: (name, fn) => { const previous = docListeners[name]; docListeners[name] = event => { previous?.(event); fn(event); }; }, dispatchEvent() {} };
  const win = { location: { href, reload: () => reloads++ }, addEventListener() {} };
  const context = vm.createContext({ window: win, document: doc, Element, URL, Event, localStorage: { getItem: () => { if (brokenStorage) throw Error(); return saved; }, setItem: (_, v) => { if (brokenStorage) throw Error(); saved = v; } } });
  vm.runInContext(stripTypeScriptTypes(source.replace('import.meta.env.PUBLIC_GA_MEASUREMENT_ID', JSON.stringify(id))).replace(/export /g, ''), context);
  const run = code => vm.runInContext(code, context);
  const events = () => (win.dataLayer || []).map(args => Array.from(args)).filter(args => args[0] === 'event');
  return { run, scripts, win, docListeners, toolListeners, Element, events, reloads: () => reloads };
}
for (const saved of [null, 'declined']) {
  const f = fixture('G-TESTONLY00', saved); f.run('initializeAnalytics(); trackToolStart(); trackArtworkView("public-art"); trackToolExport("json"); trackToolExport("csv")');
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
  assert.ok(Object.keys(event[2]).every(key => ['page_location', 'page_referrer', 'page_title', 'tool_slug', 'tool_family', 'feature_level', 'artwork_slug', 'export_type', 'contact_type', 'source_slug', 'source_module'].includes(key)));
}
f.run('trackToolExport("csv")');
const csvEvent = f.events().at(-1);
assert.equal(csvEvent[1], 'tool_export');
assert.equal(csvEvent[2].export_type, 'csv');
assert.ok(Object.keys(csvEvent[2]).every(key => ['page_location','page_referrer','page_title','tool_slug','tool_family','feature_level','export_type'].includes(key)));
f.run('trackToolFavorite("capacity-cliff-simulator", true); trackToolScenarioSelect("capacity-cliff-simulator", "safer-plan"); trackToolNextMove("capacity-cliff-simulator", "queue-capacity-planner"); trackToolChainAction("tool_chain_next", "capacity-cliff-simulator", "capacity-planning", "queue-capacity-planner"); trackContractDriftRun(4, { likelyBreaking: 1, needsReview: 2, additive: 1 })');
const lv3Events = f.events().slice(-6);
assert.deepEqual(Array.from(lv3Events, event => event[1]), ['tool_favorite', 'tool_scenario_select', 'try_next_click', 'tool_chain_next', 'contract_drift_run', 'tool_complete']);
for (const event of lv3Events) assert.ok(Object.keys(event[2]).every(key => ['page_location', 'page_referrer', 'page_title', 'tool_id', 'scenario_id', 'target_tool_id', 'chain_id', 'change_count_bucket', 'likely_breaking_count', 'needs_review_count', 'additive_count', 'source_slug', 'source_module', 'destination_slug', 'destination_module', 'tool_slug', 'tool_family', 'feature_level', 'completion_type'].includes(key)));
assert.ok(!/NEVER_SEND|super-secret|api[_-]?key/i.test(JSON.stringify(lv3Events)), 'LV3 analytics must remain metadata-only');
f.run('setConsent("declined"); trackToolExport("json")'); assert.equal(f.win['ga-disable-G-TESTONLY00'], true); assert.equal(f.events().length, 0); assert.equal(f.reloads(), 1);
const failed = fixture('G-TESTONLY00', 'accepted'); failed.run('initializeAnalytics()'); failed.scripts[0].onerror(); failed.run('trackToolExport("png")'); assert.equal(failed.events().length, 0);
const storage = fixture('G-TESTONLY00', null, true); storage.run('initializeAnalytics(); setConsent("accepted"); setConsent("declined")'); assert.equal(storage.reloads(), 1);
for (const host of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']) {
  const local = fixture('G-TESTONLY00', 'accepted', false, `http://${host}:4321/`);
  local.run('initializeAnalytics(); trackToolResult(); trackToolExport("json")');
  assert.equal(local.scripts.length, 0); assert.equal(local.events().length, 0);
}
const growth = fixture('G-TESTONLY00', 'accepted');
growth.run('initializeAnalytics(); initializeAnalytics(); trackToolResult(); trackShareAction({ monster: "toolooo", content_type: "tool", slug: "schema-drift-doctor", action: "share_result", payload: "NEVER_SEND" }); trackShareAction({ monster: "toolooo", content_type: "tool", slug: "schema-drift-doctor", action: "copy_result" }); trackRelatedContentClick({ monster: "toolooo", content_type: "tool", slug: "api-payload-doctor", private_text: "NEVER_SEND" }); trackRelatedContentClick({ monster: "artooo", content_type: "artwork", slug: "public-art" }, "public-art");');
assert.deepEqual(Array.from(growth.events(), e => e[1]), ['page_view', 'result_generated', 'result_shared', 'result_copied', 'related_tool_click', 'related_art_click']);
assert.equal(growth.scripts.length, 1);
assert.equal(growth.events().at(-1)[2].source_slug, 'public-art');
assert.ok(!/NEVER_SEND|"payload":|"private_text":/.test(JSON.stringify(growth.events())));
const related = new growth.Element();
related.dataset = { relatedMonster: 'toolooo', relatedContentType: 'tool', relatedSlug: 'api-payload-doctor' };
related.closest = selector => selector === '[data-related-content]' ? related : null;
const beforeRelated = growth.events().length;
growth.docListeners.click({ isTrusted: true, target: related });
assert.equal(growth.events().length, beforeRelated + 1, 'one delegated related event after duplicate initialization');
assert.equal(growth.events().at(-1)[1], 'related_tool_click');
related.dataset.discoveryAction = 'next';
const beforeNext = growth.events().length;
growth.docListeners.click({ isTrusted: true, target: related });
assert.equal(growth.events().length, beforeNext + 1);
assert.equal(growth.events().at(-1)[1], 'try_next_click', 'Next does not also emit related_tool_click');
const tag = new growth.Element(); tag.dataset = { artworkTag: 'nature' };
tag.closest = selector => selector === '[data-artwork-tag]' ? tag : null;
growth.docListeners.click({ isTrusted: true, target: tag });
assert.equal(growth.events().at(-1)[1], 'artwork_tag_click');
const discovery = new growth.Element(); discovery.href = 'https://khizooology.com/infooo/?private=NEVER_SEND';
discovery.closest = selector => selector === 'a[href]' ? discovery : null;
const beforeDiscovery = growth.events().length;
growth.docListeners.click({ isTrusted: true, target: discovery });
assert.equal(growth.events().length, beforeDiscovery + 1);
assert.equal(growth.events().at(-1)[1], 'module_discovery');
assert.equal(growth.events().at(-1)[2].destination_module, 'infooo');
const contactCta = new growth.Element(); contactCta.href = 'https://khizooology.com/drop-a-vibe/';
contactCta.closest = selector => selector === 'a[href]' ? contactCta : null;
growth.docListeners.click({ isTrusted: true, target: contactCta });
assert.equal(growth.events().at(-1)[1], 'contact_click');
for (const href of ['mailto:private-person@example.com', 'https://wa.me/private-phone', 'https://www.linkedin.com/in/private-person']) {
  contactCta.href = href;
  contactCta.closest = selector => ['a[href]', '.dav-connect'].includes(selector) ? contactCta : null;
  growth.docListeners.click({ isTrusted: true, target: contactCta });
  assert.equal(growth.events().at(-1)[1], 'contact_click');
}
assert.ok(!/NEVER_SEND|private-person|private-phone|example.com/.test(JSON.stringify(growth.events())));
const social = new growth.Element(); social.href = 'https://instagram.com/any-profile'; social.closest = selector => selector === 'a[href]' ? social : null;
const beforeSocial = growth.events().length; growth.docListeners.click({ isTrusted: true, target: social });
assert.equal(growth.events().length, beforeSocial, 'ordinary social browsing is not a contact conversion');
growth.run('setConsent("declined"); trackToolResult(); trackShareAction({ monster: "toolooo", content_type: "tool", slug: "schema-drift-doctor", action: "copy_result" })');
assert.equal(growth.events().length, 0);
// Exercise actual share callbacks without clipboard access, network or system dialogs.
const shareEvents = [], clipboard = [], nativeShares = [];
const shareExports = {};
const navigator = { clipboard: { writeText: async text => { clipboard.push(text); } }, share: async data => { nativeShares.push(data); } };
const jsx = (type, props) => ({ type, props });
const shareSource = fs.readFileSync(new URL('../src/components/toolbox/ShareResultFoundation.tsx', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(shareSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: shareExports, navigator,
  document: { querySelector: () => ({ href: 'https://khizooology.com/toolbox/api-payload-doctor/' }) },
  require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { trackShareAction: metadata => shareEvents.push(metadata) },
});
const shared = shareExports.default({ monster: 'toolooo', contentType: 'tool', slug: 'api-payload-doctor', title: 'Public title', result: { summary: 'Only aggregate counts' } });
const buttons = shared.props.children.filter(child => child?.type === 'button');
await buttons[1].props.onClick();
assert.equal(shareEvents.length, 1); assert.equal(shareEvents[0].action, 'copy_result');
assert.equal(clipboard[0], 'Public title\nOnly aggregate counts\nhttps://khizooology.com/toolbox/api-payload-doctor/');
await buttons[0].props.onClick();
assert.equal(shareEvents.length, 2); assert.equal(shareEvents[1].action, 'share_result');
assert.equal(nativeShares[0].url, 'https://khizooology.com/toolbox/api-payload-doctor/');
navigator.share = async () => { throw new Error('cancelled'); };
navigator.clipboard.writeText = async () => { throw new Error('denied'); };
await buttons[0].props.onClick(); await buttons[1].props.onClick();
assert.equal(shareEvents.length, 2, 'failed clipboard and cancelled native share emit nothing');
delete navigator.share;
navigator.clipboard.writeText = async text => { clipboard.push(text); };
await buttons[0].props.onClick();
assert.equal(shareEvents.length, 3); assert.equal(shareEvents.at(-1).action, 'copy_result');
assert.ok(!JSON.stringify(shareEvents).includes('Only aggregate counts'), 'share text never enters analytics');
console.log('PASS: consent/config/error/storage guards, single initialization/page view/tool start, local suppression, completion/share/copy, real share success/cancellation callbacks, related source/destination, tags, module discovery, contacts and zero raw-content leakage. Mock GA transport; live property receipt requires deployment.');
