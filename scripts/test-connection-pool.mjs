import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const component = fs.readFileSync(new URL('../src/components/toolbox/tools/ConnectionPoolSimulator.tsx', import.meta.url), 'utf8');
const start = component.indexOf('const TICKS');
const end = component.indexOf('/** Smallest pool size');
assert.ok(start >= 0 && end > start, 'Could not isolate the connection-pool model.');
const source = `
const safeNumber = (value, fallback = 0) => { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const safeDiv = (numerator, denominator, fallback = 0) => denominator === 0 ? fallback : numerator / denominator;
${component.slice(start, end)}
`;
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { simulate, calculateConnectionBudget } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

const healthy = simulate(10, 25, 100, 3000, 0, 0, 25);
assert.equal(healthy.maxWaiting, 0, 'traffic below capacity must not queue');
const exact = simulate(10, 100, 100, 3000, 0, 0, 100);
assert.equal(exact.maxWaiting, 0, 'exact pool capacity must serve without an artificial queue');
const saturated = simulate(5, 100, 500, 50000, 0, 0, 100);
assert.ok(saturated.maxWaiting > 0 && saturated.exhaustionEvents > 0, 'saturation must create a wait queue only after slots are busy');
const timeout = simulate(5, 100, 500, 100, 0, 0, 100);
assert.ok(timeout.totalTimedOut > 0, 'pool wait timeout must drop callers that waited too long');
const larger = simulate(20, 100, 500, 50000, 0, 0, 100);
assert.ok(larger.maxWaiting < saturated.maxWaiting, 'a larger pool must reduce modeled waiting for the same workload');
const burst = simulate(10, 10, 100, 3000, 0, 2, 150);
assert.equal(burst.ticks.at(-1).waiting, 0, 'a bounded burst must be able to recover when normal capacity exceeds steady demand');
const budget = calculateConnectionBudget(10, 20, 180, 30);
assert.deepEqual(budget, { instances: 10, poolSize: 20, maxConnections: 180, headroom: 30, potentialAppConnections: 200, availableBudget: 150, remainingBudget: -50, exceedsBudget: true }, 'scale-out budget must multiply pool capacity and retain headroom');
const bounded = simulate(0, -1, 0, 0, -2, 999, 999);
assert.equal(bounded.ticks.length, 20, 'invalid and extreme inputs must remain bounded');
console.log('Connection pool model tests passed.');
