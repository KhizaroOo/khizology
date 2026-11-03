/* Why Cities Trap Heat: a small, deterministic energy-balance model (illustrative, not a forecast).
   Each block has three heat stores: surface skin (instant), thermal mass (slow) and street-level air.
   Units: W/m² of ground, J/m²K, °C, hours of local solar time. */

export type WeatherId = 'clear' | 'cloudy' | 'windy';
export type BlockId = 'paved' | 'green' | 'open';
export type LeverId = 'none' | 'trees' | 'roofs' | 'grass' | 'sky';

export interface Weather { id: WeatherId; label: string; cloud: number; wind: number }
export interface Block { id: BlockId; name: string; albedo: number; shade: number; veg: number; svf: number; cm: number; k: number }
export type BlockSettings = Omit<Block, 'id' | 'name'> & Partial<Pick<Block, 'id' | 'name'>>;
export interface Lever { id: LeverId; label: string; d: Partial<Record<'albedo' | 'shade' | 'veg' | 'svf' | 'cm' | 'k', number>> }
export interface Physics { S0: number; HR: number; LEMAX: number; CA: number; GD: number; GN: number; CANOPY: number }

export interface Series {
  hours: number[]; ts: number[]; ta: number[]; tm: number[]; tref: number[];
  toMass: number[]; toAir: number[]; toSky: number[]; sun: number[]; le: number[]; store: number[];
  days: number; spinupDays: number; drift: number;
}
export interface Frame { ts: number; ta: number; tm: number; store: number; toMass: number; sun: number; tref: number }
interface HeatState { tm: number; ta: number }
interface Fluxes { ts: number; qsw: number; le: number; toMass: number; toAir: number; toSky: number; vent: number; canopy: number; sun: number; tref: number }
export interface SimulateOptions { days?: number; mode?: 'fresh' | 'settled'; physics?: Partial<Physics> }

const DT = 20;                       // seconds per step
export const SUNRISE = 6.0;
export const SUNSET = 19.5;          // local solar hours
export const START = 5;              // a displayed day runs 05:00 -> 05:00, sampled every 10 minutes
const MAX_SPINUP_DAYS = 150, DRIFT_TOL = 0.004; // settle to a repeating day (K of mass drift per day)

export const PHYS: Physics = {
  S0: 820,          // clear-sky peak sunlight on flat ground (hazy summer sky), W/m²
  HR: 7,            // linearised long-wave exchange at warm-surface temperatures, W/m²K
  LEMAX: 250,       // peak evaporative cooling of fully vegetated, well-watered ground, W/m²
  CA: 3.0e4,        // heat capacity of the street-level air column (about 25 m deep), J/m²K
  GD: 120, GN: 14,  // mixing with regional air, W/m²K: deep daytime mixing vs shallow night layer
  CANOPY: 0.28,     // share of sunlight caught by leaves that reappears as warmth in the air
};

export const WEATHER: Record<WeatherId, Weather> = {
  clear: { id: 'clear', label: 'Hot, clear, calm', cloud: 0, wind: 1 },
  cloudy: { id: 'cloudy', label: 'Cloudy', cloud: 0.7, wind: 1 },
  windy: { id: 'windy', label: 'Windy', cloud: 0, wind: 4 },
};
const REGION = { tmin: 24, tmax: 35 }; // same regional air in every weather preset

export const BLOCKS: Record<BlockId, Block> = {
  paved: { id: 'paved', name: 'Dark & paved', albedo: 0.14, shade: 0.05, veg: 0.03, svf: 0.45, cm: 1.8e6, k: 11 },
  green: { id: 'green', name: 'Green & light', albedo: 0.32, shade: 0.40, veg: 0.45, svf: 0.55, cm: 0.7e6, k: 7 },
  open: { id: 'open', name: 'Open countryside', albedo: 0.22, shade: 0.0, veg: 0.5, svf: 0.97, cm: 0.6e6, k: 6 },
};

export const LEVERS: Lever[] = [
  { id: 'none', label: 'No change', d: {} },
  { id: 'trees', label: 'Add street trees', d: { shade: +0.30, veg: +0.20, svf: -0.05 } },
  { id: 'roofs', label: 'Reflective roofs', d: { albedo: +0.18 } },
  { id: 'grass', label: 'Grass, not asphalt', d: { veg: +0.30, albedo: +0.04, cm: -0.4e6, k: -2 } },
  { id: 'sky', label: 'Open the sky', d: { svf: +0.30, cm: -0.36e6 } },
];

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function applyLever(block: Block, leverId: LeverId): Block {
  const lever = LEVERS.find(l => l.id === leverId) ?? LEVERS[0];
  const out: Block = { ...block };
  for (const key of Object.keys(lever.d) as (keyof Lever['d'])[]) out[key] = out[key] + (lever.d[key] ?? 0);
  out.shade = clamp(out.shade, 0, 0.9); out.veg = clamp(out.veg, 0, 1);
  out.svf = clamp(out.svf, 0.1, 0.95); out.albedo = clamp(out.albedo, 0.03, 0.9);
  return out;
}

const mergePhys = (o?: Partial<Physics>): Physics => ({ ...PHYS, ...o });
const smooth01 = (a: number, b: number, x: number) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const wrap24 = (h: number) => ((h % 24) + 24) % 24;
/* Deep daytime mixing builds after mid-morning and collapses around sunset (a smooth, lagged switch). */
const mixing = (h: number) => { const hh = wrap24(h); return smooth01(6.5, 9.5, hh) * (1 - smooth01(17.5, 20.5, hh)); };

export function sunlight(h: number, ph: Physics = PHYS): number {
  const hh = wrap24(h);
  if (hh <= SUNRISE || hh >= SUNSET) return 0;
  return ph.S0 * Math.sin(Math.PI * (hh - SUNRISE) / (SUNSET - SUNRISE));
}

export function regionalAir(h: number): number {
  const hh = wrap24(h);
  let f: number;
  if (hh >= 5 && hh <= 15) f = (1 - Math.cos(Math.PI * (hh - 5) / 10)) / 2;
  else { const x = hh < 5 ? hh + 24 : hh; f = (1 + Math.cos(Math.PI * (x - 15) / 14)) / 2; }
  return REGION.tmin + (REGION.tmax - REGION.tmin) * f;
}

/* One time step. Returns fluxes (W/m²) for the state before the update and advances the state. */
function step(st: HeatState, p: BlockSettings, wx: Weather, h: number, ph: Physics): Fluxes {
  const sun = sunlight(h, ph) * (1 - 0.7 * wx.cloud);
  const sunFrac = sun / ph.S0;
  const tref = regionalAir(h);
  const tsky = tref - (16 - 10 * wx.cloud);
  const hc = 5 + 3.5 * wx.wind;
  const hA = hc + (1 - p.svf) * ph.HR;          // skin -> air (convection + radiation trapped between walls)
  const hS = p.svf * ph.HR;                     // skin -> open sky
  const aEff = p.albedo * (0.4 + 0.6 * p.svf);  // narrow streets re-absorb reflected light
  const qsw = (1 - aEff) * (1 - p.shade) * sun;
  const le = p.veg * ph.LEMAX * sunFrac;
  const canopy = ph.CANOPY * p.shade * sun;
  const ts = (qsw - le + hA * st.ta + hS * tsky + p.k * st.tm) / (hA + hS + p.k);
  const g = (ph.GN + (ph.GD - ph.GN) * mixing(h) * (1 - 0.4 * wx.cloud)) * (1 + 0.8 * (wx.wind - 1));
  const toMass = p.k * (ts - st.tm);
  const toAir = hA * (ts - st.ta);
  const toSky = hS * (ts - tsky);
  const vent = g * (tref - st.ta);
  st.tm += DT * toMass / p.cm;
  st.ta += DT * (toAir + vent + canopy) / ph.CA;
  return { ts, qsw, le, toMass, toAir, toSky, vent, canopy, sun, tref };
}

function sample(st: HeatState, block: BlockSettings, wx: Weather, h: number, r: Series, ph: Physics) {
  const f = step({ tm: st.tm, ta: st.ta }, block, wx, h, ph);
  r.hours.push(h); r.ts.push(f.ts); r.ta.push(st.ta); r.tm.push(st.tm); r.tref.push(f.tref);
  r.toMass.push(f.toMass); r.toAir.push(f.toAir); r.toSky.push(f.toSky); r.sun.push(f.sun); r.le.push(f.le);
}

/* Runs one 24 h day starting at START. When a record is given, samples every 10 minutes. */
function runDay(st: HeatState, block: BlockSettings, wx: Weather, record: Series | null, dayIndex: number, ph: Physics) {
  const perDay = Math.round(86400 / DT), stepsPerSample = Math.round(600 / DT);
  for (let i = 0; i < perDay; i++) {
    const h = START + dayIndex * 24 + i * DT / 3600;
    if (record && i % stepsPerSample === 0) sample(st, block, wx, h, record, ph);
    step(st, block, wx, h, ph);
  }
}

function settle(st: HeatState, block: BlockSettings, wx: Weather, ph: Physics) {
  let days = 0, drift = Infinity;
  while (days < MAX_SPINUP_DAYS && drift > DRIFT_TOL) { const before = st.tm; runDay(st, block, wx, null, 0, ph); drift = Math.abs(st.tm - before); days++; }
  return { days, drift };
}

const weatherOf = (weather: WeatherId | Weather) => typeof weather === 'string' ? WEATHER[weather] : weather;

/* opts.days (1-3): consecutive hot days. opts.mode 'fresh' (default): the first hot day after cooler weather, so every
   block starts the morning at the temperature of the surrounding air. 'settled': a long hot spell that repeats. */
export function simulate(block: BlockSettings, weather: WeatherId | Weather, opts: SimulateOptions = {}): Series {
  const days = opts.days || 1, mode = opts.mode || 'fresh';
  const wx = weatherOf(weather), start = regionalAir(START), ph = mergePhys(opts.physics);
  const st: HeatState = { tm: mode === 'settled' ? 33 : start, ta: start };
  const info = mode === 'settled' ? settle(st, block, wx, ph) : { days: 0, drift: 0 };
  const r: Series = { hours: [], ts: [], ta: [], tm: [], tref: [], toMass: [], toAir: [], toSky: [], sun: [], le: [], store: [], days, spinupDays: info.days, drift: info.drift };
  const tm0 = st.tm;
  for (let d = 0; d < days; d++) runDay(st, block, wx, r, d, ph);
  sample(st, block, wx, START + days * 24, r, ph);
  r.store = r.tm.map(t => Math.max(0, block.cm * (t - tm0) / 1e6)); // MJ per m² gained since the first dawn
  return r;
}

/* Closure check: sunlight in, minus sky, evaporation and ventilation, must equal the change in stored energy. */
export function energyBalance(block: BlockSettings, weather: WeatherId | Weather, opts: Pick<SimulateOptions, 'mode' | 'physics'> = {}) {
  const ph = mergePhys(opts.physics), wx = weatherOf(weather), start = regionalAir(START);
  const st: HeatState = { tm: opts.mode === 'settled' ? 33 : start, ta: start };
  if (opts.mode === 'settled') settle(st, block, wx, ph);
  const perDay = Math.round(86400 / DT);
  const e0 = block.cm * st.tm + ph.CA * st.ta;
  let inflow = 0, ref = 0;
  for (let j = 0; j < perDay; j++) {
    const f = step(st, block, wx, START + j * DT / 3600, ph);
    inflow += DT * (f.qsw - f.le - f.toSky + f.vent + f.canopy);
    ref += DT * Math.abs(f.qsw);
  }
  const e1 = block.cm * st.tm + ph.CA * st.ta;
  return { change: e1 - e0, accounted: inflow, residual: (e1 - e0) - inflow, scale: ref };
}

export const indexAt = (r: Series, hour: number) => clamp(Math.round((hour - START) * 6), 0, r.hours.length - 1);
export const sampleCount = (days: number) => 144 * days + 1;

/* Linear interpolation between 10-minute samples, for smooth playback and scrubbing. */
export function frame(sim: Series, h: number): Frame {
  const fi = clamp((h - START) * 6, 0, sim.hours.length - 1), lo = Math.floor(fi), hi = Math.min(lo + 1, sim.hours.length - 1), f = fi - lo;
  const L = (a: number[]) => a[lo] + (a[hi] - a[lo]) * f;
  return { ts: L(sim.ts), ta: L(sim.ta), tm: L(sim.tm), store: L(sim.store), toMass: L(sim.toMass), sun: L(sim.sun), tref: L(sim.tref) };
}
