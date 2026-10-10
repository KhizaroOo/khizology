export interface TimeFinding { level: 'WARN'|'FAIL'; issue: string; why: string; action: string }
export interface TimeField { path: string; value: string|number; format: string; offset: string; ms?: number; findings: TimeFinding[] }
const timeKey = /(?:date|time|timestamp|epoch|(?:created|updated|expires|started|ended|deleted|issued|occurred)(?:_?at)?$)/i;
const finding = (level: 'WARN'|'FAIL', issue: string, why: string, action: string): TimeFinding => ({level,issue,why,action});
export function inspectTimestamp(value: string|number, path='$'): TimeField {
  const field: TimeField={path,value,format:'Unrecognized',offset:'Unknown',findings:[]};
  const warn=(issue:string,why:string,action:string)=>field.findings.push(finding('WARN',issue,why,action));
  const fail=(issue:string)=>field.findings.push(finding('FAIL',issue,'Consumers cannot reliably parse this value as a supported timestamp.','Use a valid calendar date and an explicit offset, or document an epoch unit.'));
  const text=String(value).trim();
  if(typeof value==='number'||/^-?\d+(?:\.\d+)?$/.test(text)) {
    const n=Number(value),seconds=Math.abs(n)<1e11;
    field.format=seconds?'Unix seconds (assumed)':'Unix milliseconds (assumed)';field.offset='Epoch / UTC';field.ms=seconds?n*1000:n;
    warn('Epoch unit inferred','Magnitude suggests a unit; small millisecond values and far-future second values are ambiguous.','Specify seconds or milliseconds in the API contract; prefer an offset-bearing ISO timestamp.');
    if(n<=0)warn('Zero or negative epoch','This may be a sentinel or an intentional pre-1970 instant.','Confirm the meaning rather than treating zero as missing.');
    if(!Number.isFinite(field.ms)||Math.abs(field.ms)>8.64e15){field.ms=undefined;fail('Epoch outside supported range');}
  } else {
    const m=/^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?([Zz]|[+-]\d{2}:\d{2})?)?$/.exec(text);
    if(!m){fail('Invalid or unsupported timestamp');return field;}
    const [,ys,mos,ds,hs,mins,ss,frac,offset]=m,y=Number(ys),mo=Number(mos),d=Number(ds),h=Number(hs||0),min=Number(mins||0),s=Number(ss||0);
    const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if(mo<1||mo>12||d<1||d>days[mo-1]||h>23||min>59||s>59){fail(s===60?'Leap second requires a specialized parser':'Impossible calendar date or time');return field;}
    if(!hs){field.format='Date only';field.offset='Not an instant';warn('Date-only value','A calendar date can be correct for birthdays or billing days, but does not identify an instant.','Keep date-only semantics explicit; do not silently add midnight UTC.');return field;}
    field.format=offset?'ISO datetime with offset':'Local datetime';field.offset=offset||'Missing';
    if(!offset){warn('Missing timezone / ambiguous local datetime','The same wall-clock time denotes different instants by timezone; DST can repeat or skip local times.','Supply an explicit UTC offset. For civil-time scheduling, also retain the intended IANA timezone; DST cannot be resolved from this value alone.');return field;}
    let offsetMinutes=0;
    if(!/z/i.test(offset)){const oh=Number(offset.slice(1,3)),om=Number(offset.slice(4,6));if(oh>23||om>59){fail('Invalid UTC offset');return field;}offsetMinutes=(oh*60+om)*(offset[0]==='-'?-1:1);}
    // setUTCFullYear avoids Date.UTC interpreting years 00–99 as 1900–1999.
    const date=new Date(0);date.setUTCFullYear(y,mo-1,d);date.setUTCHours(h,min,s,Number((frac||'').padEnd(3,'0').slice(0,3)));field.ms=date.getTime()-offsetMinutes*60000;
    if(offset==='-00:00')warn('Local offset unknown','RFC 3339 -00:00 identifies a UTC instant but does not specify the local offset.','Preserve this distinction; do not claim the source timezone is UTC.');
    if(frac&&frac.length>3)warn('Sub-millisecond precision','JavaScript conversions below retain only millisecond precision.','Preserve the original string if finer precision matters.');
    if(!ss)warn('Seconds omitted','This readable ISO form is not the complete RFC 3339 timestamp form.','Include seconds for an RFC 3339 API contract.');
  }
  if(field.ms!==undefined){const year=new Date(field.ms).getUTCFullYear();if(year<2000||year>2100)warn('Outside assumed 2000–2100 review range','Historical or far-future dates may be intentional. This range is a review heuristic.','Confirm the domain range and epoch unit.');}
  return field;
}
export function diagnoseTime(raw:string,mode:'json'|'timestamp') {
  if(!raw.trim())throw new Error('Enter JSON or a timestamp to begin.');if(raw.length>100000)throw new Error('Limit input to 100,000 characters.');
  const fields:TimeField[]=[];let visited=0;
  const root=mode==='json'?JSON.parse(raw):raw.trim();
  function walk(value:unknown,path:string,key:string,depth:number){
    if(++visited>2000||depth>24)throw new Error('Limit JSON to 2,000 values and 24 nesting levels.');
    if(value&&typeof value==='object'){
      const local:TimeField[]=[];
      for(const [k,v] of Object.entries(value)){const p=Array.isArray(value)?`${path}[${k}]`:`${path}[${JSON.stringify(k)}]`;const before=fields.length;walk(v,p,k,depth+1);if(fields.length>before&&fields[before].path===p)local.push(fields[before]);}
      const get=(name:string)=>local.find(f=>f.path.endsWith(`["${name}"]`)||f.path.endsWith(`["${name.replace('At','_at')}"]`));
      const created=get('createdAt');for(const later of [get('updatedAt'),get('expiresAt')])if(created?.ms!==undefined&&later?.ms!==undefined&&later.ms<created.ms)later.findings.push(finding('WARN','Earlier than createdAt','These sibling fields appear to describe lifecycle order; clock skew or domain rules may explain it.','Confirm the contract, clock source and lifecycle ordering.'));
    }else if((typeof value==='string'||typeof value==='number')&&(mode==='timestamp'||timeKey.test(key)||(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value))))fields.push(inspectTimestamp(value,path));
    else if(timeKey.test(key)&&value===null)fields.push({path,value:'null',format:'Null',offset:'Unknown',findings:[finding('WARN','Null time field','Null may mean unknown or not yet occurred.','Document nullability and distinguish null from absent.')]});
  }
  walk(root,'$','',0);
  const formats=new Set(fields.filter(f=>f.format!=='Unrecognized').map(f=>f.format));
  if(formats.size>1&&fields.length)fields[0].findings.push(finding('WARN','Mixed timestamp formats','Different representations can lead to inconsistent parsing and sorting.','Standardize fields that share instant semantics; keep intentional calendar dates distinct.'));
  if(fields.some(f=>f.format==='Local datetime')&&fields.some(f=>f.ms!==undefined))fields[0].findings.push(finding('WARN','Mixed explicit and local instants','Some values are safely comparable while others have no known offset.','Add offsets before comparing or normalizing local values.'));
  return {fields,status:fields.some(f=>f.findings.some(x=>x.level==='FAIL'))?'FAIL':fields.some(f=>f.findings.length)?'WARN':'PASS'};
}
