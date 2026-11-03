/* Derived views for World 016: stories, pairs, the cost table, the household panel, the quiz, and the all-foods table. */
import { ALL_FOOD_FARM_SHARE, ALL_GROCERIES, COSTS, FOODS, LINKS, WAGES, cost, effect, food, incomeHit, sliceOf, slices, type CostId } from './foodModel.ts';
import { RATE_PCT, TARGET, cents, fx, shortName, signed } from './foodStory.ts';

export interface Story { id: string; label: string; cost: CostId; pct: number }
export const STORIES: readonly Story[] = [
  { id: 'crop-failure', label: 'Crop failure: farm gate +50%', cost: 'farm', pct: 50 },
  { id: 'fuel-spike', label: 'Fuel spike: energy +50%', cost: 'energy', pct: 50 },
  { id: 'trucking-disruption', label: 'Trucking disruption: transport +50%', cost: 'transport', pct: 50 },
  { id: 'wage-rise', label: 'Wage rise: +10% in every link', cost: 'wages', pct: 10 },
];
export interface Pair { id: string; a: string; b: string; label: string }
export const PAIRS: readonly Pair[] = [
  { id: 'bakery-eggs', a: 'Xf1102', b: 'Xf1110', label: 'Bakery vs fresh eggs' },
  { id: 'beef-soft-drinks', a: 'Xf1103', b: 'Xf1128', label: 'Beef vs soft drinks' },
  { id: 'fruit-snacks', a: 'Xf1113', b: 'Xf1117', label: 'Fresh fruits vs snack foods' },
  { id: 'milk-dairy', a: 'Xf1108', b: 'Xf1109', label: 'Fresh milk vs processed dairy' },
  { id: 'fresh-canned', a: 'Xf1114', b: 'Xf1115', label: 'Fresh vs canned & frozen produce' },
];
export const START_PAIR = PAIRS[0];

/** The cost table: shelf-price change if one cost rises 10%, for both foods, with the largest per food flagged. */
export interface RateCell { text: string; slice: string; best: boolean }
export interface RateRow { id: CostId; label: string; cells: [RateCell, RateCell] }
export function rateRows(foodA: string, foodB: string): RateRow[] {
  const vals = COSTS.map(c => [effect(foodA, c.id, RATE_PCT), effect(foodB, c.id, RATE_PCT)]);
  const top = [Math.max(...vals.map(v => v[0])), Math.max(...vals.map(v => v[1]))];
  return COSTS.map((c, i) => ({ id: c.id, label: c.label, cells: [foodA, foodB].map((f, k) => ({ text: `${signed(vals[i][k])}%`, slice: `${cents(sliceOf(f, c.id))} slice`, best: top[k] > 0 && vals[i][k] === top[k] })) as [RateCell, RateCell] }));
}

/** Household panel: the current shock applied to the average grocery basket. A scale of 50% of income keeps bars comparable. */
export const HH_SCALE = 50;
export function householdRows(c: CostId, pct: number) {
  const basket = effect(ALL_GROCERIES, c, pct);
  return { basket, rows: incomeHit(basket).map(r => ({ ...r, after: r.share + r.hitPoints, moved: r.hitPoints > 0.0001 })) };
}
export const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
export function householdText(r: ReturnType<typeof householdRows>['rows'][number]): string {
  return r.moved ? `${fx(r.share, 1)}% → ${fx(r.after, 1)}% of before-tax income · ${signed(r.hitPoints)} points · about ${usd(r.hitDollars)} more a year (now ${usd(r.spend)} on food)`
    : `${fx(r.share, 1)}% of before-tax income now · ${usd(r.spend)} a year on food`;
}
export const householdNote = (basket: number) => basket > 0.005
  ? `Under this shock the average grocery basket costs up to ${signed(basket)}% more. Upper bound: it treats the whole food bill, eating out included, like groceries, and assumes the same purchases and the same income.`
  : 'Move the slider or press “Play the shock” to see the weight on each household. Shares are USDA’s 2024 figures for total food spending.';

export interface QuizItem { q: string; options: string[]; answer: number; why: () => string }
export const QUIZ: readonly QuizItem[] = [
  { q: 'On average, how much of a dollar spent on groceries goes to farms?', options: ['About 5¢', 'About 18¢', 'About 50¢'], answer: 1, why: () => `It was ${cents(food(ALL_GROCERIES).farmShare)} in 2024 (USDA ERS). The rest pays for processing, transport, storage, wholesale, retail and services after the farm.` },
  { q: 'Farm prices jump 50%. Which shelf price can rise the most?', options: ['Bakery products', 'Fresh eggs', 'Soft drinks and bottled water'], answer: 1,
    why: () => `Fresh eggs: farms get ${cents(food('Xf1110').farmShare)} of the egg dollar, so up to ${signed(effect('Xf1110', 'farm', TARGET))}%. Bakery products: ${cents(food('Xf1102').farmShare)}, so up to ${signed(effect('Xf1102', 'farm', TARGET))}%. Soft drinks: ${cents(food('Xf1128').farmShare)}, so up to ${signed(effect('Xf1128', 'farm', TARGET))}%.` },
  { q: 'Every food price rises 10% and people buy the same things. Whose share of income spent on food grows the most?', options: ['The lowest-income fifth', 'The middle fifth', 'The highest-income fifth'], answer: 0,
    why: () => { const h = incomeHit(10); return `The lowest fifth: ${signed(h[0].hitPoints)} points of income (about ${usd(h[0].hitDollars)} a year). Middle: ${signed(h[1].hitPoints)} points. Highest: ${signed(h[2].hitPoints)} points, though that is the most dollars (about ${usd(h[2].hitDollars)}). The same rise weighs more on a smaller budget.`; } },
];

/** Reality check numbers: the stack arithmetic for all food at a 10% farm-price rise. */
export const allFoodCeiling = () => ALL_FOOD_FARM_SHARE * RATE_PCT / 100;

export const ALL_FOODS_HEAD = ['Food', 'Farm gate', 'Processing', 'Transport', 'Wholesale', 'Retail', 'Energy', 'Fin./ads/legal', 'Wages (all links)'];
export function allFoodsRows(): string[][] { return FOODS.map(f => { const s = slices(f.id); return [f.name, ...LINKS.map(l => fx(s[l.id], 1)), fx(f.labor, 1)]; }); }
export const costTitle = (id: CostId) => (id === 'wages' ? WAGES.label : cost(id).label);
export { shortName };
