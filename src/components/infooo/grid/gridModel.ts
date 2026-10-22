export type GridScenario = 'normal'|'heatwave'|'cloud'|'ev-surge'|'plant-trip'|'data-center'|'transmission'|'surplus';
export type EVMode = 'normal'|'smart'|'v2g';
export interface GridState {hour:number;temperature:number;sun:number;wind:number;plantOnline:boolean;extraDataCenter:boolean;constrained:boolean;batteryEnabled:boolean;duration:1|2|4|8;stored:number;evStored:number;evMode:EVMode;fleet:number;demandResponse:boolean;factoryShift:boolean;flexGeneration:boolean;vpp:boolean;scenario:GridScenario;}
export const batteryPower=18;
export const initialGrid=():GridState=>({hour:12,temperature:27,sun:1,wind:1,plantOnline:true,extraDataCenter:false,constrained:false,batteryEnabled:false,duration:4,stored:36,evStored:24,evMode:'normal',fleet:1000,demandResponse:false,factoryShift:false,flexGeneration:false,vpp:false,scenario:'normal'});
export function solarAt(hour:number){return Math.max(0,Math.sin((hour-6)*Math.PI/12))*70;}
export function evaluateGrid(s:GridState,dt=0.25){
 const evening=s.hour>=17&&s.hour<22,day=s.hour>=8&&s.hour<17;
 const solar=solarAt(s.hour)*s.sun,wind=12*s.wind,plant=s.plantOnline?50:0,flex=s.flexGeneration?18:0;
 const cooling=Math.max(0,s.temperature-27)*2;
 const homes=(evening?30:day?16:12)+cooling;
 const offices=day?18:6,factory=(day?20:12)-(s.factoryShift?(day?9:evening?7:-3):0),dataCenter=16+(s.extraDataCenter?25:0);
 const fleetScale=Math.min(1,Math.max(0,s.fleet/1000));
 const evBaseline=(evening?20:day?4:9)*fleetScale*(s.scenario==='ev-surge'?1.5:1);
 const evCharge=s.evMode==='smart'?(evening?2:evBaseline+(day?7:2)):s.evMode==='v2g'&&evening?0:evBaseline;
 const response=s.demandResponse?Math.min(14,homes*.3):0,vppResponse=s.vpp?6:0;
 const demand=homes+offices+factory+dataCenter+evCharge-response-vppResponse;
 const availableA=solar+wind+plant,transferCapacity=s.constrained?42:150;
 const transfer=Math.min(availableA,transferCapacity),localGeneration=flex;
 let gap=demand-transfer-localGeneration;
 const evExport=s.evMode==='v2g'&&gap>0?Math.min(12*fleetScale,s.evStored/Math.max(dt,.001),gap):0;
 gap-=evExport;
 const discharge=s.batteryEnabled&&gap>0?Math.min(batteryPower,s.stored/Math.max(dt,.001),gap):0;
 gap-=discharge;
 const charge=s.batteryEnabled&&gap<0?Math.min(batteryPower,-gap,(batteryPower*s.duration-s.stored)/Math.max(dt,.001)):0;
 const grossSupply=transfer+localGeneration+discharge+evExport,totalDemand=demand+Math.max(0,charge),supply=Math.min(grossSupply,totalDemand),shortfall=Math.max(0,totalDemand-supply);
 const curtailment=Math.max(0,availableA-transfer)+Math.max(0,transfer+localGeneration-demand-charge-evExport);
 const reserve=grossSupply-totalDemand,ratio=shortfall/Math.max(1,totalDemand);
 const status=ratio>.45?'CRITICAL':ratio>.08?'STRESSED':ratio>.001||reserve<3?'TIGHT':'BALANCED';
 return {solar,wind,plant,flex,homes,offices,factory,dataCenter,evCharge,evExport,response,vppResponse,demand,totalDemand,availableA,transfer,transferCapacity,localGeneration,discharge,charge:Math.max(0,charge),supply,shortfall,curtailment,reserve,status,capacity:batteryPower*s.duration};
}
export function advanceGrid(s:GridState,dt=.25):GridState {const r=evaluateGrid(s,dt);return {...s,hour:Math.min(24,s.hour+dt),stored:Math.max(0,Math.min(r.capacity,s.stored+(r.charge-r.discharge)*dt)),evStored:Math.max(0,Math.min(48,s.evStored+(r.evCharge*.5-r.evExport)*dt))};}
export function applyScenario(id:GridScenario):GridState {const s=initialGrid();return {...s,scenario:id,hour:['heatwave','ev-surge','data-center','plant-trip'].includes(id)?19:12,temperature:id==='heatwave'?43:27,sun:id==='cloud'?.2:1,plantOnline:id!=='plant-trip',extraDataCenter:id==='data-center',constrained:id==='transmission'||id==='surplus'};}
export const gridScenarios=[
 {id:'heatwave',name:'Heatwave',change:'27°C → 43°C: cooling demand rises.',feel:'More consumption, same initial generation.',options:'Combine demand response, storage, smart charging and flexible generation.',learn:'Several limited responses can work together.'},
 {id:'cloud',name:'Cloud cover',change:'Clouds reduce the solar output multiplier.',feel:'Supply falls while the city keeps consuming.',options:'Use stored energy or dispatchable generation; shift flexible demand.',learn:'Variable generation increases the value of flexibility.'},
 {id:'ev-surge',name:'Evening EV surge',change:'Many EVs plug in during the evening peak.',feel:'Charging competes with homes and continuous loads.',options:'Shift charging or export from participating vehicles.',learn:'Coordination can matter as much as device count.'},
 {id:'plant-trip',name:'Power plant trip',change:'The modeled plant stops producing.',feel:'Dispatchable supply disappears.',options:'Combine generation, storage and load response.',learn:'Resilience needs more than one resource.'},
 {id:'data-center',name:'Data center arrives',change:'A new continuous load is connected.',feel:'Demand rises in every hour; cooling and connection planning matter.',options:'Add supply/flexibility and inspect transfer capacity.',learn:'Computing growth also requires electricity-system planning.'},
 {id:'transmission',name:'Transmission constraint',change:'Region A → B transfer is limited.',feel:'A can have surplus while B lacks delivered power.',options:'Restore transmission or use local generation and flexible demand.',learn:'Available power is not the same as deliverable power.'},
 {id:'surplus',name:'Solar surplus / curtailment',change:'Midday generation exceeds the constrained city connection.',feel:'Available renewable output is not all usable.',options:'Restore transfer, add storage or move EV charging to midday.',learn:'Storage and useful flexible demand can reduce curtailment.'},
] as const;
export const gridLayers=[
 ['Generation','Solar, wind and a dispatchable plant produce power.','Different sources have different output patterns.','Weather changes or a plant trip reduce output.'],
 ['Transmission','The inter-region connection carries power from A to B.','Power must reach the demand region.','A bottleneck can strand available generation.'],
 ['Distribution','Local branches connect homes, workplaces and charging.','Electricity must reach individual consumers.','Local equipment and connection limits matter; not modeled in detail.'],
 ['Storage','Battery charging moves energy into a reservoir; discharge takes it out.','Storage shifts energy through time.','An empty battery or power limit cannot cover any arbitrary shortfall.'],
 ['Demand','Buildings, factories, vehicles and data centers consume power.','Consumption changes with time, activity and temperature.','Coincident peaks create stress.'],
 ['Flexibility','Supply and selected loads adapt to conditions.','Several modest responses can restore balance.','Availability, comfort, contracts and hardware limit participation.'],
] as const;
