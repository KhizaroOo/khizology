import assert from 'node:assert/strict';
import { simulateRate, simulateRetry, type RateInputs, type RetryInputs } from '../src/components/toolbox/tools/retryRateModels.ts';
const retry: RetryInputs = { originalRps: 100, failureRate: 80, failureDuration: 6, maxAttempts: 5, strategy: 'immediate', initialDelay: 1, multiplier: 2, maxDelay: 8, jitter: false, retryBudgetPercent: 100, capacity: 180, errorKind: 'transient', idempotency: 'yes' };
assert.equal(simulateRetry({ ...retry, failureRate: 0 }).totalRetry, 0, 'zero failures must not retry');
assert.equal(simulateRetry({ ...retry, errorKind: 'non-retryable' }).totalRetry, 0, 'non-retryable failures must not retry');
assert.equal(simulateRetry({ ...retry, retryBudgetPercent: 0 }).totalRetry, 0, 'zero retry budget must block retry work');
assert.ok(simulateRetry(retry).peak >= simulateRetry({ ...retry, strategy: 'exponential', jitter: true, maxAttempts: 3, retryBudgetPercent: 25 }).peak, 'bounded jitter policy should not create a higher peak in the reference outage');
for (const [peak, verdict] of [[89, 'low'], [90, 'near'], [99, 'near'], [100, 'near'], [101, 'risk'], [125, 'risk'], [126, 'severe']] as const) {
  assert.equal(simulateRetry({ ...retry, originalRps: peak, capacity: 100, maxAttempts: 1 }).pressure, verdict, `Verdict at ${peak}% capacity`);
}
const rate: RateInputs = { rate: 20, burst: 40, algorithm: 'token-bucket', pattern: 'steady', rejectedRetry: false, retryDelay: 3, retryAfter: true };
assert.equal(simulateRate(rate).totalThrottled, 0, 'traffic at the configured rate must pass');
assert.ok(simulateRate({ ...rate, pattern: 'sustained-overload' }).totalThrottled > 0, 'sustained overload must throttle');
const rejected = simulateRate({ ...rate, pattern: 'retry-burst', rejectedRetry: true });
assert.ok(rejected.totalRetry > 0 && rejected.totalIncoming > simulateRate({ ...rate, pattern: 'retry-burst', rejectedRetry: false }).totalIncoming, 'rejected request retries must create a later traffic wave');
console.log('Retry and rate-limit model tests passed.');
