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
assert.ok(!/href=["'][^"']*notooo[^"']*["']/i.test(html), 'Inactive Notooo must not be publicly linked');
assert.ok(html.includes('Human Atlas') && html.includes('See it. Touch it. Understand it.'), 'Published Infooo identity is missing');
assert.ok(!/What Happens When You Press Enter|internet-request-journey|Cache hit vs cache miss/.test(html), 'Discarded World 002 content remains in the build');
for (const match of html.matchAll(/data-related-content[^>]*data-related-slug=["']([^"']+)["']/g)) assert.ok(/^[a-z0-9-]+$/.test(match[1]), 'Invalid related content slug');
console.log(`Knowledge audit passed: ${toolRegistry.tools.length}/${toolRegistry.tools.length} What and Why entries, ${toolComponents.length}/${toolComponents.length} result and action surfaces, ${lv3Tools.length} LV3 continuation systems, 0 invalid Next references, and 0 generic knowledge findings.`);
console.log(`Value audit passed: ${valueLaws.length} laws, hard gates, knowledge, relationships, privacy and manifest structure checked across ${pages.length} HTML pages.`);
