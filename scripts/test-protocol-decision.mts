import assert from 'node:assert/strict';import fs from 'node:fs';
import {decideProtocols as decide,protocolPreset as preset,protocolPresetNames as names,protocolDefaults,protocolRegistry,linkQuestions,type Boundary} from '../src/components/toolbox/tools/protocolDecisionModel.ts';
import {activeTools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
let c=preset(names[0]),r=decide(c);assert.equal(r.rows[0].chosen,'mcp');assert.ok(r.rows[0].ranked[0].score>0);
c=preset(names[1]);r=decide(c);assert.equal(r.rows[0].chosen,'a2a');assert.match(r.flow,/Independent Agent B/);
c=preset(names[2]);r=decide(c);assert.equal(r.rows[0].chosen,'webmcp');assert.match(r.warnings.join(' '),/Emerging/);
c=preset(names[3]);r=decide(c);assert.equal(r.rows[0].chosen,'api');assert.match(r.flow,/Normal API/);
c=preset(names[6]);r=decide(c);assert.equal(r.rows[0].chosen,'api');assert.equal(r.rows[0].direct,true);assert.match(r.flow,/Direct Function/);assert.deepEqual(r.roles,['api']);
c=preset(names[4]);r=decide(c);assert.deepEqual(new Set(r.roles),new Set(['mcp','a2a','api']));assert.equal(r.rows.length,3);assert.ok(r.rows.every(row=>row.ranked.length===4));
c=preset(names[1]);c.peerTools=true;r=decide(c);assert.equal(r.nested,true);assert.ok(r.roles.includes('mcp'));assert.match(r.flow,/Independent Agent B → MCP/);assert.equal(r.steps.length,3);
c=preset(names[5]);c.boundary='multiple';c.selected=['web','agent'];r=decide(c);assert.deepEqual(new Set(r.roles),new Set(['webmcp','a2a']));assert.equal(r.rows.find(row=>row.boundary==='web')!.chosen,'webmcp');
c=preset(names[2]);const experimental=decide(c).rows[0].ranked.find(r=>r.id==='webmcp')!.score;c.maturity='Production-stable required';r=decide(c);assert.equal(r.rows[0].chosen,undefined);assert.ok(r.incomplete);assert.equal(r.rows[0].ranked.find(r=>r.id==='webmcp')!.score,experimental-45);assert.ok(r.rows[0].ranked.find(r=>r.id==='webmcp')!.blocked.length);assert.match(r.action,/do not deploy/);
c.links.web.api='REST';r=decide(c);assert.equal(r.rows[0].chosen,'api');assert.ok(r.warnings.some(s=>s.includes('existing API')));
c=preset(names[5]);c.links.web.ownership='Third-party site';r=decide(c);assert.equal(r.rows[0].chosen,undefined);assert.match(r.rows[0].ranked.find(r=>r.id==='webmcp')!.blocked.join(' '),/uncontrolled/);
c=preset(names[1]);c.links.agent.lifecycle='Long-running task';r=decide(c);assert.equal(r.rows[0].chosen,'a2a');assert.ok(r.rows[0].ranked.find(r=>r.id==='a2a')!.points.some(p=>p.reason==='Peer task lifecycle'));
c=preset(names[0]);c.links.data.delegation='Yes';c.links.data.lifecycle='Long-running task';r=decide(c);assert.notEqual(r.rows[0].chosen,'a2a');assert.ok(r.warnings.some(w=>w.includes('target is not an independent agent')));
c=preset(names[0]);const ordinary=decide(c);c.security='Critical';c.impact=true;r=decide(c);assert.deepEqual(r.rows[0].ranked,ordinary.rows[0].ranked);assert.match(r.security.join(' '),/confirmation gates/);assert.match(r.security.join(' '),/Elevated sensitivity/);
c=preset(names[0]);c.links.data.target='Mixed';r=decide(c);assert.ok(r.incomplete);assert.equal(r.rows[0].chosen,undefined);
c=protocolDefaults();c.boundary='multiple';c.selected=['data'];assert.throws(()=>decide(c));c.selected=['tool','tool'];assert.throws(()=>decide(c));c=protocolDefaults();c.links.data.caller='bogus';assert.throws(()=>decide(c));
for(const name of names){const config=preset(name);assert.deepEqual(decide(config),decide(config));assert.equal(decide(config).steps.length,3);}
for(const b of Object.keys(protocolDefaults().links) as Boundary[])for(const q of linkQuestions)for(const v of q.options){c=protocolDefaults();c.boundary=b;c.links[b][q.id]=v;r=decide(c);for(const row of r.rows)for(const rank of row.ranked)assert.ok(Number.isFinite(rank.score));}
assert.equal(protocolRegistry.mcp.verified,'2026-10-23');assert.match(protocolRegistry.mcp.status,/2026-07-28/);assert.match(protocolRegistry.a2a.status,/1.0.0/);assert.match(protocolRegistry.webmcp.status,/Emerging.*draft/);
for(const f of ['protocolDecisionModel.ts','ProtocolDecisionLab.tsx'])assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|dangerouslySetInnerHTML/.test(fs.readFileSync('src/components/toolbox/tools/'+f,'utf8')));
const tool=activeTools.find(t=>t.id==='mcp-vs-a2a-vs-webmcp-decision-lab')!;assert.ok(tool&&getRelatedTools(tool).length&&getTryNextTools(tool).length);for(const id of [...tool.relatedToolIds!,...tool.nextToolIds!])assert.ok(activeTools.some(t=>t.id===id),id);assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
console.log(`PASS: seven presets, boundaries, API/function simplicity, combined/layered roles, maturity/control eligibility, deterministic scores, security independence, input validation and privacy. ${activeTools.length} active; ${activeTools.filter(t=>t.family==='decide').length} Decide.`);
