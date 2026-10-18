import { useEffect, useRef, useState } from 'react';
import type { InfoooWorld, InfoooGuideStep } from '../../../data/infooo';
import { InfoooStage, InfoooLayerControl, InfoooGuideControls, InfoooSourceDisclosure, useInfoooGuide, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import { trackInfoooWorldStart, trackInfoooEntityView, trackInfoooGuideStart, trackInfoooGuideComplete } from '../../../utils/analytics';
import { advanceDeployment, startDeployment, initialDeployment, deploymentStages, deploymentFailures, deploymentGuide, lanes, requestStages, requestDescriptions, type FailureId } from './deploymentJourney';
import './deployment.css';
import ProductionSystemsLab from './ProductionSystemsLab';
import { cacheJourney, type CacheMode } from './productionSystems';

export default function AppDeploymentJourney({ world }: { world: InfoooWorld }) {
  const complete = useRef(false);
  const [deep, setDeep] = useState(false);
  const [state, setState] = useState(initialDeployment);
  const [level, setLevel] = useState('simple');
  const [selected, setSelected] = useState('code');
  const [scenario, setScenario] = useState<FailureId>('none');
  const [guided, setGuided] = useState(false);
  const [request, setRequest] = useState(-1);
  const [rollback, setRollback] = useState(false);
  const [cache, setCache] = useState<CacheMode>('off');
  const [labReset, setLabReset] = useState(0);
  const requestPath = cache === 'off' ? { labels: [...requestStages], descriptions: [...requestDescriptions] } : cacheJourney(cache);
  const reduced = useInfoooReducedMotion();
  const guide = useInfoooGuide(deploymentGuide, step => { setSelected((step as InfoooGuideStep).targetId!); setLevel('infrastructure'); });
  useEffect(() => { if (state.status === 'live' && state.scenario === 'none') setRequest(0); }, [state.status, state.scenario]);
  useEffect(() => { if (state.status === 'live' && request === requestPath.labels.length - 1 && !complete.current) { complete.current = true; trackInfoooGuideComplete(world.slug, 'deployment-to-user'); } }, [state.status, request, requestPath.labels.length, world.slug]);
  const current = deploymentStages[state.cursor];
  const entity = deploymentStages.find(s => s.id === selected)!;
  const failure = deploymentFailures.find(f => f.id === state.scenario);

  useEffect(() => {
    if (state.status !== 'running') return;
    const timer = window.setTimeout(() => setState(advanceDeployment), reduced ? 180 : 550);
    return () => window.clearTimeout(timer);
  }, [state, reduced]);
  useEffect(() => { if (state.status === 'failed') { setSelected(deploymentStages[state.cursor].id); setLevel('infrastructure'); } }, [state.status, state.cursor]);
  useEffect(() => {
    if (request < 0 || request >= requestPath.labels.length - 1) return;
    const timer = window.setTimeout(() => setRequest(r => r + 1), reduced ? 250 : 850);
    return () => window.clearTimeout(timer);
  }, [request, reduced, requestPath.labels.length]);
  const inspect = (id: string) => { setSelected(id); trackInfoooEntityView(world.slug, id); };
  const play = (failureId = scenario) => { complete.current = false; trackInfoooWorldStart(world.slug); setRequest(-1); setRollback(false); setState(startDeployment(failureId)); };
  const status = state.status === 'failed' ? `Stopped at ${current.title}. ${failure?.lesson}` : state.status === 'live' ? 'LIVE ✓ Version 2 is serving. Follow a user request.' : state.status === 'running' ? `${current?.title || 'Preparing'} · release v2 in progress` : rollback ? 'Rolled back to version 1. The unhealthy version 2 was not promoted.' : 'Version 1 is live. Send a new commit through the pipeline.';
  const visibleLevel = level === 'simple' ? 1 : level === 'developer' ? 2 : 3;
  const stage = <InfoooStage label="Deployment pipeline" description="Code flows into Build, then Deploy, then Serve, then User. Select a stage to inspect its input, output and possible failure.">
    <div className="deployment-status" role="status" aria-live="polite" aria-atomic="true"><span className="deployment-signal" aria-hidden="true">{state.status === 'failed' ? '!' : state.status === 'live' ? '✓' : '●'}</span><p>{status}</p><span className="serving-version">Serving v{state.production}</span></div>
    <ol className="deployment-pipeline">{lanes.map((lane, laneIndex) => {
      const active = current?.lane === laneIndex;
      return <li key={lane} className={`deployment-lane${active ? ' is-current' : ''}${active && state.status === 'failed' ? ' is-failed' : ''}`}>
        <div className="lane-heading"><span>{String(laneIndex + 1).padStart(2, '0')}</span><h2>{lane}</h2><span className="pipeline-direction" aria-hidden="true">→</span></div>
        <div className="lane-stages">{deploymentStages.filter(s => s.lane === laneIndex && s.level <= visibleLevel).map(s => {
          const index = deploymentStages.indexOf(s);
          const activeStage = current?.id === s.id;
          return <button key={s.id} type="button" className="deployment-node k-button k-button--secondary" aria-pressed={selected === s.id} onClick={() => inspect(s.id)} data-state={activeStage && state.status === 'failed' ? 'failed' : index <= state.cursor ? 'reached' : 'waiting'}><span aria-hidden="true">{s.symbol}</span><span>{s.title}</span><small>{activeStage && state.status === 'failed' ? 'Stopped' : index <= state.cursor ? 'Reached' : 'Inspect'}</small></button>;
        })}</div>
        {active && state.status === 'running' && <span className="payload" aria-hidden="true">v2 · {current.title}</span>}
      </li>;
    })}</ol>
    <p className="pipeline-caption">{level === 'simple' ? 'Start with the five lanes. Reveal Developer or Infrastructure to see what connects them.' : 'This ordered walkthrough simplifies a workflow: some checks run in parallel and DNS / TLS are usually configured ahead of a release.'}</p>
  </InfoooStage>;
  const panel = <section className="deployment-inspector" aria-label="Stage inspection"><p className="deployment-eyebrow">INSPECT A STAGE</p><h2>{entity.title}</h2><dl>{[['What is this?', entity.knowledge?.whatIs], ['Why is it needed?', entity.knowledge?.whyItMatters], ['What goes in?', entity.input], ['What comes out?', entity.output], ['What can fail?', entity.failure]].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl><p className="connection-copy">{deploymentStages.indexOf(entity) > 0 ? `Receives from ${deploymentStages[deploymentStages.indexOf(entity) - 1].title}. ` : ''}{deploymentStages.indexOf(entity) < deploymentStages.length - 1 ? `Next: ${deploymentStages[deploymentStages.indexOf(entity) + 1].title}.` : 'The response returns to the browser.'}</p></section>;
  const lane = state.status === 'live' ? (request === requestPath.labels.length - 1 ? 4 : 3) : current?.lane ?? -1;
  const explanations = ['A developer changes the app.', 'The change becomes a deployable artifact.', 'The new version starts in its runtime environment.', 'Traffic can reach the healthy version.', 'A simulated user request reaches the new release.'];
  return <div className="deployment-world">
    <header className="infooo-world-header"><div><p>INFOOO · WORLD 003 · APP DEPLOYMENT JOURNEY</p><h1>How does code become a live app?</h1><span>Watch one change travel from code to a real user.</span></div></header>
    <button className="k-button k-button--primary" disabled={state.status === 'running'} onClick={() => { setCache('off'); play('none'); }}>Watch a deployment</button>
    <ol className="deployment-overview" aria-label="Code to user journey">{lanes.map((name, i) => <li key={name} aria-current={lane === i ? 'step' : undefined}><h2>{name}</h2><p>{explanations[i]}</p>{lane === i && <strong>v2 · {state.status === 'failed' ? 'Stopped' : state.status === 'live' ? lane === 4 ? 'Received' : 'Serving request' : 'Here'}</strong>}</li>)}</ol>
    <p role="status" aria-live="polite">{status}</p>
    {state.status === 'live' && request === requestPath.labels.length - 1 && <p className="deployment-aha">A commit is not production. In this model, a change must be built, deployed, checked and served before a user receives it.</p>}
    <details className="deployment-disclosure" open={deep} onToggle={e => setDeep(e.currentTarget.open)}><summary>Explore deeper</summary>
    <details className="deployment-disclosure"><summary>Inspect stages and infrastructure</summary>
    <div className="deployment-toolbar">
      <div className="deployment-actions"><button className="k-button k-button--primary" disabled={state.status === 'running'} onClick={() => play()}>Deploy App</button><button className="k-button k-button--secondary" onClick={() => { setState(initialDeployment); setRequest(-1); setRollback(false); setSelected('code'); setLevel('simple'); setScenario('none'); setGuided(false); setCache('off'); setLabReset(s => s + 1); }}>Reset</button><button className="k-button k-button--secondary" aria-pressed={guided} onClick={() => { setGuided(true); setLevel('infrastructure'); guide.restart(); trackInfoooGuideStart(world.slug, deploymentGuide.id); }}>Guide me</button></div>
      <InfoooLayerControl layers={world.layers!} activeId={level} onSelect={setLevel} />
    </div><div className="deployment-detail-layout">{stage}{panel}</div>
      {guided && <section className="deployment-guidance"><p>{(guide.step as InfoooGuideStep)?.label}: {(guide.step as InfoooGuideStep)?.description}</p><InfoooGuideControls title="Deployment journey" index={guide.index} total={guide.total} onBack={guide.back} onNext={() => { if (guide.isLast) { setGuided(false); trackInfoooGuideComplete(world.slug, deploymentGuide.id); } else guide.next(); }} onExit={() => setGuided(false)} /></section>}
      </details><details className="deployment-disclosure"><summary>What can go wrong?</summary><section className="deployment-break" aria-labelledby="deployment-break-title"><div><p className="deployment-eyebrow">BREAK → UNDERSTAND</p><h2 id="deployment-break-title">What stops the release?</h2><p>Choose a fault, then replay the scenario. These are local teaching scenarios.</p></div><label>Failure scenario<select value={scenario} disabled={state.status === 'running'} onChange={e => setScenario(e.target.value as FailureId)}><option value="none">No fault — successful release</option>{deploymentFailures.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label><button className="k-button k-button--secondary" disabled={state.status === 'running'} onClick={() => play()}>Replay selected scenario</button>{state.status === 'failed' && <p className="failure-lesson" role="note">{failure?.lesson}</p>}</section>
      </details><details className="deployment-disclosure"><summary>Follow requests and explore cache / CDN</summary><section className="deployment-request" aria-labelledby="deployment-request-title"><div className="request-heading"><div><p className="deployment-eyebrow">DEPLOYED → USED</p><h2 id="deployment-request-title">Follow one user request</h2></div><button className="k-button k-button--secondary" disabled={state.status !== 'live' || (request >= 0 && request < requestPath.labels.length - 1)} onClick={() => setRequest(0)}>Follow a User Request</button></div><label className="request-cache">CDN / cache<select value={cache} disabled={request >= 0 && request < requestPath.labels.length - 1} onChange={e => { setCache(e.target.value as CacheMode); setRequest(-1); }}><option value="off">Bypass cache — original app request</option><option value="hit">CDN hit — fresh public static asset</option><option value="miss">CDN miss — fetch from origin</option><option value="expired">TTL expired — fetch / revalidate</option></select></label><p className="pipeline-caption">CDN examples follow a cacheable public static asset. TTL is its freshness lifetime; a hit skips the origin. Do not cache private responses blindly.</p><ol>{requestPath.labels.map((label, i) => <li key={label} aria-current={request === i ? 'step' : undefined}><span>{i + 1}</span>{label}{request === i && <strong> ← Here</strong>}</li>)}</ol><p role="status" aria-live="polite">{request < 0 ? 'Complete a successful deployment first. The database is optional.' : requestPath.descriptions[request]}</p></section>
      </details><details className="deployment-disclosure"><summary>Versions and rollback</summary><section className="deployment-versions"><div><p className="deployment-eyebrow">NEW COMMIT ≠ NEW LIVE VERSION</p><h2>Version 1 → candidate 2 → verified release</h2><p>A new artifact starts as a candidate. In this model it replaces v1 only after readiness and reachability checks. Real releases may restart or roll out gradually.</p><p>An unhealthy v2 can return to the retained v1 artifact. Rollback does not automatically undo database migrations, DNS or certificate changes.</p></div><div className="version-track"><span>v1 · previous healthy release</span><span aria-hidden="true">↓ new commit + new artifact</span><span>v2 · verify before switching</span><button className="k-button k-button--secondary" disabled={state.status === 'running'} onClick={() => play('health')}>Try unhealthy v2</button><button className="k-button k-button--secondary" disabled={state.status !== 'failed' || state.scenario !== 'health'} onClick={() => { setState(initialDeployment); setRollback(true); setRequest(-1); }}>Return to Version 1</button></div></section>
      </details></details><details className="deployment-disclosure"><summary>Go deeper into production</summary><ProductionSystemsLab key={labReset} live={state.status === 'live'} production={state.production} />
      </details><InfoooSourceDisclosure knowledge={world.knowledge} />

  </div>;
}
