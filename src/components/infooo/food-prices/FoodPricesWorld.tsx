import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { InfoooWorld } from '../../../data/infooo';
import { InfoooWorldShell, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import { trackInfoooEntityView, trackInfoooGuideComplete, trackInfoooWorldStart } from '../../../utils/analytics';
import { ALL_FOOD_FARM_SHARE, COSTS, cost as costInfo, type CostId } from './foodModel.ts';
import { DEFAULT_PCT, GUESS_LABEL, SHOW_AHA_AT, TARGET, ahaLead, ahaLines, analyticsFood, calc, captionParts, fx, shortName, verdict, type GuessId } from './foodStory.ts';
import { HH_SCALE, PAIRS, QUIZ, START_PAIR, STORIES, allFoodCeiling, householdNote, householdRows, householdText, rateRows } from './foodViews.ts';
import FoodStack from './FoodStack';
import FoodTruth from './FoodTruth';
import { useShockPlayback } from './useShockPlayback.ts';
import './foodPrices.css';

const GUESSES: GuessId[] = ['bakery', 'eggs', 'same'];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function Chip({ pressed, onClick, children, ...rest }: { pressed: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" className="fp-chip" aria-pressed={pressed} onClick={onClick} {...rest}><span className="fp-tick" aria-hidden="true">✓</span>{children}</button>;
}

export default function FoodPricesWorld({ world, children }: { world: InfoooWorld; children?: ReactNode }) {
  const reduced = useInfoooReducedMotion(), slug = world.slug;
  const [foodA, setFoodA] = useState(START_PAIR.a), [foodB, setFoodB] = useState(START_PAIR.b), [cost, setCost] = useState<CostId>('farm'), [pct, setPct] = useState(0);
  const [guess, setGuess] = useState<GuessId | null>(null), [touched, setTouched] = useState(false), [reveal, setReveal] = useState<{ guess: GuessId | null } | null>(null);
  const [stamp, setStamp] = useState(0), [spoken, setSpoken] = useState('');
  const [picked, setPicked] = useState<(number | null)[]>(() => QUIZ.map(() => null)), [checked, setChecked] = useState<boolean[]>(() => QUIZ.map(() => false));
  const root = useRef<HTMLDivElement>(null), stackCard = useRef<HTMLDivElement>(null), started = useRef(false), live = useRef({ guess, reveal, pct });
  live.current.guess = guess; live.current.reveal = reveal; live.current.pct = pct;

  const nA = shortName(foodA), nB = shortName(foodB);
  const a = useMemo(() => calc(foodA, cost, pct), [foodA, cost, pct]), b = useMemo(() => calc(foodB, cost, pct), [foodB, cost, pct]);
  const [capTitle, capText] = useMemo(() => captionParts(a, b, nA, nB, cost, pct), [a, b, nA, nB, cost, pct]);
  const rows = useMemo(() => rateRows(foodA, foodB), [foodA, foodB]);
  const hh = householdRows(cost, pct);

  /** Every change of the shock size goes through here, so the reveal appears once, from whichever control first reaches 40%. */
  const goTo = useCallback((value: number) => {
    const next = clamp(value, 0, 100); live.current.pct = next; setPct(next);
    if (next >= SHOW_AHA_AT && !live.current.reveal) { const r = { guess: live.current.guess }; live.current.reveal = r; setReveal(r); }
  }, []);
  const commit = useCallback(() => setStamp(n => n + 1), []);
  const { playing, play, pause } = useShockPlayback({ pct, goTo, onEnd: commit, reduced });
  useEffect(() => { if (reveal) trackInfoooGuideComplete(slug, 'shock-run'); }, [reveal, slug]);
  useEffect(() => { if (stamp) setSpoken(`${capTitle} ${capText}`); }, [stamp]);   // announced on commit (release, choice, end of run), never on every frame
  // The site header is sticky, so the control dock sits just below it.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.k-navbar'), el = root.current; if (!nav || !el) return;
    const set = () => el.style.setProperty('--fp-top', `${nav.offsetHeight}px`); set();
    const ro = new ResizeObserver(set); ro.observe(nav); return () => ro.disconnect();
  }, []);

  const begin = () => { if (!started.current) { started.current = true; trackInfoooWorldStart(slug); } setTouched(true); };
  const showStack = () => { const el = stackCard.current; if (!el) return; const r = el.getBoundingClientRect(), dock = (el.ownerDocument.getElementById('fp-dock')?.offsetHeight ?? 0); if (r.top < dock + 4 || r.bottom > window.innerHeight - 4) el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); };
  const atTarget = pct >= TARGET - 1e-6;
  const runLabel = reduced ? (atTarget ? '↻ Start again' : '▶ Play the shock') : playing ? '⏸ Pause' : atTarget ? '↻ Replay' : pct > 0.5 ? '▶ Resume' : '▶ Play the shock';
  function run() {
    begin();
    if (reduced) { goTo(atTarget ? 0 : TARGET); commit(); } else if (playing) { pause(); commit(); } else play();
  }
  function chooseCost(id: CostId, size?: number, trackId = `cost-${id}`) {
    pause(); begin(); setCost(id);
    if (size != null) goTo(size); else if (live.current.pct < 0.5) goTo(DEFAULT_PCT);
    trackInfoooEntityView(slug, trackId); commit();
  }
  function chooseFood(side: 'A' | 'B', id: string) { pause(); begin(); (side === 'A' ? setFoodA : setFoodB)(id); trackInfoooEntityView(slug, `food-${analyticsFood(id)}`); commit(); }
  const pickGuess = (g: GuessId) => { if (!reveal) setGuess(cur => cur === g ? null : g); };
  const guessLocked = Boolean(reveal), guessHidden = !guess && (touched || guessLocked);
  const ceiling = allFoodCeiling();

  const stageNode = <>
    <section className="fp-hero" aria-label="The question">
      <p className="fp-question">Why does the same cost shock make eggs jump and bread barely move?</p>
      <div className="fp-guess" hidden={guessHidden}>
        <p>Guess first? <span>Optional. Farm prices jump 50%. Which shelf price rises more?</span></p>
        <div className="fp-chips" role="group" aria-label="Your guess">{GUESSES.map(g => <Chip key={g} pressed={guess === g} disabled={guessLocked} onClick={() => pickGuess(g)}>{GUESS_LABEL[g]}</Chip>)}</div>
        <p className="fp-guess-note" aria-live="polite">{guessLocked ? (guess ? `Locked in: “${GUESS_LABEL[guess]}”. The answer is in the green box below the pictures.` : '') : guess ? 'Locked in for the reveal. Now press “Play the shock”.' : ''}</p>
      </div>
    </section>

    <section aria-labelledby="fp-sim-title">
      <h2 className="fp-sr" id="fp-sim-title">The simulation: one dollar of two foods, and a cost shock</h2>
      <div className="fp-dock" id="fp-dock">
        <div className="fp-dock-row">
          <button type="button" className="k-button k-button--primary" id="fp-run" onClick={run}>{runLabel}</button>
          <label className="fp-pick"><span className="fp-sr">Which cost rises</span>
            <select className="fp-select" id="fp-cost" value={cost} aria-describedby="fp-linknote" onChange={e => chooseCost(e.target.value as CostId)}>{COSTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <div className="fp-slider">
            <label className="fp-sr" htmlFor="fp-pct">How much the cost rises, in percent</label>
            <input type="range" id="fp-pct" min={0} max={100} step={1} value={Math.round(pct)} aria-valuetext={Math.round(pct) === 0 ? 'No rise' : `${costInfo(cost).label} up ${Math.round(pct)} percent`}
              onChange={e => { pause(); begin(); goTo(Number(e.target.value)); }} onPointerUp={commit} onKeyUp={commit}/>
            <div className="fp-pct" aria-hidden="true">+{Math.round(pct)}%</div>
          </div>
        </div>
      </div>
      <p className="fp-caption"><strong>{capTitle}</strong> {capText}</p>
      <p className="fp-linknote" id="fp-linknote">{costInfo(cost).label}. {costInfo(cost).note}</p>
      <p className="fp-sr" aria-live="polite" aria-atomic="true">{spoken}</p>

      <div className="fp-card fp-stackcard" ref={stackCard}>
        <FoodStack foodA={foodA} foodB={foodB} cost={cost} a={a} b={b} onFood={chooseFood}/>
        <p className="fp-stacknote"><span className="fp-keyline" aria-hidden="true"/>Dashed line = the original $1.00. Hatched = the extra cost. Slices are rounded, and cents are of one dollar of that food.</p>
      </div>

      <div className="fp-aha" id="fp-aha" hidden={!reveal} role="region" aria-labelledby="fp-aha-title">
        <p className="fp-tag">AHA</p>
        <h3 id="fp-aha-title">A cost shock only matters as much as the slice it hits.</h3>
        <p className="fp-lead-line">{ahaLead(a, b, nA, nB)}</p>
        {reveal?.guess && <p>{verdict(reveal.guess)}</p>}
        <ul>{ahaLines(a, b, nA, nB, cost, pct).map((line, i) => <li key={i}>{line}</li>)}</ul>
        <p className="fp-go">Go further: look up the farm share and industry values for any food in USDA’s <a href="https://ers.usda.gov/data-products/food-dollar-series" target="_blank" rel="noreferrer">Food Dollar Series</a>.</p>
        <div className="fp-row">
          <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => { chooseCost('wages', 10, 'story-wage-rise'); showStack(); }}>Same foods, new shock: wages +10%</button>
          <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => document.getElementById('fp-who')?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })}>Who feels it? ↓</button>
        </div>
      </div>
    </section>

    <section className="fp-block" aria-labelledby="fp-explore-title">
      <h2 id="fp-explore-title">Explore more: pick a cost, pick two foods</h2>
      <p className="fp-lead">Every row is a slice. The table shows how far one cost moves each food’s shelf price.</p>
      <div className="fp-controls">
        <div className="fp-control">
          <h3>Which cost matters most?</h3>
          <p className="fp-hint">Shelf-price change if that one cost rises 10% (all else equal). Pick a row to put it on the stack above.</p>
          <div className="fp-tablewrap" tabIndex={0} role="region" aria-label="What each cost does to the two foods, scrollable">
            <table className="fp-plain fp-rate">
              <thead><tr><th scope="col">Cost that rises 10%</th><th scope="col">{nA}</th><th scope="col">{nB}</th></tr></thead>
              <tbody>{rows.map(r => <tr key={r.id}>
                <th scope="row"><button type="button" aria-pressed={cost === r.id} onClick={() => { chooseCost(r.id); showStack(); }}><span className={r.id === 'wages' ? 'fp-sw fp-cap-sw' : `fp-sw fp-s-${r.id}`} aria-hidden="true"/>{r.label}</button></th>
                {r.cells.map((c, i) => <td key={i}><span className={c.best ? 'fp-best' : undefined}>{c.text}{c.best && <span className="fp-sr"> (largest)</span>}</span><small>{c.slice}</small></td>)}
              </tr>)}</tbody></table>
          </div>
          <p className="fp-reality"><strong>Reality check.</strong> A long-run study found a 10% rise in world food-commodity prices moved the U.S. all-food price index only about 0.4%. The stack arithmetic for all food ({fx(ALL_FOOD_FARM_SHARE, 1)}¢ of farm share) would allow up to about {fx(ceiling, 1)}%. So read every number here as a ceiling: real prices adjust slowly, unevenly, and more on the way up than on the way down.</p>
        </div>
        <div className="fp-control">
          <h3>Try a story</h3>
          <p className="fp-hint">Each one sets a cost and a size. They are what-if examples, not forecasts.</p>
          <div className="fp-chips" role="group" aria-label="Stories">{STORIES.map(s => <Chip key={s.id} pressed={cost === s.cost && Math.round(pct) === s.pct} onClick={() => { chooseCost(s.cost, s.pct, `story-${s.id}`); showStack(); }}>{s.label}</Chip>)}</div>
        </div>
        <div className="fp-control">
          <h3>Try another pair of foods</h3>
          <p className="fp-hint">Or use the two menus above the bars to pick any foods.</p>
          <div className="fp-chips" role="group" aria-label="Food pairs">{PAIRS.map(p => <Chip key={p.id} pressed={foodA === p.a && foodB === p.b} onClick={() => { pause(); begin(); setFoodA(p.a); setFoodB(p.b); trackInfoooEntityView(slug, `pair-${p.id}`); commit(); showStack(); }}>{p.label}</Chip>)}</div>
        </div>
      </div>
    </section>

    <section className="fp-block" id="fp-who" aria-labelledby="fp-who-title">
      <h2 id="fp-who-title">Who feels it?</h2>
      <p className="fp-lead">The same price rise weighs differently on different budgets. This uses the shock above, applied to the average grocery basket.</p>
      <div className="fp-card fp-hh">
        {hh.rows.map(r => <div className="fp-hh-row" key={r.id}>
          <h3>{r.label}</h3>
          <div className="fp-track" role="img" aria-label={`${r.label}: ${fx(r.share, 1)} percent of income on food${r.moved ? `, rising to ${fx(r.after, 1)} percent` : ''}`}>
            <div className="fp-base" style={{ width: `${r.share / HH_SCALE * 100}%` }}/>
            {r.moved && <div className="fp-add" style={{ left: `${r.share / HH_SCALE * 100}%`, width: `${r.hitPoints / HH_SCALE * 100}%` }}/>}
          </div>
          <p className="fp-hh-text">{householdText(r)}</p>
        </div>)}
        <p className="fp-meta">{householdNote(hh.basket)}</p>
      </div>
    </section>

    <section className="fp-block" aria-labelledby="fp-test-title">
      <h2 id="fp-test-title">Test yourself</h2>
      <p className="fp-lead">Three quick questions. No score, no tracking.</p>
      <div className="fp-quiz">{QUIZ.map((q, i) => <fieldset key={q.q}>
        <legend>{i + 1}. {q.q}</legend>
        {q.options.map((o, j) => <label className="fp-opt" key={o}><input type="radio" name={`fp-q${i}`} value={j} checked={picked[i] === j} onChange={() => setPicked(p => p.map((v, k) => k === i ? j : v))}/><span>{o}</span></label>)}
        <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => setChecked(c => c.map((v, k) => k === i ? true : v))}>Check answer</button>
        <p className="fp-feedback" role="status">{checked[i] ? (picked[i] === null ? 'Pick an answer first.' : <><b className={picked[i] === q.answer ? 'fp-ok' : undefined}>{picked[i] === q.answer ? 'Yes.' : 'Not quite.'}</b> {picked[i] === q.answer ? '' : `The answer: “${q.options[q.answer]}”. `}{q.why()}</>) : ''}</p>
      </fieldset>)}</div>
    </section>
  </>;

  return <div className={`food-prices${playing && !reduced ? ' fp-running' : ''}`} data-reduced={reduced} ref={root}>
    <InfoooWorldShell world={world} stage={stageNode} footer={<><FoodTruth sources={world.knowledge?.sources ?? []} lastReviewed={world.knowledge?.lastReviewed}/>{children}</>}/>
  </div>;
}
