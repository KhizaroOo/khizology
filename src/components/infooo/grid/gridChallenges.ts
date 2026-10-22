import {initialGrid,evaluateGrid,advanceGrid,type GridState} from './gridModel.ts';
const stepHours=.5;
export const compactResult=(state:GridState)=>evaluateGrid(state,stepHours);
export type GridAction='battery'|'generation'|'demand';
export const compactScenarios=[
 {id:'generation',label:'Generation Loss',takeaway:'Stored energy can bridge a sudden supply gap.'},
 {id:'demand',label:'Demand Spike',takeaway:'Reducing flexible demand can help restore balance.'},
 {id:'solar',label:'Solar Drop',takeaway:'Variable generation increases the value of storage and flexibility.'},
] as const;
export type CompactScenario=typeof compactScenarios[number]['id'];
export function compactInitial(id:CompactScenario,challenge=false):GridState{
 const base={...initialGrid(),stored:72*(challenge ? .45 : .82)};
 if(id==='generation')return {...base,hour:15.25,plantOnline:false,temperature:challenge?30:27};
 if(id==='demand')return {...base,hour:19,scenario:'ev-surge',temperature:29,extraDataCenter:true};
 return {...base,sun:.08};
}
export function compactAction(state:GridState,action:GridAction):GridState{
 if(action==='battery')return {...state,batteryEnabled:true};
 if(action==='demand')return {...state,demandResponse:true,factoryShift:true,evMode:state.hour>=17&&state.hour<22?'smart':state.evMode};
 const restored={...state,plantOnline:true,flexGeneration:state.plantOnline?true:state.flexGeneration};
 return compactResult({...restored,batteryEnabled:false}).shortfall<.01?{...restored,batteryEnabled:false}:restored;
}
// One educational tick integrates 30 minutes of energy at unchanged demand/weather conditions.
export function compactTick(state:GridState):GridState{return {...advanceGrid(state,stepHours),hour:state.hour};}
export function compactHealth(state:GridState){const r=compactResult(state);return r.status==='STRESSED'?'SHORTFALL':r.status;}
