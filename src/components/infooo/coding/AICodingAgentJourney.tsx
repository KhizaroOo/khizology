import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { InfoooWorld } from '../../../data/infooo';
import { InfoooDepthControl, InfoooSourceDisclosure, InfoooTermNotes, useInfoooPlayback, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import { trackInfoooWorldStart, trackInfoooGuideComplete } from '../../../utils/analytics';
import '../visual-story.css';
import './coding.css';

const titles = ['Task', 'Look', 'Change', 'Check', 'Evidence', 'Look again', 'Repair', 'Check again', 'Verified', 'Human boundary', 'Report'];
const copy = [
 ['You ask for a change: add dark mode.', 'The agent looks at the right parts of the project.', 'It adds a button for dark mode.', 'It checks the change on a small screen.', 'A problem is found: the button is too wide.', 'The problem goes back to the agent.', 'It makes the button fit the screen.', 'It checks the repaired change again.', 'The check passes.', 'The change still needs a person to review it.', 'It tells you what changed and what was checked.'],
 ['The request becomes a clear task: add a dark-mode toggle.', 'Project instructions, the page and shared styles provide context.', 'A focused diff adds the theme button.', 'The example runs tests, a build and desktop/mobile checks.', 'Tests and build pass, but the mobile check finds overflow.', 'The failed mobile check directs the agent back to relevant context.', 'A max-width rule keeps the button inside its container.', 'The same checks run against the repaired diff.', 'The shown checks pass. That is evidence, not proof of every possible behavior.', 'The agent can prepare a change without permission to publish it.', 'The report separates the change, evidence and remaining boundaries.'],
 ['Requirements define the scope; production access is not implied.', 'Only relevant instructions and consumers are selected. Unrelated files stay untouched.', 'The focused patch reuses existing styles and limits the scope.', 'Tests, build and UI checks are different verification gates.', 'Tests and build are green, but Mobile is red. Passing tests alone is not task completion.', 'Observed failure returns to the agent, not to a success report.', 'A targeted CSS fix addresses the observed overflow; unrelated code stays unchanged.', 'The repaired change goes through the same evidence gates again.', 'The curated gates pass; a diff review still checks scope and unintended changes.', 'Human approval is a separate boundary from technical verification.', 'Report only observed evidence and blockers. Never invent approval or production success.'],
];
const takeaways = ['A coding agent should look, change, check, fix and explain.', 'A good agent uses project context and verification evidence before reporting success.', 'Reliable agent work is a controlled loop of context, action, evidence, repair and human boundaries.'];
const wide = ['M312 96 H480', 'M720 96 H888', 'M1128 96 H1140 Q1164 96 1164 120 V272 Q1164 296 1140 296 H1128', 'M888 296 H720', 'M480 296 H312'];
const tall = ['M200 88 V98', 'M200 190 V200', 'M200 292 V302', 'M200 394 V404', 'M200 496 V506'];
const meanings = [
  [['Requirements', 'What the requested change must do.'], ['Scope', 'The parts this task is allowed to change.']],
  [['Project instructions', 'Rules for working in this project.'], ['Relevant file', 'A file directly connected to the task.']],
  [['Diff', 'The exact lines that changed.'], ['Focused diff', 'Change only what the task needs.']],
  [['Tests', 'Do the checked behaviors still work?'], ['Build', 'Can the project compile and bundle successfully?']],
  [['Desktop UI', 'Does it look right on a large screen?'], ['Mobile UI', 'Does it work on a small screen?']],
  [['Consumer', 'A file or component that uses what is being changed.'], ['Context selection', 'Read the relevant files and evidence, not every file.']],
  [['Targeted fix', 'Repair the observed problem without unrelated edits.']],
  [['Verification gates', 'Separate checks that must pass before we trust the result.']],
  [['Diff review', 'Inspect the final change for mistakes and unwanted scope.']],
  [['Permission', 'Being able to prepare a change does not allow publishing it.'], ['Human approval', 'A person must allow this action before it can continue.']],
  [['Evidence', 'What actually happened during verification.'], ['Blocker', 'Something that prevents safe completion.']],
] as const;
const simpleChecks = [['Tests', 'Does the checked behavior still work?'], ['Build', 'Can the project still be created successfully?'], ['Desktop', 'Does it look right on a large screen?'], ['Mobile', 'Does it still work on a small screen?']] as const;
export default function AICodingAgentJourney({ world }: { world: InfoooWorld }) {
  const [depth, setDepth] = useState(0);
  const reduced = useInfoooReducedMotion();
  const [scenario, setScenario] = useState('check');
  const [approved, setApproved] = useState(false);
  const approval = scenario === 'approval';
  const story = useInfoooPlayback(10, [2000, 5500, 6500][depth], approval && !approved ? 9 : undefined);
  const completed = useRef(false);
    const step = story.step;
  const normal = scenario === 'normal';
  const failure = !normal && !approval;
  const failed = failure && step >= 4 && step < 7;
  const contextCase = ['wrong', 'context', 'scope'].includes(scenario);
  const contextBlocked = contextCase && step >= 1 && step < 6;
  const repaired = failure && step >= 6;
  const passed = step >= 8;
  useEffect(() => {
    if (step === 0) { completed.current = false; trackInfoooWorldStart(world.slug); }
    if (story.done && !completed.current) { completed.current = true; trackInfoooGuideComplete(world.slug, 'coding-feature'); }
  }, [step, world.slug]);
  function changeDepth(value: number) { story.pause(); setDepth(value); }
  function choose(value: string) { story.reset(); setScenario(value); setApproved(false); }
  function play() { if(reduced && depth === 0 && step < 0 && !approval){trackInfoooWorldStart(world.slug);story.replayFrom(10);return;} if (story.done || step < 0) setApproved(false); story.toggle(); }
  let explain = step < 0 ? 'One request. Follow the work, including the checks.' : copy[depth][step];
  if (!failure && step >= 4 && step <= 7) explain = ['The first tests pass; the screen checks still need review.', 'The agent returns to context to review the scope.', 'The diff review confirms the intended change only.', 'UI checks confirm the example still fits desktop and mobile.'][step - 4];
  if (approval && step >= 9) explain = approved ? 'Simulated human approval opens this example barrier. No real publish happens.' : 'The agent can prepare the change, but publishing needs permission. This example waits for simulated human approval.';
  if (contextCase && step >= 1 && step <= 7) {
    const lessons: Record<string, string[]> = {
      wrong: ['billing.ts is unrelated → reject this file before editing.', 'No diff: the selected file does not own the theme.', 'Trace the theme consumer before allowing an edit.', 'Relevance check fails → no patch is accepted.', 'Return to project context and find the theme owner.', 'Select theme.css → make only the requested theme change.', 'Recheck the corrected file and its UI consumers.'],
      context: ['Theme styles alone omit the mobile consumer.', 'No accepted diff: the relevant mobile constraint is missing.', 'Context gate blocks the edit until the consumer is read.', 'Missing context → unsafe assumption → stop the patch.', 'Read the mobile consumer and its size constraint.', 'Use the recovered context → make a responsive patch.', 'Verify the same desktop and mobile consumers.'],
      scope: ['Requirements permit dark mode only.', 'A billing rewrite is outside scope → reject the extra diff.', 'Review the diff against the original requirement.', 'Scope gate fails → unrelated edits cannot proceed.', 'Return to the requirement and remove the billing edit.', 'Keep only the theme diff; billing.ts stays unchanged.', 'Recheck the smaller patch and its consumers.'],
    };
    explain = lessons[scenario][step - 1];
  }
  const why = step === 1 ? 'Selecting context prevents edits based on the wrong assumptions.' : step === 4 ? 'Skipping this gate could turn an unsupported claim into a success report.' : step === 6 ? 'A smaller repair limits the chance of unrelated damage.' : step === 9 ? 'Passing checks does not grant permission to publish.' : '';
  const cases = [['normal', 'Normal change'], ['check', 'Check fails → repair'], ['approval', 'Human approval needed'], ['wrong', 'Wrong file selected'], ['context', 'Missing context'], ['scope', 'Scope creep detected']];
  const terms = step < 0 ? [] : depth === 0 ? step === 3 ? simpleChecks.slice(0, 2) : step === 4 || step === 7 ? simpleChecks.slice(2) : [] : meanings[step];
  const currentTitle = contextCase && step >= 1 && step < 6 ? 'Context / scope gate' : depth === 2 && step === 8 ? 'Checks passed · diff review' : !failure && step === 4 ? 'Tests passed' : !failure && step === 6 ? 'Diff review' : step === 4 ? 'Check · FAIL' : step < 0 ? 'Add dark mode' : titles[step];
  const routeState = (index: number) => step < 0 ? 'upcoming' : index < 2 ? step > index ? 'complete' : 'active' : index === 2 ? step >= 3 ? 'complete' : 'upcoming' : index === 3 ? failed ? 'failed' : passed ? 'complete' : step >= 3 ? 'active' : 'upcoming' : approval && !approved && step >= 9 ? 'failed' : story.done ? 'complete' : 'upcoming';
  return <div className="visual-world coding-world" data-depth={depth} style={{ '--infooo-accent': world.accent } as CSSProperties}>
    <header><h1>How does an AI coding agent work?</h1><p>Watch “Add dark mode” become a change with evidence.</p></header>
    <p className="scene-entry-takeaway">The agent must inspect, change and verify before claiming success.</p>
    <section className="scene-card" aria-label="Agent visual and playback">

    <div className="agent-scene" role="img" aria-label={`Task, agent, files, diff, checks and report form one workspace. ${explain}`} data-step={step} data-running={story.running || story.done}>
      {['wide', 'tall'].map(orientation => <svg key={orientation} className={`scene-wires wire-${orientation}`} viewBox={orientation === 'wide' ? '0 0 1200 400' : '0 0 400 600'} preserveAspectRatio="none" aria-hidden="true"><defs><marker id={`agent-arrow-${orientation}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="context-stroke" stroke="none"/></marker></defs>{(orientation === 'wide' ? wide : tall).map((d, index) => <path key={d} className="scene-link" d={approval && index === 4 ? '' : d} data-state={routeState(index)} markerEnd={`url(#agent-arrow-${orientation})`}/>)}<path className="repair-route" data-state={step === 5 ? 'active' : step > 5 ? 'complete' : 'upcoming'} d={orientation === 'wide' ? 'M600 220 V174' : 'M36 450 H28 Q12 450 12 434 V160 Q12 144 28 144 H36'} markerEnd={`url(#agent-arrow-${orientation})`}/><path className="repair-route" data-state={step === 6 ? 'active' : step > 6 ? 'complete' : 'upcoming'} d={orientation === 'wide' ? 'M640 174 V184 Q640 200 660 200 H864 Q888 200 888 224 V276' : 'M364 144 H372 Q388 144 388 160 V332 Q388 348 372 348 H364'} markerEnd={`url(#agent-arrow-${orientation})`}/></svg>)}
      <div className="workspace-object request-object" data-state={step < 0 ? 'active' : 'complete'}><svg className="user-avatar" viewBox="0 0 70 50" aria-hidden="true"><circle cx="35" cy="12" r="9"/><path d="M15 45 V35 Q35 16 55 35 V45Z"/></svg><div className="request-bubble">Add dark mode<span>↗</span></div><strong>Task</strong>{depth > 0 && <small>Request · requirements</small>}</div>
      <div className="workspace-object agent-object" data-current-object={step === 0 || step === 5} data-state={step === 0 || step === 5 ? 'active' : step > 0 ? 'complete' : 'upcoming'}>
        <svg viewBox="0 0 100 80" aria-hidden="true"><path d="M50 5 V17 M18 40 H8 V60 H18 M82 40 H92 V60 H82"/><rect x="18" y="17" width="64" height="58" rx="18"/><circle cx="36" cy="42" r="5"/><circle cx="64" cy="42" r="5"/><path d="M36 59 Q50 66 64 59"/></svg><strong>Agent</strong>{depth > 0 && <small>{depth === 2 ? 'Tools act within scope' : 'Read → edit → check'}</small>}
      </div>
      <div className="workspace-object files-object" data-current-object={step === 1} data-state={contextBlocked ? 'failed' : step === 1 ? 'active' : step > 1 ? 'complete' : 'upcoming'}><div className="repo-files"><span className={step >= 1 ? 'file-found' : ''}>{step >= 1 && !(scenario === 'context' && contextBlocked) ? '✓ ' : ''}{scenario === 'context' && contextBlocked ? '○ Mobile consumer missing' : depth ? 'AGENTS.md' : 'Project rules'}</span><span className={step >= 1 ? 'file-found' : ''}>{contextBlocked && scenario === 'wrong' ? '✕ ' : step >= 1 ? '✓ ' : ''}{contextBlocked && scenario === 'wrong' ? 'billing.ts · wrong file' : depth ? 'theme.css' : 'Theme styles'}</span>{depth === 2 && <span className="unrelated-file">{scenario === 'scope' && contextBlocked ? '✕ billing edit rejected' : 'billing.ts · untouched'}</span>}</div><strong>Look</strong>{depth > 0 && <small>Find files connected to this change.</small>}</div>
      <div className="workspace-object diff-object" data-current-object={step === 2 || step === 6} data-state={step === 2 || step === 6 ? 'active' : step > 2 ? 'complete' : 'upcoming'}><div className="tiny-diff" data-blocked={contextBlocked}><svg viewBox="0 0 140 65" aria-hidden="true"><rect x="28" y="3" width="75" height="55" rx="5"/><path d="M28 14 H103"/><rect className="theme-toggle-preview" x="35" y="25" width={repaired || normal || approval ? '58' : '99'} height="20" rx="5"/><text x="63" y="39" textAnchor="middle">☾</text></svg>{depth > 0 ? <div className="diff-lines"><small>BEFORE</small><del>{!repaired && failure ? '− no theme toggle' : '− width: 420px;'}</del><small>{contextBlocked ? 'PATCH BLOCKED' : 'AFTER'}</small>{step >= 2 && !contextBlocked && <ins>{repaired || normal || approval ? '+ width: 100%;' : '+ width: 420px;'}</ins>}{!contextBlocked && (repaired || normal || approval) && <ins>+ max-width: 420px;</ins>}</div> : <span>{step < 2 ? 'Theme button' : repaired || normal || approval ? 'Fits the screen' : 'Too wide on mobile'}</span>}</div><strong>{step === 6 && failure ? 'Fix' : 'Change'}</strong>{depth > 0 && <small>Focused diff</small>}</div>
      <div className="workspace-object checks-object" data-current-object={step >= 3 && step <= 4 || step >= 7 && step <= 8} data-state={failed ? 'failed' : step === 3 || step === 7 || step === 8 ? 'active' : passed ? 'complete' : 'upcoming'}><div className="test-evidence" data-result={failed ? 'fail' : passed || !failure && step >= 4 ? 'pass' : 'waiting'}><div className="check-gates">{(contextCase && !passed ? ['Context', 'Scope', 'Tests', 'UI'] : ['Tests', 'Build', 'Desktop', 'Mobile']).map(label => { const result = contextCase && !passed ? label === (scenario === 'scope' ? 'Scope' : 'Context') ? failed || contextBlocked ? 'fail' : step >= 6 ? 'pass' : 'waiting' : 'waiting' : step < 4 || label === 'Mobile' && !failed && !passed ? 'waiting' : label === 'Mobile' && failed ? 'fail' : 'pass'; return <span key={label} data-result={result}><b>{result === 'fail' ? '✕ FAIL' : result === 'pass' ? '✓ PASS' : '○'}</b> {label}</span>; })}</div>{failed && <b className="task-incomplete">Task not complete</b>}</div><strong>Check</strong><span className="scene-mobile-summary">{failed?'✕ Mobile check failed':passed?'✓ Shown checks pass':'Check the result, not just the code'}</span></div>
      <div className="workspace-object report-object" data-current-object={story.done} data-state={story.done ? 'active' : 'upcoming'}><div className="report-sheet" data-ready={story.done}><dl><dt>CHANGED</dt><dd>{contextBlocked ? 'Patch blocked' : step >= 2 ? 'Theme layout' : '—'}</dd><dt>VERIFIED</dt><dd>{passed ? '✓ Tests · Build' : 'Awaiting evidence'}{passed && <><br/>✓ Desktop · Mobile</>}</dd><dt>BLOCKERS</dt><dd>{approval && !approved ? 'Human approval needed' : contextBlocked ? 'Context / scope blocked' : failed ? contextCase ? 'Context / scope failed' : 'Mobile check failed' : passed ? 'None in this example' : 'Checks incomplete'}</dd></dl></div><strong>Report</strong><span className="scene-mobile-summary">{story.done?'Changed + evidence + boundaries':'Report waits for evidence'}</span></div>
      {approval && <span className="approval-barrier" data-current-object={step === 9} data-blocked={!approved && step >= 9} data-open={approved}><small>PUBLISH</small>{approved ? '✓ Simulated approval' : '⛔ Human approval'}</span>}
    </div>
    <div className="scene-learning"><div className="scene-caption" role="status" aria-live="polite" aria-atomic="true"><strong>{currentTitle}</strong><p>{explain}</p>{why && <p className="scene-why">{why}</p>}<InfoooTermNotes terms={terms}/></div>
    <ul className="scene-evidence" aria-label="Agent evidence">{[['Context', step >= 1 && !contextBlocked], ['Diff', step >= 2 && !contextBlocked], ['Tests', contextCase ? passed : step >= 4], ['Build', contextCase ? passed : step >= 4], ['UI', passed]].map(([label, ok]) => <li key={String(label)} data-ready={Boolean(ok)}>{ok ? '✓' : '○'} {label}</li>)}</ul>
    <div className="scene-controls"><button type="button" className="k-button k-button--primary" disabled={story.held} onClick={play}>{step < 0 ? 'Watch the agent work' : story.label}</button>{step >= 0 && !story.done && !story.held && story.label !== 'Step' && <button type="button" className="k-button k-button--ghost" onClick={story.advance}>Step</button>}{story.held && <button type="button" className="k-button k-button--secondary" onClick={() => { story.pause(); setApproved(true); }}>Simulate human approval</button>}{story.done && <button type="button" className="scene-replay-moment" onClick={() => story.replayFrom(4)}>Replay key moment</button>}</div>
    </div></section>
    {step>=0&&<dl className="scene-entry-result" aria-label="Agent lesson"><div><dt>What happened</dt><dd>{story.done&&failure?'A mobile check found overflow; a focused repair passed the recheck.':explain}</dd></div><div><dt>Why</dt><dd>Looking at the actual result can catch what a passing build misses.</dd></div><div><dt>Next</dt><dd>Verify the change and report evidence before asking to publish.</dd></div></dl>}
    {story.done && <p className="scene-takeaway">{takeaways[depth]}</p>}
    <details className="scene-explore"><summary>Explore more — depth & scenarios</summary><div className="scene-topbar"><InfoooDepthControl depth={depth} onChange={changeDepth}/>
    {depth === 2 && <label className="scene-case">Case<select value={scenario} onChange={event => choose(event.target.value)}>{cases.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}</div></details>
    <InfoooSourceDisclosure plain knowledge={world.knowledge}/>
  </div>;
}
