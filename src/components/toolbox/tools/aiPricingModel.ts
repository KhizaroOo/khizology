export type PricingLevel = 0 | 1 | 2;
export type PricingFactor = 'complexity' | 'clarity' | 'revisions' | 'dependencies' | 'deadline' | 'collaboration' | 'uncertainty';
export interface FactorDefinition {
  key: PricingFactor;
  label: string;
  options: [string, string, string];
  ranges: [[number, number], [number, number], [number, number]];
}

/** These are editable planning assumptions, not probabilities or observed market data. */
export const PRICING_FACTORS: FactorDefinition[] = [
  { key: 'complexity', label: 'Project complexity', options: ['Simple / familiar', 'Several moving parts', 'Complex / novel'], ranges: [[0, 5], [5, 15], [10, 25]] },
  { key: 'clarity', label: 'Requirements clarity', options: ['Clear acceptance criteria', 'Some open decisions', 'Scope still uncertain'], ranges: [[0, 5], [10, 25], [20, 40]] },
  { key: 'revisions', label: 'Revision risk', options: ['Tightly bounded', 'Some iteration expected', 'Open-ended revisions'], ranges: [[0, 5], [5, 15], [15, 30]] },
  { key: 'dependencies', label: 'Third-party dependencies', options: ['Few / stable', 'Several integrations', 'Unproven / fragile'], ranges: [[0, 5], [5, 15], [10, 25]] },
  { key: 'deadline', label: 'Deadline pressure', options: ['Comfortable', 'Tight', 'Urgent / inflexible'], ranges: [[0, 0], [5, 10], [10, 20]] },
  { key: 'collaboration', label: 'Client collaboration burden', options: ['One clear decision maker', 'Regular coordination', 'Many stakeholders'], ranges: [[0, 5], [5, 10], [10, 20]] },
  { key: 'uncertainty', label: 'Estimate uncertainty', options: ['Familiar work', 'Some unknowns', 'Discovery still needed'], ranges: [[0, 5], [5, 15], [15, 30]] },
];

export interface AiPricingInput {
  traditionalHours: number;
  aiHours: number;
  rate: number | null;
  supportWeeks: number;
  supportHoursPerWeek: number;
  reviewHours: number;
  factors: Record<PricingFactor, PricingLevel>;
  architecture: PricingLevel;
  criticality: PricingLevel;
  postLaunch: PricingLevel;
  reserveOverride: [number, number] | null;
}

export function calculateAiPricing(input: AiPricingInput) {
  const bounds: [number, number, string][] = [
    [input.traditionalHours, 10000, 'Traditional hours'], [input.aiHours, 10000, 'AI-assisted hours'],
    [input.supportWeeks, 104, 'Support weeks'], [input.supportHoursPerWeek, 80, 'Support hours per week'],
    [input.reviewHours, 10000, 'Review hours'],
  ];
  if (input.rate !== null) bounds.push([input.rate, 100000, 'Hourly rate']);
  for (const [value, max, label] of bounds) if (!Number.isFinite(value) || value < 0 || value > max || (value > 0 && value < 0.01)) throw new RangeError(`${label} must be zero or between 0.01 and ${max}.`);
  for (const level of [input.architecture, input.criticality, input.postLaunch, ...Object.values(input.factors)]) {
    if (level !== 0 && level !== 1 && level !== 2) throw new RangeError('Choose a supported responsibility or risk level.');
  }
  const factors = PRICING_FACTORS.map(definition => {
    const level = input.factors[definition.key];
    if (level === undefined) throw new RangeError('A risk factor is missing.');
    const [low, high] = definition.ranges[level];
    return { key: definition.key, label: definition.label, selected: definition.options[level], low, high };
  });
  let reserveLowPct = factors.reduce((sum, factor) => sum + factor.low, 0);
  let reserveHighPct = factors.reduce((sum, factor) => sum + factor.high, 0);
  if (input.reserveOverride) {
    const [low, high] = input.reserveOverride;
    if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high > 300 || low > high) throw new RangeError('Reserve range must be between 0% and 300%, with the lower end first.');
    reserveLowPct = low; reserveHighPct = high;
  }
  const supportHours = input.supportWeeks * input.supportHoursPerWeek;
  const plannedHours = input.aiHours + input.reviewHours + supportHours;
  const reserveLowHours = input.aiHours * reserveLowPct / 100;
  const reserveHighHours = input.aiHours * reserveHighPct / 100;
  const lowHours = plannedHours + reserveLowHours;
  const highHours = plannedHours + reserveHighHours;
  const money = (hours: number) => input.rate === null ? null : hours * input.rate;
  const responsibility = Math.max(input.architecture, input.criticality, input.postLaunch) as PricingLevel;
  return {
    factors, reserveLowPct, reserveHighPct, supportHours, plannedHours, reserveLowHours, reserveHighHours, lowHours, highHours,
    hoursSaved: input.traditionalHours - input.aiHours,
    reductionPct: input.traditionalHours > 0 ? (input.traditionalHours - input.aiHours) / input.traditionalHours * 100 : null,
    timeBaseline: money(input.aiHours), traditionalBaseline: money(input.traditionalHours), lowPrice: money(lowHours), highPrice: money(highHours),
    responsibility, responsibilityLabel: ['Limited', 'Moderate', 'High'][responsibility],
  };
}
