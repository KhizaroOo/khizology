export interface CapacityInputs {
  demand: number;
  capacity: number;
  growthPercent: number;
  horizonMonths: number;
  peakMultiplier: number;
  safeUtilizationPercent: number;
  capacityPerUnit: number;
  additionalUnits: number;
  expansionMonth: number;
  lossPercent: number;
  lossStartMonth: number;
  lossDurationMonths: number;
}

export type CapacityValues = { [Field in keyof CapacityInputs]: string | number };
export type CapacityScenario = 'current' | 'expanded';
export type CapacitySide = 'left' | 'right';

export interface CapacityIssue {
  field: keyof CapacityInputs | 'projection';
  message: string;
}

export interface CapacityPoint {
  month: number;
  side: CapacitySide;
  demand: number;
  peakDemand: number;
  currentCapacity: number;
  expandedCapacity: number;
  currentSafeCapacity: number;
  expandedSafeCapacity: number;
}

export interface CapacityScenarioResult {
  id: CapacityScenario;
  safeCrossingMonth: number | null;
  fullCrossingMonth: number | null;
  currentUtilization: number | null;
  currentPeakUtilization: number | null;
  currentSafeMargin: number;
  highestPeakUtilization: number | null;
  zeroCapacityRisk: boolean;
  lowestSafeMargin: number;
  largestDeficit: number;
  endCapacity: number;
}

export interface CapacityProjection {
  inputs: CapacityInputs;
  points: CapacityPoint[];
  current: CapacityScenarioResult;
  expanded: CapacityScenarioResult;
  addedCapacity: number;
  peakDemand: number;
  requiredCapacityNow: number | null;
  requiredUnitsNow: number | null;
  requiredUnitsAtExpansion: number | null;
  reachesSafetyBeforeExpansion: boolean;
  expansionWithinHorizon: boolean;
}

export type CapacityResult = { valid: false; issues: CapacityIssue[] } | { valid: true; projection: CapacityProjection };

const CONSTRAINTS: { field: keyof CapacityInputs; label: string; min: number; max: number; integer?: boolean }[] = [
  { field: 'demand', label: 'Current demand', min: 0, max: 1_000_000_000_000 },
  { field: 'capacity', label: 'Maximum capacity', min: 0.001, max: 1_000_000_000_000 },
  { field: 'growthPercent', label: 'Monthly growth', min: -50, max: 100 },
  { field: 'horizonMonths', label: 'Time horizon', min: 1, max: 60, integer: true },
  { field: 'peakMultiplier', label: 'Peak multiplier', min: 1, max: 5 },
  { field: 'safeUtilizationPercent', label: 'Safe utilization threshold', min: 10, max: 95 },
  { field: 'capacityPerUnit', label: 'Capacity per added unit', min: 0.001, max: 1_000_000_000_000 },
  { field: 'additionalUnits', label: 'Additional capacity units', min: 0, max: 100, integer: true },
  { field: 'expansionMonth', label: 'Expansion month', min: 0, max: 60 },
  { field: 'lossPercent', label: 'Temporary capacity loss', min: 0, max: 100, integer: true },
  { field: 'lossStartMonth', label: 'Capacity loss start', min: 0, max: 60 },
  { field: 'lossDurationMonths', label: 'Capacity loss duration', min: 0.25, max: 60 },
];

function parseInputs(values: CapacityValues): { inputs: CapacityInputs; issues: CapacityIssue[] } {
  const inputs = {} as CapacityInputs;
  const issues: CapacityIssue[] = [];
  for (const constraint of CONSTRAINTS) {
    const value = values[constraint.field];
    const numeric = typeof value === 'number' ? value : value.trim() === '' ? Number.NaN : Number(value);
    if (!Number.isFinite(numeric)) {
      issues.push({ field: constraint.field, message: `${constraint.label}: enter a finite number.` });
    } else if (numeric < constraint.min || numeric > constraint.max) {
      issues.push({ field: constraint.field, message: `${constraint.label}: use ${constraint.min.toLocaleString('en-US')} to ${constraint.max.toLocaleString('en-US')}.` });
    } else if (constraint.integer && !Number.isInteger(numeric)) {
      issues.push({ field: constraint.field, message: `${constraint.label}: use a whole number.` });
    }
    inputs[constraint.field] = numeric;
  }
  return { inputs, issues };
}

export function capacityDemandAt(inputs: CapacityInputs, month: number): number {
  return inputs.demand * Math.pow(1 + inputs.growthPercent / 100, month);
}

function availableFraction(inputs: CapacityInputs, month: number, side: CapacitySide): number {
  const lossEnd = inputs.lossStartMonth + inputs.lossDurationMonths;
  const lossActive = side === 'left'
    ? month > inputs.lossStartMonth && month <= lossEnd
    : month >= inputs.lossStartMonth && month < lossEnd;
  return inputs.lossPercent > 0 && lossActive ? 1 - inputs.lossPercent / 100 : 1;
}

export function availableCapacityAt(inputs: CapacityInputs, month: number, scenario: CapacityScenario, side: CapacitySide = 'right'): number {
  const expansionActive = scenario === 'expanded' && (side === 'left' ? month > inputs.expansionMonth : month >= inputs.expansionMonth);
  const installed = inputs.capacity + (expansionActive ? inputs.capacityPerUnit * inputs.additionalUnits : 0);
  return installed * availableFraction(inputs, month, side);
}

export function capacityPointAt(inputs: CapacityInputs, month: number, side: CapacitySide = 'right'): CapacityPoint {
  const demand = capacityDemandAt(inputs, month);
  const currentCapacity = availableCapacityAt(inputs, month, 'current', side);
  const expandedCapacity = availableCapacityAt(inputs, month, 'expanded', side);
  return {
    month,
    side,
    demand,
    peakDemand: demand * inputs.peakMultiplier,
    currentCapacity,
    expandedCapacity,
    currentSafeCapacity: currentCapacity * inputs.safeUtilizationPercent / 100,
    expandedSafeCapacity: expandedCapacity * inputs.safeUtilizationPercent / 100,
  };
}

export function capacityUtilization(demand: number, capacity: number): number | null {
  return capacity > 0 ? demand / capacity * 100 : null;
}

function eventMonths(inputs: CapacityInputs): number[] {
  return [...new Set([
    ...(inputs.additionalUnits > 0 ? [inputs.expansionMonth] : []),
    ...(inputs.lossPercent > 0 ? [inputs.lossStartMonth, inputs.lossStartMonth + inputs.lossDurationMonths] : []),
  ].filter((month) => month >= 0 && month <= inputs.horizonMonths))].sort((a, b) => a - b);
}

function firstCrossing(inputs: CapacityInputs, scenario: CapacityScenario, fraction: number, breaks: number[]): number | null {
  const reaches = (peak: number, limit: number) => peak > 0 && peak >= limit * (1 - 1e-12);
  const initialPeak = inputs.demand * inputs.peakMultiplier;
  for (let index = 0; index < breaks.length - 1; index += 1) {
    const start = breaks[index];
    const end = breaks[index + 1];
    const limit = availableCapacityAt(inputs, start, scenario) * fraction;
    const peak = capacityDemandAt(inputs, start) * inputs.peakMultiplier;
    if (reaches(peak, limit)) return start;
    if (inputs.growthPercent > 0 && initialPeak > 0 && limit > 0) {
      const crossing = Math.log(limit / initialPeak) / Math.log1p(inputs.growthPercent / 100);
      // An expansion/recovery at the interval boundary takes effect at that instant.
      if (crossing > start && crossing < end - 1e-10) return crossing;
    }
  }
  const finalPeak = capacityDemandAt(inputs, inputs.horizonMonths) * inputs.peakMultiplier;
  return reaches(finalPeak, availableCapacityAt(inputs, inputs.horizonMonths, scenario) * fraction) ? inputs.horizonMonths : null;
}

function summarizeScenario(inputs: CapacityInputs, scenario: CapacityScenario, limits: CapacityPoint[], breaks: number[]): CapacityScenarioResult {
  const capacityKey = scenario === 'current' ? 'currentCapacity' : 'expandedCapacity';
  const safeKey = scenario === 'current' ? 'currentSafeCapacity' : 'expandedSafeCapacity';
  const current = capacityPointAt(inputs, 0);
  const final = capacityPointAt(inputs, inputs.horizonMonths);
  const zeroCapacityRisk = limits.some((point) => point[capacityKey] === 0 && point.peakDemand > 0);
  return {
    id: scenario,
    safeCrossingMonth: firstCrossing(inputs, scenario, inputs.safeUtilizationPercent / 100, breaks),
    fullCrossingMonth: firstCrossing(inputs, scenario, 1, breaks),
    currentUtilization: capacityUtilization(current.demand, current[capacityKey]),
    currentPeakUtilization: capacityUtilization(current.peakDemand, current[capacityKey]),
    currentSafeMargin: current[safeKey] - current.peakDemand,
    highestPeakUtilization: zeroCapacityRisk ? null : Math.max(0, ...limits.map((point) => capacityUtilization(point.peakDemand, point[capacityKey]) ?? 0)),
    zeroCapacityRisk,
    lowestSafeMargin: Math.min(...limits.map((point) => point[safeKey] - point.peakDemand)),
    largestDeficit: Math.max(0, ...limits.map((point) => point.peakDemand - point[capacityKey])),
    endCapacity: final[capacityKey],
  };
}

function requiredInstalledCapacity(inputs: CapacityInputs, points: CapacityPoint[]): number | null {
  let required = 0;
  for (const point of points) {
    const available = availableFraction(inputs, point.month, point.side);
    if (available === 0 && point.peakDemand > 0) return null;
    if (available > 0) required = Math.max(required, point.peakDemand / (inputs.safeUtilizationPercent / 100 * available));
  }
  return required;
}

/** Continuous compound demand, with instantaneous piecewise-constant capacity changes. */
export function simulateCapacity(values: CapacityValues): CapacityResult {
  const { inputs, issues } = parseInputs(values);
  if (issues.length) return { valid: false, issues };
  const peakDemand = Math.max(inputs.demand, capacityDemandAt(inputs, inputs.horizonMonths)) * inputs.peakMultiplier;
  if (!Number.isFinite(peakDemand) || peakDemand > 1_000_000_000_000_000) {
    return { valid: false, issues: [{ field: 'projection', message: 'Projected peak demand exceeds this model’s 1 quadrillion-unit limit. Shorten the horizon, reduce growth, or use a larger unit of measurement.' }] };
  }

  const events = eventMonths(inputs);
  const breaks = [...new Set([0, inputs.horizonMonths, ...events])].sort((a, b) => a - b);
  const limits: CapacityPoint[] = [capacityPointAt(inputs, 0)];
  for (let index = 1; index < breaks.length; index += 1) {
    limits.push(capacityPointAt(inputs, breaks[index], 'left'), capacityPointAt(inputs, breaks[index], 'right'));
  }

  const sampleMonths = [...new Set([
    ...Array.from({ length: inputs.horizonMonths * 4 + 1 }, (_, index) => index / 4),
    ...events,
  ])].sort((a, b) => a - b);
  const points = sampleMonths.flatMap((month) => events.includes(month) && month > 0
    ? [capacityPointAt(inputs, month, 'left'), capacityPointAt(inputs, month)]
    : [capacityPointAt(inputs, month)]);
  const current = summarizeScenario(inputs, 'current', limits, breaks);
  const expanded = summarizeScenario(inputs, 'expanded', limits, breaks);
  const requiredCapacityNow = requiredInstalledCapacity(inputs, limits);
  const expansionWithinHorizon = inputs.expansionMonth <= inputs.horizonMonths;
  const afterExpansion = limits.filter((point) => point.month > inputs.expansionMonth || (point.month === inputs.expansionMonth && point.side === 'right'));
  // Include the arrival instant even if no added units currently create a chart event.
  if (expansionWithinHorizon) afterExpansion.push(capacityPointAt(inputs, inputs.expansionMonth));
  const requiredAfterExpansion = expansionWithinHorizon ? requiredInstalledCapacity(inputs, afterExpansion) : null;
  return {
    valid: true,
    projection: {
      inputs,
      points,
      current,
      expanded,
      addedCapacity: inputs.capacityPerUnit * inputs.additionalUnits,
      peakDemand,
      requiredCapacityNow,
      requiredUnitsNow: requiredCapacityNow === null ? null : Math.max(0, Math.ceil((requiredCapacityNow - inputs.capacity) / inputs.capacityPerUnit - 1e-10)),
      requiredUnitsAtExpansion: requiredAfterExpansion === null ? null : Math.max(0, Math.ceil((requiredAfterExpansion - inputs.capacity) / inputs.capacityPerUnit - 1e-10)),
      reachesSafetyBeforeExpansion: current.safeCrossingMonth !== null && current.safeCrossingMonth < inputs.expansionMonth,
      expansionWithinHorizon,
    },
  };
}
