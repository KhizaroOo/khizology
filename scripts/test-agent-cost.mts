import assert from 'node:assert/strict';
import {agentDefaults as d,simulateAgent as sim,agentPresets} from '../src/components/toolbox/tools/agentCostModel.ts';
assert.deepEqual(sim(d,false),sim(d,false));
const normal=sim({...d,retryProbability:0},false);assert.equal(normal.rows.length,8);assert.equal(normal.calls,8);assert.equal(normal.retries,0);
assert.ok(Math.abs(normal.cost-(normal.input*d.inputRate+normal.output*d.outputRate)/1e6)<1e-9);
const loop={...d,...agentPresets['Runaway Loop']};assert.ok(sim(loop,false).cost>sim(loop,true).cost);
assert.ok(sim({...d,retryProbability:1},false).retries>0);
assert.ok(sim({...d,branchProbability:1,branches:8,steps:100},false).rows.every(r=>r.active<=64));
assert.equal(sim({...d,costLimit:0.000001},true).rows.length,0);
assert.equal(sim({...d,inputRate:0,outputRate:0},false).cost,0);
assert.throws(()=>sim({...d,inputRate:NaN},true));assert.throws(()=>sim({...d,inputRate:-1},true));assert.throws(()=>sim({...d,retention:2},true));
assert.ok(sim({...d,steps:1e9,retries:1e9,branches:1e9},false).rows.length<=100);
const prune=sim({...d,startContext:20000,steps:1,contextLimit:100000,pruneThreshold:10000,costLimit:100},true);assert.ok(prune.rows[0].summarized);assert.ok(prune.calls>1);
assert.equal(sim({...d,approvalStep:1},true).status,'Awaiting human approval');
for(const p of Object.values(agentPresets))for(const g of [false,true]){const r=sim({...d,...p},g);assert.ok([r.cost,r.input,r.output,r.peak].every(Number.isFinite));}
console.log('Agent cost model PASS: deterministic math, retries, branching, ceilings, paid summaries, invalid/zero prices and bounds.');

const extreme=Object.fromEntries(Object.keys(d).map(k=>[k,Number.MAX_VALUE]));for(const k of ['retention','retryProbability','branchProbability'])extreme[k]=1;for(const guarded of [false,true]){const r=sim(extreme as typeof d,guarded);assert.ok(r.rows.length<=100);assert.ok([r.cost,r.input,r.output,r.peak,r.calls,r.tools].every(Number.isFinite));}
assert.equal(sim({...d,tools:0.5,retryProbability:0,steps:1},false).tools,0.5);
assert.equal(sim({...d,stepLimit:2,retryProbability:0},true).rows.length,2);
assert.equal(sim({...d,contextLimit:1},true).rows.length,0);
assert.equal(sim({...d,tokenLimit:1},true).rows.length,0);
assert.equal(sim({...d,toolLimit:1},true).rows.length,0);
