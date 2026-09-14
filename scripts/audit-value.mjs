import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(path.join(root, 'src/data/valueLaws.ts'), 'utf8');
const lawsModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);
const { valueLaws, evaluateValueLaws } = lawsModule;
assert.equal(valueLaws.length, 18, 'Value Laws must contain exactly 18 entries');
assert.equal(new Set(valueLaws).size, 18, 'Value Laws must be unique');
const allStrong = Object.fromEntries(valueLaws.map(law => [law, 2]));
assert.deepEqual(evaluateValueLaws(allStrong), { totalScore: 36, decision: 'FLAGSHIP', hardGateFailed: false });
for (const hardGate of ['utility', 'identity', 'truth']) {
  const scores = { ...allStrong, [hardGate]: 0 };
  assert.equal(evaluateValueLaws(scores).decision, 'REJECT', `${hardGate} must be a hard gate`);
}

const manifest = fs.readFileSync(path.join(root, 'src/data/contentManifest.ts'), 'utf8');
for (const field of ['contentType', 'monster', 'slug', 'title', 'hook', 'shortDescription', 'url', 'heroAsset', 'tags', 'socialStatus']) assert.ok(manifest.includes(field), `Content manifest missing ${field}`);
const knowledge = fs.readFileSync(path.join(root, 'src/data/toolKnowledge.ts'), 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|localStorage|location\.search/.test(knowledge), 'Knowledge layer must stay local and input-free');
const analytics = fs.readFileSync(path.join(root, 'src/utils/analytics.ts'), 'utf8');
assert.ok(analytics.includes("page_referrer: ''"), 'Analytics must suppress referrer');
assert.ok(analytics.includes('trackShareAction') && analytics.includes('trackRelatedContentClick'), 'Shared feature events missing');
assert.ok(analytics.includes('trackToolFavorite') && analytics.includes('trackToolScenarioSelect') && analytics.includes('trackToolChainAction') && analytics.includes('trackContractDriftRun'), 'Toolooo LV3 analytics hooks missing');
assert.ok(!/raw_input|result_value|payload_text/i.test(analytics), 'LV3 analytics must not define raw input or result fields');

const toolsSource = fs.readFileSync(path.join(root, 'src/data/tools.ts'), 'utf8');
const toolRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(toolsSource))}`);
const chainsSource = fs.readFileSync(path.join(root, 'src/data/toolChains.ts'), 'utf8').replace("import type { Tool } from './tools';\n", '');
const chainsModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(chainsSource))}`);
assert.deepEqual(chainsModule.validateToolChains(toolRegistry.tools), [], 'Tool chains must use real canonical tool IDs and unique IDs');
const lv3Tools = toolRegistry.tools.filter((tool) => tool.lv3);
assert.equal(lv3Tools.length, 3, 'LV3 upgrades must stay limited to the three reviewed tools');
assert.ok(lv3Tools.some((tool) => tool.id === 'api-payload-doctor'), 'API Payload Doctor must be LV3 after Contract Drift');
for (const tool of lv3Tools) {
  assert.equal(tool.featureLevel, 3, `${tool.id} must be LV3 when it declares LV3 capabilities`);
  assert.ok(Object.values(tool.lv3.capabilities).some(Boolean), `${tool.id} has an empty LV3 capability declaration`);
  for (const move of tool.lv3.nextMoves || []) assert.ok(toolRegistry.tools.some((candidate) => candidate.id === move.targetToolId), `${tool.id} has an invalid smart next move`);
  for (const chainId of tool.lv3.chainIds || []) assert.ok(chainsModule.toolChains.some((chain) => chain.id === chainId), `${tool.id} has an invalid chain reference`);
}
const lv3Workspace = fs.readFileSync(path.join(root, 'src/components/toolbox/lv3/workspace.ts'), 'utf8');
assert.ok(lv3Workspace.includes('slice(0, LIMIT)') && !/input|payload|token/i.test(lv3Workspace), 'My Toolooo storage must be bounded and metadata-only');

const infooo = fs.readFileSync(path.join(root, 'src/data/infooo.ts'), 'utf8');
assert.ok(infooo.includes("status: 'active' as const"), 'Infooo must be active with a published world');
assert.ok(infooo.includes("tagline: 'See it. Touch it. Understand it.'"), 'Infooo identity missing');
assert.ok(infooo.includes("title: 'Human Atlas'"), 'Human Atlas world is missing');
assert.equal((infooo.match(/status: 'published'/g) || []).length, 1, 'Infooo must have exactly one published world');
assert.equal((infooo.match(/status: 'private'/g) || []).length, 0, 'No unfinished private Infooo world should be presented as public content');
assert.ok(!/internet-request-journey|What Happens When You Press Enter|world-002/.test(infooo), 'Discarded World 002 must not remain in the Infooo registry');
assert.ok(infooo.includes('InfoooCandidateChecks') && infooo.includes('factualSources') && infooo.includes('requiredPassed'), 'Infooo candidate gate missing');
assert.ok(infooo.includes('fact?:') && infooo.includes('model?:') && infooo.includes('simulation?:') && infooo.includes('sources?:'), 'Infooo truth fields missing');
assert.ok(fs.existsSync(path.join(root, 'src/pages/infooo/index.astro')) && fs.existsSync(path.join(root, 'src/pages/infooo/human-atlas.astro')), 'Infooo routes missing');
for (const discarded of ['src/pages/infooo/internet-request-journey.astro', 'src/components/infooo/InternetRequestWorld.tsx', 'src/data/internetRequestJourney.ts']) assert.ok(!fs.existsSync(path.join(root, discarded)), `Discarded World 002 file remains: ${discarded}`);

const dist = path.join(root, 'dist');
const pages = fs.readdirSync(dist, { recursive: true }).filter(file => String(file).endsWith('.html'));
const html = pages.map(file => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
assert.ok(html.includes('A quick guide'), 'Tool knowledge layer missing from build');
assert.ok(html.includes('Try next'), 'Workflow-related tools missing from build');
assert.ok(!/href=["'][^"']*notooo[^"']*["']/i.test(html), 'Inactive Notooo must not be publicly linked');
assert.ok(html.includes('Human Atlas') && html.includes('See it. Touch it. Understand it.'), 'Published Infooo identity is missing');
assert.ok(!/What Happens When You Press Enter|internet-request-journey|Cache hit vs cache miss/.test(html), 'Discarded World 002 content remains in the build');
for (const match of html.matchAll(/data-related-content[^>]*data-related-slug=["']([^"']+)["']/g)) assert.ok(/^[a-z0-9-]+$/.test(match[1]), 'Invalid related content slug');
console.log(`Value audit passed: ${valueLaws.length} laws, hard gates, knowledge, relationships, privacy and manifest structure checked across ${pages.length} HTML pages.`);
