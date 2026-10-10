import assert from 'node:assert/strict';import {simulateSlo as run,sloDefault as d,sloPresets} from '../src/components/toolbox/tools/sloIncidentModel.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const r=run(d);near(r.requests,43200000);near(r.bad,5000);near(r.budget,43200);near(r.detectionCost,2000);near(r.phases.reduce((s,p)=>s+p.minutes,0),43200);
assert.ok(run({...d,detect:2,mitigate:0}).bad<r.bad);near(run({...d,repeats:3}).bad,3*r.bad);assert.equal(run({...d,errors:0}).exhaustMinutes,null);
const spike=run({...d,traffic:4});near(spike.bad,r.bad*4);assert.ok(spike.budget>r.budget);assert.ok(run({...d,errors:100,duration:1000}).remaining<0);
for(const p of Object.values(sloPresets))assert.ok(Number.isFinite(run({...d,...p}).bad));
for(const v of [{target:100},{rpm:NaN},{repeats:1.5},{start:43200},{recover:-1},{traffic:101}])assert.throws(()=>run({...d,...v}));console.log('SLO checks passed: request math, recovery, delays, spikes, repeats, zero errors, bounds.');
