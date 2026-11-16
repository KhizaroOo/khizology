import { useEffect, useRef, useState } from 'react';
import { trackInfoooEntityView, trackInfoooGuideComplete } from '../../../utils/analytics';
import { HOURS, N, degree, heardAt, type RunResult } from './misinfoModel.ts';
import { describe } from './misinfoStory.ts';
import { BASE, PEOPLE, hoodText, optionNote, paired, personOf, runsFor, summarize, tagFor, type PersonId, type Stage } from './misinfoCases.ts';
import MisinfoMap from './MisinfoMap';

const TICK_MS = 600;
type View = 'base' | 'mine';

/** All challenge state. It lives beside the free story and never touches it, so leaving and returning loses nothing. */
export function useChallenge({ reduced, slug, begin }: { reduced: boolean; slug: string; begin: () => void }) {
  const [runs] = useState(() => runsFor());
  const [stage, setStage] = useState<Stage>('start'), [sel, setSel] = useState<PersonId>(BASE), [view, setView] = useState<View>('mine');
  const [hour, setHour] = useState(0), [playing, setPlaying] = useState(false), [odds, setOdds] = useState<{ wins: number; count: number } | null>(null);
  const title = useRef<HTMLHeadingElement>(null), card = useRef<HTMLElement>(null), moved = useRef(false), began = useRef(false), done = useRef(false);

  const go = (next: Stage) => { moved.current = true; setStage(next); };
  const finish = (id: PersonId) => {
    setPlaying(false); setHour(HOURS); go('result'); setView('mine');
    if (id !== BASE) { setOdds(paired(id)); if (!done.current) { done.current = true; trackInfoooGuideComplete(slug, 'challenge'); } }
  };
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => { if (hour + 1 >= HOURS) finish(sel); else setHour(hour + 1); }, TICK_MS);
    return () => window.clearTimeout(t);
  }, [playing, hour, sel]);
  // Each stage is a new screen: move focus to its heading and keep the card on screen.
  useEffect(() => {
    if (!moved.current) return;
    title.current?.focus({ preventScroll: true });
    const el = card.current;
    if (el && typeof el.getBoundingClientRect === 'function' && (stage === 'first' || el.getBoundingClientRect().top < 0)) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [stage]);

  const watch = () => {
    if (!began.current) { began.current = true; begin(); trackInfoooEntityView(slug, 'challenge-start'); }
    setHour(0); go('first');
  };
  /** Every option runs the moment it is chosen, and chosen again it replays. Nothing is disabled. */
  const choose = (id: PersonId) => {
    setSel(id); setOdds(null); setView('mine'); setHour(0);
    if (reduced) { finish(id); return; }
    setPlaying(true); go('running');
  };
  const restart = () => { setPlaying(false); setSel(BASE); setOdds(null); setHour(0); setView('mine'); go('start'); };
  /** Leaving mid-run shows the finished run instead of letting a hidden timer play on. */
  const pause = () => { if (stage === 'running') finish(sel); };

  const base = sel === BASE || view === 'base';
  const shown: RunResult | null = stage === 'start' ? null : stage === 'first' ? runs[BASE] : stage === 'running' ? runs[sel] : (base ? runs[BASE] : runs[sel]);
  const shownId: PersonId = stage === 'first' || stage === 'start' ? BASE : stage === 'running' ? sel : (base ? BASE : sel);
  const shownHour = stage === 'result' ? HOURS : stage === 'running' ? hour : 0;
  return { runs, stage, sel, view, odds, playing, hour: shownHour, shown, shownId, title, card, watch, choose, restart, pause, setView };
}
export type Challenge = ReturnType<typeof useChallenge>;

const Legend = ({ firstShare }: { firstShare: boolean }) => <p className="mi-legend" aria-hidden="true">
  <span><i className="mi-dot mi-dot-r"/>Has seen the rumor</span>
  <span><i className="mi-dot mi-dot-n"/>Hasn&rsquo;t</span>
  <span><i className="mi-line"/>Who passed it to whom</span>
  {firstShare && <span><i className="mi-line mi-line-hl"/>The first share</span>}
  <span>Large dot = a person with many connections</span>
</p>;

const STEPS = ['Watch', 'Choose', 'Compare'];
const stepOf = (s: Stage) => s === 'start' ? 0 : s === 'result' ? 2 : 1;

/** The challenge card. Plain markup, no hooks. */
export function ChallengeView({ c, onLeave }: { c: Challenge; onLeave: () => void }) {
  const { stage, sel, runs, shown, shownId } = c, mia = personOf(BASE), da = degree(mia.node), poster = personOf(shownId);
  const first = stage === 'first', result = stage === 'result', cur = stepOf(stage);
  const sum = result && sel !== BASE ? summarize(sel, runs, c.odds) : null;
  const titleText = stage === 'start' ? 'A rumor starts with one person' : first ? `${mia.name} posts it. ${da} people see it right away.` : stage === 'running' ? `Watch ${personOf(sel).name}'s post spread` : 'What happened';
  const text = stage === 'start' ? `In this made-up town of 120 people, ${mia.name} posts a rumor. Start by watching the first share.` : '';
  const label = shown ? `Map of a made-up town of 120 people in four neighborhoods. ${describe(shown, c.hour, false)} ${poster.name} posted first and has ${degree(poster.node)} connections, who all see the post right away.` : `Map of a made-up town of 120 people in four neighborhoods. Nobody has seen the rumor yet. ${mia.name} will post it first.`;
  const tags = stage === 'start' || first ? [{ id: mia.node, text: tagFor(BASE) }] : [{ id: poster.node, text: tagFor(shownId) }];
  const count = shown ? heardAt(shown, c.hour) : 0;

  return <section className="mi-card mc-card" ref={c.card} aria-label="Challenge">
    <div className="mc-top">
      <p className="mi-kicker">Guided experiment</p>
      <button type="button" className="k-button k-button--ghost" onClick={onLeave}>Explore freely</button>
    </div>
    <ol className="mc-steps" aria-label="Progress">
      {STEPS.map((s, i) => <li key={s} aria-current={i === cur ? 'step' : undefined} className={i === cur ? 'is-now' : i < cur ? 'is-done' : ''}><span>{i + 1}</span> {s}</li>)}
    </ol>
    <div className={`mi-grid mc-grid${stage !== 'start' ? ' mc-grid--result' : ''}`}>
      <div className="mi-intro">
        <h2 ref={c.title} tabIndex={-1}>{titleText}</h2>
        {text && <p className="mi-text">{text}</p>}
      </div>

      <div className="mi-go">
        {first && <div className="mc-explain">
          <p><b>What you are looking at</b></p>
          <ul>
            <li>Each <b>dot</b> is a person. A filled dot has seen the rumor. An empty dot has not.</li>
            <li>Each <b>line</b> is a connection: two people who see each other&rsquo;s posts.</li>
            <li>The <b>bold lines</b> are the first share: {mia.name} to her {da} connections.</li>
          </ul>
        </div>}
        {stage === 'start' && <button type="button" className="k-button k-button--primary mi-act" onClick={c.watch}>▶ Watch the first share</button>}
        {stage !== 'start' && <fieldset className="mc-opts"><legend className="mc-q">{first ? 'Next: what happens if someone else shares it first?' : 'Who shares it first?'}</legend>
          {PEOPLE.map(p => <button key={p.id} type="button" aria-pressed={stage !== 'first' && sel === p.id} onClick={() => c.choose(p.id)}>
            <span>▶ {p.name} shares first{p.id === BASE ? ' (baseline)' : ''}</span>
            <small>{optionNote(p.id)}</small>
            {stage !== 'first' && sel === p.id && <small className="mc-again">{stage === 'running' ? 'Running…' : 'Run again'}</small>}
          </button>)}
        </fieldset>}
        {result && <div className="mi-result mc-result" role="status" aria-live="polite" aria-atomic="true">
          {sel === BASE
            ? <><p><b>Baseline.</b> {mia.name} shares first. {runs[BASE].reached} of {N} people saw it.</p><p>Now choose someone else above to compare.</p></>
            : sum && <><p>{sum.first}</p><p>{sum.end}</p><p>{sum.why}</p><p className="mc-odds">{sum.odds}</p></>}
        </div>}
      </div>

      <div className="mi-viz">
        <div className="mi-head">
          <span className="mi-clock">{`Hour ${c.hour} of ${HOURS}`}</span>
          <span className="mi-count"><b>{count}</b> <small>of {N} people have seen the rumor</small></span>
        </div>
        {result && sel !== BASE && <div className="mc-compare" role="group" aria-label="Compare the two versions">
          <button type="button" aria-pressed={c.view === 'base'} onClick={() => c.setView('base')}>Baseline: {mia.name} · {runs[BASE].reached} reached</button>
          <button type="button" aria-pressed={c.view === 'mine'} onClick={() => c.setView('mine')}>{personOf(sel).name} · {runs[sel].reached} reached</button>
        </div>}
        <p className="mc-cap" aria-live="polite">{stage === 'start' ? 'Nobody has seen the rumor yet.' : `Showing: ${poster.name} shares first${shownId === BASE ? ' (baseline)' : ''}. ${poster.name}'s connections are ${hoodText(poster.node)}.`}</p>
        <MisinfoMap run={shown} hour={c.hour} playing={c.playing} rings={false} seed={poster.node} focus={stage !== 'start'} tags={tags} hubLabel="" label={label}/>
        <Legend firstShare={stage !== 'start'}/>
      </div>

      <div className="mi-ctrl">
        <div className="mi-nav">
          {stage !== 'start' && stage !== 'running' && <button type="button" className="k-button k-button--ghost" onClick={c.restart}>Start over</button>}
        </div>
      </div>
    </div>
    <p className="mc-sim">This is a simulation of made-up people. It models who sees a post and who passes it on, not what anyone believes. <a href="#mi-how" onClick={() => { const d = typeof document !== 'undefined' ? document.getElementById('mi-how') : null; if (d) (d as HTMLDetailsElement).open = true; }}>Assumptions &amp; limits</a></p>
  </section>;
}
