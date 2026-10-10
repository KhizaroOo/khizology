export const chaosCategories=['Presence','Numbers','Strings','Booleans','Arrays','Objects'] as const;
export type ChaosCategory=typeof chaosCategories[number];
type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
type Segment=string|number;
export interface ChaosCase {id:string;path:string;mutation:string;purpose:string;category:ChaosCategory;concern:string;payload:Json}
const clone=(v:Json):Json=>JSON.parse(JSON.stringify(v));
const pathName=(parts:Segment[])=>'$'+parts.map(p=>typeof p==='number'?`[${p}]`:`[${JSON.stringify(p)}]`).join('');
export function buildChaosPack(raw:string,categories:ChaosCategory[],limit=30){
 if(!raw.trim())throw Error('Paste a JSON object or array.');if(raw.length>100000)throw Error('Input limit: 100,000 characters.');
 if(!categories.length||categories.some(c=>!chaosCategories.includes(c)))throw Error('Select at least one supported mutation category.');
 if(!Number.isInteger(limit)||limit<1||limit>40)throw Error('Choose 1–40 cases.');
 const original:Json=JSON.parse(raw);if(original===null||typeof original!=='object')throw Error('The root must be a JSON object or array.');
 const nodes:Array<{value:Json;parts:Segment[];arrayParent:boolean}>=[];
 function walk(value:Json,parts:Segment[],arrayParent=false){if(nodes.length>=2000||parts.length>16)throw Error('Limit input to 2,000 values and 16 nesting levels.');if(typeof value==='number'&&(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value))))throw Error('Use finite numbers and safe integers in the source; encode larger exact integers as strings.');nodes.push({value,parts,arrayParent});if(value&&typeof value==='object')for(const [key,v] of Object.entries(value))walk(v,[...parts,Array.isArray(value)?Number(key):key],Array.isArray(value));}
 walk(original,[]);
 const cases:ChaosCase[]=[];let bytes=0,candidates=0,limited=false;
 function add(parts:Segment[],category:ChaosCategory,mutation:string,value:Json|undefined,purpose:string,remove=false){
  if(!categories.includes(category))return;candidates++;
  if(cases.length>=limit){limited=true;return;}
  let payload=clone(original);
  if(!parts.length)payload=value!;
  else {let parent=payload as {[key:string]:Json};for(const part of parts.slice(0,-1))parent=parent[part] as {[key:string]:Json};const key=parts.at(-1)!;if(remove)delete parent[key];else Object.defineProperty(parent,key,{value:clone(value!),writable:true,enumerable:true,configurable:true});}
  if(JSON.stringify(payload)===JSON.stringify(original))return;
  const size=JSON.stringify(payload).length;
  if(bytes+size>2000000){limited=true;return;}
  bytes+=size;cases.push({id:`CASE-${String(cases.length+1).padStart(3,'0')}`,path:pathName(parts),mutation,purpose,category,concern:category==='Presence'?'Requiredness / nullability':category==='Numbers'?'Numeric range / type':category==='Strings'?'Text length / encoding':category==='Booleans'?'Boolean type coercion':category==='Arrays'?'Cardinality / element validation':'Object shape / depth',payload});
 }
 for(const {value:v,parts,arrayParent} of nodes){
  if(parts.length&&!arrayParent)add(parts,'Presence','Remove field',undefined,'Check missing-field handling.',true);
  if(v!==null)add(parts,'Presence','Set null',null,'Check nullability separately from absence.');
  if(typeof v==='number'){
   for(const [label,value] of [['Zero',0],['Negative',-Math.max(1,Math.abs(v))],['Integer plus fraction',Number.isInteger(v)?v+.5:v],['Large safe integer',Number.MAX_SAFE_INTEGER],['Beyond safe integer',Number.MAX_SAFE_INTEGER+1],['Small positive',Number.EPSILON],['String instead of number',String(v)]] as Array<[string,Json]>)add(parts,'Numbers',label,value,'Probe range, precision and type checks; actual contract boundaries are unknown.');
  }else if(typeof v==='string'){
   for(const [label,value] of [['Empty string',''],['Whitespace','   '],['Long string (2,048 chars)','x'.repeat(2048)],['Unicode','東京 · café · العربية'],['Emoji','🧪🚀'],['Newline and tab','line one\nline two\tend'],['Numeric string','123'],['Boolean-like string','false']])add(parts,'Strings',label,value,'Probe text length, encoding and coercion without assuming rejection.');
  }else if(typeof v==='boolean'){
   for(const value of ['true','false',1,0,null] as Json[])add(parts,'Booleans',`Boolean → ${JSON.stringify(value)}`,value,'Check strict booleans, coercion and nullability.');
  }else if(Array.isArray(v)){
   add(parts,'Arrays','Empty array',[],'Check minimum cardinality.');
   if(v.length){add(parts,'Arrays','One item',[clone(v[0])],'Check cardinality handling.');add(parts,'Arrays','Duplicate items',[clone(v[0]),clone(v[0])],'Check uniqueness assumptions.');const count=Math.max(1,Math.min(100,Math.floor(100000/Math.max(1,JSON.stringify(v[0]).length))));add(parts,'Arrays',`Expanded sample (${count} items)`,Array.from({length:count},()=>clone(v[0])),'Check bounded collection handling.');}
   add(parts,'Arrays','Wrong element type',[typeof v[0]==='string'?42:'__unexpected_type__'],'Check element type rules; no schema is inferred.');add(parts,'Arrays','Null entry',[null],'Check null items separately from a null array.');
  }else if(v&&typeof v==='object'){
   add(parts,'Objects','Empty object',{},'Check required nested properties.');
   const extra=clone(v) as {[key:string]:Json};let key='_unexpected';while(Object.hasOwn(extra,key))key+='_';Object.defineProperty(extra,key,{value:'test-only',enumerable:true,writable:true,configurable:true});add(parts,'Objects','Unknown property',extra,'Check handling of additional properties.');
   add(parts,'Objects','Deeper nesting',{nested:{nested:{value:clone(v)}}},'Check expected object shape and nesting limits.');
  }
 }
 return {cases,limited,candidates,characters:bytes,limits:{inputCharacters:100000,values:2000,depth:16,cases:limit,outputCharacters:2000000},assumption:'Mutations are test inputs, not proven invalid requests. The API schema and expected HTTP status are unknown.'};
}
