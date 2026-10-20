import fs from 'node:fs';
import assert from 'node:assert/strict';
import { analyzeTrace, traceExamples } from '../src/components/toolbox/tools/otelTraceModel.ts';
const run = (v: any) => analyzeTrace(JSON.stringify(v));
const healthy = traceExamples['Healthy Web Trace'];
assert.equal(run(healthy).warn, 0);
assert.equal(run(healthy).fail, 0);
assert.ok(run(traceExamples['Broken Parent Trace']).findings.some(f => f.category === 'Structure' && f.level === 'WARN'));
assert.equal(run(traceExamples['Broken Parent Trace']).fail, 0);
assert.ok(run([{ ...healthy[0], endTimeUnixNano: '1600000000000000000' }]).fail);
assert.ok(run([{ ...healthy[0], resource: {} }]).findings.some(f => f.evidence === 'Missing service.name'));
assert.ok(run(traceExamples['Poor Naming Trace']).findings.some(f => f.category === 'Naming'));
const privacy = JSON.stringify(run(traceExamples['Privacy Leak']));
for (const value of ['fictional-demo-secret', 'fictional@example.invalid', 'fictional private message'])
    assert.ok(!privacy.includes(value));
const gen = run(traceExamples['GenAI Agent Trace']);
assert.equal(gen.fail, 0);
assert.equal(gen.warn, 0);
assert.ok(gen.findings.some(f => f.category === 'GenAI'));
assert.ok(!gen.findings.some(f => f.evidence.includes('prompt')));
assert.equal(run([healthy[0], { ...healthy[1], parentSpanId: '' }]).fail, 0);
assert.throws(() => analyzeTrace('{secret malformed'), /Invalid JSON/);
assert.throws(() => analyzeTrace(' '.repeat(200001)), /exceeds/);
let deep: any = {};
for (let i = 0; i < 30; i++)
    deep = { a: deep };
assert.throws(() => run(deep), /safety limit/);
assert.throws(() => run(Array.from({ length: 201 }, () => healthy[0])), /1–200/);
assert.ok(run([{ ...healthy[0], parentSpanId: healthy[0].spanId }]).findings.some(f => f.level === 'FAIL' && f.evidence.includes('cycle')));
assert.ok(run([healthy[0], healthy[0]]).findings.some(f => f.evidence.includes('Duplicate')));
assert.ok(run([{ ...healthy[0], startTimeUnixNano: 1700000000000000000 }]).findings.some(f => f.category === 'Time'));
const exact = run([{ ...healthy[0], endTimeUnixNano: '1700000000000000001' }]);
assert.equal(exact.tree[0].duration, .000001);
assert.equal(run({ resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'catalog' } }] }, scopeSpans: [{ spans: healthy.map(({ resource, ...s }) => s) }] }] }).warn, 0);
assert.equal(run({ spans: healthy }).fail, 0);
assert.equal(run(healthy[0]).fail, 0);
assert.ok(run([{ ...healthy[0], attributes: { 'http.response.status_code': 'bad' } }]).findings.some(f => f.category === 'Conventions'));
assert.ok(run([{ ...healthy[0], status: { code: 2 } }]).findings.some(f => f.category === 'Errors'));
const result = run([{ ...healthy[0], name: 'Bearer top-secret-value', resource: { 'service.name': 'password=hidden' }, attributes: { 'private.key': 'do-not-echo' } }]);
assert.ok(!JSON.stringify(result).includes('do-not-echo'));
assert.ok(!JSON.stringify(result).includes('top-secret-value'));
assert.ok(!JSON.stringify(result).includes('password=hidden'));
const source = fs.readFileSync('src/components/toolbox/tools/OpenTelemetryTraceDoctor.tsx', 'utf8');
assert.equal((source.match(/trackToolResult\(\)/g) ?? []).length, 1);
assert.ok(!/trackToolResult\([^)]*raw|localStorage|sessionStorage|fetch\(/.test(source));
assert.ok(run([{ ...healthy[0], startTimeUnixNano: '99999999999999999999' }]).findings.some(f => f.category === 'Time'));
assert.ok(run([{ ...healthy[0], attributes: [{ key: 'password', value: { stringValue: 'synthetic-only' } }] }]).findings.some(f => f.category === 'Privacy'));
assert.ok(run([{ ...healthy[0], startTimeUnixNano: undefined, endTimeUnixNano: undefined, startTime: '2024-02-30T00:00:00Z', endTime: '2024-03-01T00:00:00Z' }]).findings.some(f => f.category === 'Time'));
console.log('OpenTelemetry model tests PASS: formats, timing precision, structure, partial samples, masking, GenAI, conventions and bounded parsing.');

assert.throws(()=>run([{...healthy[0],attributes:Object.fromEntries(Array.from({length:101},(_,i)=>['field'+i,i]))}]),/100 attributes/);

const fakeAws='AKIA'+'A'.repeat(16);assert.ok(!JSON.stringify(run([{...healthy[0],name:fakeAws}])).includes(fakeAws));

assert.ok(run([{...healthy[0],parentSpanId:'0'}]).fail>0);
