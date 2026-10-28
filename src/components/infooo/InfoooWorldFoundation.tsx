import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { InfoooEntity, InfoooGuide, InfoooGuideStep, InfoooKnowledge, InfoooLayer, InfoooMode, InfoooRelationship, InfoooScenario, InfoooWorld } from '../../data/infooo';
import { url } from '../../utils/url';

const accent = 'var(--infooo-accent, #5CCFAF)';
const card = { background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem' } as const;
const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 } as CSSProperties;

export function useInfoooReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return reducedMotion;
}

/** Shared playback only; each world owns its scenes and teaching sequence. */
export function useInfoooPlayback(last: number, duration = 4500, holdAt?: number) {
  const reducedMotion = useInfoooReducedMotion();
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const done = step >= last;
  const held = step === holdAt;
  const running = playing && !reducedMotion && !done && !held;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setStep(step + 1), duration);
    return () => window.clearTimeout(timer);
  }, [running, step, duration]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  const advance = () => { if (held) return; setPlaying(false); setStep(step < 0 || done ? 0 : step + 1); };
  function toggle() {
    if (held) return;
    if (step < 0 || done) { setStep(0); setPlaying(!reducedMotion); }
    else if (reducedMotion) advance();
    else setPlaying(!running);
  }
  return { step, done, running, held, toggle, advance, replayFrom: (index: number) => { setPlaying(!reducedMotion); setStep(Math.max(0, Math.min(last, index))); }, pause: () => setPlaying(false), reset: () => { setPlaying(false); setStep(-1); }, label: held ? 'Awaiting approval' : done ? 'Replay' : step < 0 ? 'Play' : reducedMotion ? 'Step' : running ? 'Pause' : 'Play' };
}

export function useInfoooSceneFollow(step: number, root: RefObject<HTMLElement | null>, layoutKey = 0) {
  useEffect(() => {
    if (step < 0 || !window.matchMedia('(max-width: 650px)').matches) return;
    const object = root.current?.querySelector('[data-current-object="true"]');
    if (!object) return;
    const learning = root.current?.parentElement?.querySelector<HTMLElement>('.scene-learning');
    const inset = learning ? (parseFloat(getComputedStyle(learning).top) || 0) + learning.offsetHeight + 12 : 12;
    const rect = object.getBoundingClientRect();
    const target = inset + 12;
    window.scrollBy({ top: rect.top - target, behavior: 'instant' });
  }, [step, layoutKey]);
}

export function InfoooTermNotes({ terms }: { terms: readonly (readonly [string, string])[] }) {
  if (!terms.length) return null;
  return <dl className="scene-terms" aria-label="Current stage terms">{terms.slice(0, 3).map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>;
}

export const infoooDepths = ['Beginner', 'Intermediate', 'Advanced'] as const;
export function InfoooDepthControl({ depth, onChange }: { depth: number; onChange: (depth: number) => void }) {
  return <div className="learning-depth" role="radiogroup" aria-label="Knowledge depth">{infoooDepths.map((label, index) => <label key={label}><input type="radio" name="knowledge-depth" value={index} checked={depth === index} onChange={() => onChange(index)}/><span>{label}</span></label>)}</div>;
}

export function InfoooWorldShell({ world, stage, toolbar, controls, panel, footer, firstVisit, onReturnToFirstVisit }: { world: InfoooWorld; stage: ReactNode; toolbar?: ReactNode; controls?: ReactNode; panel?: ReactNode; footer?: ReactNode; firstVisit?: ReactNode; onReturnToFirstVisit?: () => void }) {
  const [exploring, setExploring] = useState(false);
  const collection = world.collectionNavigation;
  return <section className="infooo-world-shell k-container" aria-label={`${world.title} interactive knowledge world`} style={{ '--infooo-accent': world.accent || '#5CCFAF' } as CSSProperties}>
    <header className="infooo-world-header"><div><p>INFOOO · WORLD {String(world.worldNumber).padStart(3, '0')}</p><h1>{world.title}</h1>{world.tagline && <span>{world.tagline}</span>}</div>{!firstVisit && controls}</header>
    {firstVisit && !exploring && firstVisit}
    {firstVisit ? <details className="infooo-entry-explore" onToggle={event => { const open=event.currentTarget.open; if(exploring && !open) onReturnToFirstVisit?.(); setExploring(open); }}><summary>Explore more — scenarios, controls & sources</summary>{controls}{toolbar}<div className="infooo-world-layout"><div>{stage}</div>{panel && <aside className="infooo-world-panel">{panel}</aside>}</div>{footer}</details> : <>{toolbar}<div className="infooo-world-layout"><div>{stage}</div>{panel && <aside className="infooo-world-panel">{panel}</aside>}</div>{footer}</>}
    {collection && <nav className="infooo-collection-nav" aria-label={`${collection.title} journey`}><div><a href={url(`/infooo/${collection.slug}`)}>{collection.title}</a><span>Step {collection.step} of {collection.total} · {world.title}</span></div><div>{collection.previous && <a rel="prev" href={url(`/infooo/${collection.previous.slug}`)} data-infooo-collection={collection.slug} data-collection-action="world">← {collection.previous.title}</a>}{collection.next && <a rel="next" href={url(`/infooo/${collection.next.slug}`)} data-infooo-collection={collection.slug} data-collection-action="world">{collection.next.title} →</a>}<a href={url(`/infooo/${collection.slug}`)}>View all {collection.total} labs</a></div></nav>}
  </section>;
}

export function InfoooStage({ label = 'Interactive world', description, loading, error, onRetry, children }: { label?: string; description?: string; loading?: ReactNode; error?: ReactNode; onRetry?: () => void; children: ReactNode }) {
  return <section aria-label={label} aria-describedby={description ? 'infooo-stage-description' : undefined} className="infooo-stage" data-has-error={Boolean(error) || undefined}>
    {description && <p id="infooo-stage-description" style={srOnly}>{description}</p>}{children}
    {loading && <div className="infooo-stage-overlay">{loading}</div>}
    {error && <div className="infooo-stage-overlay"><InfoooErrorState message={error} onRetry={onRetry} /></div>}
  </section>;
}

export function InfoooToolbar({ children, label = 'World controls' }: { children: ReactNode; label?: string }) { return <nav aria-label={label} className="infooo-toolbar">{children}</nav>; }

export function InfoooModeSwitcher({ modes, activeMode, onSelect }: { modes: InfoooMode[]; activeMode?: InfoooMode; onSelect: (mode: InfoooMode) => void }) { if (!modes.length) return null; return <div role="tablist" aria-label="Learning mode" className="infooo-control-group">{modes.map(mode => <button key={mode} type="button" role="tab" aria-selected={activeMode === mode} onClick={() => onSelect(mode)}>{mode === 'what-if' ? 'What if?' : mode === 'guide' ? 'Guide me' : mode}</button>)}</div>; }
export function InfoooLayerControl({ layers, activeId, onSelect }: { layers: InfoooLayer[]; activeId?: string; onSelect: (id: string) => void }) { if (!layers.length) return null; return <div role="group" aria-label="World layers" className="infooo-control-group">{layers.map(layer => <button key={layer.id} type="button" disabled={layer.disabled} aria-pressed={activeId === layer.id} onClick={() => onSelect(layer.id)} title={layer.description} style={{ '--layer-color': layer.color || accent } as CSSProperties}>{layer.icon && <span aria-hidden="true">{layer.icon}</span>}{layer.label}</button>)}</div>; }

export function InfoooSearchPanel({ items, selectedId, onSelect, label = 'Find an object', placeholder = 'Search this world' }: { items: InfoooEntity[]; selectedId?: string; onSelect: (id: string) => void; label?: string; placeholder?: string }) {
  const [query, setQuery] = useState(''); const [active, setActive] = useState(0);
  const matches = useMemo(() => items.filter(item => `${item.title} ${item.shortTitle || ''} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (!matches.length) return; if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(current => (current + (event.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length); } if (event.key === 'Enter') { event.preventDefault(); onSelect(matches[active]?.id); } };
  return <section aria-label={label} className="infooo-search"><label>{label}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder={placeholder} aria-controls="infooo-search-results" aria-activedescendant={matches[active] ? `infooo-search-${matches[active].id}` : undefined} /></label><div id="infooo-search-results" role="listbox">{matches.map((item, index) => <button id={`infooo-search-${item.id}`} key={item.id} type="button" role="option" aria-selected={selectedId === item.id} data-active={index === active || undefined} onClick={() => onSelect(item.id)}>{item.shortTitle || item.title}</button>)}{!matches.length && <p role="status">Nothing found yet.</p>}</div></section>;
}

export function InfoooEntityPanel({ entities, selectedId, onSelect }: { entities: InfoooEntity[]; selectedId?: string; onSelect: (id: string) => void }) { return <aside className="infooo-panel"><InfoooSearchPanel items={entities} selectedId={selectedId} onSelect={onSelect} /></aside>; }
export function InfoooKnowledgePanel({ entity, knowledge }: { entity?: InfoooEntity; knowledge?: InfoooKnowledge }) { if (!entity || !knowledge) return null; const entries = [['What it is', knowledge.whatIs || knowledge.shortExplanation], ['Where it is', knowledge.whereIs], ['How it works', knowledge.howItWorks], ['Why it matters', knowledge.whyItMatters], ['Limits', knowledge.limitations]].filter((entry): entry is [string, string] => Boolean(entry[1])); return <aside className="infooo-panel" aria-live="polite" aria-label="Selected knowledge"><h2>{entity.title}</h2>{entries.map(([label, copy]) => <section key={label}><h3>{label}</h3><p>{copy}</p></section>)}</aside>; }
export function InfoooRelationshipPanel({ relationships, selectedId, onFocus }: { relationships: InfoooRelationship[]; selectedId?: string; onFocus?: (id: string) => void }) { const relevant = selectedId ? relationships.filter(item => item.from === selectedId || item.to === selectedId) : relationships; if (!relevant.length) return null; return <section className="infooo-panel" aria-label="Connections"><h2>Connections</h2>{relevant.map(item => <div className="infooo-relationship" key={item.id}><button type="button" onClick={() => onFocus?.(item.from)}>{item.from}</button><span>{item.type.replaceAll('-', ' ')}</span><button type="button" onClick={() => onFocus?.(item.to)}>{item.to}</button><p>{item.explanation}</p></div>)}</section>; }

export function useInfoooGuide(guide?: InfoooGuide, onStep?: (step: string | InfoooGuideStep, index: number) => void) { const [index, setIndex] = useState(0); const steps = guide?.steps || []; const move = (next: number) => { const bounded = Math.max(0, Math.min(steps.length - 1, next)); setIndex(bounded); if (steps[bounded]) onStep?.(steps[bounded], bounded); }; return { index, step: steps[index], total: steps.length, next: () => move(index + 1), back: () => move(index - 1), restart: () => move(0), isFirst: index === 0, isLast: index === Math.max(0, steps.length - 1) }; }
export function InfoooGuideControls({ title = 'Guide me', index, total, onBack, onNext, onExit, onRestart }: { title?: string; index: number; total: number; onBack: () => void; onNext: () => void; onExit?: () => void; onRestart?: () => void }) { if (!total) return null; return <nav className="infooo-guide" aria-label={title}><strong>{title} · {index + 1}/{total}</strong><div><button type="button" onClick={onBack} disabled={index === 0}>Back</button><button type="button" onClick={onNext}>{index === total - 1 ? 'Finish' : 'Next'}</button>{onRestart && <button type="button" onClick={onRestart}>Restart</button>}{onExit && <button type="button" onClick={onExit}>Exit</button>}</div></nav>; }
export function InfoooScenarioControl({ scenarios, activeId, onSelect, onReset }: { scenarios: InfoooScenario[]; activeId?: string; onSelect: (id: string) => void; onReset?: () => void }) { if (!scenarios.length) return null; return <div className="infooo-control-group" role="group" aria-label="What if scenarios">{scenarios.map(scenario => <button key={scenario.id} type="button" aria-pressed={scenario.id === activeId} onClick={() => onSelect(scenario.id)} title={scenario.prompt}>{scenario.label}</button>)}{onReset && <button type="button" onClick={onReset}>Reset</button>}</div>; }
export function InfoooCompareLayout({ left, right, leftLabel = 'A', rightLabel = 'B' }: { left: ReactNode; right: ReactNode; leftLabel?: string; rightLabel?: string }) { return <section className="infooo-compare" aria-label={`${leftLabel} compared with ${rightLabel}`}><section><h2>{leftLabel}</h2>{left}</section><section><h2>{rightLabel}</h2>{right}</section></section>; }
export function InfoooMobileSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) { if (!open) return null; return <section className="infooo-mobile-sheet" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close details">×</button></header>{children}</section>; }
export function InfoooLoadingState({ message = 'Preparing the world…', operation }: { message?: string; operation?: string }) { return <div role="status" aria-live="polite" className="infooo-loading"><strong>{message}</strong>{operation && <span>{operation}</span>}</div>; }
export function InfoooErrorState({ message = 'This world needs a moment.', onRetry }: { message?: ReactNode; onRetry?: () => void }) { return <div role="alert" className="infooo-error"><strong>{message}</strong>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>; }
export function InfoooSourceDisclosure({ knowledge, plain = false }: { knowledge?: InfoooKnowledge; plain?: boolean }) { const sources = knowledge?.sources?.filter(source => source.label && source.url) || []; const rows = (plain ? [['Real', knowledge?.fact], ['Simplified', knowledge?.simulation], ['Can vary', knowledge?.limitations]] : [['Fact', knowledge?.fact], ['Model', knowledge?.model], ['Simulation', knowledge?.simulation], ['Limitations', knowledge?.limitations], ['Educational context', knowledge?.educationalContext], ['Last reviewed', knowledge?.lastReviewed]]).filter((row): row is [string, string] => Boolean(row[1])); if (!rows.length && !sources.length) return null; return <details className="infooo-sources"><summary>{plain ? 'What’s real, what’s simplified' : 'How this world stays honest'}</summary>{rows.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}{plain && sources.length > 0 && <h2>Sources</h2>}{sources.length > 0 && <ul>{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>}</details>; }
