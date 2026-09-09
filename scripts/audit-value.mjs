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

const infooo = fs.readFileSync(path.join(root, 'src/data/infooo.ts'), 'utf8');
assert.ok(infooo.includes("status: 'active' as const"), 'Infooo must be active with a published world');
assert.ok(infooo.includes("tagline: 'See it. Touch it. Understand it.'"), 'Infooo identity missing');
assert.ok(infooo.includes("title: 'Human Atlas'") && infooo.includes("title: 'What Happens When You Press Enter?'"), 'Reserved Infooo worlds missing');
assert.ok(infooo.includes("status: 'published'") && infooo.includes("visibility: 'public'"), 'World 001 must be published');
assert.equal((infooo.match(/status: 'private'/g) || []).length, 1, 'Only World 002 must remain private');
assert.ok(infooo.includes('InfoooCandidateChecks') && infooo.includes('factualSources') && infooo.includes('requiredPassed'), 'Infooo candidate gate missing');
assert.ok(infooo.includes('fact?:') && infooo.includes('model?:') && infooo.includes('simulation?:') && infooo.includes('sources?:'), 'Infooo truth fields missing');
assert.ok(!infooo.includes('sources: ['), 'Infooo must not contain fake source records');
assert.ok(fs.existsSync(path.join(root, 'src/pages/infooo/index.astro')) && fs.existsSync(path.join(root, 'src/pages/infooo/human-atlas.astro')), 'Published Infooo routes missing');

const dist = path.join(root, 'dist');
const pages = fs.readdirSync(dist, { recursive: true }).filter(file => String(file).endsWith('.html'));
const html = pages.map(file => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
assert.ok(html.includes('A quick guide'), 'Tool knowledge layer missing from build');
assert.ok(html.includes('Try next'), 'Workflow-related tools missing from build');
assert.ok(!/href=["'][^"']*notooo[^"']*["']/i.test(html), 'Inactive Notooo must not be publicly linked');
assert.ok(html.includes('Human Atlas') && html.includes('See it. Touch it. Understand it.'), 'Published Infooo identity is missing');
assert.ok(!html.includes('What Happens When You Press Enter?'), 'World 002 must remain private');
for (const match of html.matchAll(/data-related-content[^>]*data-related-slug=["']([^"']+)["']/g)) assert.ok(/^[a-z0-9-]+$/.test(match[1]), 'Invalid related content slug');
console.log(`Value audit passed: ${valueLaws.length} laws, hard gates, knowledge, relationships, privacy and manifest structure checked across ${pages.length} HTML pages.`);
