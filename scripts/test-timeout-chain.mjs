import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync('src/components/toolbox/tools/TimeoutChainPlanner.tsx', 'utf8');
const modelSource = source
  .slice(source.indexOf('export interface DeadlineHop'), source.indexOf('const DEFAULT_HOPS'))
  .replace("import { clamp, formatNumber } from '../shared/mathHelpers';", '')
  .replace('export interface DeadlineHop', 'interface DeadlineHop')
  .replace('export interface DeadlinePlan', 'interface DeadlinePlan')
  .replace('export function evaluateDeadlineChain', 'function evaluateDeadlineChain');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const model = await import('data:text/javascript,' + encodeURIComponent('const clamp = ' + clamp.toString() + ';\n' + stripTypeScriptTypes(modelSource) + '\nexport { evaluateDeadlineChain };'));

const plan = { deadlineMs: 1000, localWorkMs: 350, propagate: true, hops: [{ id: 'a', name: 'A', expectedMs: 200, timeoutMs: 300, retries: 0, backoffMs: 0 }, { id: 'b', name: 'B', expectedMs: 200, timeoutMs: 1000, retries: 0, backoffMs: 0 }] };
const result = model.evaluateDeadlineChain(plan);
assert.equal(result.steps[0].remainingBefore, 650, 'local elapsed work must be deducted before the first child');
assert.equal(result.steps[1].remainingBefore, 450, 'serial child work must reduce the next child budget');
assert.equal(result.steps[1].effectiveTimeout, 450, 'propagation must cap effective child wait to remaining budget');
assert.equal(result.steps[1].inversion, true, 'configured timeout above remaining budget must be flagged');
assert.equal(result.deadlineMiss, false, 'expected latency and timeout ceiling must remain distinct');

const retry = model.evaluateDeadlineChain({ deadlineMs: 900, localWorkMs: 100, propagate: true, hops: [{ id: 'r', name: 'Retry', expectedMs: 150, timeoutMs: 300, retries: 2, backoffMs: 100 }] });
assert.equal(retry.steps[0].retryExposure, 1100, 'attempts and backoff must consume retry exposure');
assert.equal(retry.steps[0].retryFits, false, 'retry exposure must not reset or exceed the remaining deadline silently');
console.log('Timeout chain deadline model tests passed.');
