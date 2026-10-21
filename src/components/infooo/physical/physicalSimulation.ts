import {initialWorld,initialSensors,observe,predict,plan,evaluateSafety,advance,home,shelf,same,scenarioWorld, type World,type Sensors,type Estimate,type Point,type Candidate,type ScenarioId} from './physicalModel.ts';
export type Simulation = {world:World;known:World;sensors:Sensors;estimate:Estimate;robot:Point;phase:number;carrying:boolean;done:boolean;stop:string;message:string;candidates:Candidate[];selected:Candidate['id'];memory:boolean;horizon:'SHORT'|'MEDIUM'|'LONG';cloud:boolean;force:boolean;scenario:ScenarioId;moves:number;interruptions:string[];expected?:Point;actual?:Point};
export function createSimulation(scenario:ScenarioId='normal'):Simulation {
 const world=scenarioWorld(scenario),sensors=initialSensors();if(scenario==='camera')sensors.camera=false;if(scenario==='depth')sensors.depth=false;
 const previous=observe(initialWorld(),initialSensors(),true);
 return {world,known:initialWorld(),sensors,estimate:observe(world,sensors,true,previous),robot:home,phase:0,carrying:false,done:false,stop:'',message:'Move the blue crate to Shelf B safely.',candidates:[],selected:'detour',memory:true,horizon:'MEDIUM',cloud:scenario==='network',force:false,scenario,moves:0,interruptions:[]};
}
export function changeWorld(s:Simulation,patch:Partial<World>):Simulation {return {...s,world:{...s.world,...patch,revision:s.world.revision+1},message:'Reality changed. The stored model has not updated.',done:false};}
export function reobserve(s:Simulation):Simulation {return {...s,known:{...s.world},estimate:observe(s.world,s.sensors,s.memory,s.estimate),phase:1,stop:'',candidates:[],message:'New observations update the estimate. Hidden objects are not directly observed.'};}
export function recover(s:Simulation):Simulation {
 if(s.world.unknown)return {...s,stop:'Human confirmation needed',message:'Use Ask human: the robot cannot identify this target on its own.'};
 const world={...s.world,occluded:false,slippery:false,disagreement:false,network:true,revision:s.world.revision+1};
 // Recovery is an explicit external intervention, not the robot magically repairing hardware.
 const robot:Point=[Math.round(s.robot[0]),Math.round(s.robot[1])];
 return reobserve({...s,world,robot,sensors:initialSensors(),force:false,expected:undefined,actual:undefined,message:'Operator restores sensors, visibility and traction.'});
}
export function confirmHuman(s:Simulation):Simulation {return reobserve(changeWorld(s,{unknown:false}));}
export function tick(s:Simulation):Simulation {
 if(s.done||s.stop)return s;
 if(s.phase===0)return reobserve(s);
 if(s.phase===1)return {...s,phase:2,message:s.estimate.truth==='OBSERVED'?'Perception identifies the visible blue crate.':'Current images do not identify the crate. Memory is not a measurement.'};
 if(s.phase===2)return {...s,phase:3,message:`${s.estimate.truth} target; ${s.estimate.confidence} confidence. Current observations and memory remain distinguishable.`};
 if(s.phase===3){const candidates=predict(s.known,s.robot,s.carrying?shelf:s.estimate.crate||s.robot,s.horizon);return {...s,candidates,phase:4,message:'Ghost paths are predictions, not things that already happened.'};}
 if(s.phase===4){const chosen=plan(s.candidates);let next={...s,phase:5,selected:chosen?.id||s.selected,message:chosen?'Planner proposes the shortest candidate that passes its modeled constraints.':'No candidate is clear; stop and observe again.'};
  if(s.scenario==='stale'&&!s.interruptions.includes('stale'))next={...changeWorld(next,{obstacle:[5,3]}),interruptions:[...s.interruptions,'stale']};return next;}
 const candidate=s.candidates.find(c=>c.id===s.selected);
 if(s.phase===5){if(s.cloud&&!s.world.network)return {...s,stop:'Remote planner unavailable',message:'Local safety still holds the robot stopped.'};
  if(!candidate)return {...s,stop:'No path',message:'Observe and plan before moving.'};const gate=evaluateSafety(s.world,s.estimate,s.sensors,candidate,!s.carrying&&same(s.robot,s.world.crate),s.force);
  return {...s,phase:gate.allowed?6:5,stop:gate.allowed?'':gate.reason,message:gate.reason};}
 if(s.phase===6){if(!candidate)return {...s,stop:'No path'};
  const gate=evaluateSafety(s.world,s.estimate,s.sensors,candidate,!s.carrying&&same(s.robot,s.world.crate),s.force);
  if(!gate.allowed)return {...s,stop:gate.reason,message:gate.reason};
  if(same(s.robot,s.carrying?shelf:s.world.crate)){
   if(s.carrying)return {...s,carrying:false,done:true,world:{...s.world,crate:shelf},message:'Mission complete: blue crate placed on Shelf B. Feedback confirmed delivery.'};
   return {...changeWorld(s,{human:[6,2]}),carrying:true,phase:0,candidates:[],message:'Gripper contact confirmed. Human entered the aisle; observe again before delivery.'};}
  const target=candidate.path[1];if(!target)return {...s,stop:'No progress',message:'Replan from the current position.'};
  const result=advance(s.robot,target,s.world);return {...s,robot:result.actual,expected:result.expected,actual:result.actual,moves:s.moves+1,phase:7,message:result.mismatch?'Controller requested one cell. Feedback measured less travel: model mismatch.':'Actuators moved the robot. Observe the result before the next action.',stop:result.mismatch?'Motion mismatch — recover traction':''};}
 let next={...s,phase:0,message:'Feedback updates the robot state; close the loop again.'};
 if(s.scenario==='finale'&&s.carrying){const events=[['occlusion',{occluded:true}],['stale',{obstacle:[5,3]}],['slip',{slippery:true}],['unknown',{unknown:true}]] as const;
  const event=events.find(([id])=>!s.interruptions.includes(id));if(event)next={...changeWorld(next,event[1]),interruptions:[...s.interruptions,event[0]],stop:event[0]==='slip'?'':`${event[0]} interruption — observe and recover`,message:event[0]==='occlusion'?'The crate is temporarily hidden. Compare reality with remembered state.':event[0]==='stale'?'Reality changed after planning. The model must be refreshed.':event[0]==='unknown'?'An ambiguous target requires human confirmation.':'Low friction will test the prediction against actual motion.'};}
 return next;
}
