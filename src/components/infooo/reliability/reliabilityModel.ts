/** Fictional single-issue workflow. Backend truth, observed state and tool responses are separate. */
export type Scenario = 'happy' | 'timeout' | 'partial' | 'false-success' | 'stale' | 'handoff' | 'retry-loop';
export type Control = 'idempotency' | 'boundedRetries' | 'checkpoints' | 'preconditions' | 'verification' | 'structuredHandoff' | 'timeoutPolicy' | 'escalation' | 'trace' | 'traceEval';
export type Controls = Record<Control, boolean>;
export type Phase = 'read' | 'policy' | 'create' | 'unknown' | 'retry' | 'reconcile' | 'handoff' | 'confirm' | 'notify' | 'recover' | 'verify' | 'repair' | 'report' | 'done';
export type Status = 'ready' | 'running' | 'partial' | 'mismatch' | 'review' | 'verified' | 'claimed' | 'escalated' | 'stopped';
export type Outcome = 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' | 'RETRYING' | 'VERIFIED';
export interface Span { id: number; tool: string; phase: Phase; status: Outcome; duration: number; attempt: number; knowledge: string; returned: string; next: string; retry: boolean }
export interface Snapshot { replacementId: string; completedSteps: string[]; pendingStep: 'notify'; verificationNeeded: true }
export interface Workflow {
  scenario: Scenario; controls: Controls; phase: Phase; status: Status;
  actual: { order: 'eligible' | 'cancelled' | 'replaced'; version: number; replacements: string[]; notifications: string[]; operationReceipt: string | null };
  observed: { eligible: boolean; version: number; replacementId: string | null };
  attempt: number; notifyAttempt: number; clock: number; trace: Span[];
  checkpoint: Snapshot | null; handoff: Snapshot | null;
  interrupted: boolean; faultUsed: boolean; policyViolation: boolean; verificationPerformed: boolean;
  unknownCount: number; response: Outcome; message: string; answer: string;
}
export const controlNames: Record<Control,string> = { idempotency:'Idempotency key', boundedRetries:'Bounded retries · 3 total attempts', checkpoints:'Checkpoints', preconditions:'Execution-time preconditions', verification:'Post-action verification', structuredHandoff:'Structured handoff', timeoutPolicy:'Reconcile unknown outcomes', escalation:'Human escalation', trace:'Metadata trace', traceEval:'Trace-level evaluation' };
export const scenarios: { id: Scenario; title: string; lesson: string }[] = [
  { id:'timeout', title:'Timeout after success', lesson:'A missing response does not prove the side effect failed.' },
  { id:'partial', title:'Partial failure', lesson:'A failed notification does not undo a completed replacement.' },
  { id:'false-success', title:'False success', lesson:'A successful response is not proof of resulting state.' },
  { id:'stale', title:'Stale state', lesson:'Eligibility observed earlier may be invalid at execution time.' },
  { id:'handoff', title:'Context / handoff loss', lesson:'A new session needs completed-work references, not only the original goal.' },
  { id:'retry-loop', title:'Retry loop', lesson:'Retries need a budget, a stop condition and an escalation path.' },
];
export const reliableControls = (): Controls => ({ idempotency:true,boundedRetries:true,checkpoints:true,preconditions:true,verification:true,structuredHandoff:true,timeoutPolicy:true,escalation:true,trace:true,traceEval:true });
export const fragileControls = (): Controls => ({...Object.fromEntries(Object.keys(reliableControls()).map(key=>[key,false])),trace:true,traceEval:true}) as Controls;
export function initialWorkflow(scenario: Scenario = 'happy', controls = reliableControls()): Workflow {
  return { scenario,controls:{...controls},phase:'read',status:'ready',actual:{order:'eligible',version:1,replacements:[],notifications:[],operationReceipt:null},observed:{eligible:false,version:0,replacementId:null},attempt:0,notifyAttempt:0,clock:0,trace:[],checkpoint:null,handoff:null,interrupted:false,faultUsed:false,policyViolation:false,verificationPerformed:false,unknownCount:0,response:'WAITING',message:'Read order #1842, create one replacement, notify, then verify.',answer:'' };
}
export function startWorkflow(s: Workflow): Workflow { return s.status==='ready'?span({...s,status:'running'},'model_decision','SUCCESS',20,'A deterministic plan selects lookup, eligibility, one replacement, notification and verification.','Read the fictional order; no live model inference occurred.'):s; }
function span(s: Workflow, tool:string, status:Outcome, duration:number, returned:string, next:string, knowledge=`Before call: eligibility ${s.observed.eligible?'YES':'not confirmed'}, observed version ${s.observed.version}, replacement reference ${s.observed.replacementId||'unknown'}.`, retry=false):Workflow {
  return {...s,clock:s.clock+duration,response:status,trace:[...s.trace,{id:s.trace.length+1,tool,phase:s.phase,status,duration,attempt:Math.max(1,s.phase==='notify'?s.notifyAttempt:s.attempt),knowledge,returned,next,retry}],message:returned};
}
export function verifyState(s: Workflow) {
  const exactlyOne=s.actual.replacements.length===1;
  const notification=exactlyOne&&s.actual.notifications.includes(s.actual.replacements[0]);
  const orderCorrect=s.actual.order==='replaced'&&!s.policyViolation;
  return {exists:s.actual.replacements.length>0,exactlyOne,notification,orderCorrect,complete:exactlyOne&&notification&&orderCorrect};
}
/** One logical operation identity for this one fictional order issue; not a global key or exactly-once guarantee. */
export function applySideEffect(s:Workflow):Workflow {
  if(s.controls.idempotency&&s.actual.operationReceipt) return {...s,observed:{...s.observed,replacementId:s.actual.operationReceipt}};
  const id=`replacement-${s.actual.replacements.length+1}`;
  return {...s,actual:{...s.actual,replacements:[...s.actual.replacements,id],operationReceipt:s.actual.operationReceipt||id,order:s.actual.order==='cancelled'?'cancelled':'replaced',version:s.actual.version+1},observed:{...s.observed,replacementId:id}};
}
function snapshot(s:Workflow): Snapshot|null { return s.observed.replacementId?{replacementId:s.observed.replacementId,completedSteps:['model_decision','read_order','policy_check','create_replacement'],pendingStep:'notify',verificationNeeded:true}:null; }
function saveCheckpoint(s:Workflow):Workflow { return s.controls.checkpoints?{...s,checkpoint:snapshot(s)}:s; }
function afterCreation(s:Workflow):Workflow {
  s=saveCheckpoint(s);
  if(s.scenario==='handoff'&&!s.interrupted) return {...s,phase:'handoff',handoff:s.controls.structuredHandoff?snapshot(s):null};
  return {...s,phase:s.controls.verification?'confirm':'notify'};
}
export function resumeFromCheckpoint(s:Workflow):Workflow {
  const saved=s.handoff||s.checkpoint;
  if(!saved)return {...s,phase:'create',status:'running',message:'Unstructured handoff lost the completed action; the new session repeats the request.'};
  return {...s,observed:{...s.observed,replacementId:saved.replacementId},phase:s.controls.verification?'confirm':saved.pendingStep,status:'running',message:'Resume using the saved replacement reference; verification is still required.'};
}
function exhaust(s:Workflow):Workflow {
  return {...s,status:s.controls.escalation?'escalated':'review',message:s.controls.escalation?'Attempt budget exhausted; stop and request human review. No completion is claimed.':'Retry budget reached. Escalate instead of treating more attempts as progress.',answer:'REVIEW REQUIRED'};
}
export function recoverPartial(s:Workflow, restart=false):Workflow {
  if(s.status!=='partial')return s;
  return {...s,status:'running',phase:restart?'create':'notify',message:restart?'Replay attempts the completed replacement again; safeguards determine whether it duplicates.':'Resume only the failed notification; the replacement already exists.'};
}
export function repairMismatch(s:Workflow):Workflow {
  if(s.status!=='mismatch')return s;
  if(s.actual.replacements.length>1||s.actual.order==='cancelled')return {...s,status:'escalated',message:'Existing duplicate or invalid work needs human reconciliation; this model does not undo it.',answer:'REVIEW REQUIRED'};
  return {...s,status:'running',phase:'create',observed:{...s.observed,replacementId:null},message:'The independent read found no replacement. Revalidate and create the missing action.'};
}
export function escalateWorkflow(s:Workflow):Workflow { return {...s,status:'escalated',message:'Human review requested; no further automatic action is permitted.',answer:'REVIEW REQUIRED'}; }
export function advanceWorkflow(s:Workflow):Workflow {
  if(s.status!=='running')return s;
  switch(s.phase){
    case 'read': return {...span(s,'read_order','SUCCESS',90,`Observed order #1842 at version ${s.actual.version}.`,'Check eligibility.'),observed:{...s.observed,eligible:s.actual.order==='eligible',version:s.actual.version},phase:'policy'};
    case 'policy': {
      let n=span(s,'policy_check',s.observed.eligible?'SUCCESS':'FAILED',30,s.observed.eligible?'Order appears eligible at the observed version.':'Observed order is not eligible.','Validate again before the irreversible action.');
      if(!s.observed.eligible)return {...n,status:'stopped',answer:'REVIEW REQUIRED'};
      if(s.scenario==='stale')n={...n,actual:{...n.actual,order:'cancelled',version:n.actual.version+1},message:'Another actor cancelled the order: observed t0 is no longer real t1.'};
      return {...n,phase:'create'};
    }
    case 'create': {
      if(s.controls.preconditions&&(s.actual.order==='cancelled'||(!s.actual.operationReceipt&&s.actual.version!==s.observed.version)))return {...span(s,'create_replacement','FAILED',40,'Execution-time precondition rejected the cancelled order.','Stop and reconcile with a human.'),status:'stopped',answer:'REVIEW REQUIRED'};
      if(s.controls.preconditions&&!s.controls.idempotency&&s.actual.replacements.length===1){
        const n=span(s,'reconcile_existing','SUCCESS',80,'Existing replacement belongs to this same issue; do not create another.','Use its reference and verify.');
        return afterCreation({...n,observed:{...n.observed,replacementId:n.actual.replacements[0]}});
      }
      const attempt=s.attempt+1;
      if(s.scenario==='retry-loop')return {...span({...s,attempt},'create_replacement','FAILED',180,'Transient tool rejection: no replacement was committed.','Back off, then retry within the attempt budget.',undefined,attempt>1),phase:'retry'};
      if(s.scenario==='false-success'&&!s.faultUsed){
        const n=span({...s,attempt,faultUsed:true,observed:{...s.observed,replacementId:'unconfirmed-reference'}},'create_replacement','SUCCESS',180,'Tool replied “success” with an unconfirmed replacement reference.','Verify the resulting state before trusting the response.');
        return afterCreation(n);
      }
      let n=applySideEffect({...s,attempt,policyViolation:s.policyViolation||s.actual.order==='cancelled'});
      if(s.scenario==='timeout'&&!s.faultUsed){
        n=span({...n,faultUsed:true,unknownCount:s.unknownCount+1,observed:{...s.observed,replacementId:null}},'create_replacement','UNKNOWN',700,'Response timed out after submission. The agent does not know whether it committed.','Reconcile, or retry the same logical operation safely.');
        return {...n,phase:'unknown'};
      }
      n=span(n,'create_replacement','SUCCESS',180,s.controls.idempotency&&s.actual.operationReceipt?'Retry returned the same operation receipt; no second replacement.':`Tool confirmed ${n.observed.replacementId}.`,'Continue using the resulting reference.',undefined,attempt>1);
      return afterCreation(n);
    }
    case 'unknown': return {...span(s,'timeout_policy','UNKNOWN',20,s.controls.idempotency?'Reuse the same logical operation key; do not invent a new purchase/action.':s.controls.timeoutPolicy?'Query the operation’s state before another irreversible request.':'Naive policy assumes timeout means failure and retries blindly.','Retry or reconcile without turning UNKNOWN into FAILED.'),phase:s.controls.idempotency||!s.controls.timeoutPolicy?'retry':'reconcile'};
    case 'retry': {
      if(s.controls.boundedRetries&&s.attempt>=3)return exhaust(s);
      if(!s.controls.boundedRetries&&s.attempt>=6)return {...s,status:'review',message:'The naive policy has no retry bound. This educational demo pauses at six attempts instead of looping forever.',answer:'REVIEW REQUIRED'};
      const delay=s.controls.boundedRetries?500*2**Math.max(0,s.attempt-1):0;
      return {...span(s,'retry','RETRYING',delay,`Attempt ${s.attempt+1} scheduled${delay?` after ${delay} simulated ms backoff`:', without backoff'}.`,'Retry the same logical action.',undefined,true),phase:'create'};
    }
    case 'reconcile': {
      const id=s.actual.operationReceipt;
      if(!id)return {...span(s,'operation_status','UNKNOWN',110,'Operation status is unresolved.','Escalate instead of blind replay.'),status:'review',answer:'REVIEW REQUIRED'};
      return afterCreation({...span(s,'operation_status','SUCCESS',110,'Independent status lookup found the already committed replacement.','Continue without a new side effect.'),observed:{...s.observed,replacementId:id}});
    }
    case 'handoff': {
      const n=span({...s,interrupted:true,observed:{...s.observed,replacementId:null}},'context_handoff','SUCCESS',60,s.handoff?'Agent B receives replacement_id, completed_steps, pending_step and verification_needed.':s.checkpoint?'Session interrupted; a checkpoint retains the completed replacement reference.':'Agent B receives only “continue resolving order”; the completed action is missing.','Resume from recorded state, or repeat forgotten work.');
      return resumeFromCheckpoint(n);
    }
    case 'confirm': {
      const okay=s.actual.replacements.length===1&&s.actual.order==='replaced'&&!s.policyViolation&&s.actual.replacements[0]===s.observed.replacementId;
      const n=span({...s,verificationPerformed:true},'verify_replacement',okay?'VERIFIED':'FAILED',80,okay?'Independent read confirms exactly one valid replacement.':'Tool response and actual replacement state disagree.','Notify only after this important state check.');
      return {...n,phase:okay?'notify':'repair',status:okay?'running':'mismatch'};
    }
    case 'notify': {
      const attempt=s.notifyAttempt+1;
      if(s.scenario==='partial'&&!s.faultUsed){
        const n=span({...s,notifyAttempt:attempt,faultUsed:true},'send_email','FAILED',120,'Notification failed; the confirmed replacement remains committed.','Resume this failed step, not the whole workflow.');
        return {...n,phase:'recover',status:'partial'};
      }
      const id=s.observed.replacementId||'missing-reference';
      return {...span({...s,notifyAttempt:attempt,actual:{...s.actual,notifications:[...s.actual.notifications,id]}},'send_email','SUCCESS',120,'Notification recorded for the referenced replacement.','Verify the final order outcome.'),phase:'verify'};
    }
    case 'recover': return recoverPartial({...s,status:'partial'});
    case 'verify': {
      if(!s.controls.verification)return {...span(s,'verification_skipped','WAITING',0,'No independent outcome verification was performed.','The agent will report from tool responses alone.'),phase:'report'};
      const okay=verifyState(s).complete;
      return {...span({...s,verificationPerformed:true},'verify_outcome',okay?'VERIFIED':'FAILED',80,okay?'One replacement, matching notification and correct order state confirmed.':'Expected and actual state do not match; do not claim verified completion.','Report verified completion, or reconcile the mismatch.'),phase:okay?'report':'repair',status:okay?'running':'mismatch'};
    }
    case 'report': return {...span(s,'report_completion',s.controls.verification&&verifyState(s).complete?'VERIFIED':'SUCCESS',20,'Agent final answer: “DONE”.','Evaluate the underlying execution, not only these words.'),phase:'done',status:s.controls.verification&&verifyState(s).complete?'verified':'claimed',answer:'DONE'};
    default:return s;
  }
}
export function evaluateMission(s:Workflow){
  const truth=verifyState(s),safeStop=['stopped','escalated','review'].includes(s.status)&&s.actual.replacements.length===0;
  const criteria={correctTools:s.trace.every(t=>['model_decision','read_order','policy_check','create_replacement','reconcile_existing','timeout_policy','retry','operation_status','context_handoff','verify_replacement','send_email','verification_skipped','verify_outcome','report_completion'].includes(t.tool)),sideEffects:safeStop||truth.exactlyOne,recovery:s.unknownCount===0||s.trace.some(t=>['operation_status','reconcile_existing'].includes(t.tool)||(t.tool==='create_replacement'&&t.retry&&s.controls.idempotency)),verification:s.verificationPerformed||safeStop,policy:!s.policyViolation&&(s.scenario!=='retry-loop'||(s.controls.boundedRetries&&s.attempt<=3))};
  return {criteria,pass:Object.values(criteria).every(Boolean)&&(truth.complete||safeStop),truth,safeStop};
}
export function posture(s:Workflow){
  if(s.actual.replacements.length>1||s.policyViolation||s.status==='claimed')return 'FRAGILE';
  if(s.status==='verified')return s.controls.idempotency&&s.controls.boundedRetries&&s.controls.checkpoints&&s.controls.escalation?'DEFENSE-IN-DEPTH':'VERIFIED';
  return s.controls.verification&&(s.controls.idempotency||s.controls.timeoutPolicy)?'RECOVERABLE':'FRAGILE';
}
export const challenges=[
  {question:'A tool timed out after submission. What do you know?',options:['It definitely failed','It definitely succeeded','The outcome may be unknown'],answer:2,why:'A lost response does not reveal whether the side effect committed.'},
  {question:'A replacement action may be retried. Which control helps?',options:['Unlimited retries','Idempotency','A longer prompt'],answer:1,why:'A stable logical operation identity lets a supporting service deduplicate a retry.'},
  {question:'A tool says “success”. What should happen before completion?',options:['Always report success','Verify the important resulting state','Retry regardless'],answer:1,why:'Tool responses and real system state are different evidence.'},
  {question:'The attempt budget is exhausted. What next?',options:['Retry forever','Ignore it','Escalate for review'],answer:2,why:'Stopping preserves accountability when automatic progress is no longer justified.'},
] as const;

export function cleanReference(): Workflow { let s=startWorkflow(initialWorkflow()); for(let i=0;i<12&&s.status==='running';i++)s=advanceWorkflow(s);return s; }
