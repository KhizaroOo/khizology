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
for (const field of ['id', 'contentType', 'monster', 'slug', 'title', 'hook', 'shortDescription', 'url', 'heroAsset', 'tags', 'socialStatus', 'compoundValuePacks', 'validateCompoundValuePacks']) assert.ok(manifest.includes(field), `Content manifest missing ${field}`);
const knowledge = fs.readFileSync(path.join(root, 'src/data/toolKnowledge.ts'), 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|localStorage|location\.search/.test(knowledge), 'Knowledge layer must stay local and input-free');
const analytics = fs.readFileSync(path.join(root, 'src/utils/analytics.ts'), 'utf8');
// Prove consent/input boundaries and sanitized public referrers, not blanket suppression.
await import('./test-analytics.mjs');
assert.ok(analytics.includes('trackShareAction') && analytics.includes('trackRelatedContentClick'), 'Shared feature events missing');
assert.ok(analytics.includes('trackToolFavorite') && analytics.includes('trackToolScenarioSelect') && analytics.includes('trackToolChainAction') && analytics.includes('trackContractDriftRun'), 'Toolooo LV3 analytics hooks missing');
assert.ok(!/raw_input|result_value|payload_text/i.test(analytics), 'LV3 analytics must not define raw input or result fields');

const toolsSource = fs.readFileSync(path.join(root, 'src/data/tools.ts'), 'utf8');
const toolRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(toolsSource))}`);
assert.equal(toolRegistry.growthPriorityTools.length, 10, 'Growth shortlist must contain ten canonical active tools');
assert.equal(new Set(toolRegistry.growthPriorityTools.map(tool => tool.slug)).size, 10);
for (const tool of toolRegistry.growthPriorityTools) {
  assert.equal(tool.status, 'active');
  assert.ok(toolRegistry.getRelatedTools(tool).length, `${tool.slug}: priority tool needs a relevant pathway`);
}
const monstersSource = fs.readFileSync(path.join(root, 'src/data/monsters.ts'), 'utf8');
const monsterRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(monstersSource))}`);
const activeMonsterRoles = new Map(monsterRegistry.monsters.filter((monster) => monster.status === 'active').map((monster) => [monster.id, monster.role]));
assert.equal(activeMonsterRoles.get('artooo'), 'FEEL', 'Artooo must retain the FEEL role');
assert.equal(activeMonsterRoles.get('toolooo'), 'USE', 'Toolooo must retain the USE role');
assert.equal(activeMonsterRoles.get('infooo'), 'UNDERSTAND', 'Infooo must retain the UNDERSTAND role');
const activeMonsters = monsterRegistry.monsters.filter((monster) => monster.status === 'active');
assert.deepEqual(activeMonsters.map(monster => monster.id), ['artooo', 'toolooo', 'infooo'], 'Only the three current products may be active');
const retainedMystery = monsterRegistry.getMonsterById('future-5');
assert.equal(retainedMystery?.status, 'coming-soon', 'The retained mascot must remain locked');
assert.equal(retainedMystery?.image, '/images/Monsters/ff-04.png', 'Preserve the original mascot asset');
assert.equal(retainedMystery?.color, '#E38D7C', 'Preserve the original mascot color');
assert.ok(fs.existsSync(path.join(root, 'public', retainedMystery.image)), 'The retained mascot must exist');
assert.equal(new Set(monsterRegistry.monsters.map(monster => monster.id)).size, monsterRegistry.monsters.length, 'All monster IDs must be unique');
assert.equal(new Set(activeMonsters.map((monster) => monster.id)).size, activeMonsters.length, 'Active monsters must have unique canonical IDs');
assert.equal(new Set(activeMonsters.map((monster) => monster.route)).size, activeMonsters.length, 'Active monsters must have unique public routes');
for (const monster of activeMonsters) {
  assert.ok(monster.name && monster.module && monster.description && monster.role && monster.tagline, `${monster.id}: active monster needs a complete canonical identity`);
  assert.match(monster.route, /^\/[a-z0-9-]*$/, `${monster.id}: active monster route must be public and canonical`);
}
const mysteryMonsters = monsterRegistry.monsters.filter((monster) => monster.status === 'coming-soon');
assert.ok(mysteryMonsters.length > 0, 'Mystery Monster Unlock Gate needs locked mystery entries');
for (const monster of mysteryMonsters) {
  assert.match(monster.id, /^future-\d+$/, `${monster.id}: mystery ID must stay generic`);
  assert.equal(monster.name, '???ooo', `${monster.id}: mystery identity must stay anonymous`);
  assert.equal(monster.module, 'Unknown', `${monster.id}: mystery module must stay anonymous`);
  assert.equal(monster.description, 'A mystery still taking shape in the Khizooology lab.', `${monster.id}: mystery purpose must stay unrevealed`);
  assert.equal(monster.tagline, 'Still forming.', `${monster.id}: mystery tagline must not promise a launch`);
  assert.equal(monster.route, '/future-monsters', `${monster.id}: mystery entries may only use the shared noindex route`);
  assert.equal(monster.role, undefined, `${monster.id}: mystery entries must not receive a placeholder role`);
  assert.match(monster.image, /^\/images\/Monsters\/(?:ff|mystery)-\d+\.png$/, `${monster.id}: mystery asset filename must stay neutral`);
}
assert.ok(!/devooo|freeooo/i.test(monstersSource), 'Historical mystery asset names must not remain in the canonical registry');
const monsterVoicesSource = fs.readFileSync(path.join(root, 'src/data/monsterVoices.ts'), 'utf8')
  .replace("import { getMonsterById, type Monster } from './monsters';", `const monsters = ${JSON.stringify(monsterRegistry.monsters)}; const getMonsterById = (id) => monsters.find((monster) => monster.id === id);`);
const monsterVoicesModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(monsterVoicesSource))}`);
assert.ok(Object.keys(monsterVoicesModule.monsterVoices).every((id) => !id.startsWith('future-')), 'Mystery monsters must not receive individual voices');
for (const monster of mysteryMonsters) assert.equal(monsterVoicesModule.getMonsterVoice(monster), monsterVoicesModule.mysteryMonsterVoice, `${monster.id}: locked monster must use the shared mystery voice`);
const mysteryUnlockGuide = path.join(root, 'docs/MYSTERY-MONSTER-UNLOCK-GATE.md');
assert.ok(fs.existsSync(mysteryUnlockGuide), 'Mystery Monster Unlock Gate guide is missing');
for (const concept of ['Purpose first → monster second.', 'MYSTERY → CANDIDATE → PROTOTYPE → READY TO UNLOCK → ACTIVE', 'Khizar’s explicit approval', 'keep it mysterious']) {
  assert.ok(fs.readFileSync(mysteryUnlockGuide, 'utf8').includes(concept), `Mystery Monster Unlock Gate guide is missing ${concept}`);
}
const creativeRdLabGuide = path.join(root, 'docs/CREATIVE-RD-LAB.md');
assert.ok(fs.existsSync(creativeRdLabGuide), 'Creative R&D Lab guide is missing');
for (const concept of ['**use, understand, feel, and share**', 'THINK → CREATE IDEAS → SCORE → PROTOTYPE → BUILD → VERIFY → PUBLISH → SHARE / MARKET → MEASURE → IMPROVE → BUILD SMARTER', 'REAL PURPOSE + REAL VALUE MODE + ORIGINAL CONTRIBUTION + TRUTH + KHIZOOOLOGY IDENTITY + PUBLISHING QUALITY', 'Don’t build more. Build something worth existing.', 'Retry Storm Simulator', 'A Skull Rose Fusion', 'Human Atlas', 'Behind the Vibes', 'Compound Value draft']) {
  assert.ok(fs.readFileSync(creativeRdLabGuide, 'utf8').includes(concept), `Creative R&D Lab guide is missing ${concept}`);
}
for (const guide of ['KHIZOOOLOGY-VALUE-LAWS.md', 'PUBLISHING-QUALITY-CHECKLIST.md', 'COMPOUND-VALUE-WORKFLOW.md', 'BUILD-SMARTER-WITH-DATA.md', 'MYSTERY-MONSTER-UNLOCK-GATE.md', 'MONSTER-VOICE-SYSTEM.md', 'TOOLOOO-KNOWLEDGE.md', 'INFOOO-IDENTITY.md']) {
  assert.ok(fs.existsSync(path.join(root, 'docs', guide)), `Creative R&D Lab canonical guide is missing ${guide}`);
}
assert.ok(!fs.existsSync(path.join(root, 'src/pages/creative-rd-lab.astro')), 'Creative R&D Lab governance must not create a public route');
const publishingChecklist = fs.readFileSync(path.join(root, 'docs/PUBLISHING-QUALITY-CHECKLIST.md'), 'utf8');
assert.ok(publishingChecklist.includes('USE, UNDERSTAND, FEEL, or SHARE'), 'Publishing checklist must ask for a real visitor value mode');
const artworkRelationsSource = fs.readFileSync(path.join(root, 'src/utils/artworkRelations.ts'), 'utf8').replace(/import type[^;]+;/, '');
const artworkRelationsModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(artworkRelationsSource))}`);
const artworksSource = fs.readFileSync(path.join(root, 'src/data/artworks.ts'), 'utf8')
  .replace("import { rankRelatedArtworks } from '../utils/artworkRelations';", `const rankRelatedArtworks = ${artworkRelationsModule.rankRelatedArtworks.toString()};`)
  .replace("import { artworkDimensions } from './artworkDimensions';", "const artworkDimensions = new Proxy({}, { get: () => ({ width: 1, height: 1 }) });");
const artworkRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(artworksSource))}`);
const deploymentSource = fs.readFileSync(path.join(root, 'src/components/infooo/deployment/deploymentJourney.ts'), 'utf8').replace(/import type[^;]+;/, '');
const deploymentModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(deploymentSource))}`);
const gridTrendSource = fs.readFileSync(path.join(root, 'src/components/infooo/grid/gridTrends.ts'), 'utf8');
const gridTrendModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(gridTrendSource))}`);
const infoooSource = fs.readFileSync(path.join(root, 'src/data/infooo.ts'), 'utf8')
  .replace("import { gridSources } from '../components/infooo/grid/gridTrends';", `const gridSources = ${JSON.stringify(gridTrendModule.gridSources)};`)
  .replace(/import \{ deploymentStages, deploymentGuide(?:, deploymentFailures)? \} from '\.\.\/components\/infooo\/deployment\/deploymentJourney';/, `const deploymentStages = ${JSON.stringify(deploymentModule.deploymentStages)}; const deploymentGuide = ${JSON.stringify(deploymentModule.deploymentGuide)}; const deploymentFailures = ${JSON.stringify(deploymentModule.deploymentFailures)};`)
  .replace("import type { ValueLawScores } from './valueLaws';", '')
  .replace("import { createIdeaEvaluation } from './valueLaws';", 'const createIdeaEvaluation = (input) => input;')
  .replace("import { followTheBloodGuide, humanAtlasEntities, humanAtlasRelationships } from './humanAtlasLearning';", 'const followTheBloodGuide = {}; const humanAtlasEntities = []; const humanAtlasRelationships = [];');
const infoooRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(infoooSource))}`);
assert.equal(infoooRegistry.infoooCategories.length, 6, 'Infooo must have six canonical categories');
assert.equal(new Set(infoooRegistry.infoooCategories.map(category => category.id)).size, 6, 'Infooo category IDs must be unique');
for (const world of infoooRegistry.infoooWorlds) {
  assert.ok(infoooRegistry.infoooCategories.some(category => category.id === world.category), `${world.slug}: invalid Infooo category`);
}
const llmsText = fs.readFileSync(path.join(root, 'dist/llms.txt'), 'utf8');
const llmsMetadata = value => value.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>]/g, '\\$&');
for (const world of infoooRegistry.infoooWorlds) {
  assert.equal(llmsText.includes(`[${llmsMetadata(world.title)}]`), world.status === 'published' && world.visibility === 'public', `${world.slug}: llms.txt must include only public, published Infooo worlds`);
}
const manifestSource = manifest
  .replace("import { tools } from './tools';", `const tools = ${JSON.stringify(toolRegistry.tools)};`)
  .replace("import { artworks } from './artworks';", `const artworks = ${JSON.stringify(artworkRegistry.artworks)};`)
  .replace("import { infoooWorlds, type InfoooWorld } from './infooo';", `const infoooWorlds = ${JSON.stringify(infoooRegistry.infoooWorlds)};`);
const manifestModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(manifestSource))}`);
assert.deepEqual(manifestModule.validateCompoundValuePacks(manifestModule.compoundValuePacks, manifestModule.contentManifest), [], 'Compound Value Packs must use canonical IDs, canonical URLs, safe data, and approved publishing');
assert.deepEqual(manifestModule.validateCompoundValuePacks(manifestModule.reviewCompoundValuePacks, manifestModule.reviewContentManifest), [], 'Review-only Compound Value packs must use canonical IDs, safe data, and review sources');
assert.equal(new Set(manifestModule.contentManifest.map((item) => manifestModule.compoundValueReferenceKey({ contentType: item.contentType, sourceId: item.id }))).size, manifestModule.contentManifest.length, 'Content manifest sources must have unique canonical references');
assert.deepEqual(new Set(manifestModule.compoundValuePacks.map((pack) => pack.source.contentType)), new Set(['tool', 'artwork', 'infooo_world']), 'Compound Value needs one representative pack for Toolooo, Artooo, and Infooo');
const compoundError = (packs, message) => assert.ok(manifestModule.validateCompoundValuePacks(packs, manifestModule.contentManifest).some((error) => error.includes(message)), `Compound Value workflow should reject: ${message}`);
const compoundFixture = structuredClone(manifestModule.compoundValuePacks[0]);
const invalidCompoundSource = structuredClone(compoundFixture); invalidCompoundSource.source.sourceId = 'missing-tool';
compoundError([invalidCompoundSource], 'invalid source ID');
const invalidCompoundRelated = structuredClone(compoundFixture); invalidCompoundRelated.related = [{ contentType: 'tool', sourceId: 'missing-tool' }];
compoundError([invalidCompoundRelated], 'invalid related ID');
const unsafeCompoundData = structuredClone(compoundFixture); unsafeCompoundData.socialDraft.copy = 'Use the raw API payload from a visitor.';
compoundError([unsafeCompoundData], 'raw visitor data');
const unapprovedCompoundPublish = structuredClone(compoundFixture); unapprovedCompoundPublish.socialDraft.status = 'published';
compoundError([unapprovedCompoundPublish], 'published social draft requires human approval');
const artCompoundPack = manifestModule.compoundValuePacks.find((pack) => pack.source.contentType === 'artwork');
const artCompoundSource = manifestModule.contentManifest.find((item) => item.contentType === 'artwork' && item.id === artCompoundPack.source.sourceId);
assert.equal(artCompoundPack.takeaway, undefined, 'Artooo must not invent a takeaway without creator-authored context');
assert.equal(artCompoundPack.discoveryAngle, undefined, 'Artooo must not invent a discovery angle without creator-authored context');
assert.equal(artCompoundPack.socialDraft.copy, `${artCompoundSource.title}. Original artwork by khizooo.`, 'Artooo social copy must remain factual when only title and tags exist');
const humanAtlasCompoundPack = manifestModule.compoundValuePacks.find((pack) => pack.source.sourceId === 'world-001');
assert.match(humanAtlasCompoundPack.socialDraft.copy, /learning and exploration, not medical diagnosis or treatment/i, 'Human Atlas compound copy must retain its educational boundary');
assert.ok(!JSON.stringify(manifestModule.compoundValuePacks).match(/future-[0-9]|\?\?\?ooo/i), 'Compound Value Packs must not reveal mystery identities');
const compoundWorkflowGuide = path.join(root, 'docs/COMPOUND-VALUE-WORKFLOW.md');
assert.ok(fs.existsSync(compoundWorkflowGuide), 'Compound Value Workflow guide is missing');
for (const concept of ['CREATE → EXTRACT REAL VALUE → PACKAGE → CONNECT → SHARE → MEASURE → IMPROVE', 'Human approval', 'never visitor data']) {
  assert.ok(fs.readFileSync(compoundWorkflowGuide, 'utf8').includes(concept), `Compound Value Workflow guide is missing ${concept}`);
}
const buildSmarterSource = fs.readFileSync(path.join(root, 'src/data/buildSmarter.ts'), 'utf8').replace("import type { ContentManifestItem, ContentManifestType } from './contentManifest';", '');
const buildSmarterModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(buildSmarterSource))}`);
assert.deepEqual(buildSmarterModule.validateBuildSmarterSnapshots(buildSmarterModule.buildSmarterSyntheticSnapshots, manifestModule.contentManifest), [], 'Build Smarter examples must use canonical IDs, valid advisory actions, sufficient privacy, and explicit synthetic labeling');
assert.deepEqual(buildSmarterModule.validateBuildSmarterDecisionLog(buildSmarterModule.buildSmarterSyntheticDecisionLog, buildSmarterModule.buildSmarterSyntheticSnapshots), [], 'Build Smarter decision log must reference a valid snapshot and remain unapproved synthetic guidance');
assert.deepEqual(buildSmarterModule.buildSmarterActions, ['improve', 'promote', 'connect', 'maintain', 'explore', 'hold', 'stop-investing'], 'Build Smarter must keep the reviewed advisory actions');
const decisionError = (snapshots, message) => assert.ok(buildSmarterModule.validateBuildSmarterSnapshots(snapshots, manifestModule.contentManifest).some((error) => error.includes(message)), `Build Smarter workflow should reject: ${message}`);
const decisionFixture = structuredClone(buildSmarterModule.buildSmarterSyntheticSnapshots[0]);
const invalidDecisionSource = structuredClone(decisionFixture); invalidDecisionSource.source.sourceId = 'missing-tool';
decisionError([invalidDecisionSource], 'invalid source ID');
const invalidDecisionAction = structuredClone(decisionFixture); invalidDecisionAction.recommendedAction = 'delete';
decisionError([invalidDecisionAction], 'invalid recommended action');
const unsafeDecisionData = structuredClone(decisionFixture); unsafeDecisionData.observation = 'Raw API payload from a visitor.';
decisionError([unsafeDecisionData], 'raw or sensitive analytics data');
const prematureStop = structuredClone(buildSmarterModule.buildSmarterSyntheticSnapshots[3]); prematureStop.recommendedAction = 'stop-investing';
decisionError([prematureStop], 'insufficient evidence requires HOLD');
assert.deepEqual(new Set(buildSmarterModule.buildSmarterSyntheticSnapshots.map((snapshot) => snapshot.source.contentType)), new Set(['tool', 'artwork', 'infooo_world']), 'Build Smarter needs Toolooo, Artooo, and Infooo examples');
assert.ok(buildSmarterModule.buildSmarterSyntheticSnapshots.every((snapshot) => snapshot.synthetic && snapshot.humanReviewRequired), 'Build Smarter examples must remain clearly synthetic and human-reviewed');
assert.ok(!/fetch\(|XMLHttpRequest|OAuth|gtag\(|localStorage/.test(buildSmarterSource), 'Build Smarter workflow must stay local, manual, and input-free');
const buildSmarterGuide = path.join(root, 'docs/BUILD-SMARTER-WITH-DATA.md');
assert.ok(fs.existsSync(buildSmarterGuide), 'Build Smarter With Data guide is missing');
for (const concept of ['PUBLISH → MEASURE → INTERPRET → CHOOSE → IMPROVE → MEASURE AGAIN', 'STOP INVESTING', 'Decision snapshot', 'Synthetic examples']) {
  assert.ok(fs.readFileSync(buildSmarterGuide, 'utf8').includes(concept), `Build Smarter With Data guide is missing ${concept}`);
}
const knowledgeModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(knowledge))}`);
const knowledgeSlugs = Object.keys(knowledgeModule.toolKnowledgeWhyBySlug);
const urlSource = fs.readFileSync(path.join(root, 'src/utils/url.ts'), 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'");
const urlModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(urlSource))}`);
assert.equal(urlModule.url('/toolbox/api-payload-doctor', ''), '/toolbox/api-payload-doctor/');
assert.equal(urlModule.url('/toolbox/api-payload-doctor?demo=1#result', '/preview/'), '/preview/toolbox/api-payload-doctor/?demo=1#result');
assert.equal(urlModule.url('/robots.txt', '/preview'), '/preview/robots.txt');
for (const component of ['MyTooloooPanel.tsx', 'ToolLv3Panel.tsx']) {
  const source = fs.readFileSync(path.join(root, 'src/components/toolbox/lv3', component), 'utf8');
  assert.ok(source.includes("import { url } from '../../../utils/url';") && !source.includes('${base}/toolbox/'), `${component}: runtime discovery must use the canonical route helper`);
}
assert.deepEqual(new Set(Object.keys(knowledgeModule.toolUseCases)), new Set(toolRegistry.tools.map(tool => tool.slug)), 'Every tool needs one curated use case');
assert.equal(new Set(Object.values(knowledgeModule.toolUseCases).map(([when]) => when)).size, toolRegistry.tools.length, 'Use cases must be tool-specific');
assert.equal(new Set(Object.values(knowledgeModule.toolUseCases).map(([, example]) => example)).size, toolRegistry.tools.length, 'Examples must not repeat boilerplate');
assert.deepEqual(new Set(knowledgeSlugs), new Set(toolRegistry.tools.map((tool) => tool.slug)), 'Every registered tool needs one specific Why explanation');
for (const [slug, why] of Object.entries(knowledgeModule.toolKnowledgeWhyBySlug)) {
  assert.ok(why.trim().length > 0, `${slug} needs a Why explanation`);
  assert.ok(!/^(this tool|this page|analyze your system)/i.test(why.trim()), `${slug} must not use generic knowledge copy`);
  assert.ok(!/consider optimizing|best practice for everyone/i.test(why), `${slug} uses an unsupported generic recommendation`);
}
for (const tool of toolRegistry.tools) {
  assert.ok(tool.shortDescription.trim().length > 0, `${tool.slug} needs a What description`);
  assert.ok(!/^(this tool|this page) /i.test(tool.shortDescription.trim()), `${tool.slug} has generic What copy`);
  const content = knowledgeModule.getToolKnowledge(tool);
  assert.ok(content.whenToUse && content.example, `${tool.slug}: missing search value`);
  const generated = fs.readFileSync(path.join(root, 'dist/toolbox', tool.slug, 'index.html'), 'utf8');
  assert.ok(generated.includes('data-tool-example') && generated.includes(content.example.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')), `${tool.slug}: scenario must exist in static HTML`);
}
for (const artwork of artworkRegistry.artworks) {
  const related = artworkRegistry.getRelatedArtworks(artwork);
  assert.ok(related.every(item => item.id !== artwork.id && artworkRegistry.artworks.some(candidate => candidate.id === item.id)), 'Related art must use canonical items');
  assert.equal(new Set(related.map(item => item.id)).size, related.length);
}
const relationSample = artworkRegistry.artworks[0];
const explicitTarget = artworkRegistry.artworks.at(-1);
assert.equal(artworkRelationsModule.rankRelatedArtworks({ ...relationSample, relatedArtwork: [explicitTarget.slug] }, artworkRegistry.artworks)[0].id, explicitTarget.id, 'Explicit relationships take priority in the shared gallery ranking');
const chainsSource = fs.readFileSync(path.join(root, 'src/data/toolChains.ts'), 'utf8').replace("import type { Tool } from './tools';\n", '');
const chainsModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(chainsSource))}`);
assert.deepEqual(chainsModule.validateToolChains(toolRegistry.tools), [], 'Tool chains must use real canonical tool IDs and unique IDs');
const lv3Tools = toolRegistry.tools.filter((tool) => tool.lv3);
assert.equal(lv3Tools.length, 12, 'LV3 upgrades must stay limited to the twelve reviewed tools');
assert.ok(lv3Tools.some((tool) => tool.id === 'api-payload-doctor'), 'API Payload Doctor must be LV3 after Contract Drift');
for (const id of ['retry-storm-simulator', 'rate-limit-playground', 'circuit-breaker-playground', 'connection-pool-simulator', 'n-plus-1-query-visualizer', 'queue-capacity-planner', 'fan-out-latency-simulator', 'timeout-chain-planner', 'sla-chain-visualizer']) assert.ok(lv3Tools.some((tool) => tool.id === id), `${id} must be LV3 after its reviewed upgrade`);
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
assert.ok(infooo.includes("id: 'world-002'"), 'Rubik’s Cube Motion Graph world is missing');
assert.equal((infooo.match(/status: 'published'/g) || []).length, 14, 'All fourteen implemented Infooo worlds must remain public');
assert.ok(infooo.includes("id: 'world-003'"), 'App Deployment Journey is missing');
assert.ok(infooo.includes("status: 'published', visibility: 'public'"), 'World 002 must be public after Khizar’s release approval');
assert.ok(!/internet-request-journey|What Happens When You Press Enter/.test(infooo), 'Discarded World 002 content remains in the Infooo registry');
assert.ok(infooo.includes('InfoooCandidateChecks') && infooo.includes('factualSources') && infooo.includes('requiredPassed'), 'Infooo candidate gate missing');
assert.ok(infooo.includes('fact?:') && infooo.includes('model?:') && infooo.includes('simulation?:') && infooo.includes('sources?:'), 'Infooo truth fields missing');
assert.ok(fs.existsSync(path.join(root, 'src/pages/infooo/index.astro')) && fs.existsSync(path.join(root, 'src/pages/infooo/human-atlas.astro')), 'Infooo routes missing');
for (const discarded of ['src/pages/infooo/internet-request-journey.astro', 'src/components/infooo/InternetRequestWorld.tsx', 'src/data/internetRequestJourney.ts']) assert.ok(!fs.existsSync(path.join(root, discarded)), `Discarded World 002 file remains: ${discarded}`);

const dist = path.join(root, 'dist');
const generatedFiles = fs.readdirSync(dist, { recursive: true }).map(String);
const pages = generatedFiles.filter(file => file.endsWith('.html'));
const html = pages.map(file => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
assert.ok(!fs.existsSync(path.join(dist, 'notooo')), 'Retired book routes must not be generated');
for (const file of generatedFiles.filter(file => /\.(?:html|xml|txt|js|json|css|webmanifest)$/.test(file))) {
  assert.ok(!/notooo|One Book\. One Page\.|Knowledge Notes|Book in One Page/i.test(fs.readFileSync(path.join(dist, file), 'utf8')), `${file}: retired product identity or discovery data must not ship`);
}
const toolPages = pages.filter(file => /toolbox[\\/]([^\\/]+)[\\/]index\.html$/.test(String(file)));
assert.equal(toolPages.length, toolRegistry.tools.length, 'Expected one generated page per registered tool');
for (const file of toolPages) {
  const toolHtml = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const heading of ['What', 'Why']) assert.ok(new RegExp(`<h3[^>]*>${heading}</h3>`, 'i').test(toolHtml), `${file}: missing static ${heading} knowledge`);
  assert.ok(/Model note/i.test(toolHtml), `${file}: missing model note`);
}
for (const tool of toolRegistry.tools) {
  const toolHtml = fs.readFileSync(path.join(dist, 'toolbox', tool.slug, 'index.html'), 'utf8');
  if (tool.growthPriority) {
    for (const surface of ['Try a scenario', 'When to use it', 'Assumptions and limits', 'Related tools', 'og:title', 'og:description', 'og:image', 'twitter:card', 'Share this page']) assert.ok(toolHtml.includes(surface), `${tool.slug}: missing growth surface ${surface}`);
    assert.ok(tool.lv3?.capabilities.shareResults || /Download/i.test(toolHtml), `${tool.slug}: needs a shareable result or local output`);
  }
  if (tool.lv3) {
    assert.ok(/Smart next moves/i.test(toolHtml), `${tool.slug}: LV3 next moves must remain available`);
    assert.ok(!/data-tool-knowledge-next/.test(toolHtml), `${tool.slug}: LV3 must not render duplicate canonical Next links`);
  } else {
    assert.ok(/data-tool-knowledge-next/.test(toolHtml), `${tool.slug}: missing canonical Next section after the tool output`);
    assert.ok(!/Smart next moves/i.test(toolHtml), `${tool.slug}: non-LV3 must not render an orphaned Smart Next system`);
  }
}
const toolComponentsDirectory = path.join(root, 'src/components/toolbox/tools');
const toolComponents = fs.readdirSync(toolComponentsDirectory).filter((file) => file.endsWith('.tsx') && file !== 'ApiPayloadContractDrift.tsx');
assert.equal(toolComponents.length, toolRegistry.tools.length, 'Expected one source component per registered tool');
for (const component of toolComponents) {
  const source = fs.readFileSync(path.join(toolComponentsDirectory, component), 'utf8');
  assert.ok(/ResultPanel|<Metric|DecisionLab|<Insight|Result/.test(source), `${component}: missing a local calculated result surface`);
  assert.ok(/<Insight|<Warning|DecisionLab|recommend|suggest|Action|tip=|<LocalReviewOutput\s+result=\{result\}\s+toolSlug=\{toolSlug\}/.test(source), `${component}: missing a local result-driven action surface`);
}
const localReviewSource = fs.readFileSync(path.join(root, 'src/components/toolbox/shared/LocalReviewOutput.tsx'), 'utf8');
for (const binding of ['<Insight what={result.summary}', 'why={result.why}', 'tip={result.action}']) assert.ok(localReviewSource.includes(binding), `Shared local review must bind real Result / Why / Action: ${binding}`);
const toolPageSource = fs.readFileSync(path.join(root, 'src/pages/toolbox/[slug].astro'), 'utf8');
assert.ok(toolPageSource.indexOf('variant="intro"') > toolPageSource.indexOf("tool.slug === 'api-payload-doctor'"), 'Full What and Why depth must follow the workspace');
const privacyPosition = toolPageSource.indexOf('<PrivacyNotice');
assert.ok(privacyPosition >= 0 && privacyPosition < toolPageSource.indexOf("tool.slug === 'api-payload-doctor'"), 'Sensitive input privacy notice must precede the workspace');
assert.ok(toolPageSource.includes('variant="next" nextTools={tryNext}') && !toolPageSource.includes('<h3 class="tp-sidebar-h3">Try next</h3>'), 'Next must reuse the canonical next-tool system after the tool result');
const insightSource = fs.readFileSync(path.join(root, 'src/components/toolbox/shared/Insight.tsx'), 'utf8');
for (const label of ['Result', 'Why it matters', 'Action']) assert.ok(insightSource.includes(label), `Insight is missing ${label} labeling`);
const knowledgeGuide = path.join(root, 'docs/TOOLOOO-KNOWLEDGE.md');
assert.ok(fs.existsSync(knowledgeGuide), 'Toolooo knowledge guide is missing');
for (const concept of ['**What**', '**Why**', '**Result**', '**Action**', '**Next**']) assert.ok(fs.readFileSync(knowledgeGuide, 'utf8').includes(concept), `Toolooo knowledge guide is missing ${concept}`);
assert.ok(html.includes('Human Atlas') && html.includes('See it. Touch it. Understand it.'), 'Published Infooo identity is missing');
assert.ok(!/What Happens When You Press Enter|internet-request-journey|Cache hit vs cache miss/.test(html), 'Discarded World 002 content remains in the build');
assert.ok(fs.existsSync(path.join(dist, 'infooo', 'rubiks-cube-motion-graph', 'index.html')), 'World 002 public route is missing');
const rubikHtml = fs.readFileSync(path.join(dist, 'infooo', 'rubiks-cube-motion-graph', 'index.html'), 'utf8');
assert.match(rubikHtml, /name="robots" content="index, follow/, 'World 002 must be indexable after release approval');
assert.ok(fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8').includes('rubiks-cube-motion-graph'), 'World 002 must be listed in the sitemap after release approval');
const infoooHubHtml = fs.readFileSync(path.join(dist, 'infooo', 'index.html'), 'utf8');
assert.ok(/href="[^"]*\/infooo\/rubiks-cube-motion-graph\/?"/.test(infoooHubHtml), 'Infooo hub must link to the published World 002');
assert.ok(!/compound-tool-retry-storm-simulator|compound-artwork-skull-rose-fusion|compound-infooo-human-atlas/.test(html), 'Internal Compound Value drafts must not ship to public HTML');
assert.ok(!/synthetic-retry-storm-promotion|synthetic-human-atlas-experience-gap/.test(html), 'Internal Build Smarter examples must not ship to public HTML');
for (const monster of activeMonsters) {
  const routeDirectory = monster.route === '/' ? dist : path.join(dist, monster.route.slice(1));
  assert.ok(fs.existsSync(path.join(routeDirectory, 'index.html')), `${monster.id}: active monster needs a generated public route`);
}
const mysteryHtml = fs.readFileSync(path.join(dist, 'future-monsters', 'index.html'), 'utf8');
assert.match(mysteryHtml, /name="robots" content="noindex,\s*follow"/, 'Mystery page must remain noindex');
assert.ok(!/devooo|freeooo|future-[0-9]/i.test(mysteryHtml), 'Mystery page must not leak historical names or internal IDs');
assert.match(mysteryHtml, /A name comes after real value\.|Nothing is promised until the experience is genuinely ready\./, 'Mystery page must communicate the unlock gate without a launch promise');
for (const match of html.matchAll(/data-related-content[^>]*data-related-slug=["']([^"']+)["']/g)) assert.ok(/^[a-z0-9-]+$/.test(match[1]), 'Invalid related content slug');
console.log(`Knowledge audit passed: ${toolRegistry.tools.length}/${toolRegistry.tools.length} What and Why entries, ${toolComponents.length}/${toolComponents.length} result and action surfaces, ${lv3Tools.length} LV3 continuation systems, 0 invalid Next references, and 0 generic knowledge findings.`);
console.log(`Value audit passed: ${valueLaws.length} laws, hard gates, knowledge, relationships, privacy and manifest structure checked across ${pages.length} HTML pages.`);
