/* Table, chart and quiz content for World 015, derived from model output. No React here, so it can be tested alone. */
import { BLOCKS, LEVERS, applyLever, indexAt, simulate, sunlight, type LeverId, type Series, type WeatherId } from './heatModel.ts';
import { clockText, deg, num, pct, signed, type Sims, type Stats } from './heatStory.ts';

/* ---------- "what each setting is" table ---------- */
export function paramRows(sims: Sims): string[][] {
  const a = sims.blockA, b = BLOCKS.green, c = BLOCKS.open;
  const row = (label: string, f: (x: typeof a) => string) => [label, f(a), f(b), f(c)];
  return [row('Reflects sunlight', x => pct(x.albedo)), row('Sunlight caught by trees', x => pct(x.shade)), row('Surface covered by plants', x => pct(x.veg)),
    row('Open sky seen from the street', x => pct(x.svf)), row('Heat capacity (MJ per m² per °C)', x => num(x.cm / 1e6, 2))];
}

/* ---------- the numbers behind the chart, every three hours ---------- */
export function dataRows(sims: Sims, days: number): string[][] {
  const { A, B, R } = sims, rows: string[][] = [];
  for (let i = 0; i < A.hours.length; i += 18) {
    const h = A.hours[i], d = Math.min(days, Math.floor((h - 5) / 24) + 1);
    rows.push([(days > 1 ? `D${d} ` : '') + clockText(h), num(A.ts[i]), num(B.ts[i]), num(A.ta[i]), num(B.ta[i]), num(R.ta[i]), num(A.store[i]), num(B.store[i])]);
  }
  return rows;
}

/* ---------- "change one thing" table ---------- */
export interface LeverRow { id: LeverId; label: string; s15: number; a15: number; a3: number; st: number }
export type LeverColumn = 's15' | 'a15' | 'a3' | 'st';
export const LEVER_COLUMNS: LeverColumn[] = ['s15', 'a15', 'a3', 'st'];
const leverCache = new Map<WeatherId, LeverRow[]>();
export function leverRows(weather: WeatherId): LeverRow[] {
  const cached = leverCache.get(weather);
  if (cached) return cached;
  const rows = LEVERS.map(l => {
    const r = simulate(applyLever(BLOCKS.paved, l.id), weather, { days: 1 });
    return { id: l.id, label: l.label, s15: r.ts[indexAt(r, 15)], a15: r.ta[indexAt(r, 15)], a3: r.ta[indexAt(r, 27)], st: r.store[indexAt(r, 19.5)] };
  });
  leverCache.set(weather, rows);
  return rows;
}
/** The lever with the biggest drop in each column. */
export function bestLevers(rows: LeverRow[]): Record<LeverColumn, LeverId | null> {
  const base = rows[0], best = {} as Record<LeverColumn, LeverId | null>;
  for (const c of LEVER_COLUMNS) { let m = 0, id: LeverId | null = null; for (const r of rows.slice(1)) if (r[c] - base[c] < m) { m = r[c] - base[c]; id = r.id; } best[c] = id; }
  return best;
}
export function leverCell(row: LeverRow, base: LeverRow, c: LeverColumn) {
  if (row.id === 'none') return '–';
  return signed(row[c] - base[c], c === 'a15' || c === 'a3' ? 2 : 1) + (c === 'st' ? ' MJ' : '°C');
}
export function baselineLine(base: LeverRow) {
  return `With no change, Block A reaches ${deg(base.s15, 0)} at the surface and ${deg(base.a15)} in the air at 3 PM, ${deg(base.a3)} at 3 AM, and holds ${num(base.st)} MJ/m² at sunset. Bold = the biggest drop in that column. Different fixes help at different times.`;
}

/* ---------- chart ---------- */
export type ChartTab = 'surface' | 'air' | 'diff' | 'store';
export const CHART_TABS: [ChartTab, string][] = [['surface', 'Surface temperature'], ['air', 'Air temperature'], ['diff', 'Air vs countryside'], ['store', 'Stored heat']];
export interface ChartLine { id: 'a' | 'b' | 'ref'; d: number[] }
export interface ChartData { area: boolean; zero: boolean; ghost: number[] | null; lines: ChartLine[] }
const diffOf = (x: number[], y: number[]) => x.map((v, i) => v - y[i]);
export function chartData(tab: ChartTab, sims: Sims): ChartData {
  const { A, B, R, A0 } = sims, line = (id: ChartLine['id'], d: number[]): ChartLine => ({ id, d });
  if (tab === 'surface') return { area: false, zero: false, ghost: A0 && A0.ts, lines: [line('ref', R.ts), line('b', B.ts), line('a', A.ts)] };
  if (tab === 'air') return { area: false, zero: false, ghost: A0 && A0.ta, lines: [line('ref', R.ta), line('b', B.ta), line('a', A.ta)] };
  if (tab === 'diff') return { area: false, zero: true, ghost: A0 && diffOf(A0.ta, R.ta), lines: [line('b', diffOf(B.ta, R.ta)), line('a', diffOf(A.ta, R.ta))] };
  return { area: true, zero: false, ghost: A0 && A0.store, lines: [line('ref', R.store), line('b', B.store), line('a', A.store)] };
}
export function legendItems(tab: ChartTab, changed: boolean): { cls: string; label: string }[] {
  const items = {
    air: [['a', 'Block A air'], ['b', 'Block B air'], ['ref', 'Open countryside air']],
    surface: [['a', 'Block A surface'], ['b', 'Block B surface'], ['ref', 'Open countryside surface']],
    diff: [['a', 'Block A'], ['b', 'Block B'], ['', '0 = same as open countryside']],
    store: [['a', 'Block A stored heat'], ['b', 'Block B stored heat'], ['ref', 'Open countryside']],
  }[tab].map(([cls, label]) => ({ cls, label }));
  return changed ? [...items, { cls: 'ghost', label: 'Block A before the change' }] : items;
}
export function chartNote(tab: ChartTab, sims: Sims): string {
  if (tab === 'diff') {
    const d = diffOf(sims.A.ta, sims.R.ta); let pk = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > d[pk]) pk = i;
    return `How much warmer each block’s street air is than open countryside under the same weather: the “urban heat island” as scientists measure it. Block A’s gap peaks at ${clockText(sims.A.hours[pk])} (${deg(d[pk])}). The EPA reports US city air about 0.6–3.9°C warmer by day and 1.1–2.8°C at night, on average.`;
  }
  return {
    air: 'In the model, Block A’s air stays above Block B’s after dark because it is being warmed from below by stored heat. The grey bands mark night. The dashed line is a third model run: open countryside under the same weather.',
    surface: 'Surfaces swing hard: they heat fast by day and drop fast after sunset. The surface difference collapses while the heat stored deeper does not. Switch to “Stored heat”.',
    store: 'Heat soaked up by walls, roofs and ground, counted from the first dawn. Block A takes in far more by day and gives back only some of it by morning.',
  }[tab];
}
export function chartDescription(tab: ChartTab, s: Stats, days: number) {
  return `Line chart of the ${tab === 'diff' ? 'air difference from countryside' : tab === 'store' ? 'stored heat' : `${tab} temperature`} for Block A and Block B across ${days} day${days > 1 ? 's' : ''}. At 3 PM on day 1 the surface difference is ${deg(s.sg15)} and the air difference ${deg(s.ag15)}; at 3 AM they are ${deg(s.sg3)} and ${deg(s.ag3)}. Drag to move the time, or use the time slider.`;
}
/** Shaded night spans as [startHour, endHour] pairs. */
export function nightSpans(sim: Series): [number, number][] {
  const spans: [number, number][] = []; let start: number | null = null;
  sim.hours.forEach((h, i) => {
    const night = sunlight(h) === 0;
    if (night && start === null) start = h;
    if (start !== null && (!night || i === sim.hours.length - 1)) { spans.push([start, night ? h : sim.hours[i - 1]]); start = null; }
  });
  return spans;
}
export function niceStep(range: number) { const raw = range / 5, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

/* ---------- quiz ---------- */
export interface QuizItem { q: string; options: string[]; answer: number; why: (s: Stats) => string }
export const QUIZ: QuizItem[] = [
  { q: 'At 3 PM, Block A’s surfaces are far hotter than Block B’s. What about the air?', options: ['Just as different as the surfaces', 'Much less different than the surfaces', 'Block B’s air is hotter'], answer: 1,
    why: s => `In this model the surface difference is ${deg(s.sg15)} but the air difference is only ${deg(s.ag15)}. The EPA notes that surface heat islands are strongest by day and that air temperatures differ much less.` },
  { q: 'After sunset the pavement cools fast. Where does the day’s heat go?', options: ['It is gone: sunlight was the only source', 'It leaves into space at once', 'Much of it was stored in walls and ground and flows out for hours'], answer: 2,
    why: s => `At 3 AM Block A still holds ${num(s.stA3)} MJ/m² and gives back about ${num(s.relA3, 0)} W/m². Studies of cities find that heat trapped by day is released at night (Varquez & Kanda, 2018).` },
  { q: 'Tree shade cooled asphalt by 14–23°C in one study. How much did a Boston study find 10% more tree canopy cools the afternoon air?', options: ['About 10°C', 'About 1°C', 'Under 0.1°C'], answer: 2,
    why: () => 'About 0.07°C (Smith et al., 2025). Shade changes the surface a lot, but the air mixes with hotter neighbours. That is why the tree row in the table is an upper bound.' },
];
