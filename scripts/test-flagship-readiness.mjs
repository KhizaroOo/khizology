import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Settled auto-results must be meaningful changes, not render/drag event inflation.
let ref, previousDeps, cleanup;
const timers = [], events = [];
const context = vm.createContext({exports: {}, require: id => id === 'react' ? {
  useRef: value => ref ||= {current:value},
  useEffect(fn, deps) { if (!previousDeps || deps.some((v,i)=>v!==previousDeps[i])) {cleanup?.(); previousDeps=deps; cleanup=fn();} },
} : {trackToolResult:(...args)=>events.push(args)},
setTimeout: fn => {const timer={fn,active:true};timers.push(timer);return timer;},
clearTimeout: timer => timer.active=false});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/useToolResult.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, context);
const render=(value,valid=true)=>context.exports.default(value,valid);
const flush=()=>timers.filter(t=>t.active).forEach(t=>{t.active=false;t.fn();});
render('initial'); flush(); assert.equal(events.length,0);
render('changed'); render('changed-again'); flush(); assert.equal(events.length,1);
render('changed-again'); flush(); assert.equal(events.length,1);
render('pending'); render('invalid',false); flush(); assert.equal(events.length,1);
render('valid-current'); flush(); assert.equal(events.length,2);
render('unmount-pending'); cleanup?.(); flush(); assert.equal(events.length,2);
assert.ok(events.every(args=>args.length===0),'Only existing public tool metadata is emitted; no revision/input payload');
const atlas=fs.readFileSync('src/pages/infooo/human-atlas.astro','utf8');
assert.match(atlas,/followTheBloodGuide.steps.map/);
assert.match(atlas,/humanAtlasEntities.find/);
assert.match(atlas,/humanAtlasRelationships.find/);
assert.match(atlas,/Follow the Blood without the 3D view/);
assert.match(atlas,/not medical diagnosis or treatment/);
assert.doesNotMatch(atlas,/localStorage|sessionStorage/);
console.log('Flagships PASS: no mount events, settled result dedupe, invalid state and timer cleanup, no raw analytics arguments, canonical non-diagnostic Atlas reading route.');
