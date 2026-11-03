// Model and content checks for Infooo World 016 "Why Food Prices Rise".
// Run: node --experimental-strip-types scripts/test-infooo-food-prices.mts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ALL_FOOD_FARM_SHARE, ALL_GROCERIES, COSTS, DOMAIN, FOODS, INCOME, LINKS, WAGES, effect, food, incomeHit, slices } from '../src/components/infooo/food-prices/foodModel.ts';
import { ahaLead, ahaLines, analyticsFood, calc, captionParts, cents, fx, money, showSliceLabel, signed, times, verdict } from '../src/components/infooo/food-prices/foodStory.ts';
import { PAIRS, QUIZ, STORIES, allFoodCeiling, allFoodsRows, householdRows, householdText, rateRows } from '../src/components/infooo/food-prices/foodViews.ts';

let checks = 0; const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++; };
const near = (a: number, b: number, e = 1e-9, msg = '') => ok(Math.abs(a - b) <= e, `${msg} ${a} vs ${b}`);
const ids = FOODS.map(f => f.id), costs = COSTS.map(c => c.id);

// ---- the data ----
ok(FOODS.length === 21 && new Set(ids).size === 21 && ids.includes(ALL_GROCERIES), '21 unique foods including all groceries');
FOODS.forEach(f => { near(f.farmShare + f.marketingShare, 100, 0.051, f.name); near(Object.values(f.groups).reduce((a, b) => a + b, 0), 100, 1.5, `${f.name} industry groups`); near(f.labor + f.propertyIncome + f.outputTaxes + f.imports, 100, 0.5, `${f.name} primary factors`); });
execFileSync('node', ['scripts/build-food-prices-data.mjs', '--check'], { stdio: 'pipe' }); checks++;   // foodData.ts is exactly what the USDA fixtures generate
near(food('Xf1100').farmShare, 18.5); near(food('Xf1100').labor, 47.2); near(food('Xf1110').farmShare, 69.1); near(food('Xf1102').farmShare, 4.8); near(food('Xf1103').farmShare, 52.2); near(food('Xf1108').farmShare, 50.8); near(food('Xf1128').farmShare, 1.3);
ok(INCOME[0].spend === 5498 && INCOME[0].share === 33.0 && INCOME[1].spend === 9097 && INCOME[1].share === 12.2 && INCOME[2].spend === 16989 && INCOME[2].share === 6.4, 'USDA household figures');
ok(ALL_FOOD_FARM_SHARE === 11.8, 'USDA all-food farm share');
ok(DOMAIN >= 100 + Math.max(...FOODS.map(f => f.farmShare)) && DOMAIN % 5 === 0, 'picture scale holds the tallest possible bar');

// ---- slices ----
ids.forEach(id => { const s = slices(id); near(Object.values(s).reduce((a, b) => a + b, 0), 100, 1e-9, `${id} sums to 100`); near(s.farm, food(id).farmShare, 1e-12, 'farm slice is the USDA farm share'); ok(Object.values(s).every(v => v >= 0 && Number.isFinite(v)), `${id} slices non-negative`); });
ids.forEach(id => { const g = food(id).groups, s = slices(id), r = s.processing / g.processing; near(s.retail / (g.retail + g.foodservices), r, 1e-9, `${id} retail scale`); near(s.energy / g.energy, r, 1e-9, `${id} energy scale`); near(s.services / (g.finance + g.legal + g.advertising), r, 1e-9, `${id} services scale`); });   // every link is USDA's value rescaled by one factor
ok(slices(ALL_GROCERIES).retail > slices(ALL_GROCERIES).farm && slices(ALL_GROCERIES).processing > slices(ALL_GROCERIES).farm, 'for the average grocery dollar, retail and processing exceed the farm gate');

// ---- effects ----
ids.forEach(id => costs.forEach(c => { ok(effect(id, c, 0) === 0, 'zero shock, zero effect'); near(effect(id, c, 40), 2 * effect(id, c, 20), 1e-9, 'linear'); }));
ids.forEach(id => near(LINKS.reduce((a, l) => a + effect(id, l.id, 10), 0), 10, 1e-9, `all links +10% => shelf +10% for ${id}`));
ok(!LINKS.some(l => (l.id as string) === 'wages') && WAGES.id === 'wages', 'wages are not part of the link sum');
near(effect('Xf1110', 'farm', 50), 34.55, 1e-9); near(effect('Xf1102', 'farm', 50), 2.4, 1e-9); ok(effect('Xf1110', 'farm', 50) / effect('Xf1102', 'farm', 50) > 14, 'a farm shock hits eggs 14x harder than bakery');
ok(effect('Xf1102', 'wages', 10) > effect('Xf1110', 'wages', 10), 'a wage shock hits bakery harder than eggs (the reversal)'); near(effect('Xf1102', 'wages', 10), 5.6, 1e-9); near(effect('Xf1110', 'wages', 10), 4.31, 1e-9);
near(effect(ALL_GROCERIES, 'farm', 10), 1.85, 1e-9);
ok(allFoodCeiling() > 0.4 && allFoodCeiling() < 3 * 0.4 + 0.0001 + 1, 'the all-food ceiling (11.8c x 10%) sits above the 0.4% regression estimate');
near(allFoodCeiling(), 1.18, 1e-9);
for (const id of ids) for (const c of costs) for (let p = 0; p <= 100; p += 5) { const e = effect(id, c, p); ok(Number.isFinite(e) && e >= 0 && e <= 100 + 1e-9, `${id} ${c} ${p}`); const x = calc(id, c, p); ok(x.total <= DOMAIN + 1e-9, `bar fits the picture scale: ${id} ${c} ${p}`); }

// ---- households ----
const h = incomeHit(10); near(h[0].hitPoints, 3.3); near(h[1].hitPoints, 1.22); near(h[2].hitPoints, 0.64);
ok(h[0].hitPoints > h[1].hitPoints && h[1].hitPoints > h[2].hitPoints && h[2].hitDollars > h[1].hitDollars && h[1].hitDollars > h[0].hitDollars, 'smaller budget, bigger share; bigger budget, more dollars');
{ const r = householdRows('wages', 10); near(r.basket, 4.72, 1e-9); ok(householdText(r.rows[0]).includes('33.0% → 34.6%') && householdText(r.rows[0]).includes('+1.6 points') && householdText(r.rows[0]).includes('$260'), 'household text'); ok(!householdText(householdRows('farm', 0).rows[0]).includes('→'), 'no arrow at zero'); }

// ---- text, rounding, story ----
ok(fx(34.55, 1) === '34.6' && fx(0.65, 1) === '0.7' && fx(2.4, 1) === '2.4' && signed(0) === '0.0' && signed(5) === '+5.0' && cents(18.5) === '18.5¢' && money(134.55) === '$1.35' && times(14.4) === '14×' && times(3.26) === '3.3×', 'one rounding rule');
{ const a = calc('Xf1102', 'farm', 50), b = calc('Xf1110', 'farm', 50);
  ok(captionParts(a, b, 'Bakery products', 'Fresh eggs', 'farm', 50)[1].includes('Fresh eggs moves 14× as much.') && captionParts(a, b, 'Bakery products', 'Fresh eggs', 'farm', 50)[1].includes('Ceiling, not a forecast.'), 'caption names the ratio and the ceiling');
  ok(captionParts(calc('Xf1102', 'farm', 0), calc('Xf1110', 'farm', 0), 'Bakery products', 'Fresh eggs', 'farm', 0)[0] === 'Start.', 'start caption');
  ok(ahaLead(a, b, 'Bakery products', 'Fresh eggs') === 'Same shock, 14× difference: Fresh eggs +34.6%, Bakery products +2.4%.', 'aha lead is computed');
  ok(ahaLines(a, b, 'Bakery products', 'Fresh eggs', 'farm', 50).every(l => !/NaN|undefined|Infinity/.test(l)), 'aha lines are clean');
  ok(ahaLines(calc('Xf1102', 'wages', 10), calc('Xf1110', 'wages', 10), 'Bakery products', 'Fresh eggs', 'wages', 10)[0].includes('wages are 56.0¢'), 'wage wording');
  ok(verdict('eggs').startsWith('You guessed fresh eggs. Right:') && verdict('bakery').includes('Not quite') && verdict('same').startsWith('You guessed about the same.') && verdict(null) === '', 'verdicts');
  ok(showSliceLabel(34) && !showSliceLabel(4.8), 'slice labels appear only where they fit'); }
ok(rateRows('Xf1102', 'Xf1110').filter(r => r.cells[0].best).map(r => r.id).join() === 'wages' && rateRows('Xf1102', 'Xf1110').filter(r => r.cells[1].best).map(r => r.id).join() === 'farm', 'largest cost per food in the table: bakery wages, eggs farm gate');
ok(rateRows('Xf1102', 'Xf1110').length === 8, 'eight costs'); ok(allFoodsRows().length === 21 && allFoodsRows().every(r => r.length === 9), 'all-foods table');

// ---- stories, pairs, quiz, analytics ids ----
ok(STORIES.every(s => costs.includes(s.cost) && s.pct > 0 && s.pct <= 100), 'stories use real costs'); ok(PAIRS.every(p => ids.includes(p.a) && ids.includes(p.b) && p.a !== p.b), 'pairs use real foods');
ok([...STORIES.map(s => `story-${s.id}`), ...PAIRS.map(p => `pair-${p.id}`), ...costs.map(c => `cost-${c}`), ...ids.map(i => `food-${analyticsFood(i)}`)].every(v => /^[a-z0-9-]+$/.test(v)), 'analytics identifiers are public-safe');
ok(QUIZ.length === 3 && QUIZ.every(q => q.answer >= 0 && q.answer < q.options.length && q.why().length > 20 && !/NaN|undefined/.test(q.why())), 'quiz well formed');
ok(Math.abs(food(ALL_GROCERIES).farmShare - 18) < Math.abs(food(ALL_GROCERIES).farmShare - 5) && Math.abs(food(ALL_GROCERIES).farmShare - 18) < Math.abs(food(ALL_GROCERIES).farmShare - 50), 'quiz 1: 18 cents is the closest option to the USDA figure');
ok(['Xf1102', 'Xf1110', 'Xf1128'].reduce((best, id) => effect(id, 'farm', 50) > effect(best, 'farm', 50) ? id : best) === 'Xf1110', 'quiz 2: eggs rise most');
ok(incomeHit(10).reduce((best, r) => r.hitPoints > best.hitPoints ? r : best).id === 'low', 'quiz 3: the lowest fifth');

// ---- sensitivity: how much do the claims depend on the one assumption (the split of the post-farm share)? ----
{
  let seed = 1031; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const keys = ['processing', 'transport', 'wholesale', 'retail', 'energy', 'services'] as const;
  const split = (id: string, w: Record<string, number>) => { const f = food(id), g = f.groups, m = 100 - f.farmShare, va: Record<string, number> = { processing: g.processing, transport: g.transport, wholesale: g.wholesale, retail: g.retail + g.foodservices, energy: g.energy, services: g.finance + g.legal + g.advertising }; let t = 0; for (const k of keys) { va[k] *= w[k]; t += va[k]; } const o: Record<string, number> = { farm: f.farmShare }; for (const k of keys) o[k] = m * va[k] / t; return o; };
  const N = 400; let retail = 0, proc = 0, largest = 0, bakeryBigger = 0;
  for (let i = 0; i < N; i++) { const w: Record<string, number> = {}; keys.forEach(k => { w[k] = 0.5 + rnd(); }); const g = split(ALL_GROCERIES, w), b = split('Xf1102', w), e = split('Xf1110', w);
    if (g.retail > g.farm) retail++; if (g.processing > g.farm) proc++; const top = Object.keys(g).sort((x, y) => g[y] - g[x])[0]; if (top === 'retail' || top === 'processing') largest++; if (['processing', 'wholesale', 'retail'].every(k => b[k] > e[k])) bakeryBigger++; }
  ok(retail / N >= 0.9 && proc / N >= 0.8 && largest / N >= 0.98 && bakeryBigger === N, `claims survive random +-50% changes to the post-farm split (retail>farm ${retail}/${N}, processing>farm ${proc}/${N}, retail-or-processing largest ${largest}/${N}, bakery>eggs at processing/wholesale/retail ${bakeryBigger}/${N})`);
  ok(effect('Xf1110', 'farm', 50) > 10 * effect('Xf1102', 'farm', 50), 'the headline farm-shock result uses USDA figures directly and does not depend on the split');
}
console.log(`World 016 model: ${checks} checks passed`);
