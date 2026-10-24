import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {parseDocument} from 'yaml';
import * as model from '../src/components/toolbox/tools/skillBuilderModel.ts';
import {activeTools} from '../src/data/tools.ts';
const base=()=>model.skillPreset(),build=model.generateSkill;let n=0;
const test=(fn:()=>void)=>{fn();n++;};const fail=(c:model.SkillConfig)=>assert.ok(build(c).blocked);const warn=(c:model.SkillConfig,p:RegExp)=>assert.ok(build(c).findings.some(f=>f.severity==='WARN'&&p.test(f.issue)));
const front=(text:string)=>parseDocument(/^---\n([\s\S]*?)\n---\n/.exec(text)![1]).toJS();
test(()=>{const r=build(base());assert.ok(!r.blocked);assert.equal(front(r.text).name,'review-pull-request');assert.ok(r.text.includes('## Workflow'));assert.equal(r.files.length,1);});
for(const name of ['', 'UPPER','-review','review-','review--code','review code','x'.repeat(65)])test(()=>fail({...base(),name}));
for(const name of ['x','x'.repeat(64),'résumé-review','数据-review','مراجعة'])test(()=>assert.ok(!build({...base(),name}).blocked,name));
test(()=>fail({...base(),folder:'different-directory'}));test(()=>assert.ok(!build({...base(),folder:base().name}).blocked));
test(()=>fail({...base(),description:''}));test(()=>fail({...base(),description:'x'.repeat(1025)}));test(()=>warn({...base(),description:'Extract useful data from the supplied structured document and format the findings.'},/when is unclear/));test(()=>assert.equal(build(base()).trigger,'Clear signals — heuristic'));
test(()=>{const c={...base(),license:'Proprietary: see "LICENSE.txt"'};assert.equal(front(build(c).text).license,c.license);});
test(()=>fail({...base(),compatibility:'x'.repeat(501)}));
test(()=>{const c={...base(),metadata:[{key:'version',value:'1.0'},{key:'enabled',value:'true'},{key:'special:key',value:'line 1\n"quoted" # text'}]};const d=front(build(c).text);assert.deepEqual(d.metadata,Object.fromEntries(c.metadata.map(m=>[m.key,m.value])));});
test(()=>fail({...base(),metadata:[{key:'x',value:'a'},{key:'x',value:'b'}]}));test(()=>fail({...base(),metadata:[{key:'',value:'a'}]}));
test(()=>warn({...base(),allowedTools:'Bash(git:*) Read'},/Experimental/));test(()=>warn({...base(),allowedTools:'Bash'},/Broad executable/));
test(()=>warn({...base(),workflow:[]},/No ordered/));test(()=>warn({...base(),workflow:[{title:'New step',instruction:'',condition:'',reference:''}]},/no actionable/));
test(()=>warn(model.skillPreset('Bad Mega Skill'),/Broad trigger/));test(()=>warn({...base(),constraints:'Do not modify files.',workflow:[{title:'Edit',instruction:'Edit files and delete files.',condition:'',reference:''}]},/conflicts/));
test(()=>warn({...base(),constraints:'Offline only.',workflow:[{title:'Fetch',instruction:'Use curl to download data.',condition:'',reference:''}]},/Offline/));
test(()=>warn({...base(),purpose:'detail '.repeat(3500)},/progressive-disclosure/));
test(()=>warn({...base(),constraints:'Offline only.',compatibility:'Requires network access.'},/Offline/));
test(()=>{const c=base();c.files=[{kind:'references',name:'rules.md',purpose:'Review rules',content:'Check evidence.',language:'',dependencies:''}];c.workflow[0].reference='references/rules.md';assert.ok(!build(c).findings.some(f=>f.issue.includes('Orphan')||f.issue.includes('not supplied')));assert.equal(build(c).files.find(f=>f.name==='references/rules.md')!.text,'Check evidence.');});
test(()=>{const c=base();c.workflow[0].reference='references/missing.md';warn(c,/not supplied/);});
test(()=>{const c=base();c.files=[{kind:'references',name:'rules.md',purpose:'',content:'Rules',language:'',dependencies:''}];warn(c,/Orphan/);});
test(()=>{const c=base();c.files=[{kind:'scripts',name:'helper.sh',purpose:'Inspect',content:'curl https://example.com\nrm -rf output\nnpm install example\nprintenv SECRET',language:'Bash',dependencies:'curl'}];for(const pattern of [/executable helper/,/network/,/destructive/,/installation/,/credentials/])warn(c,pattern);assert.equal(build(c).files.find(f=>f.name==='scripts/helper.sh')!.text,c.files[0].content);});
test(()=>{const c=base();c.files=[{kind:'scripts',name:'plan.sh',purpose:'Plan only',content:'',language:'Bash',dependencies:'git'}];const r=build(c);assert.ok(!r.files.some(f=>f.name==='scripts/plan.sh'));assert.ok(r.tree.includes('[plan; file not supplied]'));const plan=JSON.parse(r.files.find(f=>f.name==='supporting-files.json')!.text);assert.equal(plan.files[0].dependencies,'git');});
test(()=>{const c=base();c.files=[{kind:'assets',name:'template.json',purpose:'Template',content:'',language:'',dependencies:''}];assert.ok(build(c).tree.includes('assets/template.json'));assert.equal(JSON.parse(build(c).files.find(f=>f.name==='supporting-files.json')!.text).files[0].contentSupplied,false);});
for(const name of ['../bad.sh','/bad.sh','a/b.sh','bad..sh'])test(()=>{const c=base();c.files=[{kind:'scripts',name,purpose:'',content:'',language:'',dependencies:''}];fail(c);});
test(()=>{assert.equal(model.approximateTokens('12345'),2);const c=base();assert.deepEqual(build(c),build(c));const moved=model.moveSkillStep(c.workflow,0,1);assert.equal(moved[1].title,c.workflow[0].title);});
for(const p of model.skillPresets)test(()=>{const r=build(model.skillPreset(p));assert.ok(!r.blocked,p);assert.deepEqual(r,build(model.skillPreset(p)));assert.equal(parseDocument(/^---\n([\s\S]*?)\n---\n/.exec(r.text)![1]).errors.length,0);});
for(const sample of ['Description: colon # sign','line1\n---\nline2','"double" and \'single\'','yes','false','null','123','Unicode: café 中文'])test(()=>{const c={...base(),description:sample};assert.equal(front(build(c).text).description,sample);});
const imported=build(base()).text.replace('---\n\n#','custom-extension:\n  nested: true\n---\n\n#');let a=await model.analyzeSkill(imported);assert.equal(a.text,imported);assert.ok(a.findings.some(f=>f.issue==='Unknown/extension field preserved.'));assert.equal(a.blocked,false);n++;
for(const text of ['missing frontmatter','---\nname: x\nname: y\ndescription: hi\n---\nBody','---\nname: x\ndescription: !!js/function x\n---\nBody','---\nname: x\ndescription: &a hi\nother: *a\n---\nBody']){await assert.rejects(()=>model.analyzeSkill(text));n++;}
a=await model.analyzeSkill('---\nname: test-skill\ndescription: Use when the user needs a focused test workflow with an explicit result.\nmetadata:\n  version: 1\n---\n1. Inspect input.\n2. Return output.');assert.ok(a.blocked);n++;
await assert.rejects(()=>model.analyzeSkill('x'.repeat(160001)));n++;
for(const key of ['name','allowed-tools','compatibility']){const doc=build(base()).text.replace(/\n---\n/,`\n${key}: {toString: invalid}\n---\n`).replace(key==='name'?/^name:.*\n/m:/^not-a-real-key$/m,'');const invalid=await model.analyzeSkill(doc);assert.ok(invalid.blocked);n++;}

test(()=>{const c=base();c.workflow=Array(21).fill(c.workflow[0]);assert.throws(()=>build(c));});
test(()=>{for(const file of ['skillBuilderModel.ts','AgentSkillBuilder.tsx'])assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|sendBeacon|console\.|dangerouslySetInnerHTML|\beval\s*\(|new Function/.test(fs.readFileSync('src/components/toolbox/tools/'+file,'utf8')),file);});
// Real local export helpers: verify exact bytes and names, including raw script contents.
const require=createRequire(import.meta.url);let blob:Blob|undefined,filename='',copied='';const helperExports:any={};
const helperContext=vm.createContext({exports:helperExports,Blob,XMLSerializer:class{},URL:{createObjectURL:(b:Blob)=>{blob=b;return 'blob:local';},revokeObjectURL:()=>{}},document:{createElement:()=>({set download(v:string){filename=v;},click(){},remove(){}}),body:{appendChild(){}}},navigator:{clipboard:{writeText:async(v:string)=>{copied=v;}}},require:()=>({trackToolExport:()=>{}})});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/components/toolbox/shared/exportHelpers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,helperContext);
const c=base();c.files=[{kind:'scripts',name:'helper.sh',purpose:'Read-only helper',content:'# User supplied\nprintf hello\n',language:'Bash',dependencies:'shell'}];for(const f of build(c).files){const name=f.name.split('/').at(-1)!;if(name.endsWith('.md'))helperExports.downloadMarkdown(f.text,name);else helperExports.downloadText(f.text,name);assert.equal(filename,name);assert.equal(await blob!.text(),f.text);await helperExports.copyText(f.text);assert.equal(copied,f.text);}n++;
// Real component handlers: generic events only, stale-output blocking, reset and keyboard reordering.
const values:any[]=[];let cursor=0;const events:any[]=[],downloads:any[]=[];
const hooks={useState:(initial:any)=>{const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],(v:any)=>values[i]=typeof v==='function'?v(values[i]):v];},useId:()=> 'skill-test',useRef:(initial:any)=>{const i=cursor++;if(!(i in values))values[i]={current:initial};return values[i];},useEffect:()=>{}};
const componentExports:any={},ctx=vm.createContext({exports:componentExports,require:(name:string)=>name==='react'?hooks:name==='react/jsx-runtime'?require(name):name.endsWith('skillBuilderModel')?model:name.endsWith('/Insight')?(()=>null):name.endsWith('/analytics')?{trackToolResult:(...args:any[])=>events.push(['result',args]),trackShareAction:(...args:any[])=>events.push(['copy',args])}:name.endsWith('/exportHelpers')?{copyText:async(text:string)=>{copied=text;return true;},downloadText:(...args:any[])=>downloads.push(args),downloadMarkdown:(...args:any[])=>downloads.push(args)}:{} });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/components/toolbox/tools/AgentSkillBuilder.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
function nodes(v:any):any[]{return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];}
const render=()=>{cursor=0;return componentExports.default({toolSlug:'agent-skill-skill-md-builder'});};const button=(t:any,label:string)=>nodes(t).find(n=>n.type==='button'&&n.props.children===label);const input=(t:any,key:string)=>nodes(t).find(n=>n.props?.id===`skill-test-${key}`);
let tree=render();input(tree,'name').props.onChange({target:{value:'private-internal-workflow'}});tree=render();assert.equal(events.length,0);button(tree,'Build and review skill').props.onClick();tree=render();assert.deepEqual(events[0],['result',[]]);await button(tree,'Copy SKILL.md').props.onClick();tree=render();assert.ok(copied.includes('private-internal-workflow'));assert.ok(!JSON.stringify(events).includes('private-internal'));button(tree,'Download SKILL.md').props.onClick();assert.equal(downloads[0][0],copied);assert.equal(downloads[0][1],'SKILL.md');n++;
input(tree,'name').props.onChange({target:{value:'INVALID'}});tree=render();assert.equal(button(tree,'Copy SKILL.md').props.disabled,true);n++;
button(tree,'Reset builder').props.onClick();tree=render();assert.equal(input(tree,'name').props.value,base().name);assert.ok(!button(tree,'Copy SKILL.md'));n++;
button(tree,'Build and review skill').props.onClick();tree=render();input(tree,'import').props.onChange({target:{value:'invalid frontmatter'}});tree=render();await button(tree,'Analyze pasted skill').props.onClick();tree=render();assert.ok(!button(tree,'Copy SKILL.md'));n++;
button(tree,'Reset builder').props.onClick();tree=render();button(tree,'Build and review skill').props.onClick();tree=render();const ids=nodes(tree).filter(n=>n.props?.id).map(n=>n.props.id);assert.equal(new Set(ids).size,ids.length);n++;
test(()=>{assert.ok(activeTools.length>=89);assert.ok(activeTools.filter(t=>t.family==='create').length>=19);});
console.log(`PASS: ${n} skill format, YAML/import, name/discovery, context, supporting-file, script-risk, exact-export, privacy and UI-handler groups.`);
