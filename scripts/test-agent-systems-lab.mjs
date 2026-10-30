import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Load the real registry; unrelated anatomy/deployment fixtures are not needed for collection checks.
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/infooo.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module.exports, require: id => {
 if(id.endsWith('valueLaws'))return { createIdeaEvaluation: value => value };
 if(id.endsWith('gridTrends'))return { gridSources: [] };
 if(id.endsWith('humanAtlasLearning'))return { followTheBloodGuide: {}, humanAtlasEntities: [], humanAtlasRelationships: [] };
 if(id.endsWith('deploymentJourney'))return { deploymentStages: [], deploymentGuide: {} };
 throw Error(`Unexpected registry dependency: ${id}`);
} });
const { infoooWorlds: worlds, infoooCategories: categories, agentSystemsLab: collection, agentSystemsJourney: journey } = module.exports;
assert.ok(worlds.length>=14);assert.deepEqual(Array.from(worlds.slice(0,14),w=>w.id),Array.from({length:14},(_,i)=>`world-${String(i+1).padStart(3,'0')}`),'the first fourteen world IDs stay unchanged; later worlds may be added');assert.equal(categories.length,6);assert.equal(journey.length,7);
assert.deepEqual(Array.from(journey,e=>e.world.id),Array.from({length:7},(_,i)=>`world-${String(i+8).padStart(3,'0')}`));
assert.equal(new Set(journey.map(e=>e.world.slug)).size,7);
for(const [i, entry] of journey.entries()){
 const world=entry.world, nav=world.collectionNavigation;
 assert.equal(entry.position,i+1);assert.equal(world,worlds.find(w=>w.id===entry.worldId),'resolve canonical objects, do not copy metadata');
 assert.equal(world.category,'ai-intelligence');assert.equal(world.status,'published');assert.equal(world.visibility,'public');
 assert.equal(nav.step,i+1);assert.equal(nav.total,7);assert.equal(nav.title,collection.title);assert.equal(nav.slug,collection.slug);
 assert.equal(nav.previous?.slug,journey[i-1]?.world.slug);assert.equal(nav.next?.slug,journey[i+1]?.world.slug);
 assert.ok(entry.problem&&entry.question&&entry.takeaway&&entry.label);
}
assert.ok(worlds.filter(w=>w.worldNumber<8).every(w=>!w.collectionNavigation));assert.doesNotThrow(()=>JSON.stringify(worlds));
assert.ok(!worlds.some(w=>w.slug===collection.slug));
const source=fs.readFileSync('src/pages/infooo/agent-systems-lab.astro','utf8');
assert.ok(!/\b(localStorage|sessionStorage|fetch|setInterval)\b/.test(source));
assert.ok(!source.includes('client:'));
assert.ok(!fs.readFileSync('src/components/infooo/InfoooWorldFoundation.tsx','utf8').includes('import { infoooWorlds'),'world clients must not import the full registry');
if(process.argv.includes('--built')){
 const root='https://khizooology.com', route=`${root}/infooo/${collection.slug}/`, html=fs.readFileSync(`dist/infooo/${collection.slug}/index.html`,'utf8');
 assert.ok(html.includes(`rel="canonical" href="${route}"`));assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!html.includes('noindex'));assert.ok(html.includes('id="journey"'));
 for(const name of ['og:title','og:description','og:image','og:image:alt','twitter:card','twitter:image'])assert.ok(html.includes(name),name);
 const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const value=JSON.parse(m[1]);return (Array.isArray(value)?value:[value]).flatMap(node=>node['@graph']||[node]);});
 const page=graphs.find(s=>s['@type']==='CollectionPage');assert.ok(page);assert.equal(page.url,route);assert.equal(page.mainEntity['@type'],'ItemList');assert.equal(page.mainEntity.numberOfItems,7);
 assert.deepEqual(page.mainEntity.itemListElement.map(e=>e.url),Array.from(journey,e=>`${root}/infooo/${e.world.slug}/`));assert.ok(graphs.some(s=>s['@type']==='BreadcrumbList'));
 for(const [i, entry] of journey.entries()){
  const worldRoute=`/infooo/${entry.world.slug}/`, worldHtml=fs.readFileSync(`dist${worldRoute}index.html`,'utf8');
  assert.ok(html.includes(`href="${worldRoute}"`));assert.ok(worldHtml.includes('class="infooo-collection-nav"'));assert.ok(worldHtml.replace(/<!--[\s\S]*?-->/g,'').includes(`Step ${i+1} of 7`));
  assert.equal((worldHtml.match(/class="infooo-collection-nav"/g)||[]).length,1);
  if(i)assert.ok(worldHtml.includes(`rel="prev" href="/infooo/${journey[i-1].world.slug}/"`));else assert.ok(!worldHtml.includes('rel="prev"'));
  if(i<6)assert.ok(worldHtml.includes(`rel="next" href="/infooo/${journey[i+1].world.slug}/"`));else assert.ok(!worldHtml.includes('rel="next"'));
 }
 for(const world of worlds.filter(w=>w.worldNumber<8))assert.ok(!fs.readFileSync(`dist/infooo/${world.slug}/index.html`,'utf8').includes('class="infooo-collection-nav"'));
 const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(h=>h.startsWith('/')&&!h.includes('#'));
 for(const link of links){const path=link.endsWith('/')?`dist${link}index.html`:`dist${link}`;assert.ok(fs.existsSync(path),`Broken collection link: ${link}`);}
 const sitemap=fs.readdirSync('dist').filter(n=>/^sitemap.*\.xml$/.test(n)).map(n=>fs.readFileSync(`dist/${n}`,'utf8')).join('');assert.equal(sitemap.split(`<loc>${route}</loc>`).length-1,1);
 assert.ok(fs.readFileSync('dist/llms.txt','utf8').includes(route));assert.ok(fs.readFileSync('dist/infooo/index.html','utf8').includes(`/infooo/${collection.slug}/`));assert.ok(fs.readFileSync('dist/index.html','utf8').includes(`/infooo/${collection.slug}/`));
 assert.ok(html.includes(`href="${collection.contactPath}/" data-infooo-collection="${collection.slug}" data-collection-action="consulting"`));
 assert.equal((html.match(/data-collection-action="start"/g)||[]).length,1);assert.equal((html.match(/data-collection-action="world"/g)||[]).length,19);
}
console.log('Agent Systems Lab PASS: exactly seven canonical worlds, unchanged six categories/first 14 world IDs, ordered journey, source-resolved previous/next, no persistence/client island; built route, links, schema, social, sitemap, llms, hub/home and consulting checks when --built.');
