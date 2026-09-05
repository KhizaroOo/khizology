export interface WebhookSettings {
  eventsPerSecond: number;
  failurePercent: number;
  retryLimit: number;
  retryDelaySeconds: number;
  retryPolicy: 'fixed' | 'exponential';
  durationSeconds: number;
  idempotent: boolean;
  timeoutMs: number;
  processingMs: number;
  duplicatePercent: number;
  maxAgeSeconds: number;
  recoveryEnabled: boolean;
  recoveryAtSeconds: number;
}

export const DEFAULT_WEBHOOK_SETTINGS: WebhookSettings = {
  eventsPerSecond: 8, failurePercent: 40, retryLimit: 3, retryDelaySeconds: 1,
  retryPolicy: 'exponential', durationSeconds: 45, idempotent: false,
  timeoutMs: 1000, processingMs: 250, duplicatePercent: 5, maxAgeSeconds: 60,
  recoveryEnabled: true, recoveryAtSeconds: 20,
};

export const WEBHOOK_LIMITS = { eventsPerSecond: 50, durationSeconds: 120, retryLimit: 6, originalEvents: 6000 } as const;
export type WebhookAttemptKind = 'initial' | 'retry' | 'redelivery';
export type WebhookAttemptOutcome = 'acknowledged' | 'failed' | 'timed-out' | 'in-flight';
export type WebhookEventStatus = 'acknowledged' | 'exhausted' | 'pending';
type ExhaustionReason = 'retry-limit' | 'age-limit';

interface PlannedAttempt {
  kind: WebhookAttemptKind;
  retryNumber: number;
  startedAt: number;
  completedAt: number;
  decisionAt: number;
  healthy: boolean;
  plannedOutcome: Exclude<WebhookAttemptOutcome, 'in-flight'>;
}

export interface WebhookAttempt extends PlannedAttempt {
  outcome: WebhookAttemptOutcome;
  receiverResult: 'side-effect' | 'suppressed' | 'failed' | 'processing';
  lateAcknowledgement: boolean;
  duplicateSideEffect: boolean;
}

export interface WebhookEvent {
  id: number;
  createdAt: number;
  attempts: WebhookAttempt[];
  status: WebhookEventStatus;
  acknowledgedAt: number | null;
  processedAt: number | null;
  terminalAt: number | null;
  exhaustionReason: ExhaustionReason | null;
  nextAttemptAt: number | null;
  pendingReason: string | null;
  completedProcessing: number;
  sideEffects: number;
  duplicateSideEffects: number;
  suppressedEffects: number;
}

export interface WebhookTimePoint { time: number; awaitingAcknowledgement: number }

export interface WebhookSimulation {
  settings: WebhookSettings;
  events: WebhookEvent[];
  timeline: WebhookTimePoint[];
  originalEvents: number;
  totalAttempts: number;
  successfulDeliveries: number;
  failedResponses: number;
  timedOutAttempts: number;
  inFlightAttempts: number;
  retries: number;
  providerRedeliveries: number;
  repeatDeliveries: number;
  acknowledgedEvents: number;
  exhaustedEvents: number;
  ageExhaustedEvents: number;
  retryExhaustedEvents: number;
  pendingEvents: number;
  uniqueProcessedEvents: number;
  successfulProcessingCompletions: number;
  sideEffects: number;
  duplicateSideEffects: number;
  suppressedEffects: number;
  lateAcknowledgements: number;
  processedWithoutAcknowledgement: number;
  delayedEvents: number;
  averageAcknowledgementDelay: number;
  peakAwaitingAcknowledgement: number;
  duplicateEffectsWithoutIdempotency: number;
}

const EPSILON = 1e-8;
const finite = (value: number, fallback: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

export function normalizeWebhookSettings(input: WebhookSettings): WebhookSettings {
  const duration = finite(input.durationSeconds, DEFAULT_WEBHOOK_SETTINGS.durationSeconds, 1, WEBHOOK_LIMITS.durationSeconds);
  return {
    eventsPerSecond: Math.floor(finite(input.eventsPerSecond, 8, 0, WEBHOOK_LIMITS.eventsPerSecond)),
    failurePercent: finite(input.failurePercent, 40, 0, 100),
    retryLimit: Math.floor(finite(input.retryLimit, 3, 0, WEBHOOK_LIMITS.retryLimit)),
    retryDelaySeconds: finite(input.retryDelaySeconds, 1, .1, 30),
    retryPolicy: input.retryPolicy === 'fixed' ? 'fixed' : 'exponential',
    durationSeconds: duration,
    idempotent: Boolean(input.idempotent),
    timeoutMs: finite(input.timeoutMs, 1000, 50, 10000),
    processingMs: finite(input.processingMs, 250, 10, 10000),
    duplicatePercent: finite(input.duplicatePercent, 5, 0, 100),
    maxAgeSeconds: finite(input.maxAgeSeconds, 60, .1, 240),
    recoveryEnabled: Boolean(input.recoveryEnabled),
    recoveryAtSeconds: finite(input.recoveryAtSeconds, 20, 0, duration),
  };
}

/** A fixed keyed draw: changing idempotency never changes the delivery sample. */
function randomFor(eventId: number, channel: number): number {
  let value = Math.imul(eventId + 1, 374761393) ^ Math.imul(channel + 831, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function webhookRetryDelays(settings: WebhookSettings): number[] {
  const safe = normalizeWebhookSettings(settings);
  return Array.from({ length: safe.retryLimit }, (_, index) => Math.min(60, safe.retryDelaySeconds * (safe.retryPolicy === 'exponential' ? 2 ** index : 1)));
}

function planAttempt(eventId: number, retryNumber: number, kind: WebhookAttemptKind, startedAt: number, settings: WebhookSettings): PlannedAttempt {
  const failureRate = settings.recoveryEnabled && startedAt + EPSILON >= settings.recoveryAtSeconds ? 0 : settings.failurePercent / 100;
  const healthy = randomFor(eventId, kind === 'redelivery' ? 999 : retryNumber + 10) >= failureRate;
  const latency = settings.processingMs / 1000;
  const timeout = settings.timeoutMs / 1000;
  return {
    kind, retryNumber, startedAt, healthy,
    completedAt: startedAt + latency,
    decisionAt: startedAt + Math.min(latency, timeout),
    plannedOutcome: latency > timeout + EPSILON ? 'timed-out' : healthy ? 'acknowledged' : 'failed',
  };
}

/** Events are independent; each has at most seven main attempts and one extra provider copy. */
function simulateEvent(id: number, createdAt: number, settings: WebhookSettings, retryDelays: number[]): WebhookEvent {
  const deadline = createdAt + settings.maxAgeSeconds;
  const horizon = settings.durationSeconds;
  const planned: PlannedAttempt[] = [];
  const hasRedelivery = randomFor(id, 1) < settings.duplicatePercent / 100 && createdAt + 1 <= deadline + EPSILON;
  const redelivery = hasRedelivery ? planAttempt(id, 0, 'redelivery', createdAt + 1, settings) : null;
  const redeliveryAckAt = redelivery?.plannedOutcome === 'acknowledged' ? redelivery.decisionAt : Infinity;
  if (redelivery) planned.push(redelivery);
  let nextStart = createdAt;
  let mainTerminalAt: number | null = null;
  let exhaustionReason: ExhaustionReason | null = null;

  for (let retryNumber = 0; retryNumber <= settings.retryLimit; retryNumber += 1) {
    // An acknowledgement cancels queued main retries, but cannot undo an in-flight attempt.
    if (redeliveryAckAt <= nextStart + EPSILON) break;
    const attempt = planAttempt(id, retryNumber, retryNumber === 0 ? 'initial' : 'retry', nextStart, settings);
    planned.push(attempt);
    if (attempt.plannedOutcome === 'acknowledged' || redeliveryAckAt <= attempt.decisionAt + EPSILON) break;
    if (retryNumber >= settings.retryLimit) {
      mainTerminalAt = attempt.decisionAt;
      exhaustionReason = 'retry-limit';
      break;
    }
    nextStart = attempt.decisionAt + retryDelays[retryNumber];
    if (nextStart > deadline + EPSILON) {
      // Until the age window expires, this is pending, not an already failed event.
      mainTerminalAt = Math.max(deadline, attempt.decisionAt);
      exhaustionReason = 'age-limit';
      break;
    }
  }

  planned.sort((a, b) => a.startedAt - b.startedAt || (a.kind === 'redelivery' ? 1 : -1));
  const acknowledgements = planned.filter((attempt) => attempt.plannedOutcome === 'acknowledged').map((attempt) => attempt.decisionAt);
  const firstAck = acknowledgements.length ? Math.min(...acknowledgements) : null;
  const terminalAt = firstAck === null ? Math.max(mainTerminalAt ?? deadline, redelivery?.decisionAt ?? 0) : null;
  const acknowledgedAt = firstAck !== null && firstAck <= horizon + EPSILON ? firstAck : null;
  const status: WebhookEventStatus = acknowledgedAt !== null ? 'acknowledged' : terminalAt !== null && terminalAt <= horizon + EPSILON ? 'exhausted' : 'pending';
  const visible = planned.filter((attempt) => attempt.startedAt <= horizon + EPSILON);
  const completed = visible.filter((attempt) => attempt.healthy && attempt.completedAt <= horizon + EPSILON).sort((a, b) => a.completedAt - b.completedAt || a.startedAt - b.startedAt);
  const firstCompletion = completed[0] ?? null;
  const rawRepeatedEffects = Math.max(0, completed.length - 1);
  const attempts: WebhookAttempt[] = visible.map((attempt) => {
    const completedByEnd = attempt.completedAt <= horizon + EPSILON;
    return {
      ...attempt,
      outcome: attempt.decisionAt <= horizon + EPSILON ? attempt.plannedOutcome : 'in-flight',
      receiverResult: !completedByEnd ? 'processing' : !attempt.healthy ? 'failed' : settings.idempotent && attempt !== firstCompletion ? 'suppressed' : 'side-effect',
      lateAcknowledgement: completedByEnd && attempt.healthy && attempt.plannedOutcome === 'timed-out',
      duplicateSideEffect: completedByEnd && attempt.healthy && !settings.idempotent && attempt !== firstCompletion,
    };
  });
  const futureAttempt = planned.find((attempt) => attempt.startedAt > horizon + EPSILON);
  const pendingReason = status !== 'pending' ? null : attempts.some((attempt) => attempt.outcome === 'in-flight')
    ? 'A delivery attempt is still awaiting its response or timeout.'
    : futureAttempt ? `A ${futureAttempt.kind === 'redelivery' ? 'provider redelivery' : 'retry'} is scheduled after the observation window.`
      : 'The retry-age window has not expired yet.';
  return {
    id, createdAt, attempts, status, acknowledgedAt, terminalAt, exhaustionReason: status === 'exhausted' ? exhaustionReason : null,
    nextAttemptAt: futureAttempt?.startedAt ?? null, pendingReason,
    processedAt: firstCompletion?.completedAt ?? null,
    completedProcessing: completed.length,
    sideEffects: settings.idempotent ? Math.min(1, completed.length) : completed.length,
    duplicateSideEffects: settings.idempotent ? 0 : rawRepeatedEffects,
    suppressedEffects: settings.idempotent ? rawRepeatedEffects : 0,
  };
}

/** Exact integer event accounting within a bounded observation window; no expected-value multiplication. */
export function simulateWebhookDelivery(input: WebhookSettings): WebhookSimulation {
  const settings = normalizeWebhookSettings(input);
  const count = Math.min(WEBHOOK_LIMITS.originalEvents, Math.floor(settings.eventsPerSecond * settings.durationSeconds));
  const delays = webhookRetryDelays(settings);
  const events: WebhookEvent[] = Array.from({ length: count }, (_, index) => simulateEvent(index + 1, index / Math.max(settings.eventsPerSecond, 1), settings, delays));
  const result: WebhookSimulation = {
    settings, events, timeline: [], originalEvents: count, totalAttempts: 0, successfulDeliveries: 0,
    failedResponses: 0, timedOutAttempts: 0, inFlightAttempts: 0, retries: 0, providerRedeliveries: 0,
    repeatDeliveries: 0, acknowledgedEvents: 0, exhaustedEvents: 0, ageExhaustedEvents: 0, retryExhaustedEvents: 0,
    pendingEvents: 0, uniqueProcessedEvents: 0, successfulProcessingCompletions: 0, sideEffects: 0,
    duplicateSideEffects: 0, suppressedEffects: 0, lateAcknowledgements: 0, processedWithoutAcknowledgement: 0,
    delayedEvents: 0, averageAcknowledgementDelay: 0, peakAwaitingAcknowledgement: 0, duplicateEffectsWithoutIdempotency: 0,
  };
  let acknowledgementDelaySum = 0;
  const backlogChanges: { time: number; delta: number }[] = [];
  for (const event of events) {
    result.totalAttempts += event.attempts.length;
    result.repeatDeliveries += Math.max(0, event.attempts.length - 1);
    result.successfulProcessingCompletions += event.completedProcessing;
    result.sideEffects += event.sideEffects;
    result.duplicateSideEffects += event.duplicateSideEffects;
    result.suppressedEffects += event.suppressedEffects;
    result.duplicateEffectsWithoutIdempotency += Math.max(0, event.completedProcessing - 1);
    if (event.processedAt !== null) {
      result.uniqueProcessedEvents += 1;
      if (event.acknowledgedAt === null) result.processedWithoutAcknowledgement += 1;
    }
    if (event.status === 'acknowledged') {
      result.acknowledgedEvents += 1;
      const delay = event.acknowledgedAt! - event.createdAt;
      acknowledgementDelaySum += delay;
      if (delay > settings.processingMs / 1000 + EPSILON) result.delayedEvents += 1;
    } else if (event.status === 'exhausted') {
      result.exhaustedEvents += 1;
      if (event.exhaustionReason === 'age-limit') result.ageExhaustedEvents += 1;
      else result.retryExhaustedEvents += 1;
    } else result.pendingEvents += 1;
    for (const attempt of event.attempts) {
      if (attempt.kind === 'retry') result.retries += 1;
      if (attempt.kind === 'redelivery') result.providerRedeliveries += 1;
      if (attempt.outcome === 'acknowledged') result.successfulDeliveries += 1;
      else if (attempt.outcome === 'failed') result.failedResponses += 1;
      else if (attempt.outcome === 'timed-out') result.timedOutAttempts += 1;
      else result.inFlightAttempts += 1;
      if (attempt.lateAcknowledgement) result.lateAcknowledgements += 1;
    }
    backlogChanges.push({ time: event.createdAt, delta: 1 });
    if (event.acknowledgedAt !== null) backlogChanges.push({ time: event.acknowledgedAt, delta: -1 });
    else if (event.status === 'exhausted' && event.terminalAt !== null) backlogChanges.push({ time: event.terminalAt, delta: -1 });
  }
  result.averageAcknowledgementDelay = result.acknowledgedEvents ? acknowledgementDelaySum / result.acknowledgedEvents : 0;
  backlogChanges.sort((a, b) => a.time - b.time);
  let currentBacklog = 0;
  let changeIndex = 0;
  const pointCount = Math.ceil(settings.durationSeconds);
  for (let point = 0; point <= pointCount; point += 1) {
    const time = settings.durationSeconds * point / pointCount;
    while (changeIndex < backlogChanges.length && backlogChanges[changeIndex].time <= time + EPSILON) {
      const changeTime = backlogChanges[changeIndex].time;
      let combinedDelta = 0;
      while (changeIndex < backlogChanges.length && Math.abs(backlogChanges[changeIndex].time - changeTime) <= EPSILON) {
        combinedDelta += backlogChanges[changeIndex].delta;
        changeIndex += 1;
      }
      currentBacklog += combinedDelta;
      result.peakAwaitingAcknowledgement = Math.max(result.peakAwaitingAcknowledgement, currentBacklog);
    }
    result.timeline.push({ time, awaitingAcknowledgement: currentBacklog });
  }
  return result;
}
