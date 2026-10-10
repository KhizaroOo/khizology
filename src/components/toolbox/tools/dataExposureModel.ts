export const exposureSections=['URL / query','URL hash','Cookies','localStorage dump','sessionStorage dump','Frontend configuration','Browser state JSON','Copied JSON payload'] as const;
export type ExposureSection=typeof exposureSections[number];
export type ExposureInput=Partial<Record<ExposureSection,string>>;
export interface ExposureFinding {location:ExposureSection;path:string;category:'Public'|'Personal / potentially sensitive'|'Authentication material'|'Secret / credential'|'Unknown / context needed';level:'PASS'|'WARN'|'FAIL'|'INFO';issue:string;masked:string;why:string;surface:string;direction:string;context:string}
const email=/\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,24}\b/i;
const jwt=/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{4,}\b/;
const knownSecret=/\b(?:AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/;
function safePath(path:string){return email.test(path)||jwt.test(path)||knownSecret.test(path)||/\d{9,15}/.test(path)?'[potentially sensitive key hidden]':path.slice(0,100);}
function decoded(value:string){let text=value;const kinds:string[]=[];for(let i=0;i<2;i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next;kinds.push('URL');}catch{break;}}
 if(text.length>=8&&text.length<=12000&&/^[A-Za-z0-9+/_-]+={0,2}$/.test(text)){try{const binary=atob(text.replace(/-/g,'+').replace(/_/g,'/'));const next=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));if(/^[\x20-\x7e\n\r\t]*$/.test(next)&&next!==text){text=next;kinds.push('Base64');}}catch{}}
 return {text,encoding:kinds.join(' + ')};}
export function analyzeDataExposure(input:ExposureInput){
 const entries=exposureSections.filter(s=>input[s]?.trim()).map(s=>[s,input[s]!] as const);
 if(!entries.length)throw Error('Paste at least one browser-data section.');
 if(entries.reduce((n,[,v])=>n+v.length,0)>100000)throw Error('Keep all sections together within 100,000 characters.');
 let visited=0;const findings:ExposureFinding[]=[];
 function inspect(location:ExposureSection,path:string,key:string,value:unknown,depth=0,encoding=''){
  if(++visited>2500||depth>16)throw Error('Use a smaller sample: maximum 2,500 values and 16 nesting levels.');
  if(value!==null&&typeof value==='object'){for(const [k,v] of Object.entries(value))inspect(location,`${path}.${safePath(k)}`,k,v,depth+1,encoding);return;}
  const raw=String(value??''),decode=decoded(raw),text=decode.text,via=[encoding,decode.encoding].filter(Boolean).join(' + ');
  if(text.length<12000&&/^[\[{]/.test(text)&&text!==raw){try{inspect(location,`${path}.[decoded]`,key,JSON.parse(text),depth+1,via);return;}catch(e){if(e instanceof Error&&e.message.startsWith('Use a smaller'))throw e;}}
  const url=location==='URL / query'||location==='URL hash',storage=location.includes('Storage'),config=location==='Frontend configuration';
  const surfaces=url?(location==='URL hash'?'History, copied links, screenshots, scripts and extensions. Fragments are not normally sent in HTTP requests or Referer.':'History, copied links, server/proxy logs and analytics; referrer disclosure depends on policy.'):
   storage?'Same-origin scripts/XSS, extensions, shared devices and storage retention.':location==='Cookies'?'Cookie transmission and browser access depend on Domain, Path, Secure, SameSite and HttpOnly.':'Browser-visible state, bundled configuration, developer tools, screenshots and debug logging.';
  let category:ExposureFinding['category']='Unknown / context needed',level:ExposureFinding['level']='INFO',issue='Unclassified value',why='No recognized exposure pattern; this does not prove the value is public.',direction='Confirm data classification, minimum need and retention.';
  const signal=`${path}.${key}`;
  const authKey=/(?:^|[_\-.])(?:access.?token|refresh.?token|token|jwt|session(?:id|_id)?|auth(?:orization)?|bearer)(?:$|[_\-.])/i.test(signal)||/^(accessToken|refreshToken|sessionId|authToken)$/i.test(key);
  const secretKey=/(password|passwd|secret|api.?key|private.?key|credential)/i.test(signal);
  const personalKey=/(email|phone|mobile|ssn|social.?security|passport|national.?id|user.?id|customer.?id|birth|address|medical|patient|salary|private.?payload|debug)/i.test(signal);
  const phone=url&&/^[+()\d\s.-]+$/.test(text)&&text.replace(/\D/g,'').length>=9&&text.replace(/\D/g,'').length<=15;
  if(jwt.test(text)||authKey){category='Authentication material';level=jwt.test(text)&&(url||storage||config)?'FAIL':'WARN';issue=jwt.test(text)?'JWT-like value exposed':'Authentication/session field needs review';why='Bearer/session material may grant access if live; field names alone cannot establish whether a value is active or confidential.';direction=url?'Remove authentication material from navigation URLs; use a reviewed authentication flow.':'Minimize JavaScript-readable authentication material; review token lifetime and the authentication threat model.';}
  else if(knownSecret.test(text)||secretKey){category='Secret / credential';level=knownSecret.test(text)?'FAIL':'WARN';issue=knownSecret.test(text)?'Credential-shaped value exposed':'Credential-like field needs review';why='Frontend-delivered credentials cannot be kept secret from the browser user; names may also describe public client identifiers.';direction='Determine whether this is a public identifier or real credential. Remove real secrets from client delivery and rotate any confirmed exposed live credential.';}
  else if(email.test(text)||phone||personalKey){category='Personal / potentially sensitive';level=url||storage||config?'WARN':'INFO';issue='Personal or private-looking data placement';why='Pattern and field-name signals suggest personal/debug data; legitimacy, consent and confidentiality require context.';direction=url?'Keep personal data out of shareable navigation; use non-sensitive state identifiers.':storage?'Store only necessary data with explicit retention, deletion and shared-device handling.':'Minimize client-visible payloads and disable unnecessary private debug output.';}
  else if(/^(theme|locale|language|page|sort|view|tab|color|public)$/i.test(key)){category='Public';level='PASS';issue='Public UI-state candidate';why='This key commonly represents public navigation/preferences; inspect its actual semantics before sharing.';direction='Keep only the smallest non-sensitive state required.';}
  findings.push({location,path:safePath(path),category,level,issue,masked:`[value hidden · ${raw.length} characters]`,why,surface:surfaces,direction,context:`${via?`${via} encoding was decoded locally; encoding is not encryption. `:''}Heuristic classification, not proof of sensitivity or a security audit.${location==='Cookies'?' Copied cookie values do not establish HttpOnly/transport flags.':''}`});
 }
 for(const [location,raw] of entries){
  if(location==='URL / query'){
   let url:URL;try{url=new URL(raw.trim());if(!['https:','http:'].includes(url.protocol))throw Error();}catch{throw Error('URL / query needs a complete http(s) URL.');}
   if(url.username)inspect(location,'$.username','credential',url.username);if(url.password)inspect(location,'$.password','password',url.password);
   inspect(location,'$.path','path',url.pathname);for(const [key,value] of url.searchParams)inspect(location,`$.query.${safePath(key)}`,key,value);if(url.hash){const hash=url.hash.slice(1);if(hash.includes('=')){for(const [key,value] of new URLSearchParams(hash))inspect('URL hash',`$.hash.${safePath(key)}`,key,value);}else inspect('URL hash','$.hash','hash',hash);}
  }else if(location==='URL hash'){
   const value=raw.trim().replace(/^#/,'');if(value.includes('=')){for(const [key,text] of new URLSearchParams(value))inspect(location,`$.hash.${safePath(key)}`,key,text);}else inspect(location,'$.hash','hash',value);
  }else{
   try{inspect(location,'$',location,JSON.parse(raw));}catch(e){if(e instanceof Error&&e.message.startsWith('Use a smaller'))throw e;
    if(location==='Cookies'){for(const pair of raw.split(';')){const at=pair.indexOf('=');if(at>0)inspect(location,`$.${safePath(pair.slice(0,at).trim())}`,pair.slice(0,at).trim(),pair.slice(at+1).trim());else if(pair.trim())inspect(location,'$.unparsed','cookie',pair.trim());}}
    else throw Error(`${location} needs valid JSON (object, array or JSON string).`);
   }
   if(location.includes('Storage')&&new TextEncoder().encode(raw).length>20000)findings.push({location,path:'$',category:'Unknown / context needed',level:'WARN',issue:'Large pasted storage sample',masked:'[contents hidden]',why:'Large synchronous storage serialization can block the main thread; this sample exceeds the editorial 20 KiB review threshold.',surface:'Persistent/tab storage and main-thread serialization.',direction:'Measure actual usage; avoid persisting raw payloads without a need and consider async storage for larger reviewed records.',context:'Pasted bytes are not actual browser quota usage. This is not a quota failure threshold.'});
  }
 }
 if(!findings.length)findings.push({location:entries[0][0],path:'$',category:'Unknown / context needed',level:'INFO',issue:'Empty structure',masked:'[no scalar values]',why:'No scalar content was available to classify.',surface:'No classified values.',direction:'Review actual data and delivery context.',context:'An empty sample is not evidence of safety.'});
 const posture=findings.some(f=>f.level==='FAIL')?'FAIL':findings.some(f=>f.level==='WARN')?'WARN':'INFO';
 return {posture,findings,note:'Only supplied data is inspected. All values are hidden in results; field-name signals need context. No browser data is read automatically, no network request is made and nothing is persisted.'};
}
