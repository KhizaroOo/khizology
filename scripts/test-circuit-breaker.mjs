import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const component = fs.readFileSync(
  new URL('../src/components/toolbox/tools/CircuitBreakerPlayground.tsx', import.meta.url),
  'utf8',
);
const start = component.indexOf('const REQUEST_COUNT');
const end = component.indexOf('const STATE_COLORS');
assert.ok(start >= 0 && end > start, 'Could not isolate the circuit-breaker model.');

const source = `
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
${component.slice(start, end)}
`;
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { simulate } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

const healthy = simulate(0, 3, 5, 1, 0);
assert.equal(healthy.rejected, 0, 'healthy dependency must not trip');
const belowThreshold = simulate(20, 10, 5, 1, 0);
assert.equal(belowThreshold.firstOpenedAt, null, 'a tolerant threshold must stay closed for the deterministic low-failure pattern');
const outage = simulate(100, 3, 5, 1, 0);
assert.ok(outage.rejected > 0 && outage.failed >= 3, 'full outage must open after the configured threshold and block calls');
assert.equal(outage.firstOpenedAt, 2, 'full outage must open immediately after the third failed request');
assert.ok(outage.probeRequests > 0, 'an open timeout must allow limited half-open recovery probes');
const off = simulate(100, 3, 5, 1, 0, false);
assert.equal(off.rejected, 0, 'breaker-off comparison must not block calls');
const recovered = simulate(100, 3, 5, 1, 24);
assert.ok(recovered.recoveryDetectedAt !== null, 'half-open probes must detect a configured recovery');
const tolerant = simulate(35, 8, 5, 1, 0);
assert.ok(tolerant.rejected <= simulate(35, 2, 5, 1, 0).rejected, 'a more tolerant threshold must not open earlier for the same deterministic pattern');
const bounded = simulate(100, -4, 999, 0, 999);
assert.equal(bounded.results.length, 60, 'extreme inputs must remain bounded to the fixed request timeline');
console.log('Circuit breaker model tests passed.');
