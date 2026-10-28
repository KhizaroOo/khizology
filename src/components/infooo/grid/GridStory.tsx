import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {useInfoooReducedMotion} from '../InfoooWorldFoundation';
import {compactScenarios,compactResult,compactInitial,compactAction,compactTick,compactHealth,type CompactScenario,type GridAction} from './gridChallenges';
import {trackInfoooWorldStart,trackInfoooGuideComplete} from '../../../utils/analytics';
const why={power:'Power sources turn energy from sunlight, wind and fuels into electricity.',battery:'A battery returns energy stored earlier. It buys time, but its energy and output are limited.',grid:'The grid carries electricity to where it is needed. Available power must reach demand right now.',city:'Homes, businesses and chargers draw power. Reducing flexible use eases pressure without creating electricity.'};
const actions: {id:GridAction;label:string;hint:string}[]=[{id:'battery',label:'Use Battery',hint:'FAST · TEMPORARY'},{id:'generation',label:'Restore Generation',hint:'SUPPLY RETURNS'},{id:'demand',label:'Reduce Demand',hint:'LOAD REDUCED'}];
export default function GridStory(){
 const completed=useRef(false);
 const [compact,setCompact]=useState(false),[explore,setExplore]=useState(false),[preview,setPreview]=useState<GridAction|null>(null);
 useEffect(()=>{const media=matchMedia('(max-width:900px)');const update=()=>setCompact(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const [scenario,setScenario]=useState<CompactScenario>('generation'),[state,setState]=useState(()=>compactInitial('generation'));
 const [history,setHistory]=useState<GridAction[]>([]),[before,setBefore]=useState<ReturnType<typeof compactResult>|null>(null),[selected,setSelected]=useState<keyof typeof why|null>(null);
 const [challenge,setChallenge]=useState(false),[paused,setPaused]=useState(false),[pending,setPending]=useState(false),[replay,setReplay]=useState<number|null>(null);
 const reduced=useInfoooReducedMotion(),r=compactResult(state),health=compactHealth(state),met=r.shortfall<.01,percent=Math.max(0,Math.round(state.stored/r.capacity*100)),low=percent<=20;
 const solved=challenge&&met&&history.length<=2,failed=challenge&&!met&&history.length>=2;
 const draining=state.batteryEnabled&&r.discharge>0&&state.stored>0&&!solved;
 const current=compactScenarios.find(s=>s.id===scenario)!;
 function load(id:CompactScenario,isChallenge=false){completed.current=false;setPreview(null);setScenario(id);setChallenge(isChallenge);setState(compactInitial(id,isChallenge));setHistory([]);setBefore(null);setSelected(null);setPending(false);setPaused(false);setReplay(null);}
 function commit(action:GridAction){
  if(!history.length)trackInfoooWorldStart('the-living-grid');
  const next=compactAction(state,action);setBefore(compactResult(state));setState(next);setHistory(old=>[...old,action]);setSelected(null);setPending(false);
  if(compactResult(next).shortfall<.01&&!completed.current){completed.current=true;trackInfoooGuideComplete('the-living-grid',challenge?'compact-challenge':`compact-${scenario}`);}
 }
 function choose(action:GridAction){if(action==='generation')setPending(true);else commit(action);}
 useEffect(()=>{if(!pending)return;const timer=setTimeout(()=>commit('generation'),1000);return()=>clearTimeout(timer);},[pending]);
 useEffect(()=>{if(!draining||paused||pending||replay!==null)return;const timer=setTimeout(()=>setState(old=>compactTick(old)),1400);return()=>clearTimeout(timer);},[state,draining,paused,pending,replay]);
 useEffect(()=>{if(replay===null||paused)return;const timer=setTimeout(()=>{
  if(replay>=history.length){setReplay(null);setPaused(true);return;}
  setBefore(compactResult(state));setState(compactAction(state,history[replay]));setReplay(replay+1);
 },reduced?1800:1200);return()=>clearTimeout(timer);},[replay,paused,history,reduced,state]);
 useEffect(()=>{const pause=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[]);
 const last=history[history.length-1];
 const feedback=selected?why[selected]:pending?'Generation takes time to return.':replay!==null?'Replaying the problem, your response and its result.':low&&state.batteryEnabled?'Storage can bridge a shortage, but it eventually runs out.':met?last==='generation'?'Restored generation now meets the city’s demand.':last==='demand'?'Lower flexible demand brings this city back into balance.':current.takeaway:last==='battery'?'The battery helps now, but its stored energy is running down.':last==='demand'?'Using less electricity reduces the shortage without creating new power.':last==='generation'?'More generation is available, but the city still needs support.':'';
 function inspect(id:keyof typeof why){setSelected(selected===id?null:id);}
 function inspectKey(e:KeyboardEvent,id:keyof typeof why){if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(id);}}
 const lit=r.supply/Math.max(1,r.totalDemand),sourceStrength=Math.max(.22,Math.min(1,(r.availableA+r.flex)/132));
 const sourceShift=compact?0:60,coreShift=compact?0:203,cityShift=compact?0:335;
 const path=preview||(pending?'generation':last)||null;
 const flowText=pending?'Generation returning':r.discharge>0?'Battery → Grid → City':state.demandResponse?'Less power drawn by City':met?'Power → Grid → City':'Supply falling · City needs support';
 return <section className="grid-play" data-health={health} data-moving={!paused&&!reduced} data-path={path||undefined} data-recovered={met&&history.length>0} data-scenario={scenario} aria-label="Keep the city powered">
  <header className="grid-entry-question"><h2>What happens when power supply suddenly drops?</h2><p>The city dims when supply cannot meet demand.</p></header>
  <details className="grid-entry-explore" onToggle={event=>{const open=event.currentTarget.open;if(explore&&!open)load('generation');setExplore(open);}}><summary>Explore more — scenarios & choices</summary><div className="grid-scenarios" role="group" aria-label="Scenario">{compactScenarios.map(item=><button key={item.id} className="k-button k-button--secondary k-button--compact" aria-pressed={scenario===item.id} onClick={()=>load(item.id)}>{item.label}</button>)}</div></details>
  <div className="grid-play-scene"><svg className="grid-play-world" viewBox={`0 0 ${compact?800:1200} 355`} role="group" aria-labelledby="grid-play-title grid-play-desc">
   <title id="grid-play-title">{met?'City lights restored':'The city is short of electricity'}</title><desc id="grid-play-desc">{health}. Supply {Math.round(r.supply)}, demand {Math.round(r.totalDemand)} simulated MW; battery {percent} percent. Lights illustrate the overall shortage, not specific real outages. Tap an object to learn why.</desc>
   <defs><marker id="play-direction" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="context-stroke" strokeWidth="1.8"/></marker></defs>
   <path d={`M${256+sourceShift} 170H${370+coreShift}M${420+coreShift} 170H${505+cityShift}`} className="play-wire"/>
   <path d={`M${397+coreShift} 226V194`} className="play-wire play-battery-wire"/>
   <path d={`M${256+sourceShift} 170H${370+coreShift}`} className="play-power generation-flow" style={{opacity:sourceStrength}} markerEnd="url(#play-direction)"/>
   <path d={`M${420+coreShift} 170H${505+cityShift}`} className="play-power city-flow" markerEnd="url(#play-direction)"/>
   {r.discharge>0&&<path d={`M${397+coreShift} 226V194`} className="play-power play-battery-power" markerEnd="url(#play-direction)"/>}
   <g transform={`translate(${sourceShift} 0)`} role="button" tabIndex={0} aria-label="Why: power source" aria-pressed={selected==='power'} onClick={()=>inspect('power')} onKeyDown={e=>inspectKey(e,'power')} className="play-object">
    <rect x="40" y="75" width="225" height="250" rx="15" className="object-hit"/>
    <g transform="translate(65 132)" stroke="#436e85" strokeWidth="2.5" opacity={state.sun<.5?.35:1}><path d="M0 0H95L113 48H18Z" fill="#80b7cf"/><path d="M7 16H101M13 32H107M32 0L50 48M64 0L82 48M34 48V76M84 48V76" fill="none"/></g>
    <g transform="translate(184 135)" stroke="var(--k-text-muted)" strokeWidth="2.5" fill="var(--k-bg)" opacity={state.plantOnline?1:.35}><path d="M0 91V40l22-14v14L43 26v14h29v51ZM53 40V0h12v40"/><path d="M11 57h12v17H11m25-17h12v17H36" fill={state.plantOnline?'#efbb55':'var(--k-bg)'}/></g>
    {state.flexGeneration&&<path d="M225 105l-10 15h12l-7 13" stroke="#278a73" strokeWidth="2.5" fill="none"/>}<text x="155" y="315" textAnchor="middle">Power source</text>
   </g>
   <g transform={`translate(${coreShift} 0)`} role="button" tabIndex={0} aria-label="Why: grid" aria-pressed={selected==='grid'} onClick={()=>inspect('grid')} onKeyDown={e=>inspectKey(e,'grid')} className="play-object"><rect x="336" y="86" width="122" height="124" rx="10" className="object-hit"/><circle className="grid-field" cx="397" cy="170" r="35" fill="none" stroke="currentColor" strokeWidth="1"/><circle cx="397" cy="170" r="24" fill="var(--k-bg-card)" stroke="var(--k-text-muted)" strokeWidth="2.5"/><path d="M399 155l-12 18h15l-8 14" fill="none" stroke="var(--k-text)" strokeWidth="2.5"/><text x="397" y="125" textAnchor="middle">Grid</text></g>
   <g transform={`translate(${cityShift} 0)`} role="button" tabIndex={0} aria-label={`Why: city, ${met?'powered':'short of power'}`} aria-pressed={selected==='city'} onClick={()=>inspect('city')} onKeyDown={e=>inspectKey(e,'city')} className="play-object"><rect x="505" y="55" width="250" height="270" rx="10" className="object-hit"/>
    <g className="play-city" stroke="var(--k-text-muted)" strokeWidth="2.5">{[{x:515,y:126,w:66,h:148},{x:595,y:68,w:69,h:206},{x:678,y:145,w:66,h:129}].map((b,i)=><g key={b.x}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill="var(--k-bg)"/>{[0,1].map(col=>[0,1,2].map(row=><rect key={`${col}-${row}`} x={b.x+14+col*25} y={b.y+20+row*27} width="12" height="16" rx="2" stroke="none" className="play-window" fill={met||((i*6+col*3+row)/18)<lit?'#ffd479':'#627081'} opacity={met||((i*6+col*3+row)/18)<lit?1:.25}/>))}<path d={`M${b.x+27} 274v-24h15v24`} fill="var(--k-bg-card)"/></g>)}</g>
    {scenario==='demand'&&!state.demandResponse&&<path d="M715 106V80m-8 8 8-8 8 8" stroke="var(--k-text-muted)" strokeWidth="2.5" fill="none"/>}<text x="630" y="315" textAnchor="middle">City</text>
   </g>
   <g transform={`translate(${coreShift} 0)`} role="button" tabIndex={0} aria-label={`Why: battery, ${percent} percent${low?', low':''}`} aria-pressed={selected==='battery'} onClick={()=>inspect('battery')} onKeyDown={e=>inspectKey(e,'battery')} className="play-object"><rect x="335" y="215" width="124" height="138" rx="10" className="object-hit"/><g transform="translate(355 226)" stroke="var(--k-text-muted)" strokeWidth="2.5"><rect width="84" height="48" rx="9" fill="var(--k-bg)"/><path d="M85 14h8v20h-8"/><rect x="7" y="7" width={68*percent/100} height="34" rx="3" className="battery-fill" fill={low?'#bc7b42':'#5ccfaf'} stroke="none"/></g><text x="397" y="308" textAnchor="middle" className="battery-percent">{percent}%</text><text x="397" y="338" textAnchor="middle">{low?'Battery low':'Battery'}</text></g>
  </svg><p className="grid-flow-state" aria-hidden="true">{flowText}</p></div>
  <div className="grid-play-loop"><h2 role="status" aria-live="polite"><span className="grid-health">{health}</span>{pending?'Restoring generation…':met?'The lights are back on ✓':health==='CRITICAL'?'The city needs urgent support.':health==='TIGHT'?'A little more power is needed.':'Some lights are going out.'}</h2>
   {challenge&&<p className="grid-challenge-goal">{replay!==null?'Challenge replay':solved?'SOLVED ✓':failed?'TRY AGAIN':'Restore balance in no more than 2 actions.'}</p>}
   <div className="grid-play-choices">{actions.filter(action=>explore||action.id==='generation').map(action=><button key={action.id} className={`k-button ${action.id==='generation'?'k-button--primary':'k-button--secondary'}`} disabled={pending||replay!==null||failed||solved||(met&&!state.batteryEnabled)||history.includes(action.id)||(action.id==='battery'&&percent===0)} onPointerEnter={()=>setPreview(action.id)} onPointerLeave={()=>setPreview(null)} onFocus={()=>setPreview(action.id)} onBlur={()=>setPreview(null)} onClick={()=>choose(action.id)}>{!explore&&action.id==='generation'?'Restore balance':action.label}<small>{action.hint}</small></button>)}</div>
   <p className="grid-play-feedback" aria-live="polite" aria-atomic="true">{feedback}</p>{before&&<p className="grid-entry-lesson"><b>What happened:</b> {met?'Supply meets demand.':'A shortage remains.'} <b>Why:</b> {last==='generation'?'Generation increased.':last==='demand'?'Flexible demand fell.':'Stored energy supports supply temporarily.'} <b>Next:</b> {met?'Try another scenario in Explore more.':'Try another balancing action in Explore more.'}</p>}
   {before&&<div className="grid-comparison" aria-label="Before and after, simulated megawatts"><span><small>BEFORE</small><b>Supply {Math.round(before.supply)} · Demand {Math.round(before.totalDemand)}</b></span><span><small>AFTER</small><b>Supply {Math.round(r.supply)} · Demand {Math.round(r.totalDemand)}</b></span><small>SIMULATED MW</small></div>}
   <div className="grid-play-next"><button className="k-button k-button--ghost" onClick={()=>load(scenario,challenge)}>Reset</button>{history.length>0&&met&&<button className="k-button k-button--secondary" onClick={()=>{setState(compactInitial(scenario,challenge));setBefore(null);setSelected(null);setPending(false);setReplay(0);setPaused(false);}}>Replay</button>}{(draining||replay!==null)&&<button className="k-button k-button--ghost" onClick={()=>setPaused(!paused)}>{paused?'Resume':'Pause'}</button>}{explore&&<button className="k-button k-button--ghost" onClick={()=>load('generation',!challenge)}>{challenge?'Leave Challenge':'Try a Challenge'}</button>}</div>
   {draining&&<small className="grid-play-boundary">{paused?'Battery simulation paused.':'Each battery tick represents 30 simulated minutes at fixed conditions.'}</small>}
  </div>
  <small className="grid-play-boundary">Simplified simulation · Tap an object to ask why.</small>
 </section>;
}
