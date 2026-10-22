import assert from 'node:assert/strict';
import {initialGrid,evaluateGrid,advanceGrid,applyScenario,solarAt,gridScenarios} from '../src/components/infooo/grid/gridModel.ts';
import {compactResult,compactInitial,compactAction,compactTick,compactHealth,compactScenarios} from '../src/components/infooo/grid/gridChallenges.ts';
import {gridTrends,gridSources} from '../src/components/infooo/grid/gridTrends.ts';
const noon=initialGrid(),evening={...noon,hour:19};
// The opening story uses a recoverable evening snapshot, not a fake balanced status.
const storyPeak={...noon,hour:17.25};
assert.ok(evaluateGrid(storyPeak).shortfall>0);
const rescued=evaluateGrid({...storyPeak,batteryEnabled:true});
assert.equal(rescued.shortfall,0);assert.equal(rescued.status,'TIGHT');
assert.ok(rescued.discharge>0&&rescued.discharge<=18);
assert.equal(evaluateGrid(noon).status,'BALANCED');assert.equal(solarAt(20),0);assert.ok(evaluateGrid(evening).shortfall>0);
assert.ok(evaluateGrid({...noon,temperature:43}).demand>evaluateGrid(noon).demand);
assert.ok(evaluateGrid({...noon,plantOnline:false}).availableA<evaluateGrid(noon).availableA);
assert.equal(evaluateGrid({...evening,evMode:'normal'}).evExport,0);
assert.ok(evaluateGrid({...evening,evMode:'smart'}).evCharge<evaluateGrid(evening).evCharge);
assert.ok(evaluateGrid({...evening,evMode:'v2g',fleet:1}).evExport<evaluateGrid({...evening,evMode:'v2g',fleet:1000}).evExport);
assert.equal(evaluateGrid({...evening,evMode:'v2g',evStored:0}).evExport,0);
const empty={...evening,batteryEnabled:true,stored:0};assert.equal(evaluateGrid(empty).discharge,0);
assert.ok(advanceGrid({...noon,batteryEnabled:true,stored:0}).stored>0);
for(const duration of [1,2,4,8] as const){let s={...evening,batteryEnabled:true,duration,stored:duration*18};for(let i=0;i<100;i++){const r=evaluateGrid(s);assert.ok(r.discharge*.25<=s.stored+1e-8);s=advanceGrid(s);assert.ok(s.stored>=0&&s.stored<=duration*18);}}
const constrained=evaluateGrid(applyScenario('transmission'));assert.ok(constrained.transfer<=42);assert.ok(constrained.availableA>constrained.transfer);assert.ok(constrained.shortfall>0);
assert.ok(evaluateGrid({...applyScenario('transmission'),constrained:false}).shortfall<constrained.shortfall);
assert.ok(evaluateGrid({...evening,batteryEnabled:true,evMode:'smart',demandResponse:true,flexGeneration:true}).shortfall<evaluateGrid(evening).shortfall);
const hot=applyScenario('heatwave');assert.equal(evaluateGrid(hot).status,'CRITICAL');
const recovered=evaluateGrid({...hot,batteryEnabled:true,evMode:'v2g',demandResponse:true,factoryShift:true,flexGeneration:true,vpp:true});assert.equal(recovered.shortfall,0);
assert.ok(evaluateGrid({...noon,batteryEnabled:true}).curtailment<evaluateGrid(noon).curtailment);
for(const c of gridScenarios){const r=evaluateGrid(applyScenario(c.id));assert.ok(Object.values(r).every(v=>typeof v!=='number'||Number.isFinite(v)));assert.ok(r.supply<=r.totalDemand);assert.ok(r.charge>=0&&r.discharge>=0);}
for(const t of gridTrends){assert.equal(t.lastReviewed,'2026-10-21');assert.ok(t.sources.every(url=>gridSources.some(x=>x.url===url)));assert.ok(t.relatedScenario==='normal'||gridScenarios.some(c=>c.id===t.relatedScenario));}
assert.deepEqual(initialGrid(),noon);
console.log('PASS: noon/evening, sunset, finite energy and power, charge/discharge, V2G participation, smart charging, heatwave recovery, outages, transfer bottleneck, curtailment, trends and reset.');

// Compact scenarios preserve real supply/demand and finite storage.
for(const scenario of compactScenarios){
 const initial=compactInitial(scenario.id);assert.equal(compactHealth(initial),scenario.id==='demand'?'CRITICAL':'SHORTFALL');
 for(const action of ['battery','generation','demand'] as const){
  const next=compactAction(initial,action),before=evaluateGrid(initial),after=evaluateGrid(next);
  assert.ok(after.shortfall<before.shortfall,`${scenario.id}: ${action} must help`);
  if(action==='demand'){assert.ok(after.totalDemand<before.totalDemand);assert.equal(after.availableA,before.availableA);}
  
 }
 const allActions=(['battery','generation','demand'] as const).reduce((s,action)=>compactAction(s,action),initial);
 // Generation puts storage on standby; explicitly dispatch it if the remaining gap needs it.
 assert.equal(compactResult(compactAction(allActions,'battery')).shortfall,0);
 let state=compactAction(initial,'battery');const energy=state.stored;
 for(let n=0;n<100;n++){const previous=state,r=evaluateGrid(previous,.5);state=compactTick(state);assert.equal(state.hour,initial.hour);assert.ok(state.stored>=0&&state.stored<=previous.stored);assert.ok(Math.abs(state.stored-Math.max(0,previous.stored-r.discharge*.5))<1e-8);}
 assert.ok(state.stored<energy);assert.equal(state.stored,0);assert.equal(evaluateGrid(state).discharge,0);assert.ok(evaluateGrid(state).shortfall>0);
 assert.deepEqual(compactInitial(scenario.id),initial);
}
const challenge=compactInitial('generation',true);assert.equal(Math.round(challenge.stored/72*100),45);
const first=compactAction(challenge,'battery');assert.ok(evaluateGrid(first).shortfall>0);
assert.equal(evaluateGrid(compactAction(first,'demand')).shortfall,0);
assert.ok(evaluateGrid(compactAction(challenge,'demand')).shortfall>0);
assert.ok(evaluateGrid(compactAction({...first,stored:0},'demand')).shortfall>0); // Too late: two actions have not met demand.
assert.equal(evaluateGrid(compactAction(challenge,'generation')).shortfall,0);
// Replay is deterministic; restoring generation returns storage to standby.
const replay=['battery','demand'].reduce((state,action)=>compactAction(state,action as 'battery'|'demand'),challenge);
assert.deepEqual(replay,compactAction(first,'demand'));
assert.equal(compactAction(first,'generation').batteryEnabled,false);
assert.equal(compactHealth({...compactInitial('generation'),temperature:43}),'CRITICAL');
console.log('PASS: compact scenarios, trade-offs, 30-minute energy integration, zero floor, empty storage, challenge paths, deterministic replay/reset and health.');

const limited={...compactInitial('generation'),batteryEnabled:true,stored:2};
assert.equal(compactResult(limited).discharge,4);
assert.equal(compactResult(limited).discharge*.5,limited.stored);
assert.equal(compactTick(limited).stored,0);
assert.ok(compactResult(limited).shortfall>0);

for(const scenario of compactScenarios){
 for(const order of [['battery','generation','demand'],['battery','demand','generation'],['generation','battery','demand'],['generation','demand','battery'],['demand','battery','generation'],['demand','generation','battery']] as const){
  const outcome=order.reduce((s,action)=>compactAction(s,action),compactInitial(scenario.id));
  assert.equal(compactResult(outcome).shortfall,0,`${scenario.id}: ${order.join(',')}`);
 }
}
console.log('PASS: all recovery-action orders, critical demand spike and storage standby only when other supply is sufficient.');
