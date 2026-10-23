export type Crawler = {token:string;provider:string;purpose:string;search:boolean;answers:boolean;training:boolean;user:boolean;control:'crawler'|'product'|'user';effect:string;caveat:string;source:string;lastVerified:string};
const openai='https://developers.openai.com/api/docs/bots',google='https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers',apple='https://support.apple.com/en-us/119829',anthropic='https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler';
export const crawlerRegistry:readonly Crawler[]=[
 {token:'OAI-SearchBot',provider:'OpenAI',purpose:'ChatGPT Search / discovery',search:true,answers:true,training:false,user:false,control:'crawler',effect:'May reduce eligibility for ChatGPT Search answers; navigational links can remain.',caveat:'Independent of the training control.',source:openai,lastVerified:'2026-10-23'},
 {token:'GPTBot',provider:'OpenAI',purpose:'Potential foundation-model training',search:false,answers:false,training:true,user:false,control:'crawler',effect:'Requests exclusion from future OpenAI foundation-model training collection.',caveat:'Does not control ChatGPT Search.',source:openai,lastVerified:'2026-10-23'},
 {token:'ChatGPT-User',provider:'OpenAI',purpose:'User-requested access',search:false,answers:false,training:false,user:true,control:'user',effect:'A robots preference cannot guarantee prevention of user-triggered access.',caveat:'User-triggered access may behave differently; robots rules may not apply.',source:openai,lastVerified:'2026-10-23'},
 {token:'Googlebot',provider:'Google',purpose:'Google Search crawling',search:true,answers:true,training:false,user:false,control:'crawler',effect:'Can affect Google Search crawling and indexing.',caveat:'Also serves Search AI features; this is not an AI-training-only control.',source:google,lastVerified:'2026-10-23'},
 {token:'Google-Extended',provider:'Google',purpose:'Gemini training / grounding control',search:false,answers:true,training:true,user:false,control:'product',effect:'Restricts documented Gemini training and grounding uses, not Google Search inclusion or ranking.',caveat:'Product token, not a separate HTTP crawler. Training and covered grounding cannot be separated here; Search AI features are outside this control.',source:google,lastVerified:'2026-10-23'},
 {token:'Applebot',provider:'Apple',purpose:'Apple search / discovery',search:true,answers:true,training:false,user:false,control:'crawler',effect:'Can reduce Apple search/discovery access.',caveat:'Apple discovery includes Spotlight, Siri and Safari. Generative-output controls can require separate page metadata.',source:apple,lastVerified:'2026-10-23'},
 {token:'Applebot-Extended',provider:'Apple',purpose:'Foundation-model training control',search:false,answers:false,training:true,user:false,control:'product',effect:'Restricts Apple foundation-model training use without automatically blocking Apple search.',caveat:'Does not crawl; controls use of content collected by the search crawler.',source:apple,lastVerified:'2026-10-23'},
 {token:'ClaudeBot',provider:'Anthropic',purpose:'Potential model-training collection',search:false,answers:false,training:true,user:false,control:'crawler',effect:'Signals exclusion of future materials from Anthropic model-training datasets.',caveat:'Anthropic documents robots compliance; this token is not its search or user-request agent.',source:anthropic,lastVerified:'2026-10-23'},
];
export const policyPresets=['Search Friendly, No AI Training','Maximum Discovery','Block Known AI Training','Traditional Search Only','Private / Minimal Crawling','Custom'] as const;
export type PolicyAction='Allow'|'Disallow';
export type PolicyConfig={policies:Record<string,PolicyAction>;scope:string;paths:{path:string;action:PolicyAction}[];sitemap:string;existing:string;minimal:boolean};
export const POLICY_LIMITS={existing:64000,lines:2000,paths:10,path:250};
export function policyPreset(name:string):PolicyConfig {
 if(!policyPresets.includes(name as typeof policyPresets[number]))throw Error('Unknown preset.');
 return {policies:Object.fromEntries(crawlerRegistry.map(c=>[c.token,name==='Private / Minimal Crawling'||name==='Traditional Search Only'&&!['Googlebot','Applebot'].includes(c.token)||name!=='Maximum Discovery'&&name!=='Custom'&&c.training?'Disallow':'Allow'])),scope:'/',paths:[],sitemap:'',existing:'',minimal:name==='Private / Minimal Crawling'};
}
export function validatePolicyPath(path:string){
 if(!path.startsWith('/')||path.length>POLICY_LIMITS.path||/[\s\x00-\x1f\x7f#?*\\$]/.test(path)||/%(?![a-f\d]{2})/i.test(path)||/\/\//.test(path))throw Error('Use a plain absolute path starting with / (maximum 250 characters), without whitespace, query, fragment, wildcards or control characters. Percent escapes must be valid.');
 return path;
}
type Group={agents:string[];rules:{action:PolicyAction;path:string}[]};
export function analyzeRobots(text:string){
 if(text.length>POLICY_LIMITS.existing||text.split('\n').length>POLICY_LIMITS.lines)throw Error('Existing file limit: 64,000 characters / 2,000 lines.');
 const groups:Group[]=[],sitemaps:string[]=[],notices:string[]=[];let current:Group|undefined,unsupported=0;
 for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const line=raw.split('#')[0].trim();if(!line)continue;const colon=line.indexOf(':');if(colon<0){unsupported++;continue;}const field=line.slice(0,colon).trim().toLowerCase(),value=line.slice(colon+1).trim();
  if(field==='user-agent'){
   if(!value){unsupported++;continue;}if(!current||current.rules.length){current={agents:[],rules:[]};groups.push(current);}current.agents.push(value.toLowerCase());
  }else if(field==='allow'||field==='disallow'){if(!current){unsupported++;continue;}current.rules.push({action:field==='allow'?'Allow':'Disallow',path:value});}
  else if(field==='sitemap')sitemaps.push(value);else unsupported++;
 }
 const counts=new Map<string,number>();for(const g of groups)for(const a of new Set(g.agents))counts.set(a,(counts.get(a)??0)+1);
 for(const [agent,count]of counts)if(count>1)notices.push(`Repeated groups for ${agent}: combine matching groups when reviewing; repetition is not automatically invalid.`);
 let high=false;
 for(const g of groups){if(g.agents.includes('*')&&g.rules.some(r=>r.action==='Disallow'&&r.path==='/')){high=true;notices.push('HIGH IMPACT: wildcard root disallow affects general crawling; specific groups can override wildcard fallback.');}
 for(const c of crawlerRegistry.filter(c=>c.search))if(g.agents.includes(c.token.toLowerCase())&&g.rules.some(r=>r.action==='Disallow'&&r.path)){high=true;notices.push(`HIGH IMPACT: existing ${c.token} restrictions require search review. ${c.effect}`);}
 const byPath=new Map<string,Set<string>>();for(const r of g.rules){if(!byPath.has(r.path))byPath.set(r.path,new Set());byPath.get(r.path)!.add(r.action);}if([...byPath.values()].some(s=>s.size>1))notices.push('Allow/Disallow overlap at the same path: equal specificity favors Allow, not the last line.');
 }
 const known=groups.flatMap(g=>g.agents).filter(a=>crawlerRegistry.some(c=>c.token.toLowerCase()===a));
 if(known.length)notices.push('Known provider groups already exist. Do not append blindly: matching groups can combine and preserve old Allow rules.');
 if(groups.some(g=>g.agents.includes('*'))&&known.length)notices.push('Specific matching provider groups take precedence over wildcard fallback; wildcard restrictions are not inherited automatically.');
 if(unsupported)notices.push(`${unsupported} unrecognized / unsupported lines remain in your original file; no rewrite is attempted.`);
 return {groups,sitemaps,notices,high,known,original:text};
}
export function buildCrawlerPolicy(config:PolicyConfig){
 const scope=validatePolicyPath(config.scope);if(config.paths.length>POLICY_LIMITS.paths)throw Error('At most 10 additional path rules.');
 const seen=new Set([scope]);for(const r of config.paths){validatePolicyPath(r.path);if(!['Allow','Disallow'].includes(r.action))throw Error('Invalid path action.');if(seen.has(r.path))throw Error('Duplicate paths (including scope) are not allowed.');seen.add(r.path);}
 if(config.sitemap){if(config.sitemap.length>2048||/[\s\x00-\x1f\x7f]/.test(config.sitemap))throw Error('Use an absolute HTTP/HTTPS sitemap URL without credentials or fragment.');let u:URL;try{u=new URL(config.sitemap);}catch{throw Error('Use an absolute HTTP/HTTPS sitemap URL.');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash)throw Error('Use an absolute HTTP/HTTPS sitemap URL without credentials or fragment.');}
 for(const c of crawlerRegistry)if(!['Allow','Disallow'].includes(config.policies[c.token]))throw Error('Choose a valid policy for every provider control.');
 const analysis=analyzeRobots(config.existing),partial=!!config.existing.trim();
 const groups=crawlerRegistry.map(c=>`# ${c.purpose}${c.control==='user'?' — preference only; user requests may not follow robots rules':''}\nUser-agent: ${c.token}\n${config.policies[c.token]}: ${scope}${config.paths.map(r=>`\n${r.action}: ${r.path}`).join('')}`);
 const output=`# ${partial?'Suggested AI/provider policy block — review existing groups before merging':'Complete robots.txt — review before replacing your file'}\n# Cooperative directives, not access control\n\n${partial?'':`User-agent: *\n${config.minimal?'Disallow':'Allow'}: /\n\n`}${groups.join('\n\n')}${config.sitemap?`\n\nSitemap: ${config.sitemap}`:''}\n`;
 const restricted=crawlerRegistry.filter(c=>config.policies[c.token]==='Disallow'||config.paths.some(r=>r.action==='Disallow'));
 const search=restricted.filter(c=>c.search),training=restricted.filter(c=>c.training);
 const impact=analysis.high||config.minimal||search.length?'HIGH IMPACT':analysis.notices.length||config.paths.length||scope!=='/'?'REVIEW':'LOW IMPACT';
 const warnings=search.map(c=>`${c.token}: ${c.effect}`);
 if(config.paths.length)warnings.push('Additional path rules apply to EVERY named provider, including search controls. Longest matching path wins; equal specificity favors Allow. More-specific Allow exceptions can reopen parts of a blocked scope.');
 if(scope!=='/')warnings.push('Scope is partial: restrictions do not cover the whole site. Unmatched paths default to allowed within these groups.');
 if(config.minimal)warnings.push('Minimal crawling is not privacy: even a wildcard block cannot protect private data or guarantee removal from indexes.');
 warnings.push('Google-Extended combines covered training and grounding; it does not affect Google Search ranking or inclusion. Other answer uses cannot all be separated by robots.txt.','ChatGPT-User is a preference only: user-triggered access may not follow normal robots rules.');
 return {output,label:partial?'AI/provider policy block':'Complete robots.txt',impact,training:training.length,search,warnings,analysis,action:impact==='HIGH IMPACT'?'Review search restrictions before publishing. Keep search controls allowed if discovery is intended.':'Review provider docs and merge at the root /robots.txt without losing existing rules. Test on the actual host after deployment.'};
}
