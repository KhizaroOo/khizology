import assert from 'node:assert/strict';
import fs from 'node:fs';
import { actions, advanceLab, approveAction, calculateBlastRadius, cases, configureScenario, currentAction, declineAction, evaluateAction, exposedConfig, initialLab, reachable, safeConfig, startLab, traceDataFlow, type LabState, type Scenario } from '../src/components/infooo/mcp-security/securityModel.ts';
function run(s: LabState, approve = false) {
  s = startLab(s); let approvals = 0;
  for (let i = 0; i < 12 && ['running','approval'].includes(s.status); i++) {
    if (s.status === 'approval') { if (!approve) break; s = approveAction(s); approvals++; }
    s = advanceLab(s);
  }
  return { s, approvals };
}
const safe = safeConfig();
const normal = run(initialLab(), true);
assert.equal(normal.s.status, 'complete'); assert.equal(normal.approvals, 1);
assert.deepEqual(normal.s.executed, ['read_project_status','read_issues','send_email']);
const waiting = run(initialLab()).s;
assert.equal(waiting.status, 'approval'); assert.ok(!waiting.executed.includes('send_email'));
assert.equal(currentAction(waiting).recipient, 'team@example.test');
assert.equal(declineAction(waiting).status, 'blocked');
assert.equal(advanceLab(declineAction(waiting)).executed.length, 2);
for (const item of cases) {
  const open = run(initialLab(item.id, configureScenario(exposedConfig(), item.id)), true).s;
  const bounded = run(initialLab(item.id), true).s;
  assert.equal(open.status, 'exposed', `${item.id} unsafe path`);
  assert.equal(bounded.status, 'blocked', `${item.id} bounded path`);
  assert.equal(bounded.executed.length < actions(item.id).length, true);
  assert.equal(traceDataFlow(bounded).at(-1), 'BLOCKED');
}
assert.equal(evaluateAction(initialLab(), { ...actions('safe')[0], capability:'file-write' }).decision, 'block');
const revoked = safeConfig(); revoked.servers.files.revoked = true;
assert.equal(run(initialLab('safe', revoked)).s.executed.length, 0);
assert.equal(run({ ...initialLab(), expired:true }).s.status, 'blocked');
assert.equal(evaluateAction({ ...initialLab(), time:900 }, actions('safe')[0]).decision, 'block');
const noGithub = safeConfig(); noGithub.servers.github.connected = false;
assert.deepEqual(run(initialLab('safe',noGithub),true).s.executed, ['read_project_status','send_email']);
const widePerms = safeConfig(); widePerms.servers.email.broadPermissions = true;
assert.equal(reachable(widePerms,'email').length,1);
widePerms.servers.email.broadCredential = true;
assert.equal(reachable(widePerms,'email').length,4);
assert.equal(calculateBlastRadius(widePerms).level,'HIGH');
const tokenOnly = safeConfig(); tokenOnly.servers.email.broadCredential = true;
assert.equal(reachable(tokenOnly,'email').length,1);
assert.equal(calculateBlastRadius(tokenOnly).level,'HIGH','broad credential remains a risk outside host permissions');
assert.equal(run(initialLab('token',tokenOnly)).s.status,'exposed','host approval does not contain a compromised upstream credential');
assert.equal(evaluateAction(initialLab('token',tokenOnly), { ...actions('token')[0], capability:'repo-admin' }).decision,'block','a mail credential cannot grant repository administration');
const isolate = exposedConfig(); isolate.controls.isolation = true;
assert.equal(run(initialLab('cross-server',configureScenario(isolate,'cross-server'))).s.status,'blocked');
const policy = exposedConfig(); policy.controls.policy = true;
assert.equal(run(initialLab('poisoning',policy)).s.status,'blocked');
const approvalOnly = exposedConfig(); approvalOnly.controls.approval = true;
const approvalAttack = run(initialLab('poisoning',approvalOnly)).s;
assert.equal(approvalAttack.status,'approval'); assert.equal(currentAction(approvalAttack).recipient,'external@example.test');
assert.equal(run(approveAction(approvalAttack),true).s.status,'exposed','informed approval still cannot promise safety');
const bound = exposedConfig(); bound.controls.userBound = true;
assert.equal(run(initialLab('deputy',bound)).s.status,'blocked');
const integrity = exposedConfig(); integrity.controls.integrity = true;
const changed = run(initialLab('rug-pull',integrity)).s;
assert.equal(changed.status,'blocked'); assert.ok(changed.reason.includes('v1 ≠ v2'));
const reviewed = run({ ...initialLab('rug-pull',integrity), reviewed:true }).s;
assert.equal(reviewed.status,'exposed','review alone does not contain a dangerous tool');
const credential = exposedConfig(); credential.controls.binding = true;
assert.equal(run(initialLab('misrouting',credential)).s.status,'blocked');
for (const scenario of ['local','validation'] as Scenario[]) {
  assert.equal(run(initialLab(scenario)).s.status,'blocked');
  assert.equal(run(initialLab(scenario,exposedConfig())).s.status,'exposed');
}
assert.equal(calculateBlastRadius(safe).host.length,1);
assert.equal(calculateBlastRadius(exposedConfig()).host.length,3);
assert.deepEqual(initialLab(),initialLab());
assert.deepEqual(advanceLab(normal.s), normal.s, 'completed simulation cannot execute another action');
const source = fs.readFileSync('src/components/infooo/mcp-security/McpSecurityLab.tsx','utf8');
assert.ok(!/\b(fetch|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|URLSearchParams|console)\b/.test(source));
if(process.argv.includes('--built')) {
  const route='https://khizooology.com/infooo/mcp-security-lab/';
  const html=fs.readFileSync('dist/infooo/mcp-security-lab/index.html','utf8');
  assert.ok(html.includes(`rel="canonical" href="${route}"`));
  assert.equal((html.match(/<h1\b/g)||[]).length,1); assert.ok(!/noindex/.test(html));
  for(const tag of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image']) assert.ok(html.includes(tag),tag);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
  assert.ok(schemas.some(s=>s['@type']==='WebApplication'&&s.url===route)); assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));
  assert.ok(html.includes('Model trust is not execution trust.'));
  const maps=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join('');
  assert.equal(maps.split(`<loc>${route}</loc>`).length-1,1);
  assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route));
  assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes('mcp-security-lab/'));
}
console.log('MCP Security Lab PASS: safe task and approval, six exposed/constrained attacks, permission/credential intersection, direct credential compromise, isolation, policy, meaningful consent, deputy, integrity, binding, sandbox, validation, revocation, expiry, optional issues, deterministic reset and privacy.');
