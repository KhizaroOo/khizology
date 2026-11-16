// Run with an existing Playwright installation outside the repository.
// Set ATLAS_PW to the absolute playwright package folder, then run:
// node scripts/benchmark-atlas-first-use.cjs <built-viewer-directory> [public-directory]
// Use the same Chromium, viewport, geometry files and machine for both builds.
// This serves static files in a fresh context with an 800 ms delay per geometry response.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.gz':'application/gzip','.bin':'application/octet-stream','.json':'application/json','.svg':'image/svg+xml'};
assert.ok(process.argv[2] && process.env.ATLAS_PW,'Set ATLAS_PW and pass the built viewer directory.');
const {chromium}=require(process.env.ATLAS_PW);
const root=path.resolve(process.argv[3]||'public'), viewer=path.resolve(process.argv[2]);
const atlas=require(path.join(root,'infooo/human-atlas-assets/models/atlas.json'));
const groups=new Map();atlas.parts.forEach(p=>{const k=p.chunk+':'+p.system;groups.set(k,(groups.get(k)||0)+p.indexCount)});
const sizes=new Set([...groups].filter(([k,n])=>!k.endsWith(':integumentary')&&n>5000).map(([,n])=>n));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await chromium.launch();
 try{
 const context=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await context.newPage();
 const events=[],errors=[];let start=0,geometryBytes=0;
 p.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async r=>{
  const u=new URL(r.request().url()), prefix='/infooo/human-atlas-viewer/', file=u.pathname.startsWith(prefix)?path.join(viewer,u.pathname.slice(prefix.length)):path.join(root,u.pathname);
  if(u.origin!=='https://atlas-benchmark.invalid')return r.abort();
  if(!fs.existsSync(file)) return r.fulfill({status:404});
  if(u.pathname.endsWith('.bin.gz')) await pause(800);
  await r.fulfill({path:file,contentType:type[path.extname(file)]||'application/octet-stream',headers:{'cache-control':'no-store'}});
 });
 p.on('requestfinished',r=>{const u=new URL(r.url()); if(u.pathname.endsWith('.bin.gz')){const bytes=fs.statSync(path.join(root,u.pathname)).size;geometryBytes+=bytes;events.push({file:path.basename(u.pathname),ms:Date.now()-start,bytes});}});
 await p.addInitScript(counts=>{const thisCounts=new Set(counts);const gl=WebGL2RenderingContext.prototype,draw=gl.drawElements;
   gl.drawElements=function(mode,count,...rest){const result=draw.call(this,mode,count,...rest);if(thisCounts.has(count)&&window.atlasFirstModel===undefined)window.atlasFirstModel=performance.now();return result};
   new MutationObserver(()=>{if(!document.querySelector('.loading:not(.error),[data-geometry-loading]')&&document.querySelector('canvas')&&window.atlasComplete===undefined&&document.querySelector('.identity-meta')){if(window.hadLoading)window.atlasComplete=performance.now();}if(document.querySelector('.loading:not(.error),[data-geometry-loading]'))window.hadLoading=true;}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-geometry-loading']});
 },[...sizes]);
 const hit=async id=>p.evaluate(id=>{const ev=new CustomEvent('infooo-atlas-select',{detail:id,cancelable:true});document.dispatchEvent(ev);return ev.defaultPrevented&&document.querySelector('.structure-title')?.getAttribute('data-atlas-id')===id?performance.now():null},id);
 start=Date.now();await p.goto('https://atlas-benchmark.invalid/infooo/human-atlas-viewer/index.html',{waitUntil:'domcontentloaded'});
 let heart=null,guide=null;const limit=Date.now()+165000;
 while(Date.now()<limit&&!heart){heart=await hit('FMA7088');if(!heart)await pause(350);}
 assert.ok(heart,'Heart bridge never selected');
 const heartBytes=geometryBytes,heartChunks=events.length;
 const launch=p.getByRole('button',{name:/Start or resume Follow the Blood/});
 await launch.focus();await p.keyboard.press('Enter');
 await p.locator('.ha-guide-card[data-step="1"]').waitFor({timeout:15000});
 guide=await p.evaluate(()=>performance.now());const guideBytes=geometryBytes,guideChunks=events.length;

 console.log('first interactions',JSON.stringify({heart,guide,heartChunks,guideChunks,heartBytes,guideBytes})); await p.waitForFunction(()=>window.atlasComplete!==undefined,undefined,{timeout:165000});
 const info=await p.evaluate(()=>({firstModel:window.atlasFirstModel,complete:window.atlasComplete}));
 const data={...info,heart,guide,heartBytes,heartChunks,guideBytes,guideChunks,geometryBytes,events,errors};
 assert.ok(Number.isFinite(info.firstModel),'No actual anatomy draw was detected');
 console.log(JSON.stringify(data,null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
