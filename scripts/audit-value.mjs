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
assert.ok(analytics.includes("page_referrer: ''"), 'Analytics must suppress referrer');
assert.ok(analytics.includes('trackShareAction') && analytics.includes('trackRelatedContentClick'), 'Shared feature events missing');
assert.ok(analytics.includes('trackToolFavorite') && analytics.includes('trackToolScenarioSelect') && analytics.includes('trackToolChainAction') && analytics.includes('trackContractDriftRun'), 'Toolooo LV3 analytics hooks missing');
assert.ok(!/raw_input|result_value|payload_text/i.test(analytics), 'LV3 analytics must not define raw input or result fields');

const toolsSource = fs.readFileSync(path.join(root, 'src/data/tools.ts'), 'utf8');
const toolRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(toolsSource))}`);
const monstersSource = fs.readFileSync(path.join(root, 'src/data/monsters.ts'), 'utf8');
const monsterRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(monstersSource))}`);
const activeMonsterRoles = new Map(monsterRegistry.monsters.filter((monster) => monster.status === 'active').map((monster) => [monster.id, monster.role]));
assert.equal(activeMonsterRoles.get('artooo'), 'FEEL', 'Artooo must retain the FEEL role');
assert.equal(activeMonsterRoles.get('toolooo'), 'USE', 'Toolooo must retain the USE role');
assert.equal(activeMonsterRoles.get('infooo'), 'UNDERSTAND', 'Infooo must retain the UNDERSTAND role');
const activeMonsters = monsterRegistry.monsters.filter((monster) => monster.status === 'active');
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
const artworksSource = fs.readFileSync(path.join(root, 'src/data/artworks.ts'), 'utf8')
  .replace("import { artworkDimensions } from './artworkDimensions';", "const artworkDimensions = new Proxy({}, { get: () => ({ width: 1, height: 1 }) });");
const artworkRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(artworksSource))}`);
const infoooSource = fs.readFileSync(path.join(root, 'src/data/infooo.ts'), 'utf8')
  .replace("import type { ValueLawScores } from './valueLaws';", '')
  .replace("import { createIdeaEvaluation } from './valueLaws';", 'const createIdeaEvaluation = (input) => input;')
  .replace("import { followTheBloodGuide, humanAtlasEntities, humanAtlasRelationships } from './humanAtlasLearning';", 'const followTheBloodGuide = {}; const humanAtlasEntities = []; const humanAtlasRelationships = [];');
const infoooRegistry = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(infoooSource))}`);
const notoooSource = fs.readFileSync(path.join(root, 'src/data/notooo.ts'), 'utf8');
const notoooModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(notoooSource))}`);
const manifestSource = manifest
  .replace("import { tools } from './tools';", `const tools = ${JSON.stringify(toolRegistry.tools)};`)
  .replace("import { artworks } from './artworks';", `const artworks = ${JSON.stringify(artworkRegistry.artworks)};`)
  .replace("import { infoooWorlds, type InfoooWorld } from './infooo';", `const infoooWorlds = ${JSON.stringify(infoooRegistry.infoooWorlds)};`)
  .replace("import { publishedNotoooBooks } from './notooo';", `const publishedNotoooBooks = ${JSON.stringify(notoooModule.publishedNotoooBooks)};`);
const manifestModule = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(manifestSource))}`);
assert.deepEqual(manifestModule.validateCompoundValuePacks(manifestModule.compoundValuePacks, manifestModule.contentManifest), [], 'Compound Value Packs must use canonical IDs, canonical URLs, safe data, and approved publishing');
assert.deepEqual(manifestModule.validateCompoundValuePacks(manifestModule.reviewCompoundValuePacks, manifestModule.reviewContentManifest), [], 'Review-only Compound Value packs must use canonical IDs, safe data, and review sources');
assert.equal(new Set(manifestModule.contentManifest.map((item) => manifestModule.compoundValueReferenceKey({ contentType: item.contentType, sourceId: item.id }))).size, manifestModule.contentManifest.length, 'Content manifest sources must have unique canonical references');
assert.equal(manifestModule.contentManifest.filter((item) => item.contentType === 'notooo').length, notoooModule.publishedNotoooBooks.length, 'Every published Notooo book must have one canonical manifest record');
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
assert.ok(manifestModule.compoundValuePacks.every((pack) => pack.notoooCandidate?.status !== 'published'), 'Future Notooo candidates must remain non-public planning data');
const compoundWorkflowGuide = path.join(root, 'docs/COMPOUND-VALUE-WORKFLOW.md');
assert.ok(fs.existsSync(compoundWorkflowGuide), 'Compound Value Workflow guide is missing');
for (const concept of ['CREATE → EXTRACT REAL VALUE → PACKAGE → CONNECT → SHARE → MEASURE → IMPROVE', 'Human approval', 'Future Notooo', 'never visitor data']) {
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
assert.deepEqual(new Set(knowledgeSlugs), new Set(toolRegistry.tools.map((tool) => tool.slug)), 'Every registered tool needs one specific Why explanation');
for (const [slug, why] of Object.entries(knowledgeModule.toolKnowledgeWhyBySlug)) {
  assert.ok(why.trim().length > 0, `${slug} needs a Why explanation`);
  assert.ok(!/^(this tool|this page|analyze your system)/i.test(why.trim()), `${slug} must not use generic knowledge copy`);
  assert.ok(!/consider optimizing|best practice for everyone/i.test(why), `${slug} uses an unsupported generic recommendation`);
}
for (const tool of toolRegistry.tools) {
  assert.ok(tool.shortDescription.trim().length > 0, `${tool.slug} needs a What description`);
  assert.ok(!/^(this tool|this page) /i.test(tool.shortDescription.trim()), `${tool.slug} has generic What copy`);
}
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
assert.equal((infooo.match(/status: 'published'/g) || []).length, 2, 'Human Atlas and Rubik’s Cube Motion Graph must both be publicly published after release approval');
assert.ok(infooo.includes("status: 'published', visibility: 'public'"), 'World 002 must be public after Khizar’s release approval');
assert.ok(!/internet-request-journey|What Happens When You Press Enter/.test(infooo), 'Discarded World 002 content remains in the Infooo registry');
assert.ok(infooo.includes('InfoooCandidateChecks') && infooo.includes('factualSources') && infooo.includes('requiredPassed'), 'Infooo candidate gate missing');
assert.ok(infooo.includes('fact?:') && infooo.includes('model?:') && infooo.includes('simulation?:') && infooo.includes('sources?:'), 'Infooo truth fields missing');
assert.ok(fs.existsSync(path.join(root, 'src/pages/infooo/index.astro')) && fs.existsSync(path.join(root, 'src/pages/infooo/human-atlas.astro')), 'Infooo routes missing');
for (const discarded of ['src/pages/infooo/internet-request-journey.astro', 'src/components/infooo/InternetRequestWorld.tsx', 'src/data/internetRequestJourney.ts']) assert.ok(!fs.existsSync(path.join(root, discarded)), `Discarded World 002 file remains: ${discarded}`);

assert.deepEqual(notoooModule.notoooCategories, ['Mind', 'Money', 'Nature', 'Life', 'People', 'Society'], 'Notooo V1 must keep its six approved primary categories');
assert.equal(notoooModule.notoooIdentity.role, 'REMEMBER', 'Notooo must own the REMEMBER role');
assert.equal(notoooModule.notoooIdentity.tagline, 'One Book. One Page.', 'Notooo must keep its approved primary format');
assert.equal(notoooModule.notoooIdentity.type, 'Book in One Page', 'Notooo must not expand into unapproved public formats');
assert.deepEqual(notoooModule.validateNotoooBooks(notoooModule.notoooBooks), [], 'Notooo entries must use valid categories, metadata, sources, and book-only format');
assert.deepEqual(notoooModule.getNotoooQualityWarnings(notoooModule.notoooBooks), [], 'All Notooo entries must fit the one-page quality budget');
assert.ok(notoooModule.publishedNotoooBooks.every((book) => book.format === 'book'), 'Published Notooo entries must remain books');
assert.ok(notoooModule.publishedNotoooBooks.every((book) => book.status === 'published'), 'Only published Notooo entries may reach public routes');
const launchBooks = new Map([
  ['the-psychology-of-money', 'Money'], ['braiding-sweetgrass', 'Nature'], ['mans-search-for-meaning', 'Life'], ['steve-jobs', 'People'], ['sapiens', 'Society'],
]);
for (const [slug, category] of launchBooks) {
  const book = notoooModule.getNotoooBook(slug);
  assert.ok(book, `${slug}: launch book must be publicly discoverable`);
  assert.equal(book.category, category, `${slug}: must use the canonical Notooo category`);
  assert.equal(book.format, 'book', `${slug}: must remain a Book Note`);
  assert.equal(book.remember.title, 'One Thing to Keep', `${slug}: must end with One Thing to Keep`);
  assert.ok(book.sources.length >= 2 && book.researchConfidence === 'high', `${slug}: needs two research sources and high confidence`);
}

const engineFixture = structuredClone(notoooModule.notoooBooks[0]);
const engineError = (books, message) => assert.ok(notoooModule.validateNotoooBooks(books).some((error) => error.includes(message)), `Notooo Engine should reject: ${message}`);
const duplicateSlug = structuredClone(engineFixture); duplicateSlug.id = 'another-book'; duplicateSlug.number = 2;
engineError([engineFixture, duplicateSlug], 'duplicate slug');
const duplicateNumber = structuredClone(engineFixture); duplicateNumber.id = 'another-book'; duplicateNumber.slug = 'another-book';
engineError([engineFixture, duplicateNumber], 'duplicate number');
const missingSource = structuredClone(engineFixture); missingSource.sources = [];
engineError([missingSource], 'add at least one research source');
const brokenSource = structuredClone(engineFixture); brokenSource.sections[0].sourceIds = ['missing-source'];
engineError([brokenSource], 'broken source ID missing-source');
const missingOneLiner = structuredClone(engineFixture); missingOneLiner.sections[0].oneLiner = '';
engineError([missingOneLiner], 'every Engine section needs a title and one-liner');
const tooManyPoints = structuredClone(engineFixture); tooManyPoints.sections[0].points.push('One point too many.');
engineError([tooManyPoints], 'at most three supporting points');
const lowConfidencePublished = structuredClone(engineFixture); lowConfidencePublished.researchConfidence = 'low';
engineError([lowConfidencePublished], 'published entries cannot use low research confidence');
const draftFixture = structuredClone(engineFixture); draftFixture.status = 'draft';
assert.equal(notoooModule.getPublishedNotoooBooks([draftFixture]).length, 0, 'Draft Notooo entries must stay out of public routes');

const notoooGuide = path.join(root, 'docs/NOTOOO.md');
assert.ok(fs.existsSync(notoooGuide), 'Notooo concept guide is missing');
for (const concept of ['One Book. One Page.', 'Big knowledge. Small space. Simple words.', 'Discover → Understand → Download → Print → Keep', 'Clarity → Compression → Understanding → Memory']) {
  assert.ok(fs.readFileSync(notoooGuide, 'utf8').includes(concept), `Notooo concept guide is missing ${concept}`);
}
const engineGuide = path.join(root, 'docs/NOTOOO_ENGINE.md');
assert.ok(fs.existsSync(engineGuide), 'Notooo Engine guide is missing');
for (const concept of ['Pipeline', 'Source priority and truth rules', 'Knowledge map', 'Scoring and page gates', 'JSON exchange shape', 'Research prompt', 'Author workflow']) {
  assert.ok(fs.readFileSync(engineGuide, 'utf8').includes(concept), `Notooo Engine guide is missing ${concept}`);
}

const dist = path.join(root, 'dist');
const pages = fs.readdirSync(dist, { recursive: true }).filter(file => String(file).endsWith('.html'));
const html = pages.map(file => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
const notoooSitemap = fs.readFileSync(path.join(dist, 'sitemap-0.xml'), 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'src/utils/notoooCatalog.ts'), 'utf8');
const { normalizeNotoooSearch, matchesNotoooCatalogItem } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(catalogSource))}`);
const catalogMetadata = notoooModule.notoooBooks.map(book => ({
  search: normalizeNotoooSearch([book.title, book.author, book.category, ...book.tags].join(' ')),
  category: book.category, status: book.status === 'published' ? 'published' : 'coming',
}));
const matching = (query = '', category = 'All', status = 'all') => catalogMetadata.filter(item => matchesNotoooCatalogItem(item, query, category, status));
assert.equal(matching().length, notoooModule.notoooBooks.length, 'Default catalog must include every record');
for (const category of notoooModule.notoooCategories) assert.equal(matching('', category).length, notoooModule.notoooBooks.filter(book => book.category === category).length, `${category}: category filter count`);
assert.equal(matching('', 'All', 'published').length, notoooModule.publishedNotoooBooks.length, 'Published filter must use the lifecycle');
assert.equal(matching('', 'All', 'coming').length, notoooModule.notoooBooks.length - notoooModule.publishedNotoooBooks.length, 'Coming filter must include non-public records');
assert.equal(matching('  ATOMIC   Habits  ', 'Mind', 'published').length, 1, 'Title search must handle case, spaces, category and status together');
assert.equal(matching('James Clear').length, 1, 'Author search must work');
assert.equal(matching('atomic', 'Money').length, 0, 'Search must respect category');
assert.equal(matching('atomic', 'Mind', 'coming').length, 0, 'Search must respect status');
assert.equal(matching('notooo-no-matching-book').length, 0, 'Search must support an empty result');
assert.equal(normalizeNotoooSearch('Rönnlund'), 'ronnlund', 'Search must support accented names');
const hubHtml = fs.readFileSync(path.join(dist, 'notooo/index.html'), 'utf8');
const catalogItems = [...hubHtml.matchAll(/<li\b[^>]*\bdata-notooo-book\b[\s\S]*?<\/article>\s*<\/li>/g)].map(match => match[0]);
assert.equal(catalogItems.length, notoooModule.notoooBooks.length, 'Build must statically render the full catalog');
const escapeCatalogHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const readSchema = output => [...output.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1]));
const hubCollection = readSchema(hubHtml).find(schema => schema['@type'] === 'CollectionPage');
assert.equal(readSchema(hubHtml).find(schema => schema['@type'] === 'BreadcrumbList')?.itemListElement.length, 2, 'Hub schema must match Home → Notooo breadcrumbs');
assert.equal(hubCollection?.mainEntity?.['@type'], 'ItemList', 'Notooo hub needs a published-note ItemList');
assert.equal(hubCollection.mainEntity.numberOfItems, notoooModule.publishedNotoooBooks.length, 'Schema count must mean published, not inventory');
const sitemapUrls = [...notoooSitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
const hubCanonical = hubHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
assert.equal(sitemapUrls.filter(value => value === hubCanonical).length, 1, 'Notooo hub must appear exactly once in the sitemap');
assert.deepEqual(hubCollection.mainEntity.itemListElement.map(item => item.url), notoooModule.publishedNotoooBooks.map(book => `${hubCanonical}${book.slug}/`), 'ItemList must contain only real published canonical URLs');
assert.equal(sitemapUrls.filter(value => value.startsWith(hubCanonical)).length, notoooModule.publishedNotoooBooks.length + 1, 'No category, filter, search or draft routes may enter the Notooo sitemap');
const publicJs = fs.readdirSync(dist, { recursive: true }).filter(file => String(file).endsWith('.js')).map(file => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
const bodyFields = book => [book.bigIdea, ...book.sections, book.khizoooTake, book.remember].flatMap(section => [section.oneLiner, ...section.points]);
const publishedBody = new Set(notoooModule.publishedNotoooBooks.flatMap(bodyFields));
const notoooTitles = new Set();
for (const book of notoooModule.notoooBooks) {
  const search = escapeCatalogHtml(normalizeNotoooSearch([book.title, book.author, book.category, ...book.tags].join(' ')));
  const items = catalogItems.filter(item => item.includes(`data-search="${search}"`));
  assert.equal(items.length, 1, `${book.slug}: one catalog item with metadata-only search`);
  assert.ok(items[0].includes(`data-category="${book.category}"`), `${book.slug}: canonical category must be rendered`);
  const title = book.seoTitle || `${book.title} in One Page | Notooo`;
  const fullTitle = title.includes('Khizooology') ? title : `${title} — Khizooology`;
  assert.ok(title.trim() && fullTitle.length < 70, `${book.slug}: prepare a unique title under 70 characters before release`);
  assert.ok(!notoooTitles.has(fullTitle), `${book.slug}: duplicate Notooo SEO title`);
  notoooTitles.add(fullTitle);
  if (book.status === 'published') continue;
  assert.equal(notoooModule.getNotoooBook(book.slug), undefined, `${book.slug}: non-public note must not resolve through the public lookup`);
  assert.ok(!manifestModule.contentManifest.some(item => item.contentType === 'notooo' && item.slug === book.slug), `${book.slug}: non-public note leaked into the content manifest`);
  assert.ok(!fs.existsSync(path.join(dist, 'notooo', book.slug, 'index.html')), `${book.slug}: non-public note route was generated`);
  assert.ok(!html.includes(`/notooo/${book.slug}/`) && !html.includes(`/notooo/${book.slug}\"`), `${book.slug}: non-public note leaked into public discovery`);
  assert.ok(!notoooSitemap.includes(`/notooo/${book.slug}/`), `${book.slug}: non-public note leaked into the sitemap`);
  assert.ok(!/<a\b/.test(items[0]) && items[0].includes('Coming'), `${book.slug}: Coming item must not look like a broken link`);
  for (const text of [...bodyFields(book), book.whyItMatters, book.aboutThisNotooo, book.subtitle, book.shortDescription]) {
    if (publishedBody.has(text)) continue; // A shared phrase already approved for a published note is not a draft leak.
    assert.ok(!html.includes(text) && !html.includes(escapeCatalogHtml(text)) && !publicJs.includes(JSON.stringify(text).slice(1, -1)), `${book.slug}: private draft content shipped publicly`);
  }
}
for (const book of notoooModule.publishedNotoooBooks) {
  assert.ok(notoooModule.relatedNotoooBooks(book).length, `${book.slug}: provide a useful published continuation`);
  assert.ok(notoooModule.relatedNotoooBooks(book).every(related => related.status === 'published'), `${book.slug}: related notes must respect public status`);
  const noteHtml = fs.readFileSync(path.join(dist, 'notooo', book.slug, 'index.html'), 'utf8');
  for (const related of notoooModule.relatedNotoooBooks(book)) assert.ok(noteHtml.includes(`/notooo/${related.slug}/"`), `${book.slug}: canonical related note link missing`);
  const canonical = noteHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(sitemapUrls.filter(value => value === canonical).length, 1, `${book.slug}: published sitemap entry must appear once`);
  assert.ok(hubHtml.includes(`href="${new URL(canonical).pathname}"`), `${book.slug}: published note must have a normal discovery link`);
  const work = readSchema(noteHtml).find(schema => schema['@type'] === 'CreativeWork');
  assert.equal(readSchema(noteHtml).find(schema => schema['@type'] === 'BreadcrumbList')?.itemListElement.length, 3, `${book.slug}: schema must match Home → Notooo → Book breadcrumbs`);
  assert.equal(work?.about?.['@type'], 'Book', `${book.slug}: synthesis must identify its source book`);
  assert.equal(work.about.author.name, book.author, `${book.slug}: book author must remain separate from editorial author`);
  assert.equal(work.author['@id'], `${new URL(canonical).origin}${new URL(canonical).pathname.split('/notooo/')[0]}/my-portfolio/#person`, `${book.slug}: editorial author must use the canonical site person`);
  assert.equal(work.datePublished, book.publishedAt, `${book.slug}: truthful page publication date`);
  assert.equal(work.dateModified, book.updatedAt, `${book.slug}: no invented modification date`);
  const levels = [...noteHtml.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]));
  levels.forEach((level, index) => assert.ok(!index || level <= levels[index - 1] + 1, `${book.slug}: heading hierarchy must not skip levels`));
}
console.log(`Notooo catalog audit passed: ${catalogItems.length} metadata items, ${notoooModule.publishedNotoooBooks.length} published routes, working combined filters, and 0 private draft bodies/routes/sitemap entries.`);
const toolPages = pages.filter(file => /toolbox[\\/]([^\\/]+)[\\/]index\.html$/.test(String(file)));
assert.equal(toolPages.length, toolRegistry.tools.length, 'Expected one generated page per registered tool');
for (const file of toolPages) {
  const toolHtml = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const heading of ['What', 'Why']) assert.ok(new RegExp(`<h3[^>]*>${heading}</h3>`, 'i').test(toolHtml), `${file}: missing static ${heading} knowledge`);
  assert.ok(/Model note/i.test(toolHtml), `${file}: missing model note`);
}
for (const tool of toolRegistry.tools) {
  const toolHtml = fs.readFileSync(path.join(dist, 'toolbox', tool.slug, 'index.html'), 'utf8');
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
  assert.ok(/<Insight|<Warning|DecisionLab|recommend|suggest|Action|tip=/.test(source), `${component}: missing a local result-driven action surface`);
}
const toolPageSource = fs.readFileSync(path.join(root, 'src/pages/toolbox/[slug].astro'), 'utf8');
assert.ok(toolPageSource.indexOf('variant="intro"') < toolPageSource.indexOf("tool.slug === 'api-payload-doctor'"), 'What and Why must appear before a tool runs');
assert.ok(toolPageSource.includes('variant="next" nextTools={tryNext}') && !toolPageSource.includes('<h3 class="tp-sidebar-h3">Try next</h3>'), 'Next must reuse the canonical next-tool system after the tool result');
const insightSource = fs.readFileSync(path.join(root, 'src/components/toolbox/shared/Insight.tsx'), 'utf8');
for (const label of ['Result', 'Why it matters', 'Action']) assert.ok(insightSource.includes(label), `Insight is missing ${label} labeling`);
const knowledgeGuide = path.join(root, 'docs/TOOLOOO-KNOWLEDGE.md');
assert.ok(fs.existsSync(knowledgeGuide), 'Toolooo knowledge guide is missing');
for (const concept of ['**What**', '**Why**', '**Result**', '**Action**', '**Next**']) assert.ok(fs.readFileSync(knowledgeGuide, 'utf8').includes(concept), `Toolooo knowledge guide is missing ${concept}`);
assert.ok(html.includes('One Book. One Page.') && html.includes('Notooo is not a replacement for reading the original book.'), 'Published Notooo identity and disclosure are missing');
for (const slug of launchBooks.keys()) {
  const file = path.join(dist, 'notooo', slug, 'index.html');
  assert.ok(fs.existsSync(file), `${slug}: public note route is missing`);
  const noteHtml = fs.readFileSync(file, 'utf8');
  assert.equal((noteHtml.match(/<h1(?:\s|>)/g) || []).length, 1, `${slug}: note must have exactly one H1`);
  assert.match(noteHtml, /One Thing to Keep/, `${slug}: note must expose its final takeaway`);
}
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
