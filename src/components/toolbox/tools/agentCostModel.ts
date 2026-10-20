export const agentDefaults = {inputRate:2,outputRate:8,startContext:4000,addedInput:400,output:600,steps:8,tools:2,toolTokens:200,retryProbability:0.05,retries:2,guardRetries:2,branchProbability:0,branches:2,retention:1,pruneThreshold:16000,contextLimit:64000,stepLimit:12,costLimit:2,tokenLimit:200000,toolLimit:100,branchLimit:16,repeatLimit:4,errorLimit:3,approvalStep:0,seed:42};
export type AgentSettings = typeof agentDefaults;
export const agentPresets: Record<string,Partial<AgentSettings>> = {'Normal Agent':{},'Tool Failure':{retryProbability:0.8,steps:24},'Context Growth':{startContext:12000,addedInput:3000,output:2000,steps:36},'Branching Agent':{branchProbability:0.8,branches:3,steps:24},'Runaway Loop':{steps:100,retryProbability:1,retries:5,branchProbability:0.4}};
export function simulateAgent(s:AgentSettings,guarded:boolean){
 for(const value of Object.values(s))if(!Number.isFinite(value)||value<0)throw Error('Use finite nonnegative numbers.');
 for(const key of ['retryProbability','branchProbability','retention'] as const)if(s[key]>1)throw Error('Probabilities and retention must be between 0 and 1.');
 if(s.steps<1||s.branches<1)throw Error('Use at least one step and one branch per split.');
 const steps=Math.min(100,Math.floor(s.steps)),retryCap=Math.min(10,Math.floor(s.retries)),branchCap=Math.min(8,Math.floor(s.branches));
 let seed=s.seed>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let context=Math.min(1000000,s.startContext),active=1,input=0,output=0,calls=0,tools=0,retries=0,peak=context,cost=0,branches=0,errors=0,repeated=0;let status='Completed modeled horizon';const rows=[];
 const price=(i:number,o:number)=>(i*Math.min(s.inputRate,100000)+o*Math.min(s.outputRate,100000))/1000000;
 for(let step=1;step<=steps;step++){
  if(guarded&&((s.stepLimit>0&&step>s.stepLimit)||(s.approvalStep>0&&step>=s.approvalStep))){status=s.approvalStep>0&&step>=s.approvalStep?'Awaiting human approval':'Step limit';break;}
  if(guarded&&context>s.contextLimit){status='Context limit';break;}
  let count=1;while(count<=retryCap&&random()<s.retryProbability)count++;
  if(guarded)count=Math.min(count,1+Math.min(10,Math.floor(s.guardRetries)));
  let summaryInput=0,summaryOutput=0;
  if(guarded&&s.pruneThreshold>0&&context>s.pruneThreshold){summaryInput=context*active;summaryOutput=Math.min(1000,s.pruneThreshold/4)*active;}
  const retained=summaryOutput?summaryOutput/active:context;
  const tc=Math.min(20,s.tools)*active*count;
  const it=(retained+Math.min(s.addedInput,1000000)+Math.min(s.toolTokens,100000)*Math.min(20,s.tools))*active*count+summaryInput;
  const ot=Math.min(s.output,100000)*active*count+summaryOutput,increment=price(it,ot);
  if(guarded&&((s.costLimit>0&&cost+increment>s.costLimit)||(s.tokenLimit>0&&input+output+it+ot>s.tokenLimit)||(s.toolLimit>0&&tools+tc>s.toolLimit))){status='Budget guardrail (next step prevented)';break;}
  input+=it;output+=ot;calls+=active*count+(summaryOutput?active:0);tools+=tc;retries+=active*(count-1);cost+=increment;
  context=Math.min(1000000,(retained+Math.min(s.addedInput,1000000)+Math.min(s.output,100000)+Math.min(s.toolTokens,100000)*Math.min(20,s.tools))*s.retention);peak=Math.max(peak,context);
  errors=count>1?errors+1:0;repeated=s.retryProbability===1?repeated+1:0;
  const spawned=random()<s.branchProbability?active*(branchCap-1):0;
  const next=Math.min(64,active+spawned);branches+=next-active;
  rows.push({step,active,input:it,output:ot,tools:tc,retries:active*(count-1),context,cost:increment,total:cost,summarized:summaryOutput>0});
  if(guarded&&((s.errorLimit>0&&errors>=s.errorLimit)||(s.repeatLimit>0&&repeated>=s.repeatLimit))){status='Repeated error/action stop';break;}
  if(guarded&&next>s.branchLimit){status='Branch limit';break;}active=next;
 }
 if(rows.length===100)status='Safety horizon reached (not proof of completion)';
 return {rows,status,input,output,calls,tools,retries,peak,cost,branches,driver:price(input,0)>=price(0,output)?'Input/context tokens':'Output tokens'};
}
