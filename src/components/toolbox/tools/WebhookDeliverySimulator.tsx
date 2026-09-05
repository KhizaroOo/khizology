import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import Metric from '../shared/Metric';
import PresetBar from '../shared/PresetBar';
import RangeControl from '../shared/RangeControl';
import ResultPanel from '../shared/ResultPanel';
import VisualizationContainer from '../shared/VisualizationContainer';
import Warning from '../shared/Warning';
import { formatNumber } from '../shared/mathHelpers';
import { DEFAULT_WEBHOOK_SETTINGS, simulateWebhookDelivery, webhookRetryDelays } from './webhookDeliveryModel';
import type { WebhookAttempt, WebhookEvent, WebhookSettings, WebhookSimulation } from './webhookDeliveryModel';

const ACCENT = '#F7933C';
const COLORS = { good: '#22c55e', bad: '#ef4444', pending: '#6CA6FF', retry: '#F7933C' };
const PRESETS: { label: string; values: WebhookSettings }[] = [
  { label: 'Healthy Receiver', values: { ...DEFAULT_WEBHOOK_SETTINGS, eventsPerSecond: 5, failurePercent: 0, durationSeconds: 30, idempotent: true, timeoutMs: 2000, processingMs: 150, duplicatePercent: 0, recoveryEnabled: false } },
  { label: 'Partial Outage', values: { ...DEFAULT_WEBHOOK_SETTINGS } },
  { label: 'Receiver Down', values: { ...DEFAULT_WEBHOOK_SETTINGS, eventsPerSecond: 5, failurePercent: 100, durationSeconds: 30, duplicatePercent: 0, maxAgeSeconds: 15, recoveryEnabled: false } },
  { label: 'Duplicate Delivery Risk', values: { ...DEFAULT_WEBHOOK_SETTINGS, eventsPerSecond: 6, failurePercent: 0, durationSeconds: 30, idempotent: false, timeoutMs: 300, processingMs: 800, duplicatePercent: 35, recoveryEnabled: false } },
];

const bodyStyle: CSSProperties = { fontSize: '.78rem', color: 'var(--k-text-muted)', lineHeight: 1.55 };
const labelStyle: CSSProperties = { display: 'block', fontFamily: "'Poppins', sans-serif", fontSize: '.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--k-text-muted)', marginBottom: '.4rem' };
const buttonStyle: CSSProperties = { border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)', borderRadius: '.5rem', padding: '.45rem .75rem', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '.73rem', fontWeight: 700 };
const selectStyle: CSSProperties = { width: '100%', background: 'var(--k-bg)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', padding: '.65rem .75rem', borderRadius: '.5rem', fontSize: '.82rem', fontFamily: "'Mulish', sans-serif", minWidth: 0 };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '1.1rem' };
const seconds = (value: number) => `${formatNumber(value, value < 10 ? 2 : 1)}s`;
const attemptName = (attempt: WebhookAttempt) => attempt.kind === 'initial' ? 'Initial' : attempt.kind === 'redelivery' ? 'Extra copy' : `Retry ${attempt.retryNumber}`;
const outcomeName = (attempt: WebhookAttempt) => attempt.outcome === 'acknowledged' ? '2xx acknowledged' : attempt.outcome === 'failed' ? '5xx response' : attempt.outcome === 'timed-out' ? 'Timed out' : 'In flight';
const outcomeColor = (attempt: WebhookAttempt) => attempt.outcome === 'acknowledged' ? COLORS.good : attempt.outcome === 'failed' ? COLORS.bad : attempt.outcome === 'timed-out' ? COLORS.retry : COLORS.pending;

function receiverLabel(attempt: WebhookAttempt): string {
  if (attempt.receiverResult === 'processing') return 'Processing beyond this window';
  if (attempt.receiverResult === 'failed') return 'Failed before a side effect';
  if (attempt.receiverResult === 'suppressed') return 'Duplicate effect suppressed';
  return attempt.duplicateSideEffect ? 'Repeated side effect' : 'First side effect';
}

function BacklogChart({ result }: { result: WebhookSimulation }) {
  const width = 660;
  const height = 220;
  const left = 46;
  const top = 18;
  const plotWidth = width - left - 18;
  const plotHeight = height - top - 36;
  const max = Math.max(1, result.peakAwaitingAcknowledgement);
  const x = (time: number) => left + time / result.settings.durationSeconds * plotWidth;
  const y = (value: number) => top + plotHeight - value / max * plotHeight;
  const line = result.timeline.map((point, index) => `${index ? 'L' : 'M'}${x(point.time)},${y(point.awaitingAcknowledgement)}`).join(' ');
  const area = `${line} L${x(result.settings.durationSeconds)},${y(0)} L${x(0)},${y(0)} Z`;
  const recovery = result.settings.recoveryEnabled && result.settings.recoveryAtSeconds < result.settings.durationSeconds;
  return (
    <VisualizationContainer minHeight={0}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Events awaiting acknowledgement over ${result.settings.durationSeconds} seconds. Peak ${result.peakAwaitingAcknowledgement}; ${result.pendingEvents} still pending at the end.${recovery ? ` Receiver failure rate becomes zero at ${result.settings.recoveryAtSeconds} seconds.` : ''}`} style={{ width: '100%', height: 'auto', maxWidth: '760px' }}>
        {[0, .5, 1].map((fraction) => <g key={fraction}>
          <line x1={left} x2={width - 18} y1={y(max * fraction)} y2={y(max * fraction)} stroke="var(--k-border)" strokeDasharray="3 4" />
          <text x={left - 8} y={y(max * fraction) + 4} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">{formatNumber(max * fraction)}</text>
        </g>)}
        <path d={area} fill={COLORS.pending} opacity=".14" />
        <path d={line} fill="none" stroke={COLORS.pending} strokeWidth="2.5" />
        {recovery && <g>
          <line x1={x(result.settings.recoveryAtSeconds)} x2={x(result.settings.recoveryAtSeconds)} y1={top} y2={y(0)} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={Math.min(width - 110, x(result.settings.recoveryAtSeconds) + 5)} y={top + 10} fontSize="10" fill={ACCENT}>Receiver recovers</text>
        </g>}
        {[0, .25, .5, .75, 1].map((fraction) => <text key={fraction} x={x(result.settings.durationSeconds * fraction)} y={height - 13} fontSize="10" fill="var(--k-text-muted)" textAnchor="middle">{formatNumber(result.settings.durationSeconds * fraction, 1)}s</text>)}
      </svg>
    </VisualizationContainer>
  );
}

function EventTimeline({ event, duration }: { event: WebhookEvent; duration: number }) {
  const width = 660;
  const left = 92;
  const right = 22;
  const height = 42 + event.attempts.length * 40;
  const latest = Math.max(...event.attempts.map((attempt) => attempt.completedAt), event.nextAttemptAt ?? event.createdAt);
  const span = Math.max(.05, Math.min(duration, latest) - event.createdAt);
  const x = (absolute: number) => left + Math.max(0, Math.min(1, (absolute - event.createdAt) / span)) * (width - left - right);
  return (
    <VisualizationContainer minHeight={0}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Event ${event.id}: ${event.attempts.length} delivery attempts shown. Circles show provider response or timeout; diamonds show receiver completion. Dashed segments continue processing after a timeout. Details are listed below.`} style={{ width: '100%', height: 'auto' }}>
        {event.attempts.map((attempt, index) => {
          const y = 20 + index * 40;
          const receiverDone = attempt.completedAt <= duration + 1e-8;
          const color = outcomeColor(attempt);
          const receiverColor = attempt.duplicateSideEffect ? COLORS.bad : attempt.receiverResult === 'suppressed' ? COLORS.pending : attempt.receiverResult === 'side-effect' ? COLORS.good : 'var(--k-text-muted)';
          return <g key={`${attempt.kind}:${attempt.retryNumber}`}>
            <text x={left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="var(--k-text-muted)">{attemptName(attempt)}</text>
            <line x1={x(attempt.startedAt)} x2={x(attempt.decisionAt)} y1={y} y2={y} stroke={color} strokeWidth="3" />
            <circle cx={x(attempt.startedAt)} cy={y} r="3" fill="var(--k-text)" />
            <circle cx={x(attempt.decisionAt)} cy={y} r="5" fill={attempt.outcome === 'in-flight' ? 'var(--k-bg)' : color} stroke={color} strokeWidth="1.5" />
            {attempt.completedAt > attempt.decisionAt + 1e-8 && <line x1={x(attempt.decisionAt)} x2={x(attempt.completedAt)} y1={y} y2={y} stroke={receiverColor} strokeWidth="2" strokeDasharray="4 3" />}
            {receiverDone && <path d={`M${x(attempt.completedAt)},${y - 7} l5,7 l-5,7 l-5,-7 Z`} fill={receiverColor} stroke="var(--k-bg)" strokeWidth="1" />}
            <text x={Math.min(width - 110, x(attempt.startedAt))} y={y + 17} fontSize="8.5" fill={color}>{outcomeName(attempt)}{attempt.lateAcknowledgement ? ' · late completion' : ''}</text>
          </g>;
        })}
        {[0, .5, 1].map((fraction) => <text key={fraction} x={left + fraction * (width - left - right)} y={height - 5} textAnchor="middle" fontSize="10" fill="var(--k-text-muted)">+{seconds(span * fraction)}</text>)}
      </svg>
    </VisualizationContainer>
  );
}

export default function WebhookDeliverySimulator() {
  const [settings, setSettings] = useState<WebhookSettings>({ ...DEFAULT_WEBHOOK_SETTINGS });
  const [activePreset, setActivePreset] = useState<string | null>('Partial Outage');
  const [selectedEventId, setSelectedEventId] = useState(1);
  const result = useMemo(() => simulateWebhookDelivery(settings), [settings]);
  const retryDelays = useMemo(() => webhookRetryDelays(settings), [settings]);
  const selectedEvent = result.events[Math.min(Math.max(selectedEventId - 1, 0), result.events.length - 1)];
  const update = <K extends keyof WebhookSettings>(key: K, value: WebhookSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value, ...(key === 'durationSeconds' ? { recoveryAtSeconds: Math.min(current.recoveryAtSeconds, Number(value)) } : {}) }));
    setActivePreset(null);
  };
  const applyPreset = (values: WebhookSettings, label: string) => { setSettings({ ...values }); setActivePreset(label); setSelectedEventId(1); };
  const retryFailureCount = result.failedResponses + result.timedOutAttempts;
  const chance = result.originalEvents ? 100 * result.acknowledgedEvents / result.originalEvents : 0;
  const comparisonMax = Math.max(1, result.successfulProcessingCompletions);
  const firstTimeout = result.events.find((event) => event.attempts.some((attempt) => attempt.outcome === 'timed-out'));
  const firstRepeated = result.events.find((event) => event.completedProcessing > 1);
  const firstPending = result.events.find((event) => event.status === 'pending');
  const insight = result.duplicateSideEffects > 0 ? {
    what: `${formatNumber(result.duplicateSideEffects)} extra side effects from repeat deliveries`,
    why: 'A retry or extra provider copy can reach the same event more than once. Without an atomic idempotency check, every successful handler completion can repeat the business action.',
    tip: 'Turn on Idempotent Handler to compare. Where repeated actions are harmful, consider an atomic event-ID check tied to the side effect and a suitable retention period.',
  } : result.suppressedEffects > 0 ? {
    what: `${formatNumber(result.suppressedEffects)} duplicate side effects suppressed`,
    why: 'The delivery traffic is unchanged. The modeled idempotency gate allows one completed side effect per event ID, including concurrent and late completions.',
    tip: 'Check that event-ID recording and the effect are atomic in your real design. A separate “check then write” can still race.',
  } : result.processedWithoutAcknowledgement > 0 ? {
    what: `${formatNumber(result.processedWithoutAcknowledgement)} events processed without a timely acknowledgement`,
    why: 'The receiver can finish a side effect after the provider has timed out. The provider may retry even though the business action already happened.',
    tip: 'Review the acknowledgement timeout and processing budget. Depending on the workflow, acknowledge durable acceptance quickly and process asynchronously.',
  } : result.exhaustedEvents > 0 ? {
    what: `${formatNumber(result.exhaustedEvents)} events exhausted this retry policy`,
    why: 'These original events have no timely acknowledgement and no remaining scheduled attempt in this model. Pending events are counted separately.',
    tip: 'Compare retry limits and delays against your recovery point. Plan a dead-letter or manual replay path if losing an event is unacceptable.',
  } : result.pendingEvents > 0 ? {
    what: `${formatNumber(result.pendingEvents)} events are still pending at the window end`,
    why: 'Some attempts are in flight or waiting for their next retry or age limit. They are not labeled as exhausted just because the simulation stopped.',
    tip: 'Extend the simulation window or inspect a pending event to see its next scheduled step.',
  } : {
    what: result.originalEvents ? `All ${formatNumber(result.originalEvents)} events received an acknowledgement in this window` : 'No events are being generated',
    why: result.originalEvents ? 'Every original event has at least one timely 2xx response. That does not by itself prove the side effect happened only once.' : 'An event rate of zero produces no attempts, retries or side effects.',
    tip: result.originalEvents ? 'Try the duplicate-risk preset, then toggle idempotency to separate delivery reliability from processing safety.' : 'Increase events per second or load a preset to explore delivery behavior.',
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(1rem, 3vw, 1.5rem)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)' }}>Delivered once ≠ processed once</h2>
        <button type="button" style={buttonStyle} onClick={() => applyPreset(DEFAULT_WEBHOOK_SETTINGS, 'Partial Outage')}>Reset</button>
      </div>
      <p style={{ ...bodyStyle, margin: '0 0 1rem' }}>Watch one event become several attempts, then see which attempts repeat a business action.</p>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent={ACCENT} />

      <div style={{ ...gridStyle, marginBottom: '1.2rem' }}>
        <RangeControl label="Original events" value={settings.eventsPerSecond} onChange={(value) => update('eventsPerSecond', value)} min={0} max={50} formatValue={(value) => `${value} events/s`} accent={ACCENT} />
        <RangeControl label="Receiver failure rate" value={settings.failurePercent} onChange={(value) => update('failurePercent', value)} min={0} max={100} step={5} formatValue={(value) => `${value}%`} accent={ACCENT} />
        <RangeControl label="Retry attempts" value={settings.retryLimit} onChange={(value) => update('retryLimit', value)} min={0} max={6} formatValue={(value) => `${value} after the initial try`} accent={ACCENT} />
        <RangeControl label="Simulation duration" value={settings.durationSeconds} onChange={(value) => update('durationSeconds', value)} min={10} max={120} step={5} formatValue={(value) => `${value}s`} accent={ACCENT} />
        <RangeControl label="Base retry delay" value={settings.retryDelaySeconds} onChange={(value) => update('retryDelaySeconds', value)} min={.25} max={10} step={.25} formatValue={(value) => seconds(value)} accent={ACCENT} />
        <div>
          <label htmlFor="webhook-retry-policy" style={labelStyle}>Retry spacing</label>
          <select id="webhook-retry-policy" value={settings.retryPolicy} onChange={(event) => update('retryPolicy', event.target.value as WebhookSettings['retryPolicy'])} style={selectStyle}>
            <option value="exponential">Exponential backoff</option>
            <option value="fixed">Fixed delay</option>
          </select>
        </div>
      </div>
      <p style={{ ...bodyStyle, fontSize: '.72rem', margin: '0 0 1rem' }}>After a failed response or timeout, wait {retryDelays.length ? retryDelays.map((delay) => seconds(delay)).join(' → ') : '— no retries configured'}. The event-age limit can stop the sequence earlier.</p>

      <div style={{ border: `1.5px solid color-mix(in srgb, ${ACCENT} 55%, var(--k-border))`, borderRadius: '.8rem', padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <span style={{ ...labelStyle, color: 'var(--k-text)', marginBottom: '.2rem' }}>Idempotent Handler</span>
            <span style={bodyStyle}>One atomic effect per event ID</span>
          </div>
          <div role="group" aria-label="Idempotent handler" style={{ display: 'flex', gap: '.4rem' }}>
            {[false, true].map((enabled) => <button key={String(enabled)} type="button" aria-pressed={settings.idempotent === enabled} onClick={() => update('idempotent', enabled)} style={{ ...buttonStyle, borderColor: settings.idempotent === enabled ? ACCENT : 'var(--k-border)', color: settings.idempotent === enabled ? 'var(--k-text)' : 'var(--k-text-muted)', background: settings.idempotent === enabled ? `color-mix(in srgb, ${ACCENT} 20%, var(--k-bg))` : 'var(--k-bg)', padding: '.55rem 1rem' }}>{enabled ? 'ON' : 'OFF'}</button>)}
          </div>
        </div>
        <p style={{ ...bodyStyle, margin: '.65rem 0 0' }}>{settings.idempotent ? `${formatNumber(result.suppressedEffects)} repeat effects suppressed in this run.` : `${formatNumber(result.duplicateSideEffects)} extra effects in this run.`} Delivery attempts and acknowledgement timing stay the same in this comparison.</p>
      </div>

      <AdvancedDisclosure summary="Timeouts, duplicate copies, retry age & recovery">
        <RangeControl label="Provider timeout" value={settings.timeoutMs} onChange={(value) => update('timeoutMs', value)} min={100} max={5000} step={100} formatValue={(value) => `${value}ms`} accent={ACCENT} />
        <RangeControl label="Handler latency" value={settings.processingMs} onChange={(value) => update('processingMs', value)} min={50} max={5000} step={50} formatValue={(value) => `${value}ms`} accent={ACCENT} />
        <RangeControl label="Extra-copy probability" value={settings.duplicatePercent} onChange={(value) => update('duplicatePercent', value)} min={0} max={100} step={5} formatValue={(value) => `${value}% of events`} accent={ACCENT} />
        <RangeControl label="Maximum retry age" value={settings.maxAgeSeconds} onChange={(value) => update('maxAgeSeconds', value)} min={1} max={180} step={1} formatValue={(value) => `${value}s from event creation`} accent={ACCENT} />
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', color: 'var(--k-text)', cursor: 'pointer', fontSize: '.82rem', marginBottom: '.7rem' }}>
            <input type="checkbox" checked={settings.recoveryEnabled} onChange={(event) => update('recoveryEnabled', event.target.checked)} style={{ accentColor: ACCENT, marginTop: '.25rem' }} />
            Receiver recovers during the run
          </label>
          {settings.recoveryEnabled && <RangeControl label="Recovery point" value={settings.recoveryAtSeconds} onChange={(value) => update('recoveryAtSeconds', value)} min={0} max={settings.durationSeconds} step={1} formatValue={(value) => `${value}s → 0% failures`} accent={ACCENT} />}
        </div>
      </AdvancedDisclosure>

      <Insight what={insight.what} why={insight.why} tip={insight.tip} />
      {settings.processingMs > settings.timeoutMs && <div style={{ marginTop: '1rem' }}><Warning level="warn" title="The handler finishes after the provider times out">A healthy attempt may still commit its effect at {settings.processingMs}ms, after the provider stopped waiting at {settings.timeoutMs}ms. Its late 2xx does not cancel retries in this model. Recovery removes receiver failures; it does not shorten latency.</Warning></div>}

      <ResultPanel title={`Snapshot at ${settings.durationSeconds}s`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '.7rem' }}>
          <Metric label="Original events" value={formatNumber(result.originalEvents)} sublabel="Unique event IDs generated" />
          <Metric label="Acknowledged events" value={formatNumber(result.acknowledgedEvents)} color={COLORS.good} sublabel={`${formatNumber(chance, 1)}% with a timely 2xx`} />
          <Metric label="Retry policy exhausted" value={formatNumber(result.exhaustedEvents)} color={result.exhaustedEvents ? COLORS.bad : undefined} sublabel={`${result.retryExhaustedEvents} retry-limit · ${result.ageExhaustedEvents} age-limit`} />
          <Metric label="Still pending" value={formatNumber(result.pendingEvents)} color={COLORS.pending} sublabel="In flight, queued or awaiting expiry" />
          <Metric label="Total attempts" value={formatNumber(result.totalAttempts)} sublabel={`${result.retries} retries · ${result.providerRedeliveries} extra copies`} />
          <Metric label="2xx acknowledgements" value={formatNumber(result.successfulDeliveries)} sublabel="Successful delivery attempts" />
          <Metric label="Failed attempts" value={formatNumber(retryFailureCount)} sublabel={`${result.failedResponses} 5xx · ${result.timedOutAttempts} timeouts`} />
          <Metric label="Attempts in flight" value={formatNumber(result.inFlightAttempts)} sublabel="No response or timeout yet" />
        </div>
        <p style={{ ...bodyStyle, margin: '.85rem 0 0', fontSize: '.72rem' }}>Original events = acknowledged + exhausted + pending. Attempts = timely 2xx + failed responses + timeouts + in flight. Traffic continues through the chosen duration, so recent events may still be pending.</p>
      </ResultPanel>

      <ResultPanel title="Same deliveries, different side effects">
        <div style={{ display: 'grid', gap: '.85rem' }}>
          {[false, true].map((idempotent) => {
            const total = idempotent ? result.uniqueProcessedEvents : result.successfulProcessingCompletions;
            const repeated = idempotent ? 0 : result.duplicateEffectsWithoutIdempotency;
            return <div key={String(idempotent)} style={{ border: `1px solid ${settings.idempotent === idempotent ? ACCENT : 'var(--k-border)'}`, borderRadius: '.65rem', padding: '.8rem' }}>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '.55rem' }}>
                <strong style={{ fontSize: '.82rem', color: 'var(--k-text)' }}>Idempotency {idempotent ? 'ON' : 'OFF'}{settings.idempotent === idempotent ? ' · selected' : ''}</strong>
                <span style={{ ...bodyStyle, color: repeated ? COLORS.bad : COLORS.good, fontWeight: 700 }}>{formatNumber(total)} effects · {formatNumber(repeated)} repeated</span>
              </div>
              <div aria-hidden="true" style={{ display: 'flex', background: 'var(--k-bg)', height: '17px', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${100 * result.uniqueProcessedEvents / comparisonMax}%`, background: COLORS.good }} />
                <div style={{ width: `${100 * repeated / comparisonMax}%`, background: COLORS.bad }} />
              </div>
            </div>;
          })}
        </div>
        <p style={{ ...bodyStyle, fontSize: '.72rem', margin: '.65rem 0 1rem' }}><strong style={{ color: COLORS.good }}>First effect</strong> + <strong style={{ color: COLORS.bad }}>repeated effect</strong>. Both rows use exactly the same seeded attempt outcomes. Suppression assumes an atomic check and commit; it does not model faster duplicate responses.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '.7rem' }}>
          <Metric label="Unique events processed" value={formatNumber(result.uniqueProcessedEvents)} sublabel="At least one completed side effect" />
          <Metric label="Repeat deliveries" value={formatNumber(result.repeatDeliveries)} sublabel="All arrivals after an event’s first" />
          <Metric label={settings.idempotent ? 'Duplicate effects blocked' : 'Extra side effects'} value={formatNumber(settings.idempotent ? result.suppressedEffects : result.duplicateSideEffects)} color={settings.idempotent ? COLORS.good : COLORS.bad} />
          <Metric label="Processed, no timely ack" value={formatNumber(result.processedWithoutAcknowledgement)} sublabel={`${result.lateAcknowledgements} late 2xx responses ignored`} color={result.processedWithoutAcknowledgement ? ACCENT : undefined} />
        </div>
      </ResultPanel>

      <ResultPanel title="Events awaiting provider acknowledgement">
        <BacklogChart result={result} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '.7rem', marginTop: '.85rem' }}>
          <Metric label="Peak pending" value={formatNumber(result.peakAwaitingAcknowledgement)} color={COLORS.pending} />
          <Metric label="Delayed acknowledgements" value={formatNumber(result.delayedEvents)} sublabel="Arrived after the initial latency" />
          <Metric label="Average time to ack" value={result.acknowledgedEvents ? seconds(result.averageAcknowledgementDelay) : 'No acknowledgements'} sublabel="Among acknowledged events only" />
        </div>
        <p style={{ ...bodyStyle, fontSize: '.72rem', margin: '.75rem 0 0' }}>The line includes in-flight attempts and waits for retries. It falls when an event is acknowledged or its policy is exhausted. This is a delivery backlog, not a receiver-capacity queue.</p>
      </ResultPanel>

      {selectedEvent && <ResultPanel title={`Inspect event #${selectedEvent.id}`}>
        <RangeControl label="Event ID" value={selectedEvent.id} onChange={setSelectedEventId} min={1} max={Math.max(1, result.originalEvents)} formatValue={(value) => `#${value} of ${result.originalEvents}`} accent={ACCENT} />
        <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', margin: '.7rem 0 1rem' }}>
          {[{ label: 'First timeout', event: firstTimeout }, { label: 'First repeated effect', event: firstRepeated }, { label: 'First pending', event: firstPending }].map((target) => <button key={target.label} type="button" disabled={!target.event} onClick={() => target.event && setSelectedEventId(target.event.id)} style={{ ...buttonStyle, opacity: target.event ? 1 : .45, cursor: target.event ? 'pointer' : 'default' }}>{target.label}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '.6rem', marginBottom: '.8rem' }}>
          {[
            { label: 'Provider creates', value: `#${selectedEvent.id} at ${seconds(selectedEvent.createdAt)}` },
            { label: 'Receiver sees', value: `${selectedEvent.attempts.length} attempts` },
            { label: 'Provider status', value: selectedEvent.status },
            { label: 'Business effect', value: `${selectedEvent.sideEffects} completed` },
          ].map((step) => <div key={step.label} style={{ padding: '.7rem', borderRadius: '.55rem', background: 'var(--k-bg)', minWidth: 0 }}><div style={{ ...labelStyle, fontSize: '.64rem', marginBottom: '.25rem' }}>{step.label}</div><strong style={{ color: 'var(--k-text)', fontSize: '.8rem', overflowWrap: 'anywhere' }}>{step.value}</strong></div>)}
        </div>
        <EventTimeline event={selectedEvent} duration={settings.durationSeconds} />
        <p style={{ ...bodyStyle, fontSize: '.69rem', margin: '.55rem 0 .85rem' }}>● Provider decision · ◆ Receiver completion · dashed segment = processing continues after timeout. Times on the chart are relative to this event’s creation.</p>
        <div style={{ display: 'grid', gap: '.6rem' }}>
          {selectedEvent.attempts.map((attempt) => <div key={`${attempt.kind}:${attempt.retryNumber}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '.6rem', border: '1px solid var(--k-border)', borderLeft: `3px solid ${outcomeColor(attempt)}`, borderRadius: '.55rem', padding: '.75rem' }}>
            <div><strong style={{ fontSize: '.8rem', color: 'var(--k-text)' }}>{attemptName(attempt)} · sent at {seconds(attempt.startedAt)}</strong><div style={{ ...bodyStyle, color: outcomeColor(attempt), marginTop: '.2rem' }}>{outcomeName(attempt)}{attempt.outcome !== 'in-flight' ? ` at ${seconds(attempt.decisionAt)}` : ''}</div></div>
            <div style={{ ...bodyStyle, color: attempt.duplicateSideEffect ? COLORS.bad : 'var(--k-text)' }}>{receiverLabel(attempt)}{attempt.receiverResult !== 'processing' ? ` at ${seconds(attempt.completedAt)}` : ''}.{attempt.lateAcknowledgement && ' The late 2xx was ignored by the provider.'}</div>
          </div>)}
        </div>
        {selectedEvent.pendingReason && <p style={{ ...bodyStyle, margin: '.8rem 0 0' }}><strong>Still pending:</strong> {selectedEvent.pendingReason}{selectedEvent.nextAttemptAt !== null ? ` Next scheduled attempt: ${seconds(selectedEvent.nextAttemptAt)}.` : ''}</p>}
        {selectedEvent.status === 'exhausted' && <p style={{ ...bodyStyle, margin: '.8rem 0 0' }}><strong>Policy exhausted:</strong> {selectedEvent.exhaustionReason === 'age-limit' ? 'The maximum retry age was reached.' : 'The configured retry attempts ran out.'} A completed receiver effect can still exist even when the provider never receives a timely acknowledgement.</p>}
      </ResultPanel>}

      <details style={{ marginTop: '1.3rem', borderTop: '1px solid var(--k-border)', paddingTop: '.9rem' }}>
        <summary style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.8rem', color: 'var(--k-text-muted)', cursor: 'pointer' }}>Model assumptions &amp; limits</summary>
        <ul style={{ ...bodyStyle, paddingLeft: '1.2rem', margin: '.65rem 0 0' }}>
          <li>Fixed seeded draws make each scenario repeatable. Failure probability is applied independently to each attempt until recovery; after recovery it is 0%. This is a sample, not a specific provider forecast.</li>
          <li>Events arrive evenly; the receiver has unlimited concurrency. Every attempt takes the selected handler latency and either fails before an effect or completes successfully.</li>
          <li>A successful completion returns 2xx. If it arrives after the provider timeout, its effect can still commit but that late response does not cancel retries.</li>
          <li>Idempotency atomically permits one effect per event ID, including concurrent completions. It has no expiration, storage failure or timing overhead here.</li>
          <li>Extra-copy probability schedules at most one additional provider copy 1 second after creation, within the age limit. That copy has no retry chain. A timely acknowledgement can cancel queued main retries, but cannot undo in-flight work.</li>
          <li>Retry age limits new attempts; already-started attempts can complete later. Backoff is capped at 60 seconds per delay. Pending events are not assumed lost at the simulation end.</li>
          <li>At most 6,000 original events, 6 retries per event and one extra copy are simulated locally. The backlog line samples roughly once per second; its peak is calculated from exact event transitions.</li>
        </ul>
      </details>
    </div>
  );
}
