import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const input = fs.readFileSync('src/components/toolbox/tools/FanOutLatencySimulator.tsx', 'utf8');
const modelSource = input
  .slice(input.indexOf('export interface FanoutBranch'), input.indexOf('const PERCENTILE_TRIALS'))
  .replace("import { clamp } from '../shared/mathHelpers';", '')
  .replace('export interface FanoutBranch', 'interface FanoutBranch')
  .replace('export function simulateFanout', 'function simulateFanout')
  .replace('export function independentTailRisk', 'function independentTailRisk');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const model = await import('data:text/javascript,' + encodeURIComponent('const clamp = ' + clamp.toString() + ';\n' + stripTypeScriptTypes(modelSource) + '\nexport { simulateFanout, independentTailRisk };'));

const slowRequired = model.simulateFanout(4, 100, 0, true, 3, 600);
assert.equal(slowRequired.responseLatency, 600, 'parallel response must wait for its slowest required branch');
assert.equal(slowRequired.serialTotal, 900, 'serial comparison must sum branch latencies');
const slowOptional = model.simulateFanout(4, 100, 0, true, 3, 600, 3);
assert.equal(slowOptional.responseLatency, 100, 'optional branch must not gate the modeled response');
assert.equal(slowOptional.optionalCount, 1);
assert.ok(Math.abs(model.independentTailRisk(10, 2) - 0.19) < 1e-12, 'independent tail formula must be 1 - (1-f)^n');
assert.ok(model.independentTailRisk(5, 10) > model.independentTailRisk(5, 2), 'more independent branches amplify tail-event chance');
console.log('Fan-out latency model tests passed.');

