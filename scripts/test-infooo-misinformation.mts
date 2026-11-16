// Model checks for Infooo World 017 "How Misinformation Spreads". Run: node --experimental-strip-types scripts/test-infooo-misinformation.mts
import assert from 'node:assert/strict';
import { BUSY_HUB, HUBS, N, QUIET, TOWN, community, degree, heardAt, repeats, run, runMany, shareChance, stickChance, type RunResult } from '../src/components/infooo/misinformation/misinfoModel.ts';
import { LUCK, PAUSED, SHARE, STEPS, START_PICK, pickRun, recap, story } from '../src/components/infooo/misinformation/misinfoStory.ts';
import { ANA, BASE, PEOPLE, firstWave, hoodsOf, optionNote, paired, personOf, runsFor, summarize, tagFor } from '../src/components/infooo/misinformation/misinfoCases.ts';

let checks = 0; const ok = (c: unknown, m: string) => { assert.ok(c, m); checks++; };

// the town
ok(N === 120 && TOWN.pos.length === 120, 'town size');
ok(TOWN.adj.every((a, i) => a.every(j => j !== i && TOWN.adj[j].includes(i)) && new Set(a).size === a.length), 'links are symmetric, no self links, no duplicates');
{ const seen = new Set([0]), q = [0]; while (q.length) for (const j of TOWN.adj[q.shift()!]) if (!seen.has(j)) { seen.add(j); q.push(j); } ok(seen.size === N, 'town is connected'); }
ok(degree(QUIET) === 6 && community(QUIET) === 3, 'quiet person: 6 friends in Northfield');
ok(HUBS.every(h => degree(h) >= 20 && community(h) !== 3) && BUSY_HUB === 60 && degree(BUSY_HUB) === 34, 'three hubs, busiest has 34 followers, none in Northfield');
ok(TOWN.edges.filter(e => e[2] === 'bridge').length === 8, '8 bridges');

// rules
ok(shareChance(0.15, 1) === 0.15 && Math.abs(shareChance(0.15, 2) - 0.225) < 1e-12 && Math.abs(shareChance(0.15, 9) - 0.255) < 1e-12 && shareChance(0.9, 3) === 1, 'share chance with repeats');
ok(stickChance(0) === 0.7 && Math.abs(stickChance(3) - 0.7 * 0.5625) < 1e-12, 'stick chance');
ok(JSON.stringify(run({ seed: QUIET, claimShare: 0.15, luck: 1 }).counts) === JSON.stringify(run({ seed: QUIET, claimShare: 0.15, luck: 1 }).counts), 'deterministic');
for (const seed of [QUIET, ...HUBS]) for (const ch of [null, 0, 1, 6]) for (let l = 1; l <= 20; l++) {
  const r = run({ seed, claimShare: 0.2, corrHour: ch, luck: l });
  ok(r.counts.every(c => c[0] + c[1] + c[2] + c[3] === N), 'counts sum to 120');
  ok(r.counts.every((c, h) => h === 0 || c[0] <= r.counts[h - 1][0]), 'never-heard never rises');
  ok(r.counts.every((c, h) => h === 0 || c[2] + c[3] >= r.counts[h - 1][2] + r.counts[h - 1][3]), 'truth tally never falls');
  ok(Array.from(r.fromC).every((f, j) => f < 0 || TOWN.adj[f].includes(j)), 'every trail follows a real link');
  if (ch == null) ok(r.corrected === 0 && r.warned === 0, 'no truth posted, nobody corrected');
  else ok(r.reached <= run({ seed, claimShare: 0.2, luck: l }).reached, 'posting the truth never increases rumor reach');
}
for (const seed of [QUIET, ...HUBS]) {
  ok(run({ seed, claimShare: 0, luck: 3 }).reached === degree(seed) + 1, 'share 0: only the poster and direct links');
  ok(run({ seed, claimShare: 1, luck: 3 }).reached === N, 'share 1: the whole town');
}

// the patterns the page teaches, over 100 lucks
const q100 = runMany({ seed: QUIET, claimShare: SHARE }), h100 = runMany({ seed: BUSY_HUB, claimShare: SHARE });
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return (s[49] + s[50]) / 2; };
ok(median(q100.reach) * 4 < median(h100.reach), 'hub start reaches far more than a quiet start');
ok(q100.tiny > 30 && h100.tiny === 0, 'quiet starts often die out; hub starts never stay under 10%');
const avg = (ch: number | null, share = SHARE) => { let s = 0; for (let l = 1; l <= 100; l++) s += run({ seed: BUSY_HUB, claimShare: share, corrHour: ch, luck: l }).rumorNow; return s / 100; };
const none = avg(null), early = avg(1), late = avg(6), paused = avg(1, PAUSED);
ok(early < late && late < none && paused < early, `early (${early}) < late (${late}) < none (${none}); pause+early lower still (${paused})`);

// sensitivity: the invented sizes do not change the patterns
let seedR = 7; const rnd = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;
let held = 0;
for (let d = 0; d < 40; d++) {
  const b2 = 1 + rnd(), rep = [0, 1, b2, b2 + rnd() * 0.5], stick = 0.4 + rnd() * 0.5, decay = 0.5 + rnd() * 0.5;
  const reach = (seed: number) => { const a: number[] = []; for (let l = 1; l <= 40; l++) a.push(run({ seed, claimShare: SHARE, repeat: rep, luck: l }).reached); return a.sort((x, y) => x - y)[20]; };
  const av = (ch: number | null) => { let s = 0; for (let l = 1; l <= 40; l++) s += run({ seed: BUSY_HUB, claimShare: SHARE, corrHour: ch, repeat: rep, stick, decay, luck: l }).rumorNow; return s; };
  if (reach(BUSY_HUB) >= 3 * reach(QUIET) && av(1) < av(6) && av(6) < av(null)) held++;
}
ok(held === 40, `patterns hold in ${held}/40 random draws of the invented numbers`);

// the story run (luck #99) is representative and its sentences use model numbers
const typical = (r: RunResult, avgValue: number, tol: number) => Math.abs(r.rumorNow - avgValue) <= tol;
ok(LUCK === 99 && story(QUIET).reached < 12, 'story run: the quiet post dies out');
ok(typical(story(BUSY_HUB), none, 12) && typical(story(BUSY_HUB, 'late'), late, 12) && typical(story(BUSY_HUB, 'early'), early, 6), 'story run sits close to the 100-run averages');
const want: Record<string, (r: RunResult) => string> = {
  'one-post': r => `Only ${r.reached} people heard it. It died out.`, hub: r => `${r.reached} of 120 heard it.`,
  repeats: r => `${repeats(r, 2)} people heard it twice or more.`, truth: r => `The truth reached ${r.corrected + r.warned}. ${r.rumorNow} are left with only the rumor.`,
  'your-turn': r => `${r.rumorNow} left with only the rumor`,
};
for (const s of STEPS) { const r = s.setup(START_PICK); ok(s.result(r).strong === want[s.id](r), `${s.id} result sentence`); }
ok(STEPS.length === 5 && STEPS.every(s => s.title.split(' ').length <= 6 && s.text.split(' ').length <= 10), 'five steps, short titles and lines');
const rc = recap();
ok(rc[0].value === story(QUIET).reached && rc[1].value === story(BUSY_HUB).reached && rc[2].value === repeats(story(BUSY_HUB), 2) && rc[3].value === story(BUSY_HUB, 'late').rumorNow, 'recap numbers come from the model');
ok(pickRun({ seed: 'hub', pause: 'yes', corr: 'early' }).rumorNow < story(BUSY_HUB, 'late').rumorNow, 'your turn: pausing and an early truth beat step 4');
ok(heardAt(story(BUSY_HUB, 'late'), 6) > story(BUSY_HUB, 'late').corrected, 'the rumor is far ahead when the truth starts');
// the guided experiment: every number and sentence comes from real runs, with the same luck on every side
{
  const runs = runsFor(), ids = PEOPLE.map(p => p.id);
  ok(ids.length === 3 && new Set(PEOPLE.map(p => p.node)).size === 3 && PEOPLE[0].id === BASE && PEOPLE[0].node === QUIET && PEOPLE[2].node === BUSY_HUB, 'three distinct people; the first is the baseline (Mia), the last is the busiest hub');
  ok(!HUBS.includes(ANA) && ANA !== QUIET && degree(ANA) > degree(QUIET) && degree(ANA) < degree(BUSY_HUB), 'Ana is an ordinary person with more connections than Mia but fewer than the hub');
  ok(runs.mia.reached === story(QUIET).reached && runs.sam.reached === story(BUSY_HUB).reached && runs.ana.reached === story(ANA).reached, 'runs reuse the story simulation (same luck, same share chance)');
  for (const id of ids) {
    const p = personOf(id), r = runs[id];
    ok(r.seed === p.node && r.corrHour === -1, `${id}: poster is the chosen person, no truth posted`);
    ok(firstWave(r) === degree(p.node), `${id}: hour-0 audience is exactly the poster's connections`);
    ok(TOWN.adj[p.node].every(j => r.fromC[j] === p.node && r.hourC[j] === 0), `${id}: the model traces every first-share line from the poster at hour 0`);
    ok(hoodsOf(p.node) === new Set(TOWN.adj[p.node].map(community)).size && optionNote(id).includes(`${degree(p.node)} connections`), `${id}: option note states real connection and neighborhood counts`);
    ok(tagFor(id) === `${p.name} · ${degree(p.node)} connections`, `${id}: map tag`);
  }
  ok(hoodsOf(BUSY_HUB) === 4 && optionNote('sam').includes('in all 4 neighborhoods') && hoodsOf(QUIET) === 1 && optionNote('mia').startsWith('Baseline.'), "Sam's reach across neighborhoods and Mia's single neighborhood are stated from the town");
  ok(optionNote('sam').includes('Person with many connections'), 'the role is explained where it appears');
  for (const id of ids) { const s = summarize(id, runs, { wins: 85, count: 100 }); ok(s.first.includes(`${firstWave(runs.mia)}`) && s.end.includes(`${runs[id].reached} of 120`.replace(' of 120', '')) && s.why.length > 0, `${id}: summary built from the runs`); }
  const ph = paired('sam'), pa = paired('ana');
  ok(ph.count === 100 && ph.wins >= 70 && ph.wins < 100, `Sam beats Mia in most but not all luck draws (${ph.wins}/100)`);
  ok(pa.count === 100 && pa.wins >= 1 && pa.wins <= 100, `Ana against Mia is computed, not assumed (${pa.wins}/100)`);
  const sm = summarize('sam', runs, ph);
  ok(sm.odds.includes(`${ph.wins}`) && sm.why.includes('34') && sm.why.includes('6') && sm.first.includes('reached 34'), 'Sam summary is built from the run');
  ok(!/\b(believ|intent|convinc|gullible|hub)\b/i.test(JSON.stringify([sm, summarize('ana', runs, pa), PEOPLE.map(p => optionNote(p.id))])), 'copy models spread only: nothing about belief or intent, no unexplained "hub"');
}
console.log(`World 017 model: ${checks} checks passed`);
