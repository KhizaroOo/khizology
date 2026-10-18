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

const decisionFor = (expectedMs, timeoutMs, retries = 0) => model.getDeadlineDecision(model.evaluateDeadlineChain({ deadlineMs: 1000, localWorkMs: 100, propagate: true, hops: [{ id: 'a', name: 'A', expectedMs, timeoutMs, retries, backoffMs: 100 }] }), 1000);
assert.equal(decisionFor(200, 300).status, 'fits');
assert.equal(decisionFor(850, 850).status, 'tight');
assert.equal(decisionFor(100, 400, 2).status, 'risk');
assert.match(decisionFor(100, 400, 2).what, /^At risk/, 'a fast expected path must not produce a reassuring overall headline when retries overcommit');
assert.equal(decisionFor(850, 850, 1).status, 'risk', 'retry exposure takes precedence over low headroom');
assert.equal(model.getDeadlineDecision(result, 1000).status, 'invalid', 'timeout inversion takes precedence over aggregate overcommit');
assert.equal(decisionFor(1000, 1500, 2).status, 'missed', 'expected miss takes precedence over inversion and retry exposure');
const localRetryConflict = model.evaluateDeadlineChain({ deadlineMs: 1000, localWorkMs: 100, propagate: true, hops: [{ id: 'a', name: 'A', expectedMs: 600, timeoutMs: 50, retries: 0, backoffMs: 0 }, { id: 'b', name: 'B', expectedMs: 100, timeoutMs: 200, retries: 1, backoffMs: 0 }] });
assert.equal(localRetryConflict.overcommit, false);
assert.equal(model.getDeadlineDecision(localRetryConflict, 1000).status, 'risk', 'a per-hop retry conflict remains visible even if aggregate configured exposure fits');
console.log('Timeout chain deadline model tests passed.');
