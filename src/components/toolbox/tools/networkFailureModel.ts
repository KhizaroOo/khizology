export const retryStrategies=['None','Immediate','Fixed','Exponential','Exponential + jitter'] as const;
export type RetryStrategy=typeof retryStrategies[number];
export interface NetworkSettings {latency:number;jitter:number;failureRate:number;timeout:number;retries:number;backoff:number;maxBackoff:number;jitterPercent:number;retryAfter:number;requests:number;seed:number;mode:'intermittent'|'offline'|'recovery'|'slow'|'429'|'500'|'502'|'503';recoveryAt:number;requestType:'read'|'write';idempotent:boolean}
export const networkDefaults:NetworkSettings={latency:250,jitter:100,failureRate:35,timeout:1000,retries:3,backoff:200,maxBackoff:2000,jitterPercent:30,retryAfter:1000,requests:12,seed:42,mode:'intermittent',recoveryAt:1200,requestType:'read',idempotent:true};
export interface NetworkAttempt {request:number;attempt:number;latency:number;outcome:string;retryWait:number;cumulativeWait:number;clock:number;sequence:string}
export function simulateNetwork(s:NetworkSettings,strategy:RetryStrategy){
 for(const [key,min,max,integer] of [['latency',0,10000,false],['jitter',0,10000,false],['failureRate',0,100,false],['timeout',1,30000,false],['retries',0,5,true],['backoff',0,10000,false],['maxBackoff',0,30000,false],['jitterPercent',0,100,false],['retryAfter',0,30000,false],['requests',1,100,true],['seed',0,4294967295,true],['recoveryAt',0,120000,false]] as const){const v=s[key];if(!Number.isFinite(v)||v<min||v>max||integer&&!Number.isInteger(v))throw Error(`Use a valid ${key}: ${min}–${max}${integer?' (whole number)':''}.`);}
 if(s.maxBackoff<s.backoff)throw Error('Maximum backoff must be at least the initial backoff.');
 if(!retryStrategies.includes(strategy)||!['intermittent','offline','recovery','slow','429','500','502','503'].includes(s.mode)||!['read','write'].includes(s.requestType))throw Error('Choose valid network and retry settings.');
 // Indexed draws keep each request/attempt comparable even when strategies consume different retries.
 const random=(request:number,attempt:number,channel:number)=>{let x=(s.seed^Math.imul(request+1,2654435761)^Math.imul(attempt+1,1597334677)^Math.imul(channel+1,2246822519))>>>0;x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;x=Math.imul(x,3266489909);return ((x^(x>>>16))>>>0)/4294967296;};
 const trace:NetworkAttempt[]=[];let clock=0,successes=0,firstSuccesses=0,timeouts=0,failures=0,duplicateRisk=0;const waits:number[]=[];
 for(let r=0;r<s.requests;r++){let waited=0;for(let a=0;a<=(strategy==='None'?0:s.retries);a++){
  const offline=s.mode==='offline'||s.mode==='recovery'&&clock<s.recoveryAt;
  const actualLatency=Math.max(0,Math.round(s.latency+(random(r,a,0)*2-1)*s.jitter))*(s.mode==='slow'?4:1);
  const latency=offline?0:Math.min(actualLatency,s.timeout);
  let outcome=offline?'Offline':actualLatency>s.timeout?'Timeout':s.mode==='429'||s.mode==='500'||s.mode==='502'||s.mode==='503'?`HTTP ${s.mode}`:s.mode==='intermittent'&&random(r,a,1)*100<s.failureRate?(['HTTP 500','HTTP 502','HTTP 503'][Math.floor(random(r,a,2)*3)]):'Success';
  const success=outcome==='Success';if(success){successes++;if(a===0)firstSuccesses++;}else{failures++;if(outcome==='Timeout')timeouts++;}
  const retry=!success&&strategy!=='None'&&a<s.retries;
  let retryWait=0;if(retry){retryWait=strategy==='Immediate'?0:strategy==='Fixed'?Math.min(s.backoff,s.maxBackoff):Math.min(s.backoff*2**a,s.maxBackoff);if(strategy==='Exponential + jitter')retryWait*=1-s.jitterPercent/100+random(r,a,3)*s.jitterPercent/100;if(outcome==='HTTP 429')retryWait=Math.max(retryWait,s.retryAfter);retryWait=Math.round(retryWait);}
  waited+=latency;clock+=latency;
  if(a>0&&s.requestType==='write'&&!s.idempotent)duplicateRisk++;
  trace.push({request:r+1,attempt:a+1,latency,outcome,retryWait,cumulativeWait:waited,clock,sequence:`Send → ${offline?'Unavailable':`Wait ${latency}ms`} → ${outcome}${retry?` → Backoff ${retryWait}ms → Retry`:success?' → Complete':' → Stop / exhaustion'}`});
  waited+=retryWait;clock+=retryWait;if(!retry)break;
 }waits.push(waited);}
 return {strategy,trace,totalRequests:s.requests,totalAttempts:trace.length,retriesGenerated:trace.length-s.requests,successRate:successes/s.requests*100,initialSuccessRate:firstSuccesses/s.requests*100,failedRequests:s.requests-successes,averageWait:waits.reduce((n,v)=>n+v,0)/waits.length,worstWait:Math.max(...waits),timeouts,failedAttempts:failures,duplicateRisk,retryAmplification:trace.length/s.requests,note:'Sequential requests on a virtual clock. Offline fails immediately; slow mode multiplies sampled latency by four. Status modes fail every attempt. Recovery becomes available at the chosen global virtual time. No contention, real traffic, server completion or production reliability is predicted.'};
}
