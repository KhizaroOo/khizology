export const transports = ['Polling','Long Polling','SSE','WebSocket','WebTransport'] as const;
type Points = [number,number,number,number,number];
interface Question {id:string;label:string;weight:number;options:{value:string;label:string;points:Points}[]}
export const transportQuestions:Question[] = [
 {id:'direction',label:'Message direction',weight:3,options:[{value:'server',label:'Server → browser; occasional writes use HTTP',points:[4,4,4,2,1]},{value:'both',label:'Frequent two-way messages',points:[1,2,1,4,4]}]},
 {id:'frequency',label:'Update pattern',weight:3,options:[{value:'occasional',label:'Occasional (30–60 seconds or longer)',points:[4,3,3,2,1]},{value:'seconds',label:'Every few seconds',points:[2,3,4,4,2]},{value:'continuous',label:'Continuous / high frequency',points:[0,1,3,4,4]}]},
 {id:'data',label:'Data type',weight:2,options:[{value:'text',label:'Text / JSON',points:[4,4,4,4,3]},{value:'binary',label:'Binary',points:[3,3,0,4,4]},{value:'mixed',label:'Mixed text and binary',points:[3,3,1,4,4]}]},
 {id:'latency',label:'Freshness need',weight:3,options:[{value:'seconds',label:'Seconds acceptable',points:[4,4,4,3,2]},{value:'subsecond',label:'Sub-second preferred',points:[1,3,4,4,4]},{value:'critical',label:'Very low latency critical',points:[0,2,2,3,4]}]},
 {id:'backend',label:'Backend capability',weight:3,options:[{value:'request',label:'Short HTTP requests only',points:[4,0,0,0,0]},{value:'long',label:'Long-lived responses and connections supported',points:[3,4,4,4,3]},{value:'static',label:'Static files only; no live service',points:[0,0,0,0,0]}]},
 {id:'complexity',label:'Operational complexity tolerance',weight:2,options:[{value:'low',label:'Minimal',points:[4,3,4,2,0]},{value:'moderate',label:'Moderate',points:[4,4,4,4,2]},{value:'advanced',label:'Advanced acceptable',points:[4,4,4,4,4]}]},
 {id:'reconnect',label:'Automatic browser reconnection important?',weight:2,options:[{value:'yes',label:'Yes',points:[3,2,4,1,1]},{value:'no',label:'Application can implement recovery',points:[4,4,4,4,4]}]},
 {id:'ordered',label:'Ordered delivery within one logical feed?',weight:1,options:[{value:'yes',label:'Required',points:[2,2,4,4,3]},{value:'no',label:'Not required',points:[4,4,4,4,4]}]},
 {id:'loss',label:'Can stale intermediate updates be lost?',weight:2,options:[{value:'no',label:'No; reliable messages needed',points:[2,3,4,4,4]},{value:'yes',label:'Yes; freshest state matters',points:[4,4,4,4,4]}]},
 {id:'resume',label:'Resume missed events after disconnect?',weight:2,options:[{value:'yes',label:'Required',points:[2,2,4,2,2]},{value:'no',label:'Latest state is sufficient',points:[4,4,4,4,4]}]},
 {id:'compatibility',label:'Browser support target',weight:2,options:[{value:'broad',label:'Widest compatibility / older clients',points:[4,4,4,4,1]},{value:'modern',label:'Tested modern browser targets',points:[4,4,4,4,4]}]},
 {id:'http',label:'Transport infrastructure verified',weight:2,options:[{value:'ordinary',label:'Ordinary HTTP; no verified WebTransport endpoint',points:[4,4,4,4,0]},{value:'h2',label:'HTTP/2; no verified WebTransport endpoint',points:[4,4,4,4,0]},{value:'h3',label:'HTTP/3 + WebTransport server and network path',points:[4,4,4,4,4]}]},
 {id:'proxy',label:'Proxy / load-balancer path',weight:1,options:[{value:'unknown',label:'Present or unknown; streaming not verified',points:[4,2,2,2,1]},{value:'verified',label:'Timeouts, buffering and upgrades verified',points:[4,4,4,4,4]}]},
 {id:'capability',label:'Special transport need',weight:3,options:[{value:'messages',label:'Ordinary application messages',points:[4,4,4,4,1]},{value:'streams',label:'Independent reliable streams',points:[1,1,1,2,4]},{value:'datagrams',label:'Unreliable datagrams for fresh state',points:[0,0,0,0,4]}]},
];
export const transportDefaults:Record<string,string> = Object.fromEntries(transportQuestions.map(q=>[q.id,q.options[0].value]));
Object.assign(transportDefaults,{backend:'long',frequency:'seconds',resume:'no'});
export const transportScaleDefaults = {users:1000,eventRate:0.2,duration:30,pollInterval:30};
export const transportPresets:Record<string,Record<string,string>> = {
 'Notification Feed':{},
 'Live Dashboard':{frequency:'seconds',latency:'subsecond',reconnect:'yes',resume:'no'},
 'Chat Application':{direction:'both',frequency:'seconds',latency:'subsecond',complexity:'moderate',reconnect:'no',resume:'yes'},
 'Multiplayer Game':{direction:'both',frequency:'continuous',data:'binary',latency:'critical',complexity:'advanced',reconnect:'no',loss:'yes',ordered:'no',compatibility:'modern'},
 'Job Progress Updates':{frequency:'seconds',latency:'subsecond',resume:'no'},
 'Collaborative Editor':{direction:'both',frequency:'continuous',latency:'subsecond',complexity:'moderate',reconnect:'no',resume:'yes'},
 'Basic Status Check':{backend:'request',frequency:'occasional',latency:'seconds',complexity:'low',resume:'no'},
 'Modern Streams / Datagrams':{direction:'both',frequency:'continuous',data:'binary',latency:'critical',complexity:'advanced',reconnect:'no',loss:'yes',ordered:'no',compatibility:'modern',http:'h3',proxy:'verified',capability:'datagrams'},
};
export const transportNotes:Record<typeof transports[number],{flow:string;tradeoff:string;switchWhen:string;bestWhen:string}> = {
 'Polling':{bestWhen:'Freshness can follow the polling interval and a simple request backend is the priority.',flow:'Browser → periodic HTTP request → Server → response → Browser',tradeoff:'Requests repeat even with no changes. Poll spacing sets a freshness floor; history needs an application cursor.',switchWhen:'Move toward SSE when one-way text updates need lower latency; toward WebSocket for frequent two-way messages.'},
 'Long Polling':{bestWhen:'Held requests work but response streaming or WebSocket upgrades do not; accept connection churn.',flow:'Browser → held HTTP request → Server → event response → next request',tradeoff:'Each response requires a new request. Held-request timeouts, retry backoff and event cursors remain application responsibilities.',switchWhen:'Prefer SSE for one-way text once response streaming works end-to-end; WebSocket when persistent two-way or binary traffic justifies its lifecycle cost.'},
 'SSE':{bestWhen:'Updates are mainly one-way text and HTTP writes can handle occasional client actions.',flow:'Browser ← text/event-stream ← Server · writes via separate HTTP requests',tradeoff:'Native EventSource is text-only and one-way. IDs aid resume, but the server must retain and replay events. HTTP/1 connection limits and proxy buffering need review.',switchWhen:'Move toward WebSocket for frequent client messages or binary traffic; keep SSE for one-way feeds.'},
 'WebSocket':{bestWhen:'Frequent two-way or binary messages justify managing connection lifecycle and recovery.',flow:'Browser ⇄ persistent WebSocket messages ⇄ Server',tradeoff:'Implement reconnect, replay, authentication renewal and bounded buffering. Reliable in-connection order is not durable delivery or exactly-once processing.',switchWhen:'Prefer SSE for simpler one-way text feeds; consider WebTransport only for a verified need for independent streams or datagrams.'},
 'WebTransport':{bestWhen:'Independent streams or disposable datagrams are essential and the exact browser/server path is verified.',flow:'Browser ⇄ reliable streams / unreliable datagrams ⇄ WebTransport server',tradeoff:'Verify exact browser and server support, secure context, network path and fallback. Streams order bytes per stream; datagrams can be lost or reordered. Reconnect and replay are application concerns.',switchWhen:'Prefer WebSocket for ordinary two-way messages, or SSE for one-way text, when advanced transport capabilities are unnecessary.'},
};
export function decideTransport(input:Record<string,string>,scale=transportScaleDefaults){
 const answers=transportQuestions.map(q=>{const a=q.options.find(o=>o.value===input[q.id]);if(!a)throw Error(`Choose a valid answer for ${q.label}.`);return {q,a};});
 for(const key of Object.keys(transportScaleDefaults) as (keyof typeof scale)[]){const n=scale[key];if(!Number.isFinite(n)||n>1e9||n<(key==='eventRate'?0:key==='users'?1:0.001))throw Error('Use finite scale values up to 1 billion: at least 1 user, nonnegative event rate, and at least 0.001 minutes/seconds.');}
 const extra=[{signal:'Concurrent users',answer:`${scale.users} users (editorial high-scale threshold: 10,000)`,weight:1,points:(scale.users>=10000?[1,2,3,3,3]:[4,4,4,4,4]) as Points},{signal:'Events per user per second',answer:`${scale.eventRate} events/user/s (high-frequency threshold: 5)`,weight:2,points:(scale.eventRate>=5?[0,1,3,4,4]:[4,4,4,4,3]) as Points},{signal:'Connection duration',answer:`${scale.duration} minutes (long-session threshold: 60)`,weight:1,points:(scale.duration>=60?[3,2,3,3,3]:[4,4,4,4,4]) as Points}];
 const signals=[...answers.map(({q,a})=>({signal:q.label,answer:a.label,weight:q.weight,points:a.points})),...extra];
 const max=signals.reduce((n,s)=>n+4*s.weight,0);
 const ranked=transports.map((name,index)=>{
  const breakdown=signals.map(s=>({...s,points:s.points[index],earned:s.points[index]*s.weight}));
  const earned=breakdown.reduce((n,b)=>n+b.earned,0),blocked:string[]=[];
  if(input.backend==='static')blocked.push('A live backend / upstream service is required; static hosting alone is insufficient.');
  if(input.backend==='request'&&index>0)blocked.push('Declared backend does not support held responses or persistent connections.');
  if(name==='WebTransport'&&input.http!=='h3')blocked.push('This lab requires a verified HTTP/3 WebTransport path; HTTP/2-only variants are outside its scope.');
  if(name==='SSE'&&input.data!=='text')blocked.push('Native EventSource cannot carry binary directly; encoding or a different transport is required.');
  if(input.capability==='datagrams'&&name!=='WebTransport')blocked.push('No native unreliable datagrams; application-level stale-update dropping is a different design.');
  return {name,earned,max,percent:Math.round(earned/max*100),breakdown,blocked};
 }).sort((a,b)=>Number(a.blocked.length>0)-Number(b.blocked.length>0)||b.earned-a.earned);
 const eligible=ranked.filter(r=>r.blocked.length===0),warnings:string[]=[];
 if(input.capability==='streams')warnings.push('WebSocket supplies one ordered channel. Application multiplexing is not independent transport streams; validate head-of-line and flow-control needs before substituting it for WebTransport.');
 if(input.resume==='yes')warnings.push('No transport guarantees durable replay. Define event IDs, retained history, authorization, gap handling and deduplication; SSE reconnect IDs are only a mechanism.');
 if(input.proxy==='unknown'&&input.backend==='long')warnings.push('Validate idle timeouts, buffering and protocol support across the full proxy/load-balancer path before adoption.');
 if(input.loss==='no'&&input.capability==='datagrams')warnings.push('Reliable delivery conflicts with unreliable datagrams. Split reliable control messages from disposable updates, or revise this requirement.');
 if(input.ordered==='yes'&&input.capability==='datagrams')warnings.push('Datagrams do not provide ordered delivery. Use a reliable stream or explicit sequencing where required.');
 if(input.frequency==='occasional'&&scale.eventRate>=5)warnings.push('The occasional-update answer conflicts with the entered high event rate. Resolve the workload description before choosing.');
 if(input.compatibility==='broad'&&input.capability!=='messages')warnings.push('Advanced stream/datagram needs require exact browser checks and a fallback; a modern API is not a universal compatibility guarantee.');
 if(input.complexity==='low'&&input.capability!=='messages')warnings.push('Independent streams/datagrams add operational complexity despite the minimal-complexity preference.');
 if(input.latency!=='seconds'&&input.backend==='request')warnings.push('Short-request infrastructure constrains push. Polling may not meet the selected freshness requirement; validate or change the backend.');
 if(input.ordered==='yes')warnings.push('Transport order is scoped to a connection or stream; reconnects, parallel requests and processing need application sequencing.');
 return {ranked,eligible,warnings,close:eligible.length>1&&eligible[0].percent-eligible[1].percent<=8,pollRequests:scale.users/scale.pollInterval,deliveries:scale.users*scale.eventRate};
}
