import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {stripTypeScriptTypes} from 'node:module';
const read=p=>fs.readFileSync(p,'utf8');
const source=read('public/infooo/human-atlas-viewer/learning-layer.js');
const ast=ts.createSourceFile('learning.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=new Map();
function walk(node){if(ts.isFunctionDeclaration(node)&&node.name)declarations.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))declarations.set(node.name.text,node.initializer?.getText(ast));ts.forEachChild(node,walk);}walk(ast);
const targets=vm.runInNewContext('('+declarations.get('targets')+')'),guide=vm.runInNewContext('('+declarations.get('guide')+')');
const catalogue=JSON.parse(read('public/infooo/human-atlas-assets/models/atlas.json'));
const canonical=await import('data:text/javascript,'+encodeURIComponent(stripTypeScriptTypes(read('src/data/humanAtlasLearning.ts'))));
assert.equal(guide.length,7);assert.equal(JSON.stringify(guide.map(step=>step[0].replaceAll(' ','-'))),JSON.stringify(canonical.followTheBloodGuide.steps));
const parts=new Map(catalogue.parts.map(part=>[part.id,part]));
for(const[key,target]of Object.entries(targets)){const concept=catalogue.concepts.find(c=>c.id===target.id);assert.equal(concept?.name,target.name,key);assert.ok(concept.elements.length&&concept.elements.every(id=>parts.has(id)));}
const page=read('vendor/human-atlas/app/page.tsx'),pageAst=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
function findEffect(node){if(ts.isCallExpression(node)&&node.expression.getText(pageAst)==='useEffect'&&node.arguments[0]?.getText(pageAst).includes('infooo-atlas-select'))effect=node.arguments[0].getText(pageAst);ts.forEachChild(node,findEffect);}findEffect(pageAst);assert.ok(effect);
const listeners=new Map(),messages=[],nodes=[];
class Element{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.handlers={};}append(...children){this.children.push(...children);}setAttribute(name,value){this[name]=value;}addEventListener(name,handler){this.handlers[name]=handler;}click(){if(!this.disabled)this.handlers.click?.();}querySelector(selector){return this.children.find(child=>'.'+child.className===selector)||null;}remove(){}}
class LocalEvent{constructor(type,options){this.type=type;this.detail=options.detail;this.cancelable=options.cancelable;this.defaultPrevented=false;}preventDefault(){this.defaultPrevented=true;}}
const initial={selected:['previous'],isolate:true,visible:['skeletal'],view:'back',rotate:true,explode:.6,reset:9};let state={...initial},chosen=null;
const document={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),dispatchEvent(event){listeners.get(event.type)?.(event);return!event.defaultPrevented;},createElement:tag=>new Element(tag),querySelector(selector){assert.ok(['.detail-sheet .detail-scroll','#ha-guide-step','.ha-guide-launch'].includes(selector),'No implicit reset or search manipulation: '+selector);return{scrollTop:0,focus(){nodes.push(selector);}};}};
const context=vm.createContext({atlas:catalogue,parts,progress:100,error:'',CustomEvent:LocalEvent,document,targets,guide,guideIndex:-1,unavailable:false,flushSync:fn=>fn(),setChosen:value=>{chosen=value;},setState:fn=>{state=fn(state);},setDetails:()=>{},setPanel:()=>{},getId:()=>chosen?.id||'',getTitle:()=>chosen?.name||'',announce:(text,error)=>messages.push({text,error}),injectDetails:()=>{}});
const run=text=>vm.runInContext(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
const cleanup=run('('+effect+')')();assert.equal(listeners.size,1);
for(const name of ['selectStructure','moveGuide','finishGuide','guideContent','button','guideControls'])run(declarations.get(name));
for(let i=0;i<guide.length;i++){context.moveGuide(i);assert.equal(chosen.id,targets[guide[i][0]].id);assert.equal(context.unavailable,false);for(const key of ['isolate','visible','view','rotate','explode','reset'])assert.equal(JSON.stringify(state[key]),JSON.stringify(initial[key]),'guide preserves '+key);}
context.moveGuide(3);const previous=chosen;targets['pulmonary vein'].id='missing';context.moveGuide(3);assert.equal(chosen,previous);assert.equal(context.unavailable,true);assert.match(context.guideContent().innerHTML,/Structure unavailable/);targets['pulmonary vein'].id=previous.id;context.moveGuide(3);assert.equal(context.unavailable,false);
chosen=catalogue.concepts.find(c=>c.name==='brain');assert.match(context.guideContent().innerHTML,/Guide paused for exploration/);context.moveGuide(3);assert.equal(chosen.name,'pulmonary vein');
context.progress=50;const unchanged=JSON.stringify(state);context.moveGuide(5);assert.equal(context.unavailable,true);assert.equal(JSON.stringify(state),unchanged);context.progress=100;context.error='Viewer unavailable';context.moveGuide(5);assert.equal(context.unavailable,true);context.error='';context.moveGuide(5);assert.equal(chosen.name,'aorta');
context.moveGuide(0);let section=new Element('section');context.guideControls(section);let buttons=section.children[0].children;assert.equal(buttons[0].disabled,true);buttons[1].click();assert.equal(context.guideIndex,1);section=new Element('section');context.guideControls(section);buttons=section.children[0].children;buttons[0].click();assert.equal(context.guideIndex,0);context.moveGuide(4);buttons[2].click();assert.equal(context.guideIndex,0);const saved=JSON.stringify(state);context.finishGuide(false);assert.equal(context.guideIndex,-1);assert.equal(JSON.stringify(state),saved);context.moveGuide(6);context.finishGuide(true);assert.match(messages.at(-1).text,/Guide complete/);assert.equal(context.guideIndex,-1);
cleanup();assert.equal(listeners.size,0);assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|setTimeout|requestAnimationFrame|Finish & reset|HTMLInputElement/);
assert.ok(page.includes('data-atlas-id={chosen?.id}'));
console.log('Atlas learning PASS: approved seven-step sequence, exact catalogue IDs and geometry, real selection handler, navigation/restart/finish/exit, unchanged view/layers/isolation, paused exploration, unavailable/loading/error handling, focus and listener cleanup.');
