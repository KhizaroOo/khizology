import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { InfoooWorld } from '../../../data/infooo';
import { InfoooWorldShell, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import { trackInfoooEntityView, trackInfoooGuideComplete, trackInfoooWorldStart } from '../../../utils/analytics';
import { BLOCKS, LEVERS, START, WEATHER, clamp, frame, type Frame, type LeverId, type WeatherId } from './heatModel.ts';
import { GUESS_LABEL, ahaGuessText, ahaLines, beatAt, buildBeats, clockText, computeStats, dayOf, deg, endHour, narrate, num, phaseOf, runSims, signed, type GuessId } from './heatStory.ts';
import { CHART_TABS, LEVER_COLUMNS, QUIZ, baselineLine, bestLevers, chartData, chartDescription, chartNote, dataRows, leverCell, leverRows, paramRows, type ChartTab } from './heatViews.ts';
import CityScene from './CityScene';
import HeatChart from './HeatChart';
import HeatTruth from './HeatTruth';
import { useDayPlayback } from './useDayPlayback.ts';
import './cityHeat.css';

const stageFor = (h: number) => h >= 27 - 1e-6 ? 2 : h >= 22 - 1e-6 ? 1 : 0;   // 10 PM starts the reveal, 3 AM completes it
const GUESSES: GuessId[] = ['surface', 'air', 'both'];
const WEATHERS = Object.values(WEATHER);
const LEVER_HEADS: Record<string, string> = { s15: '3 PM surface', a15: '3 PM air', a3: '3 AM air', st: 'Stored at sunset' };

function Chip({ pressed, onClick, children, ...rest }: { pressed: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" className="ch-chip" aria-pressed={pressed} onClick={onClick} {...rest}><span className="ch-tick" aria-hidden="true">✓</span>{children}</button>;
}
function Tile({ label, sub, children }: { label: string; sub: ReactNode; children: ReactNode }) {
  return <div className="ch-tile"><div className="ch-l">{label}</div><div className="ch-v">{children}</div><div className="ch-s">{sub}</div></div>;
}
const flowText = (fr: Frame) => fr.toMass > 6 ? `↓ soaking up ${num(fr.toMass, 0)} W/m²` : fr.toMass < -6 && fr.store >= 0.05 ? `↑ giving back ${num(-fr.toMass, 0)} W/m²` : fr.store < 0.05 ? 'nothing stored yet' : 'roughly balanced';
function sceneLabel(which: 'A' | 'B', fr: Frame, h: number) {
  return `${which === 'A' ? 'Block A, dark and paved' : 'Block B, green and light'} at ${clockText(h)}: surface ${num(fr.ts)} degrees, street air ${num(fr.ta)} degrees, stored heat ${num(fr.store)} megajoules per square metre, ${fr.toMass > 6 ? 'taking in heat.' : fr.toMass < -6 && fr.store >= 0.05 ? 'giving heat back.' : fr.store < 0.05 ? 'nothing stored yet.' : 'roughly balanced.'}`;
}

export default function CityHeatWorld({ world, children }: { world: InfoooWorld; children?: ReactNode }) {
  const reduced = useInfoooReducedMotion(), slug = world.slug;
  const [weather, setWeather] = useState<WeatherId>('clear'), [lever, setLever] = useState<LeverId>('none'), [days, setDays] = useState(1);
  const [hour, setHour] = useState(START), [tab, setTab] = useState<ChartTab>('surface'), [guess, setGuess] = useState<GuessId | null>(null), [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>(() => QUIZ.map(() => null)), [checked, setChecked] = useState<boolean[]>(() => QUIZ.map(() => false));
  const root = useRef<HTMLDivElement>(null), chartCard = useRef<HTMLDivElement>(null), started = useRef(false), playAfterDays = useRef(false), holdReveal = useRef(false), liveHour = useRef(START);

  const sims = useMemo(() => runSims(weather, lever, days), [weather, lever, days]);
  const stats = useMemo(() => computeStats(sims, days), [sims, days]);
  const beats = useMemo(() => buildBeats(days), [days]);
  const data = useMemo(() => chartData(tab, sims), [tab, sims]);
  const rows = useMemo(() => leverRows(weather), [weather]);
  const fa = frame(sims.A, hour), fb = frame(sims.B, hour), beat = beatAt(beats, hour);
  const [capTitle, capText] = useMemo(() => narrate(beat, sims, stats, days), [beat, sims, stats, days]);
  const labels = useMemo(() => ({ A: sceneLabel('A', frame(sims.A, beat.h), beat.h), B: sceneLabel('B', frame(sims.B, beat.h), beat.h) }), [sims, beat]);

  // The reveal is inserted above the chart, so while a chart drag is in progress it waits for the pointer to lift.
  const moveTo = useCallback((h: number) => {
    const next = clamp(h, START, endHour(days));
    liveHour.current = next; setHour(next); if (!holdReveal.current) setStage(prev => Math.max(prev, stageFor(next)));
  }, [days]);
  const { playing, play, pause, next } = useDayPlayback({ days, hour, moveTo, reduced });
  useEffect(() => { if (stage === 2) trackInfoooGuideComplete(slug, 'day-run'); }, [stage, slug]);
  useEffect(() => { if (playAfterDays.current) { playAfterDays.current = false; if (!reduced) play(); } }, [days, reduced, play]);
  // The site header is sticky, so the clock dock sits just below it.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.k-navbar'), el = root.current; if (!nav || !el) return;
    const set = () => el.style.setProperty('--ch-top', `${nav.offsetHeight}px`); set();
    const ro = new ResizeObserver(set); ro.observe(nav); return () => ro.disconnect();
  }, []);

  const end = hour >= endHour(days) - 1e-6, atStart = hour <= START + 1e-6;
  const runLabel = reduced ? (end ? '↻ Start again' : atStart ? '▶ First moment' : 'Next moment ▶') : playing ? '⏸ Pause' : end ? '↻ Replay' : atStart ? '▶ Run the day' : '▶ Resume';
  function run() {
    if (!started.current) { started.current = true; trackInfoooWorldStart(slug); }
    if (reduced) { if (end) moveTo(START); else next(); } else if (playing) pause(); else play();
  }
  function changeDays(n: number, andPlay: boolean) {
    setDays(n); setHour(h => Math.min(h, endHour(n)));
    if (andPlay && n > 1) { setHour(29); playAfterDays.current = true; }
    trackInfoooEntityView(slug, `days-${n}`);
  }
  const pick = (g: GuessId) => { if (stage === 0) setGuess(cur => cur === g ? null : g); };
  const guessLocked = stage > 0;
  const baseRow = rows[0], best = bestLevers(rows), params = paramRows(sims);

  const stageNode = <>
    <section className="ch-hero" aria-label="The question">
      <p className="ch-question">Why can two places in the same city feel completely different on the same hot day?</p>
      <div className="ch-guess" hidden={guessLocked && !guess}>
        <p>Guess first? <span>Optional. After the sun sets, which difference between the two blocks fades first?</span></p>
        <div className="ch-chips" role="group" aria-label="Your guess">{GUESSES.map(g => <Chip key={g} pressed={guess === g} disabled={guessLocked} onClick={() => pick(g)}>{GUESS_LABEL[g]}</Chip>)}</div>
        <p className="ch-guess-note" aria-live="polite">{guessLocked ? (guess ? `Locked in: “${GUESS_LABEL[guess]}”. The answer is in the green box below the pictures.` : '') : guess ? 'Locked in for the reveal. Now press “Run the day”.' : ''}</p>
      </div>
    </section>

    <section aria-labelledby="ch-sim-title">
      <h2 className="ch-sr" id="ch-sim-title">The simulation: two city blocks over one day</h2>
      <div className="ch-dock">
        <div className="ch-dock-row">
          <button type="button" className="k-button k-button--primary" id="ch-run" onClick={run}>{runLabel}</button>
          <div className="ch-clock" aria-hidden="true"><span>{days > 1 ? `Day ${dayOf(hour, days)} · ` : ''}{clockText(hour)}</span><small>{phaseOf(hour)}</small></div>
          <div className="ch-slider">
            <label className="ch-sr" htmlFor="ch-slider">Time of day</label>
            <input type="range" id="ch-slider" min={0} max={1440 * days} step={10} value={Math.round((hour - START) * 6) * 10}
              aria-valuetext={`${days > 1 ? `Day ${dayOf(hour, days)}, ` : ''}${clockText(hour)}, ${phaseOf(hour).toLowerCase()}`}
              onChange={e => { pause(); moveTo(START + Number(e.target.value) / 60); }}/>
          </div>
          <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => { pause(); moveTo(27); }}>Skip to 3 AM</button>
        </div>
        <div className="ch-capwrap"><p className="ch-caption" aria-live="polite" aria-atomic="true"><strong>{capTitle}</strong> {capText}</p><a className="ch-caplink" href="#ch-aha" hidden={stage === 0}>Summary ↓</a></div>
      </div>

      <div className="ch-stage">
        {(['A', 'B'] as const).map(which => {
          const fr = which === 'A' ? fa : fb;
          return <article className="ch-card" key={which} aria-labelledby={`ch-name-${which}`}>
            <div className="ch-card-head"><h3 id={`ch-name-${which}`}>Block {which} · {which === 'A' ? 'Dark & paved' : 'Green & light'}</h3><p>{which === 'A' ? 'Asphalt, concrete, dark roofs, few trees, narrow streets' : 'Trees, shade, grass, reflective roofs, wider streets'}</p></div>
            <div className="ch-scene"><CityScene which={which} lever={lever} block={which === 'A' ? sims.blockA : BLOCKS.green} fr={fr} hour={hour} weather={weather} storeMax={sims.storeMax} label={labels[which]}/></div>
            <div className="ch-tiles">
              <Tile label="Surface" sub="what you’d touch">{deg(fr.ts)}</Tile>
              <Tile label="Street air" sub="what a shaded thermometer reads">{deg(fr.ta)}</Tile>
              <Tile label="Heat stored" sub={flowText(fr)}>{num(fr.store)}<small> MJ/m²</small></Tile>
            </div>
          </article>;
        })}
      </div>
      <div className="ch-legend-pics" role="group" aria-label="How to read the pictures">
        <span><span className="ch-bar" role="img" aria-label="Colour scale from cool blue to hot red"/>Roof and street colour = surface temperature (18 → 68 °C)</span>
        <span><span className="ch-glow" aria-hidden="true"/>Orange glow inside walls and ground = heat stored</span>
        <span>↓ arrows = soaking up heat · ↑ arrows = giving it back</span>
      </div>

      <div className="ch-aha" id="ch-aha" hidden={stage === 0} role="region" aria-labelledby="ch-aha-title">
        <p className="ch-tag">AHA</p>
        <h3 id="ch-aha-title">Cities don’t only get hot. They store heat and release it later.</h3>
        <p>{ahaGuessText(stats, guess, stage)}</p>
        <ul>{ahaLines(stats, stage).map(line => <li key={line}>{line}</li>)}</ul>
        <p className="ch-go">Go further: see measured heat maps of real neighbourhoods on NOAA’s <a href="https://www.heat.gov/" target="_blank" rel="noreferrer">Heat.gov</a>.</p>
        <div className="ch-row">
          <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => { setTab('store'); chartCard.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }}>{tab === 'store' ? 'Showing stored heat' : 'Show the stored heat'}</button>
          <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => changeDays(days === 1 ? 3 : 1, days === 1)}>{days === 1 ? 'Keep the heat wave going (3 days)' : 'Back to one day'}</button>
        </div>
      </div>

      <section className="ch-gap" aria-labelledby="ch-gap-title">
        <h3 id="ch-gap-title">Block A compared with Block B, right now</h3>
        <div className="ch-tiles">
          <Tile label="Surface difference" sub="A minus B">{signed(fa.ts - fb.ts)}°C</Tile>
          <Tile label="Air difference" sub="A minus B">{signed(fa.ta - fb.ta)}°C</Tile>
          <Tile label="Stored heat ratio" sub="A divided by B">{fb.store > 0.05 ? `×${num(fa.store / fb.store)}` : '–'}</Tile>
        </div>
      </section>

      <div className="ch-card ch-chart-card" ref={chartCard}>
        <div className="ch-chart-head">
          <h3 id="ch-chart-title">The whole day on one chart</h3>
          <div className="ch-chips" role="group" aria-label="Chart shows">{CHART_TABS.map(([id, label]) => <Chip key={id} pressed={tab === id} onClick={() => setTab(id)}>{label}</Chip>)}</div>
        </div>
        <HeatChart sim={sims.A} data={data} tab={tab} days={days} hour={hour} changed={lever !== 'none'} labelledBy="ch-chart-title ch-chart-desc" onScrub={h => { holdReveal.current = true; pause(); moveTo(h); }} onScrubEnd={() => { holdReveal.current = false; setStage(prev => Math.max(prev, stageFor(liveHour.current))); }}/>
        <p className="ch-sr" id="ch-chart-desc">{chartDescription(tab, stats, days)}</p>
        <p className="ch-chart-note">{chartNote(tab, sims)}</p>
        <details className="ch-data"><summary>Show the numbers as a table</summary>
          <div className="ch-tablewrap" tabIndex={0} role="region" aria-label="Numbers every three hours, scrollable"><table>
            <caption className="ch-sr">Model output every three hours. Temperatures in degrees Celsius, stored heat in megajoules per square metre.</caption>
            <thead><tr>{['Time', 'A surface', 'B surface', 'A air', 'B air', 'Country air', 'A stored', 'B stored'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{dataRows(sims, days).map((r, n) => <tr key={n}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
        </details>
      </div>
    </section>

    <section className="ch-block" aria-labelledby="ch-explore-title">
      <h2 id="ch-explore-title">Explore more: change one thing</h2>
      <p className="ch-lead">Scrub the clock to a moment you care about, then change something. The pictures and chart update instantly.</p>
      <div className="ch-controls">
        <div className="ch-control">
          <h3>Weather <span>(both blocks)</span></h3>
          <p className="ch-hint">Only sun and wind change. The regional air temperature stays the same so you can see the effect on the gap.</p>
          <div className="ch-chips" role="group" aria-label="Weather">{WEATHERS.map(w => <Chip key={w.id} pressed={weather === w.id} onClick={() => { setWeather(w.id); trackInfoooEntityView(slug, `weather-${w.id}`); }}>{w.label}</Chip>)}</div>
        </div>
        <div className="ch-control">
          <h3>How many hot days in a row?</h3>
          <p className="ch-hint">Day 1 starts after cooler weather. Days 2 and 3 keep going, and nothing gets a chance to reset.</p>
          <div className="ch-chips" role="group" aria-label="Hot days in a row">{[1, 3].map(n => <Chip key={n} pressed={days === n} onClick={() => changeDays(n, false)}>{n} day{n > 1 ? 's' : ''}</Chip>)}</div>
        </div>
        <div className="ch-control">
          <h3>Change one thing on Block A</h3>
          <p className="ch-hint">Pick a row. Block A changes in the pictures and chart. The numbers show how much each change moves things, compared with no change (hot, clear day 1 → current weather).</p>
          <div className="ch-tablewrap" tabIndex={0} role="region" aria-label="What each change does, scrollable">
            <table className="ch-levers">
              <thead><tr><th scope="col">Change Block A</th>{LEVER_COLUMNS.map(c => <th key={c} scope="col">{LEVER_HEADS[c]}</th>)}</tr></thead>
              <tbody>{rows.map(r => <tr key={r.id}>
                <td className="ch-name"><button type="button" aria-pressed={lever === r.id} onClick={() => { setLever(r.id); trackInfoooEntityView(slug, `lever-${r.id}`); }}><span className="ch-tick" aria-hidden="true" style={{ visibility: lever === r.id ? 'visible' : 'hidden' }}>✓</span>{LEVERS.find(l => l.id === r.id)!.label}</button></td>
                {LEVER_COLUMNS.map(c => <td key={c} className={best[c] === r.id ? 'ch-best' : undefined} title={best[c] === r.id ? 'Biggest drop in this column' : undefined}>{leverCell(r, baseRow, c)}</td>)}
              </tr>)}</tbody></table>
          </div>
          <p className="ch-baseline">{baselineLine(baseRow)}</p>
          <p className="ch-reality"><strong>Reality check.</strong> Shade can cool the ground under a tree by 14–23 °C, yet whole-district studies find the <em>air</em> cools far less: about 0.07 °C per extra 10 % of tree canopy in Boston. This model gives trees more air-cooling than that, so read the tree row as an upper bound.</p>
        </div>
      </div>
    </section>

    <section className="ch-block" aria-labelledby="ch-test-title">
      <h2 id="ch-test-title">Test yourself</h2>
      <p className="ch-lead">Three quick questions. No score, no tracking.</p>
      <div className="ch-quiz">{QUIZ.map((q, i) => <fieldset key={q.q}>
        <legend>{i + 1}. {q.q}</legend>
        {q.options.map((o, j) => <label className="ch-opt" key={o}><input type="radio" name={`ch-q${i}`} value={j} checked={picked[i] === j} onChange={() => setPicked(p => p.map((v, k) => k === i ? j : v))}/><span>{o}</span></label>)}
        <button type="button" className="k-button k-button--secondary k-button--compact" onClick={() => setChecked(c => c.map((v, k) => k === i ? true : v))}>Check answer</button>
        <p className="ch-feedback" role="status">{checked[i] ? (picked[i] === null ? 'Pick an answer first.' : <><b className={picked[i] === q.answer ? 'ch-ok' : undefined}>{picked[i] === q.answer ? 'Yes.' : 'Not quite.'}</b> {picked[i] === q.answer ? '' : `The answer: “${q.options[q.answer]}”. `}{q.why(stats)}</>) : ''}</p>
      </fieldset>)}</div>
    </section>
  </>;

  return <div className={`city-heat${playing && !reduced ? ' ch-flowing' : ''}`} data-reduced={reduced} ref={root}>
    <InfoooWorldShell world={world} stage={stageNode} footer={<><HeatTruth sources={world.knowledge?.sources ?? []} params={params} lastReviewed={world.knowledge?.lastReviewed}/>{children}</>}/>
  </div>;
}
