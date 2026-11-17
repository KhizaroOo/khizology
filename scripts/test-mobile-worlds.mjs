import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => fs.readFileSync(file,'utf8');
const footer=read('src/components/layout/Footer.astro');
assert.equal((footer.match(/data-footer-group open/g)||[]).length,2);
for(const id of ['monsters','explore'])assert.ok(footer.includes(`aria-labelledby="footer-${id}-title"`));
assert.ok(footer.includes('<summary class="k-footer-heading">'));
const media={matches:true,addEventListener(name,fn){assert.equal(name,'change');this.update=fn;}},groups=[{open:true},{open:true}];
const footerScript=footer.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(ts.transpileModule(footerScript,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{window:{matchMedia:()=>media},document:{querySelectorAll(selector){assert.equal(selector,'footer [data-footer-group]');return groups;}}});
assert.ok(groups.every(group=>!group.open));media.matches=false;media.update();assert.ok(groups.every(group=>group.open));

const cubeSource=read('src/components/infooo/rubiks/RubiksCubeMotionGraph.tsx');
const ast=ts.createSourceFile('cube.tsx',cubeSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let select;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='selectPiece')select=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);
assert.ok(select);
let selected='',view='',focused=0,camera=0,starts=0;
const scope={world:{slug:'rubiks-cube-motion-graph'},trackInfoooWorldStart(slug){assert.equal(slug,'rubiks-cube-motion-graph');starts++;},cubieById:(_,id)=>id==='invalid'?null:{type:'corner'},state:{},size:3,view:'motion',window:{matchMedia:()=>({matches:true})},cubeTab:{current:{focus(){focused++;}}},setSelectedId:id=>{selected=id;},setView:value=>{view=value;},pieceVisible:()=>false,cameraAngle:{},setCameraAngle:()=>{camera++;},presetAngle:()=>({}),revealView:()=> 'Bottom'};
const selectPiece=vm.runInNewContext(ts.transpileModule(`(${select})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
selectPiece('corner');assert.equal(selected,'corner');assert.equal(view,'cube');assert.equal(focused,1);assert.equal(camera,1);assert.equal(starts,1);
selectPiece('invalid');assert.equal(focused,1,'invalid selections do not change tabs or focus');assert.equal(starts,1,'invalid selections do not start the world');
assert.ok(cubeSource.includes('role="button" aria-pressed={selected}'));
assert.ok(cubeSource.includes('Select a token to open its highlighted piece in Cube view.'));

const themeSource=read('public/infooo/human-atlas-viewer/theme.js');
const changes=new Map(),events=new Map(),observers=[];
const parentRoot={dark:true,classList:{contains:()=>parentRoot.dark}},root={dataset:{},style:{setProperty:(key,value)=>changes.set(key,value)},classList:{toggle:(key,value)=>{assert.equal(key,'dark');root.dark=value;}}};
const window={parent:{location:{origin:'https://khizooology.com'},document:{documentElement:parentRoot},getComputedStyle:()=>({getPropertyValue:()=>parentRoot.dark?'#0F1117':'#F5F5F8'})},location:{origin:'https://khizooology.com'},addEventListener:(name,fn)=>events.set(name,fn)};
class Observer{constructor(fn){this.update=fn;observers.push(this);}observe(target,options){assert.equal(target,parentRoot);assert.equal(options.attributeFilter.join(','),'class,style');this.active=true;}disconnect(){this.active=false;}}
vm.runInNewContext(themeSource,{window,document:{documentElement:root},MutationObserver:Observer,CSS:{supports:(_,value)=>/^#[a-f\d]{6}$/i.test(value)}});
assert.equal(root.dark,true);assert.equal(root.dataset.siteEmbed,'true');assert.equal(changes.size,6);parentRoot.dark=false;observers[0].update();assert.equal(root.dark,false);assert.equal(changes.get('--k-bg'),'#F5F5F8');events.get('pagehide')();assert.equal(observers[0].active,false);events.get('pageshow')();assert.equal(observers[0].active,true);
window.parent.location.origin='https://different.example';const before=observers.length;vm.runInNewContext(themeSource,{window});assert.equal(observers.length,before,'cross-origin frames never install a bridge');
assert.doesNotMatch(themeSource,/localStorage|sessionStorage|postMessage|fetch\(/);
const scene=read('vendor/human-atlas/app/scene.tsx');assert.ok(scene.includes('themeObserver.disconnect()'));assert.ok(scene.includes('renderer.setClearColor(getComputedStyle(document.documentElement).backgroundColor)'));assert.ok(scene.includes('},[atlas])'),'theme must not re-create the renderer');
assert.ok(read('public/infooo/human-atlas-viewer/index.html').includes('src="./theme.js"'));
assert.ok(read('src/components/infooo/first-visit.css').includes('.infooo-entry-comparison{grid-template-columns:1fr;width:100%}'));
assert.ok(read('src/components/infooo/visual-story.css').includes('.coding-world .scene-controls{order:-1'));
console.log('Mobile/embed PASS: native footer disclosure responsiveness, real Cube selection/reveal/focus, same-origin theme synchronization and lifecycle, renderer reuse, scoped layout protections. Browser geometry checks run separately.');

const atlasCss=read('public/infooo/human-atlas-viewer/khizology.css');
assert.ok(atlasCss.includes('html.dark .enabled .system-name{color:var(--foreground)}'));
assert.ok(atlasCss.includes('body:has(.detail-sheet) .bottom-dock{visibility:hidden}'));
assert.ok(atlasCss.includes('grid-template-columns:repeat(6,44px)'));
