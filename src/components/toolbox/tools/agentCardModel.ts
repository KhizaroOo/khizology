/** Dated protocol knowledge; keep changing A2A rules here, separate from form presentation. */
export const agentCardMetadata = {
  checked: '2026-10-24', release: '1.0.1', protocolVersion: '1.0', discoveryPath: '/.well-known/agent-card.json',
  sources: [
    {label: 'A2A v1.0.1 canonical schema', url: 'https://github.com/a2aproject/A2A/blob/v1.0.1/specification/a2a.proto'},
    {label: 'A2A specification: discovery, security and signing', url: 'https://a2a-protocol.org/latest/specification/'},
    {label: 'A2A v1.0.1 release', url: 'https://github.com/a2aproject/A2A/releases/tag/v1.0.1'},
  ],
  bindings: ['JSONRPC', 'GRPC', 'HTTP+JSON'],
  schemes: ['apiKeySecurityScheme', 'httpAuthSecurityScheme', 'oauth2SecurityScheme', 'openIdConnectSecurityScheme', 'mtlsSecurityScheme'],
  flows: ['authorizationCode', 'clientCredentials', 'deviceCode', 'implicit', 'password'],
  media: ['text/plain', 'application/json', 'image/png', 'audio/mpeg'],
} as const;
export type JsonObject = {[key: string]: any};
export interface AgentInterface extends JsonObject {url:string; protocolBinding:string; protocolVersion:string; tenant?:string}
export interface AgentSkill extends JsonObject {id:string; name:string; description:string; tags:string[]; examples?:string[]; inputModes?:string[]; outputModes?:string[]; securityRequirements?:SecurityRequirement[]}
export interface SecurityRequirement extends JsonObject {schemes:Record<string,{list:string[]}>}
export interface AgentCard extends JsonObject {name:string; description:string; supportedInterfaces:AgentInterface[]; version:string; capabilities:JsonObject; defaultInputModes:string[]; defaultOutputModes:string[]; skills:AgentSkill[]}
export interface Finding {severity:'FAIL'|'WARN'|'INFO'; path:string; issue:string; why:string; action:string}
export interface SigningPlan {algorithm:string; keyId:string; publicKeys:string; rotation:boolean}
export const emptySigningPlan:SigningPlan = {algorithm:'',keyId:'',publicKeys:'',rotation:false};
export const agentCardLimits = {chars:120000, nodes:6000, depth:16, list:32, interfaces:12};
export const object = (value:unknown):value is JsonObject => !!value && typeof value==='object' && !Array.isArray(value);
const nonempty = (value:unknown):value is string => typeof value==='string' && value.trim().length>0;
export const splitLines = (text:string) => text.split('\n').map(s=>s.trim()).filter(Boolean);
export const splitList = (text:string) => text.split(',').map(s=>s.trim()).filter(Boolean);
export function moveItem<T>(items:T[], index:number, direction:number):T[] {const next=[...items],target=index+direction;if(target<0||target>=items.length)return next;[next[index],next[target]]=[next[target],next[index]];return next;}
export function newInterface():AgentInterface {return {url:'https://agent.example.com/a2a',protocolBinding:'JSONRPC',protocolVersion:agentCardMetadata.protocolVersion};}
export function newSkill(number=1):AgentSkill {return {id:`skill-${number}`,name:'New skill',description:'Describe the specific work this skill performs and the result it returns.',tags:['example']};}
export function newSecurityScheme(kind:string):JsonObject {
  const options:Record<string,JsonObject>={
    apiKeySecurityScheme:{location:'header',name:'X-API-Key'}, httpAuthSecurityScheme:{scheme:'Bearer'},
    oauth2SecurityScheme:{flows:{authorizationCode:{authorizationUrl:'https://identity.example.com/authorize',tokenUrl:'https://identity.example.com/token',scopes:{'support.read':'Read support articles'},pkceRequired:true}}},
    openIdConnectSecurityScheme:{openIdConnectUrl:'https://identity.example.com/.well-known/openid-configuration'},mtlsSecurityScheme:{description:'A trusted client certificate is required.'},
  };
  return {[kind]:options[kind] || options.httpAuthSecurityScheme};
}
export function newOAuthFlow(kind:string):JsonObject {
  return {...(['authorizationCode','implicit'].includes(kind)?{authorizationUrl:'https://identity.example.com/authorize'}:{}),...(['authorizationCode','clientCredentials','deviceCode','password'].includes(kind)?{tokenUrl:'https://identity.example.com/token'}:{}),...(kind==='deviceCode'?{deviceAuthorizationUrl:'https://identity.example.com/device'}:{}),scopes:{'support.read':'Read support articles'},...(kind==='authorizationCode'?{pkceRequired:true}:{})};
}
export const agentCardPresets = ['Minimal Public Agent','Research Agent','Enterprise Support Agent','Multi-Interface Agent','Streaming Agent','Async Agent','Partner Agent','Legacy Agent Card'] as const;
export type AgentCardPreset = typeof agentCardPresets[number];
export function agentCardPreset(name:AgentCardPreset):AgentCard {
  const card:AgentCard={name:'Public information agent',description:'Answers questions using public documentation and returns a concise answer with source links.',supportedInterfaces:[newInterface()],version:'1.0.0',capabilities:{},defaultInputModes:['text/plain'],defaultOutputModes:['text/plain'],skills:[{id:'answer-public-question',name:'Answer a public question',description:'Finds relevant public documentation and returns an answer with source links.',tags:['documentation','questions'],examples:['Where can I find the installation guide?']}]};
  if(name==='Research Agent'){card.name='Public research agent';card.defaultOutputModes=['text/plain','application/json'];card.skills.push({id:'compare-public-sources',name:'Compare public sources',description:'Compares published sources on one topic and returns attributed differences and uncertainties.',tags:['research','comparison'],examples:['Compare two public reports about renewable electricity.'],outputModes:['application/json']});}
  if(['Enterprise Support Agent','Partner Agent'].includes(name)){card.name=name==='Partner Agent'?'Partner support agent':'Enterprise support agent';card.provider={organization:'Example organization',url:'https://example.com'};card.documentationUrl='https://agent.example.com/docs';card.securitySchemes={supportOAuth:newSecurityScheme('oauth2SecurityScheme')};card.securityRequirements=[{schemes:{supportOAuth:{list:['support.read']}}}];card.skills[0].securityRequirements=[{schemes:{supportOAuth:{list:['support.read']}}}];}
  if(name==='Multi-Interface Agent')card.supportedInterfaces=[newInterface(),{url:'grpc.agent.example.com:443',protocolBinding:'GRPC',protocolVersion:agentCardMetadata.protocolVersion},{url:'https://agent.example.com/a2a/rest',protocolBinding:'HTTP+JSON',protocolVersion:agentCardMetadata.protocolVersion}];
  if(name==='Streaming Agent')card.capabilities.streaming=true;
  if(name==='Async Agent')card.capabilities.pushNotifications=true;
  if(name==='Partner Agent')card.capabilities.extendedAgentCard=true;
  return card;
}
export const legacyAgentCard={name:'Legacy example agent',description:'A deliberate older-format card for migration review.',url:'https://agent.example.com/a2a',version:'1.0.0',protocolVersion:'0.3.0',preferredTransport:'JSONRPC',additionalInterfaces:[],supportsAuthenticatedExtendedCard:true,capabilities:{},defaultInputModes:['text/plain'],defaultOutputModes:['text/plain'],skills:[newSkill()]};

// No value is included in findings. Obvious credentials block all card exports.
export function sensitiveText(value:string):boolean {
  return /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|https?:\/\/[^\s/@:]+:[^\s/@]+@|\bBearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})|(?:password|client_secret|api[_-]?key|access_token|refresh_token|token)\s*[=:]\s*["']?[A-Za-z0-9_+/.=-]{8,}/i.test(value);
}
export function redactCard(value:unknown):{safe:unknown; paths:string[]} {
  const paths:string[]=[];let nodes=0;
  const walk=(item:unknown,path:string,depth:number):unknown=>{
    if(++nodes>agentCardLimits.nodes||depth>agentCardLimits.depth)throw new Error('Card exceeds the local depth or node limit.');
    if(typeof item==='string'){if(item.length>8000)throw new Error('A card value exceeds 8,000 characters.');if(sensitiveText(item)){paths.push(path);return '[REDACTED]';}return item;}
    if(Array.isArray(item)){if(item.length>agentCardLimits.list)throw new Error('An array exceeds 32 entries.');return item.map((v,i)=>walk(v,`${path}[${i}]`,depth+1));}
    if(object(item))return Object.fromEntries(Object.entries(item).map(([key,v])=>{
      if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe object keys are not supported by this local editor.');
      const p=sensitiveText(key)?`${path}.<redacted-key>`:`${path}.${key}`;
      if(sensitiveText(key)){paths.push(p);return [`[REDACTED_KEY_${paths.length}]`, '[REDACTED]'];}
      if(/^(?:password|clientSecret|client_secret|secret|token|accessToken|access_token|refreshToken|refresh_token|privateKey|private_key|apiKey|api_key|authorization)$/i.test(key)&&nonempty(v)){paths.push(p);return [key,'[REDACTED]'];}
      return [key,walk(v,p,depth+1)];
    }));
    return item;
  };
  return {safe:walk(value,'$',0),paths};
}
const https = (value:unknown):boolean => {if(!nonempty(value))return false;try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&!u.hash;}catch{return false;}};
const absoluteUri = (value:unknown):boolean => typeof value==='string'&&/^[a-z][a-z0-9+.-]*:\S+$/i.test(value);
const grpcAddress = (value:unknown):boolean => {
  if(typeof value!=='string'||! /^(?:[a-z0-9-]+\.)*[a-z0-9-]+:\d{1,5}$|^\[[0-9a-f:]+\]:\d{1,5}$/i.test(value))return false;
  const port=Number(value.slice(value.lastIndexOf(':')+1));
  return port>0&&port<=65535&&https(`https://${value}`);
};
const protectedHeader = (value:unknown):boolean => {
  if(typeof value!=='string')return false;
  try{const text=atob(value.replace(/-/g,'+').replace(/_/g,'/'));const header:unknown=JSON.parse(text);return object(header)&&nonempty(header.alg)&&header.alg.toLowerCase()!=='none'&&nonempty(header.kid);}catch{return false;}
};
const stringArray = (value:unknown):value is string[] => Array.isArray(value)&&value.every(nonempty);
const mediaType = (value:string) => /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:\s*;\s*[\w-]+=[\w.+-]+)*$/.test(value);
const legacyKeys=['url','protocolVersion','preferredTransport','additionalInterfaces','supportsAuthenticatedExtendedCard','security'];
const knownCard=['name','description','supportedInterfaces','version','capabilities','defaultInputModes','defaultOutputModes','skills','provider','documentationUrl','securitySchemes','securityRequirements','signatures','iconUrl'];
export interface CardReview {safe:unknown; json:string; findings:Finding[]; blocked:boolean; legacy:boolean; readiness:string; next:string; requiredSecurity:string; skillCount:number; preferred:string; signing:string}
export function reviewAgentCard(input:unknown,sensitiveWork=false):CardReview {
  const findings:Finding[]=[];
  const add=(severity:Finding['severity'],path:string,issue:string,why:string,action:string)=>findings.push({severity,path,issue,why,action});
  let safe:unknown;
  try{const redacted=redactCard(input);safe=redacted.safe;for(const path of redacted.paths)add('FAIL',path,'Credential-like value removed','Public cards describe authentication; they never carry credentials.','Remove the value and rotate it if it was exposed elsewhere.');}
  catch(e){add('FAIL','$','Local safety limit reached',e instanceof Error?e.message:'Unsupported input.','Reduce the document size, nesting or unsupported object keys.');safe={};}
  const card=object(safe)?safe:{};
  const oldDiscovery=(value:unknown,path:string)=>{
    if(typeof value==='string'&&value.includes('/.well-known/agent.json'))add('WARN',path,'Older discovery path reference','Current well-known discovery uses agent-card.json.','Review the reference and use /.well-known/agent-card.json for current public discovery.');
    else if(Array.isArray(value))value.forEach((v,i)=>oldDiscovery(v,`${path}[${i}]`));
    else if(object(value))Object.entries(value).forEach(([key,v])=>oldDiscovery(v,`${path}.${key}`));
  };
  oldDiscovery(card,'$');
  if(!object(safe))add('FAIL','$','Expected one JSON object','An Agent Card is an object.','Paste a card object, not an array or primitive.');
  const unknown=(item:JsonObject,keys:readonly string[],path:string)=>{for(const key of Object.keys(item))if(!keys.includes(key))add('WARN',`${path}.${key}`,'Unrecognized field preserved','This local editor does not interpret this field; extensibility is not automatically an error.','Review it against the pinned schema before publishing.');};
  unknown(card,knownCard,'$');
  const legacy=legacyKeys.some(key=>Object.hasOwn(card,key));
  if(legacy)add('FAIL','$','Legacy card structure detected','Current cards use supportedInterfaces and per-interface protocolVersion.','Review the migration notes; start a current card explicitly. No automatic conversion was performed.');
  const requiredText=(obj:JsonObject,key:string,path:string)=>{if(!nonempty(obj[key]))add('FAIL',`${path}.${key}`,'Required text is missing','Clients need a meaningful nonempty string.','Enter the required value.');};
  ['name','description','version'].forEach(key=>requiredText(card,key,'$'));
  if(nonempty(card.description)&&card.description.length<30)add('WARN','$.description','Description is vague','A client needs to understand scope and output.','Describe the task, limits and expected result.');
  const modes=(value:unknown,path:string,required=true)=>{if(value===undefined&&!required)return;if(!stringArray(value)||value.length===0){add('FAIL',path,'Media modes must be a nonempty string list','Defaults apply unless a skill overrides them.','Add at least one media type.');return;}if(new Set(value).size!==value.length)add('WARN',path,'Repeated media mode','Duplicates add no information.','Remove repeated values.');value.forEach((v,i)=>{if(!mediaType(v))add('FAIL',`${path}[${i}]`,'Malformed media type','Modes use MIME/media-type syntax.','Use a type such as text/plain or application/json.');});};
  modes(card.defaultInputModes,'$.defaultInputModes');modes(card.defaultOutputModes,'$.defaultOutputModes');
  const interfaces=Array.isArray(card.supportedInterfaces)?card.supportedInterfaces:[];
  if(!interfaces.length||interfaces.length>agentCardLimits.interfaces)add('FAIL','$.supportedInterfaces','Provide 1–12 interfaces','The first entry is the preferred interface; this editor is bounded.','Add a supported endpoint and binding.');
  const seenInterfaces=new Set<string>();
  interfaces.forEach((entry,i)=>{
    const p=`$.supportedInterfaces[${i}]`;if(!object(entry)){add('FAIL',p,'Interface must be an object','A binding needs its own endpoint and version.','Use the interface editor.');return;}
    unknown(entry,['url','protocolBinding','protocolVersion','tenant'],p);['url','protocolBinding','protocolVersion'].forEach(k=>requiredText(entry,k,p));
    const binding=entry.protocolBinding;
    if(binding==='GRPC'){if(!https(entry.url)&&!grpcAddress(entry.url))add('FAIL',`${p}.url`,'Invalid gRPC address','The current prose uses hostname:port; the schema also describes HTTPS endpoints.','Use a TLS deployment address such as grpc.example.com:443.');}
    else if(!https(entry.url))add('FAIL',`${p}.url`,'Production endpoint must use HTTPS','Relative, credential-bearing and insecure URLs are unsuitable for this production card.','Enter an absolute HTTPS URL without credentials or a fragment.');
    if(!agentCardMetadata.bindings.includes(binding as any)&&!absoluteUri(binding))add('FAIL',`${p}.protocolBinding`,'Custom binding needs a URI','Core values are case-sensitive JSONRPC, GRPC and HTTP+JSON; other bindings use a URI.','Select a core binding or enter the custom binding URI.');
    if(nonempty(entry.protocolVersion)&&!/^\d+\.\d+$/.test(entry.protocolVersion))add('WARN',`${p}.protocolVersion`,'Prefer a Major.Minor protocol version',`A2A version negotiation ignores patch numbers; the current wire version is ${agentCardMetadata.protocolVersion}.`,'Use the minor protocol version implemented by this interface.');
    else if(nonempty(entry.protocolVersion)&&entry.protocolVersion!==agentCardMetadata.protocolVersion)add('WARN',`${p}.protocolVersion`,'Different protocol generation declared',`The local rules are pinned to A2A v${agentCardMetadata.release}.`,'Confirm that the server and card shape match the declared version.');
    if(entry.tenant!==undefined&&typeof entry.tenant!=='string')add('FAIL',`${p}.tenant`,'Tenant must be a string','Tenant is an opaque routing value, not a credential.','Supply only a non-secret routing string or omit it.');
    const key=JSON.stringify([entry.url,binding,entry.protocolVersion,entry.tenant||'']);if(seenInterfaces.has(key))add('FAIL',p,'Duplicate interface','An exact duplicate adds no alternative.','Remove the repeated entry.');seenInterfaces.add(key);
  });
  if(!object(card.capabilities))add('FAIL','$.capabilities','Capabilities object is required','An empty object is valid when no optional capabilities are declared.','Use an object; do not claim unsupported features.');
  else {
    unknown(card.capabilities,['streaming','pushNotifications','extendedAgentCard','extensions'],'$.capabilities');
    for(const key of ['streaming','pushNotifications','extendedAgentCard'])if(card.capabilities[key]!==undefined&&typeof card.capabilities[key]!=='boolean')add('FAIL',`$.capabilities.${key}`,'Capability must be boolean','A declaration does not implement the feature.','Use true/false or omit it.');
    if(card.capabilities.streaming||card.capabilities.pushNotifications)add('INFO','$.capabilities','Runtime support remains your responsibility','Streaming and push notifications need server behavior, authentication and delivery handling.','Test the implemented capability separately.');
    if(card.capabilities.extensions!==undefined){if(!Array.isArray(card.capabilities.extensions))add('FAIL','$.capabilities.extensions','Extensions must be an array','Each entry declares one extension.','Use the extension editor.');else card.capabilities.extensions.forEach((ext:unknown,i:number)=>{const p=`$.capabilities.extensions[${i}]`;if(!object(ext)){add('FAIL',p,'Extension must be an object','An extension contains metadata.','Use an object.');return;}unknown(ext,['uri','description','required','params'],p);if(ext.uri!==undefined&&!absoluteUri(ext.uri))add('FAIL',`${p}.uri`,'Invalid extension URI','An extension URI identifies its contract.','Use an absolute URI.');if(ext.description!==undefined&&typeof ext.description!=='string')add('FAIL',`${p}.description`,'Description must be text','Extension metadata has a string description.','Use text.');if(ext.required!==undefined&&typeof ext.required!=='boolean')add('FAIL',`${p}.required`,'Required flag must be boolean','Clients need an unambiguous compatibility flag.','Use true/false.');if(ext.params!==undefined&&!object(ext.params))add('FAIL',`${p}.params`,'Extension params must be an object','The schema uses a structured parameter object.','Use a JSON object.');if(ext.required===true)add('WARN',p,'Required extension narrows compatibility','Clients must understand this extension to use the agent.','Document its contract and test compatible clients.');});}
  }
  for(const key of ['documentationUrl','iconUrl'])if(card[key]!==undefined&&!https(card[key]))add('FAIL',`$.${key}`,'Invalid production metadata URL','Public metadata URLs should be absolute HTTPS without embedded credentials.','Use HTTPS or omit the optional field.');
  if(card.provider!==undefined){if(!object(card.provider))add('FAIL','$.provider','Provider must be an object','Provider identifies the organization and its website.','Supply both organization and url.');else{unknown(card.provider,['organization','url'],'$.provider');requiredText(card.provider,'organization','$.provider');if(!https(card.provider.url))add('FAIL','$.provider.url','Provider URL is required','Both provider fields are required when provider is present.','Enter an HTTPS organization URL.');}}
  const schemes=object(card.securitySchemes)?card.securitySchemes:{};
  if(card.securitySchemes!==undefined&&!object(card.securitySchemes))add('FAIL','$.securitySchemes','Security schemes must be a named object','Requirements refer to these names.','Define named scheme objects.');
  for(const [name,definition] of Object.entries(schemes)){
    const p=`$.securitySchemes.${name}`;
    if(!name.trim()||!object(definition)){add('FAIL',p,'Invalid named security definition','Each named definition wraps exactly one scheme variant.','Choose one supported variant.');continue;}
    unknown(definition,agentCardMetadata.schemes,p);const variants=agentCardMetadata.schemes.filter(k=>Object.hasOwn(definition,k));
    if(variants.length!==1){add('FAIL',p,'Exactly one security variant is required','SecurityScheme is a oneof, not an OpenAPI type object.','Keep one modern wrapped variant.');continue;}
    const kind=variants[0],body=definition[kind];if(!object(body)){add('FAIL',p,'Scheme body must be an object','The variant wraps its parameters.','Use a parameter object.');continue;}
    const allowed:Record<string,string[]>={apiKeySecurityScheme:['description','location','name'],httpAuthSecurityScheme:['description','scheme','bearerFormat'],oauth2SecurityScheme:['description','flows','oauth2MetadataUrl'],openIdConnectSecurityScheme:['description','openIdConnectUrl'],mtlsSecurityScheme:['description']};
    unknown(body,allowed[kind],`${p}.${kind}`);
    if(body.description!==undefined&&typeof body.description!=='string')add('FAIL',p,'Scheme description must be text','Only public scheme metadata belongs here.','Use a string.');
    if(kind==='apiKeySecurityScheme'){if(!['header','query','cookie'].includes(body.location))add('FAIL',p,'Invalid API-key location','Supported locations are header, query and cookie.','Select a supported location.');requiredText(body,'name',p);if(body.location==='query')add('WARN',p,'Query credentials can leak','Request URLs may enter logs and history.','Prefer a header when the deployed protocol allows it.');}
    if(kind==='httpAuthSecurityScheme'){requiredText(body,'scheme',p);if(body.bearerFormat!==undefined&&typeof body.bearerFormat!=='string')add('FAIL',p,'Bearer format must be text','This is a format hint, never a token.','Use a value such as JWT without an actual credential.');}
    if(kind==='openIdConnectSecurityScheme'&&!https(body.openIdConnectUrl))add('FAIL',p,'OIDC discovery URL is required','The URL identifies public identity-provider metadata.','Enter its HTTPS discovery URL; nothing is fetched here.');
    if(kind==='oauth2SecurityScheme'){
      if(body.oauth2MetadataUrl!==undefined&&!https(body.oauth2MetadataUrl))add('FAIL',p,'OAuth metadata must use HTTPS','Authorization-server metadata is public discovery information.','Use HTTPS or omit the field.');
      const flows=object(body.flows)?body.flows:{};unknown(flows,agentCardMetadata.flows,`${p}.flows`);const kinds=agentCardMetadata.flows.filter(k=>Object.hasOwn(flows,k));
      if(kinds.length!==1)add('FAIL',p,'Declare exactly one OAuth flow','A2A OAuthFlows is a oneof even though OpenAPI permits multiple flows.','Select one flow per named OAuth scheme.');
      for(const flowKind of kinds){const flow=flows[flowKind],fp=`${p}.flows.${flowKind}`;if(!object(flow)){add('FAIL',fp,'Flow must be an object','Each flow declares its endpoints and scopes.','Use the flow editor.');continue;}
        unknown(flow,['authorizationUrl','tokenUrl','refreshUrl','scopes',...(flowKind==='authorizationCode'?['pkceRequired']:[]),...(flowKind==='deviceCode'?['deviceAuthorizationUrl']:[])],fp);
        const needed=flowKind==='authorizationCode'?['authorizationUrl','tokenUrl']:flowKind==='deviceCode'?['deviceAuthorizationUrl','tokenUrl']:flowKind==='implicit'?['authorizationUrl']:['tokenUrl'];
        for(const key of needed)if(!https(flow[key]))add('FAIL',`${fp}.${key}`,'Required HTTPS OAuth endpoint is missing','Each flow has specific required endpoints.','Supply the correct public endpoint URL.');
        if(flow.refreshUrl!==undefined&&!https(flow.refreshUrl))add('FAIL',`${fp}.refreshUrl`,'Invalid refresh URL','Optional endpoint URLs still require HTTPS.','Correct or omit it.');
        if(!object(flow.scopes)||Object.values(flow.scopes).some(v=>typeof v!=='string'))add('FAIL',`${fp}.scopes`,'Scopes must map names to descriptions','A scope definition is metadata, not a credential.','Use a string-to-string map; an empty map is allowed.');
        if(flow.pkceRequired!==undefined&&typeof flow.pkceRequired!=='boolean')add('FAIL',`${fp}.pkceRequired`,'PKCE flag must be boolean','PKCE requires actual authorization-server and client support.','Use a boolean.');
        if(['implicit','password'].includes(flowKind))add('WARN',fp,'Deprecated OAuth flow','The pinned schema marks this flow deprecated.','Prefer authorization code with PKCE, client credentials or device authorization as appropriate.');
      }
    }
  }
  const requirements=(value:unknown,path:string)=>{
    if(value===undefined)return;
    if(!Array.isArray(value)){add('FAIL',path,'Requirements must be an array','Each alternative wraps a schemes map.','Use [{schemes:{name:{list:[]}}}].');return;}
    const seen=new Set<string>();
    value.forEach((requirement:unknown,i:number)=>{const p=`${path}[${i}]`;if(!object(requirement)||!object(requirement.schemes)){add('FAIL',p,'Missing schemes wrapper','Current A2A uses SecurityRequirement.schemes with StringList values.','Use {schemes:{schemeName:{list:[]}}}.');return;}
      unknown(requirement,['schemes'],p);const entries=Object.entries(requirement.schemes);
      if(!entries.length)add('WARN',p,'Anonymous alternative declared','An empty requirement allows an unauthenticated alternative.','Keep this only if public access is intentional.');
      const key=JSON.stringify(entries.sort(([a],[b])=>a.localeCompare(b)));if(seen.has(key))add('WARN',p,'Duplicate requirement alternative','Repeated alternatives add no access policy.','Remove the repeated group.');seen.add(key);
      for(const [name,scope] of entries){if(!Object.hasOwn(schemes,name))add('FAIL',`${p}.schemes.${name}`,'Unknown security scheme reference','Every requirement must reference a named scheme.','Define that scheme or remove the reference.');
        if(!object(scope)||!Array.isArray(scope.list)||!scope.list.every((v:unknown)=>typeof v==='string')){add('FAIL',`${p}.schemes.${name}`,'Scopes require a StringList wrapper','Bare arrays belong to older examples, not the current proto JSON shape.','Use {list:["scope"]} or {list:[]}.');continue;}
        unknown(scope,['list'],`${p}.schemes.${name}`);
        const definition=schemes[name],oauth=object(definition)&&definition.oauth2SecurityScheme,oidc=object(definition)&&definition.openIdConnectSecurityScheme;
        if(scope.list.length&&!oauth&&!oidc)add('FAIL',p,'Non-OAuth scope list must be empty','Scopes in this builder apply to OAuth2 and OpenID Connect.','Use an empty list for API key, HTTP auth or mTLS.');
        if(object(oauth)&&object(oauth.flows)){const flow=Object.values(oauth.flows).find(object);if(flow&&object(flow.scopes))for(const s of scope.list)if(!Object.hasOwn(flow.scopes,s))add('WARN',p,'Requested scope is not declared','The named OAuth flow does not describe this requested scope.','Align the requirement with the deployed authorization policy and scope definitions.');}
      }
    });
  };
  requirements(card.securityRequirements,'$.securityRequirements');
  const skills=Array.isArray(card.skills)?card.skills:[];
  if(!skills.length)add('FAIL','$.skills','At least one skill is required by this builder','A useful public card needs a discoverable capability.','Add a focused skill.');
  const ids=new Set<string>();
  skills.forEach((skill:unknown,i:number)=>{const p=`$.skills[${i}]`;if(!object(skill)){add('FAIL',p,'Skill must be an object','Skill metadata describes one discoverable task.','Use the skill editor.');return;}
    unknown(skill,['id','name','description','tags','examples','inputModes','outputModes','securityRequirements'],p);['id','name','description'].forEach(k=>requiredText(skill,k,p));
    if(nonempty(skill.id)){if(ids.has(skill.id))add('FAIL',`${p}.id`,'Duplicate skill ID','Clients need a unique identifier within the card.','Choose a distinct ID; snake_case is not required.');ids.add(skill.id);}
    if(!stringArray(skill.tags)||!skill.tags.length)add('FAIL',`${p}.tags`,'Add at least one skill tag','Tags support useful discovery.','Use concise topic tags.');
    if(skill.examples!==undefined&&!stringArray(skill.examples))add('FAIL',`${p}.examples`,'Examples must be a string list','Examples describe representative tasks.','Enter one example per line.');
    modes(skill.inputModes,`${p}.inputModes`,false);modes(skill.outputModes,`${p}.outputModes`,false);requirements(skill.securityRequirements,`${p}.securityRequirements`);
    if(nonempty(skill.description)&&(skill.description.length<30||/\b(?:anything|everything|all tasks|do stuff)\b/i.test(skill.description)))add('WARN',`${p}.description`,'Skill scope is vague or too broad','This is an editorial heuristic, not a protocol failure.','Describe one focused operation and its result.');
    if(i&&skills.slice(0,i).some((s:unknown)=>object(s)&&((s.name===skill.name)||(s.description===skill.description))))add('WARN',p,'Possible overlapping skills','Identical names or descriptions can confuse discovery; this is a heuristic.','Differentiate the responsibility or combine genuinely identical skills.');
  });
  const authRequired=(value:unknown)=>Array.isArray(value)&&value.length>0&&value.every(r=>object(r)&&object(r.schemes)&&Object.keys(r.schemes).length>0);
  const globalAuth=authRequired(card.securityRequirements);
  const allSkillsAuth=skills.length>0&&skills.every((s:unknown)=>object(s)&&authRequired(s.securityRequirements===undefined?card.securityRequirements:s.securityRequirements));
  if(!globalAuth&&!allSkillsAuth)add('INFO','$.securityRequirements','Public access is declared','An unsigned, unauthenticated read-only public agent can be valid.','Expose only intentional public metadata and enforce access on the server.');
  if(sensitiveWork&&!allSkillsAuth)add('WARN','$.skills','Sensitive or write work may be unauthenticated','A card is a declaration, never an authorization boundary.','Require suitable authentication and server-side authorization before deployment.');
  if(card.capabilities?.extendedAgentCard===true&&!globalAuth)add('WARN','$.capabilities.extendedAgentCard','Extended card needs authenticated access','The extended-card flag does not establish authentication.','Declare and implement authentication; keep sensitive metadata out of the public card.');
  if(card.signatures!==undefined){if(!Array.isArray(card.signatures)||!card.signatures.length)add('FAIL','$.signatures','Signatures must be a nonempty array when present','Unsigned cards omit signatures.','Omit empty signatures or supply real existing JWS metadata.');else card.signatures.forEach((signature:unknown,i:number)=>{const p=`$.signatures[${i}]`;if(!object(signature)){add('FAIL',p,'Signature must be an object','AgentCardSignature uses protected, signature and optional header.','Import a real signed card.');return;}unknown(signature,['protected','signature','header'],p);for(const k of ['protected','signature'])if(typeof signature[k]!=='string'||! /^[A-Za-z0-9_-]+$/.test(signature[k]))add('FAIL',`${p}.${k}`,'Expected base64url JWS data','This builder cannot manufacture signatures.','Use a real external signing implementation.');if(!protectedHeader(signature.protected))add('FAIL',`${p}.protected`,'Invalid protected JWS header','A2A signing requires a base64url JSON header containing alg and kid; alg none is not a signature.','Verify the original signing metadata externally.');if(signature.header!==undefined&&!object(signature.header))add('FAIL',`${p}.header`,'Header must be an object','Unprotected JWS headers are structured metadata.','Use the original valid header object.');});add('WARN','$.signatures','Existing signatures are unverified','Local structural checks do not verify JWS, identity or trust. Editing signed content invalidates signatures.','Verify externally; explicitly create an unsigned copy before editing.');}
  add('INFO','$','Metadata readiness only','This review does not test runtime compliance, connectivity, authorization or trust.','Serve the reviewed card at the current discovery path and test real clients.');
  const blocked=findings.some(f=>f.severity==='FAIL');
  return {safe,json:JSON.stringify(safe,null,2),findings,blocked,legacy,readiness:blocked?'BLOCKED':findings.some(f=>f.severity==='WARN')?'READY WITH WARNINGS':'READY FOR IMPLEMENTATION REVIEW',next:findings.find(f=>f.severity==='FAIL')?.action||findings.find(f=>f.severity==='WARN')?.action||'Review the server implementation, then publish the card and test a real client.',requiredSecurity:allSkillsAuth?'Authentication declared for all skills':'Public access possible',skillCount:skills.length,preferred:object(interfaces[0])?`${interfaces[0].protocolBinding || 'Missing binding'} · ${interfaces[0].protocolVersion || 'Missing version'}`:'No preferred interface',signing:card.signatures?'Existing signatures — not verified':'Unsigned — allowed'};
}
export function parseAgentCard(text:string):{card?:unknown; error?:string} {
  if(text.length>agentCardLimits.chars)return {error:'Input exceeds 120,000 characters.'};
  try{const parsed:unknown=JSON.parse(text);redactCard(parsed);return {card:parsed};}catch{return {error:'Use valid bounded JSON: at most 120,000 characters, 32 entries per array, 8,000 characters per value and 16 nested levels. Unsafe object keys are not supported.'};}
}
export function discoveryUrl(domain:string):{url:string;error:string} {
  if(!domain.trim())return {url:'',error:''};
  if(sensitiveText(domain))return {url:'',error:'Remove credential-like data from the domain.'};
  try{const u=new URL(domain.includes('://')?domain:`https://${domain}`);if(!https(u.href)||u.search||u.hash||(u.pathname!=='/'&&u.pathname!==''))throw new Error();return {url:`${u.origin}${agentCardMetadata.discoveryPath}`,error:''};}catch{return {url:'',error:'Use an HTTPS origin only, without a path, query, fragment or credentials.'};}
}
export function signingPlanText(plan:SigningPlan):string {
  if(Object.values(plan).some(v=>typeof v==='string'&&sensitiveText(v)))return 'Remove credential-like material from the signing plan. No plan can be exported.';
  return `Agent Card signing plan — no signature generated\nAlgorithm: ${plan.algorithm||'Not decided'}\nKey ID strategy: ${plan.keyId||'Not decided'}\nPublic key / JWKS strategy: ${plan.publicKeys||'Not decided'}\nRotation planned: ${plan.rotation?'Yes':'Not yet'}\n\nImplement outside this builder: apply A2A ProtoJSON default-value handling, remove signatures, canonicalize with RFC 8785, then sign using RFC 7515 JWS. Use an algorithm appropriate to the deployed verifier and include alg and kid in the protected header. Keep private keys outside Agent Cards. A plan is not proof of authenticity or trust.`;
}
