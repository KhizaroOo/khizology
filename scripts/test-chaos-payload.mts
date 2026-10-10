import assert from 'node:assert/strict';
import {buildChaosPack,chaosCategories} from '../src/components/toolbox/tools/chaosPayloadModel.ts';
const raw='{"name":"Ada","age":32,"enabled":true,"tags":["a","b"],"profile":{"timezone":"UTC"}}';
const pack=buildChaosPack(raw,[...chaosCategories],40);assert.ok(pack.cases.length<=40);assert.ok(pack.cases.length>20);assert.ok(pack.limited);assert.equal(new Set(pack.cases.map(c=>c.id)).size,pack.cases.length);
for(const c of pack.cases){assert.doesNotThrow(()=>JSON.stringify(c.payload));assert.notEqual(JSON.stringify(c.payload),JSON.stringify(JSON.parse(raw)));}
assert.ok(buildChaosPack(raw,['Arrays']).cases.every(c=>c.category==='Arrays'));
assert.ok(buildChaosPack('[true,false]',['Booleans']).cases.some(c=>c.path==='$[0]'));
assert.throws(()=>buildChaosPack('42',['Numbers']));assert.throws(()=>buildChaosPack('{bad',['Objects']));assert.throws(()=>buildChaosPack(raw,[]));assert.throws(()=>buildChaosPack(raw,['Numbers'],41));assert.throws(()=>buildChaosPack('{"n":1e400}',['Numbers']));
assert.throws(()=>buildChaosPack('{"n":9007199254740993}',['Numbers']));
const proto=buildChaosPack('{"__proto__":{"x":1},"constructor":false}',['Presence','Objects'],40);assert.equal(({} as {x?:number}).x,undefined);assert.ok(proto.cases.length>0);
assert.equal(buildChaosPack('{"a":1}',['Arrays']).cases.length,0);
assert.throws(()=>buildChaosPack(JSON.stringify(Array(2001).fill(1)),['Numbers']));
assert.ok(buildChaosPack(JSON.stringify({s:'x'.repeat(99000)}),['Strings'],40).characters<=2000000);
console.log('Chaos tests passed: typed cases, nested paths, root arrays, bounds, invalid inputs, finite numbers and prototype safety.');
