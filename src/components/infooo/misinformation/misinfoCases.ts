import { BUSY_HUB, COMMS, HUBS, N, QUIET, TOWN, community, degree, heardAt, run, type RunResult } from './misinfoModel.ts';
import { SHARE, story } from './misinfoStory.ts';

/** Who can share the rumor first. Mia is the baseline: the setup the visitor already watched. */
export type PersonId = 'mia' | 'ana' | 'sam';
export type Stage = 'start' | 'first' | 'running' | 'result';
export interface Person { id: PersonId; node: number; name: string; role: string }

/** Ana is the first ordinary person (not one of the three with many connections) who has the most connections an ordinary person has. */
const ordinary = Array.from({ length: N }, (_, i) => i).filter(i => !HUBS.includes(i));
export const ANA = ordinary.find(i => degree(i) === Math.max(...ordinary.map(degree)))!;

export const PEOPLE: Person[] = [
  { id: 'mia', node: QUIET, name: 'Mia', role: 'Baseline' },
  { id: 'ana', node: ANA, name: 'Ana', role: '' },
  { id: 'sam', node: BUSY_HUB, name: 'Sam', role: 'Person with many connections' },
];
export const BASE: PersonId = 'mia';
export const personOf = (id: PersonId) => PEOPLE.find(p => p.id === id)!;

/** Where a person's connections live, counted from the town itself. */
export const hoodsOf = (node: number) => new Set(TOWN.adj[node].map(community)).size;
export const hoodText = (node: number) => {
  const n = hoodsOf(node);
  return n === COMMS.length ? `in all ${n} neighborhoods` : n === 1 ? `all in ${COMMS[community(TOWN.adj[node][0])]}` : `in ${n} neighborhoods`;
};
export const tagFor = (id: PersonId) => { const p = personOf(id); return `${p.name} · ${degree(p.node)} connections`; };
export const optionNote = (id: PersonId) => { const p = personOf(id); return `${p.role ? `${p.role}. ` : ''}${degree(p.node)} connections, ${hoodText(p.node)}`; };

/** One run per person: same rumor, same share chance, same luck. Only who shares first changes. */
export const runsFor = (): Record<PersonId, RunResult> => ({ mia: story(QUIET), ana: story(ANA), sam: story(BUSY_HUB) });

/** People who see the post right away, in hour 0: exactly the poster's connections. */
export const firstWave = (r: RunResult) => heardAt(r, 0) - 1;

/** The same comparison over other luck settings, so one run is never read as the rule. */
export function paired(id: PersonId, count = 100) {
  const node = personOf(id).node; let wins = 0;
  for (let luck = 1; luck <= count; luck++) {
    const a = run({ seed: QUIET, claimShare: SHARE, corrHour: null, luck }), b = run({ seed: node, claimShare: SHARE, corrHour: null, luck });
    if (b.reached > a.reached) wins++;
  }
  return { wins, count };
}

export interface Summary { first: string; end: string; why: string; odds: string }
export function summarize(id: PersonId, runs: Record<PersonId, RunResult>, odds: { wins: number; count: number } | null): Summary {
  const p = personOf(id), m = personOf(BASE), a = runs[BASE], b = runs[id], da = firstWave(a), db = firstWave(b);
  return {
    first: `Right away: ${m.name}'s post reached ${da} people. ${p.name}'s reached ${db}.`,
    end: `After 12 hours: ${m.name}'s post reached ${a.reached} of ${N} people. ${p.name}'s reached ${b.reached}.`,
    why: db > da
      ? `${p.name} has ${db} connections and ${m.name} has ${da}. In this run, more people saw the post right away, so more people could pass it on.`
      : `${p.name} and ${m.name} have the same number of connections.`,
    odds: odds ? `This is one run, with the same chances for both posts. Across ${odds.count} runs with different chances, ${p.name}'s post reached more people in ${odds.wins}.` : '',
  };
}
