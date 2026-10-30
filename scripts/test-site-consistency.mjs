import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
function registry(file, transform = source => source, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(transform(read(file)), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require(id) {
      // Teaching fixtures are not needed to inspect canonical inventory.
      if (id.endsWith('valueLaws')) return { createIdeaEvaluation: value => value };
      if (id.endsWith('gridTrends')) return { gridSources: [] };
      if (id.endsWith('humanAtlasLearning')) return { followTheBloodGuide: {}, humanAtlasEntities: [], humanAtlasRelationships: [] };
      if (id.endsWith('deploymentJourney')) return { deploymentStages: [], deploymentGuide: {} };
      return registry(path.posix.join(path.posix.dirname(file), `${id}.ts`), source => source, cache);
    },
  });
  return exports;
}
const { families } = registry('src/data/families.ts');
const tools = registry('src/data/tools.ts');
const { infoooWorlds, infoooCategories } = registry('src/data/infooo.ts');
const worlds = infoooWorlds.filter(world => world.status === 'published' && world.visibility === 'public');
const categorySelectors = read('src/pages/infooo/index.astro').match(/const worlds =[^\n]+\nconst availableCategories =[^\n]+/)[0];
const hiddenCategory = { id: 'fixture-hidden', label: 'Unavailable' };
const selected = vm.runInNewContext(`${categorySelectors}\n({ worlds, availableCategories })`, {
  infoooWorlds: [...infoooWorlds,
    { status: 'draft', visibility: 'public', category: hiddenCategory.id },
    { status: 'published', visibility: 'private', category: hiddenCategory.id }],
  infoooCategories: [...infoooCategories, hiddenCategory],
});
assert.equal(selected.worlds.length, worlds.length);
assert.ok(!selected.availableCategories.some(category => category.id === hiddenCategory.id));
for (const family of families) {
  assert.equal(tools.getToolCountByFamily(family.id), tools.activeTools.filter(tool => tool.family === family.id).length);
  assert.ok(tools.getToolsByFamily(family.id).every(tool => tool.status === 'active'));
}
// Exercise selectors with unavailable inventory without modifying real records.
const inactiveFamily = families[0].id;
for (const status of ['planned', 'experimental']) {
  const fixture = registry('src/data/tools.ts', source => source.replace('export const activeTools:', `tools.forEach(tool => { if (tool.family === '${inactiveFamily}') { tool.status = '${status}'; tool.tags = ['unavailable-only']; tool.featured = true; } });\nexport const activeTools:`));
  assert.equal(fixture.getToolCountByFamily(inactiveFamily), 0);
  assert.equal(fixture.getToolsByFamily(inactiveFamily).length, 0);
  assert.ok(!fixture.getAvailableToolFamilies(families).some(family => family.id === inactiveFamily));
  assert.ok(!fixture.allTags.includes('unavailable-only'));
  assert.ok(fixture.featuredTools.every(tool => tool.status === 'active'));
}
const hub = read('dist/toolbox/index.html');
const levels = [...new Set(tools.activeTools.map(tool => tool.featureLevel))].sort();
assert.ok(hub.includes(`Current tools use ${levels.map(level => `LV${level}`).join(' and ')}.`));
assert.ok(!hub.includes('Every current production tool targets LV2'));
const infooo = read('dist/infooo/index.html');
const choices = [...infooo.matchAll(/<button[^>]*data-category="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(choices.slice(1).sort(), [...new Set(worlds.map(world => world.category))].sort());
assert.equal([...infooo.matchAll(/data-world-category=/g)].length, worlds.length);
assert.ok(infoooCategories.length >= choices.length - 1, 'Reserved taxonomy remains available');
for (const tool of tools.activeTools) {
  assert.ok(fs.existsSync(new URL(`dist/toolbox/${tool.slug}/index.html`, root)), tool.slug);
}
for (const family of families) {
  const html = read(`dist/toolbox/family/${family.id}/index.html`);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const lists = schemas.flat().flatMap(schema => schema['@graph'] || [schema]).filter(schema => [schema['@type']].flat().includes('CollectionPage'));
  assert.ok(lists.length > 0);
  assert.equal(lists[0].mainEntity.numberOfItems, tools.getToolCountByFamily(family.id));
  assert.ok(!html.includes('with eight visual tools'));
}
console.log(`Site consistency passed: ${tools.activeTools.length} live tools, ${worlds.length} public worlds, live-only families/tags/featured and maturity labels.`);
