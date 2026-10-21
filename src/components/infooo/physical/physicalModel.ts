export type Point = readonly [number, number];
export type Sensors = { camera: boolean; depth: boolean; proprioception: boolean; force: boolean };
export type World = { crate: Point; human: Point; obstacle: Point; occluded: boolean; slippery: boolean; disagreement: boolean; unknown: boolean; network: boolean; revision: number };
export type Estimate = { crate?: Point; truth: 'OBSERVED' | 'INFERRED' | 'UNKNOWN'; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; revision: number; age: number };
export type Candidate = { id: 'detour' | 'straight' | 'wait'; path: Point[]; risk: string; safe: boolean; distance: number; ticks: number; confidence: 'MEDIUM' | 'LOW' };
export const home: Point = [1,5], shelf: Point = [8,3];
export const noGo: Point[] = [[7,0],[8,0],[9,0]];
export const fixedShelves: Point[] = [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[7,5],[8,5]];
export const initialWorld = (): World => ({crate:[3,3],human:[6,1],obstacle:[4,3],occluded:false,slippery:false,disagreement:false,unknown:false,network:true,revision:0});
export const initialSensors = (): Sensors => ({camera:true,depth:true,proprioception:true,force:true});
export function observe(world: World, sensors: Sensors, memory: boolean, previous?: Estimate): Estimate {
  if (sensors.camera && !world.occluded && !world.unknown) return {crate:world.crate,truth:'OBSERVED',confidence:sensors.depth && !world.disagreement ? 'HIGH':'LOW',revision:world.revision,age:0};
  if (memory && previous?.crate) return {...previous,truth:'INFERRED',confidence:previous.age===0?'MEDIUM':'LOW',age:previous.age+1};
  return {truth:'UNKNOWN',confidence:'LOW',revision:world.revision,age:0};
}
export const same = (a:Point,b:Point) => a[0]===b[0] && a[1]===b[1];
export function route(start:Point,goal:Point,blocked:Point[]): Point[] {
  if(blocked.some(p=>same(p,goal)))return [];
  const queue:Point[][]=[[start]],seen=new Set([start.join(',')]);
  for(let i=0;i<queue.length;i++){const path=queue[i],p=path[path.length-1];if(same(p,goal))return path;
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const n:Point=[p[0]+dx,p[1]+dy],key=n.join(',');if(n[0]<0||n[0]>9||n[1]<0||n[1]>6||seen.has(key)||blocked.some(b=>same(b,n)))continue;seen.add(key);queue.push([...path,n]);}}
  return [];
}
export function predict(world:World,start:Point,goal:Point,horizon:'SHORT'|'MEDIUM'|'LONG'):Candidate[]{
  // A fixed, deliberately conservative crossing envelope, not a learned human-motion model.
  const crossing:Point[]=Array.from({length:6},(_,y)=>[world.human[0],y] as Point);
  return (['detour','straight','wait'] as const).map(id=>{
    const path=route(start,goal,[world.obstacle,...noGo,...fixedShelves,...(id==='detour'?crossing:[])]);
    const collision=path.some(p=>same(p,world.human)||(horizon!=='SHORT'&&crossing.some(h=>same(h,p))));
    const safe=path.length>0&&!collision;
    return {id,path,safe,risk:!path.length?'Blocked path':collision?'Predicted human crossing':id==='wait'?'Wait, then observe again before moving':'No modeled intersection',distance:Math.max(0,path.length-1),ticks:Math.max(0,path.length-1)+(id==='wait'?2:0),confidence:horizon==='LONG'?'LOW':'MEDIUM'};
  });
}
export function evaluateSafety(world:World,estimate:Estimate,sensors:Sensors,candidate:Candidate,gripping=false,excessForce=false):{allowed:boolean;reason:string}{
  if(estimate.revision!==world.revision)return {allowed:false,reason:'Model out of date: stop, observe again and replan.'};
  if(estimate.truth!=='OBSERVED'||estimate.confidence!=='HIGH')return {allowed:false,reason:'Uncertain target: observe again or ask a human.'};
  if(!sensors.proprioception)return {allowed:false,reason:'Robot body state unavailable: stop.'};
  if(gripping&&(!sensors.force||excessForce))return {allowed:false,reason:excessForce?'Excessive force: release pressure before gripping.':'Contact feedback unavailable: do not grip.'};
  if(!candidate.safe||candidate.path.some(p=>same(p,world.human)||same(p,world.obstacle)||noGo.some(n=>same(n,p))))return {allowed:false,reason:candidate.safe?'Independent local proximity gate: STOP.':candidate.risk};
  return {allowed:true,reason:'ALLOW — simplified checks passed. Independent safeguards are still needed in real robots.'};
}
export function plan(candidates:Candidate[]):Candidate|undefined {return candidates.filter(c=>c.safe).sort((a,b)=>a.ticks-b.ticks)[0];}
export function advance(position:Point,target:Point,world:World):{expected:Point;actual:Point;mismatch:boolean}{
  const actual:Point=world.slippery?[position[0]+(target[0]-position[0])*.5,position[1]+(target[1]-position[1])*.5]:target;
  return {expected:target,actual,mismatch:!same(actual,target)};
}
export const scenarios = [
  {id:'normal',name:'Normal mission',what:'A person crosses the delivery aisle.',why:'A useful route can still be unsafe.',response:'Compare alternatives; use the clear perimeter.'},
  {id:'camera',name:'Camera blocked',what:'The camera cannot see the crate.',why:'No current visual identification.',response:'Pause; restore camera and observe again.'},
  {id:'depth',name:'Depth sensor failure',what:'Distance readings are unavailable.',why:'Appearance alone cannot establish reliable reach.',response:'Pause; restore depth and re-estimate.'},
  {id:'occluded',name:'Occluded crate',what:'A screen hides the target.',why:'Memory is an estimate, not sight through a wall.',response:'Inspect memory, move the hidden crate, then reveal and observe.'},
  {id:'human',name:'Human enters path',what:'A person enters the aisle.',why:'The previous route may now intersect a human.',response:'Stop, observe and plan around the crossing envelope.'},
  {id:'stale',name:'World changes after planning',what:'An obstacle moves after the observation.',why:'The plan refers to an older environment.',response:'Observe again, update state and replan.'},
  {id:'slippery',name:'Slippery floor',what:'Travel is shorter than the controller requested.',why:'Wheel slip breaks the expected motion model.',response:'Feedback detects error; stop and recover traction before replanning.'},
  {id:'disagreement',name:'Sensor disagreement',what:'Camera sees a crate; depth is unreliable.',why:'Adding sensors does not guarantee agreement.',response:'Lower confidence; recalibrate before acting.'},
  {id:'unknown',name:'Unknown object',what:'The target cannot be confidently identified.',why:'Guessing could move the wrong object.',response:'Ask a human; then confirm with a fresh observation.'},
  {id:'network',name:'Network lost',what:'Remote-dependent planning becomes unavailable.',why:'Cloud services depend on connectivity.',response:'Local safety stops motion. Switch to available on-robot planning or restore connection.'},
  {id:'finale',name:'The real test — combined finale',what:'Human, occlusion, stale state, slip and ambiguity interrupt one delivery.',why:'Physical intelligence is a continuous feedback loop.',response:'Recover each interruption and finish the same mission.'},
] as const;
export type ScenarioId = typeof scenarios[number]['id'];
export function scenarioWorld(id:ScenarioId):World {return {...initialWorld(),occluded:id==='occluded',slippery:id==='slippery',disagreement:id==='disagreement',unknown:id==='unknown',network:id!=='network'};}
export const stages=['Sense','Perceive','Estimate state','Predict','Plan','Safety check','Act','Observe result'] as const;
export const architecture = [
 ['Sensor','Physical signals','Measurements','Samples part of reality','Occlusion, noise or failure'],
 ['Perception','Measurements','Object interpretations','Recognizes useful features','Wrong object or poor visibility'],
 ['State','Observations + robot state + memory','Estimated scene','Maintains an uncertain working picture','Stale memory or disagreement'],
 ['World model','State + possible action','Predicted future','Anticipates consequences','Model mismatch; uncertainty grows'],
 ['Planner','Goal + candidate futures','Proposed trajectory','Chooses a useful action','Bad assumptions or no route'],
 ['Safety','Proposed action + constraints','ALLOW / MODIFY / STOP','Can veto the plan independently','Incomplete checks; not a safety certification'],
 ['Controller','Desired movement + feedback','Motor commands','Tracks the desired movement','Slip or delayed feedback'],
 ['Actuator','Motor commands','Physical movement','Turns commands into motion','Jam, power loss or excessive force'],
] as const;
export const challenges = [
 {question:'A person may cross the planned route. What is the safest next step here?',answers:['Increase speed','Wait or replan','Ignore the prediction'],correct:1,lesson:'A predicted collision is a reason to change the proposed action.'},
 {question:'The crate is hidden. Which statement is truthful?',answers:['Memory may retain a previous location','The camera sees through shelves','It definitely vanished'],correct:0,lesson:'A remembered position is inferred and can become stale.'},
 {question:'Actual movement differs from prediction. What next?',answers:['Follow the old plan anyway','Discard feedback','Update state and replan'],correct:2,lesson:'Feedback closes the loop between a model and reality.'},
 {question:'Two sensors disagree. What should confidence do?',answers:['Automatically become perfect','Remain unquestioned','Decrease until the ambiguity is resolved'],correct:2,lesson:'Fusion can help, but does not magically resolve contradictory evidence.'},
 {question:'An unknown object might be the target. What should this robot do?',answers:['Guess','Observe again or ask a human','Grip harder'],correct:1,lesson:'Useful autonomy includes recognizing when assistance is needed.'},
] as const;
