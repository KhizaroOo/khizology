import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync('src/components/toolbox/tools/SLAChainVisualizer.tsx', 'utf8');
const modelSource = source
  .slice(source.indexOf('export interface ReliabilityDependency'), source.indexOf('const DEFAULT_DEPS'))
  .replace("import { clamp } from '../shared/mathHelpers';", '')
  .replace('export interface ReliabilityDependency', 'interface ReliabilityDependency')
  .replace('export interface ReliabilityPlan', 'interface ReliabilityPlan')
  .replace('export function formatAvailability', 'function formatAvailability')
  .replace('export function formatDuration', 'function formatDuration')
  .replace('export function evaluateReliabilityPlan', 'function evaluateReliabilityPlan');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const model = await import('data:text/javascript,' + encodeURIComponent('const clamp = ' + clamp.toString() + ';\n' + stripTypeScriptTypes(modelSource) + '\nexport { evaluateReliabilityPlan };'));

const plan = { targetPct: 99.9, dependencies: [{ id: 'a', name: 'API', availabilityPct: 99.9, required: true }, { id: 'b', name: 'Optional', availabilityPct: 90, required: false }, { id: 'c', name: 'DB', availabilityPct: 99.9, required: true }] };
const result = model.evaluateReliabilityPlan(plan);
assert.ok(Math.abs(result.modeledPct - 99.8001) < 1e-9, 'required dependencies must multiply under the simplified independence model');
assert.equal(result.optional.length, 1, 'optional dependency must not gate the modeled hard path');
assert.equal(result.contributor.id, 'a', 'lowest required availability is a contributor, not a root-cause claim');
assert.equal(result.meetsTarget, false, 'target comparison must use modeled availability');
assert.ok(result.alternativePct > result.modeledPct, 'optional-path comparison must only remove one required dependency as an explicit assumption');
console.log('SLA chain reliability model tests passed.');
