import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { InfoooWorld } from '../../../data/infooo';
import { InfoooWorldShell, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import { trackInfoooEntityView, trackInfoooGuideComplete, trackInfoooWorldStart } from '../../../utils/analytics';
import { BUSY_HUB, HOURS, QUIET, heardAt, type RunResult } from './misinfoModel.ts';
import { CHOICES, RUMOR, START_PICK, STEPS, TRUTH, describe, recap, type Pick } from './misinfoStory.ts';
import MisinfoMap from './MisinfoMap';
import { ChallengeView, useChallenge } from './MisinfoChallenge';
import './misinformation.css';

const TICK_MS = 600;

function Post({ kind }: { kind: 'rumor' | 'truth' }) {
  const rumor = kind === 'rumor';
  return <div className={`mi-post mi-post-${kind}`}>
    <span className="mi-mark" aria-hidden="true">{rumor ? '!' : '✓'}</span>
    <span className="mi-who">{rumor ? 'The rumor' : 'The truth'} <span className="mi-tag">{rumor ? 'FALSE' : 'TRUE'}</span></span>
    <q>{rumor ? RUMOR : TRUTH}</q>
  </div>;
}

export default function MisinformationWorld({ world, children }: { world: InfoooWorld; children?: ReactNode }) {
  const reduced = useInfoooReducedMotion(), slug = world.slug;
  const [step, setStep] = useState(0), [done, setDone] = useState<boolean[]>(() => STEPS.map(() => false));
  const [run, setRun] = useState<RunResult | null>(null), [hour, setHour] = useState(HOURS), [playing, setPlaying] = useState(false), [rings, setRings] = useState(false);
  const [pick, setPick] = useState<Pick>(START_PICK), [mode, setMode] = useState<'challenge' | 'free'>('challenge');
  const root = useRef<HTMLDivElement>(null), card = useRef<HTMLElement>(null), viz = useRef<HTMLDivElement>(null), title = useRef<HTMLHeadingElement>(null), moved = useRef(false);
  const st = STEPS[step];

  const finish = (at: number) => {
    setPlaying(false); setHour(HOURS);
    setDone(d => d.map((v, i) => i === at ? true : v));
    if (at === STEPS.length - 1) trackInfoooGuideComplete(slug, 'story');
  };
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => { if (hour + 1 >= HOURS) finish(step); else setHour(hour + 1); }, TICK_MS);
    return () => window.clearTimeout(id);
  }, [playing, hour, step]);
  // After a step change the page can be shorter than before; bring the card back into view so its button is not lost off-screen.
  useEffect(() => {
    if (!moved.current) return;
    title.current?.focus({ preventScroll: true });
    const el = card.current;
    if (el && typeof el.getBoundingClientRect === 'function' && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [step]);
  // The site header is sticky; the map sizes itself to the space left under it.
  useEffect(() => {
    const nav = typeof document !== 'undefined' ? document.querySelector?.<HTMLElement>('.k-navbar') : null, el = root.current;
    if (!nav || !el || typeof ResizeObserver === 'undefined') return;
    const set = () => el.style.setProperty('--mi-top', `${nav.offsetHeight}px`); set();
    const ro = new ResizeObserver(set); ro.observe(nav); return () => ro.disconnect();
  }, []);

  const begin = () => { trackInfoooWorldStart(slug); };
  const ch = useChallenge({ reduced, slug, begin });
  /** The challenge and the free story keep separate state, so switching between them loses nothing. */
  const leave = () => { ch.pause(); setMode('free'); };
  const openChallenge = () => { if (playing) finish(step); setMode('challenge'); };
  const reveal = () => {
    const narrow = typeof window !== 'undefined' && window.innerWidth < 760, el = narrow ? viz.current : card.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || (r.bottom > window.innerHeight && r.top > 8)) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  const act = (nextPick = pick, instant = false) => {
    begin(); trackInfoooEntityView(slug, st.id);
    setRun(st.setup(nextPick)); setRings(!!st.rings);
    if (instant || st.instant || reduced) { finish(step); return; }
    setHour(0); setPlaying(true); reveal();
  };
  const go = (i: number) => {
    if (i < 0 || i >= STEPS.length) return;
    moved.current = true; setPlaying(false); setStep(i); setHour(HOURS);
    const target = STEPS[i];
    setRun(done[i] ? target.setup(pick) : target.before()); setRings(done[i] && !!target.rings);
  };
  const choose = (key: keyof Pick, value: string) => { const next = { ...pick, [key]: value } as Pick; setPick(next); act(next, true); };

  const finished = done[step] && !playing && !!run;
  const res = finished && run ? st.result(run) : null;
  const seed = run ? run.seed : step === 0 || (st.choices && pick.seed === 'quiet') ? QUIET : BUSY_HUB;
  const k = run?.counts[hour];
  const showOnly = !!run && run.corrHour >= 0 && hour >= run.corrHour;
  const items = recap();

  const freeStory = <>
    <section className="mi-card" ref={card} aria-label="The story, step by step">
      <div className="mc-switch"><button type="button" className="k-button k-button--ghost" onClick={openChallenge}>Try the challenge</button></div>
      <ol className="mi-rail">{STEPS.map((s, i) => <li key={s.id}>
        <button type="button" aria-current={i === step ? 'step' : undefined} className={done[i] ? 'mi-done' : undefined} disabled={i > 0 && !done[i - 1] && i !== step} onClick={() => go(i)}>
          <span className="mi-n" aria-hidden="true">{done[i] ? '✓' : i + 1}</span><span className="mi-sr">Step {i + 1}: </span><span className="mi-t">{s.rail}</span>{done[i] && <span className="mi-sr"> (done)</span>}
        </button>
      </li>)}</ol>
      <div className="mi-grid">
        <div className="mi-intro">
          <p className="mi-kicker">Step {step + 1} of {STEPS.length}</p>
          <h2 ref={title} tabIndex={-1}>{st.title}</h2>
          {st.text && <p className="mi-text">{st.text}</p>}
          {st.post && <Post kind={st.post}/>}
        </div>
        <div className="mi-go">
          {st.choices && <div className="mi-choices">{CHOICES.map(c => <fieldset key={c.key}><legend>{c.legend}</legend><div className="mi-seg">
            {c.options.map(([v, label]) => <button key={v} type="button" aria-pressed={pick[c.key] === v} onClick={() => choose(c.key, v)}>{label}</button>)}
          </div></fieldset>)}</div>}
          {!(done[step] && st.instant) && <button type="button" className="k-button k-button--primary mi-act" disabled={playing} onClick={() => act()}>{done[step] && !st.choices ? '↺ Watch it again' : st.act}</button>}
        </div>
        <div className="mi-viz" ref={viz}>
          <div className="mi-head">
            <span className="mi-clock">{run ? `Hour ${hour} of ${HOURS}` : 'Not posted yet'}</span>
            <span className="mi-count"><b>{run ? heardAt(run, hour) : 0}</b> <small>of 120 heard the rumor</small>{showOnly && k && <span className="mi-only"><b>{k[1]}</b> <small>still have only the rumor</small></span>}</span>
          </div>
          <MisinfoMap run={run} hour={hour} playing={playing} rings={rings} seed={seed} label={`Map of a made-up town of 120 people in four neighborhoods. ${describe(run, hour, rings)}`}/>
          <p className="mi-legend" aria-hidden="true">
            <span><i className="mi-dot mi-dot-r"/>Has the rumor</span>
            {showOnly && <span><i className="mi-dot mi-dot-f"/>Got the truth</span>}
            {rings && <span><i className="mi-dot mi-dot-rep"/>Heard it 2+ times</span>}
            <span><i className="mi-dot mi-dot-n"/>Hasn&rsquo;t heard</span>
            <span><i className="mi-line"/>Who told whom</span>
          </p>
        </div>
        <div className="mi-ctrl">
          <div className="mi-result" role="status" aria-live="polite" aria-atomic="true" hidden={!res}>{res && <><b>{res.strong}</b>{res.rest && <> {res.rest}</>}</>}</div>
          <div className="mi-nav">
            {step > 0 && <button type="button" className="k-button k-button--ghost" onClick={() => go(step - 1)}>← Back</button>}
            {finished && step < STEPS.length - 1 && <button type="button" className="k-button k-button--secondary" onClick={() => go(step + 1)}>Next step →</button>}
          </div>
        </div>
      </div>
    </section>
  </>;
  const stage = <>
    {mode === 'challenge' ? <ChallengeView c={ch} onLeave={leave}/> : freeStory}
    <section className="mi-recap" aria-labelledby="mi-recap-title">
      <h2 id="mi-recap-title">In short</h2>
      <ol>{items.map(it => <li key={it.title}><h3>{it.title}</h3><span className="mi-big">{it.value}</span><p>{it.note}</p></li>)}</ol>
      <p className="mi-bottom">A rumor spreads because of <em>who</em> shares it and <em>how often</em>. Not because it is true.</p>
    </section>
  </>;

  const sources = world.knowledge?.sources ?? [];
  const footer = <>
    <details className="mi-how" id="mi-how">
      <summary>How this works &amp; sources</summary>
      <ul>
        <li>The town and the rumor are made up. Nothing here is about real people or politics.</li>
        <li>A small model decides who passes it on. It never checks whether the rumor is true.</li>
        <li>The rule sizes (a 15% share chance, the boost from hearing it again) are simplified to show the pattern, not to predict real numbers.</li>
        <li>The map shows one run, chosen because it is close to the average of 100 runs.</li>
        <li>In the challenge, both posts use the same luck, so only the change you make explains the difference. It also reports how often that difference held across 100 other luck settings.</li>
      </ul>
      {sources.length > 0 && <ol className="mi-src">{sources.map(s => <li key={s.url}><a href={s.url} rel="noopener noreferrer">{s.label}</a></li>)}</ol>}
      {world.knowledge?.lastReviewed && <p className="mi-meta">Last reviewed {world.knowledge.lastReviewed}.</p>}
    </details>
    {children}
  </>;

  return <div className={`misinfo${playing ? ' mi-running' : ''}`} data-reduced={reduced} ref={root}>
    <InfoooWorldShell world={world} stage={stage} footer={footer}/>
  </div>;
}
