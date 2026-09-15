export type RetryStrategy = 'immediate' | 'fixed' | 'exponential';
export type Idempotency = 'yes' | 'no' | 'unknown';
export interface RetryInputs { originalRps: number; failureRate: number; failureDuration: number; maxAttempts: number; strategy: RetryStrategy; initialDelay: number; multiplier: number; maxDelay: number; jitter: boolean; retryBudgetPercent: number; capacity: number; errorKind: 'transient' | 'non-retryable'; idempotency: Idempotency; }
export interface RetryTick { original: number; retry: number; total: number; }
const TICKS = 24;
const random = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
export function retryDelay(attempt: number, input: RetryInputs, seed: number): number {
  if (input.strategy === 'immediate') return 0;
  const base = input.strategy === 'fixed' ? input.initialDelay : Math.min(input.maxDelay, input.initialDelay * input.multiplier ** (attempt - 1));
  return Math.max(0, input.jitter ? Math.round(base * (0.35 + random(seed) * 0.65)) : Math.round(base));
}
export function simulateRetry(input: RetryInputs) {
  const ticks: RetryTick[] = Array.from({ length: TICKS }, () => ({ original: input.originalRps, retry: 0, total: input.originalRps }));
  let budget = input.originalRps * TICKS * input.retryBudgetPercent / 100;
  if (input.errorKind === 'transient') {
    for (let origin = 0; origin < input.failureDuration; origin++) {
      let at = origin;
      for (let attempt = 1; attempt < input.maxAttempts; attempt++) {
        const planned = input.originalRps * (input.failureRate / 100) ** attempt;
        if (planned < .1 || at >= input.failureDuration || budget <= 0) break;
        at += retryDelay(attempt, input, origin * 19 + attempt);
        if (at >= TICKS) break;
        const sent = Math.min(planned, budget);
        ticks[at].retry += sent;
        budget -= sent;
      }
    }
  }
  for (const tick of ticks) tick.total = tick.original + tick.retry;
  const totalOriginal = input.originalRps * TICKS;
  const totalRetry = ticks.reduce((sum, tick) => sum + tick.retry, 0);
  const peak = Math.max(...ticks.map((tick) => tick.total));
  const peakRetry = Math.max(...ticks.map((tick) => tick.retry));
  const pressure = peak > input.capacity * 1.25 ? 'severe' : peak > input.capacity ? 'risk' : 'low';
  return { ticks, totalOriginal, totalRetry, peak, peakRetry, amplification: peak / Math.max(input.originalRps, 1), budgetUsed: totalRetry / Math.max(totalOriginal * input.retryBudgetPercent / 100, 1), pressure };
}

export type RateAlgorithm = 'fixed' | 'sliding' | 'token-bucket';
export type TrafficPattern = 'steady' | 'short-burst' | 'sustained-overload' | 'retry-burst';
export interface RateInputs { rate: number; burst: number; algorithm: RateAlgorithm; pattern: TrafficPattern; rejectedRetry: boolean; retryDelay: number; retryAfter: boolean; }
export interface RateTick { incoming: number; retry: number; allowed: number; throttled: number; }
export function simulateRate(input: RateInputs) {
  const ticks: RateTick[] = Array.from({ length: TICKS }, () => ({ incoming: 0, retry: 0, allowed: 0, throttled: 0 }));
  const retries = Array.from({ length: TICKS }, () => 0);
  let tokens = input.burst; let previousAllowed = 0;
  for (let second = 0; second < TICKS; second++) {
    const base = input.pattern === 'steady' ? input.rate : input.pattern === 'short-burst' ? (second >= 4 && second <= 6 ? input.rate * 4 : input.rate) : input.pattern === 'sustained-overload' ? input.rate * 2 : (second === 4 ? input.rate * 4 : input.rate);
    const incoming = base + retries[second];
    ticks[second].incoming = incoming; ticks[second].retry = retries[second];
    let allowed = 0;
    if (input.algorithm === 'token-bucket') { tokens = Math.min(input.burst, tokens + input.rate); allowed = Math.min(incoming, tokens); tokens -= allowed; }
    else if (input.algorithm === 'sliding') { allowed = Math.min(incoming, Math.max(0, input.rate - previousAllowed * .5)); previousAllowed = allowed; }
    else allowed = Math.min(incoming, input.rate);
    const throttled = Math.max(0, incoming - allowed);
    ticks[second].allowed = allowed; ticks[second].throttled = throttled;
    if (input.rejectedRetry && throttled > 0) { const wait = input.retryAfter ? input.retryDelay : 1; if (second + wait < TICKS) retries[second + wait] += throttled; }
  }
  const sum = (field: keyof RateTick) => ticks.reduce((total, tick) => total + Number(tick[field]), 0);
  const totalIncoming = sum('incoming'); const totalAllowed = sum('allowed'); const totalThrottled = sum('throttled'); const totalRetry = sum('retry');
  return { ticks, totalIncoming, totalAllowed, totalThrottled, totalRetry, throttlePercent: totalThrottled / Math.max(totalIncoming, 1) * 100, peakIncoming: Math.max(...ticks.map((tick) => tick.incoming)), limitedSeconds: ticks.filter((tick) => tick.throttled > 0).length };
}