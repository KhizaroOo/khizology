import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const { tools } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/data/tools.ts')))}`);
const { CONTACT } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/data/site.ts')))}`);
const selected = tools.filter(tool => tool.clarityReview);
assert.deepEqual(selected.map(tool => tool.slug).sort(), ['api-payload-doctor', 'database-decision-lab', 'retry-storm-simulator', 'timeout-chain-planner']);
assert.ok(selected.every(tool => tool.status === 'active'));
const expected = new Set(['toolbox/index.html', 'drop-a-vibe/index.html', ...selected.map(tool => `toolbox/${tool.slug}/index.html`)]);
const dist = fileURLToPath(new URL('dist/', root));
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : [];
  });
}
const found = [];
for (const file of walk(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('data-earning-offer')) continue;
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  found.push(relative);
  assert.ok(expected.has(relative), `Unexpected offer on ${relative}`);
  assert.equal([...html.matchAll(/\sdata-earning-offer(?:\s|>)/g)].length, 1);
  assert.equal([...html.matchAll(/id="technical-clarity-review"/g)].length, 1);
  assert.match(html, /<h2\b[^>]*id="clarity-review-title"[^>]*>Technical Clarity Review<\/h2>/);
  assert.match(html, /Introductory price: <strong[^>]*>\$99 USD<\/strong>/);
  assert.match(html, /45–60 min solution session \+ written action plan/);
  assert.match(html, />Check if my problem fits<\/a>/);
  assert.match(html, /No payment required to ask\./);
  assert.match(html, /I only accept reviews where I believe I can create useful technical value\./);
  const process = html.match(/<details\b[^>]*class="clarity-process"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(process && !/\sopen(?:\s|>)/.test(process[0].split('>')[0]), 'Full process starts collapsed');
  assert.equal([...process[1].matchAll(/<li\b/g)].length, 7);
  assert.match(process[1], /there is no payment/);
  assert.match(process[1], /not implementation or unlimited support/);
  assert.match(process[1], /private keys or sensitive customer data/);
  for (const area of ['software/system architecture', 'APIs/integrations', 'backend/.NET', 'databases', 'cloud/deployment', 'scalability/performance', 'microservices', 'AI integration architecture', 'blockchain application architecture', 'technical delivery decisions']) assert.ok(process[1].includes(area));
  const ctas = [...html.matchAll(/<a\b[^>]*data-earning-offer-cta[^>]*>/g)].map(match => match[0]);
  assert.equal(ctas.length, 2, 'WhatsApp and email offer actions');
  const links = ctas.map(cta => new URL(cta.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&')));
  const tool = selected.find(tool => relative === `toolbox/${tool.slug}/index.html`);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  assert.ok(canonical, relative);
  const expectedMessage = `Hi Khizar, I'd like to check whether my problem fits the $99 introductory Technical Clarity Review.\n\n${tool ? `Tool: ${tool.name}\n${canonical}\n\n` : ''}I need help with:`;
  assert.equal(links[0].origin + links[0].pathname, CONTACT.whatsapp);
  assert.deepEqual([...links[0].searchParams.keys()], ['text']);
  assert.match(ctas[0], /rel="noopener noreferrer"/);
  assert.equal(links[1].protocol, 'mailto:');
  assert.equal(links[1].pathname, CONTACT.email);
  assert.ok(!links[1].search.includes('+'), 'Mailto spaces use %20, not form-encoded plus signs');
  assert.deepEqual([...links[1].searchParams.keys()], ['subject', 'body']);
  assert.equal(links[1].searchParams.get('subject'), 'Technical Clarity Review');
  for (const message of [links[0].searchParams.get('text'), links[1].searchParams.get('body')]) {
    assert.equal(message, expectedMessage, 'Only fixed offer copy and canonical public tool context');
    assert.ok(!message.includes(CONTACT.email) && !message.includes(new URL(CONTACT.whatsapp).pathname.slice(1)));
    for (const publicUrl of message.match(/https?:\/\/\S+/g) || []) {
      assert.equal(new URL(publicUrl).search, '');
      assert.equal(new URL(publicUrl).hash, '');
    }
  }
  if (relative === 'drop-a-vibe/index.html') {
    assert.ok(html.includes(`href="${CONTACT.linkedin}"`));
    assert.ok(html.includes(`href="mailto:${CONTACT.email}"`));
  }
}
assert.deepEqual(found.sort(), [...expected].sort(), 'Only six intended existing surfaces');
const detail = read('src/pages/toolbox/[slug].astro');
assert.ok(detail.indexOf('<TechnicalClarityOffer') > detail.indexOf('<ToolTruth '), 'Offer follows existing workspace, actions and optional depth');
console.log('Earning offer PASS: six surfaces, canonical tool-name/URL prefills, generic hub/contact copy, WhatsApp/email encoding, safe destinations and secondary placement.');
