import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createExplosionLayout} from './explosion-layout';
import type { assembleChunk } from './geometry-assembly';
import {PointerTap} from './pointer-tap';
import {explodeStep,allowAutoRotate} from './motion';
import {geometryLoadOrder,SYSTEMS,type Atlas,type SceneState} from './anatomy';
interface Props {atlas:Atlas;state:SceneState;onSelect:(id:string)=>void;onChunkReady:(id:number)=>void;onError:(s:string)=>void}
export default function AnatomyScene({atlas,state,onSelect,onChunkReady,onError}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect);
 latest.current=state;select.current=onSelect;
 const wake=useRef<()=>void>(()=>{});
 useEffect(()=>wake.current(),[state]);
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,dirty=true,lastView='',lastReset=-1,lastIsolate='',layoutKey='',amount=0;
  const renderedChunks=new Set<number>(), pendingChunks=new Set<number>();
  let lastState:SceneState|null=null;
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(animate);};
  wake.current=()=>{dirty=true;schedule();};
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const motionChanged=()=>{dirty=true;schedule();};
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onError('This browser could not start the 3D viewer. Please try a browser with WebGL enabled.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:2));renderer.setClearColor(getComputedStyle(document.documentElement).backgroundColor);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;el.appendChild(renderer.domElement);
  const themeObserver=new MutationObserver(()=>{renderer.setClearColor(getComputedStyle(document.documentElement).backgroundColor);syncGhostColor();dirty=true;schedule();});
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
  renderer.domElement.setAttribute('aria-label','Interactive human anatomy. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);
  camera.position.set(1.4,1.05,3.6);controls.target.set(0,.85,0);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=.07;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.96;controls.addEventListener('change',()=>{dirty=true;schedule();});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
  let env:T.WebGLRenderTarget|undefined,compiling=0;
  const environmentReady=renderer.compileAsync(room,new T.PerspectiveCamera()).then(()=>{if(disposed)return;env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();});
  const preparations:Promise<unknown>[]=[environmentReady];
  scene.add(new T.HemisphereLight(0xffffff,0xa7acb2,1.05));
  const key=new T.DirectionalLight(0xfffaf4,2.3);key.position.set(-2,4,3);scene.add(key);
  const rim=new T.DirectionalLight(0xe9f0ff,1.8);rim.position.set(2,2,-3);scene.add(rim);
  const ground=new T.Mesh(new T.CircleGeometry(30,96),new T.MeshStandardMaterial({color:0xd5d9dc,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.019;scene.add(ground);
  const platform=new T.Mesh(new T.CylinderGeometry(.68,.7,.028,100),new T.MeshStandardMaterial({color:0xeeeeec,metalness:.12,roughness:.67}));platform.position.y=-.016;scene.add(platform);
  const ring=new T.Mesh(new T.RingGeometry(.63,.632,128),new T.MeshBasicMaterial({color:0x8c969f,transparent:true,opacity:.4,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;scene.add(ring);
  const innerRing=new T.Mesh(new T.RingGeometry(.55,.551,128),new T.MeshBasicMaterial({color:0xa4aeb8,transparent:true,opacity:.16,side:T.DoubleSide}));innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.001;scene.add(innerRing);
  const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),partTexture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);partTexture.needsUpdate=true;
  const selectedData=new Uint8Array(width*4),selectionTexture=new T.DataTexture(selectedData,width,1);selectionTexture.needsUpdate=true;
  const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],centers=atlas.parts.map(p=>new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
  const pickingMaterial=new T.MeshBasicMaterial();materials.push(pickingMaterial);
  const offsets:T.Vector3[]=[],bounds=atlas.parts.map(p=>new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));
  let packingWidth=1,packingHeight=1;
  const markerPositions=new Float32Array(atlas.parts.length*3),markerGeometry=new T.BufferGeometry();markerGeometry.setAttribute('position',new T.BufferAttribute(markerPositions,3));
  const markerMaterial=new T.PointsMaterial({color:0x64748b,size:5,sizeAttenuation:false,transparent:true,opacity:.72,depthTest:false});
  markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const markers=new T.Points(markerGeometry,markerMaterial);markers.frustumCulled=false;markers.renderOrder=10;markers.visible=false;scene.add(markers);
  const hover=document.createElement('div');hover.className='part-hover';hover.setAttribute('role','tooltip');hover.hidden=true;el.appendChild(hover);
  type Target={index:number;x:number;y:number;left:number;right:number;top:number;bottom:number};let targets:Target[]=[];
  const projected=new T.Vector3();
  const findTarget=(x:number,y:number,radius:number)=>{
   let best=-1,score=Infinity;
   for(const t of targets){const dx=Math.max(t.left-x,0,x-t.right),dy=Math.max(t.top-y,0,y-t.bottom),distance=Math.hypot(dx,dy);if(distance>radius)continue;const candidate=distance+Math.hypot(t.x-x,t.y-y)*.025;if(candidate<score){score=candidate;best=t.index;}}
   return best;
  };
  // Focus mode: while something is selected (and not isolated), the selection stays solid and every other
  // visible part is drawn as a faint see-through "ghost" so the selection is visible inside its body context.
  const focusActive={value:0},ghostColor={value:new T.Color(0x40515e)};
  const syncGhostColor=()=>{const hsl={h:0,s:0,l:0};new T.Color(getComputedStyle(document.documentElement).backgroundColor).getHSL(hsl);ghostColor.value.set(hsl.l>.5?0x7a8a96:0xb7c6d0);};
  syncGhostColor();
  const stateShader=(shader:Parameters<T.Material['onBeforeCompile']>[0])=>{
   shader.uniforms.partState={value:partTexture};shader.uniforms.selectionState={value:selectionTexture};shader.uniforms.stateWidth={value:width};shader.uniforms.focusActive=focusActive;
   shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;');
   shader.fragmentShader='uniform float focusActive; varying float partVisible; varying float partSelected;\n'+shader.fragmentShader;
  };
  const materialFor=(system:string)=>{
   const m=new T.MeshStandardMaterial({color:SYSTEMS.find(s=>s.id===system)?.color??'#aebbb8',metalness:.08,roughness:.53,side:T.DoubleSide,transparent:system==='integumentary',opacity:system==='integumentary'?.1:1,depthWrite:system!=='integumentary'});
   m.onBeforeCompile=shader=>{
    stateShader(shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (partVisible < 0.5 || (focusActive > 0.5 && partSelected < 0.5)) discard;');
    // Selected parts: saturated teal plus a little self-light so they read clearly against the ghosted body in both themes.
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.62, 0.54), partSelected * 0.9);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.02, 0.16, 0.13) * partSelected;');
   };materials.push(m);return m;
  };
  const mats=new Map(SYSTEMS.map(s=>[s.id,materialFor(s.id)]));
  const ghostMaterial=new T.MeshLambertMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});
  ghostMaterial.onBeforeCompile=shader=>{
   stateShader(shader);shader.uniforms.ghostColor=ghostColor;
   shader.fragmentShader='uniform vec3 ghostColor;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (partVisible < 0.5 || partSelected > 0.5 || focusActive < 0.5) discard;');
   // Rim-weighted alpha: outlines carry the body shape while facing surfaces stay nearly clear.
   shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));\ngl_FragColor = vec4(ghostColor, 0.02 + 0.22 * pow(rim, 3.0));');
  };materials.push(ghostMaterial);
  let ghostWarmed=false;
  const batches:Array<{system:string;mesh:T.Mesh;ghost:T.Mesh}>=[];
  const warmedSystems=new Set<string>();
  let worker:Worker;
  try{worker=new Worker(new URL('./geometry-worker.ts',import.meta.url),{type:'module'});}catch{disposed=true;controls.dispose();pmrem.dispose();room.dispose();partTexture.dispose();selectionTexture.dispose();renderer.dispose();renderer.domElement.remove();hover.remove();onError('This browser could not start anatomy preparation. Please reload or try another browser.');return;}
  type Prepared={buffer:ArrayBuffer;groups:ReturnType<typeof assembleChunk>};
  const jobs=new Map<number,{resolve:(value:Prepared)=>void;reject:(error:Error)=>void}>();
  worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);if(data.error)job.reject(new Error(data.error));else job.resolve(data);};
  worker.onerror=()=>{jobs.forEach(job=>job.reject(new Error('Anatomy preparation could not start. Please reload.')));jobs.clear();};
  const yieldPaint=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
  const loadChunk=async(ci:number)=>{
   const chunk=atlas.chunks[ci],compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';
   const parts=atlas.parts.map((p,i)=>({...p,partIndex:i})).filter(p=>p.chunk===ci);
   const {buffer,groups}=await new Promise<Prepared>((resolve,reject)=>{jobs.set(ci,{resolve,reject});worker.postMessage({id:ci,url:new URL(compressed?chunk.gzip!:chunk.url,document.baseURI).href,bytes:chunk.bytes,compressed,parts});});
   await environmentReady;
   if(disposed)return;
   for(let n=0;n<parts.length;n++){
    const p=parts[n],i=p.partIndex,g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
    g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));
    g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
    g.boundingBox=bounds[i].clone();g.boundingSphere=new T.Sphere(centers[i].clone(),bounds[i].getSize(new T.Vector3()).length()/2);
    const pick=new T.Mesh(g,pickingMaterial);pick.matrixAutoUpdate=false;pickers[i]=pick;geometries.push(g);
    if(n%32===31){await yieldPaint();if(disposed)return;}
   }
   for(const group of groups){
    if(disposed)return;
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(group.positions,3));
    geometry.setAttribute('normal',new T.BufferAttribute(group.normals,3,true));
    geometry.setAttribute('partIndex',new T.BufferAttribute(group.partIndices,1));
    geometry.setIndex(new T.BufferAttribute(group.indices,1));geometries.push(geometry);
    const mesh=new T.Mesh(geometry,mats.get(group.system as never));mesh.frustumCulled=false;scene.add(mesh);
    const ghost=new T.Mesh(geometry,ghostMaterial);ghost.frustumCulled=false;ghost.renderOrder=2;ghost.visible=false;scene.add(ghost);
    batches.push({system:group.system,mesh,ghost});
    if(!warmedSystems.has(group.system)){
     // Warm the focus material with the first anatomical batch, before early selection is offered.
     const warmGhost=!ghostWarmed;ghostWarmed=true;
     if(warmGhost)ghost.visible=true;
     compiling++;
     try{
      let preparation:Promise<unknown>;
      try{preparation=renderer.compileAsync(scene,camera);}finally{if(warmGhost)ghost.visible=false;}
      preparations.push(preparation);await preparation;
     }finally{compiling--;}
     warmedSystems.add(group.system);
    }
    if(disposed)return;
   }
   // The chunk becomes usable as a batch. Avoid intermediate frame uploads for
   // every system mesh while the rest of this chunk is still being prepared.
   if(!disposed){pendingChunks.add(ci);lastState=null;dirty=true;schedule();}
  };
  (async()=>{try{
   const order=geometryLoadOrder(atlas);let cursor=0;
   await Promise.all(Array.from({length:3},async()=>{
    while(!disposed&&cursor<order.length)await loadChunk(order[cursor++]);
   }));
  }catch(e){if(!disposed)onError(e instanceof Error?e.message:'Could not load the anatomy.');}})();
  // Camera framing shared by isolate (tight) and focus (structure plus surrounding body).
  let offX=0,offY=0,layoutBump=0,lastFocus='';
  let frameTween:{t:number;fromPos:T.Vector3;toPos:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;fromOff:[number,number];toOff:[number,number]}|null=null;
  const applyOffset=(x:number,y:number)=>{offX=x;offY=y;const w=el.clientWidth,h=el.clientHeight;if(Math.abs(x)<.5&&Math.abs(y)<.5)camera.clearViewOffset();else camera.setViewOffset(w,h,x,y,w,h);};
  controls.addEventListener('start',()=>{frameTween=null;});
  const layoutChanged=()=>{layoutBump++;dirty=true;schedule();};document.addEventListener('infooo-atlas-layout',layoutChanged);
  // Screen area not covered by panels, so the framed structure lands where it can be seen.
  const freeRect=(inspectorOpen?:boolean)=>{
   const w=el.clientWidth,h=el.clientHeight,mobile=w<768,landscape=w>h&&h<=600;let left=20,right=w-20,top=mobile?175:110,bottom=h-170;
   if(inspectorOpen){if(landscape){right=w-335;top=100;bottom=h-125;}else if(mobile){const sheet=document.querySelector('.detail-sheet')?.getBoundingClientRect();let chrome=0;for(const selector of ['.identity','.top-actions','.view-controls']){const node=document.querySelector(selector),rect=node?.getBoundingClientRect();if(node&&rect&&rect.height>0&&getComputedStyle(node).visibility!=='hidden')chrome=Math.max(chrome,rect.bottom);}top=(chrome||94)+16;bottom=(sheet?.top??h*.58-139)-16;}else{right=w-370;left=w>1100?285:25;}}
   return {w,h,left,right,top,bottom};
  };
  const selectionBox=(ids:string[])=>{const box=new T.Box3(),wanted=new Set(ids);atlas.parts.forEach((p,i)=>{if(wanted.has(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});return box;};
  const frameFor=(box:T.Box3,context:boolean,inspectorOpen?:boolean)=>{
   const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),{w,h,left,right,top,bottom}=freeRect(inspectorOpen);
   const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top),span=2*Math.tan(T.MathUtils.degToRad(camera.fov/2));
   const tight=Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/span;
   // Context framing keeps at least ~0.6 m of body visible around small structures and never zooms out past the whole body.
   const minContext=.62*h/availableHeight/span,maxContext=Math.max(minContext,1.9*h/availableHeight/span);
   const distance=context?T.MathUtils.clamp(tight*3.2,minContext,maxContext):Math.max(.07,tight*1.35);
   return {center,distance,offset:[w/2-(left+right)/2,h/2-(top+bottom)/2] as [number,number]};
  };
  const fit=(view:string,extent=0)=>{
   frameTween=null;applyOffset(0,0);
   const aspect=camera.aspect,mobile=el.clientWidth<768,normalDistance=mobile?Math.max(4.5,1.8*el.clientHeight/Math.max(160,el.clientHeight-350)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))):4;
   const reservedHeight=mobile?350:270;const availableAspect=Math.max(.35,(el.clientWidth-(mobile?40:340))/Math.max(160,el.clientHeight-reservedHeight));const atlasDistance=Math.max(packingHeight,packingWidth/availableAspect)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*(el.clientHeight/Math.max(160,el.clientHeight-reservedHeight))*1.08;
   const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);if(extent>.8)view='front';
   const direction=view==='front'?new T.Vector3(0,.02,1):view==='back'?new T.Vector3(0,.02,-1):view==='side'?new T.Vector3(1,.02,0):new T.Vector3(.35,.06,1).normalize();
   controls.target.set(extent>.1&&el.clientWidth>767?-packingWidth*.12:0,extent>.1||mobile?.85:.68,0);camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();dirty=true;
  };
  const resize=()=>{layoutKey='';lastState=null;renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<768||el.clientHeight<600?1.5:2));camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);fit(latest.current.view,amount);};const observer=new ResizeObserver(resize);observer.observe(el);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap(),worldBox=new T.Box3(),hitPoint=new T.Vector3();
  const down=(e:PointerEvent)=>{hover.hidden=true;tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);};
  const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||amount<.5||e.pointerType==='touch'){hover.hidden=true;return;}const rect=el.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,index=findTarget(x,y,12);hover.hidden=index<0;renderer.domElement.style.cursor=index<0?'grab':'pointer';if(index>=0){hover.textContent=atlas.parts[index].name;hover.style.left=`${Math.max(8,Math.min(x+14,el.clientWidth-260))}px`;hover.style.top=`${Math.max(8,Math.min(y+18,el.clientHeight-55))}px`;}};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const up=(e:PointerEvent)=>{
   const validTap=tap.up(e.pointerId,e.clientX,e.clientY);if(!validTap||!renderedChunks.size)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   let nearest=Infinity,found=-1;const hasSolid=atlas.parts.some((p,i)=>p.system!=='integumentary'&&renderedChunks.has(p.chunk)&&data[i*4+3]>.5);
   pickers.forEach((mesh,i)=>{if(!mesh||!renderedChunks.has(atlas.parts[i].chunk)||data[i*4+3]<.5||(hasSolid&&atlas.parts[i].system==='integumentary'))return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hits=raycaster.intersectObject(mesh,false);if(hits[0]&&hits[0].distance<nearest){nearest=hits[0].distance;found=i;}});
   if(found<0&&amount>.45)found=findTarget(e.clientX-rect.left,e.clientY-rect.top,e.pointerType==='touch'?24:16);if(found>=0){hover.hidden=true;select.current(atlas.parts[found].id);}
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
  const clock=new T.Clock();let lastExtent=-1;
  const animate=()=>{
   if(disposed)return;frame=0;const dt=Math.min(clock.getDelta(),.05),s=latest.current;
   const changed=lastState?.visible!==s.visible||lastState?.selected!==s.selected||lastState?.isolate!==s.isolate;
   const moving=Math.abs(amount-s.explode)>.0001;
   if(moving){amount=explodeStep(amount,s.explode,dt,motion.matches);dirty=true;}
   if(changed||moving||lastExtent<0){
    const visible=new Set(s.visible),selection=new Set(s.selected);
    const selectedSystems=new Set(atlas.parts.filter(p=>selection.has(p.id)).map(p=>p.system));
    const focusOn=selection.size>0&&!s.isolate;focusActive.value=focusOn?1:0;
    batches.forEach(({system,mesh,ghost})=>{const shown=s.isolate?selectedSystems.has(system as never):visible.has(system as never)||selectedSystems.has(system as never);mesh.visible=shown&&(!focusOn||selectedSystems.has(system as never));ghost.visible=shown&&focusOn;});
    const visibleParts=atlas.parts.filter(p=>s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
    const nextLayoutKey=visibleParts.map(p=>p.id).join(',')+':'+camera.aspect.toFixed(3);
    if(nextLayoutKey!==layoutKey){const layout=createExplosionLayout(visibleParts,camera.aspect);packingWidth=layout.width;packingHeight=layout.height;atlas.parts.forEach((p,i)=>{const cell=layout.cells.get(p.id);offsets[i]=cell?new T.Vector3(cell.x,cell.y+.85,0):centers[i].clone();});layoutKey=nextLayoutKey;if(amount>.05&&!s.isolate)fit(s.view,Math.max(0,(amount-.3)/.7));}

    atlas.parts.forEach((p,i)=>{
     const c=centers[i],destination=offsets[i];let dx=0,dy=0,dz=0;
     if(amount<=.45){const t=amount/.45;const group=SYSTEMS.findIndex(sys=>sys.id===p.system);const angle=group/SYSTEMS.length*Math.PI*2;dx=Math.sin(angle)*t*.48;dy=(c.y-.85)*t*.28;dz=Math.cos(angle)*t*.48;}
     else {const t=(amount-.45)/.55,group=SYSTEMS.findIndex(sys=>sys.id===p.system),angle=group/SYSTEMS.length*Math.PI*2;dx=T.MathUtils.lerp(Math.sin(angle)*.48,destination.x-c.x,t);dy=T.MathUtils.lerp((c.y-.85)*.28,destination.y-c.y,t);dz=T.MathUtils.lerp(Math.cos(angle)*.48,-c.z,t);}
     const selected=selection.has(p.id);data.set([dx,dy,dz,(s.isolate?selected:visible.has(p.system)||selected)?1:0],i*4);selectedData[i*4]=selected?255:0;
     markerPositions.set(data[i*4+3]>.5&&(renderedChunks.has(p.chunk)||pendingChunks.has(p.chunk))?[c.x+dx,c.y+dy,c.z+dz]:[10000,10000,10000],i*3);const mesh=pickers[i];if(mesh){mesh.position.set(dx,dy,dz);mesh.updateMatrix();mesh.updateMatrixWorld(true);}
    });partTexture.needsUpdate=true;selectionTexture.needsUpdate=true;markerGeometry.attributes.position.needsUpdate=true;lastState=s;lastExtent=amount;dirty=true;
   }
   if(s.view!==lastView||s.reset!==lastReset){fit(s.view,amount);lastView=s.view;lastReset=s.reset;}
   if(moving&&!s.isolate)fit(amount>.5?'front':s.view,Math.max(0,(amount-.3)/.7));
   const isolateKey=s.isolate?s.selected.join(',')+':'+s.reset+':'+s.inspectorOpen+':'+camera.aspect+':'+layoutBump:'';
   if(isolateKey!==lastIsolate||(s.isolate&&moving)){
    if(s.isolate){const box=selectionBox(s.selected);
     if(!box.isEmpty()){frameTween=null;const f=frameFor(box,false,s.inspectorOpen);applyOffset(f.offset[0],f.offset[1]);controls.maxDistance=Math.max(40,f.distance*2);controls.target.copy(f.center);camera.position.copy(f.center).add(new T.Vector3(.2,.1,1).normalize().multiplyScalar(f.distance));controls.update();dirty=true;}
    }else if(lastIsolate){fit(s.view,amount);}
    lastIsolate=isolateKey;
   }
   // Search and guide selections (frame > 0) move the camera to the structure while keeping the current viewing direction.
   const focusKey=!s.isolate&&s.selected.length&&(s.frame??0)>0&&amount<.05?s.frame+':'+s.inspectorOpen+':'+camera.aspect.toFixed(3)+':'+layoutBump:'';
   if(focusKey!==lastFocus){
    if(focusKey){const box=selectionBox(s.selected);
     if(!box.isEmpty()){const f=frameFor(box,true,s.inspectorOpen),direction=camera.position.clone().sub(controls.target);if(direction.lengthSq()<1e-8)direction.set(.35,.06,1);direction.normalize();
      const toPos=f.center.clone().addScaledVector(direction,f.distance);controls.maxDistance=Math.max(40,f.distance*2);
      if(motion.matches){frameTween=null;applyOffset(f.offset[0],f.offset[1]);controls.target.copy(f.center);camera.position.copy(toPos);controls.update();}
      else frameTween={t:0,fromPos:camera.position.clone(),toPos,fromTarget:controls.target.clone(),toTarget:f.center,fromOff:[offX,offY],toOff:f.offset};
      dirty=true;}}
    lastFocus=focusKey;
   }
   if(frameTween){frameTween.t=Math.min(1,frameTween.t+dt/.7);const k=1-Math.pow(1-frameTween.t,3);camera.position.lerpVectors(frameTween.fromPos,frameTween.toPos,k);controls.target.lerpVectors(frameTween.fromTarget,frameTween.toTarget,k);applyOffset(T.MathUtils.lerp(frameTween.fromOff[0],frameTween.toOff[0],k),T.MathUtils.lerp(frameTween.fromOff[1],frameTween.toOff[1],k));if(frameTween.t>=1)frameTween=null;dirty=true;}
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;ground.visible=platform.visible=ring.visible=innerRing.visible=amount<.5&&!s.isolate;markers.visible=amount>.75;controls.autoRotate=allowAutoRotate(s.rotate,s.isolate,amount,motion.matches);controls.autoRotateSpeed=.65;controls.update();if(controls.autoRotate)dirty=true;
   if(dirty&&compiling===0){
    renderer.render(scene,camera);
    // Only publish chunks once both the render batches and their picking meshes have reached a frame.
    for(const chunk of pendingChunks){renderedChunks.add(chunk);onChunkReady(chunk);}
    pendingChunks.clear();
    targets=[];if(amount>.45){const hasSolid=atlas.parts.some((p,i)=>p.system!=='integumentary'&&renderedChunks.has(p.chunk)&&data[i*4+3]>.5);atlas.parts.forEach((p,i)=>{if(!renderedChunks.has(p.chunk)||data[i*4+3]<.5||(hasSolid&&p.system==='integumentary'))return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2,left,right,top,bottom});});}dirty=false;
   }

   if(moving||controls.autoRotate||frameTween)schedule();
  };motion.addEventListener('change',motionChanged);schedule();
  const contextLost=(e:Event)=>{e.preventDefault();onError('The 3D session was paused by your device. Reload to continue.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{
   themeObserver.disconnect();document.removeEventListener('infooo-atlas-layout',layoutChanged);
   disposed=true;motion.removeEventListener('change',motionChanged);worker.terminate();jobs.forEach(job=>job.reject(new Error('Viewer closed')));jobs.clear();wake.current=()=>{};cancelAnimationFrame(frame);observer.disconnect();controls.dispose();hover.remove();renderer.domElement.remove();
   // Keep programs valid until asynchronous compilation settles, then release GPU resources.
   void Promise.allSettled(preparations).then(()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.traverse(o=>{if(o instanceof T.Mesh&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env?.dispose();room.dispose();pmrem.dispose();partTexture.dispose();selectionTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();renderer.dispose();});
  };
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
