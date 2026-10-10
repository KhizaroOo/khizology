import assert from 'node:assert/strict';
import {planAccessibility,findingDefaults,accessibilitySample} from '../src/components/toolbox/tools/accessibilityPlanModel.ts';
const plan=planAccessibility(accessibilitySample);assert.equal(plan.items[0].id,'A11Y-002');assert.equal(plan.items[0].phase,1);assert.equal(plan.items[1].id,'A11Y-001');assert.equal(plan.items[1].phase,1);assert.ok(plan.items[2].verification.includes('decorative'));
assert.ok(plan.note.includes('not a compliance certification'));assert.ok(plan.items.every(i=>i.occurrences===accessibilitySample.find(f=>f.id===i.id)!.occurrences));
const single=planAccessibility([{...findingDefaults,id:'1',issue:'custom barrier'}]);assert.equal(single.items[0].phase,4);assert.ok(!single.items[0].leverage.includes('many'));
assert.throws(()=>planAccessibility([]));assert.throws(()=>planAccessibility([{...findingDefaults,id:'1',issue:'x',dependency:'missing'}]));assert.throws(()=>planAccessibility([{...findingDefaults,id:'1',issue:'x',dependency:'2'},{...findingDefaults,id:'2',issue:'y',dependency:'1'}]));assert.throws(()=>planAccessibility([{...findingDefaults,id:'1',issue:'x',occurrences:-1}]));
assert.equal(planAccessibility([{...findingDefaults,id:'1',issue:'x',impact:'prevents',severity:'low'}]).items[0].phase,1);
console.log('Accessibility plan tests passed: blockers, prerequisite promotion, cycles, supplied counts, verification and truthful boundaries.');
