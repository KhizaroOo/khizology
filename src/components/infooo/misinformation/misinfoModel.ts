/** Infooo World 017 — a small, deterministic rumour-spread model.
 * The rumor and the truth follow the same rules; only their share chance and start hour differ.
 * Truth is never an input. Randomness is a hash of (luck, person, message, receipt), so the same luck
 * flips the same coins whatever the settings, and every comparison is fair. */
export const PER = 30, COMMS = ['Old Town', 'Riverside', 'Market Hill', 'Northfield'] as const, N = PER * COMMS.length, HOURS = 12;
export const HUBS = [0, 30, 60], QUIET = 105;
export const REPEAT = [0, 1, 1.5, 1.7];            // share-chance multiplier on the 1st, 2nd, 3rd+ receipt (invented size)
export const STICK = 0.7, STICK_DECAY = 0.75;      // chance the truth sticks, shrinking with each extra rumor receipt (invented size)
export const GAP = 1.7;                            // rumor vs truth share gap (Vosoughi et al. 2018: +70% retweets)
export const WIDTH = 640, HEIGHT = 520, CENTERS: [number, number][] = [[165, 135], [475, 135], [165, 385], [475, 385]];

export function hash(...xs: number[]) {
  let h = 0x811c9dc5 | 0;
  for (const v of xs) {
    h = Math.imul(h ^ (v | 0), 0x01000193);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

export type Edge = [number, number, 'local' | 'bridge' | 'hub'];
export interface Town { adj: number[][]; edges: Edge[]; pos: [number, number][] }
export const community = (i: number) => Math.floor(i / PER);

function buildTown(): Town {
  const adj: number[][] = Array.from({ length: N }, () => []), seen = new Set<string>(), edges: Edge[] = [];
  const add = (a: number, b: number, kind: Edge[2]) => {
    if (a === b) return false;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return false;
    seen.add(key); adj[a].push(b); adj[b].push(a); edges.push([Math.min(a, b), Math.max(a, b), kind]); return true;
  };
  for (let c = 0; c < COMMS.length; c++) {
    const base = c * PER;
    for (let j = 0; j < PER; j++) { add(base + j, base + (j + 1) % PER, 'local'); add(base + j, base + (j + 2) % PER, 'local'); }
    for (let j = 0; j < PER; j++) add(base + j, base + Math.floor(hash(7, c, j) * PER), 'local');
  }
  let bridges = 0, tries = 0;
  while (bridges < 8 && tries < 500) {
    tries++;
    const ca = Math.floor(hash(11, tries) * COMMS.length), cb = Math.floor(hash(13, tries) * COMMS.length);
    if (ca === cb) continue;
    const a = ca * PER + 1 + Math.floor(hash(17, tries) * (PER - 1)), b = cb * PER + 1 + Math.floor(hash(19, tries) * (PER - 1));
    if (adj[a].length > 6 || adj[b].length > 6) continue;
    if (add(a, b, 'bridge')) bridges++;
  }
  HUBS.forEach((h, hi) => {
    for (let k = 0; k < N; k++) {
      if (k === h || HUBS.includes(k)) continue;
      if (hash(23, hi, k) < (community(k) === community(h) ? 0.5 : 0.17)) add(h, k, 'hub');
    }
  });
  const pos: [number, number][] = [];
  for (let c = 0; c < COMMS.length; c++) for (let j = 0; j < PER; j++) {
    const id = c * PER + j, [cx, cy] = CENTERS[c];
    if (HUBS.includes(id)) { pos.push([cx, cy]); continue; }
    const ang = (j / PER) * Math.PI * 2 - Math.PI / 2, ring = j % 2 ? 108 : 92;
    pos.push([Math.round(cx + Math.cos(ang) * ring), Math.round(cy + Math.sin(ang) * ring * 0.86)]);
  }
  return { adj, edges, pos };
}

export const TOWN = buildTown();
export const degree = (i: number) => TOWN.adj[i].length;
export const BUSY_HUB = HUBS.reduce((a, b) => degree(b) > degree(a) ? b : a);

export const shareChance = (s: number, k: number, rep = REPEAT) => Math.min(1, s * rep[Math.min(k, 3)]);
export const stickChance = (seen: number, st = STICK, dc = STICK_DECAY) => seen > 0 ? st * Math.pow(dc, seen - 1) : st;

export interface RunInput { seed: number; claimShare: number; corrHour?: number | null; corrShare?: number; luck: number; repeat?: number[]; stick?: number; decay?: number }
/** Category per person per hour: 0 heard nothing, 1 has the rumor (uncorrected), 2 heard the rumor then the truth stuck, 3 got the truth first. */
export interface RunResult {
  seed: number; corrHour: number; frames: Uint8Array[]; counts: number[][]; reached: number; rumorNow: number; corrected: number; warned: number;
  sharesC: number; hubsShared: number; fromC: Int16Array; hourC: Int8Array; fromX: Int16Array; hourX: Int8Array; recvC: Uint8Array;
}

export function run(p: RunInput): RunResult {
  const { seed, luck } = p, sC = p.claimShare, sX = p.corrShare ?? p.claimShare / GAP, corrHour = p.corrHour ?? -1;
  const heardC = new Uint8Array(N), recvC = new Uint8Array(N), sharedC = new Int8Array(N).fill(-1);
  const heardX = new Uint8Array(N), recvX = new Uint8Array(N), sharedX = new Int8Array(N).fill(-1), holds = new Int8Array(N).fill(-1);
  const fromC = new Int16Array(N).fill(-1), hourC = new Int8Array(N).fill(-1), fromX = new Int16Array(N).fill(-1), hourX = new Int8Array(N).fill(-1);
  const frames: Uint8Array[] = [], counts: number[][] = [];
  let nowC = [seed], nowX: number[] = [], sharesC = 1;
  heardC[seed] = 1; recvC[seed] = 1; sharedC[seed] = 0; hourC[seed] = 0;
  for (let h = 0; h <= HOURS; h++) {
    if (h === corrHour) {
      nowX.push(seed);
      if (!heardX[seed]) { heardX[seed] = 1; recvX[seed] = 1; holds[seed] = 1; hourX[seed] = h; }
      sharedX[seed] = h;
    }
    const nextC: number[] = [], nextX: number[] = [];
    for (const i of nowC) for (const j of TOWN.adj[i]) {
      if (recvC[j] < 255) recvC[j]++;
      if (!heardC[j]) { heardC[j] = 1; fromC[j] = i; hourC[j] = h; }
      const open = !(heardX[j] && holds[j] === 1);
      if (sharedC[j] < 0 && open && hash(luck, j, 1, recvC[j]) < shareChance(sC, recvC[j], p.repeat)) { sharedC[j] = h + 1; nextC.push(j); sharesC++; }
    }
    for (const i of nowX) for (const j of TOWN.adj[i]) {
      if (recvX[j] < 255) recvX[j]++;
      if (!heardX[j]) {
        heardX[j] = 1; fromX[j] = i; hourX[j] = h;
        holds[j] = hash(luck, j, 3, 0) < stickChance(heardC[j] ? recvC[j] : 0, p.stick, p.decay) ? 1 : 0;
      }
      if (sharedX[j] < 0 && holds[j] === 1 && hash(luck, j, 2, recvX[j]) < shareChance(sX, recvX[j], p.repeat)) { sharedX[j] = h + 1; nextX.push(j); }
    }
    const frame = new Uint8Array(N), cnt = [0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      frame[i] = heardC[i] ? (holds[i] === 1 ? 2 : 1) : heardX[i] && holds[i] === 1 ? 3 : 0;
      cnt[frame[i]]++;
    }
    frames.push(frame); counts.push(cnt);
    nowC = nextC; nowX = nextX;
  }
  const last = counts[HOURS];
  let reached = 0; for (let k = 0; k < N; k++) if (heardC[k]) reached++;
  return { seed, corrHour, frames, counts, reached, rumorNow: last[1], corrected: last[2], warned: last[3], sharesC,
    hubsShared: HUBS.filter(hb => sharedC[hb] >= 0).length, fromC, hourC, fromX, hourX, recvC };
}

/** Runs with luck 1..count; `tiny` = runs that stayed under 10% of the town, `big` = runs that reached half or more. */
export function runMany(p: Omit<RunInput, 'luck'>, count = 100) {
  const reach: number[] = [];
  for (let l = 1; l <= count; l++) reach.push(run({ ...p, luck: l }).reached);
  return { reach, tiny: reach.filter(x => x / N < 0.1).length, big: reach.filter(x => x / N >= 0.5).length };
}

export const heardAt = (r: RunResult, h: number) => N - r.counts[h][0] - r.counts[h][3];
export const repeats = (r: RunResult, k: number) => { let c = 0; for (let i = 0; i < N; i++) if (r.recvC[i] >= k) c++; return c; };
