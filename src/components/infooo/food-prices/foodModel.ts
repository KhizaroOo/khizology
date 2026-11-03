/* Where the shelf price comes from: a cost-slice model of one dollar of food (illustrative, deterministic, U.S. 2024).
   Each food's dollar is split into slices: the farm gate plus six links after the farm. A cost shock at one link grows that slice;
   with nothing else changing, the shelf price changes by slice x shock. First-order accounting with full and immediate
   pass-through, so every result is a ceiling, never a forecast. */
import { FOOD_ROWS, type FoodRow } from './foodData.ts';

export type LinkId = 'farm' | 'processing' | 'transport' | 'wholesale' | 'retail' | 'energy' | 'services';
export type CostId = LinkId | 'wages';
export interface CostInfo { id: CostId; label: string; note: string }
export const LINKS: readonly (CostInfo & { id: LinkId })[] = [
  { id: 'farm', label: 'Farm gate', note: 'What farms are paid. Weather, animal disease, feed and fertilizer costs all end up here.' },
  { id: 'processing', label: 'Processing & packaging', note: 'Mills, bakeries, plants, packaging.' },
  { id: 'transport', label: 'Transport & storage', note: 'Trucks, trains, warehouses, cold chain.' },
  { id: 'wholesale', label: 'Wholesale', note: 'Distributors that move food from plants to stores.' },
  { id: 'retail', label: 'Retail', note: 'Stores: staff, rent, shrink, taxes, profit.' },
  { id: 'energy', label: 'Energy', note: 'Fuel, electricity and gas used after the farm.' },
  { id: 'services', label: 'Finance, ads & legal', note: 'Insurance, lending, marketing, accounting.' },
];
export const WAGES: CostInfo & { id: 'wages' } = { id: 'wages', label: 'Wages in every link', note: 'Salaries and benefits, farm to store. They sit inside the slices above, so never add them together.' };
export const COSTS: readonly CostInfo[] = [...LINKS, WAGES];

/** Household food spending and share of before-tax income, 2024 (USDA ERS). Total food, eating out included. */
export interface IncomeFifth { id: 'low' | 'mid' | 'high'; label: string; spend: number; share: number }
export const INCOME: readonly IncomeFifth[] = [
  { id: 'low', label: 'Lowest-income fifth', spend: 5498, share: 33.0 },
  { id: 'mid', label: 'Middle fifth', spend: 9097, share: 12.2 },
  { id: 'high', label: 'Highest-income fifth', spend: 16989, share: 6.4 },
];
/** Farm share of the whole food dollar and of food away from home, 2024 (USDA ERS summary findings). Not in the per-food rows. */
export const ALL_FOOD_FARM_SHARE = 11.8, AWAY_FROM_HOME_FARM_SHARE = 7.1;
export const ALL_GROCERIES = 'Xf1100';

export const FOODS: readonly FoodRow[] = FOOD_ROWS;
export function food(id: string): FoodRow { const f = FOODS.find(x => x.id === id); if (!f) throw new Error(`Unknown food ${id}`); return f; }
export function cost(id: CostId): CostInfo { return COSTS.find(c => c.id === id)!; }

export type Slices = Record<LinkId, number>;
const cache = new Map<string, Slices>();
/** Slices in cents of a 100-cent shelf price. Farm gate = USDA farm share. The marketing share is split over the six links after the
    farm in the proportions of USDA's industry-group value added for that food (retail includes food services; services = finance + legal + advertising). */
export function slices(id: string): Slices {
  const hit = cache.get(id); if (hit) return hit;
  const f = food(id), g = f.groups, marketing = 100 - f.farmShare;
  const va = { processing: g.processing, transport: g.transport, wholesale: g.wholesale, retail: g.retail + g.foodservices, energy: g.energy, services: g.finance + g.legal + g.advertising };
  const total = Object.values(va).reduce((a, b) => a + b, 0);
  const out: Slices = { farm: f.farmShare, processing: marketing * va.processing / total, transport: marketing * va.transport / total, wholesale: marketing * va.wholesale / total, retail: marketing * va.retail / total, energy: marketing * va.energy / total, services: marketing * va.services / total };
  cache.set(id, out); return out;
}
/** Cents of the dollar behind a cost: a slice, or (for wages) USDA's salary-and-benefits figure. */
export function sliceOf(id: string, c: CostId): number { return c === 'wages' ? food(id).labor : slices(id)[c]; }
/** Percent change of the shelf price if one cost grows by `pct` percent, everything else unchanged and fully passed on. */
export function effect(id: string, c: CostId, pct: number): number { return sliceOf(id, c) * pct / 100; }

/** Household arithmetic: a basket price change times the share of income spent on food. Same purchases, same income. */
export function incomeHit(basketPct: number) {
  return INCOME.map(q => ({ ...q, hitPoints: basketPct * q.share / 100, hitDollars: q.spend * basketPct / 100 }));
}

/** Fixed picture scale: the tallest bar any food, cost and size can reach, rounded up to 5 cents. Never changes while the slider moves. */
export const DOMAIN = Math.ceil((100 + Math.max(...FOODS.flatMap(f => [f.farmShare, f.labor]))) / 5) * 5;
