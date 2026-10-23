import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {parseDocument} from 'yaml';
import * as model from '../src/components/toolbox/tools/provenanceModel.ts';
import {activeTools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
const {buildProvenance:build,provenanceDefaults:defaults,provenanceMetadata:metadata}=model;
const example={...defaults,repository:'example/project',artifactPath:'dist/app.tar.gz',buildCommand:'npm run build'};
const workflow=(result:ReturnType<typeof build>,name='provenance.yml')=>result.files.find(f=>f.name===name)!.text;
const localPathPattern:RegExp=vm.runInNewContext(fs.readFileSync('scripts/audit-prelaunch.mjs','utf8').match(/const localPathPattern = (.+);/)![1]);
for(const path of ['C:\\Users\\owner\\project','D:\\workspace\\repo','C:/Users/owner/project','D:/workspace/project'])assert.ok(localPathPattern.test(path));
assert.ok(!localPathPattern.test(JSON.stringify(workflow(build(example)))));
const parse=(text:string)=>{const doc=parseDocument(text);assert.deepEqual(doc.errors,[]);return doc.toJSON();};
let result=build(defaults);assert.equal(result.workflowReady,false);assert.ok(!result.files.some(f=>f.kind==='yaml'));assert.match(result.verification,/Resolve FAIL/);
result=build(example);assert.ok(result.workflowReady);let yaml=workflow(result), doc=parse(yaml);assert.ok(doc.on.push.tags.includes('v*'));assert.deepEqual(doc.permissions,{});assert.deepEqual(doc.jobs.build.permissions,metadata.permissions);assert.equal(doc.jobs.build.steps[0].with['persist-credentials'],false);
const steps=doc.jobs.build.steps;assert.equal(steps.find((s:any)=>s.name==='Build final artifact').run,example.buildCommand);assert.ok(yaml.indexOf('Build final artifact')<yaml.indexOf('Attest build provenance'));assert.ok(yaml.indexOf('Attest build provenance')<yaml.indexOf('Verify artifact'));assert.ok(yaml.indexOf('Verify artifact')<yaml.indexOf('Publish the same file'));assert.equal(steps.at(-1).with.archive,false);assert.equal(steps.filter((s:any)=>s.uses===metadata.action).length,1);assert.ok(!yaml.includes('sbom-path'));assert.ok(!yaml.includes('packages:'));assert.match(result.verification,/--repo 'example\/project'/);assert.match(result.verification,/--signer-workflow 'example\/project\/\.github\/workflows\/provenance.yml'/);
for(const name of Object.keys(model.provenancePresets) as model.ProvenancePreset[]){
  const c={...model.provenancePreset(name),repository:example.repository,artifactPath:example.artifactPath,imageName:'ghcr.io/example/app',buildCommand:example.buildCommand,sbomPath:'sbom.cdx.json',sbomCommand:'npm run sbom',deployCommand:'./deploy.sh "$ARTIFACT_PATH"'};
  result=build(c);assert.ok(result.workflowReady,name);for(const file of result.files.filter(f=>f.kind==='yaml'))parse(file.text);assert.equal(JSON.stringify(result),JSON.stringify(build(c)));assert.ok(!/SLSA certified|is SLSA L3|guarantees security/.test(JSON.stringify(result)));
}
for(const type of Object.keys(model.provenanceChoices.artifactType) as model.ProvenanceConfig['artifactType'][]){const r=build({...example,artifactType:type,imageName:'ghcr.io/example/app'});assert.ok(r.workflowReady,type);parse(workflow(r));}
for(const release of Object.keys(model.provenanceChoices.release) as model.ProvenanceConfig['release'][]){const r=build({...example,release});assert.ok(r.workflowReady);parse(workflow(r));}
for(const format of ['cyclonedx','spdx']as const){
  result=build({...example,sbom:'generate',sbomFormat:format,sbomPath:'sbom.json',sbomCommand:'npm run sbom'});yaml=workflow(result);doc=parse(yaml);assert.equal(doc.jobs.build.steps.filter((s:any)=>s.uses===metadata.action).length,2);assert.match(result.verification,new RegExp(metadata.predicates[format].replaceAll('.','\\.')));assert.equal(doc.jobs.build.steps.filter((s:any)=>s.uses===metadata.action)[1].with['sbom-path'],'${{ env.SBOM_PATH }}');assert.ok(!yaml.includes('predicate-type:'));assert.ok(yaml.indexOf('Produce SBOM')<yaml.indexOf('Attest SBOM'));
}
assert.equal(build({...example,sbom:'generate',sbomPath:'sbom.json'}).workflowReady,false);
assert.equal(build({...example,sbom:'existing',sbomPath:example.artifactPath}).workflowReady,false);
assert.ok(build({...example,sbom:'existing',sbomPath:'sbom.json'}).workflowReady);
assert.equal(build({...example,buildCommand:'  \n\t '}).workflowReady,false);assert.equal(build({...example,artifactPath:''}).workflowReady,false);
result=build({...example,permissions:'broad'});assert.ok(result.findings.some(f=>f.status==='WARN'&&f.title.includes('write-all')));assert.ok(!workflow(result).includes('write-all'));
result=build({...example,publish:'release'});assert.equal(parse(workflow(result)).jobs.build.permissions.contents,'write');assert.match(workflow(result),/--verify-tag/);assert.ok(!workflow(result).includes('--clobber'));
result=build({...example,publish:'external',publishCommand:'npm publish "$ARTIFACT_PATH"'});assert.equal(parse(workflow(result)).jobs.build.permissions.contents,'read');assert.match(workflow(result),/npm publish/);assert.equal(build({...example,publish:'external'}).workflowReady,false);
const digest='a'.repeat(40),ref=`example/builders/.github/workflows/build.yml@${digest}`;
result=build({...example,reusable:'existing',reusableRef:ref});doc=parse(workflow(result));assert.equal(doc.jobs['trusted-build'].uses,ref);assert.ok(!doc.jobs['trusted-build'].with);assert.ok(!doc.jobs['trusted-build'].secrets);assert.match(result.verification,/--signer-repo 'example\/builders'/);assert.match(result.verification,/--signer-workflow 'example\/builders\/\.github\/workflows\/build.yml'/);assert.ok(result.findings.some(f=>f.title==='Existing reusable contract is unverified'));
assert.equal(build({...example,reusable:'existing',reusableRef:ref.replace(digest,'main')}).workflowReady,false);
result=build({...example,reusable:'create',goal:'slsa'});assert.equal(parse(workflow(result)).jobs['trusted-build'].uses,'./.github/workflows/provenance-build.yml');const reusable=parse(workflow(result,'provenance-build.yml'));assert.ok(reusable.on.workflow_call);assert.ok(!reusable.on.workflow_call.inputs);assert.match(result.verification,/provenance-build.yml/);assert.match(result.verification,/--deny-self-hosted-runners/);assert.ok(result.findings.some(f=>f.title==='No hardened-build level established'));
assert.equal(build({...example,goal:'slsa',verification:'none'}).workflowReady,false);assert.ok(build({...example,goal:'basic',verification:'none'}).findings.some(f=>f.status==='WARN'&&f.title==='No verification selected'));
assert.equal(build({...example,subjectStage:'intermediate'}).workflowReady,false);
assert.equal(build({...example,signerWorkflow:'other/repo/.github/workflows/build.yml'}).workflowReady,false);
assert.equal(build({...example,owner:'different'}).workflowReady,false);
result=build({...example,sourceRef:'refs/tags/v1.0.0',verification:'deployment',deployCommand:'./deploy.sh "$ARTIFACT_PATH"'});yaml=workflow(result);parse(yaml);assert.ok(yaml.indexOf('Verify artifact')<yaml.indexOf('Deploy only'));assert.match(result.verification,/--source-ref 'refs\/tags\/v1.0.0'/);
result=build({...example,verification:'deployment'});assert.ok(result.workflowReady);assert.ok(!workflow(result).includes('name: Deploy only'));assert.ok(result.findings.some(f=>f.title==='Deployment is not configured'));
result=build({...example,artifactType:'container',imageName:'ghcr.io/example/app',verification:'deployment',deployCommand:'./deploy.sh "$VERIFIED_IMAGE"'});yaml=workflow(result);doc=parse(yaml);assert.equal(doc.jobs.build.permissions.packages,'write');assert.ok(!yaml.includes('artifact-metadata'));assert.match(yaml,/create-storage-record: false/);assert.match(yaml,/steps.image.outputs.digest/);assert.match(yaml,/VERIFIED_IMAGE:.*@/);assert.match(result.verification,/EXPECTED_DIGEST/);assert.ok(yaml.indexOf('Push image')<yaml.indexOf('Attest build'));assert.ok(yaml.indexOf('Attest build')<yaml.indexOf('Verify artifact'));assert.ok(yaml.indexOf('Verify artifact')<yaml.indexOf('Deploy only'));assert.ok(result.findings.some(f=>f.title==='Container publication precedes registry attestation'));
assert.equal(build({...example,artifactType:'container',imageName:'ghcr.io/example/app:latest'}).workflowReady,false);
assert.equal(build({...example,artifactType:'container',imageName:'registry.example/app'}).workflowReady,false);
assert.equal(build({...example,artifactType:'container',imageName:'ghcr.io/example/app/'}).workflowReady,false);
assert.equal(build({...example,release:'custom',branch:'feature//bad'}).workflowReady,false);
assert.ok(build({...example,environment:'kubernetes'}).policy.some(p=>p.includes('cluster-wide')));
result=build({...example,visibility:'private'});assert.match(result.files.at(-1)!.text,/Enterprise Cloud/);assert.match(result.files.at(-1)!.text,/without that public log/);
result=build({...example,platform:'generic'});assert.ok(!result.files.some(f=>f.kind==='yaml'));assert.ok(!result.verification.includes('gh attestation'));assert.match(result.summary,/architecture only/);
for(const artifactPath of ['../secret','/absolute','dist/*.zip','dist/app\npermissions: write-all','${{ github.event.issue.title }}','dist/../../x','-danger'])assert.equal(build({...example,artifactPath}).workflowReady,false,artifactPath);
for(const buildCommand of ['${{ github.event.issue.title }}','bad\u0000text'])assert.equal(build({...example,buildCommand}).workflowReady,false);
const multiline='\n  printf "quoted: text"\nprintf \'line\\n\'\n# permissions: write-all';result=build({...example,buildCommand:multiline});assert.equal(parse(workflow(result)).jobs.build.steps.find((s:any)=>s.name==='Build final artifact').run,multiline);assert.throws(()=>build({...example,buildCommand:'x'.repeat(6001)}),/6,000/);

// Exact browser export helpers: mocked local Blob/clipboard only; nothing is executed or uploaded.
const require=createRequire(import.meta.url), exportSource=fs.readFileSync('src/components/toolbox/shared/exportHelpers.ts','utf8');
let blob:Blob|undefined,filename='',copied='',exported:string[]=[];
const helperExports:any={}, helperContext=vm.createContext({exports:helperExports,Blob,XMLSerializer:class{},URL:{createObjectURL:(b:Blob)=>{blob=b;return 'blob:local-test';},revokeObjectURL:()=>{}},document:{createElement:()=>({set download(value:string){filename=value;},click(){},remove(){}}),body:{appendChild(){}}},navigator:{clipboard:{writeText:async(text:string)=>{copied=text;}}},require:()=>({trackToolExport:(type:string)=>exported.push(type)})});
vm.runInContext(ts.transpileModule(exportSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,helperContext);
result=build(example);for(const f of result.files){if(f.kind==='yaml')helperExports.downloadText(f.text,f.name);else helperExports.downloadMarkdown(f.text,f.name);assert.equal(await blob!.text(),f.text);assert.equal(filename,f.name);await helperExports.copyText(f.text);assert.equal(copied,f.text);}assert.deepEqual(exported,['txt','md']);

// UI handler boundaries: config changes invalidate output; only public action metadata reaches analytics.
const source=fs.readFileSync('src/components/toolbox/tools/SoftwareProvenanceWorkflowBuilder.tsx','utf8');
const values:any[]=[];let cursor=0,events:any[]=[],download:any[]=[];
const hooks={useState:(initial:any)=>{const index=cursor++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return [values[index],(value:any)=>values[index]=typeof value==='function'?value(values[index]):value];},useId:()=> 'provenance-test'};
const componentExports:any={},context=vm.createContext({exports:componentExports,require:(name:string)=>name==='react'?hooks:name==='react/jsx-runtime'?require(name):name.endsWith('provenanceModel')?model:name.endsWith('/url')?{url:(path:string)=>path}:name.endsWith('/Insight')?(()=>null):name.endsWith('/exportHelpers')?{copyText:async(text:string)=>{copied=text;return true;},downloadText:(...args:any[])=>download.push(args),downloadMarkdown:(...args:any[])=>download.push(args)}:name.endsWith('/analytics')?{trackToolResult:(...args:any[])=>events.push(['result',args]),trackShareAction:(...args:any[])=>events.push(['copy',args])}:{} });
vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const render=()=>{cursor=0;return componentExports.default({toolSlug:'software-provenance-workflow-builder'});};
function nodes(value:any):any[]{return Array.isArray(value)?value.flatMap(nodes):value&&typeof value==='object'?[value,...nodes(value.props?.children)]:[];}
const button=(tree:any,name:string)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===name);
const input=(tree:any,suffix:string)=>nodes(tree).find(n=>n.props?.id===`provenance-test-${suffix}`);
let tree=render();for(const [key,value] of Object.entries({repository:'private-owner/private-project',artifactPath:'dist/private-output.tgz',buildCommand:'npm run private-build'})){input(tree,key).props.onChange({target:{value}});tree=render();}
button(tree,'Generate workflow plan').props.onClick();tree=render();assert.equal(events.length,1);assert.equal(JSON.stringify(events),'[["result",[]]]');await button(tree,'Copy displayed file').props.onClick();assert.ok(copied.includes('npm run private-build'));button(tree,'Download file').props.onClick();assert.equal(download[0][0],copied);assert.equal(download[0][1],'provenance.yml');assert.ok(!JSON.stringify(events).includes('private-'));assert.ok(!JSON.stringify(events).includes('npm run'));
input(tree,'buildCommand').props.onChange({target:{value:'npm run changed-build'}});tree=render();assert.ok(!button(tree,'Copy displayed file'));button(tree,'Reset').props.onClick();tree=render();assert.equal(input(tree,'repository').props.value,'');assert.equal(input(tree,'buildCommand').props.value,'');assert.ok(!button(tree,'Copy displayed file'));
for(const file of ['provenanceModel.ts','SoftwareProvenanceWorkflowBuilder.tsx']){const text=fs.readFileSync('src/components/toolbox/tools/'+file,'utf8');assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|sendBeacon|console\.|URLSearchParams|dangerouslySetInnerHTML|\beval\s*\(|new Function/.test(text),file);}
const batch=['webmcp-readiness-doctor','llm-model-routing-simulator','structured-output-json-schema-builder','browser-ai-capability-checker','software-provenance-workflow-builder'];for(const id of batch){const t=activeTools.find(t=>t.id===id)!;assert.ok(t&&t.privacySensitive);for(const next of [...getRelatedTools(t),...getTryNextTools(t)])assert.ok(activeTools.some(t=>t.id===next.id));}assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
console.log(`PASS: seven starting points, all artifact/release types, parsed YAML, least privilege, separate SBOM predicates, file/digest identity, signer policy, reusable workflows, verify-before-deploy, SLSA truthfulness, missing/unsafe inputs, exact exports, deterministic output, reset/stale output, privacy and batch relationships. ${activeTools.length} tools; ${activeTools.filter(t=>t.family==='create').length} Create.`);
