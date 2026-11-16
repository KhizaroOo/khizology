import { BUSY_HUB, QUIET, degree, heardAt, repeats, run, type RunResult } from './misinfoModel.ts';

/** The page shows one fixed run, chosen because its results sit close to the average of 100 runs with different luck. */
export const LUCK = 99, SHARE = 0.15, PAUSED = 0.10;
export type Corr = 'none' | 'late' | 'early';
export const CORR_HOUR: Record<Corr, number | null> = { none: null, late: 6, early: 1 };
export interface Pick { seed: 'quiet' | 'hub'; pause: 'no' | 'yes'; corr: Corr }
export const START_PICK: Pick = { seed: 'hub', pause: 'yes', corr: 'late' };

export const story = (seed: number, corr: Corr = 'none', share = SHARE) => run({ seed, claimShare: share, corrHour: CORR_HOUR[corr], luck: LUCK });
export const pickRun = (p: Pick) => story(p.seed === 'hub' ? BUSY_HUB : QUIET, p.corr, p.pause === 'yes' ? PAUSED : SHARE);

export const RUMOR = 'The Old Mill Bridge closes all next week.';
export const TRUTH = 'Only the footbridge closes, for one morning.';

export interface Step {
  id: string; rail: string; title: string; text: string; post?: 'rumor' | 'truth'; act: string;
  rings?: boolean; instant?: boolean; choices?: boolean;
  setup: (pick: Pick) => RunResult;
  /** The run shown before the visitor acts (null = blank town). */
  before: () => RunResult | null;
  result: (r: RunResult) => { strong: string; rest?: string };
}

export const STEPS: Step[] = [
  { id: 'one-post', rail: 'One post', title: 'One person posts a rumor', text: `They have ${degree(QUIET)} friends.`, post: 'rumor', act: '▶ Post it',
    setup: () => story(QUIET), before: () => null,
    result: r => ({ strong: `Only ${r.reached} people heard it. It died out.`, rest: 'Most posts do.' }) },
  { id: 'hub', rail: 'A hub', title: 'Now a hub posts it', text: `A hub is someone ${degree(BUSY_HUB)} people follow.`, post: 'rumor', act: '▶ Let the hub post it',
    setup: () => story(BUSY_HUB), before: () => null,
    result: r => ({ strong: `${r.reached} of 120 heard it.`, rest: 'Same rumor. Only the first poster changed.' }) },
  { id: 'repeats', rail: 'Repeats', title: 'Friends repeat it', text: 'People hear it again and again from friends.', act: '◎ Show who heard it twice',
    rings: true, instant: true, setup: () => story(BUSY_HUB), before: () => story(BUSY_HUB),
    result: r => ({ strong: `${repeats(r, 2)} people heard it twice or more.`, rest: 'Hearing it again makes people share it.' }) },
  { id: 'truth', rail: 'Truth', title: 'The truth comes late', text: 'At hour 6, the same person posts the truth.', post: 'truth', act: '▶ Post the truth',
    setup: () => story(BUSY_HUB, 'late'), before: () => story(BUSY_HUB),
    result: r => ({ strong: `The truth reached ${r.corrected + r.warned}. ${r.rumorNow} are left with only the rumor.` }) },
  { id: 'your-turn', rail: 'Your turn', title: 'Your turn: stop it', text: '', act: '▶ Run it', choices: true,
    setup: pickRun, before: () => null,
    result: r => ({ strong: `${r.rumorNow} left with only the rumor`, rest: `(was ${story(BUSY_HUB, 'late').rumorNow}).` }) },
];

export const CHOICES: { key: keyof Pick; legend: string; options: [string, string][] }[] = [
  { key: 'seed', legend: 'Who posts first?', options: [['quiet', 'A quiet person'], ['hub', 'A busy hub']] },
  { key: 'pause', legend: 'People check before sharing?', options: [['no', 'No'], ['yes', 'Yes']] },
  { key: 'corr', legend: 'When does the truth come?', options: [['none', 'Never'], ['late', 'Late'], ['early', 'Early']] },
];

export function recap() {
  const q = story(QUIET), h = story(BUSY_HUB), c = story(BUSY_HUB, 'late');
  return [
    { title: 'Most posts die out', value: q.reached, note: 'people heard it' },
    { title: 'A well-connected person spreads it far', value: h.reached, note: 'people heard it' },
    { title: 'Repeats make it stick', value: repeats(h, 2), note: 'heard it twice or more' },
    { title: 'The truth comes late', value: c.rumorNow, note: 'left with only the rumor' },
  ];
}

export function describe(r: RunResult | null, hour: number, rings: boolean) {
  if (!r) return 'Nobody has heard anything yet.';
  const k = r.counts[hour];
  return `Hour ${hour}. ${heardAt(r, hour)} people have heard the rumor; ${k[1]} have it with no truth, ${k[2] + k[3]} got the truth, ${k[0]} have heard nothing.${rings ? ` ${repeats(r, 2)} heard it twice or more.` : ''}`;
}
