// Model verification for Infooo World 015 "Why Cities Trap Heat".
// Run: node --experimental-strip-types scripts/test-infooo-city-heat.mts
import assert from 'node:assert/strict';
import { BLOCKS, LEVERS, WEATHER, applyLever, energyBalance, indexAt, sampleCount, simulate, type BlockId, type WeatherId } from '../src/components/infooo/city-heat/heatModel.ts';
import { ahaGuessText, ahaLines, beatAt, buildBeats, clockText, computeStats, endHour, guessOutcome, narrate, runSims, type GuessId } from '../src/components/infooo/city-heat/heatStory.ts';
import { QUIZ, bestLevers, chartData, chartNote, dataRows, leverCell, leverRows, nightSpans, paramRows } from '../src/components/infooo/city-heat/heatViews.ts';

let passed = 0;
function t(name: string, fn: () => void) { fn(); passed++; console.log('  ok  ', name); }
const W = Object.keys(WEATHER) as WeatherId[], B = Object.keys(BLOCKS) as BlockId[];
const run = (b: BlockId, w: WeatherId, days = 1) => simulate(BLOCKS[b], w, { days });
const at = indexAt;

console.log('Integrity');
t('deterministic: two runs are identical', () => assert.deepEqual(run('paved', 'clear').ta, run('paved', 'clear').ta));
t('sample count and hours are regular (1 and 3 days)', () => {
  for (const d of [1, 3]) {
    const r = run('paved', 'clear', d); assert.equal(r.hours.length, sampleCount(d));
    for (let i = 1; i < r.hours.length; i++) assert.ok(Math.abs(r.hours[i] - r.hours[i - 1] - 1 / 6) < 1e-9);
    assert.equal(r.hours[0], 5); assert.ok(Math.abs(r.hours.at(-1)! - (5 + 24 * d)) < 1e-9);
  }
});
t('no NaN or Infinity in any series (3 blocks x 3 weathers x 3 days)', () => {
  for (const b of B) for (const w of W) { const r = run(b, w, 3); for (const k of ['ts', 'ta', 'tm', 'toMass', 'toAir', 'toSky', 'store', 'sun'] as const) r[k].forEach(v => assert.ok(Number.isFinite(v), `${b} ${w} ${k}`)); }
});
t('energy is conserved: residual < 1e-9 of daily sunlight (all blocks and weathers; fresh and settled)', () => {
  for (const b of B) for (const w of W) for (const mode of ['fresh', 'settled'] as const) { const e = energyBalance(BLOCKS[b], w, { mode }); assert.ok(Math.abs(e.residual) / e.scale < 1e-9, `${b} ${w} ${mode} ${e.residual / e.scale}`); }
});
t('settled mode converges within the cap', () => { const r = simulate(BLOCKS.paved, 'clear', { mode: 'settled' }); assert.ok(r.drift <= 0.004 && r.spinupDays < 150, `${r.spinupDays} days, drift ${r.drift}`); });
t('no-change lever equals the base block exactly', () => assert.deepEqual(simulate(applyLever(BLOCKS.paved, 'none'), 'clear').ts, run('paved', 'clear').ts));
t('levers never mutate the base block', () => { const before = JSON.stringify(BLOCKS.paved); for (const l of LEVERS) applyLever(BLOCKS.paved, l.id); assert.equal(JSON.stringify(BLOCKS.paved), before); });
t('both blocks start the morning at the same air temperature, with nothing stored', () => { const A = run('paved', 'clear'), G = run('green', 'clear'); assert.equal(A.ta[0], G.ta[0]); assert.equal(A.store[0], 0); });

console.log('Published ranges (EPA: US urban minus outlying, daytime 0.6-3.9 C, night 1.1-2.8 C; roofs up to 66 F = 36.7 C above air)');
const A = run('paved', 'clear'), G = run('green', 'clear'), R = run('open', 'clear');
t('block A minus countryside, 3 PM, is inside the EPA daytime range', () => { const d = A.ta[at(A, 15)] - R.ta[at(A, 15)]; assert.ok(d >= 0.6 && d <= 3.9, d.toFixed(2)); });
t('block A minus countryside, 3 AM, is inside the EPA night range', () => { const d = A.ta[at(A, 27)] - R.ta[at(A, 27)]; assert.ok(d >= 1.1 && d <= 2.8, d.toFixed(2)); });
t('the night gap versus countryside exceeds the daytime gap', () => assert.ok(A.ta[at(A, 27)] - R.ta[at(A, 27)] > A.ta[at(A, 15)] - R.ta[at(A, 15)]));
t('the hottest surface stays below the "up to 66 F above air" ceiling', () => { for (let i = 0; i < A.ts.length; i++) assert.ok(A.ts[i] - A.ta[i] <= 36.7, `at ${A.hours[i]}`); });
t('countryside sits between A and B in surface temperature at 3 PM, and below both in air at 3 AM', () => { const i = at(A, 15), j = at(A, 27); assert.ok(G.ts[i] < R.ts[i] && R.ts[i] < A.ts[i]); assert.ok(R.ta[j] < G.ta[j] && R.ta[j] < A.ta[j]); });

console.log('The story the world tells');
t('3 PM: the surface difference is more than 5x the air difference', () => { const i = at(A, 15); assert.ok((A.ts[i] - G.ts[i]) > 5 * (A.ta[i] - G.ta[i])); });
t('after dark the surface difference shrinks by more than the air difference', () => {
  const i = at(A, 15), j = at(A, 27), fs = 1 - (A.ts[j] - G.ts[j]) / (A.ts[i] - G.ts[i]), fa = 1 - (A.ta[j] - G.ta[j]) / (A.ta[i] - G.ta[i]);
  assert.ok(fs > fa + 0.3, `${fs.toFixed(2)} vs ${fa.toFixed(2)}`);
});
t('block A stores more than twice the heat of B by sunset, and still holds most of it at dawn', () => { const s = at(A, 19.5), e = at(A, 29); assert.ok(A.store[s] > 2 * G.store[s]); assert.ok(A.store[e] > 0.7 * Math.max(...A.store)); });
t('block A is still releasing stored heat at 3 AM', () => assert.ok(A.toMass[at(A, 27)] < 0));
t('stored heat charges by day (positive flux) and releases by night (negative flux)', () => { assert.ok(A.toMass[at(A, 12)] > 100); assert.ok(A.toMass[at(A, 22)] < -5); });
t('three hot days: the night air gap versus B grows each night, and stored heat at sunset grows each day', () => {
  const a = run('paved', 'clear', 3), b = run('green', 'clear', 3);
  const g = (d: number) => a.ta[at(a, 27 + 24 * d)] - b.ta[at(a, 27 + 24 * d)], s = (d: number) => a.store[at(a, 19.5 + 24 * d)];
  assert.ok(g(1) > g(0) && g(2) > g(1)); assert.ok(s(1) > s(0) && s(2) > s(1));
});

console.log('Weather (EPA: clear and calm strongest; cloud and wind weaken the heat island)');
for (const w of ['cloudy', 'windy'] as const) t(`${w} weakens the 3 PM surface gap, the 3 PM air gap and the 3 AM air gap versus countryside`, () => {
  const a = run('paved', w), b = run('green', w), r = run('open', w), i = at(a, 15), j = at(a, 27);
  assert.ok(a.ts[i] - b.ts[i] < A.ts[i] - G.ts[i]); assert.ok(a.ta[i] - b.ta[i] < A.ta[i] - G.ta[i]); assert.ok(a.ta[j] - r.ta[j] < A.ta[j] - R.ta[j]);
});

console.log('Levers on block A (afternoon surface, afternoon air, 3 AM air, stored at sunset)');
const m = (r: ReturnType<typeof run>) => ({ s: r.ts[at(r, 15)], a: r.ta[at(r, 15)], n: r.ta[at(r, 27)], st: r.store[at(r, 19.5)] });
const b0 = m(A), L = Object.fromEntries((['trees', 'roofs', 'grass', 'sky'] as const).map(l => [l, m(simulate(applyLever(BLOCKS.paved, l), 'clear'))]));
t('every lever lowers all four measures', () => { for (const l in L) for (const k of ['s', 'a', 'n', 'st'] as const) assert.ok(L[l][k] < b0[k], `${l} ${k}`); });
t('trees give the biggest afternoon surface drop; open sky the biggest 3 AM air drop; trees cut storage most', () => {
  const best = (k: 's' | 'n' | 'st') => Object.keys(L).sort((x, y) => (L[x][k] - b0[k]) - (L[y][k] - b0[k]))[0];
  assert.equal(best('s'), 'trees'); assert.equal(best('n'), 'sky'); assert.equal(best('st'), 'trees');
});
t('trees cool the surface far more than the air (field studies: surface 14-23 C, air tenths of a degree)', () => assert.ok((b0.s - L.trees.s) > 10 * (b0.a - L.trees.a)));
t('tree air-cooling per +10% canopy is at most 0.2 C (study range 0.01-0.1; documented as an upper bound)', () => {
  const p = { ...BLOCKS.paved, shade: BLOCKS.paved.shade + 0.1, veg: BLOCKS.paved.veg + 0.067, svf: BLOCKS.paved.svf - 0.017 };
  const c = b0.a - m(simulate(p, 'clear')).a; assert.ok(c > 0 && c <= 0.2, c.toFixed(3));
});

console.log('Robustness under +/-30% parameter uncertainty (400 seeded draws)');
function mulberry32(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261030), jig = (v: number, p: number) => v * (1 + (rnd() * 2 - 1) * p), add = (v: number, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v + (rnd() * 2 - 1) * d));
const N = 400, c = { stored: 0, release: 0, surfAir: 0, fade: 0, nightWarm: 0 };
for (let n = 0; n < N; n++) {
  const physics = { S0: jig(820, .15), HR: jig(7, .3), LEMAX: jig(250, .3), CA: jig(3e4, .3), GD: jig(120, .3), GN: jig(14, .3), CANOPY: jig(.28, .3) };
  const pa = { ...BLOCKS.paved, albedo: add(.14, .04, .05, .3), shade: add(.05, .05, 0, .2), veg: add(.03, .03, 0, .1), svf: add(.45, .1, .2, .7), cm: jig(1.8e6, .3), k: jig(11, .3) };
  const pb = { ...BLOCKS.green, albedo: add(.32, .06, .15, .5), shade: add(.4, .1, .15, .6), veg: add(.45, .1, .2, .7), svf: add(.55, .1, .3, .8), cm: jig(.7e6, .3), k: jig(7, .3) };
  const a = simulate(pa, 'clear', { physics }), b = simulate(pb, 'clear', { physics }), i = at(a, 15), j = at(a, 27), s = at(a, 19.5);
  if (a.store[s] > 2 * b.store[s]) c.stored++; if (a.toMass[j] < 0) c.release++; if (a.ts[i] - b.ts[i] > 5 * (a.ta[i] - b.ta[i])) c.surfAir++;
  if (1 - (a.ts[j] - b.ts[j]) / (a.ts[i] - b.ts[i]) > 0.3 + (1 - (a.ta[j] - b.ta[j]) / (a.ta[i] - b.ta[i]))) c.fade++; if (a.ta[j] - b.ta[j] > 0.3) c.nightWarm++;
}
const rate = (k: keyof typeof c) => c[k] / N;
t('claims that hold nearly always (>=97%): storage, release, surface-vs-air', () => assert.ok(rate('stored') >= .97 && rate('release') >= .97 && rate('surfAir') >= .97));
t('claims that hold usually (>=85%): fade-order and night warmth (the reveal is computed live, never hard-coded)', () => assert.ok(rate('fade') >= .85 && rate('nightWarm') >= .85));

console.log('Teaching layer (stats, beats, narration, reveal, tables)');
for (const w of W) for (const days of [1, 3]) for (const lever of LEVERS.map(l => l.id)) {
  const sims = runSims(w, lever, days), s = computeStats(sims, days);
  t(`${w} · ${days} day(s) · ${lever}: stats finite, beats ordered, narration and tables render`, () => {
    for (const [k, v] of Object.entries(s)) if (k !== 'nights' && !Number.isNaN(v)) assert.ok(Number.isFinite(v), k);
    assert.equal(s.nights.length, days); s.nights.forEach(n => assert.ok(Number.isFinite(n)));
    const beats = buildBeats(days); assert.equal(beats[0].h, 5); assert.equal(beats.at(-1)!.h, endHour(days));
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i].h > beats[i - 1].h, 'beats strictly increase');
    for (const beat of beats) { const [title, text] = narrate(beat, sims, s, days); assert.ok(title && text, beat.key); assert.ok(!/NaN|undefined|Infinity/.test(title + text), `${beat.key}: ${title} ${text}`); }
    assert.equal(beatAt(beats, 14.9).key, 'morning'); assert.equal(beatAt(beats, 15).key, 'afternoon');
    for (const stage of [1, 2]) ahaLines(s, stage).forEach(line => assert.ok(!/NaN|undefined|Infinity/.test(line), line));
    assert.equal(dataRows(sims, days).length, Math.ceil(sims.A.hours.length / 18)); assert.equal(paramRows(sims).length, 5);
    for (const tab of ['surface', 'air', 'diff', 'store'] as const) { const cd = chartData(tab, sims); assert.ok(cd.lines.every(l => l.d.length === sims.A.hours.length)); assert.ok(!/NaN/.test(chartNote(tab, sims))); assert.equal(cd.ghost === null, lever === 'none'); }
    assert.ok(nightSpans(sims.A).length >= days);
  });
}
t('the guess outcome is computed from the run, and every guess gets a truthful verdict', () => {
  const s = computeStats(runSims('clear', 'none', 1), 1), truth = guessOutcome(s);
  assert.equal(truth, 'surface', 'in the base run the surface difference fades first');
  for (const g of ['surface', 'air', 'both'] as GuessId[]) { const text = ahaGuessText(s, g, 2); assert.ok(text.includes(g === truth ? 'Right.' : 'Not this time.'), text); }
  assert.equal(ahaGuessText(s, 'surface', 1), '', 'no verdict before the 3 AM reveal'); assert.equal(ahaGuessText(s, null, 2), '');
});
t('the lever table shows no change as dashes, and flags exactly one best lever per column', () => {
  const rows = leverRows('clear'), best = bestLevers(rows);
  assert.equal(rows.length, LEVERS.length); assert.equal(leverCell(rows[0], rows[0], 's15'), '–');
  for (const col of ['s15', 'a15', 'a3', 'st'] as const) assert.ok(best[col] && best[col] !== 'none', col);
  assert.equal(best.s15, 'trees'); assert.equal(best.a3, 'sky');
  assert.ok(leverCell(rows[1], rows[0], 's15').startsWith('−'), 'a drop is shown with a minus sign');
});
t('every quiz answer index is valid and the explanation uses model output', () => {
  const s = computeStats(runSims('clear', 'none', 1), 1);
  for (const q of QUIZ) { assert.ok(q.answer >= 0 && q.answer < q.options.length); assert.ok(q.why(s).length > 20); assert.ok(!/NaN/.test(q.why(s))); }
});
t('clock text is correct across midnight and rounding', () => { assert.equal(clockText(5), '5:00 AM'); assert.equal(clockText(12), '12:00 PM'); assert.equal(clockText(24), '12:00 AM'); assert.equal(clockText(27), '3:00 AM'); assert.equal(clockText(19.5), '7:30 PM'); assert.equal(clockText(5 + 59.9 / 60), '6:00 AM'); });

console.log(`\nWorld 015 model: ${passed} checks passed`);
