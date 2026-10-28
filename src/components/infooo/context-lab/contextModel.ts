export const task = 'Update the checkout button without breaking the shared design system.';
export const sourceNames = { task: 'Task', instructions: 'Project instructions', files: 'Selected files', retrieval: 'Retrieval', memory: 'Memory', outputs: 'Tool outputs', state: 'Current state', tools: 'Tool definitions' } as const;
export type Source = keyof typeof sourceNames;
export type Selection = 'current' | 'excluded' | 'stale' | 'noisy';
export const choices: Record<Source, Selection[]> = { task:['current','excluded'],instructions:['current','excluded','stale'],files:['current','excluded','stale','noisy'],retrieval:['excluded','current','stale'],memory:['excluded','current','stale'],outputs:['current','excluded','stale','noisy'],state:['excluded','current','stale'],tools:['current','excluded','noisy'] };
export interface Context { sources: Record<Source,Selection>; history: number; preferCurrent: boolean; transfer: 'none'|'compact'|'lossy'|'structured'|'vague'; drift: boolean; goalPinned: boolean; }
export interface Item { id:string; source:Source|'handoff'|'history'; label:string; evidence:string; origin:string; freshness:'CURRENT'|'STALE'; authority:string; relevant:boolean; count:number; size:number; active:boolean; }
export const focused = (): Context => ({ sources:{task:'current',instructions:'current',files:'current',retrieval:'excluded',memory:'excluded',outputs:'current',state:'excluded',tools:'current'},history:0,preferCurrent:true,transfer:'none',drift:false,goalPinned:true });
export const everything = (): Context => ({ ...focused(),sources:{...focused().sources,files:'noisy',memory:'stale',retrieval:'stale',tools:'noisy'},history:20,preferCurrent:false });
export const poor = (): Context => ({ ...everything(),sources:{...everything().sources,instructions:'excluded',files:'stale',outputs:'stale'} });
export const scenarios = [
  {id:'instruction',label:'Missing instruction',lesson:'The task may look fixed while a checkout-only workaround bypasses the shared system.',fix:'Add project rule'},
  {id:'file',label:'Stale file',lesson:'The agent sees SharedButton v1; the actual fictional repository uses v2.',fix:'Refresh file'},
  {id:'memory',label:'Stale memory',lesson:'A historical note points to ButtonLegacy while current repository evidence points to SharedButton.',fix:'Remove stale memory'},
  {id:'retrieval',label:'Retrieval miss',lesson:'An old migration note enters context instead of the current component guide.',fix:'Retrieve current source'},
  {id:'flood',label:'Tool output flood',lesson:'A missing import is buried near line 9,821 of the fictional test output.',fix:'Prune noise'},
  {id:'handoff',label:'Bad handoff',lesson:'A vague next-session note loses the public-API constraint in this deliberately lossy simulation.',fix:'Structured handoff'},
] as const;
export type Scenario = typeof scenarios[number]['id'];
export function scenarioContext(id:Scenario):Context {
  const c=focused();
  if(id==='instruction')c.sources.instructions='excluded';
  if(id==='file')c.sources.files='stale';
  if(id==='memory'){c.sources.memory='stale';c.preferCurrent=false;}
  if(id==='retrieval'){c.sources.retrieval='stale';c.preferCurrent=false;}
  if(id==='flood')c.sources.outputs='noisy';
  if(id==='handoff')c.transfer='vague';
  return c;
}
export const workflowState = {
  goal:task,completed:'inspection-018: checkout consumer and shared component inspected',current:'SharedButton v2; existing test run reports a missing import',decisions:'Use the shared variant; do not add checkout-only CSS',blockers:'Import diagnostic: test-run-018:L9821',next:'Edit the shared checkout variant and fix the missing import',constraints:'Preserve the public Button API and unrelated consumers',artifacts:'fixture://SharedButton-v2; fixture://test-run-018:L9821',verification:'Baseline failing; post-change checks not run yet',
};
export function createHandoff(c:Context){
  if(c.transfer==='vague')return {goal:'Continue the work.'};
  const external=c.transfer==='structured'||c.sources.state==='current';
  const hasRule=external||c.sources.instructions==='current',hasFiles=external||['current','noisy'].includes(c.sources.files),hasDiagnostic=external||['current','noisy'].includes(c.sources.outputs);
  return {goal:c.sources.task==='excluded'&&!external?'Goal not selected':workflowState.goal,completed:hasFiles?workflowState.completed:'Only historical or missing inspection selected',current:hasFiles?(hasDiagnostic?workflowState.current:'SharedButton v2; current diagnostic not selected'):'Current repository view not selected',decisions:hasRule?workflowState.decisions:'Read the current project constraint before choosing an edit',blockers:hasDiagnostic?workflowState.blockers:'No current diagnostic selected',next:hasRule&&hasFiles&&hasDiagnostic?workflowState.next:'Recover missing current evidence before editing',constraints:c.transfer==='lossy'?'OMITTED IN THIS SIMULATION':hasRule?workflowState.constraints:'NOT AVAILABLE — recover the current project instruction'};
}
export function assembleContext(c:Context):Item[]{
  const items:Item[]=[];
  const add=(id:string,source:Item['source'],label:string,evidence:string,origin:string,freshness:Item['freshness'],authority:string,relevant=true,count=1,size=1,active=true)=>items.push({id,source,label,evidence,origin,freshness,authority,relevant,count,size,active});
  const s=c.sources,lossy=['vague','lossy'].includes(c.transfer);
  if(s.task!=='excluded')add('task','task','Checkout task',task,'User request · this run','CURRENT','User instruction');
  if(s.instructions!=='excluded')add('rule','instructions',s.instructions==='stale'?'Archived project rule':'Use shared Button · preserve API',s.instructions==='stale'?'Historical guidance: use API v1.':'Current project rule: use SharedButton and preserve its public API.','PROJECT.md · '+(s.instructions==='stale'?'archived revision':'current revision'),s.instructions==='stale'?'STALE':'CURRENT','Project instruction',true,1,1,!lossy);
  if(s.files!=='excluded'){
    add('button','files',s.files==='stale'?'SharedButton.tsx v1':'SharedButton.tsx v2',s.files==='stale'?'Old API: tone.':'Current API: variant; checkout and catalog both consume this component.','Repository snapshot · '+(s.files==='stale'?'revision 1':'revision 2'),s.files==='stale'?'STALE':'CURRENT','Observed source',true,1,3);
    add('tokens','files','Current design tokens','Use the shared accent and existing spacing tokens.','design-tokens.css · revision 2','CURRENT','Observed source',true,1,2);
    add('consumer','files','Checkout consumer','Checkout imports SharedButton v2; Catalog is another consumer.','checkout.tsx · revision 2','CURRENT','Observed source',true,1,2);
    if(s.files==='noisy')add('unrelated','files','14 unrelated files','Unrelated settings screens and old experiments.','Unrelated repository files','CURRENT','Data',false,14,10);
  }
  if(s.retrieval!=='excluded')add('retrieval','retrieval',s.retrieval==='stale'?'Old migration note':'Current shared-component guide',s.retrieval==='stale'?'Historical API v1 guidance.':'Document the current v2 variant and keep its API stable.','Search result · '+(s.retrieval==='stale'?'archived migration note':'current component docs'),s.retrieval==='stale'?'STALE':'CURRENT','Retrieved data, not an instruction',true,1,2,!(s.retrieval==='stale'&&c.preferCurrent&&s.instructions==='current'));
  if(s.memory!=='excluded')add('memory','memory',s.memory==='stale'?'Memory: ButtonLegacy':'Memory: SharedButton v2',s.memory==='stale'?'Prior session: checkout uses ButtonLegacy.':'Recently recorded: checkout consumes SharedButton v2.','Fictional memory store · '+(s.memory==='stale'?'older session':'latest inspection'),s.memory==='stale'?'STALE':'CURRENT','Historical hint, not authority',true,1,1,!(s.memory==='stale'&&c.preferCurrent&&['current','noisy'].includes(s.files)));
  if(s.outputs!=='excluded')add('diagnostic','outputs',s.outputs==='noisy'?'10,000-line test output':s.outputs==='stale'?'Old test result: PASS':'Missing import · exact diagnostic',s.outputs==='stale'?'Old baseline passed before the current revision.':'SharedButton import missing; preserve run-018:L9821 and the affected consumer.','test-run-018:L9821'+(s.outputs==='stale'?' · older revision':' · current revision'),s.outputs==='stale'?'STALE':'CURRENT','Observed tool output',s.outputs!=='noisy',1,s.outputs==='noisy'?14:2);
  if(s.state!=='excluded')add('state','state',s.state==='stale'?'Old workflow state':'Current workflow references',s.state==='stale'?'Earlier inspection assumed ButtonLegacy.':workflowState.current,workflowState.artifacts,s.state==='stale'?'STALE':'CURRENT','Structured observed state',true,1,2,!(s.state==='stale'&&c.preferCurrent&&['current','noisy'].includes(s.files)));
  if(s.tools!=='excluded')add('tools','tools',s.tools==='noisy'?'200 tool definitions':'4 relevant tool definitions','Available tools are unchanged: read, search, edit and test. Only loaded definitions differ.','Fictional tool catalog','CURRENT','Capability descriptions',s.tools!=='noisy',0,s.tools==='noisy'?18:2);
  if(c.history)add('history','history',`${c.history} old history items`,'Repeated attempts and unrelated intermediate output.','Prior fictional session history','STALE','Historical data',false,c.history,12);
  if(c.transfer!=='none')add('transfer','handoff',c.transfer==='compact'?'Carried-forward compact state':c.transfer==='structured'?'Structured Session B handoff':c.transfer==='lossy'?'Lossy carried-forward state':'Vague Session B handoff',JSON.stringify(createHandoff(c)),c.transfer==='compact'||c.transfer==='lossy'?'Reduced state · educational model':'Session A → Session B',lossy?'STALE':'CURRENT','Carried state; verify against current evidence',!lossy,1,lossy?1:3);
  return items;
}
export function detectConflict(c:Context){return assembleContext(c).some(i=>i.freshness==='STALE'&&['memory','retrieval','state','instructions'].includes(i.source))&&['current','noisy'].includes(c.sources.files);}
export function contextSummary(c:Context){
  const all=assembleContext(c),active=all.filter(i=>i.active),count=active.reduce((n,i)=>n+i.count,0),size=active.reduce((n,i)=>n+i.size,0);
  const missing=c.sources.task==='excluded'||c.sources.instructions==='excluded'||c.sources.files==='excluded'||c.sources.outputs==='excluded'||c.sources.tools==='excluded'||['vague','lossy'].includes(c.transfer);
  const conflict=detectConflict(c)&&active.some(i=>i.freshness==='STALE'&&['memory','retrieval','state','instructions'].includes(i.source));
  const quality=conflict?'CONFLICTED':missing?'INCOMPLETE':active.some(i=>i.freshness==='STALE'&&i.relevant)?'STALE':active.some(i=>!i.relevant)?'NOISY':'FOCUSED';
  return {all,active,count,size,quality,noise:active.filter(i=>!i.relevant).reduce((n,i)=>n+i.size,0),superseded:all.filter(i=>!i.active).length,toolCount:c.sources.tools==='excluded'?0:c.sources.tools==='noisy'?200:4};
}
export interface Outcome { pass:boolean; action:string; why:string; next:string; verification:string; checks:{shared:boolean;api:boolean;build:boolean;scope:boolean}; }
export function evaluateOutcome(c:Context):Outcome{
  let action='Update the SharedButton checkout variant + fix its missing import',why='Current project constraints, v2 source, consumers and the exact diagnostic are available.',next='Verify the checkout variant, unchanged public API and other consumers.',shared=true,api=true,build=true,scope=true;
  if(c.sources.task==='excluded'){action='No edit: goal unavailable';why='No user task is in active context.';next='Restore the current task.';shared=api=build=scope=false;}
  else if(['vague','lossy'].includes(c.transfer)){action='Change the public Button API';why='This deliberately lossy handoff omitted the public-API constraint.';next='Carry the goal, current evidence, constraints and next step explicitly.';api=false;}
  else if(c.drift&&!c.goalPinned){action='Refactor unrelated UI and rename components';why='Old iterations displaced the original checkout-only acceptance criteria.';next='Pin the original goal and its acceptance criteria.';scope=false;}
  else if(c.sources.instructions!=='current'){action='Add checkout-only CSS workaround';why='The current shared-component rule is absent or obsolete.';next='Read the current project instruction before choosing an edit.';shared=false;}
  else if(c.sources.files==='excluded'){action='No edit: shared component source unavailable';why='The implementation and its consumers were not selected.';next='Load the current component, tokens and checkout consumer.';shared=build=false;}
  else if(c.sources.files==='stale'){action='Edit SharedButton using the obsolete v1 API';why='Active context has v1, but the fictional repository is at v2.';next='Refresh the current file, then rerun.';build=false;}
  else if((c.sources.memory==='stale'||c.sources.state==='stale')&&!c.preferCurrent){action='Edit ButtonLegacy instead of the live consumer';why='Historical context was selected over the current repository evidence.';next='Remove the stale memory or prefer current authoritative evidence.';shared=false;}
  else if(c.sources.retrieval==='stale'&&!c.preferCurrent){action='Follow the old API v1 migration path';why='Retrieval selected an archived guide instead of current shared-component documentation.';next='Retrieve the current source or resolve freshness and authority.';api=build=false;}
  else if(c.sources.outputs!=='current'){action='Update the variant but miss the required import repair';why=c.sources.outputs==='noisy'?'In this scripted run, the relevant failure is buried in raw output.':'The latest failing diagnostic is missing or replaced by an old passing result.';next='Keep the exact missing-import evidence and its source reference.';build=false;}
  else if(c.sources.tools==='excluded'){action='No edit: required tool definitions not loaded';why='Available capabilities exist, but the relevant definitions are not in active context.';next='Load the needed tool definitions.';build=false;}
  const pass=shared&&api&&build&&scope;
  return {pass,action,why,next,verification:pass?'PASS — modeled build, shared-system, API and scope checks':'FAIL — modeled acceptance checks',checks:{shared,api,build,scope}};
}
export const controlNames=['Add project rule','Refresh file','Remove stale memory','Retrieve current source','Prune noise','Compact context','Structured handoff','Pin goal','Check freshness','Load tool on demand'] as const;
export type Control=typeof controlNames[number];
export function applyControl(c:Context,control:Control):Context{
  const next={...c,sources:{...c.sources}};
  if(control==='Add project rule')next.sources.instructions='current';
  if(control==='Refresh file')next.sources.files='current';
  if(control==='Remove stale memory')next.sources.memory='excluded';
  if(control==='Retrieve current source')next.sources.retrieval='current';
  if(control==='Prune noise'){if(next.sources.files==='noisy')next.sources.files='current';if(next.sources.outputs==='noisy')next.sources.outputs='current';next.history=0;}
  if(control==='Compact context'){const pruned=applyControl(next,'Prune noise');return {...pruned,transfer:'compact'};}
  if(control==='Structured handoff'){next.transfer='structured';next.sources.state='current';}
  if(control==='Pin goal')next.goalPinned=true;
  if(control==='Check freshness')next.preferCurrent=true;
  if(control==='Load tool on demand')next.sources.tools='current';
  return next;
}
export const xray=[
  ['Task','Anchors the requested checkout change.','Current user request.','User instruction within platform/application policy.','Relevant to scope.','Without it the agent lacks a defined goal.'],
  ['Instructions','Keep the shared component and public API constraints visible.','Use the current project revision.','Project/application rules; exact platform hierarchies vary.','Relevant constraints, not just styling hints.','A local workaround can bypass the system.'],
  ['Current state','Supplies structured step, artifact IDs and verification references.','Refresh against current repository evidence.','Observed workflow state, not unquestionable truth.','Load the pieces needed for this decision.','Old state can point to work that no longer applies.'],
  ['Files','Expose the live component, tokens and consumer.','Repository is v2 in this fictional task.','Observed source, not an instruction to override policy.','SharedButton and its consumers matter here.','Editing a v1 API can fail against v2.'],
  ['Memory','Carries selected information retained from earlier work.','Stored records may be stale.','A useful hint; current authoritative evidence can supersede it.','Stored does not mean selected into active context.','An old Legacy note can select the wrong component.'],
  ['Retrieval','Chooses which supporting evidence enters context.','Check document revision and source.','Retrieved content is data, not automatic authority.','Current component docs beat an unrelated migration hit.','A retrieval miss can exclude the evidence needed for the right edit.'],
  ['Tool definitions','Describe callable capabilities.','Use the relevant current schema.','Definitions describe tools; they do not authorize every action.','Load 4 relevant definitions from the same 200-tool catalog.','Missing definitions block selection; eager loading consumes space.'],
  ['Tool outputs','Carry observed diagnostic evidence.','Use run-018 and the affected revision.','Observed results, not permission to ignore instructions.','Retain the missing import and its source reference.','Repeated raw logs can obscure the actionable error.'],
  ['Handoff / compaction','Carry useful state into continued or fresh context.','Include current constraints, blockers and verification state.','A carried summary is not a new source of authority.','Preserve critical state, reduce irrelevant intermediate history.','A lossy custom handoff can omit the API constraint in this model.'],
];
export const challenges=[
  {question:'The shared Button rule is absent. What next?',options:['Guess','Retrieve/read project instructions','Rewrite the page locally'],answer:1,why:'Bring the actual project constraint into context before editing.'},
  {question:'Old memory conflicts with the current repository. What should usually win?',options:['Old memory automatically','Current authoritative evidence','Randomly choose'],answer:1,why:'Use provenance and freshness; memory is not unquestionable truth.'},
  {question:'Only one error in 10,000 tool-output lines matters. What should be carried forward?',options:['Repeat the full output','Preserve relevant diagnostic evidence','Ignore the error'],answer:1,why:'Keep the necessary diagnostic details and their source reference.'},
  {question:'A long-running session restarts. What handoff helps?',options:['Continue','Structured current state + constraints + next step','Unrelated chat history only'],answer:1,why:'Explicit state transfer can let a fresh context continue useful work.'},
];
