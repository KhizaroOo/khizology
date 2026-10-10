export const messagingPatterns=['Queue','Pub/Sub','Event Stream'] as const;
export interface MessagingQuestion {id:string;label:string;weight:number;options:Array<{value:string;label:string;points:[number,number,number]}>}
export const messagingQuestions:MessagingQuestion[]=[
 {id:'delivery',label:'Who should process each message?',weight:3,options:[{value:'work',label:'One worker from a competing pool',points:[4,1,2]},{value:'fanout',label:'Several independent subscriber groups',points:[0,4,4]}]},
 {id:'replay',label:'Must consumers replay past messages?',weight:3,options:[{value:'no',label:'No replay needed',points:[4,4,2]},{value:'yes',label:'Yes, reprocess from a chosen position',points:[0,1,4]}]},
 {id:'history',label:'What history is required?',weight:3,options:[{value:'none',label:'Remove after successful processing',points:[4,3,1]},{value:'short',label:'Retain until delivery / short retry window',points:[4,4,3]},{value:'long',label:'Retained event history for audit or rebuilding',points:[0,1,4]}]},
 {id:'ordering',label:'Required processing order?',weight:2,options:[{value:'none',label:'No ordering requirement',points:[4,4,3]},{value:'key',label:'Order within each entity / key',points:[3,2,4]},{value:'global',label:'One total order across all events',points:[2,1,2]}]},
 {id:'offline',label:'Can consumers be offline for extended periods?',weight:2,options:[{value:'no',label:'Mostly online; short retry is enough',points:[4,4,3]},{value:'yes',label:'Catch up after long disconnections',points:[3,2,4]}]},
 {id:'independence',label:'Do consumers need independent progress?',weight:2,options:[{value:'no',label:'One shared work backlog',points:[4,2,2]},{value:'yes',label:'Each group controls its own progress',points:[1,4,4]}]},
 {id:'throughput',label:'Workload shape?',weight:1,options:[{value:'moderate',label:'Moderate command / notification traffic',points:[4,4,3]},{value:'high',label:'Sustained high-volume ordered event ingestion',points:[2,3,4]}]},
 {id:'complexity',label:'Operational complexity tolerance?',weight:2,options:[{value:'low',label:'Prefer a simple work / delivery model',points:[4,3,1]},{value:'flexible',label:'Can manage retention, positions and partitions',points:[3,3,4]}]},
];
export const messagingDefaults=Object.fromEntries(messagingQuestions.map(q=>[q.id,q.options[0].value]));
export function decideMessaging(input:Record<string,string>){
 const answers=messagingQuestions.map(q=>{const answer=q.options.find(o=>o.value===input[q.id]);if(!answer)throw Error(`Choose an answer for ${q.label}`);return {question:q,answer};});
 const max=messagingQuestions.reduce((n,q)=>n+q.weight*4,0);
 const ranked=messagingPatterns.map((name,index)=>{const breakdown=answers.map(({question:q,answer:a})=>({signal:q.label,answer:a.label,weight:q.weight,points:a.points[index],earned:q.weight*a.points[index]}));const earned=breakdown.reduce((n,b)=>n+b.earned,0);return {name,earned,max,percent:Math.round(earned/max*100),breakdown};}).sort((a,b)=>b.earned-a.earned);
 return {ranked,close:ranked[0].percent-ranked[1].percent<=8,globalOrder:input.ordering==='global',tension:input.replay==='yes'&&input.complexity==='low'};
}
export const messagingTradeoffs:Record<typeof messagingPatterns[number],{strength:string;weakness:string;alternative:string}>={
 'Queue':{strength:'A work item is normally processed by one worker; acknowledgements, retries and competing workers organize a shared backlog.',weakness:'An acknowledged work item is usually removed. Independent replayable history and broadcast are separate concerns.',alternative:'Choose Pub/Sub for multiple delivery audiences, or Event Stream when retained history and consumer positions are essential.'},
 'Pub/Sub':{strength:'One published event can reach multiple independent subscriptions. Each audience can apply its own processing.',weakness:'Durable delivery, replay, retention and ordering vary by implementation; the pattern alone does not guarantee them.',alternative:'Choose Queue for one shared work backlog, or Event Stream for a retained log with independent replay positions.'},
 'Event Stream':{strength:'A retained log lets consumer groups advance independently and replay within the retention window.',weakness:'Partition keys, retention, lag and consumer positions add decisions. Key ordering does not imply global ordering.',alternative:'Choose Queue for straightforward work distribution, or Pub/Sub for fan-out notifications without a retained-log requirement.'},
};
