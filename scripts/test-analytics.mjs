// Isolated fake DOM and mocked Google queue: no Google script is fetched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8');
function fixture(id = 'G-TESTONLY00', saved = null, brokenStorage = false, href = 'https://khizooology.com/?private=NEVER_SEND', canonical = 'https://khizooology.com/toolbox/schema-drift-doctor', referrer = '', dev = false) {
  const scripts = [], docListeners = {}, toolListeners = {}, winListeners = {};
  let reloads = 0, referrerReads = 0;
  const storageWrites = [];
  class Element { dataset = {}; closest(selector) { return selector.includes('.share-foundation') ? null : this; } }
  const tool = { dataset: { toolSlug: 'schema-drift-doctor', toolFamily: 'check', featureLevel: '2' }, addEventListener: (name, fn) => toolListeners[name] = fn };
  const doc = { title: 'Public tool title', referrer, cookie: '_ga=abc', querySelector: selector => selector.includes('canonical') ? { href: canonical } : tool,
    querySelectorAll: () => [{ dataset: { artworkSlug: 'public-art' } }], createElement: () => ({ remove() {} }), head: { appendChild: s => scripts.push(s) },
    getElementById: () => scripts[0], addEventListener: (name, fn) => { const previous = docListeners[name]; docListeners[name] = event => { previous?.(event); fn(event); }; }, dispatchEvent() {} };
  const win = { location: { href, origin: new URL(href).origin, reload: () => reloads++ }, addEventListener(name, fn) { winListeners[name] = fn; } };
  Object.defineProperty(doc, 'referrer', { get: () => { referrerReads++; return referrer; } });
  const context = vm.createContext({ window: win, document: doc, Element, URL, Event, localStorage: { getItem: () => { if (brokenStorage) throw Error(); return saved; }, setItem: (key, v) => { if (brokenStorage) throw Error(); storageWrites.push([key, v]); saved = v; } } });
  vm.runInContext(stripTypeScriptTypes(source.replace('import.meta.env.PUBLIC_GA_MEASUREMENT_ID', JSON.stringify(id)).replace('import.meta.env.DEV', JSON.stringify(dev))).replace(/export /g, ''), context);
  const run = code => vm.runInContext(code, context);
  const events = () => (win.dataLayer || []).map(args => Array.from(args)).filter(args => args[0] === 'event');
  return { run, scripts, win, doc, winListeners, docListeners, toolListeners, Element, events, storageWrites, referrerReads: () => referrerReads, reloads: () => reloads };
}
for (const saved of [null, 'declined']) {
  const f = fixture('G-TESTONLY00', saved); f.run('initializeAnalytics(); trackToolStart(); trackArtworkView("public-art"); trackToolExport("json"); trackToolExport("csv")');
  assert.equal(f.scripts.length, 0); assert.equal(f.events().length, 0);
}
const missing = fixture('', 'accepted'); missing.run('initializeAnalytics(); trackToolStart()'); assert.equal(missing.scripts.length, 0);
// F11: browser-local referral checks are not analytics transmission or storage.
for (const saved of [null, 'declined']) {
  const referral = fixture('G-TESTONLY00', saved, false, undefined, undefined, 'https://github.com/private-project?token=NEVER_SEND#private');
  referral.run('initializeAnalytics(); trackShareAction({monster:"toolooo",content_type:"tool",slug:"api-payload-doctor",action:"copy_link"})');
  assert.ok(referral.referrerReads() > 0, 'public metadata can check the browser referrer before consent');
  assert.equal(referral.scripts.length, 0); assert.equal(referral.events().length, 0); assert.equal(referral.storageWrites.length, 0);
  referral.run('setConsent("accepted")');
  assert.equal(referral.scripts.length, 1); assert.equal(referral.events()[0][2].page_referrer, 'https://github.com/');
  assert.deepEqual(referral.storageWrites, [['khizooology-analytics-consent', 'accepted']]);
  assert.ok(!JSON.stringify(referral.win.dataLayer).includes('NEVER_SEND'));
  referral.run('setConsent("declined"); trackShareAction({monster:"toolooo",content_type:"tool",slug:"api-payload-doctor",action:"copy_link"})');
  assert.equal(referral.events().length, 0); assert.equal(referral.win['ga-disable-G-TESTONLY00'], true); assert.equal(referral.reloads(), 1);
  assert.deepEqual(referral.storageWrites.at(-1), ['khizooology-analytics-consent', 'declined']);
}
const privacyCopy = fs.readFileSync(new URL('../src/pages/privacy.astro', import.meta.url), 'utf8');
const noticeCopy = fs.readFileSync(new URL('../src/components/layout/AnalyticsConsent.astro', import.meta.url), 'utf8');
assert.match(privacyCopy, /After analytics consent[\s\S]*scheme and hostname[\s\S]*limited list/);
assert.match(privacyCopy, /paths, query parameters and fragments are removed/);
assert.match(privacyCopy, /does not save referral addresses in browser storage/);
assert.match(privacyCopy, /attempts to delete[\s\S]*Previously sent events cannot be recalled/);
assert.doesNotMatch(privacyCopy, /referrers are excluded|anonymous analytics|contact form currently/i);
assert.match(noticeCopy, /If you accept[\s\S]*referrals from selected public websites/);
for (const [referrer, expected] of [
  ['https://www.google.com/search?q=NEVER_SEND#private', 'https://www.google.com/'],
  ['https://www.bing.com/search?q=NEVER_SEND', 'https://www.bing.com/'],
  ...['chatgpt.com', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com', 'perplexity.ai', 'news.ycombinator.com', 'dev.to', 'peerlist.io', 'producthunt.com', 'medium.com', 'hashnode.com', 'threads.net', 'tiktok.com', 'discord.com', 'discordapp.com', 'l.facebook.com', 'lm.facebook.com', 'l.instagram.com'].map(host => [`https://${host}/private-project?prompt=NEVER_SEND#private`, `https://${host}/`]),
  ['https://github.com/private-person/private-project?token=NEVER_SEND', 'https://github.com/'],
  ['https://user:NEVER_SEND@google.com/', ''], ['https://private-person.google.com/', ''],
  ['https://google.com:8443/NEVER_SEND', ''], ['https://google.com.private.example/NEVER_SEND', ''],
  ['https://private.example/NEVER_SEND', ''], ['http://localhost:4321/NEVER_SEND', ''],
  ['https://khizooology.com/toolbox/?private=NEVER_SEND', ''], ['not a URL NEVER_SEND', ''],
]) {
  const referred = fixture('G-TESTONLY00', 'accepted', false, undefined, undefined, referrer);
  referred.run('initializeAnalytics()');
  assert.equal(referred.events()[0][2].page_referrer, expected);
  assert.ok(!/NEVER_SEND|private-person|private-project/.test(JSON.stringify(referred.win.dataLayer)));
}
const campaignKeys = ['campaign_source', 'campaign_medium', 'campaign_name'];
const expectedCampaign = ['reddit', 'community', 'api-doctor-launch'];
const validQuery = 'utm_source=%20ReDDit%20&utm_medium=COMMUNITY&utm_campaign=Api-Doctor-Launch';
for (const [query, expected] of [
  [validQuery + '&utm_term=NEVER_SEND&utm_content=NEVER_SEND&unexpected=NEVER_SEND', expectedCampaign],
  ['utm_source=reddit&utm_medium=community', undefined],
  [validQuery + '&utm_source=duplicate', undefined],
  [validQuery.replace('COMMUNITY', 'hello%40example.com'), undefined],
  [validQuery.replace('COMMUNITY', 'hello%20world'), undefined],
  [validQuery.replace('COMMUNITY', 'a'.repeat(65)), undefined],
  [validQuery.replace('COMMUNITY', 'sk-live-NEVER_SEND'), undefined],
  [validQuery.replace('COMMUNITY', 'https%3A%2F%2Fgithub.com'), undefined],
]) {
  const visitor = fixture('G-TESTONLY00', null, false, `https://khizooology.com/?${query}#NEVER_SEND`);
  visitor.run('initializeAnalytics()');
  assert.equal(visitor.scripts.length, 0);
  assert.equal(visitor.win.dataLayer, undefined);
  assert.equal(visitor.storageWrites.length, 0);
  visitor.run('setConsent("accepted")');
  const config = Array.from(visitor.win.dataLayer, args => Array.from(args)).find(args => args[0] === 'config')[2];
  if (expected) assert.deepEqual(campaignKeys.map(key => config[key]), expected);
  else assert.ok(campaignKeys.every(key => !(key in config)));
  assert.equal(config.page_location, 'https://khizooology.com/toolbox/schema-drift-doctor');
  assert.deepEqual(visitor.storageWrites, [['khizooology-analytics-consent', 'accepted']]);
  assert.doesNotMatch(JSON.stringify(visitor.win.dataLayer), /NEVER_SEND|utm_|hello@|hello world|#|\?/);
}
const journey = fixture();
const plays = 'trackInfoooWorldStart("the-living-grid"); trackInfoooGuideComplete("the-living-grid","compact-challenge")';
journey.run(`initializeAnalytics(); ${plays}; ${plays}`);
assert.equal(journey.win.dataLayer, undefined);
journey.run(`setConsent("accepted"); ${plays}; ${plays};
  trackInfoooWorldStart("human-atlas");
  trackInfoooGuideComplete("the-living-grid","another-guide");
  trackInfoooEntityView("the-living-grid","battery");trackInfoooEntityView("the-living-grid","battery");`);
assert.deepEqual(Array.from(journey.events(), e => e[1]), ['page_view', 'infooo_world_start', 'infooo_guide_complete', 'infooo_world_start', 'infooo_guide_complete', 'infooo_entity_view', 'infooo_entity_view']);

const bridge = fixture();
bridge.run(`const viewer = {}; const send = (data, origin = window.location.origin, source = viewer) =>
  trackAtlasViewerMessage({ data, origin, source }, viewer);
  initializeAnalytics(); send("khizooology:atlas:guide-start"); setConsent("accepted");
  send("khizooology:atlas:interact", "https://example.org");
  send("khizooology:atlas:interact", window.location.origin, {});
  send("khizooology:atlas:exit"); send("khizooology:atlas:restart");
  send({ type: "khizooology:atlas:interact", query: "NEVER_SEND" });`);
assert.deepEqual(Array.from(bridge.events(), e => e[1]), ['page_view']);
bridge.run(`send("khizooology:atlas:interact"); send("khizooology:atlas:interact");
  send("khizooology:atlas:guide-start"); send("khizooology:atlas:guide-start");
  send("khizooology:atlas:guide-complete"); send("khizooology:atlas:guide-complete");`);
assert.deepEqual(Array.from(bridge.events(), e => e[1]), ['page_view', 'infooo_world_start', 'infooo_guide_start', 'infooo_guide_complete']);
for (const e of bridge.events().slice(2)) {
  assert.equal(e[2].world_slug, 'human-atlas');
  assert.equal(e[2].guide_id, 'follow-the-blood');
}
assert.doesNotMatch(JSON.stringify(bridge.win.dataLayer), /NEVER_SEND/);
const errorPage = fixture('G-TESTONLY00', 'accepted', false, 'https://khizooology.com/NEVER_SEND%2Fsecret?token=NEVER_SEND#private', 'https://khizooology.com/404/');
errorPage.run('initializeAnalytics(); initializeAnalytics(); setConsent("accepted")');
assert.equal(errorPage.events().length, 1, '404 navigation emits only one page view');
assert.equal(errorPage.events()[0][2].page_location, 'https://khizooology.com/404/');
assert.ok(!JSON.stringify(errorPage.win.dataLayer).includes('NEVER_SEND'), 'malformed/private 404 paths never enter GA commands');
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
f.run('trackToolFavorite("capacity-cliff-simulator", true); trackToolScenarioSelect("capacity-cliff-simulator", "safer-plan"); trackToolNextMove("capacity-cliff-simulator", "queue-capacity-planner"); trackToolChainAction("tool_chain_next", "capacity-cliff-simulator", "capacity-planning", "queue-capacity-planner"); trackContractDriftRun()');
const lv3Events = f.events().slice(-5);
assert.deepEqual(Array.from(lv3Events, event => event[1]), ['tool_favorite', 'tool_scenario_select', 'try_next_click', 'tool_chain_next', 'contract_drift_run']);
for (const event of lv3Events) assert.ok(Object.keys(event[2]).every(key => ['page_location', 'page_referrer', 'page_title', 'tool_id', 'scenario_id', 'target_tool_id', 'chain_id', 'source_slug', 'source_module', 'destination_slug', 'destination_module', 'tool_slug', 'tool_family', 'feature_level'].includes(key)));
assert.ok(!/NEVER_SEND|super-secret|api[_-]?key/i.test(JSON.stringify(lv3Events)), 'LV3 analytics must remain metadata-only');
f.run('setConsent("declined"); trackToolExport("json")'); assert.equal(f.win['ga-disable-G-TESTONLY00'], true); assert.equal(f.events().length, 0); assert.equal(f.reloads(), 1);
const failed = fixture('G-TESTONLY00', 'accepted'); failed.run('initializeAnalytics()'); failed.scripts[0].onerror(); failed.run('trackToolExport("png")'); assert.equal(failed.events().length, 0);
const storage = fixture('G-TESTONLY00', null, true); storage.run('initializeAnalytics(); setConsent("accepted"); setConsent("declined")'); assert.equal(storage.reloads(), 1);
for (const host of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']) {
  const local = fixture('G-TESTONLY00', 'accepted', false, `http://${host}:4321/`);
  local.run('initializeAnalytics(); trackToolResult(); trackToolExport("json")');
  assert.equal(local.scripts.length, 0); assert.equal(local.events().length, 0);
}
const devHost = fixture('G-TESTONLY00', 'accepted', false, 'http://192.0.2.10:4321/', undefined, '', true);
devHost.run('initializeAnalytics(); trackToolStart(); trackInfoooWorldStart("human-atlas")');
assert.equal(devHost.scripts.length, 0);
assert.equal(devHost.win.dataLayer, undefined);
const growth = fixture('G-TESTONLY00', 'accepted');
growth.run('initializeAnalytics(); initializeAnalytics(); trackToolResult(); trackShareAction({ monster: "toolooo", content_type: "tool", slug: "schema-drift-doctor", action: "result_share_options_opened", payload: "NEVER_SEND" }); trackShareAction({ monster: "toolooo", content_type: "tool", slug: "schema-drift-doctor", action: "copy_result" }); trackRelatedContentClick({ monster: "toolooo", content_type: "tool", slug: "api-payload-doctor", private_text: "NEVER_SEND" }); trackRelatedContentClick({ monster: "artooo", content_type: "artwork", slug: "public-art" }, "public-art");');
assert.deepEqual(Array.from(growth.events(), e => e[1]), ['page_view', 'result_generated', 'share_action', 'result_copied', 'related_tool_click', 'related_art_click']);
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
  const beforeContact = growth.events().length;
  contactCta.href = href;
  contactCta.closest = selector => ['a[href]', '.dav-connect'].includes(selector) ? contactCta : null;
  growth.docListeners.click({ isTrusted: true, target: contactCta });
  assert.equal(growth.events().length, beforeContact + 1, 'one direct contact action emits one event');
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
const cross = fixture('G-TESTONLY00', 'accepted');
cross.run('initializeAnalytics(); initializeAnalytics()');
const shareExports = {};
const navigator = { clipboard: { writeText: async text => { clipboard.push(text); } }, share: async data => { nativeShares.push(data); } };
const jsx = (type, props) => ({ type, props });
const shareSource = fs.readFileSync(new URL('../src/components/toolbox/ShareResultFoundation.tsx', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(shareSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: shareExports, navigator,
  document: { querySelector: () => ({ href: 'https://khizooology.com/toolbox/api-payload-doctor/' }) },
  require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'react' ? { useId: () => 'share-test', useRef: value => ({ current: value }), useState: value => [value, () => {}], useLayoutEffect: () => {} } : { trackShareAction: metadata => { shareEvents.push(metadata); cross.run(`trackShareAction(${JSON.stringify(metadata)})`); } },
});
const shared = shareExports.default({ monster: 'toolooo', contentType: 'tool', slug: 'api-payload-doctor', title: 'Public title', result: { summary: 'Only aggregate counts' } });
const buttons = shared.props.children.filter(child => child?.type === 'button');
await buttons[1].props.onClick();
assert.equal(shareEvents.length, 1); assert.equal(shareEvents[0].action, 'copy_result');
assert.equal(clipboard[0], 'Public title\nOnly aggregate counts\nhttps://khizooology.com/toolbox/api-payload-doctor/');
await buttons[0].props.onClick();
assert.equal(shareEvents.length, 2); assert.equal(shareEvents[1].action, 'result_share_options_opened');
const shareButton = new cross.Element(); shareButton.closest = () => null;
cross.docListeners.click({ isTrusted: true, target: shareButton });
assert.deepEqual(Array.from(cross.events(), e => e[1]), ['page_view', 'result_copied', 'share_action'], 'share callback and bubbled button click emit one share, no contact');
const contactLink = new cross.Element(); contactLink.href = 'https://khizooology.com/drop-a-vibe/';
contactLink.closest = selector => selector === 'a[href]' ? contactLink : null;
cross.docListeners.click({ isTrusted: true, target: contactLink });
assert.deepEqual(Array.from(cross.events(), e => e[1]), ['page_view', 'result_copied', 'share_action', 'contact_click'], 'one contact interaction emits one contact, no share');
assert.equal(nativeShares[0].url, 'https://khizooology.com/toolbox/api-payload-doctor/');
navigator.share = async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); };
navigator.clipboard.writeText = async () => { throw new Error('denied'); };
await buttons[0].props.onClick(); await buttons[1].props.onClick();
assert.equal(shareEvents.length, 2, 'failed clipboard and cancelled native share emit nothing');
delete navigator.share;
navigator.clipboard.writeText = async text => { clipboard.push(text); };
await buttons[0].props.onClick();
assert.equal(shareEvents.length, 3); assert.equal(shareEvents.at(-1).action, 'copy_result');
assert.ok(!JSON.stringify(shareEvents).includes('Only aggregate counts'), 'share text never enters analytics');

// Collection navigation carries public metadata; professional intent reuses contact_click once.
for (const saved of [null, 'declined']) {
  const c = fixture('G-TESTONLY00', saved);c.run('initializeAnalytics(); trackInfoooCollection("start", "agent-systems-lab", "mcp-security-lab")');assert.equal(c.events().length, 0);
}
const collection = fixture('G-TESTONLY00', 'accepted', false, 'https://khizooology.com/infooo/agent-systems-lab/?private=NEVER_SEND#private', 'https://khizooology.com/infooo/agent-systems-lab/');
collection.run('initializeAnalytics(); initializeAnalytics()');
function collectionClick(action, href, trusted = true) {
 const link = new collection.Element();link.href = href;link.dataset = { infoooCollection: 'agent-systems-lab', collectionAction: action };link.closest = selector => selector === 'a[href]' || selector === 'a[data-infooo-collection][data-collection-action]' ? link : null;
 collection.docListeners.click({ isTrusted: trusted, target: link });
}
collectionClick('start','https://khizooology.com/infooo/mcp-security-lab/');
collectionClick('world','https://khizooology.com/infooo/agent-identity-lab/');
collectionClick('consulting','https://khizooology.com/drop-a-vibe/');
assert.deepEqual(Array.from(collection.events(), e=>e[1]), ['page_view','infooo_collection_start','infooo_collection_world_open','contact_click']);
assert.equal(collection.events().at(-1)[2].collection_slug,'agent-systems-lab');
assert.equal(collection.events().at(-2)[2].destination_slug,'agent-identity-lab');
collectionClick('world','https://external.example/infooo/NEVER_SEND/');
collectionClick('world','https://khizooology.com/infooo/agent-identity-lab/?private=NEVER_SEND');
collectionClick('world','https://khizooology.com/infooo/agent-identity-lab/',false);
collection.run('trackInfoooCollection("start", "private?NEVER_SEND", "mcp-security-lab"); trackInfoooCollection("world", "agent-systems-lab", "private#NEVER_SEND")');
assert.equal(collection.events().length,4);assert.ok(!JSON.stringify(collection.events()).includes('NEVER_SEND'));
assert.equal(collection.scripts.length,1);
console.log('PASS: consent/config/error/storage guards, single initialization/page view/tool start, local suppression, deduplication, Atlas bridge, campaign allowlist, share-open/copy/cancellation callbacks, related source/destination, tags, module discovery, contacts and zero raw-content leakage. Mock GA transport; live property receipt requires deployment.');

// Earning experiment 001: real observer/click handlers, mocked Google transport only.
function earningFixture(saved = null, href = 'https://khizooology.com/toolbox/api-payload-doctor/?private=NEVER_SEND#private', canonical = 'https://khizooology.com/toolbox/api-payload-doctor/') {
  const f = fixture('G-TESTONLY00', saved, false, href, canonical);
  const offer = new f.Element(); offer.dataset = { earningSurface: 'api-payload-doctor' };
  const tool = { dataset: { toolSlug: 'api-payload-doctor', toolFamily: 'check', featureLevel: '3' }, addEventListener() {} };
  const original = f.doc.querySelector;
  f.doc.querySelector = selector => selector.includes('canonical') ? original(selector) : selector === '[data-earning-offer]' ? offer : tool;
  f.doc.querySelectorAll = selector => selector === '[data-earning-offer]' ? [offer] : [];
  f.doc.visibilityState = 'visible';
  const observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observers.push(this); }
    observe(node) { this.targets.add(node); }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    fire(ratio = .6) { this.callback([{ target: offer, isIntersecting: ratio > 0, intersectionRatio: ratio }], this); }
  }
  f.run('globalThis.installObserver = value => { globalThis.IntersectionObserver = value; }');
  // Provide the platform constructor in the same VM; no browser storage or fetch is added.
  const install = f.run('installObserver'); install(Observer);
  const link = new f.Element(); link.href = 'https://khizooology.com/drop-a-vibe/#technical-clarity-review';
  link.hasAttribute = name => name === 'data-earning-offer-cta';
  link.closest = selector => selector === '[data-earning-offer]' ? offer : selector === 'a[href]' ? link : null;
  return { ...f, offer, observers, link, earning: () => f.events().filter(e => e[1].startsWith('earning_offer_')) };
}
for (const saved of [null, 'declined']) {
  const f = earningFixture(saved); f.run('initializeAnalytics()');
  assert.equal(f.observers.length, 0); f.docListeners.click({ isTrusted: true, target: f.link }); assert.equal(f.earning().length, 0);
  f.run('setConsent("accepted")'); assert.equal(f.observers.length, 1); const observer = f.observers[0]; assert.equal(observer.options.threshold, .5);
  observer.fire(.4); assert.equal(f.earning().length, 0); observer.fire(); observer.fire(); f.run('initializeAnalytics()'); assert.equal(f.observers.length, 1);
  assert.equal(f.earning().filter(e => e[1] === 'earning_offer_view').length, 1, 'one consented exposure per document');
  f.docListeners.click({ isTrusted: true, target: f.link }); f.docListeners.click({ isTrusted: true, target: f.link });
  assert.equal(f.earning().filter(e => e[1] === 'earning_offer_click').length, 2, 'one earning event per real intended click');
  assert.equal(f.events().filter(e => e[1] === 'contact_click').length, 2, 'only accepted contact clicks count; the pre-consent click stays suppressed');
  for (const e of f.earning()) {
    assert.ok(Object.keys(e[2]).every(k => ['page_location','page_referrer','page_title','experiment_id','surface','contact_method'].includes(k)));
    assert.equal(e[2].experiment_id, 'technical-clarity-review-001'); assert.equal(e[2].surface, 'api-payload-doctor');
    assert.ok(!JSON.stringify(e).includes('NEVER_SEND')); assert.ok(!JSON.stringify(e).includes('wa.me'));
  }
  assert.equal(f.earning().find(e => e[1] === 'earning_offer_click')[2].contact_method, 'contact_page');
  f.run('setConsent("declined")'); assert.ok(observer.disconnected); observer.fire(); f.docListeners.click({ isTrusted:true, target:f.link }); assert.equal(f.earning().length,0);
}
{
  const f = earningFixture('accepted'); f.run('initializeAnalytics()'); const old = f.observers[0];
  f.doc.visibilityState = 'hidden'; f.docListeners.visibilitychange({}); old.fire(); assert.equal(f.earning().length,0);
  f.doc.visibilityState = 'visible'; f.docListeners.visibilitychange({}); assert.equal(f.observers.length,2); old.fire(); assert.equal(f.earning().length,0, 'stale callback cannot report a view');
  f.observers[1].fire(); f.winListeners.pagehide(); f.winListeners.pageshow(); assert.equal(f.earning().length,1); assert.equal(f.observers.length,2, 'seen offer is not reobserved on restore');
  f.offer.dataset.earningSurface='private-user-value'; f.docListeners.click({isTrusted:true,target:f.link}); assert.equal(f.earning().length,1);
  f.offer.dataset.earningSurface='api-payload-doctor'; f.link.href='https://wa.me/923007683396?text='+encodeURIComponent('Technical Clarity Review  NEVER_SEND'); f.docListeners.click({isTrusted:true,target:f.link});
  const event=f.earning().at(-1); assert.equal(event[2].contact_method,'whatsapp'); assert.ok(!JSON.stringify(event).includes('923007683396'));
  f.link.href='mailto:khizar.imtiaz@gmail.com?subject=Technical+Clarity+Review&body='+encodeURIComponent('Technical Clarity Review  NEVER_SEND'); f.docListeners.click({isTrusted:true,target:f.link}); assert.equal(f.earning().at(-1)[2].contact_method,'email'); assert.ok(!JSON.stringify(f.earning()).includes('khizar.imtiaz@gmail.com'));
  assert.ok(!JSON.stringify(f.events()).includes('NEVER_SEND'), 'prefilled messages never enter analytics');
  f.docListeners.click({isTrusted:false,target:f.link}); assert.equal(f.earning().filter(e=>e[1]==='earning_offer_click').length,2);
}
{
  const local=earningFixture('accepted','http://127.0.0.1:4332/toolbox/api-payload-doctor/');local.run('initializeAnalytics()');assert.equal(local.observers.length,0);assert.equal(local.scripts.length,0);
  const failed=earningFixture('accepted');failed.run('initializeAnalytics()');failed.scripts[0].onerror();failed.observers[0].fire();assert.equal(failed.earning().length,0);
}
console.log('Earning analytics PASS: consent, 50% visible exposure once, intended clicks, safe canonical/channel metadata, no private/contact values, hidden/page lifecycle cleanup and local/failed-tag suppression.');
