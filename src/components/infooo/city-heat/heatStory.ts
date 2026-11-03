/* The teaching layer for World 015: plain-number formatting, the two-block comparison, key moments and narration.
   Everything here is derived from heatModel output; no sentence quotes a number that the model did not produce. */
import { BLOCKS, applyLever, frame, indexAt, simulate, START, type Block, type LeverId, type Series, type WeatherId } from './heatModel.ts';

const MINUS = '−';
export function num(x: number, d = 1) { const s = Math.abs(x).toFixed(d); return (x < 0 && Number(s) !== 0 ? MINUS : '') + s; }
export const deg = (x: number, d = 1) => `${num(x, d)}°C`;
export function signed(x: number, d = 1) { const s = num(x, d); return (x > 0 && Number(s) !== 0 ? '+' : '') + s; }
export const pct = (x: number) => `${Math.round(x * 100)}%`;
const times = (r: number) => Number.isNaN(r) ? 'more' : `${num(r)}×`;

export function clockText(h: number) {
  const hh = ((h % 24) + 24) % 24; let H = Math.floor(hh), m = Math.round((hh - H) * 60);
  if (m === 60) { H = (H + 1) % 24; m = 0; }
  return `${(H + 11) % 12 + 1}:${m < 10 ? '0' : ''}${m} ${H >= 12 ? 'PM' : 'AM'}`;
}
export function dayOf(h: number, days: number) { return Math.min(days, Math.floor((h - START + 1e-6) / 24) + 1); }
export function phaseOf(h: number) {
  const hh = ((h % 24) + 24) % 24;
  if (hh >= 5 && hh < 6) return 'Before sunrise';
  if (hh >= 6 && hh < 11) return 'Morning';
  if (hh >= 11 && hh < 14) return 'Midday';
  if (hh >= 14 && hh < 17.5) return 'Afternoon';
  if (hh >= 17.5 && hh < 19.5) return 'Evening';
  return 'Night';
}
export const endHour = (days: number) => START + 24 * days;

/* ---------- simulations ---------- */
export interface Sims { A: Series; B: Series; R: Series; A0: Series | null; blockA: Block; storeMax: number }
export function runSims(weather: WeatherId, lever: LeverId, days: number): Sims {
  const blockA = applyLever(BLOCKS.paved, lever);
  const A = simulate(blockA, weather, { days }), B = simulate(BLOCKS.green, weather, { days }), R = simulate(BLOCKS.open, weather, { days });
  const A0 = lever === 'none' ? null : simulate(BLOCKS.paved, weather, { days });
  return { A, B, R, A0, blockA, storeMax: Math.max(...A.store, ...B.store) || 1 };
}

export interface Stats {
  sg9: number; sg15: number; ag15: number; ratio15: number; tsA195: number; stA195: number; stB195: number; ratio195: number;
  relA22: number; relB22: number; sg3: number; ag3: number; stA3: number; stB3: number; relA3: number; ratio3: number;
  agR15: number; agR3: number; stAEnd: number; stBEnd: number; agEnd: number; fadeSurf: number; fadeAir: number; nights: number[];
}
/* Key moments of day 1 (and the later nights) used for narration and the reveal. */
export function computeStats(sims: Sims, days: number): Stats {
  const { A, B, R } = sims, at = (h: number) => indexAt(A, h);
  const i9 = at(9), i15 = at(15), i195 = at(19.5), i22 = at(22), i3 = at(27), iEnd = at(29);
  const ratio = (a: number, b: number) => b > 0.05 ? a / b : NaN;
  const s = {
    sg9: A.ts[i9] - B.ts[i9], sg15: A.ts[i15] - B.ts[i15], ag15: A.ta[i15] - B.ta[i15], ratio15: ratio(A.store[i15], B.store[i15]),
    tsA195: A.ts[i195], stA195: A.store[i195], stB195: B.store[i195], ratio195: ratio(A.store[i195], B.store[i195]),
    relA22: -A.toMass[i22], relB22: -B.toMass[i22],
    sg3: A.ts[i3] - B.ts[i3], ag3: A.ta[i3] - B.ta[i3], stA3: A.store[i3], stB3: B.store[i3], relA3: -A.toMass[i3], ratio3: ratio(A.store[i3], B.store[i3]),
    agR15: A.ta[i15] - R.ta[i15], agR3: A.ta[i3] - R.ta[i3],
    stAEnd: A.store[iEnd], stBEnd: B.store[iEnd], agEnd: A.ta[iEnd] - B.ta[iEnd], fadeSurf: NaN, fadeAir: NaN, nights: [] as number[],
  };
  s.fadeSurf = s.sg15 > 0.05 ? 1 - s.sg3 / s.sg15 : NaN;
  s.fadeAir = s.ag15 > 0.05 ? 1 - s.ag3 / s.ag15 : NaN;
  for (let d = 0; d < days; d++) { const k = indexAt(A, 27 + 24 * d); s.nights.push(A.ta[k] - B.ta[k]); }
  return s;
}

/* ---------- the optional guess ---------- */
export type GuessId = 'surface' | 'air' | 'both';
export const GUESS_LABEL: Record<GuessId, string> = { surface: 'Hot surfaces fade first', air: 'Warm air fades first', both: 'Both fade together' };
export function guessOutcome(s: Stats): GuessId {
  if (s.fadeSurf - s.fadeAir > 0.1) return 'surface';
  if (s.fadeAir - s.fadeSurf > 0.1) return 'air';
  return 'both';
}

/* ---------- beats + narration ---------- */
export type BeatKey = 'start' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'deep' | 'dawnN' | 'afternoonN' | 'nightN' | 'deepN' | 'end';
export interface Beat { h: number; key: BeatKey; hold: number; day?: number }
export function buildBeats(days: number): Beat[] {
  const b: Beat[] = [{ h: 5, key: 'start', hold: 0 }, { h: 9, key: 'morning', hold: 2800 }, { h: 15, key: 'afternoon', hold: 3400 },
    { h: 19.5, key: 'sunset', hold: 3400 }, { h: 22, key: 'night', hold: 3400 }, { h: 27, key: 'deep', hold: 3400 }];
  for (let d = 2; d <= days; d++) {
    const o = 24 * (d - 1);
    b.push({ h: o + 5, key: 'dawnN', day: d, hold: 1800 }, { h: o + 15, key: 'afternoonN', day: d, hold: 1800 }, { h: o + 22, key: 'nightN', day: d, hold: 1800 }, { h: o + 27, key: 'deepN', day: d, hold: 2600 });
  }
  b.push({ h: endHour(days), key: 'end', hold: 0 });
  return b;
}
export function beatAt(beats: Beat[], h: number): Beat { let cur = beats[0]; for (const beat of beats) if (beat.h <= h + 1e-6) cur = beat; return cur; }

export function narrate(beat: Beat, sims: Sims, s: Stats, days: number): [string, string] {
  const { A, B } = sims, d = beat.day ?? 1;
  switch (beat.key) {
    case 'start': return ['5 AM · Same start.', 'Both blocks begin at the air temperature. Press Run and watch what the same sunshine does to each.'];
    case 'morning': return ['9 AM · The sun climbs.', `Block A’s dark surfaces soak up most of the light. Block B reflects more, and its trees catch some first. Already ${deg(s.sg9)} hotter.`];
    case 'afternoon': return ['3 PM · Hot surfaces, warm air.', `Block A’s surfaces are ${deg(s.sg15)} hotter than B’s, but its air is only ${deg(s.ag15)} warmer. A hot surface is not hot air. A has stored ${times(s.ratio15)} the heat.`];
    case 'sunset': return ['7:30 PM · The sun is gone. The heat isn’t.', `A’s surface has fallen to ${deg(s.tsA195, 0)}, yet its walls and ground hold ${num(s.stA195)} MJ/m², ${times(s.ratio195)} Block B’s.`];
    case 'night': return ['10 PM · Stored heat flows back out.', `Block A’s walls and ground give heat back to the street at about ${num(s.relA22, 0)} W/m². Block B: ${num(s.relB22, 0)}.`];
    case 'deep': return ['3 AM · Cities store heat and release it later.', `Surface gap: ${deg(s.sg3)} (was ${deg(s.sg15)} at 3 PM). Air gap: ${deg(s.ag3)} (was ${deg(s.ag15)}). Block A is still giving heat back.`];
    case 'dawnN': { const fa = frame(A, beat.h), fb = frame(B, beat.h); return [`Day ${d} · 5 AM.`, `Block A starts ${deg(fa.ta - fb.ta)} warmer and still holds ${num(fa.store)} MJ/m² from yesterday. The night did not reset it.`]; }
    case 'afternoonN': { const a = frame(A, beat.h), b = frame(B, beat.h); return [`Day ${d} · 3 PM.`, `Surfaces ${deg(a.ts - b.ts)} apart, air ${deg(a.ta - b.ta)}. Block A now holds ${num(a.store)} MJ/m² (B: ${num(b.store)}).`]; }
    case 'nightN': { const a = frame(A, beat.h), b = frame(B, beat.h); return [`Day ${d} · 10 PM.`, `Air gap ${deg(a.ta - b.ta)}. Each hot day leaves more heat inside Block A for the night to release.`]; }
    case 'deepN': return [`Night ${d} · 3 AM.`, `Air gap ${deg(s.nights[d - 1])} (night 1: ${deg(s.nights[0])}).`];
    case 'end':
      if (days === 1) return ['5 AM · The next sun is coming.', `Block A still holds ${num(s.stAEnd)} MJ/m² (B: ${num(s.stBEnd)}). Tomorrow starts from there. Try three hot days in a row.`];
      return [`Dawn after ${days} hot days.`, `Night air gap, night by night: ${s.nights.map(x => deg(x)).join(' → ')}. Stored heat that never fully leaves keeps stacking up.`];
  }
}

/* ---------- the reveal ---------- */
export function ahaLines(s: Stats, stage: number): string[] {
  const li = [`By sunset, Block A’s surfaces had cooled to ${deg(s.tsA195, 0)}, yet its walls and ground still held ${num(s.stA195)} MJ/m²${Number.isNaN(s.ratio195) ? '' : `, ${num(s.ratio195)}× Block B’s`}.`,
    `After dark that stored heat flows back out into the street: about ${num(s.relA22, 0)} W/m² at 10 PM.`];
  if (stage >= 2) li.push(`At 3 AM the surface difference between the blocks was down to ${deg(s.sg3)} (from ${deg(s.sg15)} at 3 PM). The air difference was ${deg(s.ag3)} (from ${deg(s.ag15)}). Compared with open countryside, Block A’s air was ${deg(s.agR3)} warmer at 3 AM and ${deg(s.agR15)} warmer at 3 PM.`);
  return li;
}
export function ahaGuessText(s: Stats, guess: GuessId | null, stage: number): string {
  if (stage < 2 || !guess) return '';
  const fs = s.fadeSurf, fa = s.fadeAir;
  return `You guessed “${GUESS_LABEL[guess]}”. ${guess === guessOutcome(s) ? 'Right. ' : 'Not this time. '}The surface difference faded by ${pct(fs)}; the air difference ${fa >= 0 ? `faded by ${pct(fa)}` : `grew by ${pct(-fa)}`}.`;
}
