export type ReplicaStrategy='balanced'|'primary'|'window'|'sticky';
export interface ReplicaSettings { replicas:number;lagMs:number;writes:number;reads:number;duration:number;replicaPercent:number;windowMs:number;strategy:ReplicaStrategy;seed:number }
export const replicaDefaults:ReplicaSettings={replicas:3,lagMs:1500,writes:2,reads:8,duration:20,replicaPercent:80,windowMs:2000,strategy:'balanced',seed:42};
export interface ReplicaRead {time:number;primary:number;versions:number[];route:number;seen:number;staleMs:number;fresh:boolean}
export function simulateReplicas(s:ReplicaSettings){
 const limits:Array<[number,number,number,boolean]>=[[s.replicas,1,3,true],[s.lagMs,0,5000,false],[s.writes,1,20,true],[s.reads,1,40,true],[s.duration,5,60,true],[s.replicaPercent,0,100,false],[s.windowMs,0,10000,false],[s.seed,0,2147483647,true]];
 if(limits.some(([v,min,max,int])=>!Number.isFinite(v)||v<min||v>max||(int&&!Number.isInteger(v)))||!['balanced','primary','window','sticky'].includes(s.strategy))throw new Error('Use bounded controls: 1–3 replicas, 0–5,000 ms lag, 1–20 writes/s, 1–40 reads/s, 5–60 seconds and a nonnegative integer seed.');
 const lags=Array.from({length:s.replicas},(_,i)=>s.lagMs*(s.replicas===1?1:.75+i*.5/(s.replicas-1)));
 let seed=s.seed>>>0;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const reads:ReplicaRead[]=[],utilization=Array(s.replicas+1).fill(0) as number[];
 const version=(time:number)=>time<0?0:Math.min(Math.ceil(s.duration*s.writes),Math.floor((time+1e-8)*s.writes)+1);
 for(let i=0;i<s.duration*s.reads;i++){
  const time=(i+.5)/s.reads,primary=version(time),versions=lags.map(lag=>version(time-lag/1000));
  // Draw both values for every read so comparison policies share identical routing randomness.
  const useReplica=random()<s.replicaPercent/100,chosen=Math.floor(random()*s.replicas)+1;
  const sinceWrite=(time-(primary-1)/s.writes)*1000;
  const route=s.strategy==='primary'||(s.strategy==='window'&&sinceWrite<=s.windowMs)?0:useReplica?(s.strategy==='sticky'?1:chosen):0;
  const seen=route===0?primary:versions[route-1],fresh=seen===primary;
  const staleMs=fresh?0:(primary-seen)/s.writes*1000;
  utilization[route]++;reads.push({time,primary,versions,route,seen,fresh,staleMs});
 }
 const stale=reads.filter(r=>!r.fresh);
 return {settings:{...s},lags,reads,utilization,totalReads:reads.length,freshReads:reads.length-stale.length,staleReads:stale.length,stalePercent:stale.length/reads.length*100,worstStaleMs:Math.max(0,...stale.map(r=>r.staleMs)),averageStaleMs:stale.length?stale.reduce((n,r)=>n+r.staleMs,0)/stale.length:0};
}
