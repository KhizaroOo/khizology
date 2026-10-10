export const storageOptions=['Memory','URL/query/hash','sessionStorage','localStorage','IndexedDB','Cache API'] as const;
export interface StorageSettings {lifetime:'page'|'tab'|'restart';data:'view'|'preferences'|'records'|'files'|'responses';size:'tiny'|'small'|'large';sensitivity:'public'|'private'|'token';share:boolean;history:boolean;offline:boolean;frequent:boolean;tabs:boolean;expiry:boolean}
export const storageDefaults:StorageSettings={lifetime:'page',data:'view',size:'tiny',sensitivity:'public',share:false,history:false,offline:false,frequent:true,tabs:false,expiry:false};
export const storageNotes:Record<typeof storageOptions[number],{limitation:string;privacy:string;performance:string;alternative:string}>={
 Memory:{limitation:'Lost when the document/process is discarded; not durable offline state.',privacy:'JavaScript and XSS can still read accessible memory; clear sensitive values when no longer needed.',performance:'Fast access; excessive state or retained blobs consumes RAM.',alternative:'Use URL for public navigation or IndexedDB for durable structured data.'},
 'URL/query/hash':{limitation:'Public navigation state only; practical URL lengths and serialization are constrained.',privacy:'Query/path may reach servers and referrers. Hash avoids normal HTTP transmission but remains visible to history, scripts, extensions and sharing.',performance:'Small state is useful; frequent history updates require deliberate push/replace behavior.',alternative:'Keep private/large content in memory or a reviewed local store, with only non-sensitive navigation in URL.'},
 sessionStorage:{limitation:'String key/value data scoped to a tab session; opener copies and session restoration need consideration.',privacy:'Readable by same-origin JavaScript; not a safe vault for secrets or session tokens.',performance:'Synchronous serialization and storage can block the main thread; quota errors must be handled.',alternative:'Use memory for hot state or IndexedDB for larger async structured work.'},
 localStorage:{limitation:'String key/value data; no transactions across records, no native TTL or query indexes.',privacy:'Persistent same-origin JavaScript access; shared-device exposure and XSS remain risks.',performance:'Synchronous writes/serialization; unsuitable for large or high-frequency hot state.',alternative:'Use IndexedDB for transactional records; URL for public navigation; memory for ephemeral data.'},
 IndexedDB:{limitation:'Async transactions and schema upgrades add complexity; persistence is not guaranteed and data can be cleared/evicted.',privacy:'Local persistence is not automatically secure. Define consent, deletion, retention and threat model for private data.',performance:'Suitable for structured records and blobs, but batching, indexes and quota handling still matter.',alternative:'Use memory for hot state, localStorage for tiny public preferences or Cache API for responses.'},
 'Cache API':{limitation:'Designed around Request/Response pairs, usually on secure origins; expiration and update strategy are application responsibilities.',privacy:'Do not cache authenticated/private responses indiscriminately. Same-origin code and shared devices can expose cached data.',performance:'Useful async response cache; request matching and storage eviction need handling.',alternative:'Use IndexedDB for queryable records/files and memory or URL for UI state.'},
};
export function decideClientStorage(s:StorageSettings){
 if(!['page','tab','restart'].includes(s.lifetime)||!['view','preferences','records','files','responses'].includes(s.data)||!['tiny','small','large'].includes(s.size)||!['public','private','token'].includes(s.sensitivity))throw Error('Choose supported storage requirements.');
 const rules:Array<{label:string;weight:number;points:number[]}>=[];
 const rule=(label:string,weight:number,points:number[])=>rules.push({label,weight,points});
 rule(`Data: ${s.data}`,3,({view:[4,4,3,2,1,0],preferences:[4,2,3,4,2,0],records:[3,0,1,1,4,1],files:[2,0,0,0,4,2],responses:[2,0,0,0,2,4]} as const)[s.data].slice());
 rule(`Lifetime: ${s.lifetime}`,3,({page:[4,3,3,2,2,2],tab:[1,2,4,2,3,2],restart:[0,3,0,3,4,4]} as const)[s.lifetime].slice());
 rule(`Size: ${s.size}`,2,({tiny:[4,4,4,4,2,2],small:[3,0,2,2,4,3],large:[2,0,0,0,4,4]} as const)[s.size].slice());
 if(s.share)rule('Shareable navigation',3,[0,4,0,0,0,0]);if(s.history)rule('Back / Forward restores state',3,[0,4,0,0,0,0]);if(s.offline)rule('Durable offline data',2,[0,1,2,2,4,4]);if(s.frequent)rule('High-frequency writes',2,[4,1,1,1,3,2]);if(s.tabs)rule('Multiple-tab coordination',2,[1,2,0,3,4,3]);if(s.expiry)rule('Expiration required',1,[3,1,2,2,3,3]);
 const max=rules.reduce((n,r)=>n+r.weight*4,0);
 const ranked=storageOptions.map((name,i)=>{
  const blocked:string[]=[];const ephemeral=name==='Memory'||name==='sessionStorage';
  if(s.lifetime==='restart'&&ephemeral)blocked.push('Does not provide restart durability.');if(s.lifetime==='tab'&&name==='Memory')blocked.push('Does not survive document refresh.');
  if(name==='URL/query/hash'&&(s.sensitivity!=='public'||s.size!=='tiny'||['files','responses','records'].includes(s.data)))blocked.push('URL is unsuitable for this private/large/structured payload.');
  if(s.size==='large'&&['sessionStorage','localStorage'].includes(name))blocked.push('Large data exceeds the intended small synchronous-storage workload.');
  if(s.sensitivity==='token'&&name!=='Memory')blocked.push('Do not place session/authentication tokens in this mechanism by default.');
  if((s.share||s.history)&&name!=='URL/query/hash')blocked.push('Does not itself encode shareable or browser-history navigation.');
  if(s.offline&&name==='Memory')blocked.push('Ephemeral memory is not a durable offline data store.');
  const breakdown=rules.map(r=>({label:r.label,weight:r.weight,points:r.points[i],earned:r.weight*r.points[i]})),earned=breakdown.reduce((n,r)=>n+r.earned,0);
  return {name,fit:Math.round(earned/max*100),earned,max,breakdown,blocked,notes:storageNotes[name]};
 }).sort((a,b)=>Number(a.blocked.length>0)-Number(b.blocked.length>0)||b.fit-a.fit);
 return {ranked,winner:ranked.find(r=>!r.blocked.length),privateData:s.sensitivity!=='public',mixed:(s.share||s.history)&&(s.sensitivity!=='public'||s.size!=='tiny'),token:s.sensitivity==='token'};
}
