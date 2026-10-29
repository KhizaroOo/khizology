import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const site = fs.readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8');
const { CONTACT, SITE } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(site))}`);
assert.deepEqual(CONTACT, {
  whatsapp: 'https://wa.me/923007683396',
  linkedin: 'https://www.linkedin.com/in/khizar-imtiaz',
  email: 'khizar.imtiaz@gmail.com',
}, 'Use the owner-confirmed public destinations');
assert.ok(SITE.sameAs.includes(CONTACT.linkedin));

const read = route => fs.readFileSync(new URL(`../dist/${route}`, import.meta.url), 'utf8');
const contactPath = `${(process.env.BASE_URL || '/').replace(/\/$/, '')}/drop-a-vibe/`;
const html = read('drop-a-vibe/index.html');
const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
assert.ok(main, 'Contact content must remain inside main');
assert.ok(!/<(?:form|input|textarea|select|button)\b/i.test(main), 'Contact must use direct links without form controls');
assert.ok(!/coming soon|every message gets read|I read every message|submit|form integration/i.test(main), 'No unavailable submission or response promises');
assert.match(main, /Let’s talk\./);
assert.match(main, /Email opens your email app\./);
const nav = main.match(/<nav\b[^>]*aria-label="Contact channels"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(nav, 'Contact channels need a descriptive navigation label');
const attr = (tag, key) => tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
const links = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
assert.deepEqual(links.map(link => [attr(link[1], 'href'), link[2].trim()]), [
  [CONTACT.whatsapp, 'Message me on WhatsApp'],
  [CONTACT.linkedin, 'Connect on LinkedIn'],
  [`mailto:${CONTACT.email}`, 'Email me'],
]);
assert.match(attr(links[0][1], 'class'), /k-button--primary/);
for (const link of links.slice(1)) assert.match(attr(link[1], 'class'), /k-button--secondary/);
for (const link of links) {
  const tag = link[1];
  assert.ok(!/onclick|tabindex="-1"|aria-disabled/.test(tag), 'Native links must stay keyboard-accessible');
  if (attr(tag, 'target') === '_blank') {
    const rel = attr(tag, 'rel')?.split(/\s+/) || [];
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), 'Protect external new-tab actions');
  }
}
assert.equal(attr(links[2][1], 'aria-describedby'), 'contact-email-help');
assert.ok(main.includes('id="contact-email-help"'));

for (const route of ['index.html', 'my-portfolio/index.html', 'infooo/agent-systems-lab/index.html', 'you-ask-i-answer/index.html']) {
  const content = read(route);
  assert.ok(content.includes(`href="${contactPath}"`), `${route}: preserve working contact discovery`);
  assert.ok(!/every message gets read|I read every message|Submit a Question Early/i.test(content), `${route}: no unsupported contact promise`);
}
assert.ok(!/Coming Soon|ask-anything text box|being built/i.test(read('you-ask-i-answer/index.html')), 'Q&A must not advertise unavailable contact submission');
assert.ok(read('frop-a-vibe/index.html').includes(`http-equiv="refresh" content="0; url=${contactPath}"`), 'Preserve the compatibility alias');
assert.match(read('future-monsters/index.html'), /LOCKED/, 'Unrelated mystery states must remain intact');
console.log('PASS: three configured native contact actions, hierarchy, labels, external-link protection, email help, contact discovery, alias and no unavailable forms/promises.');
