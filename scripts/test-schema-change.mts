import assert from 'node:assert/strict';
import {planSchema,schemaDefaults,schemaChanges,type SchemaChange} from '../src/components/toolbox/tools/schemaChangeModel.ts';
for(const change of Object.keys(schemaChanges) as SchemaChange[]){const r=planSchema({...schemaDefaults,change});assert.ok(r.phases.length>=3);for(const p of r.phases)for(const v of Object.values(p))assert.ok(v.length>5);}
const rename=planSchema(schemaDefaults);assert.deepEqual(rename.phases.map(p=>p.name),['Expand','Deploy compatibility','Backfill','Verify','Switch reads / writes','Observe','Contract']);
assert.ok(rename.phases.at(-1)!.rollback.includes('application rollback alone'));
assert.ok(planSchema({...schemaDefaults,change:'required'}).phases.at(-1)!.action.includes('required-value'));
assert.equal(planSchema({...schemaDefaults,change:'index'}).backfill,false);
assert.equal(planSchema({...schemaDefaults,change:'remove'}).phases[0].name,'Deploy compatibility');
assert.equal(planSchema({...schemaDefaults,change:'nullable',backfill:false}).backfill,false);
assert.ok(planSchema({...schemaDefaults,database:'postgres'}).databaseNote.includes('invalid indexes'));
assert.ok(planSchema({...schemaDefaults,database:'mysql'}).databaseNote.includes('metadata locks'));
assert.ok(planSchema({...schemaDefaults,overlap:false}).overlap);
assert.throws(()=>planSchema({...schemaDefaults,change:'invalid' as SchemaChange}));
console.log('Schema tests passed: nine changes, phased compatibility, validation, irreversible cleanup, backfill and database caveats.');
