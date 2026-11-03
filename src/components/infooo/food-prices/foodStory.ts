/* Words and numbers for World 016: one rounding rule, names, the per-food calculation, the caption and the reveal.
   Every figure shown comes from foodModel.ts, never from fixed text. */
import { ALL_GROCERIES, DOMAIN, LINKS, cost, effect, food, sliceOf, slices, type CostId, type LinkId } from './foodModel.ts';

export const MINUS = '−';
/** Round half up with a tiny epsilon, so 34.55 shows as 34.6 (plain toFixed gives 34.5 because of binary floats). Used for every number on screen. */
export const fx = (x: number, d: number) => { const m = 10 ** d; return (Math.round(Math.abs(x) * m + 1e-7) / m).toFixed(d); };
export const signed = (x: number, d = 1) => { const s = fx(x, d); return (x > 0 && Number(s) !== 0 ? '+' : x < 0 && Number(s) !== 0 ? MINUS : '') + s; };
export const cents = (x: number) => `${fx(x, 1)}¢`;
export const cents0 = (x: number) => `${x >= 10 ? fx(x, 0) : fx(x, 1)}¢`;
export const money = (x: number) => `$${fx(x / 100, 2)}`;
export const times = (r: number) => `${r >= 10 ? fx(r, 0) : fx(r, 1)}×`;

export const TARGET = 50, RATE = 12.5, DEFAULT_PCT = 10, SHOW_AHA_AT = 40, RATE_PCT = 10, BAR_PX = 210;
/** Foods whose official USDA names are too long for a menu on a phone. */
const SHORT: Record<string, string> = { Xf1100: 'All groceries', Xf1105: 'Other meats', Xf1107: 'Fish & seafood', Xf1109: 'Processed dairy', Xf1112: 'Fats & oils', Xf1115: 'Canned & frozen produce', Xf1116: 'Sugar & sweets', Xf1118: 'Frozen prepared foods', Xf1127: 'Coffee & tea', Xf1128: 'Soft drinks & water' };
export const shortName = (id: string) => SHORT[id] ?? food(id).name;
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const LOWER: Record<string, string> = { wages: 'wages in every link', services: 'finance, ads and legal', processing: 'processing and packaging', transport: 'transport and storage' };
export const costLower = (id: CostId) => LOWER[id] ?? lc(cost(id).label);
export const analyticsFood = (id: string) => id.toLowerCase();

export type GuessId = 'bakery' | 'eggs' | 'same';
export const GUESS_LABEL: Record<GuessId, string> = { bakery: 'Bakery products', eggs: 'Fresh eggs', same: 'About the same' };

export interface SliceNow { id: LinkId; base: number; extra: number; now: number }
export interface Calc { id: string; eff: number; total: number; cap: number; slices: SliceNow[]; labor: number; hit: number }
export function calc(id: string, c: CostId, pct: number): Calc {
  const sl = slices(id), isWages = c === 'wages', eff = effect(id, c, pct);
  return { id, eff, total: 100 + eff, cap: isWages ? eff : 0, labor: food(id).labor, hit: sliceOf(id, c),
    slices: LINKS.map(l => ({ id: l.id, base: sl[l.id], extra: !isWages && l.id === c ? eff : 0, now: sl[l.id] + (!isWages && l.id === c ? eff : 0) })) };
}
export const barPercent = (cents: number) => cents / DOMAIN * 100;
export const showSliceLabel = (now: number) => barPercent(now) / 100 * BAR_PX >= 18;

export function captionParts(a: Calc, b: Calc, nA: string, nB: string, c: CostId, pct: number): [string, string] {
  if (pct < 0.5) return ['Start.', `A $1.00 item of ${lc(nA)} and of ${lc(nB)}, cut into slices. Nothing has changed yet. Press “Play the shock”, or drag the slider.`];
  const big = Math.max(a.eff, b.eff), small = Math.min(a.eff, b.eff);
  let body = `${nA} ${signed(a.eff)}%, ${nB} ${signed(b.eff)}%.`;
  if (small > 0.005 && big / small >= 1.5) body += ` ${a.eff > b.eff ? nA : nB} moves ${times(big / small)} as much.`;
  else if (big > 0.005) body += ' About the same.';
  return [`${cost(c).label} +${Math.round(pct)}%.`, `${body} Ceiling, not a forecast.`];
}

/** The reveal's verdict always judges the opening question (farm +50%, bakery vs eggs), whatever is on screen when it appears. */
export function verdict(guess: GuessId | null): string {
  if (!guess) return '';
  const eggs = effect('Xf1110', 'farm', TARGET), bakery = effect('Xf1102', 'farm', TARGET);
  return `You guessed ${guess === 'same' ? 'about the same' : lc(GUESS_LABEL[guess])}. ${guess === 'eggs' ? 'Right' : 'Not quite'}: with a 50% jump in farm prices, fresh eggs rise up to ${signed(eggs)}% and bakery products up to ${signed(bakery)}%.`;
}
export function ahaLead(a: Calc, b: Calc, nA: string, nB: string): string {
  const big = Math.max(a.eff, b.eff), small = Math.min(a.eff, b.eff);
  if (small > 0.005 && big / small >= 1.5) return `Same shock, ${times(big / small)} difference: ${a.eff > b.eff ? nA : nB} ${signed(big)}%, ${a.eff > b.eff ? nB : nA} ${signed(small)}%.`;
  return big > 0.005 ? `These two foods move by about the same: ${nA} ${signed(a.eff)}%, ${nB} ${signed(b.eff)}%.` : 'Move the slider to see the two foods part ways.';
}
export function ahaLines(a: Calc, b: Calc, nA: string, nB: string, c: CostId, pct: number): string[] {
  const w = c === 'wages', what = w ? 'wages' : `the ${costLower(c)} slice`, g = slices(ALL_GROCERIES);
  const line = (n: string, x: Calc) => `${n}: ${what} ${w ? 'are' : 'is'} ${cents(x.hit)} of its dollar, so +${Math.round(pct)}% there adds ${signed(x.eff)}% to the shelf price.`;
  return [line(nA, a), line(nB, b), `Across all groceries the farm gate is ${cents(g.farm)}. In this model retail takes about ${cents(g.retail)} and processing ${cents(g.processing)}. Most of a grocery price is made after the farm.`];
}
