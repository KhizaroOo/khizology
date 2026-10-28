import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initialEconomy, startEconomy, advanceEconomy, approvePayment, authorizeTransaction, canSpend, canAct, delegateAuthority, revokeEconomy, expireEconomy, resumeEconomy, failures, type EconomyState } from '../src/components/infooo/agent-economy/economyModel.ts';

function run(state: EconomyState, approve = false) {
  let s = startEconomy(state), approvals = 0;
  for (let i = 0; i < 100 && !['complete', 'blocked'].includes(s.status); i++) {
    if (s.status === 'approval') { if (!approve) break; approvals++; s = approvePayment(s); }
    s = advanceEconomy(s);
    assert.ok(Number.isSafeInteger(s.spent) && s.spent >= 0);
    assert.ok(s.authority.cap === null || s.spent <= s.authority.cap);
  }
  return { s, approvals };
}
for (const autonomy of ['assisted', 'delegated', 'autonomous'] as const) {
  const { s, approvals } = run(initialEconomy('campaign', autonomy), true);
  assert.equal(s.status, 'complete'); assert.equal(s.spent, 59);
  assert.equal(s.authority.cap! - s.spent, 1941);
  assert.deepEqual(s.receipts.map(r => r.cents), [8, 48, 3]);
  assert.equal(approvals, autonomy === 'assisted' ? 3 : 0);
}
const reasons = { overspend: 'budget', intent: 'intent', identity: 'identity', merchant: 'merchant', unlimited: 'unlimited', duplicate: 'duplicate' };
for (const failure of failures) {
  const { s } = run(initialEconomy('campaign', 'delegated', 2000, failure.id));
  if (failure.id === 'duplicate') {
    assert.equal(s.status, 'complete'); assert.equal(s.spent, 59); assert.equal(s.receipts.length, 3);
    assert.ok(s.log.some(e => e.text.includes('no second') || e.text.includes('$0.00 again')));
  } else { assert.equal(s.status, 'blocked'); assert.equal(s.reason, reasons[failure.id]); assert.equal(s.spent, 0); }
}
assert.equal(run(initialEconomy('machine')).s.spent, 30);
const ambiguous = run(initialEconomy('ambiguous')).s;
assert.equal(ambiguous.reason, 'ambiguous'); assert.equal(ambiguous.spent, 0);
assert.equal(run(resumeEconomy({ ...ambiguous, clarified: true })).s.spent, 59);
const noImages = initialEconomy(); noImages.authority.permissions = ['research', 'data'];
const denied = run(noImages).s; assert.equal(denied.reason, 'permission'); assert.equal(denied.spent, 8);
for (const cap of [0, 7, 8, 55, 58, 59, 2000]) {
  const s = run(initialEconomy('campaign', 'delegated', cap)).s;
  assert.ok(s.spent <= cap); assert.equal(s.status === 'complete', cap >= 59);
}
for (const invalid of [NaN, Infinity, -1, .5, Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(canSpend(2000, 0, invalid), false);
  assert.equal(canSpend(invalid, 0, 8), false);
}
let paid = startEconomy(initialEconomy());
while (!paid.receipts.length) paid = advanceEconomy(paid);
assert.equal(paid.spent, 8);
for (const stopped of [revokeEconomy(paid), expireEconomy(paid)]) {
  assert.equal(stopped.receipts.length, 1); assert.ok(stopped.log.length >= paid.log.length);
  assert.equal(authorizeTransaction(stopped).cents, 0);
  const newPurchase = { ...stopped, index: 1 };
  assert.ok(['revoked', 'expired'].includes(canAct(newPurchase)));
  assert.equal(authorizeTransaction(newPurchase).cents, 0);
}
const retry = { ...paid, phase: 'payment' as const };
assert.deepEqual(authorizeTransaction(retry), { reason: 'duplicate', cents: 0 });
const conflict = { ...retry, services: retry.services.map((v, i) => i ? v : { ...v, unitCents: 9 }) };
assert.deepEqual(authorizeTransaction(conflict), { reason: 'conflict', cents: 0 });
const parent = initialEconomy();
const delegate = delegateAuthority(parent, ['research', 'image', 'compute'], 5000);
assert.deepEqual(delegate.permissions, ['research']); assert.equal(delegate.cap, 200);
assert.ok(delegate.expiresAt <= parent.authority.expiresAt);
const delegated = run({ ...parent, delegate }).s;
assert.equal(delegated.spent, 59); assert.equal(delegated.delegate!.spent, 8);
assert.equal(delegated.receipts.reduce((n, r) => n + r.cents, 0), 59);
assert.equal(delegateAuthority({ ...parent, spent: 1950 }).cap, 50);
assert.equal(delegateAuthority(revokeEconomy(parent)).cap, 0);
assert.equal(delegateAuthority(expireEconomy(parent)).permissions.length, 0);
assert.equal(delegateAuthority({ ...parent, authority: { ...parent.authority, permissions: ['image'] } }).permissions.length, 0);
assert.deepEqual(initialEconomy(), parent, 'reset creates the same deterministic initial state');
assert.equal(advanceEconomy(run(parent).s).spent, 59, 'completion cannot charge again');
console.log('Agent Economy: three autonomy levels, six failures, exact costs, machine chain, ambiguity, permissions, budget boundaries, malformed amounts, revocation, expiry, dedupe/conflict, delegation and deterministic reset PASS.');

const ui = fs.readFileSync('src/components/infooo/agent-economy/AgentEconomy.tsx', 'utf8');
assert.ok(!/\b(fetch|localStorage|sessionStorage|sendBeacon|XMLHttpRequest|URLSearchParams|console)\b/.test(ui), 'No transport, persistence or logging of simulation state');
if (process.argv.includes('--built')) {
  const route = 'https://khizooology.com/infooo/the-agent-economy/';
  const html = fs.readFileSync('dist/infooo/the-agent-economy/index.html', 'utf8');
  assert.ok(html.includes(`rel="canonical" href="${route}"`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(!/noindex/.test(html));
  for (const name of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) assert.ok(html.includes(name), name);
  assert.ok(html.includes('Four images cost 48 cents'));
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  assert.ok(schemas.some(s => s['@type'] === 'WebApplication' && s.url === route));
  assert.ok(schemas.some(s => s['@type'] === 'BreadcrumbList'));
  const maps = fs.readdirSync('dist').filter(n => /^sitemap.*\.xml$/.test(n)).map(n => fs.readFileSync(`dist/${n}`, 'utf8')).join('');
  assert.equal(maps.split(`<loc>${route}</loc>`).length - 1, 1);
  assert.ok(fs.readFileSync('dist/llms.txt', 'utf8').includes(route));
  assert.ok(fs.readFileSync('dist/infooo/index.html', 'utf8').includes('the-agent-economy/'));
  console.log('Agent Economy generated SEO, social metadata, schema, static text, hub, sitemap and llms discovery PASS.');
}
