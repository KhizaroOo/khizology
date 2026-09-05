import { useId, useMemo, useState, type CSSProperties } from 'react';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import InputField from '../shared/InputField';
import Insight from '../shared/Insight';
import Metric from '../shared/Metric';
import PresetBar from '../shared/PresetBar';
import RangeControl from '../shared/RangeControl';
import ResultPanel from '../shared/ResultPanel';
import Warning from '../shared/Warning';
import { formatNumber } from '../shared/mathHelpers';
import { capacityPointAt, capacityUtilization, simulateCapacity, type CapacityPoint, type CapacityScenario, type CapacityValues } from './capacityCliffModel';

const ACCENT = '#F7933C';
const EXPANDED = '#6CA6FF';
const GOOD = '#22c55e';
const DANGER = '#ef4444';
const MONTH_DAYS = 365.25 / 12;

const DEFAULT_VALUES: CapacityValues = {
  demand: '650', capacity: '1000', growthPercent: 5, horizonMonths: 12,
  peakMultiplier: 1.1, safeUtilizationPercent: 80, capacityPerUnit: '250', additionalUnits: 2,
  expansionMonth: 2, lossPercent: 0, lossStartMonth: 6, lossDurationMonths: 1,
};

interface CapacityPreset { fields: CapacityValues; unit: string }
const PRESETS: { label: string; values: CapacityPreset }[] = [
  { label: 'Growing API', values: { fields: DEFAULT_VALUES, unit: 'req/s' } },
  { label: 'Peak season', values: { fields: { ...DEFAULT_VALUES, demand: '550', growthPercent: 2, peakMultiplier: 1.8, additionalUnits: 4, expansionMonth: 1 }, unit: 'orders/hour' } },
  { label: 'Maintenance window', values: { fields: { ...DEFAULT_VALUES, demand: '600', growthPercent: 3, peakMultiplier: 1.15, capacityPerUnit: '200', additionalUnits: 3, expansionMonth: 3, lossPercent: 40, lossStartMonth: 4, lossDurationMonths: 2 }, unit: 'jobs/min' } },
  { label: 'Flat demand', values: { fields: { ...DEFAULT_VALUES, demand: '400', growthPercent: 0, peakMultiplier: 1.25, expansionMonth: 3 }, unit: 'users' } },
];

const mutedStyle: CSSProperties = { fontSize: '.78rem', lineHeight: 1.6, color: 'var(--k-text-muted)' };
const buttonStyle: CSSProperties = { minHeight: '40px', padding: '.55rem .85rem', border: '1.5px solid var(--k-border)', borderRadius: '.55rem', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: "'Poppins', sans-serif", fontSize: '.74rem', fontWeight: 700, cursor: 'pointer' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '1.1rem' };

function quantity(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return formatNumber(value, decimals);
}

function utilization(value: number | null): string {
  return value === null ? 'No capacity' : `${quantity(value, value < 1 && value > 0 ? 2 : 1)}%`;
}

function monthText(month: number): string {
  return month > 0 && month < 0.1 ? '<0.1' : quantity(month, Number.isInteger(month) ? 0 : 1);
}

function crossingText(month: number | null): string {
  return month === null ? 'Not reached' : month === 0 ? 'Now' : `~Month ${monthText(month)}`;
}

function startTimestamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export default function CapacityCliffSimulator() {
  const id = useId();
  const [fields, setFields] = useState<CapacityValues>({ ...DEFAULT_VALUES });
  const [unitLabel, setUnitLabel] = useState('req/s');
  const [calendarStart, setCalendarStart] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>('Growing API');
  const [selectedScenario, setSelectedScenario] = useState<CapacityScenario>('current');
  const [inspectMonth, setInspectMonth] = useState(6);
  const result = useMemo(() => simulateCapacity(fields), [fields]);
  const projection = result.valid ? result.projection : null;
  const unit = unitLabel.trim() || 'units';
  const start = startTimestamp(calendarStart);
  const dateAt = (month: number | null) => start === null || month === null ? null : new Date(start + month * MONTH_DAYS * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const rangeValue = (key: keyof CapacityValues, fallback: number) => Number.isFinite(Number(fields[key])) ? Number(fields[key]) : fallback;

  const update = (key: keyof CapacityValues, value: number | string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
  };
  const applyPreset = (preset: CapacityPreset, label: string) => {
    setFields({ ...preset.fields });
    setUnitLabel(preset.unit);
    setCalendarStart('');
    setActivePreset(label);
    setSelectedScenario('current');
    setInspectMonth(6);
  };

  const selected = projection?.[selectedScenario];
  const selectedName = selectedScenario === 'current' ? 'Current plan' : 'Expanded capacity';
  const cursorMonth = projection ? Math.min(projection.inputs.horizonMonths, Math.max(0, inspectMonth)) : 0;
  const cursor = projection ? capacityPointAt(projection.inputs, cursorMonth) : null;

  const chart = useMemo(() => {
    if (!projection) return null;
    const width = 720;
    const height = 320;
    const left = 65;
    const right = 20;
    const top = 30;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const max = Math.max(1, ...projection.points.flatMap((point) => [point.peakDemand, point.currentCapacity, point.expandedCapacity])) * 1.1;
    const x = (month: number) => left + month / projection.inputs.horizonMonths * plotWidth;
    const y = (value: number) => height - bottom - value / max * plotHeight;
    const path = (field: keyof Pick<CapacityPoint, 'demand' | 'peakDemand' | 'currentCapacity' | 'expandedCapacity' | 'currentSafeCapacity' | 'expandedSafeCapacity'>) => projection.points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.month).toFixed(3)} ${y(point[field]).toFixed(3)}`).join(' ');
    return { width, height, left, right, top, bottom, max, plotWidth, plotHeight, x, y, path };
  }, [projection]);

  const monthlyRows = projection?.points.filter((point) => point.side === 'right' && (
    Number.isInteger(point.month)
    || point.month === projection.inputs.expansionMonth
    || point.month === projection.inputs.lossStartMonth
    || point.month === projection.inputs.lossStartMonth + projection.inputs.lossDurationMonths
  )) ?? [];

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(1rem, 3vw, 1.5rem)', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.75rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.12rem', fontWeight: 800, color: 'var(--k-text)', margin: '0 0 .35rem' }}>See the cliff before demand reaches it</h2>
          <p style={{ ...mutedStyle, margin: 0, maxWidth: '68ch' }}>Project demand, leave room for peaks, and compare a timed expansion with your current capacity. These are planning scenarios, not a forecast.</p>
        </div>
        <button type="button" onClick={() => applyPreset(PRESETS[0].values, PRESETS[0].label)} style={buttonStyle}>Reset</button>
      </div>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent={ACCENT} />

      <div style={{ ...gridStyle, marginBottom: '1.25rem' }}>
        <InputField label="Current demand" value={fields.demand} onChange={(value) => update('demand', value)} min="0" step="any" suffix={unit} />
        <InputField label="Maximum capacity" value={fields.capacity} onChange={(value) => update('capacity', value)} min="0.001" step="any" suffix={unit} />
        <RangeControl label="Monthly growth" value={rangeValue('growthPercent', 5)} onChange={(value) => update('growthPercent', value)} min={-50} max={100} step={0.5} formatValue={(value) => `${value > 0 ? '+' : ''}${value}% / month`} accent={ACCENT} />
        <RangeControl label="Time horizon" value={rangeValue('horizonMonths', 12)} onChange={(value) => update('horizonMonths', value)} min={1} max={60} formatValue={(value) => `${value} months`} accent={ACCENT} />
      </div>

      <AdvancedDisclosure summary="Peaks, expansion, temporary loss & units">
        <RangeControl label="Peak demand multiplier" value={rangeValue('peakMultiplier', 1.1)} onChange={(value) => update('peakMultiplier', value)} min={1} max={5} step={0.05} formatValue={(value) => `${value.toFixed(2)}× average demand`} accent={ACCENT} />
        <RangeControl label="Safe utilization threshold" value={rangeValue('safeUtilizationPercent', 80)} onChange={(value) => update('safeUtilizationPercent', value)} min={10} max={95} formatValue={(value) => `${value}%`} accent={ACCENT} />
        <InputField label="Capacity per added unit" value={fields.capacityPerUnit} onChange={(value) => update('capacityPerUnit', value)} min="0.001" step="any" suffix={unit} />
        <RangeControl label="Additional capacity units" value={rangeValue('additionalUnits', 2)} onChange={(value) => update('additionalUnits', value)} min={0} max={100} formatValue={(value) => `${value} units`} accent={ACCENT} />
        <RangeControl label="Planned expansion month" value={rangeValue('expansionMonth', 2)} onChange={(value) => update('expansionMonth', value)} min={0} max={60} step={0.5} formatValue={(value) => value === 0 ? 'Now' : `Month ${monthText(value)}`} accent={ACCENT} />
        <RangeControl label="Temporary capacity loss" value={rangeValue('lossPercent', 0)} onChange={(value) => update('lossPercent', value)} min={0} max={100} formatValue={(value) => value === 0 ? 'Off' : `${value}% unavailable`} accent={ACCENT} />
        <RangeControl label="Loss begins" value={rangeValue('lossStartMonth', 6)} onChange={(value) => update('lossStartMonth', value)} min={0} max={60} step={0.5} formatValue={(value) => `Month ${monthText(value)}`} accent={ACCENT} />
        <RangeControl label="Loss lasts" value={rangeValue('lossDurationMonths', 1)} onChange={(value) => update('lossDurationMonths', value)} min={0.5} max={12} step={0.5} formatValue={(value) => `${monthText(value)} month${value === 1 ? '' : 's'}`} accent={ACCENT} />
        <div>
          <label htmlFor={`${id}-unit`} style={{ display: 'block', marginBottom: '.4rem', fontFamily: "'Poppins', sans-serif", fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-text-muted)' }}>Unit label</label>
          <input id={`${id}-unit`} value={unitLabel} maxLength={20} placeholder="req/s, jobs/day, users" onChange={(event) => setUnitLabel(event.target.value)} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '.65rem .75rem', border: '1.5px solid var(--k-border)', borderRadius: '.5rem', color: 'var(--k-text)', background: 'var(--k-bg)', fontSize: '.88rem' }} />
        </div>
        <InputField label="Calendar start date (optional)" type="date" value={calendarStart} onChange={setCalendarStart} />
        <div style={{ ...mutedStyle, gridColumn: '1 / -1' }}>
          <p style={{ margin: 0 }}>Expansion adds all selected units at its planned month. Temporary loss removes that percentage of installed capacity from both plans, including added units.</p>
          <p style={{ margin: '.4rem 0 0' }}>{start !== null ? `Planned expansion date: approximately ${dateAt(rangeValue('expansionMonth', 2))}. Calendar labels use about 30.44 days per model month.` : 'Add a calendar start date to see an approximate expansion date and crossing dates alongside model months.'}</p>
        </div>
      </AdvancedDisclosure>

      {!result.valid && <Warning level="danger" title="Check the scenario inputs"><ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{result.issues.map((issue) => <li key={issue.field}>{issue.message}</li>)}</ul><p style={{ margin: '.5rem 0 0' }}>The projection is paused until these inputs are valid.</p></Warning>}

      {projection && selected && chart && cursor && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'center', margin: '1rem 0' }} aria-label="Plan to inspect">
            {(['current', 'expanded'] as const).map((scenario) => <button key={scenario} type="button" aria-pressed={selectedScenario === scenario} onClick={() => setSelectedScenario(scenario)} style={{ ...buttonStyle, borderColor: selectedScenario === scenario ? ACCENT : 'var(--k-border)', color: selectedScenario === scenario ? ACCENT : 'var(--k-text)', background: selectedScenario === scenario ? `color-mix(in srgb, ${ACCENT} 10%, var(--k-bg-card))` : 'var(--k-bg)' }}>{scenario === 'current' ? 'Current plan' : `Expanded capacity · +${quantity(projection.addedCapacity)} ${unit}`}</button>)}
          </div>
          {projection.inputs.demand === 0 && <Warning level="info" title="No demand is modeled">Compound growth cannot create demand from zero. Enter a starting load to explore a capacity crossing.</Warning>}

          <ResultPanel title={`Demand vs capacity · ${selectedName}`}>
            <div role="region" aria-label="Demand and capacity chart, scroll horizontally on a small screen" tabIndex={0} style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', border: '1px solid var(--k-border)', borderRadius: '.8rem', background: 'var(--k-bg)', minWidth: 0 }}>
              <svg viewBox={`0 0 ${chart.width} ${chart.height}`} style={{ display: 'block', width: '100%', minWidth: '540px', height: 'auto' }} role="img" aria-labelledby={`${id}-chart-title ${id}-chart-description`}>
                <title id={`${id}-chart-title`}>{`Demand and capacity over ${projection.inputs.horizonMonths} months`}</title>
                <desc id={`${id}-chart-description`}>{`Average demand and the planning peak are compared with current and expanded capacity. The dotted safe limit follows ${selectedName.toLowerCase()}. Safe-threshold result: ${crossingText(selected.safeCrossingMonth)}. Full-capacity result: ${crossingText(selected.fullCrossingMonth)}. Both refer to the selected horizon. Monthly values are available below.`}</desc>
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <g key={fraction}>
                  <line x1={chart.left} x2={chart.width - chart.right} y1={chart.y(chart.max * fraction)} y2={chart.y(chart.max * fraction)} stroke="var(--k-border)" />
                  <text x={chart.left - 9} y={chart.y(chart.max * fraction) + 4} textAnchor="end" fontSize="11" fill="var(--k-text-muted)">{quantity(chart.max * fraction)}</text>
                  <text x={chart.x(projection.inputs.horizonMonths * fraction)} y={chart.height - 17} textAnchor="middle" fontSize="11" fill="var(--k-text-muted)">{monthText(projection.inputs.horizonMonths * fraction)}</text>
                </g>)}
                <text x={chart.left} y={17} fontSize="11" fontWeight="700" fill="var(--k-text-muted)">{unit}</text>
                <text x={chart.width - chart.right} y={chart.height - 4} fontSize="10" textAnchor="end" fill="var(--k-text-muted)">Months from start</text>
                {projection.inputs.lossPercent > 0 && projection.inputs.lossStartMonth < projection.inputs.horizonMonths && <rect x={chart.x(projection.inputs.lossStartMonth)} y={chart.top} width={chart.x(Math.min(projection.inputs.horizonMonths, projection.inputs.lossStartMonth + projection.inputs.lossDurationMonths)) - chart.x(projection.inputs.lossStartMonth)} height={chart.plotHeight} fill={DANGER} opacity=".07"><title>Temporary capacity loss</title></rect>}
                {projection.inputs.peakMultiplier > 1 && <path d={chart.path('demand')} fill="none" stroke={ACCENT} strokeWidth="2" strokeOpacity=".6" vectorEffect="non-scaling-stroke" />}
                <path d={chart.path('peakDemand')} fill="none" stroke={ACCENT} strokeWidth="3" strokeDasharray={projection.inputs.peakMultiplier > 1 ? '7 4' : undefined} vectorEffect="non-scaling-stroke" />
                <path d={chart.path('currentCapacity')} fill="none" stroke="var(--k-text-muted)" strokeWidth="2.5" strokeDasharray="10 5" vectorEffect="non-scaling-stroke" />
                {projection.addedCapacity > 0 && <path d={chart.path('expandedCapacity')} fill="none" stroke={EXPANDED} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
                <path d={chart.path(selectedScenario === 'current' ? 'currentSafeCapacity' : 'expandedSafeCapacity')} fill="none" stroke={GOOD} strokeWidth="2" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
                {projection.addedCapacity > 0 && projection.expansionWithinHorizon && <g>
                  <line x1={chart.x(projection.inputs.expansionMonth)} x2={chart.x(projection.inputs.expansionMonth)} y1={chart.top} y2={chart.height - chart.bottom} stroke={EXPANDED} strokeDasharray="3 5" opacity=".6" />
                  <text x={Math.min(chart.width - chart.right - 4, chart.x(projection.inputs.expansionMonth) + 5)} y={chart.top + 13} textAnchor={projection.inputs.expansionMonth > projection.inputs.horizonMonths * .85 ? 'end' : 'start'} fontSize="10" fill={EXPANDED}>Expansion</text>
                </g>}
                <line x1={chart.x(cursorMonth)} x2={chart.x(cursorMonth)} y1={chart.top} y2={chart.height - chart.bottom} stroke="var(--k-text)" strokeDasharray="2 3" opacity=".5" />
                <circle cx={chart.x(cursorMonth)} cy={chart.y(cursor.peakDemand)} r="5" fill={ACCENT} stroke="var(--k-bg)" strokeWidth="2"><title>{`Planning peak at Month ${monthText(cursorMonth)}: ${quantity(cursor.peakDemand)} ${unit}`}</title></circle>
              </svg>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem 1rem', fontSize: '.72rem', color: 'var(--k-text-muted)', margin: '.8rem 0' }}>
              {projection.inputs.peakMultiplier > 1 && <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `2px solid ${ACCENT}`, opacity: .6, verticalAlign: 'middle', marginRight: '.35rem' }} />Average demand</span>}
              <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `3px ${projection.inputs.peakMultiplier > 1 ? 'dashed' : 'solid'} ${ACCENT}`, verticalAlign: 'middle', marginRight: '.35rem' }} />Planning peak</span>
              <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: '2px dashed var(--k-text-muted)', verticalAlign: 'middle', marginRight: '.35rem' }} />Current capacity</span>
              {projection.addedCapacity > 0 && <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `2px solid ${EXPANDED}`, verticalAlign: 'middle', marginRight: '.35rem' }} />Expanded capacity</span>}
              <span><span aria-hidden="true" style={{ display: 'inline-block', width: '22px', borderTop: `2px dotted ${GOOD}`, verticalAlign: 'middle', marginRight: '.35rem' }} />{projection.inputs.safeUtilizationPercent}% safe limit · selected plan</span>
            </div>
            <p style={{ ...mutedStyle, margin: '0 0 1rem' }}>{projection.addedCapacity > 0 ? `Expansion adds ${quantity(projection.addedCapacity)} ${unit} at Month ${monthText(projection.inputs.expansionMonth)}${dateAt(projection.inputs.expansionMonth) ? ` (approximately ${dateAt(projection.inputs.expansionMonth)})` : ''}. ` : 'No extra capacity is selected; the plans are identical. '}{!projection.expansionWithinHorizon && projection.addedCapacity > 0 ? 'That arrival is outside this horizon, so it has no effect here. ' : ''}{projection.inputs.lossPercent > 0 ? `The shaded window removes ${projection.inputs.lossPercent}% of capacity from Month ${monthText(projection.inputs.lossStartMonth)} to ${monthText(projection.inputs.lossStartMonth + projection.inputs.lossDurationMonths)}${projection.inputs.lossStartMonth > projection.inputs.horizonMonths ? ', outside this horizon' : ''}.` : 'No temporary loss is applied.'}</p>
            <RangeControl label="Inspect month" value={cursorMonth} onChange={setInspectMonth} min={0} max={projection.inputs.horizonMonths} step={0.25} formatValue={(value) => `${monthText(value)}${dateAt(value) ? ` · ~${dateAt(value)}` : ''}`} accent={ACCENT} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: '.6rem', marginTop: '.9rem' }}>
              <Metric label={`Demand · Month ${monthText(cursorMonth)}`} value={`${quantity(cursor.demand)} ${unit}`} sublabel={`Planning peak: ${quantity(cursor.peakDemand)} ${unit}`} />
              <Metric label="Current capacity" value={`${quantity(cursor.currentCapacity)} ${unit}`} sublabel={`Peak utilization: ${utilization(capacityUtilization(cursor.peakDemand, cursor.currentCapacity))}`} />
              <Metric label="Expanded capacity" value={`${quantity(cursor.expandedCapacity)} ${unit}`} sublabel={`Peak utilization: ${utilization(capacityUtilization(cursor.peakDemand, cursor.expandedCapacity))}`} />
            </div>
          </ResultPanel>

          <ResultPanel title={`${selectedName} · where the limits appear`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '.65rem', marginBottom: '1rem' }}>
              <Metric label="Current utilization" value={utilization(selected.currentUtilization)} sublabel={`Month 0 average; peak ${utilization(selected.currentPeakUtilization)}`} />
              <Metric label="Safe margin now" value={`${quantity(selected.currentSafeMargin)} ${unit}`} color={selected.currentSafeMargin < 0 ? DANGER : GOOD} sublabel="Safe limit minus planning peak" />
              <Metric label={`${projection.inputs.safeUtilizationPercent}% threshold reached`} value={crossingText(selected.safeCrossingMonth)} color={selected.safeCrossingMonth === null ? GOOD : ACCENT} sublabel={dateAt(selected.safeCrossingMonth) ? `Approximately ${dateAt(selected.safeCrossingMonth)}` : `Planning peak, within ${projection.inputs.horizonMonths} months`} />
              <Metric label="Full capacity reached" value={crossingText(selected.fullCrossingMonth)} color={selected.fullCrossingMonth === null ? GOOD : DANGER} sublabel={dateAt(selected.fullCrossingMonth) ? `Approximately ${dateAt(selected.fullCrossingMonth)}` : '100% of available capacity'} />
              <Metric label="Worst peak utilization" value={utilization(selected.highestPeakUtilization)} color={selected.zeroCapacityRisk || (selected.highestPeakUtilization ?? 0) > 100 ? DANGER : ACCENT} sublabel={selected.zeroCapacityRisk ? 'Demand occurs during complete loss' : 'Includes the loss window'} />
              <Metric label="Largest capacity deficit" value={`${quantity(selected.largestDeficit)} ${unit}`} color={selected.largestDeficit > 0 ? DANGER : GOOD} sublabel="Planning peak minus available capacity" />
            </div>
            <Insight
              what={projection.peakDemand === 0 ? 'No demand reaches a capacity limit in this scenario.' : selected.safeCrossingMonth === null ? `${selectedName} keeps the planning peak below the ${projection.inputs.safeUtilizationPercent}% safe threshold through Month ${projection.inputs.horizonMonths}.` : selected.safeCrossingMonth === 0 ? `${selectedName} starts at or above the selected safe threshold.` : `${selectedName} reaches the safe threshold around Month ${monthText(selected.safeCrossingMonth)}${selected.fullCrossingMonth === null ? ', while full capacity is not reached within this horizon' : `; full capacity is reached ${selected.fullCrossingMonth === 0 ? 'now' : `around Month ${monthText(selected.fullCrossingMonth)}`}`}.`}
              why={`Demand changes by ${projection.inputs.growthPercent}% each month, compounded from ${quantity(projection.inputs.demand)} ${unit}. The ${projection.inputs.peakMultiplier}× planning peak is compared with ${projection.inputs.safeUtilizationPercent}% and 100% of available capacity. ${projection.inputs.lossPercent > 0 ? 'Temporary loss lowers both limits during its window.' : 'The safe threshold leaves a reserve before the full-capacity limit.'}`}
              tip={selected.zeroCapacityRisk ? 'This scenario has positive demand while all capacity is unavailable. More installed capacity cannot remove a 100% proportional loss; change the loss window, retain some availability, or reduce demand during that period.' : selectedScenario === 'expanded' && projection.reachesSafetyBeforeExpansion ? `The current plan reaches its safe threshold ${crossingText(projection.current.safeCrossingMonth).toLowerCase()} before the expansion arrives. Move the arrival earlier as well as checking the added amount.` : selected.safeCrossingMonth !== null ? 'Try adding capacity, moving its arrival earlier, or reducing the growth or peak assumptions. Use the capacity target below to size the reserve.' : 'Try a stronger peak or a maintenance window to see how much room the plan retains. Staying inside this model’s limits does not validate real system performance.'}
            />
          </ResultPanel>

          <ResultPanel title="Current plan vs expanded capacity">
            <div role="region" aria-label="Capacity scenario comparison, horizontally scrollable" tabIndex={0} style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--k-border)', borderRadius: '.7rem' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '.77rem', textAlign: 'left' }}>
                <thead><tr>{['Plan', `${projection.inputs.safeUtilizationPercent}% reached`, '100% reached', 'Worst peak load', 'Largest deficit'].map((label) => <th key={label} scope="col" style={{ padding: '.75rem', color: 'var(--k-text-muted)', borderBottom: '1px solid var(--k-border)' }}>{label}</th>)}</tr></thead>
                <tbody>{([projection.current, projection.expanded]).map((scenario) => <tr key={scenario.id} style={{ background: scenario.id === selectedScenario ? `color-mix(in srgb, ${ACCENT} 7%, var(--k-bg-card))` : 'var(--k-bg)' }}>
                  <th scope="row" style={{ padding: '.8rem', color: 'var(--k-text)' }}>{scenario.id === 'current' ? 'Current plan' : 'Expanded capacity'}</th>
                  <td style={{ padding: '.8rem', color: 'var(--k-text)' }}>{crossingText(scenario.safeCrossingMonth)}</td>
                  <td style={{ padding: '.8rem', color: 'var(--k-text)' }}>{crossingText(scenario.fullCrossingMonth)}</td>
                  <td style={{ padding: '.8rem', color: 'var(--k-text)' }}>{utilization(scenario.highestPeakUtilization)}</td>
                  <td style={{ padding: '.8rem', color: 'var(--k-text)' }}>{quantity(scenario.largestDeficit)} {unit}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <p style={{ ...mutedStyle, margin: '.75rem 0 0' }}>Crossing times use the planning peak. “Not reached” means within the selected horizon. The current plan includes temporary loss; only the expanded plan includes added units.</p>
          </ResultPanel>

          <ResultPanel title="Capacity target">
            {projection.requiredCapacityNow === null ? <Warning level="warn" title="Installed capacity alone cannot cover this scenario">At least one modeled interval has positive demand and a 100% loss of available capacity. A larger installed total would still be completely unavailable during that window. Adjust availability or demand before sizing an expansion.</Warning> : <>
              <Insight
                what={`To keep the planning peak at or below ${projection.inputs.safeUtilizationPercent}% through Month ${projection.inputs.horizonMonths}, the model needs approximately ${quantity(Math.ceil(projection.requiredCapacityNow))} ${unit} of installed capacity available from the start.`}
                why={`The target covers the largest peak-to-available-capacity ratio across the whole horizon${projection.inputs.lossPercent > 0 ? ', including temporary loss' : ''}. At ${quantity(projection.inputs.capacityPerUnit)} ${unit} per added unit, that means ${projection.requiredUnitsNow === 0 ? 'no additional units' : projection.requiredUnitsNow! > 100 ? 'more than 100 additional units at this block size' : `${quantity(projection.requiredUnitsNow!)} additional unit${projection.requiredUnitsNow === 1 ? '' : 's'}`} above your current ${quantity(projection.inputs.capacity)} ${unit}.`}
                tip={projection.reachesSafetyBeforeExpansion ? `Your scheduled expansion arrives after the current plan first reaches the safety limit. Installing more at Month ${monthText(projection.inputs.expansionMonth)} cannot remove that earlier exposure.` : projection.requiredUnitsAtExpansion === null ? 'The planned arrival is outside the horizon or cannot cover a complete availability loss. Adjust its timing before comparing a scheduled expansion.' : `At the selected Month ${monthText(projection.inputs.expansionMonth)} arrival, the remaining horizon needs ${projection.requiredUnitsAtExpansion > 100 ? 'more than 100' : quantity(projection.requiredUnitsAtExpansion)} added units at this block size. Check provisioning lead time before choosing that date.`}
              />
              {projection.requiredUnitsNow !== null && projection.requiredUnitsNow <= 100 && <button type="button" onClick={() => {
                setFields((current) => ({ ...current, additionalUnits: projection.requiredUnitsNow!, expansionMonth: 0 }));
                setSelectedScenario('expanded');
                setActivePreset(null);
              }} style={{ ...buttonStyle, borderColor: ACCENT, color: ACCENT, marginTop: '.9rem' }}>Try {quantity(projection.requiredUnitsNow)} added units from Month 0</button>}
            </>}
          </ResultPanel>

          <div style={{ marginTop: '1.25rem' }}>
            <AdvancedDisclosure summary="Monthly values & model assumptions">
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <div role="region" aria-label="Monthly capacity values, horizontally scrollable" tabIndex={0} style={{ width: '100%', overflow: 'auto', maxHeight: '370px', border: '1px solid var(--k-border)', borderRadius: '.7rem' }}>
                  <table style={{ width: '100%', minWidth: '660px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.73rem' }}>
                    <caption style={{ textAlign: 'left', padding: '.75rem', color: 'var(--k-text-muted)' }}>Values after any change at that time. Crossings and worst cases also check the instant before each change.</caption>
                    <thead><tr>{['Month', 'Average demand', 'Planning peak', 'Current capacity', 'Expanded capacity', 'Current peak %', 'Expanded peak %'].map((label) => <th key={label} scope="col" style={{ padding: '.7rem', borderBottom: '1px solid var(--k-border)', color: 'var(--k-text-muted)' }}>{label}</th>)}</tr></thead>
                    <tbody>{monthlyRows.map((point) => <tr key={point.month}>
                      <th scope="row" style={{ padding: '.65rem', borderBottom: '1px solid var(--k-border)', color: 'var(--k-text)' }}>{monthText(point.month)}</th>
                      {[quantity(point.demand), quantity(point.peakDemand), quantity(point.currentCapacity), quantity(point.expandedCapacity), utilization(capacityUtilization(point.peakDemand, point.currentCapacity)), utilization(capacityUtilization(point.peakDemand, point.expandedCapacity))].map((value, index) => <td key={index} style={{ padding: '.65rem', borderBottom: '1px solid var(--k-border)', color: 'var(--k-text)' }}>{value}</td>)}
                    </tr>)}</tbody>
                  </table>
                </div>
                <div style={{ ...mutedStyle, marginTop: '1rem' }}>
                  <p>Demand = starting demand × (1 + monthly growth)<sup>month</sup>. Growth is constant, including between whole months. Negative growth models a decline. A zero starting load stays zero.</p>
                  <p>The peak multiplier creates a planning envelope; it does not estimate the probability or duration of a peak. Reaching the selected safety limit means using that reserve, not predicting an outage. Reaching full capacity can create a deficit, but queueing, latency, and failure behavior are not modeled.</p>
                  <p>Expansion is instantaneous at its selected month. Temporary loss applies to the full installed capacity of both plans and restores at the end of its window. The model checks event boundaries and solves crossings within intervals; the chart samples the demand curve every quarter month.</p>
                  <p>Capacity targets are approximate. Rounded unit counts aim to keep planning peaks at or below the selected safe threshold. Include real lead times, operating overhead, and measurement uncertainty in a deployment plan.</p>
                  <p style={{ marginBottom: 0 }}>Bounds: up to 60 months, 100 added units, −50% to +100% monthly growth, and a finite projected peak no larger than 1 quadrillion units. Optional dates use an average 30.44-day month and should be read as approximate calendar markers.</p>
                </div>
              </div>
            </AdvancedDisclosure>
          </div>
        </>
      )}
    </div>
  );
}
