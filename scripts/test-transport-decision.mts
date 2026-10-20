import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decideTransport as decide,transportDefaults as d,transportScaleDefaults as s,transportPresets as presets,transportQuestions} from '../src/components/toolbox/tools/transportDecisionModel.ts';
const run=(name:string)=>decide({...d,...presets[name]});
assert.equal(run('Notification Feed').eligible[0].name,'SSE');
assert.equal(run('Chat Application').eligible[0].name,'WebSocket');
assert.equal(run('Basic Status Check').eligible[0].name,'Polling');
assert.equal(run('Multiplayer Game').eligible[0].name,'WebSocket');
assert.equal(run('Modern Streams / Datagrams').eligible[0].name,'WebTransport');
assert.equal(decide({...d,backend:'static'}).eligible.length,0);
for(const data of ['binary','mixed'])assert.ok(decide({...d,data}).ranked.find(r=>r.name==='SSE')!.blocked.length);
assert.equal(decide({...d,backend:'request',capability:'datagrams'}).eligible.length,0);
const modern={...d,...presets['Modern Streams / Datagrams'],capability:'streams'};
assert.equal(decide(modern).eligible[0].name,'WebTransport');
assert.ok(decide({...modern,http:'h2'}).ranked.find(r=>r.name==='WebTransport')!.blocked.length);
const broad=decide({...modern,compatibility:'broad'}),narrow=decide(modern);
assert.ok(broad.ranked.find(r=>r.name==='WebTransport')!.percent<narrow.ranked.find(r=>r.name==='WebTransport')!.percent);
assert.ok(decide({...d,complexity:'low'}).ranked.find(r=>r.name==='Polling')!.percent>decide({...d,complexity:'low'}).ranked.find(r=>r.name==='WebTransport')!.percent);
const contradictory=decide({...modern,capability:'datagrams',loss:'no',ordered:'yes'});
assert.ok(contradictory.warnings.some(w=>w.includes('conflict')));assert.ok(contradictory.warnings.some(w=>w.includes('ordered')));
assert.ok(decide({...d,frequency:'occasional'},{...s,eventRate:30}).warnings.some(w=>w.includes('conflict')));
assert.ok(decide({...d,resume:'yes'}).warnings.some(w=>w.includes('No transport guarantees durable replay')));
assert.deepEqual(decide(d),decide(d));
for(const p of Object.values(presets)){
 const r=decide({...d,...p});assert.equal(r.ranked.length,5);
 for(const option of r.ranked){assert.ok(Number.isFinite(option.percent)&&option.percent>=0&&option.percent<=100);assert.equal(option.percent,Math.round(option.earned/option.max*100));assert.equal(option.breakdown.length,transportQuestions.length+3);assert.equal(option.earned,option.breakdown.reduce((n,b)=>n+b.earned,0));}
}
assert.throws(()=>decide({...d,data:'invalid'}));
for(const value of [NaN,Infinity,-1,1e10])assert.throws(()=>decide(d,{...s,users:value}));
assert.throws(()=>decide(d,{} as typeof s));assert.throws(()=>decide(d,{...s,pollInterval:Number.MIN_VALUE}));
assert.ok(Number.isFinite(decide(d,{users:1e9,eventRate:1e9,duration:1e9,pollInterval:0.001}).pollRequests));
const source=fs.readFileSync('src/components/toolbox/tools/RealTimeTransportDecisionLab.tsx','utf8');
assert.ok(source.includes('setInput(transportDefaults);setScale(transportScaleDefaults);setPreset(\'\')'));
assert.equal((source.match(/trackToolResult\(\)/g)||[]).length,1);
for(const file of ['RealTimeTransportDecisionLab.tsx','transportDecisionModel.ts'])assert.ok(!/\bfetch\s*\(|new (?:WebSocket|EventSource|WebTransport)|localStorage|sessionStorage|URLSearchParams|sendBeacon/.test(fs.readFileSync(`src/components/toolbox/tools/${file}`,'utf8')));
console.log('Transport decision PASS: all presets, deterministic weights, infrastructure gates, compatibility, conflicts, bounds, reset and local-only generic analytics.');
