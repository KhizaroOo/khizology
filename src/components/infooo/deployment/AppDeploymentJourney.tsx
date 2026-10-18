import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { InfoooWorld } from '../../../data/infooo';
import { InfoooDepthControl, InfoooSourceDisclosure, InfoooTermNotes, useInfoooPlayback } from '../InfoooWorldFoundation';
import { trackInfoooWorldStart, trackInfoooGuideComplete } from '../../../utils/analytics';
import '../visual-story.css';
import './deployment.css';

const stages = ['Code', 'Build', 'Deploy', 'Serve', 'User'];
const copy = [
  ['Someone changes the app.', 'The code is turned into something that can run.', 'The new version is placed on a server. The old one is still live.', 'The system starts sending users to the ready version.', 'The user receives the updated app.'],
  ['A commit records the changed source files.', 'Dependencies, build and tests produce artifact v2 in this example.', 'The artifact starts with its runtime settings. v1 still handles requests.', 'A readiness check passes before the router switches traffic to v2.', 'A browser request receives a response from v2.'],
  ['A source commit identifies the candidate; it is not a live release.', 'A repeatable build produces a versioned artifact. Failed builds must not be promoted.', 'v2 starts alongside v1 here. Readiness is a gate, not proof of total correctness.', 'Only a ready candidate receives traffic. Keeping v1 available makes application rollback possible.', 'The response comes from v2 here. A CDN may serve cached content without reaching this origin.'],
];
const takeaway = ['Writing code does not make it live. It must travel through a release process before a user gets it.', 'A new release becomes live only after it is built, deployed, checked and served.', 'A safe release keeps the old version available until the new version is ready to receive traffic.'];
const labels = [['Someone’s code', 'Build machine', 'Server', 'Send traffic', 'Your browser'], ['Source · commit', 'Build · tests · artifact', 'Runtime · environment', 'Health check · router', 'Request → response'], ['Versioned source', 'Build gate', 'Readiness gate', 'Traffic switch', 'Origin / cache']];
const meanings = [
  [['Source', 'The editable files that describe the app.'], ['Commit', 'A recorded change to those files.']],
  [['Dependencies', 'Other packages the app needs.'], ['Tests', 'Checks for selected expected behaviors.'], ['Artifact', 'The built package that gets deployed.']],
  [['Environment', 'Settings the running app needs.'], ['Runtime', 'The place where the app actually runs.']],
  [['Health check', 'A check that the version is ready for traffic.'], ['Routing', 'Choosing which version receives a request.']],
  [['Request', 'The browser asks for something.'], ['Response', 'The server sends its answer.']],
] as const;
const advancedMeanings = [
  [['DNS', 'Maps a site name to its network address; setup may be separate.'], ['TLS', 'Secures the connection; certificates may be managed outside this release.']],
  [['Build failure', 'A candidate that cannot build must not be deployed.'], ['Artifact', 'One versioned package moves through the release.']],
  [['Previous healthy version', 'Keep the working release available while the candidate starts.'], ['Database migration', 'A database change may need its own recovery plan.']],
  [['Load balancer', 'A router that distributes requests among ready servers.'], ['Traffic switch', 'Start sending requests to the ready release.']],
  [['CDN', 'A network that can serve content near the user.'], ['Cache', 'A stored response reused when cache rules allow it.']],
] as const;
const routes = ['M120 72 H360', 'M360 72 H600', 'M600 72 H840', 'M840 72 H1080'];
const mobileRoutes = ['M50 54 H32 V174 H50', 'M50 174 H32 V294 H50', 'M50 294 H32 V414 H50', 'M50 414 H32 V534 H50'];

export default function AppDeploymentJourney({ world }: { world: InfoooWorld }) {
  const [depth, setDepth] = useState(0);
  const [scenario, setScenario] = useState('normal');
  const sequence = scenario === 'build' ? [0, 1, 1, 2, 3, 4] : scenario === 'health' || scenario === 'database' ? [0, 1, 2, 3, 2, 3, 4] : scenario === 'rollback' ? [0, 1, 2, 3, 4, 3, 4] : scenario === 'canary' ? [0, 1, 2, 3, 4, 3, 4] : [0, 1, 2, 3, 4];
  const story = useInfoooPlayback(sequence.length - 1, [4500, 5500, 6500][depth]);
  const completed = useRef(false);
    const step = story.step, active = sequence[Math.max(0, step)];
  const failed = scenario === 'build' && step === 1 || (scenario === 'health' || scenario === 'database') && step === 3;
  const rolledBack = scenario === 'rollback' && step >= 5;
  const recovered = scenario === 'build' && step >= 2 || (scenario === 'health' || scenario === 'database') && step >= 4;
  const canary = scenario === 'canary' && step >= 3 && step < 5;
  const ready = active >= 3 && !failed && !rolledBack && !(scenario === 'database' && step === 4);
  useEffect(() => {
    if (step === 0) { completed.current = false; trackInfoooWorldStart(world.slug); }
    if (story.done && !failed && !completed.current) { completed.current = true; trackInfoooGuideComplete(world.slug, 'deployment-to-user'); }
  }, [step, world.slug]);
  function changeDepth(value: number) { story.pause(); setDepth(value); }
  function choose(value: string) { story.reset(); setScenario(value); }
  const state = (index: number) => failed && index === active ? 'failed' : step >= 0 && active === index ? 'active' : active > index ? 'complete' : 'upcoming';
  let explain = step < 0 ? 'v1 is live. Follow the new version, v2.' : copy[depth][active];
  if (failed) explain = scenario === 'build' ? 'A dependency cannot compile → no artifact → v1 keeps serving.' : scenario === 'database' ? 'v2 expects a missing database column → readiness fails → traffic stays on v1.' : 'v2 cannot answer its readiness probe → route closed → v1 keeps serving.';
  if (recovered && active < 3) explain = scenario === 'build' ? 'Fix the dependency and rebuild → artifact v2 is ready to deploy.' : scenario === 'database' ? 'Apply a backward-compatible migration → old and new code can both read the data → retry readiness.' : 'Repair the runtime setting → restart v2 → check readiness again.';
  if (scenario === 'rollback' && step === 4) explain = 'v2 passed readiness, but real requests now show errors → stop expanding traffic → restore retained v1 next.';
  if (rolledBack) explain = active === 3 ? 'Errors rise after release → route traffic back to retained v1. App rollback does not reverse database writes.' : 'The next request receives v1 again. Investigate v2 before attempting another release.';
  if (canary) explain = active === 3 ? 'Route 10% of requests to ready v2; 90% still reach v1. Observe the small group first.' : 'The canary group receives v2. Healthy observations allow the next traffic increase; they do not prove every request is safe.';
  if (scenario === 'canary' && step >= 5) explain = active === 3 ? 'The example observations stay healthy → expand v2 traffic from 10% to 100%.' : 'All new requests now reach v2. Keep watching errors and latency.';
  const why = ['A commit identifies exactly which change is being released.', 'Building and testing stop unusable packages before deployment.', 'Starting beside v1 lets the candidate prove readiness without replacing live traffic.', 'Readiness gates protect the traffic switch; skipping them can send users to a broken version.', 'A browser response is the visible outcome, not proof that every path works.'][active];
  const terms = step < 0 || depth === 0 ? [] : rolledBack ? [['Rollback', 'Return traffic to a previous healthy application version.'], ['Database migration', 'A schema/data change needs its own recovery plan.']] as const : scenario === 'database' && active >= 2 ? [['Database migration', 'Change the database structure or data.'], ['Backward compatible', 'Old and new app versions can use the same database safely.']] as const : canary ? [['Canary', 'Send a small share of traffic to a candidate first.'], ['Load balancer', 'Distributes requests among ready versions.']] as const : depth === 2 ? advancedMeanings[active] : meanings[active];
  const cases = [['normal', 'Normal release'], ['build', 'Build fails'], ['health', 'Health check fails'], ['rollback', 'Rollback after release'], ['canary', 'Canary release'], ['database', 'Database change problem']];
  return <div className="visual-world deployment-world" style={{ '--infooo-accent': world.accent } as CSSProperties}>
    <header><h1>How does code become a live app?</h1><p>Watch one release travel from a developer to your browser.</p></header>
    <section className="scene-card" aria-label="Release visual and playback">
    <div className="scene-topbar"><InfoooDepthControl depth={depth} onChange={changeDepth}/>
    {depth === 2 && <label className="scene-case">Case<select value={scenario} onChange={event => choose(event.target.value)}>{cases.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}</div>
    <div className="release-scene" role="img" aria-label={`Code, build, server, traffic and browser share one release path. ${explain}`} data-step={step} data-running={story.running || story.done} data-failed={failed}>
      {['wide', 'tall'].map(orientation => <svg key={orientation} className={`scene-wires wire-${orientation}`} viewBox={orientation === 'wide' ? '0 0 1200 400' : '0 0 400 600'} preserveAspectRatio="none" aria-hidden="true"><defs><marker id={`release-arrow-${orientation}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="context-stroke" stroke="none"/></marker></defs>{(orientation === 'wide' ? routes : mobileRoutes).map((d, i) => <path key={d} className="scene-link" d={d} data-state={failed && i === active ? 'failed' : active > i ? 'complete' : active === i ? 'active' : 'upcoming'} markerEnd={`url(#release-arrow-${orientation})`}/>)}<path className="live-route" data-version={ready ? '2' : '1'} d={orientation === 'wide' ? 'M600 300 V350 H1080 V300 M840 350 V300' : 'M350 294 H380 V534 H350 M380 414 H350'} markerEnd={`url(#release-arrow-${orientation})`}/></svg>)}
      <span className="live-version">{canary ? 'v1 90% · v2 10%' : `● v${ready ? '2' : '1'} live`}</span>
      <div className="release-stop code-stop" data-current-object={step >= 0 && active === 0} data-state={state(0)}>
        <svg viewBox="0 0 100 90" aria-hidden="true"><circle cx="26" cy="15" r="9"/><path d="M10 49 V37 Q26 23 40 37 V49 M15 81 H92"/><rect x="35" y="34" width="56" height="41" rx="4"/><path d="M49 47 L42 54 L49 61 M75 47 L82 54 L75 61 M66 45 L59 63"/></svg>
        <strong>Code</strong><span>{labels[depth][0]}</span>
      </div>
      <div className="release-stop build-stop" data-current-object={step >= 0 && active === 1} data-state={state(1)}>
        <svg viewBox="0 0 100 90" aria-hidden="true"><path d="M7 28 H28 L37 18 H63 L72 28 H93 V76 H7Z M7 64 H93 M18 76 V86 M82 76 V86"/><g className={step === 1 && !failed ? 'build-gear' : ''}><circle cx="50" cy="45" r="16"/><path d="M50 23 V31 M50 59 V67 M28 45 H36 M64 45 H72 M34 29 L40 35 M60 55 L66 61 M34 61 L40 55 M60 35 L66 29"/></g><text x="50" y="51" textAnchor="middle" className="machine-label">{failed && scenario === 'build' ? '×' : active > 1 || recovered ? '✓' : 'v2'}</text></svg>
        <strong>Build</strong><span>{failed && scenario === 'build' ? '× Dependency error' : labels[depth][1]}</span>
      </div>
      <div className="release-stop runtime-stop" data-current-object={step >= 0 && active === 2} data-state={state(2)}>
        <svg viewBox="0 0 100 90" aria-hidden="true"><rect x="10" y="8" width="80" height="76" rx="8"/><path d="M10 43 H90 M24 24 H40 M24 61 H40"/><text x="64" y="31" textAnchor="middle">v1</text><text x="64" y="69" textAnchor="middle">{active >= 2 ? 'v2' : '—'}</text><circle cx="23" cy="34" r="3" className="signal-ready"/><circle cx="23" cy="72" r="3" className={ready || rolledBack ? 'signal-ready' : ''}/></svg>
        <strong>Deploy</strong><span>{rolledBack ? 'v1 serving · v2 retained' : active >= 2 ? ready ? 'v2 ready ✓ · v1 kept' : recovered && scenario === 'database' ? '✓ Compatible schema' : 'v2 starting · v1 live' : labels[depth][2]}</span>
      </div>
      <div className="release-stop serve-stop" data-current-object={step >= 0 && active === 3} data-state={state(3)}>
        <svg viewBox="0 0 100 90" aria-hidden="true"><path d="M5 45 H34 M66 45 H95 M80 30 L95 45 L80 60 M50 7 V20 M50 70 V85"/><rect x="34" y="18" width="32" height="54" rx="10"/><circle cx="50" cy="33" r="6" className={failed && scenario !== 'build' ? 'signal-fail' : ''}/><circle cx="50" cy="56" r="6" className={ready || rolledBack ? 'signal-ready' : ''}/>{failed && scenario !== 'build' && <path className="failure-cross" d="M43 26 L57 40 M57 26 L43 40"/>}</svg>
        <strong>Serve</strong><span>{failed && scenario !== 'build' ? scenario === 'database' ? '× Missing DB column' : '× v2 closed · v1 live' : rolledBack ? 'v1 route restored' : canary ? 'v1 90% / v2 10%' : ready ? '✓ v2 route open' : labels[depth][3]}</span>
      </div>
      <div className="release-stop user-stop" data-current-object={step >= 0 && active === 4} data-state={scenario === 'rollback' && step === 4 ? 'failed' : state(4)}>
        <svg viewBox="0 0 100 90" aria-hidden="true"><rect x="4" y="10" width="92" height="68" rx="7"/><path d="M4 27 H96 M14 19 H17 M24 19 H27 M34 19 H37"/><text x="50" y="60" textAnchor="middle">{scenario === 'rollback' && step === 4 ? 'v2 !' : active === 4 && !rolledBack && !failed ? 'v2' : 'v1'}</text></svg>
        <strong>User</strong><span>{scenario === 'rollback' && step === 4 ? '✕ Errors after release' : rolledBack ? 'v1 received again' : active === 4 && !rolledBack && !failed ? 'Updated app received' : labels[depth][4]}</span>
      </div>
            <div key={step} className="release-artifact" data-place={active} data-visible={step >= 0} data-failed={failed} aria-hidden="true">{failed ? '× v2' : step === 0 ? '</>' : rolledBack ? 'v1' : '▣ v2'}</div>
    </div>
    <div className="scene-learning"><div className="scene-caption" role="status" aria-live="polite" aria-atomic="true"><strong>{failed ? `${stages[active]} · stopped` : rolledBack && step === 5 ? 'Rollback' : step < 0 ? 'v1 is live' : stages[active]}</strong><p>{explain}</p>{step >= 0 && <p className="scene-why">{why}</p>}<InfoooTermNotes terms={terms}/></div>
    <ul className="scene-evidence" aria-label="Release evidence">{[['Artifact', step >= 2], ['Runtime', step >= (scenario === 'build' ? 3 : 2)], ['Health', step >= (scenario === 'build' ? 4 : ['health', 'database'].includes(scenario) ? 5 : 3)], ['Traffic', step >= (scenario === 'build' ? 5 : ['health', 'database'].includes(scenario) ? 6 : 4)]].map(([label, ok]) => <li key={String(label)} data-ready={Boolean(ok)}>{ok ? '✓' : '○'} {label}</li>)}</ul>
    <div className="scene-controls"><button type="button" className="k-button k-button--primary" onClick={story.toggle}>{story.label}</button>{step >= 0 && !story.done && story.label !== 'Step' && <button type="button" className="k-button k-button--ghost" onClick={story.advance}>Step</button>}{story.done && <button type="button" className="scene-replay-moment" onClick={() => story.replayFrom(scenario === 'build' ? 1 : 3)}>Replay key moment</button>}</div>
    </div></section>
    {story.done && <p className="scene-takeaway">{failed ? 'The old version stays live when the new release cannot pass its gate.' : takeaway[depth]}</p>}
    <InfoooSourceDisclosure plain knowledge={world.knowledge}/>
  </div>;
}
