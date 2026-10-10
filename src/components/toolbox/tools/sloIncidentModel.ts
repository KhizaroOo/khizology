export type SloInput={target:number;days:number;rpm:number;start:number;duration:number;errors:number;detect:number;mitigate:number;recover:number;repeats:number;gap:number;traffic:number};
export const sloDefault:SloInput={target:99.9,days:30,rpm:1000,start:60,duration:5,errors:20,detect:10,mitigate:5,recover:10,repeats:1,gap:60,traffic:1};
export const sloPresets:Record<string,Partial<SloInput>>={'Full outage':{errors:100},'Elevated errors':{errors:5},'Partial degradation':{errors:20},'Traffic spike + errors':{errors:20,traffic:4},'Repeated short incidents':{duration:1,detect:2,mitigate:1,recover:2,repeats:5,gap:30},'Slow recovery':{recover:120}};
export function simulateSlo(v:SloInput){
 for(const [key,value] of Object.entries(v))if(!Number.isFinite(value)||value<0)throw Error(`Enter a finite non-negative ${key} value.`);
 if(v.target<90||v.target>=100||v.days<1||v.days>90||v.rpm<1||v.rpm>1e9||v.errors>100||v.traffic<1||v.traffic>100||v.repeats<1||v.repeats>10||!Number.isInteger(v.repeats))throw Error('Use SLO 90–<100%, 1–90 days, positive traffic, 0–100% errors, 1–100× traffic and 1–10 whole incidents.');
 const window=v.days*1440,active=v.duration+v.detect+v.mitigate+v.recover,end=v.start+active*v.repeats+v.gap*(v.repeats-1);if(active<=0||end>window)throw Error('Incidents must have positive duration and fit inside the selected window.');
 const allowed=1-v.target/100,requests=v.rpm*(window+(v.traffic-1)*active*v.repeats),budget=requests*allowed;
 const phases:{name:string;start:number;minutes:number;errorStart:number;errorEnd:number;rpm:number;bad:number;burn:number;cumulative:number}[]=[];let time=0,cumulative=0;
 const add=(name:string,minutes:number,startError:number,endError:number,rpm:number)=>{const bad=minutes*rpm*(startError+endError)/200;cumulative+=bad;phases.push({name,start:time,minutes,errorStart:startError,errorEnd:endError,rpm,bad,burn:(startError+endError)/200/allowed,cumulative});time+=minutes;};
 add('Healthy',v.start,0,0,v.rpm);
 for(let i=1;i<=v.repeats;i++){const rpm=v.rpm*v.traffic;add(`${i} · Incident minimum hold`,v.duration,v.errors,v.errors,rpm);add(`${i} · Await detection`,v.detect,v.errors,v.errors,rpm);add(`${i} · Detected → mitigation`,v.mitigate,v.errors,v.errors,rpm);add(`${i} · Mitigation → recovery`,v.recover,v.errors,0,rpm);if(i<v.repeats)add('Healthy between incidents',v.gap,0,0,v.rpm);}
 add('Healthy after recovery',window-time,0,0,v.rpm);
 const bad=cumulative,remaining=budget-bad,peak=v.errors/100/allowed;
 return {phases,allowed,requests,budget,bad,consumed:bad/budget*100,remaining,remainingPercent:remaining/budget*100,peak,average:bad/requests/allowed,detectionCost:v.detect*v.repeats*v.rpm*v.traffic*v.errors/100,mitigationCost:v.mitigate*v.repeats*v.rpm*v.traffic*v.errors/100,exhaustMinutes:v.errors?Math.max(remaining,0)/(v.rpm*v.traffic*v.errors/100):null};
}
