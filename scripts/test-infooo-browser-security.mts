import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advance, approve, blastRadius, broad, capabilities, classifyContent, controlNames, effectivePermissions, evaluate, exposedContext, finish, initial, proposal, scenarios, strong, weak, type Capability, type Control } from '../src/components/infooo/browser-security/browserSecurityModel.ts';

const safe = finish(initial());
assert.equal(safe.decision, 'approval');
assert.equal(proposal(safe).source, 'user');
assert.equal(proposal(safe).price, 182);
assert.equal(advance(safe).decision, 'approval', 'cannot bypass informed approval by stepping');
assert.equal(finish(approve(safe, true)).decision, 'executed');
assert.equal(approve(safe, false).decision, 'denied');
assert.equal(approve(initial(), true).approved, false);
const noRead = finish({ ...initial('webpage', weak()), permissions: { ...broad(), read: false } });
assert.equal(noRead.step, 2, 'reading is denied before page processing');
assert.equal(noRead.decision, 'blocked');
assert.equal(evaluate(noRead)?.reason, 'Reading the page is not permitted.');
assert.equal(approve({ ...safe, permissions: { ...broad(), purchase: false } }, true).decision, 'blocked', 'approval must revalidate current permissions');
for (const scenario of scenarios) {
  const naive = finish(initial(scenario.id, weak())), bounded = finish(initial(scenario.id, strong()));
  assert.equal(naive.decision, 'executed', scenario.id);
  assert.equal(proposal(naive).source, 'web');
  assert.equal(proposal(naive).matches, false, 'following a page never changes authorization provenance');
  assert.equal(bounded.decision, 'blocked', scenario.id);
  assert.ok(blastRadius(bounded).length < blastRadius(naive).length);
  assert.ok(exposedContext(bounded).length < exposedContext(naive).length);
  const intentOnly = finish(initial(scenario.id, { ...weak(), intent: true }));
  assert.equal(intentOnly.decision, 'blocked');
  assert.equal(finish(initial(scenario.id, { ...weak(), destination: true })).decision, 'blocked');
  const approvalOnly = finish(initial(scenario.id, { ...weak(), approval: true }));
  assert.equal(approvalOnly.decision, 'approval');
  assert.equal(finish(approve(approvalOnly, true)).decision, 'executed', 'approval alone can accept a bad proposal');
  assert.equal(approve(approvalOnly, false).decision, 'denied');
  const denied = { ...initial(scenario.id, weak()), permissions: { ...broad(), [scenario.capability]: false } };
  assert.equal(finish(denied).decision, 'blocked');
}
for (const medium of ['DOM', 'trusted-domain comment', 'image', 'PDF', 'email']) assert.equal(classifyContent(medium), 'UNTRUSTED CONTENT');
const controls = Object.keys(controlNames) as Control[];
let combinations = 0;
for (let mask = 0; mask < 2 ** controls.length; mask++) for (const scenario of scenarios) {
  const c = weak(); controls.forEach((key, i) => c[key] = !!(mask & (1 << i)));
  const s = finish(initial(scenario.id, c)); combinations++;
  assert.ok(s.step <= 8);
  assert.equal(proposal(s).source, 'web');
  if (c.intent || c.untrusted || c.destination || c.validation) assert.equal(s.decision, 'blocked');
  if (s.decision === 'executed') { assert.equal(evaluate(s), undefined); assert.equal(c.approval, false); }
  if (s.decision === 'approval') assert.equal(finish(s).decision, 'approval');
  assert.deepEqual(advance({ ...s, decision: 'blocked' }), { ...s, decision: 'blocked' });
}
const contextOnly = initial('data', { ...weak(), context: true });
assert.equal(finish(contextOnly).decision, 'blocked');
assert.equal(finish(initial('cross-site', { ...weak(), isolated: true })).decision, 'blocked');
assert.equal(finish(initial('data', { ...weak(), filter: true })).decision, 'blocked');
assert.equal(finish(initial('webpage', { ...weak(), audit: true })).decision, 'executed', 'logging is not prevention');
for (const cap of Object.keys(capabilities) as Capability[]) {
  const start = initial('webpage', weak()), before = blastRadius(start).length;
  start.permissions[cap] = false;
  if (cap !== 'read') assert.ok(blastRadius(start).length < before);
  assert.equal(effectivePermissions(start)[cap], false);
}
assert.deepEqual(initial(), initial());
const source = fs.readFileSync('src/components/infooo/browser-security/BrowserAgentLab.tsx', 'utf8');
assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if (process.argv.includes('--built')) {
  const route = 'https://khizooology.com/infooo/browser-agent-under-attack/';
  const html = fs.readFileSync('dist/infooo/browser-agent-under-attack/index.html', 'utf8');
  assert.ok(html.includes(`rel="canonical" href="${route}"`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(!html.includes('noindex'));
  for (const key of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) assert.ok(html.includes(key), key);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  assert.ok(schemas.some(s => s['@type'] === 'WebApplication' && s.url === route));
  assert.ok(schemas.some(s => s['@type'] === 'BreadcrumbList'));
  assert.ok(html.includes('Web content provides information. It does not grant authority.'));
  const maps = fs.readdirSync('dist').filter(n => /^sitemap.*\.xml$/.test(n)).map(n => fs.readFileSync(`dist/${n}`, 'utf8')).join('');
  assert.equal(maps.split(`<loc>${route}</loc>`).length - 1, 1);
  assert.ok(fs.readFileSync('dist/llms.txt', 'utf8').includes(route));
  assert.ok(fs.readFileSync('dist/infooo/index.html', 'utf8').includes('browser-agent-under-attack/'));
}
console.log(`Browser security PASS: safe mission, six attacks, independent controls, approval binding, provenance, context, blast radius, reset, privacy; ${combinations} control/scenario combinations.`);
